import './fonts.css';
import './style.css';
import './r10.css';
import { EmoteStage } from './emote-stage.js';
import { Meter, GlowNum } from './meter.js';
import { Halo } from './halo.js';
import { Rail } from './rail.js';
import { createCursor } from './cursor.js';
import { Ibm, Divergence, microwaveHtml, ding, bindMicrowaveFx } from './props.js';
import { runBoot } from './boot.js';
import { createStageFx, POOL, KINDS } from './stagefx.js';
import { createShift, WORLDS } from './shift.js';
import { createPerformer } from './perform.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const body = document.body;
const sections = $$('.sec');
const stageEl = $('#stage');
const canvas = $('#emote-canvas');
const BASE = import.meta.env.BASE_URL;

/* ------------------------------------------------------------ 表情与动作池 */
const EX = {
  calm: '表情_普通', pout: '表情_むっとする', smug: '表情_ニヤニヤ', shy: '表情_照れる', surprise: '表情_驚き00',
  smile: '表情_笑う', angry: '表情_怒る', worry: '表情_困る03', glare: '表情_睨む', joy: '表情_喜ぶ01', sleepy: '表情_眠そう',
  glareHard: '表情_睨む（強）', sad: '表情_哀しい01',
};
const ALL_EX = Object.keys(EX).filter((k) => !['glareHard', 'sad'].includes(k));
const ALL_MO = ['nod', 'tilt', 'lean', 'sway', 'away', 'peek', 'cross'];
let lastEx = null, lastMo = null;
let performer = null;   // 05 章“字/声/形”演出台（第十轮），见 perform.js
const pick = (arr, not) => { const a = arr.filter((x) => x !== not); return a[(Math.random() * a.length) | 0] ?? arr[0]; };

/* ------------------------------------------------------------ 每章的人物走位：位置 / 大小 / 景深 / 推近 */
// x、y 以视口宽/高的比例；s 缩放；r 倾角；zoom/dy 为 SDK 内部推近（清晰）；hide 为隐藏
const POS = {
  hero:     { x: 0.235, y: 0.00, s: 1.00, r: 0,  zoom: 1.00, dy: 0,   depth: 1.0, ex: ['calm', 'smile'],            mo: ['tilt', 'nod'] },
  what:     { x: -0.26, y: 0.02, s: 0.90, r: 0,  zoom: 1.00, dy: 0,   depth: 0.8, ex: ['smile', 'smug', 'calm'],     mo: ['sway', 'tilt'] },
  modes:    { x: 0.27,  y: 0.00, s: 1.10, r: 0,  zoom: 1.00, dy: 0,   depth: 1.2, ex: ['smile', 'shy', 'joy'],       mo: ['tilt', 'nod', 'sway'] },
  boundary: { x: -0.355, y: 0.03, s: 0.8, r: 0,  zoom: 1.00, dy: 0,   depth: 0.6, ex: ['glare', 'smug', 'worry'],    mo: ['cross', 'away'] },
  perform:  { x: 0.24,  y: 0.06, s: 1.06, r: 0,  zoom: 1.38, dy: -34, depth: 1.3, ex: ['surprise', 'smile', 'smug'], mo: ['lean', 'nod'] },
  local:    { x: 0.455,  y: 0.05, s: 0.90, r: -5, zoom: 1.00, dy: 0,   depth: 0.9, ex: ['shy', 'worry', 'pout'],      mo: ['peek', 'away'] },
  road:     { hide: true,                                                                                          ex: ['calm'], mo: ['nod'] },
  outro:    { x: 0.22,  y: 0.02, s: 1.00, r: 0,  zoom: 1.18, dy: -18, depth: 1.0, ex: ['smile', 'shy'],            mo: ['nod', 'tilt'] },
};

