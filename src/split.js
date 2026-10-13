/**
 * Amadeus-Resonance · 左右分栏概念稿入口（split.html）
 * 版式：左侧纸面（标志 + 一句话），右侧原画舞台（原画 + E-mote 模型合成一张画）。
 * 三章：序 / 记忆 / 表演。切章 = 右侧原画交叉淡化 + 模型换机位与表情，左侧只换一句标题。
 * 复用 src/emote-stage.js 与 src/perform.js（字 / 声 / 形）。
 */
import './fonts.css';
import './split.css';
import { EmoteStage } from './emote-stage.js';
import { createPerformer } from './perform.js';

const BASE = import.meta.env.BASE_URL;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const body = document.body;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const EX = {
  calm: '表情_普通', smug: '表情_ニヤニヤ', shy: '表情_照れる', surprise: '表情_驚き00', smile: '表情_笑う',
  pout: '表情_むっとする', worry: '表情_困る03', glare: '表情_睨む', glareHard: '表情_睨む（強）', sad: '表情_哀しい01', joy: '表情_喜ぶ01',
};
const ORDER = ['hero', 'mem', 'perf'];
// 机位：序 = 全身；记忆 = 推近到半身；表演 = 七分身
const CAM = { hero: { zoom: 1.0, dy: 0 }, mem: { zoom: 1.62, dy: 150 }, perf: { zoom: 1.22, dy: 60 } };
const ART = { hero: 'img/cinema/kv-ghost.webp', mem: 'img/cinema/mem-rooftop.webp', perf: 'img/cinema/stage-lab.webp' };
const WORLD = { a: { model: 'ab' }, b: { model: 'alt' } };
let world = new URLSearchParams(location.search).get('wl') === 'b' ? 'b' : 'a';
body.dataset.world = world;
const setWorldKey = () => { $('#k-world-t').textContent = world === 'b' ? 'β' : 'α'; };
setWorldKey();

/* ------------------------------------------------------------ 模型 */
const kurisu = $('#kurisu');
const emote = new EmoteStage({ canvas: $('#emote-canvas'), base: BASE, resolution: devicePixelRatio >= 2 ? 1.5 : 1.25, minLogoMs: 400 });
emote.alias = WORLD[world].model;
emote.setView(CAM.hero, 1);
emote.addEventListener('ready', () => {
  body.dataset.model = 'ready';
  setTimeout(() => { if (cur === 'hero') { emote.setExpression(EX.calm); say(world === 'b' ? '……这里的空气，好像不太一样。' : '……连上了。你就是新的操作员？'); } }, 700);
});
emote.addEventListener('error', () => { body.dataset.model = 'error'; $('#k-fallback').hidden = false; });
emote.setActive(true);
emote.start();
const ready = () => emote.state === 'ready';

// 视线：跟随指针；点了什么就看向它一会儿
let gazeHold = 0, gRaf = 0, gx = 0, gy = 0;
function gazeTo(cx, cy) {
  const r = kurisu.getBoundingClientRect();
  gx = Math.max(-1, Math.min(1, (cx - (r.left + r.width / 2)) / (innerWidth * 0.42)));
  gy = Math.max(-1, Math.min(1, (cy - (r.top + r.height * 0.2)) / (innerHeight * 0.55)));
  if (!gRaf) gRaf = requestAnimationFrame(() => { gRaf = 0; if (ready()) emote.lookAt(gx, gy, 260); });
}
function lookAtEl(el, ms = 2000) {
  const r = el.getBoundingClientRect();
  gazeTo(r.left + r.width / 2, r.top + r.height / 2);
  gazeHold = performance.now() + ms;
}
// 视差：原画随指针轻微反向移动
addEventListener('pointermove', (e) => {
  if (performance.now() > gazeHold) gazeTo(e.clientX, e.clientY);
  if (!reduce) {
    body.style.setProperty('--px', ((e.clientX / innerWidth) * 2 - 1).toFixed(3));
    body.style.setProperty('--py', ((e.clientY / innerHeight) * 2 - 1).toFixed(3));
  }
}, { passive: true });

