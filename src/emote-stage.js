/**
 * EmoteStage —— 把 E-mote（M2 Emofuri WebGL SDK）动态人物嵌进页面 Canvas。
 *
 * 要点
 *  - 只使用官方 SDK 公开 API（emotedriver.js / emoteplayer.js 原样加载，未修改）。
 *  - 与旧 Live2D 体系无关，不使用任何 Cubism 加载器。
 *  - 加载分三段并向外发事件：sdk → logo → model（含下载百分比）。
 *  - 表情切换：同一时刻只保留"最后一次"请求（合并抖动），并限制最小切换间隔。
 *  - 渲染循环可暂停：setActive(false) 立刻取消 rAF；页面隐藏时自动暂停。
 *  - 长时间不可见可调用 release() 卸载模型数据与纹理，再次 setActive(true) 时自动重载。
 */

const DRIVER = 'vendor/emote/emotedriver.js';
const PLAYER = 'vendor/emote/emoteplayer.js';
const LOGO = 'vendor/emote/emote_logo_d2.emtbytes';
// 可切换的模型（同一套 E-mote 骨架/时间线，服装与立绘不同）。目录 JSON 复用 kurisu_ab 的（切换后会校验时间线标签是否齐全）。
export const MODELS = {
  ab: { psb: 'models/kurisu_ab.expressions.psb', label: 'kurisu_ab' },
  alt: { psb: 'models/kurisu_ab_labcoat.expressions.psb', label: 'kurisu_ab_labcoat' },
};
const CATALOG = 'models/kurisu_ab-catalog.json';

// 画布基准尺寸（与 SDK 渲染画布一致）。实际像素 = 基准 × 分辨率系数 k。
const BASE_W = 720;
const BASE_H = 960;

// 未被当前表情时间线"拥有"的脸部通道，在切换表情时复位，避免红晕等残留。
const FACE_BASE = {
  face_eye_open: 0, face_eye_open_l: 0, face_eye_open_r: 0, face_eye_sp: 0,
  face_hitomi_sp: 0, face_eye_hi: 0, face_eyebrow: 0, face_eyebrow_sp: 0,
  face_mouth: 0, face_mouth_sp: 0, face_cheek: 0, face_cheekmask: 0, face_tears: 0,
};


// 动作库：每一步 { to: {变量: 偏移}, set: {变量: 值}, ms: 过渡毫秒, hold: 停留毫秒 }；最后一步回到 0。
// 数值按本模型实测标定（SDK 变量范围 ±100，头/身体变形幅度较小，需要接近满量程才看得出来）。
const Z = { head_UD: 0, head_LR: 0, head_slant: 0, body_UD: 0, body_LR: 0, body_slant: 0 };
const MOTIONS = {
  nod:   [{ to: { head_UD: 80, body_UD: 40 }, ms: 260 }, { to: { head_UD: -20 }, ms: 240 }, { to: { head_UD: 60 }, ms: 220 }, { to: Z, ms: 520 }],
  tilt:  [{ to: { head_slant: 90, head_LR: 35, body_slant: 60 }, ms: 560, hold: 800 }, { to: Z, ms: 800 }],
  lean:  [{ to: { body_UD: 100, head_UD: 50 }, ms: 640, hold: 800 }, { to: Z, ms: 900 }],
  sway:  [{ to: { body_LR: 100, body_slant: 70, head_slant: 40 }, ms: 800 }, { to: { body_LR: -100, body_slant: -70, head_slant: -40 }, ms: 1200 }, { to: Z, ms: 800 }],
  away:  [{ to: { head_LR: -100, body_LR: -60, head_UD: -30 }, ms: 520, hold: 1000 }, { to: Z, ms: 800 }],
  peek:  [{ to: { head_slant: -90, body_LR: 80, head_LR: 40 }, ms: 560, hold: 700 }, { to: { head_slant: 40, body_LR: 20 }, ms: 500 }, { to: Z, ms: 700 }],
  cross: [{ to: { body_UD: 30, head_UD: 20 }, set: { arm_type: 1 }, ms: 380, hold: 2600 }, { to: Z, set: { arm_type: 0 }, ms: 500 }],
};
let sdkPromise = null;
const sdkState = { device: null, onDevice: null, onStop: null };

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('脚本加载失败：' + src));
    document.head.append(s);
  });
}