/* ------------------------------------------------------------ E-mote 舞台 */
const emote = new EmoteStage({
  canvas, base: BASE, resolution: devicePixelRatio >= 2 ? 1.5 : 1.25, minLogoMs: 1500,
});
const fallback = $('#stage-fallback');
const stageMsg = $('#stage-msg');
const halo = new Halo($('#halo'));
const palette = (w) => { document.documentElement.style.removeProperty('--accrgb'); stampKickers(w); devBadge?.set(w); try { rail.setRgb(WORLDS[w].rgb, WORLDS[w].rgb2, WORLDS[w].wave); } catch (e) { /* rail 尚未创建 */ } };

let curKey = 'hero';
let warpToken = 0;
function applyPos(key, { instant = true } = {}) {
  const c = POS[key];
  if (!c) return;
  const vw = innerWidth, vh = innerHeight;
  stageEl.classList.toggle('hidden', !!c.hide);
  if (c.hide) { emote.setActive(false); halo.setActive(false); return; }
  stageEl.style.setProperty('--tx', (c.x * vw).toFixed(1) + 'px');
  stageEl.style.setProperty('--ty', (c.y * vh).toFixed(1) + 'px');
  stageEl.style.setProperty('--ts', c.s);
  stageEl.style.setProperty('--tr', c.r + 'deg');
  stageEl.style.setProperty('--depth', c.depth);
  emote.setView({ zoom: c.zoom, dy: c.dy }, instant ? 1 : 1100);
  const shown = !stageEl.classList.contains('gone') && stageEl.style.visibility !== 'hidden';
  // active 表示章节仍需要模型；标签页隐藏由 EmoteStage 自己暂停/恢复。
  emote.setActive(shown);
  halo.setActive(shown && !document.hidden && body.dataset.boot !== 'on');
}
/** 换场：8 种人物转场里随机挑一种（每章 2–3 种候选，不与上一次重复）。 */
const sfx = createStageFx({ stage: stageEl, bodyEl: $('#stage-body') });
const fxLog = { last: null, used: new Set(), count: 0 };
let lastX = null;
function migrateStage(key) {
  ++warpToken;
  if (reduce || body.dataset.boot === 'on') { applyPos(key); return null; }
  const c = POS[key];
  const wasHidden = stageEl.classList.contains('hidden');
  if (c.hide) { sfx.cancel(); applyPos(key); return null; }
  const pool = (POOL[key] || POOL.hero).filter((k) => k !== fxLog.last);
  const kind = pool[(Math.random() * pool.length) | 0] || 'cut';
  const nx = c.x * innerWidth;
  const dir = lastX == null ? 1 : (nx >= lastX ? 1 : -1);
  lastX = nx;
  fxLog.last = kind; fxLog.used.add(kind); fxLog.count++;
  stageEl.dataset.fx = kind;
  if (wasHidden) stageEl.classList.remove('hidden');   // 从“隐藏章节”回来：先取消隐藏再播入场
  sfx.run(kind, () => applyPos(key, { instant: false }), dir);
  return kind;
}
const stageFx = {
  vanish() { stageEl.classList.add('gone'); },
  reappear() {
    stageEl.classList.remove('gone'); stageEl.classList.add('warp-in');
    setTimeout(() => stageEl.classList.remove('warp-in'), 640);
    applyPos(curKey);
    if (!POS[curKey].hide) performance_(curKey, true);
  },
};

