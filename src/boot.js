/**
 * 开场（第六轮）。时序：数字变动演出 → 世界线从左上角流出、向下向右汇聚到一点 → 进入按钮出现（APL/十六进制/BASIC 乱码）
 * → 悬停解码成 “El Psy Kongroo” → 用户点击（或 Enter）才进入主页。
 *   数字变动（保持上一轮）：压暗转红、红色光带、满屏橙色细线数字、260ms 成组跳变、2.35s 起逐位 110ms 锁定到 1.048596、闪光。
 *   世界线：Canvas，约 2.4s 从左上角生长，汇集到屏幕中下方的一点（src/wconv.js）；进入按钮就位于汇集点（src/entry.js）。
 * 约束：模型加载完才允许进入——未就绪时按钮显示加载态（乱码快速刷新 + 加载进度）且不可点；
 *       加载失败/超时降级（静态图）后仍可进入；数字演出期间点击只加速，不会跳过按钮。
 */
import { Meter } from './meter.js';
import { ConvergeLines } from './wconv.js';
import { BootEntry } from './entry.js';
import { BootField } from './bgfield.js';
import { avoidRects, targetPoint, cgLayout } from './bootcg.js';

const QS = new URLSearchParams(location.search);
const AUTO = QS.has('autoenter');
const WL_VARIANT = QS.get('wl') === 'b' ? 'b' : 'a';   // 均为暖橙；?wl=b 的线条密度更高
const FINAL = '1.048596';
const BASE = import.meta.env.BASE_URL;

