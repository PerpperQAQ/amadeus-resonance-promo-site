/**
 * PV 预览 v3（仿《明日方舟》官网全屏分页体系，强调色 = 红莉栖发色）。
 * 两个 E-mote 实例：前景与背景剪影（另一套服装）同步表情 / 动作 / 视线 / 口型；点剪影互换。
 * 若第二个实例载入失败（wasm 堆 512 MB 上限），剪影退回静帧海报。
 */
import './pv-ab.css';
import { EmoteStage, emoteTicker } from '../emote-stage.js';
import { createVoice } from '../pv/voice.js';
import { Field, sample } from './particles.js';
import { greeting, VOICE, REACTS, ASKS, FEATS, TIERS, GAME } from './content.js';
import { initReport } from './report.js';
import { initObserve, obsPlay as cwPlay, obsStop as cwStop } from './observe.js';
import { cipherChar, APL_CHARS } from '../cipher.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const BASE = import.meta.env.BASE_URL;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const body = document.body;
const N = 6, NAMES = ['INDEX', 'KURISU', 'FEATURES', 'OBSERVE', 'REPORT', 'MORE'];
const LOG = [];
const T = { t0: performance.now() };

// ---------------------------------------------------------------- 两个 E-mote 实例
const GHOST_VIEW = { zoom: 1, dx: 0, dy: 0 };   // 景深交换：剪影也是全身，只靠 CSS 位置/大小/滤镜区分
const res = Math.min(devicePixelRatio, 1.5);
const A = new EmoteStage({ canvas: $('#cv-a'), base: BASE, resolution: res, minLogoMs: 0 });
const B = new EmoteStage({ canvas: $('#cv-b'), base: BASE, resolution: res, minLogoMs: 0 });
B.alias = 'alt'; B.every = 1;   // 背景剪影每帧渲染（隔帧会在共享画布上留下空白帧→闪烁）
const elA = $('#st-a'), elB = $('#st-b');
let fg = A, gh = B, ghostLive = true;
const stages = () => [A, B].filter((s) => s.state === 'ready');
const state = { expr: '普通', motion: '', look: [0, 0] };
const both = {
  setExpression(n) { state.expr = n; for (const s of stages()) s.setExpression('表情_' + n); },
  motion(m) { state.motion = m; for (const s of stages()) s.motion(m); },
  lookAt(x, y, ms) { state.look = [x, y]; for (const s of stages()) s.lookAt(x, y, ms); },
  talk(v) { for (const s of stages()) s.talk(v); },
};
const voice = createVoice(both);
let voiceOn = true;
function onReady(s) {
  s.setExpression('表情_' + state.expr); s.lookAt(...state.look, 0);
  if (s === gh) s.setView(GHOST_VIEW, 0);
  T[s === A ? 'readyA' : 'readyB'] = performance.now() - T.t0; LOG.push(['ready', s.alias, performance.now()]);
}
A.addEventListener('ready', () => { onReady(A); body.dataset.model = 'ready'; bakeSil(elA); setTimeout(() => B.start(), 400); });
A.addEventListener('error', () => { $('#fallback').hidden = false; elA.hidden = true; body.dataset.model = 'error'; });
B.addEventListener('ready', () => { onReady(B); bakeSil(elB); if (typeof cur === 'number' && cur === 1 && !swapping) freezeGhost(); });
B.addEventListener('error', () => { ghostLive = false; body.classList.add('ghost-still'); LOG.push(['ghost-error', performance.now()]); });
A.addEventListener('poster', () => { T.posterA = performance.now() - T.t0; });
// 换装 · 景深交换：背景剪影向前走到前景位（放大、恢复色彩、变实），前景同时退到背景位（缩小、去色、变暗），
// 两者交叉换位，过半时交换层级。只用 CSS 过渡（transform / filter / opacity / --mk 遮罩位置），两实例每帧都在渲染、姿态同步，
// 所以全程没有空白帧；SDK 视图不变（剪影也是全身，见 .stage.ghost）。减弱动效：快速交叉淡化。
// 剪影 = 预烘焙的静态 .sil 画布（去色→褐调→alpha→上身渐隐）。
// 只在落定/换装前烘一次，不做定时重烘（drawImage(WebGL) 会隐式同步，造成空闲卡顿）。
// 空闲时剪影 WebGL 停掉（setActive false），只显示静态 .sil；换装时再唤醒做 live↔sil 交叉。
const SIL = new Map();
for (const el of [elA, elB]) {
  const live = el.querySelector('canvas'), c = document.createElement('canvas');
  c.className = 'sil'; c.setAttribute('aria-hidden', 'true'); el.append(c);
  SIL.set(el, { live, c, x: c.getContext('2d') });
}
function bakeSil(el) {
  const { live, c, x } = SIL.get(el), w = live.width, h = live.height;
  if (!w || !h) return false;
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  x.globalCompositeOperation = 'copy'; x.drawImage(live, 0, 0);
  x.globalCompositeOperation = 'saturation'; x.fillStyle = '#808080'; x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = 'multiply'; x.fillStyle = 'rgb(104,80,62)'; x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = 'destination-in'; x.drawImage(live, 0, 0);
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#000'); g.addColorStop(.3, '#000'); g.addColorStop(.44, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = 'source-over';
  return true;
}
/** 烘好当前剪影后停掉它的 WebGL（表情不同步，静态剪影即可）。若尚未出过帧，先唤醒画两帧再烘。 */
function freezeGhost() {
  if (gh.state !== 'ready' || swapping) return;
  const el = gh === A ? elA : elB;
  const finish = () => {
    if (swapping || cur !== 1 || gh.state !== 'ready') return;
    bakeSil(el);
    gh.setActive(false);
  };
  if (!gh.active) {
    gh.setActive(true);
    requestAnimationFrame(() => requestAnimationFrame(finish));
  } else {
    finish();
  }
}
let swapping = false;
const SWAP_MS = 1500, ARK = 'cubic-bezier(.7,.08,.22,.92)';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const reflow = (el) => void el.offsetWidth;
const raf2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
async function swapOutfit() {
  if (swapping || gh.state !== 'ready') return false;
  const inS = gh, outS = fg, inEl = inS === A ? elA : elB, outEl = outS === A ? elA : elB;
  // 前景→剪影：趁前景还在渲染，烘一张静态剪影（仅此一次同步拷贝）
  bakeSil(outEl);
  if (!SIL.get(inEl).c.width) bakeSil(inEl);
  swapping = true; body.classList.add('swapping'); body.classList.remove('ghost-hover');
  if (look.raf) { cancelAnimationFrame(look.raf); look.raf = 0; }
  // 唤醒剪影 WebGL，供 live 层淡入；两实例每帧渲染，避免共享画布空白帧
  inS.setActive(true); outS.setActive(true); inS.every = 1; outS.every = 1;
  await raf2();
  await new Promise((r) => requestAnimationFrame(r));   // 再等 1 帧，避免刚唤醒的 live 画布空白
  const ms = reduced ? 300 : SWAP_MS;
  const layers = [inEl, outEl].flatMap((el) => [SIL.get(el).live, SIL.get(el).c]);
  if (reduced) {
    for (const c of layers) { c.style.transition = `opacity ${ms / 2}ms ease`; c.style.opacity = '0'; }
    await wait(ms / 2);
    inEl.classList.replace('ghost', 'fg'); outEl.classList.replace('fg', 'ghost');
    for (const c of layers) c.style.opacity = '';
    await wait(ms / 2 + 40);
  } else {
    inEl.style.transition = outEl.style.transition = `transform ${ms}ms ${ARK}`;
    for (const c of layers) c.style.transition = `opacity ${ms}ms ${ARK}`;
    inEl.style.zIndex = '2'; outEl.style.zIndex = '6';
    await raf2();   // 让被唤醒的剪影先画出 live（仍 opacity:0）
    inEl.classList.replace('ghost', 'fg'); outEl.classList.replace('fg', 'ghost');
    await wait(ms * .5);
    await new Promise((r) => requestAnimationFrame(r));
    inEl.style.zIndex = '7'; outEl.style.zIndex = '1';
    await wait(ms * .5 + 40);
  }
  [fg, gh] = [inS, outS];
  $('#outfit-now').textContent = fg.alias === 'alt' ? '实验服' : '常服';
  inEl.removeAttribute('aria-label'); inEl.removeAttribute('tabindex'); outEl.setAttribute('aria-label', '换上这一套服装'); outEl.setAttribute('tabindex', '0');
  for (const el of [inEl, outEl]) for (const p of ['transition', 'opacity', 'zIndex']) el.style[p] = '';
  for (const c of layers) { c.style.transition = ''; c.style.opacity = ''; }
  body.classList.remove('swapping'); swapping = false;
  await raf2();
  freezeGhost();   // 新剪影烘一次后停 WebGL
  fg.every = 1; fg.setActive(true);
  placeHint();
  LOG.push(['swap', fg.alias, performance.now()]);
  return true;
}
// 剪影上的换装提示：发色小点 + 呼吸细环 + 一行小字，定位在剪影胸口附近；换装中隐藏
const hint = $('#swap-tag');
function placeHint() {   // 在大剪影露出、且真正点得到的位置放提示（避开介绍文字、提问气泡）
  const el = gh === A ? elA : elB;
  if (!el.getBoundingClientRect().width) return;
  const W = innerWidth / 100, H = innerHeight / 100;
  for (const [x, y] of [[40, 58], [36, 60], [44, 50], [26, 62], [20, 16], [33, 14]]) {
    const hitEl = document.elementFromPoint(x * W, y * H);
    if (hitEl && el.contains(hitEl)) { hint.style.left = `${x * W}px`; hint.style.top = `${y * H}px`; hint.dataset.at = `${x},${y}`; return; }
  }
}
addEventListener('resize', placeHint);
// 剪影可点（两个容器都监听，只有当前是 ghost 的那个响应）
for (const el of [elA, elB]) {
  el.addEventListener('click', () => { if (el.classList.contains('ghost') && cur === 1) swapOutfit(); });
  el.addEventListener('pointerenter', () => { if (el.classList.contains('ghost')) body.classList.add('ghost-hover'); });
  el.addEventListener('pointerleave', () => body.classList.remove('ghost-hover'));
  el.addEventListener('focus', () => { if (el.classList.contains('ghost')) body.classList.add('ghost-hover'); });
  el.addEventListener('blur', () => body.classList.remove('ghost-hover'));
}
// 视线跟随鼠标：指针只更新目标，每帧按指数平滑逼近（与帧率无关），变化很小时不再下发
const look = { tx: 0, ty: 0, x: 0, y: 0, raf: 0, t: 0 };
function lookTick(t) {
  look.raf = 0;
  const dt = Math.min(64, t - (look.t || t)); look.t = t;
  const a = 1 - Math.exp(-dt / 140);
  look.x += (look.tx - look.x) * a; look.y += (look.ty - look.y) * a;
  if (Math.abs(look.tx - look.x) + Math.abs(look.ty - look.y) > .002) { both.lookAt(look.x, look.y, 60); look.raf = requestAnimationFrame(lookTick); }
  else { look.t = 0; both.lookAt(look.tx, look.ty, 120); }
}
addEventListener('pointermove', (e) => {
  if (swapping || ![0, 1, 3].includes(cur)) return;
  const r = (elA.classList.contains('fg') ? elA : elB).getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height * .22;
  look.tx = Math.max(-1, Math.min(1, (e.clientX - cx) / (innerWidth * .45)));
  look.ty = Math.max(-1, Math.min(1, (e.clientY - cy) / (innerHeight * .6)));
  if (!look.raf) look.raf = requestAnimationFrame(lookTick);
}, { passive: true });
function setActive() {
  const vis = [0, 1, 3].includes(cur);
  fg.setActive(vis);
  if (cur === 1 && gh.state === 'ready') {
    if (swapping) gh.setActive(true);
    else freezeGhost();          // 第 2 屏空闲：静态剪影，零 WebGL
  } else {
    gh.setActive(false);
  }
}