/** 换场方式 → 倾向的情绪/动作（表情与动作和转场联动）。 */
const KIND_EX = { slide: ['smile', 'calm', 'smug'], push: ['glare', 'surprise', 'smug'], rise: ['joy', 'smile', 'shy'], far: ['calm', 'worry', 'sleepy'], iris: ['surprise', 'smug', 'shy'], flip: ['surprise', 'smile', 'joy'], peek: ['shy', 'worry', 'pout'], cut: ['glare', 'surprise', 'angry'] };
const KIND_MO = { slide: ['sway', 'tilt'], push: ['lean', 'nod'], rise: ['nod', 'tilt'], far: ['away', 'tilt'], iris: ['tilt', 'nod'], flip: ['nod', 'cross'], peek: ['peek', 'away'], cut: ['cross', 'lean'] };
const perfLog = { n: 0, last: null, log: [], pending: null };
/** 表情 + 动作组合：切章时从“章节候选 ∩ 换场倾向”里随机，且表情与动作都不与上一次相同；点击时从全池里选。 */
function performance_(key, fromClick = false, kind = null) {
  if (emote.state !== 'ready') { if (!fromClick) perfLog.pending = { key, kind }; return false; }
  const c = POS[key] || POS.hero;
  let exs = fromClick ? ALL_EX : c.ex, mos = fromClick ? ALL_MO : c.mo;
  if (!fromClick && kind) {
    const e2 = KIND_EX[kind].filter((x) => c.ex.includes(x) || Math.random() < 0.5), m2 = KIND_MO[kind].filter((x) => c.mo.includes(x) || Math.random() < 0.5);
    if (e2.filter((x) => x !== lastEx).length) exs = [...new Set([...e2, ...c.ex])].filter((x) => e2.includes(x) || Math.random() < 0.4);
    if (m2.filter((x) => x !== lastMo).length) mos = [...new Set([...m2, ...c.mo])].filter((x) => m2.includes(x) || Math.random() < 0.4);
  }
  if (!exs.filter((x) => x !== lastEx).length) exs = ALL_EX;
  if (!mos.filter((x) => x !== lastMo).length) mos = ALL_MO;
  const ex = pick(exs, lastEx), mo = pick(mos, lastMo);
  lastEx = ex; lastMo = mo;
  emote.setExpression(EX[ex]);
  emote.motion(mo);
  halo.pulse(fromClick ? 0.9 : 0.6);
  perfLog.n++; perfLog.last = { key, kind, ex, mo, click: fromClick, t: Math.round(performance.now()) };
  perfLog.log.push(perfLog.last); if (perfLog.log.length > 24) perfLog.log.shift();
  return { ex, mo };
}
let perfToken = 0;
function performForChapter(key, kind) {
  const my = ++perfToken;
  setTimeout(() => { if (my === perfToken) performance_(key, false, kind); }, reduce ? 0 : 140);
}

emote.addEventListener('stage', () => { stageEl.dataset.state = emote.state; });
emote.addEventListener('ready', () => {
  stageEl.dataset.state = 'ready';
  if (perfLog.pending && body.dataset.boot !== 'on') { const p = perfLog.pending; perfLog.pending = null; performForChapter(p.key, p.kind); }
  fallback.hidden = true; stageMsg.hidden = true;
  if (body.dataset.boot === 'on') emote.eyes(true, 1);       // 开场期间：闭着眼，等待“睁眼”
});
emote.addEventListener('error', (e) => {
  stageEl.dataset.state = 'error';
  fallback.hidden = false;
  if (body.dataset.boot !== 'on') { stageMsg.hidden = false; }
  console.warn('[emote]', e.detail?.message);
});
emote.addEventListener('swap', (e) => { if (e.detail.phase === 'failed') console.warn('[emote] swap failed', e.detail.message); });
$('#stage-retry').addEventListener('click', () => { stageMsg.hidden = true; emote.reload(); });

// 点击人物：随机表情 + 动作，带节流（防连点）
let clickLock = 0;
const hitEl = $('#stage-hit');
const poke = () => {
  const now = performance.now();
  if (now - clickLock < 420) return;
  clickLock = now;
  performance_(curKey, true);
};
hitEl.addEventListener('click', (e) => { if (e.detail === 0) poke(); });   // 键盘（Enter/Space）触发
// 章节内容层在人物之上：用全局点击 + 命中框判断，避免被文字容器挡住；点到链接/按钮/道具时不触发
addEventListener('click', (e) => {
  if (body.dataset.boot === 'on' || e.detail === 0) return;
  if (e.target.closest && e.target.closest('a,button,input,[role],.ring,[data-hover],.ibm,.rail,.corner')) return;
  const r = hitEl.getBoundingClientRect();
  if (r.width < 10 || stageEl.classList.contains('hidden') || stageEl.classList.contains('gone')) return;
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
  poke();
});