/** SDK 在进程内只加载一次（单例）。EmoteModule 必须在 emotedriver.js 之前定义。 */
function loadSdk(base) {
  if (sdkPromise) return sdkPromise;
  window.EmoteModule = {
    TOTAL_MEMORY: 536870912, // 512 MB 的 wasm 堆：模型 PSB 本身约 205 MB
    onStartEmoteAnimation(device) { sdkState.device = device; sdkState.onDevice?.(device); },
    onStopEmoteAnimation() { sdkState.device = null; sdkState.onStop?.(); },
  };
  sdkPromise = (async () => {
    await loadScript(base + DRIVER);
    await loadScript(base + PLAYER);
    // emoteplayer.js 以 `class EmotePlayer` 声明：属于全局词法作用域，不在 window 上，需要间接 eval 取出。
    const cls = (0, eval)('typeof EmotePlayer === "function" ? EmotePlayer : null');
    if (!cls) throw new Error('EmotePlayer 未定义');
    return cls;
  })().catch((e) => { sdkPromise = null; throw e; });
  return sdkPromise;
}

async function fetchBytes(url, onProgress, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
  // Fetch transparently decodes HTTP compression. Content-Length then describes
  // wire bytes, not the decoded stream (GitHub Pages gzips the SDK logo/model).
  const encoding = res.headers.get('content-encoding');
  const total = !encoding || encoding === 'identity'
    ? Number(res.headers.get('content-length')) || 0 : 0;
  if (!res.body || !total) {
    const buf = new Uint8Array(await res.arrayBuffer());
    onProgress?.(1);
    return buf;
  }
  const out = new Uint8Array(total);
  const reader = res.body.getReader();
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out.set(value, got);
    got += value.length;
    onProgress?.(Math.min(1, got / total));
  }
  if (got !== total) throw new Error('下载不完整');
  return out;
}

const sleep = (ms, signal) => new Promise((resolve, reject) => {
  const t = setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('aborted', 'AbortError')); }, { once: true });
});

export class EmoteStage extends EventTarget {
  constructor({ canvas, base = './', resolution = 1.25, minLogoMs = 2600, view = {} }) {
    super();
    this.canvas = canvas;
    this.base = base;
    this.k = resolution;
    this.minLogoMs = minLogoMs;
    this.view = { scale: 0.34, x: -35, y: -300, ...view };
    this.viewNow = { ...this.view };   // 当前实际视图（可被 setView 缓动）
    this.viewTween = null;
    this.alias = 'ab';
    this.swapping = false;
    this.eyeVal = 0; this.eyeTarget = 0; this.eyeRate = 1; this.eyeT = 0;   // 0=睁开 1=闭上（用于开场“睁眼”）
    this.state = 'idle'; // idle | loading | ready | released | error
    this.stage = '';
    this.progress = 0;
    this.player = null;
    this.logo = null;
    this.catalog = null;
    this.selectors = [];
    this.authored = new Map();
    this.active = false;
    this.raf = 0;
    this.lastT = null;
    this.vtime = 0;
    this.current = null;      // 当前 timeline 标签
    this.currentSince = 0;
    this.pendingExpr = null;  // 最后一次待应用的表情（合并重复点击）
    this.lastSwitchAt = -1e9;
    this.switchTimer = 0;
    this.manualBlinkAt = -1e9;
    this.stats = { frames: 0, switches: 0, requests: 0, coalesced: 0, loads: 0, releases: 0 };
    this.loadPromise = null;
    this.abort = null;
    this.gen = 0;
    this._onVis = () => { this._updateLoop(); };
    document.addEventListener('visibilitychange', this._onVis);
    this._draw = this._draw.bind(this);
  }

  _emit(type, detail = {}) { this.dispatchEvent(new CustomEvent(type, { detail })); }
  _setStage(stage, extra = {}) { this.stage = stage; this._emit('stage', { stage, ...extra }); }