// ---------------------------------------------------------------- 表情 / 字幕
let timers = [];
const later = (ms, fn) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
let exTimer = 0;
function ex(name, motion) { clearTimeout(exTimer); both.setExpression(name); if (motion) both.motion(motion); }
const seq = (list) => list.forEach(([ms, n, m]) => later(ms, () => ex(n, m)));
const subEl = $('#sub'), subZh = $('#sub-zh'), subJp = $('#sub-jp');
let typeTimer = 0, holdTimer = 0;
function say(zh, hold = 3200, jp = '') {
  clearInterval(typeTimer); clearTimeout(holdTimer); subEl.classList.remove('cut');
  if (!zh) return hush();
  subJp.textContent = jp; subZh.textContent = ''; subEl.classList.add('on');
  const chars = [...zh]; let i = 0;
  const step = () => { subZh.textContent = chars.slice(0, ++i).join(''); if (i >= chars.length) clearInterval(typeTimer); };
  if (reduced) subZh.textContent = zh; else { step(); typeTimer = setInterval(step, 36); }
  if (hold) holdTimer = setTimeout(hush, hold + chars.length * 36);
}
function hush() { clearInterval(typeTimer); clearTimeout(holdTimer); subEl.classList.remove('on', 'cut'); }
const line = ([zh, list], hold) => { seq(list); say(zh, hold); };
let acting = null;
function quiet() { clearTimers(); voice.stop(); hush(); acting = null; $('#cv').classList.remove('playing'); $$('#asks li').forEach((li) => li.classList.remove('playing')); }