// 视线：头与眼睛跟随鼠标
let lookRaf = 0, lx = 0, ly = 0;
addEventListener('pointermove', (e) => {
  lx = e.clientX; ly = e.clientY;
  if (lookRaf) return;
  lookRaf = requestAnimationFrame(() => {
    lookRaf = 0;
    const r = canvas.getBoundingClientRect();
    if (r.width < 10) return;
    const cx = r.left + r.width / 2, cy = r.top + r.height * 0.2;
    emote.lookAt((lx - cx) / (innerWidth * 0.5), (ly - cy) / (innerHeight * 0.5));
    stageEl.style.setProperty('--mx', (((lx / innerWidth) - 0.5) * 2).toFixed(3));
    stageEl.style.setProperty('--my', (((ly / innerHeight) - 0.5) * 2).toFixed(3));
  });
}, { passive: true });

/* ------------------------------------------------------------ 道具 */
$('#prop-mw').innerHTML = `<button class="mw" id="mw" type="button" title="电话微波炉（暂定）" aria-label="电话微波炉（暂定）：点击触发一次世界线变动">${microwaveHtml()}</button>`;
const ibmHost = document.createElement('div'); ibmHost.className = 'ibm';
$('#prop-ibm').append(ibmHost);
const ibmLocal = new Ibm(ibmHost, 'loc');
const ibmOver = new Ibm($('#sh-ibm'), 'ovl');
const NODE_LINES = {
  fe:   ['> FRONTEND  :5173', '  CHAT SUBTITLE STAGE', '  LOCAL GATEWAY ONLY', '', '> 127.0.0.1 LOOPBACK'],
  node: ['> NODE GATEWAY :3002', '  FRONT <-> CORE', '  LOOPBACK ONLY', '', '> 127.0.0.1 LOOPBACK'],
  py:   ['> PYTHON CORE  :8001', '  WEBRTC REALTIME', '  LOOPBACK ONLY', '', '> 127.0.0.1 LOOPBACK'],
};
$$('.node').forEach((n) => n.addEventListener('click', () => {
  $$('.node').forEach((x) => { const on = x === n; x.classList.toggle('is-on', on); x.setAttribute('aria-selected', String(on)); });
  ibmLocal.show(NODE_LINES[n.dataset.node]);
}));
ibmLocal.show(NODE_LINES.fe);
const dmHost = $('#prop-dm'); const dm = new Divergence(dmHost, WORLDS.a.reading);
dmHost.addEventListener('click', () => { if (dmHost.classList.contains('dm-rolling')) return; const cur = body.dataset.world === 'b' ? 'b' : 'a'; dm.roll(WORLDS[cur].reading, 1100, 70); });
const nixShift = new Meter($('#sh-meter'), 'd.dddddd'); nixShift.set(WORLDS.a.reading);
const railNixHost = document.createElement('div'); railNixHost.className = 'rail-nix';
$('#rail').append(railNixHost);
const railNix = new GlowNum(railNixHost, 2); railNix.set('01');

