/**
 * 世界线变动（彩蛋）：点击电话微波炉（或按 D 键）触发。
 * 第四轮按用户反馈简化、克制，并与用户 Amadeus 前端的“世界线变动”表演统一语言（见 docs/boot-reference.md）；
 * 第六轮在前面加入“空间撕裂”（src/tear.js：画面切片位移 + 裂缝 + 残影 + 竖拖 + 黑帧 + 蓝青异空间），约 4s：
 *   撕裂（页面文字同时崩成 IBM 5100 乱码）→ 画面压暗转红 + 红色光带
 *   → 橙色细线数字整排成组跳变（只有辉光管里面的橙色显示，没有玻璃管）→ 逐位锁定 → 闪光
 *   → 黑场里换世界线 → 新世界线显现，文字逐行从乱码重组。约 3 秒。
 * 统一时间轴：整个演出由 toggle() 里的一条时间表驱动；数字由 Meter 在同一个 rAF 里驱动。
 * 低配 / 减少动效：不使用整页 drop-shadow 色散滤镜，改用透明度 + 位移的残影（html.wl-gh）；不抖动。
 */
import { TextCipher } from './cipher.js';
import { Tear } from './tear.js';

export const WORLDS = {
  a: { reading: '1.048596', model: 'ab',  name: 'STEINS;GATE', rgb: [255, 174, 46], rgb2: [216, 54, 44] },
  b: { reading: '0.571024', model: 'alt', name: 'ALPHA',       rgb: [255, 200, 97], rgb2: [185, 164, 255] },
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROMA = 'drop-shadow(-5px 0 0 rgba(170,140,255,.32)) drop-shadow(5px 0 0 rgba(255,70,50,.32))';

// 低配降级：检测到持续低帧率（<~28fps）或 prefers-reduced-motion 时不用整页滤镜，改用透明度+位移残影
const fpsMon = { ema: 16.7, n: 0, last: 0, on: false };
function startFpsMon() {
  if (fpsMon.on) return; fpsMon.on = true;
  const f = (t) => { if (!document.hidden && fpsMon.last && t - fpsMon.last < 250) { fpsMon.ema += ((t - fpsMon.last) - fpsMon.ema) * 0.08; fpsMon.n++; } fpsMon.last = t; requestAnimationFrame(f); };
  requestAnimationFrame(f);
}
export const isLite = () => window.__wlLite === true || matchMedia('(prefers-reduced-motion: reduce)').matches || (fpsMon.n > 40 && fpsMon.ema > 36);

export function createShift({ emote, halo, stageFx, ibm, nix, mw, onWorld, onDone }) {
  const body = document.body, html = document.documentElement;
  const el = document.getElementById('shift');
  const cap = document.getElementById('sh-cap');
  startFpsMon();
  const tear = new Tear(document.getElementById('bgs'));
  const stageDom = document.getElementById('stage'), emoteCv = document.getElementById('emote-canvas');
  const st = { world: 'a', busy: false, count: 0, lastMs: 0, phases: [], lite: false };
  const q = (s) => el.querySelector(s);
  const L = { void: q('.sh-void'), streaks: q('.sh-streaks'), top: q('.sh-top'), ibm: q('.sh-ibm'), flare: q('.sh-flare'), black: q('.sh-black') };
  const op = (n, v, ms = 0) => { n.style.transition = ms ? `opacity ${ms}ms ease-out` : 'none'; n.style.opacity = v; };
  const mark = (name) => st.phases.push(name);
  const inView = (e) => { const r = e.getBoundingClientRect(); return r.bottom > -80 && r.top < innerHeight + 80 && r.width > 0; };
  const txs = () => [...document.querySelectorAll('.tx')];
  for (const t of txs()) t.dataset.a = t.innerHTML;     // 保存世界线 A 的原文

  const chroma = (on, lite) => {
    html.classList.remove('wl-gh', 'wl-shake');
    if (!on) { html.removeAttribute('data-wl'); html.style.removeProperty('--wl-f'); return; }
    html.dataset.wl = 'chroma';
    if (lite) { html.style.setProperty('--wl-f', 'none'); html.classList.add('wl-gh'); }
    else { html.style.setProperty('--wl-f', CHROMA); html.classList.add('wl-shake'); }
  };
  function resetLayers() {
    for (const n of Object.values(L)) { n.style.transition = 'none'; n.style.opacity = ''; }
    L.top.classList.remove('in', 'smear');
    chroma(false);
    nix.unlock();
    el.classList.remove('on');
  }

  async function toggle() {
    if (st.busy || emote.swapping || emote.state === 'swapping') return false;
    st.busy = true; st.count++; st.phases = [];
    const lite = isLite(); st.lite = lite;
    let torn = false; if (!lite) { try { torn = await tear.prepare(emoteCv); } catch (e) { torn = false; } }
    const t0 = performance.now();
    const from = st.world;
    let to = from === 'a' ? 'b' : 'a', W = WORLDS[to];
    const timers = [], live = new Map();
    let scr = 0, preparedP = Promise.resolve(null), downloadDone = false, raf = 0, revealed = false;
    // 统一时间表（ms）
    const T = { tear: 300, dim: 1250, digits: 1400, lock: 2050, black: 3000 };
    const at = async (t) => { const d = t - (performance.now() - t0); if (d > 0) await wait(d); };
    try {
      body.dataset.shift = 'run';
      mw?.classList.add('lit');
      el.classList.add('on');
      cap.textContent = '世界线变动率';
      nix.set(WORLDS[from].reading);
      ibm.setActive(true); ibm.idle();

      // ① 短促失稳：轻微色散 + 抖动；页面文字崩成 IBM 5100 乱码
      mark('glitch'); chroma(true, lite);
      if (torn) { tear.start(); stageDom.style.visibility = 'hidden'; emote.setActive(false); halo.setActive(false); }
      await at(90);
      body.classList.add('glitch');
      const scrambleTargets = txs().filter(inView);
      for (const t of scrambleTargets) { const c = new TextCipher(t); live.set(t, c); t.classList.add('ciph'); }
      scr = setInterval(() => { for (const c of live.values()) c.frame(-1); }, 70); timers.push(scr);

      await at(T.tear); mark('tear');
      // ② 撕裂之后：画面压暗转红 + 红色光带
      await at(T.dim); mark('dim');
      op(L.void, 1, 450); op(L.streaks, 1, 500);
      stageFx.vanish();
      // 数字期间只下载；同步 PSB 解析留到黑场，避免把跳变动画卡停。
      emote.setActive(false); halo.setActive(false);
      preparedP = (emote.state === 'ready' ? emote.prepareSwap(W.model) : Promise.resolve(null)).catch(() => null).then((v) => { downloadDone = true; return v; });

      // ③ 橙色细线数字：整排成组跳变（IBM 5100 屏幕同时亮起解码）
      await at(T.digits); mark('digits');
      chroma(false);
      setTimeout(() => tear.stop(), 380);   // 红色蒙版完全盖住后再撤掉撕裂画布
      ibm.show(['IBM 5100   APL / BASIC', '> DECODE WORLDLINE', '  ' + W.reading + ' ⍺←⍳16 ⋄', '  D-MAIL CHANNEL OPEN', '  ATTRACTOR ' + W.name, '  HASH 4F ⍴ A3 ⌷ 9C 71', '> RESULT: SYNC'], { decode: true });
      op(L.ibm, 0.9, 300);
      nix.unlock(); L.top.classList.add('in');
      let lockAt = 0;
      const drive = (now) => {
        if (st.stop) return;
        if (!lockAt) nix.tick(now, 1.5);
        else if (!nix.locked) nix.seq(now, Math.min(Math.floor((now - lockAt) / 85) + 1, downloadDone ? 7 : 6), W.reading);
        else nix.tickFlash(now);
        raf = requestAnimationFrame(drive);
      };
      raf = requestAnimationFrame(drive);

      // ④ 逐位锁定（最后一位等待模型下载完成）→ 闪光
      await at(T.lock); mark('lock');
      nix.unlock(); lockAt = performance.now();
      let prepared = await preparedP;
      while (!nix.locked) await wait(30);
      op(L.flare, 0.7); setTimeout(() => op(L.flare, 0, 550), 60);
      await at(Math.max(T.black, performance.now() - t0 + 350));

      // ⑤ 黑场里换世界线
      mark('swap');
      cancelAnimationFrame(raf); L.top.classList.add('smear'); op(L.ibm, 0, 200);
      op(L.black, 1, 260); await wait(300);
      // 黑场已经合成到屏幕后才释放/解析；不常驻第二个模型或 205MB 字节缓存。
      clearInterval(scr);
      if (prepared) emote.setActive(true);  // 让首次纹理上传也在黑场中完成。
      const swapped = prepared && await emote.swap(W.model, null, prepared);
      emote.setActive(false);
      prepared = null; preparedP = null;
      if (!swapped) { to = from; W = WORLDS[from]; }
      setWorld(to); stageDom.style.visibility = '';
      const texts = txs();
      for (const t of texts) t.innerHTML = to === 'b' ? (t.dataset.b ?? t.dataset.a) : t.dataset.a;
      const visible = new Set(texts.filter(inView));
      live.clear();
      for (const t of texts) { if (visible.has(t)) { const c = new TextCipher(t); c.frame(-1); live.set(t, c); t.classList.add('ciph'); } else t.classList.remove('ciph'); }
      resetLayers(); el.classList.add('on'); op(L.black, 1); ibm.setActive(false);
      nix.set(W.reading);
      await wait(200);

      // ⑥ 新世界线显现：黑场淡出 + 文字逐行从乱码重组
      mark('reveal');
      stageFx.reappear();
      revealed = true;
      op(L.black, 0, 600);
      const jobs = []; let order = 0;
      for (const [t, c] of live) {
        if (!document.body.contains(t)) continue;
        const delay = Math.min(order++ * 50, 1200);
        jobs.push(new Promise((res) => {
          setTimeout(() => {
            const d0 = performance.now(), dur = 480;
            const iv = setInterval(() => {
              const p = Math.min(1, (performance.now() - d0) / dur);
              c.frame(p);
              if (p >= 1) { clearInterval(iv); t.classList.remove('ciph'); c.restore(); res(); }
            }, 45);
            timers.push(iv);
          }, delay);
        }));
      }
      await Promise.all(jobs);
      st.world = to; st.lastMs = Math.round(performance.now() - t0);
      return !!swapped;
    } catch (err) {
      console.error('[shift]', err);
      return false;
    } finally {
      st.stop = true; cancelAnimationFrame(raf); setTimeout(() => { st.stop = false; }, 0);
      timers.forEach(clearInterval);
      for (const t of document.querySelectorAll('.tx.ciph')) { t.classList.remove('ciph'); }
      // 兜底：保证所有文案都处于目标世界线
      const w = body.dataset.world;
      st.world = w;
      for (const t of txs()) { const h2 = w === 'b' ? (t.dataset.b ?? t.dataset.a) : t.dataset.a; if (t.innerHTML !== h2) t.innerHTML = h2; }
      body.classList.remove('glitch');
      tear.stop(); stageDom.style.visibility = '';
      resetLayers();
      delete body.dataset.shift;
      ibm.setActive(false);
      if (!revealed) stageFx.reappear();
      onDone?.(st.world);
      setTimeout(() => mw?.classList.remove('lit'), 900);
      st.busy = false;
    }
  }

  function setWorld(w) {
    body.dataset.world = w; document.documentElement.dataset.world = w;
    halo.setPalette(WORLDS[w].rgb, WORLDS[w].rgb2);
    onWorld?.(w);
  }

  return { toggle, state: st, setWorld, tear };
}