// ---------------------------------------------------------------- 分页
let cur = -1, lock = 0;
const screens = $$('.screen');
function go(n, { force = false } = {}) {
  n = Math.max(0, Math.min(N - 1, n));
  if (n === cur && !force) return;
  const prev = cur; cur = n;
  quiet(); closeDet(true); cwStop();
  screens.forEach((s, i) => s.classList.toggle('on', i === n));
  body.dataset.screen = n;
  if (heroSw) heroSw.hidden = n !== 0;
  if (typeof syncTfSw === 'function') syncTfSw();
  if (typeof syncAmpSw === 'function') syncAmpSw();
  if (n === 0 && body.dataset.hero === 'decode' && !HD.decoded) hdStartScramble();
  if (n !== 0) hdStopScramble();
  $$('#nav a').forEach((a, i) => a.setAttribute('aria-current', String(i === n)));
  const c = $('.counter'); c.classList.add('flip'); void c.offsetWidth; c.classList.remove('flip');
  $('#cn-big').textContent = $('#cn-a').textContent = String(n + 1).padStart(2, '0'); $('#cn-name').textContent = NAMES[n];
  if (location.hash !== '#' + n) history.replaceState(null, '', location.search + '#' + n);
  setActive();
  if (n === 2) { if (!pfSharp) pfShowPoster(true); field.start(); if (!fKey) idle(); else if (!pfSharp) morph(fKey || 'kurisu'); } else field.stop();
  if (n === 3) later(700, cwPlay);
  if (n === 1) { placeHint(); later(1100, placeHint); }
  if (prev !== n) enter(n);
  LOG.push(['screen', n, performance.now()]);
}
const stepS = (d) => { if (performance.now() < lock) return; lock = performance.now() + (reduced ? 300 : 900); go(cur + d); };
addEventListener('wheel', (e) => {
  if (Math.abs(e.deltaY) < 4) return;
  // 详情打开时：滚轮翻全屏页（不是滚详情正文），并顺带关详情
  if (detOpen) { closeDet(true); stepS(e.deltaY > 0 ? 1 : -1); return; }
  stepS(e.deltaY > 0 ? 1 : -1);
}, { passive: true });
addEventListener('keydown', (e) => {
  if (detOpen) {
    if (e.key === 'Escape') { closeDet(); return; }
    if (e.key === 'ArrowLeft') { openDet(dI - 1); return; }
    if (e.key === 'ArrowRight') { openDet(dI + 1); return; }
    // 上下/翻页键：关详情并翻全屏页
    if (['ArrowDown', 'PageDown'].includes(e.key) || (e.key === ' ' && e.target === body)) {
      e.preventDefault(); closeDet(true); stepS(1); return;
    }
    if (['ArrowUp', 'PageUp'].includes(e.key)) {
      e.preventDefault(); closeDet(true); stepS(-1); return;
    }
    return;
  }
  const k = e.key;
  if (['ArrowDown', 'PageDown'].includes(k) || (k === ' ' && e.target === body)) { e.preventDefault(); stepS(1); }
  else if (['ArrowUp', 'PageUp'].includes(k)) { e.preventDefault(); stepS(-1); }
  else if (k === 'Home') go(0); else if (k === 'End') go(N - 1);
});
let ty = null;
addEventListener('touchstart', (e) => { ty = e.touches[0].clientY; }, { passive: true });
addEventListener('touchend', (e) => { if (ty == null) return; const d = ty - e.changedTouches[0].clientY; ty = null; if (Math.abs(d) > 40) stepS(d > 0 ? 1 : -1); }, { passive: true });
addEventListener('hashchange', () => { const n = +location.hash.slice(1); if (Number.isInteger(n)) go(n); });
$$('#nav a, .logo').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); go(+a.getAttribute('href').slice(1)); }));
$$('[data-goto]').forEach((b) => b.addEventListener('click', () => go(+b.dataset.goto)));

let greeted = false;
function enter(n) {
  if (n === 0 && !greeted) { greeted = true; const [zh, list, m] = greeting(); later(900, () => { seq(list); if (m) later(200, () => both.motion(m)); say(zh, 4200); }); }
  if (n === 1) later(250, () => ex('ニヤニヤ', 'peek')), later(1600, () => ex('普通'));
}

// ---------------------------------------------------------------- 02 KURISU：点她 / 问问她 / 声优
function interrupt() {
  clearTimers(); voice.stop(); acting = null; $('#cv').classList.remove('playing'); $$('#asks li').forEach((li) => li.classList.remove('playing'));
  clearInterval(typeTimer); subEl.classList.add('cut');
  later(380, () => { say('嗯？你说。', 2400); seq([[0, '驚き00'], [900, '普通']]); });
}
// cues: [ms, 表情, 日文, 中文]；onEnd 在语音结束后调用
function playClip(v, li, onEnd) {
  if (acting) return interrupt();
  clearTimers(); hush(); acting = v.id; $('#cv').classList.add('playing'); li?.classList.add('playing');
  const done = () => { if (acting !== v.id) return; acting = null; $('#cv').classList.remove('playing'); li?.classList.remove('playing'); if (onEnd) onEnd(); else later(600, hush); };
  if (voiceOn) voice.play(BASE + v.src, { maxSec: v.max, onEnd: done });
  for (const [ms, e, jp, zh] of v.cues) later(ms, () => { ex(e); if (zh) say(zh, 0, jp); });
  later(v.max * 1000 + 300, () => { voice.stop(); done(); });
}
$('#cv').addEventListener('click', () => playClip(VOICE[0]));
$('#wave').addEventListener('click', () => { voiceOn = !voiceOn; $('#wave').setAttribute('aria-pressed', String(voiceOn)); if (!voiceOn) voice.stop(); });
// 序列表情：[[ms, 表情, 动作?], ...]
const seqM = (list) => list.forEach(([ms, n, m]) => later(ms, () => ex(n, m)));
let lastReact = -1;
$('#hit').addEventListener('click', () => {
  if (acting) return interrupt();
  clearTimers();
  let i; do i = Math.floor(Math.random() * REACTS.length); while (i === lastReact && REACTS.length > 1);
  lastReact = i; const [zh, e, m] = REACTS[i];
  ex(e, m); say(zh, 2200); later(2600 + zh.length * 36, () => ex('普通'));
  LOG.push(['react', i, performance.now()]);
});
$('#asks').innerHTML = ASKS.map((a) => `<li data-k="${a.k}"><button><span>${a.q}</span><small>${a.tag}</small></button></li>`).join('');
function ask(a, li) {
  if (acting) return interrupt();
  clearTimers(); hush(); $$('#asks li').forEach((x) => x.classList.toggle('on', x === li));
  if (a.k === 'text') { const [zh, list] = a.lines[0]; seqM(list); say(zh, 3600); later(4800, () => li.classList.remove('on')); return; }
  const [lz, ll] = a.lead; seqM(ll); say(lz, 0);
  acting = 'lead';
  later(Math.max(1200, lz.length * 90), () => {
    acting = null;
    const v = VOICE.find((x) => x.id === a.clip);
    playClip(v, li, () => {
      li.classList.remove('on');
      if (a.after) { const [az, al] = a.after; later(300, () => { seqM(al); say(az, 2600); }); }
      else later(600, hush);
    });
  });
  LOG.push(['ask', a.k, performance.now()]);
}
$$('#asks li').forEach((li) => $('button', li).addEventListener('click', () => ask(ASKS.find((a) => a.k === li.dataset.k), li)));