/* ------------------------------------------------------------ 第十轮：左上“开发中”读数 / 报告抬头时间戳 / 路线阶段号 */
const devBadge = (() => {
  const host = $('#dev-meter'); if (!host) return null;
  const m = new Meter(host); let world = 'a', timer = 0, raf = 0;
  m.set(WORLDS.a.reading);
  const flicker = () => {
    timer = setTimeout(flicker, 7000 + Math.random() * 6000);
    if (document.hidden || body.dataset.shift || reduce) return;
    const t0 = performance.now();
    const f = (now) => {
      if (now - t0 < 560) { m.tick(now, 3.2); raf = requestAnimationFrame(f); return; }
      m.lock(WORLDS[world].reading, now); setTimeout(() => m.set(WORLDS[world].reading), 170);
    };
    raf = requestAnimationFrame(f);
  };
  timer = setTimeout(flicker, 4200);
  return { set(w) { world = w; cancelAnimationFrame(raf); m.set(WORLDS[w].reading); }, meter: m };
})();
function stampKickers(w = body.dataset.world === 'b' ? 'b' : 'a') {
  const d = new Date(), p2 = (n) => String(n).padStart(2, '0');
  const ts = `${d.getFullYear()}.${p2(d.getMonth() + 1)}.${p2(d.getDate())} · WL ${WORLDS[w].reading}`;
  $$('.kicker .k-ts').forEach((el) => { el.textContent = ts; });
}
$$('.st-no').forEach((el) => new GlowNum(el, 2).set(el.dataset.no));
function measureRoad() {   // 已完成段上的流光走完整段
  $$('.steps .st').forEach((st, i, all) => { const n = all[i + 1]; if (n) st.style.setProperty('--seg', Math.max(40, n.offsetLeft - st.offsetLeft - 44) + 'px'); });
}

/* ------------------------------------------------------------ 世界线变动（彩蛋） */
const shift = createShift({
  emote, halo, stageFx, ibm: ibmOver, nix: nixShift, mw: $('#mw'),
  onWorld: (w) => { palette(w); dm.set(WORLDS[w].reading); },
  onDone: () => { measureSections(); rail.layout(); onScroll(); },
});
bindMicrowaveFx($('#mw'));
$('#mw').addEventListener('click', () => { performer.stop('shift'); ding(); shift.toggle('click'); });
addEventListener('keydown', (e) => { if ((e.key === 'd' || e.key === 'D') && !e.metaKey && !e.ctrlKey && !e.altKey && body.dataset.boot !== 'on') { performer.stop('shift'); shift.toggle('key'); } });