// 她的台词：出现在下黑边，像电影字幕
let sayT = 0;
function say(text, hold = 4200) {
  const el = $('#line');
  clearTimeout(sayT);
  el.classList.remove('on');
  setTimeout(() => { el.textContent = text; el.classList.add('on'); }, 160);
  sayT = setTimeout(() => el.classList.remove('on'), hold + 160);
}

const POKE = [
  { ex: 'pout', mo: 'cross', line: '先说清楚：我可不是你的助手。' },
  { ex: 'shy', mo: 'away', line: '……别一直盯着看。' },
  { ex: 'smug', mo: 'tilt', line: '哼，被我说中了吧？' },
];
let pokeI = 0;
$('#k-hit').addEventListener('click', () => {
  if (!ready() || performer.current) return;
  const p = POKE[pokeI++ % POKE.length];
  emote.setExpression(EX[p.ex]); emote.motion(p.mo); say(p.line);
});

/* ------------------------------------------------------------ 记忆 */
// 示例：知识边界 —— 她只认亲历过的事；没经历过的不编造
const FRAGS = [
  { img: 'img/cinema/mem-rooftop.webp', ex: 'smile', mo: 'tilt', line: '那天的风很大。……你也还记得吧？' },
  { img: 'img/cinema/mem-lab.webp', ex: 'smug', mo: 'nod', line: '我的实验室。别乱碰那些器材。' },
  { img: 'img/cinema/mem-radiokan.webp', ex: 'worry', mo: 'lean', line: '那颗“人工卫星”……总觉得在哪里见过。' },
  { img: 'img/cinema/mem-meter.webp', sealed: true, ex: 'glare', mo: 'cross', line: '那段我没有经历过。不知道的事，我不会编。' },
];
let fragCur = -1;
async function recallFrag(i) {
  const f = FRAGS[i]; if (!f) return;
  if (cur !== 'mem') await goTo('mem');
  fragCur = i;
  $$('#frags button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.f) === i)));
  await showArt(f.img, 'mem', !!f.sealed);
  lookAtEl($(`#frags button[data-f="${i}"]`), 1600);
  if (ready()) { emote.setExpression(EX[f.ex]); setTimeout(() => emote.motion(f.mo), 260); }
  say(f.line, 4200);
}
$$('#frags button').forEach((b) => b.addEventListener('click', () => recallFrag(Number(b.dataset.f))));

/* ------------------------------------------------------------ 表演 */
const actBtns = $$('#acts button');
const performer = createPerformer({ emote, EX, stageEl: body, buttons: actBtns });
actBtns.forEach((b) => b.addEventListener('click', () => { lookAtEl(b, 1200); $('#line').classList.remove('on'); }));

/* ------------------------------------------------------------ 舞台原画：两张 img 交叉淡化 */
let artFront = 0;
async function showArt(src, k, sealed = false) {
  const imgs = $$('#art img');
  const front = imgs[artFront];
  if (front.getAttribute('src') === BASE + src && front.dataset.k === k && !!front.dataset.sealed === sealed) return;
  const back = imgs[1 - artFront];
  back.src = BASE + src; back.dataset.k = k;
  if (sealed) back.dataset.sealed = ''; else delete back.dataset.sealed;
  try { await back.decode(); } catch (e) { /* 解码失败也照常切换 */ }
  back.classList.remove('on'); void back.offsetWidth;
  back.classList.add('on'); front.classList.remove('on');
  artFront = 1 - artFront;
}

/* ------------------------------------------------------------ 切章：右侧原画交叉淡化，模型换机位；左侧只换标题 */
let cur = null, busy = false;
async function goTo(key, first = false) {
  if (!ORDER.includes(key) || (key === cur && !first) || busy) return;
  busy = true;
  cur = key;
  body.dataset.sec = key;
  $$('.hd').forEach((h) => h.classList.toggle('on', h.dataset.hd === key));
  $$('.menu button').forEach((b) => b.setAttribute('aria-current', String(b.dataset.go === key)));
  closeMenu();
  if (key !== 'perf') performer.stop();
  history.replaceState(null, '', `${location.search}#${key}`);
  const art = showArt(key === 'mem' && fragCur >= 0 ? FRAGS[fragCur].img : ART[key], key === 'mem' && fragCur < 0 ? 'mem-idle' : key, key === 'mem' && fragCur >= 0 && !!FRAGS[fragCur].sealed);
  emote.setView(CAM[key], first || reduce ? 1 : 1500);
  if (ready() && !first) emote.setExpression(EX.calm);
  if (!first && ready()) {
    if (key === 'mem' && fragCur < 0) setTimeout(() => { if (cur === 'mem' && fragCur < 0) say('想起哪一段，就点哪一段。', 3200); }, 900);
    if (key === 'perf') setTimeout(() => { if (cur === 'perf' && !performer.current) say('要看哪一种？', 2600); }, 900);
  }
  await art;
  await wait(first || reduce ? 0 : 700);
  busy = false;
}
const step = (d) => goTo(ORDER[Math.max(0, Math.min(ORDER.length - 1, ORDER.indexOf(cur) + d))]);
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-go]'); if (!b) return;
  e.preventDefault(); goTo(b.dataset.go);
});
let wheelLock = 0;
addEventListener('wheel', (e) => {
  if (Math.abs(e.deltaY) < 18 || performance.now() < wheelLock) return;
  wheelLock = performance.now() + 1100; step(e.deltaY > 0 ? 1 : -1);
}, { passive: true });
let ty = null;
addEventListener('touchstart', (e) => { ty = e.touches[0].clientY; }, { passive: true });
addEventListener('touchend', (e) => { if (ty == null) return; const d = ty - e.changedTouches[0].clientY; if (Math.abs(d) > 50) step(d > 0 ? 1 : -1); ty = null; }, { passive: true });