// ---------------------------------------------------------------- 03 FEATURES：道具粒子（悬停变形 / 指针推开 / 详情）
const field = new Field($('#pf'), { n: reduced ? 4200 : 7000, reduced, repel: true });
field.cx = .66; field.cy = .5; field.scale = .66; field.R = 55;
const s2el = $('.s2');
const pfPoster = $('#pf-poster');
const PROP = (k) => `${BASE}img/pv-ab/props/${k}.webp`;
const shapeSrc = { kurisu: `${BASE}models/kurisu_ab.poster.v2.webp`, logo: `${BASE}img/logo-amadeus-resonance.webp` };
FEATS.forEach((f) => { shapeSrc[f.prop] = PROP(f.prop); });
const shape = (k) => sample(shapeSrc[k], field.n, k === 'kurisu' ? { edge: .35, gamma: 1.1 } : { edge: .5 });
/** 首次进 s2 前预采样，避免随机糊团等解码 */
let pfSharp = false, pfWarmTok = 0;
function pfShowPoster(on) {
  if (!s2el) return;
  s2el.classList.toggle('is-pf-warming', !!on);
}
function pfMarkSharp() {
  if (pfSharp) return;
  pfSharp = true;
  pfShowPoster(false);
  LOG.push(['pf-sharp', performance.now()]);
}
async function warmFieldShapes() {
  const keys = ['kurisu', ...FEATS.map((f) => f.prop)];
  // 先解码 poster 图，再采样网格
  await Promise.all(keys.map((k) => new Promise((res) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { (img.decode ? img.decode() : Promise.resolve()).then(res, res); };
    img.onerror = res;
    img.src = shapeSrc[k];
  })));
  await Promise.all(keys.map((k) => shape(k).catch(() => null)));
  LOG.push(['pf-warm', performance.now()]);
}
// 空闲时预热（不挡首屏）
later(reduced ? 200 : 900, () => { warmFieldShapes(); });
// 上层元素（列表、标题）盖住画布时也要能推开粒子
$('.s2').addEventListener('pointermove', (e) => { if (cur === 2) field.pointer(e.clientX, e.clientY); }, { passive: true });
$('.s2').addEventListener('pointerleave', () => field.pointer(null));
$('#flist').innerHTML = FEATS.map((f, i) => `<li><button data-f="${f.k}"><span class="fl-n">${String(i + 1).padStart(2, '0')}</span><span class="fl-h"><b>${f.zh}</b><small>${f.en}</small></span><span class="fl-d">${f.d}</span></button></li>`).join('');
let fKey = '', morphTok = 0;
async function morph(k) {
  const tok = ++morphTok;
  const firstKurisu = !pfSharp && k === 'kurisu';
  if (firstKurisu) pfShowPoster(true);
  const pts = await shape(k).catch(() => null);
  if (!pts || tok !== morphTok) return;
  // 首次成形：瞬间贴齐（poster 盖住），再揭开；之后才做 900ms 变形
  field.to(pts, firstKurisu ? 1 : 900);
  if (firstKurisu) {
    const w = ++pfWarmTok;
    // 等一帧画上再淡出 poster
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (w !== pfWarmTok) return;
      later(reduced ? 40 : 120, () => { if (w === pfWarmTok) pfMarkSharp(); });
    }));
  }
  LOG.push(['morph', k, performance.now()]);
}
function idle() { fKey = ''; $$('#flist button').forEach((b) => b.removeAttribute('aria-current')); morph('kurisu'); }
function hoverF(k) {
  if (k === fKey) return; fKey = k;
  $$('#flist button').forEach((b) => b.toggleAttribute('aria-current', b.dataset.f === k));
  morph(FEATS.find((f) => f.k === k).prop);
}
$$('#flist button').forEach((b) => {
  b.addEventListener('pointerenter', () => { if (!detOpen) hoverF(b.dataset.f); });
  b.addEventListener('focus', () => { if (!detOpen) hoverF(b.dataset.f); });
  b.addEventListener('click', () => openDet(FEATS.findIndex((f) => f.k === b.dataset.f)));
});
$('#flist').addEventListener('pointerleave', () => { later(450, () => { if (!detOpen && !$('#flist').matches(':hover') && !$('#flist').contains(document.activeElement)) idle(); }); });
let detOpen = false, dI = 0;
function openDet(i) {
  dI = (i + FEATS.length) % FEATS.length; const f = FEATS[dI];
  detOpen = true; body.classList.add('det'); $('#fdet').hidden = false;
  fKey = f.k; morph(f.prop); field.tcx = .29; field.tscale = .58; field.kick();
  const tiers = f.k === 'arch' ? `<ol class="tiers">${TIERS.map(([zh, en, d], j) => `<li><small>${String(j + 1).padStart(2, '0')} · ${en}</small><b>${zh}</b><span>${d}</span></li>`).join('<li class="ar" aria-hidden="true">→</li>')}</ol>` : '';
  const c = $('#fd-copy'); c.classList.remove('in'); void c.offsetWidth;
  c.innerHTML = `<small class="fd-k">${String(dI + 1).padStart(2, '0')} / ${String(FEATS.length).padStart(2, '0')} · ${f.en}</small><h2>${f.zh}</h2><p class="fd-en">${f.en}<span>${f.pn}</span></p><i class="dash"></i><p class="fd-p">${f.p}</p>${tiers}`;
  c.classList.add('in');
  $('#fd-prog').style.width = `${((dI + 1) / FEATS.length) * 100}%`;
  clearTimers(); later(500, () => { seqM(f.say[1]); say(f.say[0], 2600); });
  LOG.push(['detail', f.k, performance.now()]);
}
function closeDet(silent) {
  if (!detOpen) return; detOpen = false; body.classList.remove('det'); $('#fdet').hidden = true;
  field.tcx = .66; field.tscale = .66; field.kick();
  if (!silent) { hush(); idle(); $(`#flist [data-f="${FEATS[dI].k}"]`)?.focus({ preventScroll: true }); }
}
$('#fd-prev').addEventListener('click', () => openDet(dI - 1));
$('#fd-next').addEventListener('click', () => openDet(dI + 1));
$('#fd-back').addEventListener('click', () => closeDet());

// ---------------------------------------------------------------- 04 OBSERVE（见 observe.js）
initObserve();

// ---------------------------------------------------------------- 05 REPORT（见 report.js）
initReport(BASE);