/* ------------------------------------------------------------ 章节、背景、进度（世界线） */
/* 章节编号 / 条目编号：辉光数字（与开屏读数同款字形与橙色辉光，无玻璃管） */
$$('.sec .vtag').forEach((v) => { const i = sections.indexOf(v.closest('.sec')) + 1; const h = document.createElement('span'); h.className = 'sec-no'; v.prepend(h); new GlowNum(h, 2).set(String(i).padStart(2, '0')); });
$$('i.no').forEach((el) => new GlowNum(el, 2).set(el.dataset.no));
const rail = new Rail($('#rail'), sections, {
  onGo: (i) => sections[i].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }),
});
$$('[data-go]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); }));
$('#to-top').addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

const bgls = $$('.bgl');
const bgByKey = new Map(bgls.map((b) => [b.dataset.id, b]));
bgls.forEach((b) => b.addEventListener('transitionend', (e) => {
  if (e.propertyName === 'opacity' && !b.classList.contains('on')) b.classList.remove('leaving');
}));
let curSec = null;
let sectionLayout = [], scrollMax = 1;
function measureSections() {
  sectionLayout = sections.map((el) => ({ el, top: el.offsetTop, height: el.offsetHeight }));
  scrollMax = Math.max(1, document.documentElement.scrollHeight - innerHeight);
}
function enterSection(sec, first = false) {
  if (curSec === sec) return;
  curSec = sec;
  const key = sec.dataset.pos; curKey = key;
  const i = sections.indexOf(sec);
  body.dataset.sec = sec.id;
  bgls.forEach((b) => {
    const on = b.dataset.id === key;
    if (!on && b.classList.contains('on')) b.classList.add('leaving');
    if (on) b.classList.remove('leaving');
    b.classList.toggle('on', on);
  });
  rail.setCurrent(i, first);
  const pageNumber = String(i + 1).padStart(2, '0');
  if (reduce) railNix.set(pageNumber); else railNix.roll(pageNumber, 420, 50);
  ibmLocal.setActive(key === 'local');
  if (key !== 'perform') performer?.stop('leave');
  if (first) { applyPos(key); return; }
  const kind = migrateStage(key);
  performForChapter(key, kind);          // 每次换章都换一套表情+动作（含隐藏章节），与换场方式联动
  halo.setActive(!POS[key].hide && body.dataset.boot !== 'on');
}

let tick = false;
function onScroll() {
  if (tick) return; tick = true;
  requestAnimationFrame(() => {
    tick = false;
    if (!sectionLayout.length) measureSections();
    const y = scrollY, mid = y + innerHeight * .5;
    let current = sectionLayout[0];
    for (const entry of sectionLayout) if (entry.top <= mid) current = entry;
    if (current.el !== curSec) enterSection(current.el);
    rail.setProgress(y / scrollMax);
    // 背景视差（只动当前章节的底图）与人物景深视差
    if (current) {
      const u = Math.max(-1, Math.min(1, (y - current.top) / Math.max(1, current.height)));
      // 高频变量只写入对应图层，避免从 html 继承到整份长页面。
      bgByKey.get(curKey)?.style.setProperty('--bgp', (u * -46).toFixed(1) + 'px');
      stageEl.style.setProperty('--py', (u * -34 * (POS[curKey]?.depth || 1)).toFixed(1) + 'px');
    }
  });
}
addEventListener('scroll', onScroll, { passive: true });
let rz = 0;
addEventListener('resize', () => {
  clearTimeout(rz);
  rz = setTimeout(() => { measureSections(); rail.layout(); halo.resize(); applyPos(curKey); positionTabBar(); measureRoad(); onScroll(); }, 120);
});
document.fonts.ready.then(() => { measureSections(); rail.layout(); positionTabBar(); measureRoad(); onScroll(); });
let layoutFrame = 0;
const sectionSizes = new ResizeObserver(() => {
  // 乱码期间字宽持续变化；等文案还原后统一更新导航，避免反复重建 SVG 节点。
  if (body.dataset.shift === 'run') return;
  if (layoutFrame) return;
  layoutFrame = requestAnimationFrame(() => { layoutFrame = 0; measureSections(); rail.layout(); onScroll(); });
});
sections.forEach((s) => sectionSizes.observe(s));
const sectionVisibility = new IntersectionObserver((entries) => {
  entries.forEach((e) => e.target.classList.toggle('in-view', e.isIntersecting));
}, { rootMargin: '80px' });
sections.forEach((s) => sectionVisibility.observe(s));
document.addEventListener('visibilitychange', () => { if (document.hidden) performer.stop('hidden'); halo.setActive(!document.hidden && !POS[curKey]?.hide && body.dataset.boot !== 'on' && !stageEl.classList.contains('gone') && stageEl.style.visibility !== 'hidden'); });

/* ------------------------------------------------------------ 入场动效（位移 + 淡入，避免字距变化反复重排） */
const RV = '.h1,.h2,.lead,.p,.note,.triad li,.rows li,.tabs,.plist,.tier,.b-notes li,.rings,.chain,.trio .tri,.nodes,.rules li,.prop,.steps .st,.cta,.credits,.logo';
$$(RV).forEach((el) => el.classList.add('rv'));
$$('.sec').forEach((s) => $$('.rv', s).forEach((el, i) => el.style.setProperty('--d', Math.min(i, 9) * 80 + 'ms')));
const rvObs = new IntersectionObserver((en) => {
  for (const e of en) if (e.isIntersecting && body.dataset.boot !== 'on') { e.target.classList.add('in'); rvObs.unobserve(e.target); }
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
$$('.rv').forEach((el) => rvObs.observe(el));
const flushReveal = () => $$('.rv:not(.in)').forEach((el) => { rvObs.unobserve(el); rvObs.observe(el); });
if (reduce) $$('.rv').forEach((el) => el.classList.add('in'));

/* ------------------------------------------------------------ 双模式 / 边界 / 表演 交互 */
const tabs = $$('.tab');
const tabsEl = $('.tabs');
function positionTabBar() {
  const on = tabs.find((t) => t.classList.contains('is-on'));
  if (!on) return;
  tabsEl.style.setProperty('--bx', on.offsetLeft + 'px');
  tabsEl.style.setProperty('--bw', on.offsetWidth + 'px');
}
function selectMode(mode, fromUser = true) {
  tabs.forEach((t) => { const on = t.dataset.mode === mode; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
  $('#panel-daily').classList.toggle('is-on', mode === 'daily'); $('#panel-daily').hidden = mode !== 'daily';
  $('#panel-vn').classList.toggle('is-on', mode === 'vn'); $('#panel-vn').hidden = mode !== 'vn';
  positionTabBar();
  if (fromUser && emote.state === 'ready') { emote.setExpression(EX[mode === 'vn' ? 'glare' : 'smile']); emote.motion(mode === 'vn' ? 'lean' : 'tilt'); halo.pulse(0.6); }
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => selectMode(t.dataset.mode));
  t.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const n = tabs[(i + 1) % 2]; n.focus(); selectMode(n.dataset.mode); } });
});