  /** 开始（或重新）加载。重复调用返回同一个 promise；释放后可再次调用。 */
  start() {
    if (this.state === 'ready') return Promise.resolve();
    if (this.loadPromise) return this.loadPromise;
    this.state = 'loading';
    this.stats.loads++;
    const gen = ++this.gen;
    this.abort = new AbortController();
    const signal = this.abort.signal;
    this.loadPromise = this._load(gen, signal).then(() => {
      if (gen !== this.gen) return;
      this.state = 'ready';
      this.loadPromise = null;
      this._emit('ready');
      this._updateLoop();
    }).catch((err) => {
      this.loadPromise = null;
      if (err?.name === 'AbortError' || gen !== this.gen) return;
      this.state = 'error';
      this._teardownPlayer();
      this._emit('error', { message: String(err?.message || err) });
    });
    return this.loadPromise;
  }

  async _load(gen, signal) {
    this._setStage('sdk');
    const EmotePlayer = await loadSdk(this.base);
    if (gen !== this.gen) return;
    const W = Math.round(BASE_W * this.k), H = Math.round(BASE_H * this.k);
    this.canvas.width = W; this.canvas.height = H;
    if (!this._renderCanvasReady) {
      EmotePlayer.createRenderCanvas(W, H);
      EmotePlayer.renderCanvas?.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        this.state = 'error';
        this._cancelRaf();
        this._emit('error', { message: 'WebGL 上下文丢失' });
      });
      this._renderCanvasReady = true;
    }
    this._startLoopHooks();

    // 1) E-mote 官方 Logo（SDK 条款要求保留，同时作为加载反馈）。常驻隐藏的 logo 播放器也能避免
    //    SDK 在卸载唯一播放器时触发 onStopAnimation 的已知报错。
    this._setStage('logo');
    const logoStart = performance.now();
    if (!this.logo) {
      this.logo = new EmotePlayer(this.canvas);
      this.logo.scale = 0.7 * this.k;
      this.logo.loadData(await fetchBytes(this.base + LOGO, null, signal));
    } else {
      this.logo.hide = false;
    }
    if (gen !== this.gen) return;
    this._logoShown = true;
    this._updateLoop(true);

    // 2) 目录（变量范围 / 选择器 / 原作表情时间线）
    if (!this.catalog) {
      const res = await fetch(this.base + CATALOG, { signal });
      if (!res.ok) throw new Error('目录加载失败');
      const catalog = await res.json();
      this.catalog = catalog;
      this.selectors = catalog.selectors.filter((s) => s.enabled === 1);
      this.authored = new Map(catalog.authoredExpressions.map((e) => [e.label, e]));
    }

    // 3) 模型：下载（带进度）与 Logo 最短展示并行
    this._setStage('model', { progress: 0 });
    const [bytes] = await Promise.all([
      fetchBytes(this.base + MODELS[this.alias].psb, (p) => { this.progress = p; this._emit('progress', { progress: p }); }, signal),
      sleep(Math.max(0, this.minLogoMs - (performance.now() - logoStart)), signal),
    ]);
    if (gen !== this.gen) return;
    this._setStage('parse');
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30))); // 让 UI 先刷出"解析中"
    const p = new EmotePlayer(this.canvas);
    p.scale = this.viewNow.scale * this.k;
    p.coord = [this.viewNow.x * this.k, this.viewNow.y * this.k];
    p.loadData(bytes);
    this.player = p;
    p.onUpdate = () => this._onUpdate();
    this.logo.hide = true;
    this.current = null;
    this._applyExpression('表情_普通', true);
    this._updateLoop(true);
    // 等第一帧出图再宣布 ready
    await new Promise((r) => setTimeout(r, 400));
    this._setStage('ready');
  }

  // ---------------------------------------------------------------- 渲染循环
  _startLoopHooks() {
    sdkState.onDevice = (device) => { this.device = device; this._updateLoop(); };
    sdkState.onStop = () => { this.device = null; this._cancelRaf(); };
  }
  get _canRender() {
    const dev = sdkState.device;
    return !!dev && this.active && !document.hidden && (this.state === 'ready' || this.state === 'loading');
  }
  _updateLoop(force) {
    if (this._canRender || (force && this.active && sdkState.device)) this._scheduleRaf(); else this._cancelRaf();
  }
  _scheduleRaf() { if (!this.raf) this.raf = requestAnimationFrame(this._draw); }
  _cancelRaf() { if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; } this.lastT = null; }
  _draw(t) {
    this.raf = 0;
    const dev = sdkState.device;
    if (!dev || !this.active || document.hidden) { this.lastT = null; return; }
    if (this.lastT !== null) this.vtime += Math.min(t - this.lastT, 100);
    this.lastT = t;
    try { dev.drawAnimation(this.vtime); this.stats.frames++; }
    catch (e) { this.state = 'error'; this._emit('error', { message: String(e?.message || e) }); return; }
    this.raf = requestAnimationFrame(this._draw);
  }
  /** 页面可见区域外 / 标签页隐藏时调用 false，立刻停止 rAF（零渲染开销）。 */
  setActive(on) {
    on = !!on;
    if (on === this.active) return;
    this.active = on;
    this._emit('active', { active: on });
    this._updateLoop(true);
  }
  get rendering() { return this.raf !== 0; }

  // ---------------------------------------------------------------- 表情 / 视线
  _clearUnowned(timeline) {
    const owned = new Set(this.authored.get(timeline)?.tracks || []);
    for (const [k, v] of Object.entries(FACE_BASE)) if (!owned.has(k)) this.player.setVariable(k, v);
  }
  _applyExpression(timeline, immediate = false) {
    const p = this.player;
    if (!p?.initialized || !this.authored.has(timeline) || !p.mainTimelineLabels.includes(timeline)) return false;
    this._clearUnowned(timeline);
    p.stopTimeline();
    p.mainTimelineLabel = '';
    p.mainTimelineLabel = timeline;
    this.current = timeline;
    this.currentSince = performance.now();
    this.lastSwitchAt = this.currentSince;
    this.stats.switches++;
    this._emit('expression', { timeline });
    return true;
  }
  /** 请求切换表情。短时间多次调用只会落实最后一次；返回 false 表示模型未就绪。 */
  setExpression(timeline) {
    this.stats.requests++;
    if (this.state !== 'ready' || !this.player?.initialized) return false;
    if (this.pendingExpr) this.stats.coalesced++;
    this.pendingExpr = timeline;
    const wait = Math.max(0, 170 - (performance.now() - this.lastSwitchAt));
    if (!this.switchTimer) {
      this.switchTimer = setTimeout(() => {
        this.switchTimer = 0;
        const t = this.pendingExpr; this.pendingExpr = null;
        if (t && this.state === 'ready') this._applyExpression(t);
      }, wait);
    }
    return true;
  }
  blink() { this.manualBlinkAt = performance.now(); }
  /** 口型开合（0–5，SDK 变量 face_talk“クチパク”，不属于任何表情时间线）。用于原声播放时的口型同步。 */
  talk(v) {
    const p = this.player;
    if (!p?.initialized || this.state !== 'ready') return false;
    const val = Math.max(0, Math.min(5, v || 0));
    if (Math.abs((this._talk ?? -1) - val) < 0.15) return true;
    this._talk = val; p.setVariable('face_talk', val);
    return true;
  }
  /** 闭眼/睁眼（带渐变）。closed=true 立即/渐闭；false 在 ms 内渐开。 */
  eyes(closed, ms = 500) { this.eyeTarget = closed ? 1 : 0; this.eyeRate = 1 / Math.max(1, ms); }
  /** nx, ny ∈ [-1,1]：视线与头部朝向的叠加偏移（使用 SDK 的 setVariableDiff，不打断时间线）。 */
  lookAt(nx, ny, ms = 160) {
    const p = this.player;
    if (!p?.initialized) return;
    const c = (v) => Math.max(-1, Math.min(1, v));
    nx = c(nx); ny = c(ny);
    p.setVariableDiff('look', 'face_eye_LR', nx * 55, ms);
    p.setVariableDiff('look', 'face_eye_UD', ny * 40, ms);
    p.setVariableDiff('look', 'head_LR', nx * 16, ms * 1.6);
    p.setVariableDiff('look', 'head_UD', ny * 10, ms * 1.6);
    p.setVariableDiff('look', 'head_slant', nx * -5, ms * 1.6);
  }

  /** 每帧由 SDK 回调：把"自动选择器"投射到可见图层 + 眨眼。 */
  _onUpdate() {
    const p = this.player;
    if (!p?.initialized) return;
    const now = performance.now();
    this._tickView(now);
    // 眨眼：时间线结束后才接管睁眼度；闭眼值为 10
    const authored = this.authored.get(this.current);
    if (authored?.tracks.includes('face_eye_open')) {
      const settled = now - this.currentSince >= (authored.lastFrame * 1000) / 60;
      const cycle = (now - this.currentSince) % 4600;
      const bt = now - this.manualBlinkAt < 240 ? now - this.manualBlinkAt : cycle - 3700;
      const blink = settled && bt >= 0 && bt < 210 ? Math.sin((bt / 210) * Math.PI) : 0;
      const dtE = Math.min(100, now - (this.eyeT || now)); this.eyeT = now;
      if (this.eyeVal !== this.eyeTarget) {
        const step = this.eyeRate * dtE;
        this.eyeVal = this.eyeVal < this.eyeTarget ? Math.min(this.eyeTarget, this.eyeVal + step * 4) : Math.max(this.eyeTarget, this.eyeVal - step);
      }
      if (settled) {
        const closeAmt = Math.max(blink, this.eyeVal);
        for (const l of ['face_eye_open_l', 'face_eye_open_r']) {
          const base = authored.targets[l] ?? authored.targets.face_eye_open ?? 0;
          p.setVariable(l, base < 10 ? base + (10 - base) * closeAmt : base);
        }
      }
    }
    // 兼容副本关闭了自动嘴形/红晕选择器，这里按原规则用公开 API 投射
    for (const s of this.selectors) {
      const value = p.getVariable(s.label);
      for (const o of s.optionList) {
        if (!o.label) continue;
        const target = value >= o.lower && value <= o.upper ? o.onValue : o.offValue;
        if (p.getVariable(o.label) !== target) p.setVariable(o.label, target);
      }
    }
  }


  // ---------------------------------------------------------------- 视图缓动（SDK 内缩放/平移：近景推近时仍保持清晰）
  /** 在 ms 毫秒内把模型视图缓动到 {scale,x,y}（相对 this.view 的倍数/偏移）。 */
  setView({ zoom = 1, dx = 0, dy = 0 } = {}, ms = 900) {
    const to = { scale: this.view.scale * zoom, x: this.view.x + dx, y: this.view.y + dy };
    if (!this.player?.initialized) { this.viewNow = { ...to }; this.viewTween = null; return; }
    this.viewTween = { from: { ...this.viewNow }, to, t0: performance.now(), ms: Math.max(1, ms) };
  }
  _tickView(now) {
    const tw = this.viewTween;
    if (!tw) return;
    const u = Math.min(1, (now - tw.t0) / tw.ms);
    const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; // easeInOutCubic
    for (const k of ['scale', 'x', 'y']) this.viewNow[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * e;
    const p = this.player;
    p.scale = this.viewNow.scale * this.k;
    p.coord = [this.viewNow.x * this.k, this.viewNow.y * this.k];
    if (u >= 1) this.viewTween = null;
  }

  // ---------------------------------------------------------------- 程序化动作（叠加在表情时间线之上）
  /**
   * 动作 = 对 SDK 公开变量（头/身体朝向、倾斜）做短时叠加偏移，再回落。
   * 模型自带的“动作时间线”只有 39 条表情_*（其中含头/身体角度）；没有挥手、转身之类的身体动画，这里不假装有。
   */
  motion(name) {
    const p = this.player;
    if (!p?.initialized || this.state !== 'ready') return false;
    const M = MOTIONS[name];
    if (!M) return false;
    this._motionId = (this._motionId || 0) + 1;
    const id = this._motionId;
    clearTimeout(this._motionTimer);
    let i = 0;
    const step = () => {
      if (id !== this._motionId || !this.player?.initialized) return;
      const st = M[i++];
      if (!st) return;
      for (const [v, val] of Object.entries(st.to)) this.player.setVariableDiff('mot', v, val, st.ms);
      if (st.set) for (const [v, val] of Object.entries(st.set)) this.player.setVariable(v, val);
      this._motionTimer = setTimeout(step, st.ms + (st.hold || 0));
    };
    step();
    this.stats.motions = (this.stats.motions || 0) + 1;
    this._emit('motion', { name });
    return true;
  }
  get motionNames() { return Object.keys(MOTIONS); }

  // ---------------------------------------------------------------- 换模型（世界线变动）
  /** 仅下载，不碰当前播放器；调用方可在黑场开始前把网络等待完成。 */
  async prepareSwap(alias) {
    if (!MODELS[alias]) throw new Error('未知形象：' + alias);
    const bytes = await fetchBytes(this.base + MODELS[alias].psb, (progress) => {
      this.progress = progress; this._emit('progress', { progress });
    });
    return { alias, bytes };
  }
  /** 释放当前模型 → 下载并载入另一套模型。期间 state='swapping'；失败则回退原模型。返回是否成功。 */
  async swap(alias, onProgress, prepared = null) {
    if (this.swapping || this.state !== 'ready' || !MODELS[alias]) return false;
    if (alias === this.alias) return true;
    this.swapping = true;
    const prevAlias = this.alias, prevExpr = this.current;
    ++this.gen;
    clearTimeout(this.switchTimer); this.switchTimer = 0; this.pendingExpr = null;
    this._motionId = (this._motionId || 0) + 1;
    this.state = 'swapping';
    this._emit('swap', { phase: 'start', alias });
    try {
      // wasm 堆只有 512 MB：必须先释放旧模型，再载入新的
      this._teardownPlayer();
      this.alias = alias;
      const bytes = prepared?.alias === alias ? prepared.bytes : await fetchBytes(this.base + MODELS[alias].psb, (pr) => { this.progress = pr; onProgress?.(pr); this._emit('progress', { progress: pr }); });
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30)));
      await this._mount(bytes, prevExpr);
      this._emit('swap', { phase: 'done', alias });
      return true;
    } catch (err) {
      try {
        this.alias = prevAlias;
        const bytes = await fetchBytes(this.base + MODELS[prevAlias].psb);
        await this._mount(bytes, prevExpr);
      } catch (e2) { this.state = 'error'; this._emit('error', { message: String(e2?.message || e2) }); }
      this._emit('swap', { phase: 'failed', alias, message: String(err?.message || err) });
      return false;
    } finally {
      this.swapping = false;
    }
  }
  async _mount(bytes, expr) {
    const EmotePlayer = await loadSdk(this.base);
    const p = new EmotePlayer(this.canvas);
    p.scale = this.viewNow.scale * this.k;
    p.coord = [this.viewNow.x * this.k, this.viewNow.y * this.k];
    const parseStart = performance.now();
    p.loadData(bytes);
    this.stats.lastParseMs = Math.round(performance.now() - parseStart);
    this.player = p;
    p.onUpdate = () => this._onUpdate();
    if (this.logo) this.logo.hide = true;
    this.current = null;
    const labels = p.mainTimelineLabels || [];
    p.setVariable('arm_type', 0);
    this.labelsOk = [...this.authored.keys()].every((l) => labels.includes(l));
    this._applyExpression(this.authored.has(expr) && labels.includes(expr) ? expr : '表情_普通', true);
    this.state = 'ready';
    this._updateLoop(true);
    await new Promise((r) => setTimeout(r, 300));
  }

  // ---------------------------------------------------------------- 资源释放
  _teardownPlayer() {
    this._cancelRaf();
    clearTimeout(this.switchTimer); this.switchTimer = 0; this.pendingExpr = null;
    if (this.player) {
      try { this.player.onUpdate = null; this.logo && (this.logo.hide = false); this.player.unloadData(); this.player.destroy(); } catch (e) { /* SDK 已知清理报错忽略 */ }
      this.player = null;
    }
    if (this.logo) this.logo.hide = true;
    this.current = null;
  }
  /** 释放模型（纹理/网格）。Logo 播放器保留以保持 SDK 设备存活。 */
  release() {
    if (this.state !== 'ready') return false;
    this.gen++;
    this.abort?.abort();
    this._teardownPlayer();
    this.state = 'released';
    this.stats.releases++;
    this._emit('released');
    return true;
  }
  /** 释放后重新载入 */
  reload() {
    if (this.state === 'released' || this.state === 'error') { this.state = 'idle'; return this.start(); }
    return this.start();
  }
  dispose() {
    this.gen++;
    this.abort?.abort();
    document.removeEventListener('visibilitychange', this._onVis);
    this._teardownPlayer();
  }
  /** 调试/测试：读取画布像素统计（可见像素、彩色像素）。 */
  pixelStats() {
    const w = this.canvas.width, h = this.canvas.height;
    const d = this.canvas.getContext('2d').getImageData(0, 0, w, h).data;
    let visible = 0, colored = 0;
    for (let i = 0; i < d.length; i += 16) {
      if (d[i + 3] > 8) { visible++; if (Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) > 12) colored++; }
    }
    return { visible, colored, w, h };
  }
}