export function runBoot({ emote, emoteCanvas, onReveal, minMs = 3300, giveUpMs = 45000 }) {
  const root = document.getElementById('boot');
  // 入口显示期间，背景里的链接和人物不能抢走键盘焦点或触发浏览器自动滚动。
  const pageRoots = [...document.querySelectorAll('#main, .corner, .gh, #stage, #rail')];
  pageRoots.forEach((el) => { el.inert = true; });
  document.documentElement.classList.add('boot-lock');
  history.scrollRestoration = 'manual';
  scrollTo({ top: 0, behavior: 'instant' });
  root.focus({ preventScroll: true });
  const $ = (s) => root.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const meter = $('#bt-meter'), msg = $('#bt-msg'), tcEl = $('#bt-tc'), skip = $('#bt-skip');
  const mt = new Meter(meter); mt.set('1.130426');
  const eCv = $('#bt-emote'), eCtx = eCv.getContext('2d');
  const cv = $('#bt-wl');
  root.classList.add('on');
  // 底图：用户 Amadeus ready 界面的红莉栖 CG（WebP）；加载失败 → 回退到纯黑星图背景（BootField），世界线仍可用
  let cgOn = false;
  root.insertAdjacentHTML('afterbegin', '<div class="bt-cg"></div><div class="bt-cgfx"></div><div class="bt-hud"><b>CAM 04 · FUTURE GADGET LAB</b><i id="bt-hd"></i><u id="bt-ht"></u></div>');
  const cgEl = $('.bt-cg');
  const hud = () => { const n = new Date(), p = (x) => String(x).padStart(2, '0'); $('#bt-hd').textContent = `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`; $('#bt-ht').textContent = `${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`; };
  hud(); const hudTimer = setInterval(hud, 1000);
  const cgImg = new Image();
  cgImg.onload = () => { cgEl.style.backgroundImage = `url(${cgImg.src})`; cgOn = true; root.classList.add('cg'); field.stop(); layout(); };
  cgImg.onerror = () => { clearInterval(hudTimer); root.classList.remove('cg'); root.classList.add('cg-fail'); cgEl.remove(); root.querySelector('.bt-cgfx')?.remove(); root.querySelector('.bt-hud')?.remove(); cgOn = false; field.start(); layout(); };
  cgImg.src = `${BASE}img/boot-cg.webp`;
  const tp = () => targetPoint(innerWidth, innerHeight);
  const wl = new ConvergeLines(cv, { seed: 31, count: 6, maxDpr: 1.25, ...tp(), variant: WL_VARIANT, avoid: (W, H) => (cgOn ? avoidRects(W, H) : []) });
  const field = new BootField($('#bt-bgc'), { ...tp() });
  const layout = () => {
    cgEl.style.backgroundPosition = `50% ${cgLayout(innerWidth, innerHeight).positionY * 100}%`;
    const t = tp(); wl.px = field.px = t.px; wl.py = field.py = t.py; root.style.setProperty('--ey', `${(t.py * 100).toFixed(2)}%`);
    wl.resize(); field.resize(); window.__bootLines = { wl, cgOn };
  };
  layout(); addEventListener('resize', layout); wl.start(); field.start();
  window.__bootState = () => ({ phase, grow, logo: root.classList.contains('logo-in') });
  let enterFn = () => {};
  const entry = new BootEntry($('#bt-entry'), { onEnter: () => enterFn() });
  window.__bootEntry = entry;

  let vt = 0, last = performance.now(), speed = 1, phase = 'run', phaseAt = 0, tcFrames = 0, tick = 0, dots = 0;
  let stopped = false, lockVt = 0, grow = 0, ready = false;
  const growSpan = reduce ? 1400 : 3300;
  root.addEventListener('pointerdown', accel);
  const onKey = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      (entry.shown && !entry.btn.disabled ? entry.btn : root).focus({ preventScroll: true });
      return;
    }
    if ([' ', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(e.key)) e.preventDefault();
    if (phase === 'flow' || phase === 'wait' || phase === 'finale') { if (e.key === 'Enter' && phase !== 'finale' && root.classList.contains('entry-in') && ready) { e.preventDefault(); entry.go(); } return; }
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') accel();
  };
  addEventListener('keydown', onKey);
  function accel() { if (phase !== 'run') return; speed = 2.8; skip.textContent = '加速中'; skip.classList.add('on'); }   // 只加速数字演出，不会跳过进入按钮
  function loadP() {
    if (emote.state === 'ready' || emote.state === 'error') return 1;
    const s = emote.stage;
    if (s === 'model') return 0.1 + 0.8 * (emote.progress || 0);
    if (s === 'parse') return 0.94;
    if (s === 'logo') return 0.08;
    return 0.03;
  }
  const pad = (n) => String(n).padStart(2, '0');

  return new Promise((resolve) => {
    const timer = setInterval(frame, 40);
    function frame() {
      if (stopped) return;
      const now = performance.now();
      vt += (now - last) * speed; last = now; tick++;
      const lp = loadP();
      const failed = emote.state === 'error';
      const gaveUp = (performance.now() - bornAt) > giveUpMs && emote.state !== 'ready';
      ready = emote.state === 'ready' || failed || gaveUp;

      tcFrames += Math.random() < 0.18 ? Math.floor(Math.random() * 400) : Math.floor(speed * 1.6);
      tcEl.textContent = `▶▶ 00:${pad(Math.floor(tcFrames / 1500) % 60)}:${pad(Math.floor(tcFrames / 25) % 60)}:${pad(tcFrames % 25)}`;

      if (vt > 150) root.classList.add('bg-in');
      if (vt > 200) root.classList.add('streak');
      if (vt > 250) root.classList.add('meter-in');
      if (vt > 1600 && phase === 'run') skip.classList.add('show');

      // 世界线与数字变动并行：开屏一开始就从左缘/底缘流入，约在数字逐位锁定前后汇聚完成（由 vt 驱动，加速时同步加速）
      grow = Math.min(1, Math.max(0, (vt - 300) / growSpan));
      wl.setGrow(grow); if (phase === 'run' || phase === 'finale') field.setWarm(grow * 0.7);
      const pct = Math.round((emote.progress || 0) * 100);
      if (phase === 'run') {
        if (!mt.locked) {
          if (vt < 2350) { if (vt > 700) mt.tick(now, Math.min(speed, 2)); }
          else mt.seq(now, Math.floor((vt - 2350) / 110) + 1, FINAL);   // 逐位收束（纯时间驱动；模型就绪由进入按钮把关）
        } else mt.tickFlash(now);
        if (vt > 600 && Math.random() < 0.04 * Math.min(speed, 2)) { root.classList.add('jump'); setTimeout(() => root.classList.remove('jump'), 90 + Math.random() * 80); }
        if (mt.locked && !lockVt) lockVt = vt;
        if (mt.locked && vt - lockVt > 120) { phase = 'finale'; phaseAt = now; root.classList.add('flare'); skip.classList.remove('show'); msg.textContent = '世界线收束'; }
        else msg.textContent = emote.stage === 'model' && emote.state !== 'ready' ? `载入形象　${pct}%` : emote.stage === 'parse' ? '解析形象' : '世界线观测中';
      } else if (phase === 'finale') {
        const e = now - phaseAt;
        if (e > 500) { root.classList.add('dig-out'); root.classList.add('logo-in'); }   // 数字缩小淡出；Amadeus logo 在数字锁定、闪光之后淡入（左上角）
        if (e > 1000) { phase = 'flow'; phaseAt = now; msg.textContent = ''; root.classList.add('cg-up'); }
      } else if (phase === 'flow') {
        if (!root.classList.contains('entry-in')) { root.classList.add('entry-in'); entry.show(); }
        if (grow >= 1) { phase = 'wait'; phaseAt = now; }
      }
      if (phase === 'wait' && ready && AUTO) entry.go();   // 调试/截图脚本用：?autoenter
      if (phase === 'flow' || phase === 'wait') {
        const st = ready ? (failed || gaveUp ? 'offline' : 'ready') : 'loading';
        entry.update(now, st, Math.round(lp * 100));
        wl.setGlow(ready ? 1 : 0.45 + 0.4 * lp); field.setWarm(ready ? 1 : 0.7 + 0.2 * lp);
        if (!ready) msg.textContent = '';
      }
      if (emote.stage !== 'ready' && emote.state === 'loading' && tick % 3 === 0 && phase !== 'enter') {
        try { eCtx.clearRect(0, 0, 120, 160); eCtx.drawImage(emoteCanvas, 0, 0, emoteCanvas.width, emoteCanvas.height, 0, 0, 120, 160); } catch (er) { /* ignore */ }
      }
      root.classList.toggle('emote-on', emote.state === 'loading' && emote.stage !== 'ready' && phase === 'run');
    }
    const bornAt = performance.now();
    function enter() {
      if (phase !== 'wait' && phase !== 'flow') return;
      if (!ready) return;
      phase = 'enter'; entry.lockAll();
      // 先暗后淡出：底图先压暗（0.5s），再整体淡出并显示首屏，避免“CG 里的红莉栖”和首屏 E-mote 红莉栖同时清晰
      const dim = cgOn ? 520 : 0;
      if (cgOn) root.classList.add('cg-dim');
      else { root.classList.remove('flare'); void root.offsetWidth; root.classList.add('flare'); }
      setTimeout(() => {
        root.classList.add('out');
        removeEventListener('keydown', onKey);
        document.documentElement.classList.remove('boot-lock');
        pageRoots.forEach((el) => { el.inert = false; });
        scrollTo({ top: 0, behavior: 'instant' });
        try { onReveal?.({ ready: emote.state === 'ready' }); } catch (err) { console.error(err); }
        const title = document.querySelector('#hero h1');
        title.setAttribute('tabindex', '-1');
        title.focus({ preventScroll: true });
        root.inert = true;
        root.removeAttribute('aria-modal');
        root.setAttribute('aria-hidden', 'true');
      }, dim || 380);
      setTimeout(finish, (dim || 380) + 900);
    }
    enterFn = enter; window.__bootEnter = () => { entry.go(); };
    function finish() {
      stopped = true; clearInterval(timer); clearInterval(hudTimer);
      removeEventListener('keydown', onKey); removeEventListener('resize', layout);
      root.classList.add('gone');
      wl.destroy(); field.destroy();
      setTimeout(() => { root.remove(); resolve(); }, 950);
    }
  });
}