const TIERS = [
  { label: '亲身经历', title: '确定的个人记忆', line: '这个我记得，不用查。', body: '自己的经历、明确知道的事、你们对话里确认过的事，可以直接说。', ex: 'smile' },
  { label: '眼前所见', title: '当前观察', line: '我看到的是……先别急着下结论。', body: '只来自你选定的窗口。画面里有什么，她才说“我看到”。', ex: 'calm' },
  { label: '模糊回想', title: '碎片既视感', line: '奇怪……这一幕，好像在哪见过。', body: '别的世界线只剩碎片。只能说“好像”“有点眼熟”，不能当成事实。', ex: 'worry' },
  { label: '未知的故事', title: '禁止全知', line: '结局？我怎么可能知道。', body: '作品外的资料、还没解锁的剧情、Re:Boot 的新内容，她一概不知，也不剧透。', ex: 'glare' },
];
const disk = $('#rings');
let tierCur = 0, tierType = 0, scanT = 0;
function typeQuote(el, text) {
  clearInterval(tierType); el.classList.add('typing');
  if (reduce) { el.textContent = text; el.classList.remove('typing'); return; }
  let n = 0; el.textContent = '';
  tierType = setInterval(() => { n++; el.textContent = text.slice(0, n); if (n >= text.length) { clearInterval(tierType); el.classList.remove('typing'); } }, 55);
}
function selectTier(i, { force = false } = {}) {
  if (i === tierCur && !force) return;
  tierCur = i;
  $$('#rings .ring').forEach((g) => g.classList.toggle('is-on', Number(g.dataset.tier) === i));
  $$('#rings .r-tx').forEach((t) => t.classList.toggle('on', Number(t.dataset.tier) === i));
  $$('#rings .dk-blip').forEach((c) => c.classList.toggle('on', Number(c.dataset.tier) === i));
  const t = TIERS[i];
  $('#td-no').textContent = 'SECTOR ' + i; $('#td-key').textContent = t.label; $('#td-title').textContent = t.title; $('#td-body').textContent = t.body;
  typeQuote($('#td-line'), t.line);
  $('#tier').dataset.tier = i;
  disk.classList.add('scan'); clearTimeout(scanT); scanT = setTimeout(() => disk.classList.remove('scan'), 900);
  if (emote.state === 'ready') { emote.setExpression(EX[t.ex]); halo.pulse(0.5); }
}
$$('#rings .ring').forEach((g) => {
  const i = Number(g.dataset.tier);
  g.addEventListener('click', () => selectTier(i));
  g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectTier(i); } });
  g.addEventListener('pointerenter', () => selectTier(i));
});
{ // 外圈刻度 + 各磁道上的“记录点”（固定伪随机分布，非数据）
  const NSV = 'http://www.w3.org/2000/svg';
  const g = $('#rings .r-spin'); let s = '';
  for (let i = 0; i < 120; i++) { const a = (i / 120) * Math.PI * 2, r1 = 254, r2 = i % 10 === 0 ? 266 : 259; s += `M${(Math.cos(a) * r1).toFixed(1)} ${(Math.sin(a) * r1).toFixed(1)}L${(Math.cos(a) * r2).toFixed(1)} ${(Math.sin(a) * r2).toFixed(1)}`; }
  const p = document.createElementNS(NSV, 'path'); p.setAttribute('d', s); p.setAttribute('class', 'r-ticks'); g.append(p);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const blips = $('#rings .dk-blips'), R = [[0, 22, 4], [1, 100, 7], [2, 158, 6], [3, 216, 9]];
  for (const [tier, r, n] of R) for (let k = 0; k < n; k++) {
    const a = rnd() * Math.PI * 2, rr = tier === 0 ? r * rnd() : r + (rnd() - 0.5) * 30;
    const c = document.createElementNS(NSV, 'circle');
    c.setAttribute('cx', (Math.cos(a) * rr).toFixed(1)); c.setAttribute('cy', (Math.sin(a) * rr).toFixed(1)); c.setAttribute('r', (tier === 3 ? 2.2 : 3).toString());
    c.setAttribute('class', 'dk-blip' + (tier === 3 ? ' lock' : '') + (tier === 0 ? ' on' : '')); c.dataset.tier = tier;
    c.style.animationDelay = (-rnd() * 1.6).toFixed(2) + 's';
    blips.append(c);
  }
  $$('#rings .r-tx[data-tier="0"]').forEach((t) => t.classList.add('on'));
}
performer = createPerformer({ emote, EX, halo, stageEl, buttons: $$('.tri') });
$$('.tri[data-act="text"] .tri-viz u').forEach((u, i) => u.style.setProperty('--i', i));