// ---------------------------------------------------------------- 启动：粒子聚成标志 → 停留 → 散开
document.addEventListener('visibilitychange', () => { if (document.hidden) quiet(); });
addEventListener('pagehide', () => { quiet(); A.dispose(); B.dispose(); });
if (import.meta.hot) import.meta.hot.dispose(() => { quiet(); A.dispose(); B.dispose(); field.stop(); });
A.start(); // 海报先出，lite 模型后台载入；B 在 A 就绪后再载入
const intro = new Field($('#intro-cv'), { n: reduced ? 1400 : 2400, reduced });
intro.scale = .5;
const bar = $('#intro-bar'), t0 = performance.now();
const bt = setInterval(() => { bar.style.transform = `scaleX(${Math.min(1, (performance.now() - t0) / 2400)})`; }, 60);
function reveal() { clearInterval(bt); body.classList.add('loaded'); const n = +location.hash.slice(1); go(Number.isInteger(n) && n >= 0 && n < N ? n : 0, { force: true }); setTimeout(() => intro.stop(), 1200); T.intro = performance.now() - T.t0; }
sample(shapeSrc.logo, intro.n).then(async (pts) => {
  await document.fonts.ready;
  intro.to(pts, reduced ? 1 : 1100);
  setTimeout(() => { body.classList.add('scatter'); intro.scatter(reduced ? 1 : 800); setTimeout(reveal, reduced ? 0 : 450); }, reduced ? 300 : 1900);
}).catch(reveal);

// ---------------------------------------------------------------- 首屏标题方案（?hero=a|b|c|c2|decode|bw）
// decode 乱码字符来自本仓库 IBM 5100 致敬实现：src/cipher.js（APL_CHARS + HEX）与 src/entry.js（BASIC/APL 行模板），
// 不用虚构汇编助记符。
const HEROES = ['a', 'b', 'c', 'c2', 'decode', 'bw'];
const heroSw = $('#hero-sw');

const HD_APL_BASE = '⍴⍳∊∆∇⎕⍞○∘⊥⊤⊂⊃⌈⌊←→×÷≠≤≥∨∧~⍺⍵¯¨';
const HD_APL_OVER = '⍋⍒⌽⊖⍉⍟⌹⍱⍲⍝⌿⍀⍫';
const HD_HEX = '0123456789ABCDEF';
const hdRnd = (s) => s[(Math.random() * s.length) | 0];
/** 与 entry.js gch 同配比：APL 基本 / 叠打 / 十六进制 / 符号；亦回退 cipherChar() */
const hdGch = () => {
  const r = Math.random();
  if (r < 0.5) return hdRnd(HD_APL_BASE);
  if (r < 0.68) return hdRnd(HD_APL_OVER);
  if (r < 0.88) return hdRnd(HD_HEX);
  if (r < 0.94) return (Math.random() < .5 ? cipherChar() : hdRnd(APL_CHARS));
  return hdRnd('$#%&*@+=<>');
};
const hdGarble = (n) => Array.from({ length: n }, hdGch).join('');
/** 与 entry.js CODE 同类：真实 BASIC 形态 + APL 表达式（非汇编 opcode） */
const HD_CODE = [
  () => `10 FOR K=1 TO 14 : PRINT CHR$(PEEK(&H${hdRnd(HD_HEX)}0${hdRnd(HD_HEX)}0+K)); : NEXT`,
  () => Array.from({ length: 9 }, () => hdRnd(HD_HEX) + hdRnd(HD_HEX)).join(' ') + '  ⎕←⍳' + ((Math.random() * 90 + 10) | 0) + ' ⋄ ⍴⍵',
  () => `20 A$="AMADEUS":FOR I=1 TO LEN(A$):PRINT MID$(A$,I,1);:NEXT`,
  () => `⍝ ${Array.from({ length: 6 }, () => hdGch()).join('')} ← ⍴${((Math.random() * 8 + 2) | 0)} ⋄ ⎕←⍵`,
  () => `${Array.from({ length: 8 }, () => hdRnd(HD_HEX) + hdRnd(HD_HEX)).join('')}  ⊥⊤  ${hdGarble(5)}`,
];

const HD = {
  panel: $('#hd-panel'), main: $('#hd-main'), sub: $('#hd-sub'), cn: $('#hd-cn'), meta: $('#hd-meta'), real: $('#hd-real'),
  targetMain: 'Amadeus', targetSub: 'Resonance', targetCn: '共鸣',
  decoded: false, raf: 0, t: 0,
};
const hdWait = (ms) => new Promise((r) => setTimeout(r, ms));
/** 乱码态：更密更宽的噪声块（与定稿叠排不同形态） */
function hdNoiseMain() {
  const n = 14 + ((Math.random() * 6) | 0);
  return Array.from({ length: n }, () => hdGch()).join(Math.random() > .55 ? '' : ' ');
}
function hdNoiseSub() {
  if (Math.random() > .35) return HD_CODE[(Math.random() * HD_CODE.length) | 0]();
  return Array.from({ length: 18 + ((Math.random() * 8) | 0) }, () => hdGch()).join('');
}
function hdNoiseCn() {
  return Array.from({ length: 4 + ((Math.random() * 3) | 0) }, () => hdGch()).join(' ');
}
function hdScrambleTick(t) {
  HD.raf = 0;
  if (HD.decoded || body.dataset.hero !== 'decode') return;
  if (cur === 0) {
    if (t - HD.t > 72) {
      HD.t = t;
      if (HD.main) {
        HD.main.textContent = hdNoiseMain();
        HD.main.style.setProperty('--hd-jx', `${((Math.random() * 10) - 5).toFixed(1)}px`);
        HD.main.style.setProperty('--hd-jy', `${((Math.random() * 4) - 2).toFixed(1)}px`);
      }
      if (HD.sub) {
        HD.sub.textContent = hdNoiseSub();
        HD.sub.style.setProperty('--hd-jx', `${((Math.random() * 14) - 4).toFixed(1)}px`);
      }
      if (HD.cn) {
        HD.cn.textContent = hdNoiseCn();
        HD.cn.style.setProperty('--hd-jx', `${((Math.random() * 8) - 2).toFixed(1)}px`);
      }
      if (HD.meta) HD.meta.textContent = `⍝ IBM5100 · ${HD_CODE[(Math.random() * HD_CODE.length) | 0]()}`;
      if (HD.panel && Math.random() > .7) HD.panel.classList.toggle('is-glitch', Math.random() > .4);
    }
  }
  HD.raf = requestAnimationFrame(hdScrambleTick);
}
function hdClearJitter() {
  [HD.main, HD.sub, HD.cn].forEach((el) => {
    if (!el) return;
    el.style.removeProperty('--hd-jx');
    el.style.removeProperty('--hd-jy');
  });
}
function hdStartScramble() {
  if (HD.decoded || !HD.panel) return;
  HD.panel.classList.remove('is-decoded', 'is-decoding', 'is-snap', 'is-cascade', 'is-glitch', 'is-amp');
  ampStop();
  if (HD.real) HD.real.hidden = true;
  if (HD.main) { HD.main.hidden = false; HD.main.className = 'hd-main'; HD.main.textContent = ''; }
  if (HD.sub) { HD.sub.hidden = false; HD.sub.className = 'hd-sub'; HD.sub.textContent = ''; }
  if (HD.cn) { HD.cn.hidden = false; HD.cn.textContent = ''; }
  if (!HD.raf) HD.raf = requestAnimationFrame(hdScrambleTick);
}
function hdStopScramble() {
  if (HD.raf) { cancelAnimationFrame(HD.raf); HD.raf = 0; }
  if (HD.panel) HD.panel.classList.remove('is-glitch');
}
/** 叠排锁字：soft 框内 Title Case，与乱码同一套 mono */
function hdLockStack() {
  if (HD.main) HD.main.textContent = HD.targetMain;
  if (HD.sub) HD.sub.textContent = HD.targetSub;
  if (HD.cn) HD.cn.textContent = HD.targetCn;
  if (HD.meta) HD.meta.textContent = '⍝ AMPLIFIED · LOCKED';
  HD.panel.classList.remove('is-decoding', 'is-cascade', 'is-amp');
  HD.panel.classList.add('is-decoded');
  if (HD.real) HD.real.hidden = true;
}