/* ------------------------------------------------------------ 左侧黑色方键：目录 / 世界线 / 声音 */
const menu = $('#menu'), kMenu = $('#k-menu');
function closeMenu() { menu.hidden = true; kMenu.setAttribute('aria-expanded', 'false'); }
kMenu.addEventListener('click', () => { const open = menu.hidden; menu.hidden = !open; kMenu.setAttribute('aria-expanded', String(open)); });
$('#k-world').addEventListener('click', () => shiftWorld());
$('#k-sound').addEventListener('click', (e) => {
  const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
  e.currentTarget.setAttribute('aria-pressed', String(on));
  performer.audio.muted = !on;
});

/* ------------------------------------------------------------ 世界线（D 键）：舞台淡出 → 换装 → 淡入 */
let shifting = false;
async function shiftWorld() {
  if (shifting || !ready()) return;
  shifting = true;
  performer.stop();
  const to = world === 'a' ? 'b' : 'a';
  const k = $('#kurisu');
  if (!reduce) { k.style.opacity = '0'; await wait(700); }
  let ok = true;
  try { ok = await emote.swap(WORLD[to].model); } catch (e) { ok = false; }
  if (ok) { world = to; body.dataset.world = world; setWorldKey(); }
  await wait(reduce ? 0 : 200);
  k.style.opacity = '';
  shifting = false;
  setTimeout(() => { if (ready()) say(ok ? '……刚才，是不是有什么变了？' : '……没事，什么都没变。', 3200); }, 600);
}
addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'd' || e.key === 'D') shiftWorld();
  else if (['ArrowDown', 'PageDown'].includes(e.key)) { e.preventDefault(); step(1); }
  else if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); step(-1); }
});

const start = location.hash.slice(1);
goTo(ORDER.includes(start) ? start : 'hero', true);

window.__split = {
  info: () => ({ sec: cur, world, model: emote.state, expr: emote.current, alias: emote.alias, shifting, busy, frag: fragCur, act: performer.current, frames: emote.stats.frames, rendering: emote.rendering }),
  goTo, recallFrag, shiftWorld, play: (a) => performer.play(a),
};