/* ------------------------------------------------------------ 指针 */
const cursor = createCursor({ layer: $('#cursor-layer') });

/* ------------------------------------------------------------ 启动：开场 → 首屏 */
palette('a');
halo.setPalette(WORLDS.a.rgb, WORLDS.a.rgb2);
enterSection(sections[0], true);
positionTabBar();
emote.start();
emote.setActive(true);
onScroll();
if (new URLSearchParams(location.search).has('noboot')) { /* 调试：跳过开场（仍会等待模型） */ }

const bootDone = runBoot({
  emote, emoteCanvas: canvas,
  onReveal: ({ ready }) => {
    body.dataset.boot = 'done';
    rail.layout();
    applyPos(curKey);
    halo.setActive(true);
    flushReveal();
    if (ready) {
      // 红莉栖“睁眼”：从闭眼渐开，随后一个小动作
      emote.eyes(false, 650);
      emote.setExpression(EX.calm);
      setTimeout(() => { emote.setExpression(EX.smile); emote.motion('tilt'); halo.pulse(1); }, 700);
    } else {
      fallback.hidden = emote.state === 'ready';
      stageMsg.hidden = emote.state !== 'error';
    }
  },
}).then(() => { body.dataset.bootEnd = '1'; });

// 测试/调试钩子（只读状态与少量操作）
window.__promo = {
  emote, shift, rail, halo, sfx, bootDone, POS, EX, get performer() { return performer; }, devBadge,
  info() {
    return {
      state: emote.state, stage: emote.stage, active: emote.active, rendering: emote.rendering, alias: emote.alias,
      current: emote.current, world: body.dataset.world, sec: body.dataset.sec, boot: body.dataset.boot, railHead: +(rail.waves.hx / innerWidth).toFixed(3),
      perf: { n: perfLog.n, last: perfLog.last, log: perfLog.log.slice(-12) },
      fx: { last: fxLog.last, used: [...fxLog.used], count: fxLog.count, kinds: KINDS }, stats: { ...emote.stats }, swapping: emote.swapping, busy: shift.state.busy, shifts: shift.state.count,
    };
  },
  perform: (k) => performance_(k || curKey, true),
};