const AMP = {
  cv: $('#hd-amp'),
  raf: 0,
  bits: [],
  imgs: [],
  mode: 'meter',
};
function ampStop() {
  if (AMP.raf) { cancelAnimationFrame(AMP.raf); AMP.raf = 0; }
  AMP.bits = [];
  const cv = AMP.cv;
  if (!cv) return;
  const c = cv.getContext('2d');
  if (c) c.clearRect(0, 0, cv.width, cv.height);
  cv.classList.remove('is-on', 'is-meter');
}
function ampResize() {
  const cv = AMP.cv;
  if (!cv) return { w: 900, h: 280, dpr: 1, ctx: null };
  const r = cv.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = Math.max(320, Math.round(r.width || 720));
  const h = Math.max(120, Math.round(r.height || 220));
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  }
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h, dpr, ctx };
}
function ampLoadProps() {
  if (AMP.imgs.length) return Promise.resolve(AMP.imgs);
  const keys = ['phone_sg001', 'metal_upa', 'divergence_meter', 'ibn5100', 'phone_microwave'];
  return Promise.all(keys.map((k) => new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = `${BASE}img/pv-ab/props/${k}.webp`;
  }))).then((imgs) => { AMP.imgs = imgs.filter(Boolean); return AMP.imgs; });
}
/** memory：道具碎片飞入拼成 Amadeus 字形 */
async function ampMemory(ms = 900) {
  const imgs = await ampLoadProps();
  const { w, h, ctx } = ampResize();
  if (!ctx) return;
  AMP.cv.classList.add('is-on');
  if (HD.main) HD.main.classList.add('is-ghost');
  const word = HD.targetMain;
  ctx.font = `700 ${Math.round(h * .62)}px "PV APL","PV Mono",monospace`;
  ctx.textBaseline = 'middle';
  const tw = ctx.measureText(word).width;
  const ox = Math.max(8, (w - tw) * .08);
  const oy = h * .48;
  // 沿字形撒目标点
  const off = document.createElement('canvas');
  off.width = Math.ceil(tw) + 4; off.height = Math.ceil(h * .7);
  const oxc = off.getContext('2d', { willReadFrequently: true });
  oxc.font = ctx.font; oxc.fillStyle = '#fff'; oxc.textBaseline = 'middle';
  oxc.fillText(word, 2, off.height * .55);
  const data = oxc.getImageData(0, 0, off.width, off.height).data;
  const targets = [];
  const step = 5;
  for (let y = 0; y < off.height; y += step) for (let x = 0; x < off.width; x += step) {
    if (data[(y * off.width + x) * 4 + 3] > 80) targets.push([ox + x, oy - off.height * .55 + y]);
  }
  const n = Math.min(targets.length, reduced ? 40 : 140);
  AMP.bits = Array.from({ length: n }, (_, i) => {
    const t = targets[(i * Math.floor(targets.length / n)) % targets.length];
    return {
      img: imgs[i % Math.max(1, imgs.length)] || null,
      x: Math.random() * w, y: Math.random() * h * .85,
      tx: t[0], ty: t[1],
      rot: (Math.random() - .5) * 1.2,
      s: 10 + Math.random() * 16,
    };
  });
  const t0 = performance.now();
  await new Promise((resolve) => {
    const loop = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      const e = p * p * (3 - 2 * p);
      const { w: W, h: H, ctx: c } = ampResize();
      c.clearRect(0, 0, W, H);
      for (const b of AMP.bits) {
        const x = b.x + (b.tx - b.x) * e;
        const y = b.y + (b.ty - b.y) * e;
        c.save();
        c.translate(x, y);
        c.rotate(b.rot * (1 - e));
        c.globalAlpha = .35 + e * .55;
        if (b.img) c.drawImage(b.img, -b.s / 2, -b.s / 2, b.s, b.s * .62);
        else { c.fillStyle = 'rgba(204,110,66,.8)'; c.fillRect(-2, -2, 4, 4); }
        c.restore();
      }
      if (p < 1) AMP.raf = requestAnimationFrame(loop);
      else resolve();
    };
    AMP.raf = requestAnimationFrame(loop);
  });
  if (HD.main) HD.main.classList.remove('is-ghost');
  ampStop();
}
/** meter：soulwire 式逐位节奏 + 透明世界线数字浮在实验室 BG → 定稿叠排（无黑底板） */
async function ampMeter() {
  // soulwire TextScramble：每字独立 start/end 帧，乱码池以数字/点为主（divergence 感）
  const DIG = '0123456789.048596157';
  const rows = [
    { word: HD.targetMain, y: .30, size: 1.12 },
    { word: HD.targetSub, y: .56, size: .58 },
    { word: HD.targetCn, y: .78, size: .40 },
  ];
  // 构建 queue：{ ch, start, end, show }
  const maxEnd = reduced ? 28 : 52;
  rows.forEach((r, ri) => {
    r.cols = [...r.word].map((ch, i) => {
      const start = Math.floor(Math.random() * (reduced ? 10 : 18)) + ri * 2;
      const end = start + 8 + Math.floor(Math.random() * (reduced ? 10 : 22));
      return { ch, start, end, show: DIG[(Math.random() * DIG.length) | 0], dud: true };
    });
  });

  AMP.cv.classList.add('is-on', 'is-meter');
  if (HD.panel) HD.panel.classList.add('is-amp');
  [HD.main, HD.sub, HD.cn, HD.meta].forEach((el) => { if (el) el.classList.add('is-ghost'); });

  const layout = (W, H, row) => {
    // 主行略放大；整体右移（原 .07 偏左）
    const fontPx = Math.round(Math.min(H * .38 * row.size, W / Math.max(4.8, row.cols.length * .96)));
    const gap = fontPx * (row.word === HD.targetCn ? .4 : .08);
    const cell = fontPx * .9;
    const total = row.cols.length * cell + (row.cols.length - 1) * gap;
    return { fontPx, gap, cell, x0: Math.max(6, (W - total) * .22), y: H * row.y };
  };

  const drawFrame = (frame) => {
    const { w: W, h: H, ctx: c } = ampResize();
    if (!c) return 0;
    c.clearRect(0, 0, W, H); // 透明，不铺黑
    let complete = 0, total = 0;
    rows.forEach((row) => {
      const { fontPx, gap, cell, x0, y } = layout(W, H, row);
      let x = x0;
      c.font = `400 ${fontPx}px "PV APL","PV Mono","PV Sans",monospace`;
      c.textBaseline = 'middle';
      row.cols.forEach((col) => {
        total++;
        let glyph, dud = false;
        if (frame >= col.end) {
          glyph = col.ch;
          complete++;
          col.dud = false;
        } else if (frame >= col.start) {
          // soulwire：乱码态按帧刷新
          if (Math.random() < .32 || col.dud) {
            col.show = DIG[(Math.random() * DIG.length) | 0];
          }
          glyph = col.show;
          dud = true;
          col.dud = true;
        } else {
          // 尚未开始：先显示跳动数字（世界线波动）
          if (Math.random() < .45) col.show = DIG[(Math.random() * DIG.length) | 0];
          glyph = col.show;
          dud = true;
        }
        c.shadowColor = 'rgba(204,110,66,.4)';
        c.shadowBlur = dud ? 8 : 12;
        if (row.word === HD.targetMain) {
          c.fillStyle = dud ? 'rgba(255,200,155,.82)' : 'rgba(204,110,66,.96)';
        } else if (row.word === HD.targetSub) {
          c.fillStyle = dud ? 'rgba(230,200,170,.72)' : 'rgba(245,245,245,.92)';
        } else {
          c.fillStyle = dud ? 'rgba(220,170,130,.7)' : 'rgba(204,110,66,.9)';
        }
        const jx = dud ? (Math.random() - .5) * 1.6 : 0;
        const jy = dud ? (Math.random() - .5) * .9 : 0;
        c.fillText(glyph, x + jx, y + jy);
        c.shadowBlur = 0;
        x += cell + gap;
      });
    });
    return total ? complete / total : 1;
  };

  // 世界线波动 + soulwire 逐位落地（同一 rAF，透明浮在 BG）
  let frame = 0;
  const totalFrames = Math.max(...rows.flatMap((r) => r.cols.map((c) => c.end))) + (reduced ? 4 : 10);
  await new Promise((resolve) => {
    const loop = () => {
      const done = drawFrame(frame);
      if (HD.panel && frame > 0 && frame % 9 === 0) {
        HD.panel.classList.add('is-amp-tick');
        later(36, () => HD.panel && HD.panel.classList.remove('is-amp-tick'));
      }
      frame++;
      if (frame <= totalFrames && done < 1) {
        AMP.raf = requestAnimationFrame(loop);
      } else {
        // 末帧定稿字形
        drawFrame(totalFrames + 2);
        resolve();
      }
    };
    AMP.raf = requestAnimationFrame(loop);
  });

  // 落地后 hold → canvas 淡出 + DOM 标题 fade/scale settle（收束再拉长约 40%）
  await hdWait(reduced ? 100 : 320);
  const cv = AMP.cv;
  if (cv) {
    cv.style.transition = 'opacity .72s cubic-bezier(.2,.85,.2,1)';
    cv.style.opacity = '0';
  }
  [HD.main, HD.sub, HD.cn, HD.meta].forEach((el) => { if (el) el.classList.remove('is-ghost'); });
  if (HD.panel) {
    HD.panel.classList.remove('is-amp');
    HD.panel.classList.add('is-cascade');
  }
  if (HD.main) HD.main.textContent = HD.targetMain;
  if (HD.sub) HD.sub.textContent = HD.targetSub;
  if (HD.cn) HD.cn.textContent = HD.targetCn;
  if (HD.meta) HD.meta.textContent = '⍝ AMPLIFIED · LOCKED';
  await hdWait(reduced ? 160 : 780);
  if (HD.panel) {
    HD.panel.classList.remove('is-cascade', 'is-decoding');
    HD.panel.classList.add('is-decoded');
  }
  ampStop();
  if (cv) { cv.style.opacity = ''; cv.style.transition = ''; }
}


/** wave：发色波形扫过并写出 Amadeus */
async function ampWave(ms = 820, revealText = true) {
  const word = HD.targetMain;
  AMP.cv.classList.add('is-on');
  if (revealText && HD.main) HD.main.classList.add('is-ghost');
  const t0 = performance.now();
  await new Promise((resolve) => {
    const loop = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      const { w: W, h: H, ctx: c } = ampResize();
      c.clearRect(0, 0, W, H);
      const fontPx = Math.round(Math.min(H * .58, W / 6.2));
      c.font = `400 ${fontPx}px "PV APL","PV Mono",monospace`;
      c.textBaseline = 'middle';
      const tw = c.measureText(word).width;
      const x0 = Math.max(8, W * .04);
      const y = H * .5;
      // waveform
      c.beginPath();
      const amp = H * (.18 * (1 - p * .55));
      for (let x = 0; x <= W; x += 3) {
        const u = x / W;
        const env = Math.sin(Math.PI * Math.min(1, u / Math.max(.08, p))) * (1 - Math.max(0, (u - p) * 2));
        const yy = y + Math.sin(u * 18 + p * 10) * amp * env;
        if (x === 0) c.moveTo(x, yy); else c.lineTo(x, yy);
      }
      c.strokeStyle = 'rgba(204,110,66,.85)';
      c.lineWidth = 1.6;
      c.shadowColor = 'rgba(204,110,66,.5)';
      c.shadowBlur = 8;
      c.stroke();
      c.shadowBlur = 0;
      if (revealText) {
        c.save();
        c.beginPath();
        c.rect(0, 0, x0 + tw * p + 8, H);
        c.clip();
        c.fillStyle = 'rgba(204,110,66,.92)';
        c.fillText(word, x0, y);
        c.restore();
      }
      if (p < 1) AMP.raf = requestAnimationFrame(loop);
      else resolve();
    };
    AMP.raf = requestAnimationFrame(loop);
  });
  if (revealText && HD.main) HD.main.classList.remove('is-ghost');
  if (revealText) ampStop();
}
/** mix：先波形骨架，再碎片填满 */
async function ampMix() {
  await ampWave(520, false);
  if (HD.main) HD.main.classList.add('is-ghost');
  await ampMemory(700);
}
async function playAmplify() {
  const mode = AMP.mode || body.dataset.amplify || 'meter';
  HD.panel.classList.add('is-amp');
  if (HD.meta) HD.meta.textContent = `⍝ AMPLIFY · ${mode.toUpperCase()}`;
  try {
    if (mode === 'memory') {
      if (HD.main) HD.main.textContent = HD.targetMain;
      await ampMemory();
      hdLockStack();
    } else if (mode === 'meter') {
      await ampMeter(); // 内部已 lock
    } else if (mode === 'mix') {
      if (HD.main) HD.main.textContent = HD.targetMain;
      await ampMix();
      hdLockStack();
    } else {
      if (HD.main) HD.main.textContent = HD.targetMain;
      await ampWave();
      hdLockStack();
    }
  } catch (e) { LOG.push(['amp-err', String(e)]); ampStop(); hdLockStack(); }
  LOG.push(['amplify', mode, performance.now()]);
}

/** aha：meter 默认 = 乱码 → 透明世界线数字 → 重组品名；其它模式仍可叠排后再 amplify */
async function hdDecode() {
  if (HD.decoded || !HD.panel) return;
  HD.decoded = true; hdStopScramble();
  HD.panel.classList.add('is-decoding');
  if (HD.meta) HD.meta.textContent = '⍝ DECODING…';
  const mode = AMP.mode || body.dataset.amplify || 'meter';
  if (reduced) {
    hdClearJitter();
    hdLockStack();
    LOG.push(['hero-decode', performance.now()]);
    return;
  }
  if (HD.main) HD.main.textContent = hdNoiseMain();
  if (HD.sub) HD.sub.textContent = hdNoiseSub();
  if (HD.cn) HD.cn.textContent = hdNoiseCn();
  HD.panel.classList.add('is-glitch');
  await hdWait(110);
  HD.panel.classList.remove('is-glitch');
  hdClearJitter();

  if (mode === 'meter') {
    // 唯一路径：乱码 → 数字波动 → 重组标题（不做黑盒叠排预演）
    if (HD.meta) HD.meta.textContent = '⍝ WORLD LINE · FLUCTUATING';
    HD.panel.classList.remove('is-cascade');
    await playAmplify();
    LOG.push(['hero-decode', performance.now()]);
    return;
  }

  HD.panel.classList.add('is-snap', 'is-cascade');
  if (HD.main) HD.main.textContent = HD.targetMain;
  if (HD.sub) HD.sub.textContent = hdGarble(HD.targetSub.length);
  if (HD.cn) HD.cn.textContent = '';
  if (HD.meta) HD.meta.textContent = '⍝ UNLOCK · STACK';
  await hdWait(150);
  HD.panel.classList.remove('is-snap');
  if (HD.sub) {
    const t = HD.targetSub;
    for (let i = 0; i < t.length; i++) {
      HD.sub.textContent = t.slice(0, i + 1) + (i < t.length - 1 ? hdGarble(t.length - i - 1) : '');
      await hdWait(20);
    }
  }
  if (HD.cn) {
    HD.cn.textContent = '';
    for (let i = 0; i < HD.targetCn.length; i++) {
      HD.cn.textContent = HD.targetCn.slice(0, i + 1);
      await hdWait(32);
    }
  }
  await hdWait(120);
  HD.panel.classList.remove('is-cascade');
  await playAmplify();
  LOG.push(['hero-decode', performance.now()]);
}
if (HD.panel) {
  const go = () => { if (body.dataset.hero === 'decode') hdDecode(); };
  HD.panel.addEventListener('pointerenter', go);
  HD.panel.addEventListener('focus', go);
  HD.panel.addEventListener('click', go);
}

const TITLEFRAMES = ['none', 'soft', 'ark'];
const tfSw = $('#tf-sw');
function setTitleFrame(mode, { push = false } = {}) {
  mode = TITLEFRAMES.includes(mode) ? mode : 'soft';
  body.dataset.titleframe = mode;
  if (tfSw) {
    tfSw.hidden = !(cur === 0 && body.dataset.hero === 'decode');
    $$('button', tfSw).forEach((b) => b.setAttribute('aria-current', String(b.dataset.titleframe === mode)));
  }
  const u = new URL(location.href);
  if (mode === 'soft') u.searchParams.delete('titleframe'); else u.searchParams.set('titleframe', mode);
  history[push ? 'pushState' : 'replaceState'](null, '', u.pathname + u.search + u.hash);
}
function syncTfSw() {
  if (tfSw) tfSw.hidden = !(cur === 0 && body.dataset.hero === 'decode');
}
function setHero(id, { push = false } = {}) {
  id = HEROES.includes(id) ? id : 'decode';
  body.dataset.hero = id;
  if (heroSw) {
    heroSw.hidden = cur !== 0;
    $$('button', heroSw).forEach((b) => b.setAttribute('aria-current', String(b.dataset.hero === id)));
  }
  syncTfSw();
  if (typeof syncAmpSw === 'function') syncAmpSw();
  const u = new URL(location.href);
  if (id === 'decode') u.searchParams.delete('hero'); else u.searchParams.set('hero', id);
  history[push ? 'pushState' : 'replaceState'](null, '', u.pathname + u.search + u.hash);
  if (id === 'decode' && !HD.decoded) hdStartScramble();
  else hdStopScramble();
}
$$('#hero-sw button').forEach((b) => b.addEventListener('click', () => { setHero(b.dataset.hero, { push: true }); if (heroSw) heroSw.open = false; }));
$$('#tf-sw button').forEach((b) => b.addEventListener('click', () => { setTitleFrame(b.dataset.titleframe, { push: true }); if (tfSw) tfSw.open = false; }));
$$('#amp-sw button').forEach((b) => b.addEventListener('click', () => { setAmplify(b.dataset.amplify, { push: true }); const el = $('#amp-sw'); if (el) el.open = false; }));
setHero(new URLSearchParams(location.search).get('hero') || 'decode');
const AMP_MODES = ['memory', 'meter', 'wave', 'mix'];
function setAmplify(mode, { push = false } = {}) {
  mode = AMP_MODES.includes(mode) ? mode : 'meter';
  if (typeof AMP !== 'undefined') AMP.mode = mode;
  body.dataset.amplify = mode;
  const el = $('#amp-sw');
  if (el) {
    el.hidden = !(cur === 0 && body.dataset.hero === 'decode');
    $$('button', el).forEach((b) => b.setAttribute('aria-current', String(b.dataset.amplify === mode)));
  }
  const u = new URL(location.href);
  if (mode === 'meter') u.searchParams.delete('amplify'); else u.searchParams.set('amplify', mode);
  history[push ? 'pushState' : 'replaceState'](null, '', u.pathname + u.search + u.hash);
}
function syncAmpSw() {
  const el = $('#amp-sw');
  if (el) el.hidden = !(cur === 0 && body.dataset.hero === 'decode');
}
setTitleFrame(new URLSearchParams(location.search).get('titleframe') || 'soft');
setAmplify(new URLSearchParams(location.search).get('amplify') || 'meter');

window.__ab = { tick: emoteTicker, get screen() { return cur; }, get fg() { return fg; }, get gh() { return gh; }, get fKey() { return fKey; }, get detOpen() { return detOpen; }, field, cwPlay, state, LOG, T, A, B, go, swapOutfit, setHero, setTitleFrame, setAmplify, get ghostLive() { return ghostLive; }, get titleframe() { return body.dataset.titleframe; }, get amplify() { return body.dataset.amplify; } };
