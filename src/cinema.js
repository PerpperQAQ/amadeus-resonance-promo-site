/**
 * Amadeus-Resonance · 剧场概念稿 v3 入口（cinema.html）
 * 交互逻辑参考 RE:BOOT 宣传页（全部自写，不依赖 GSAP）：
 *  加载器（等首屏原画 + 模型就绪，超时兜底）→ 一次淡入；右上角菜单 / 世界线两个黑块，滚过首屏后固定；
 *  原生滚动 + 首屏原画视差；入场只有两种：黑块遮罩退去、英文章节名 0/1 乱码解码；
 *  记忆 = 画廊（大图交叉淡化 + 缩略图条）；她 = 人物区（状态缩略图 + 前后箭头，点了切表情 / 动作 / 台词，可带原声）。
 */
import './fonts.css';
import './cinema.css';
import { EmoteStage } from './emote-stage.js';
import { createPerformer } from './perform.js';

const BASE = import.meta.env.BASE_URL;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const body = document.body;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const smooth = reduce ? 'auto' : 'smooth';

const EX = {
  calm: '表情_普通', smug: '表情_ニヤニヤ', shy: '表情_照れる', surprise: '表情_驚き00', smile: '表情_笑う',
  pout: '表情_むっとする', worry: '表情_困る03', glare: '表情_睨む', glareHard: '表情_睨む（強）', sad: '表情_哀しい01', joy: '表情_喜ぶ01',
};
const SECS = ['hero', 'mem', 'her'];
// 机位：序 = 全身；记忆 = 半身；她 = 七分身
const CAM = { hero: { zoom: 1.0, dy: 0 }, mem: { zoom: 1.62, dy: 150 }, her: { zoom: 1.2, dy: 60 } };
const WORLD = { a: { model: 'ab', mark: 'α' }, b: { model: 'alt', mark: 'β' } };
let world = new URLSearchParams(location.search).get('wl') === 'b' ? 'b' : 'a';
const applyWorld = () => { body.dataset.world = world; $('#b-world-t').textContent = WORLD[world].mark; };
applyWorld();

/* ------------------------------------------------------------ 模型 */
const kurisu = $('#kurisu');
const emote = new EmoteStage({ canvas: $('#emote-canvas'), base: BASE, resolution: devicePixelRatio >= 2 ? 1.5 : 1.25, minLogoMs: 0 });
emote.alias = WORLD[world].model;
emote.setView(CAM.hero, 1);
const modelReady = new Promise((res) => {
  emote.addEventListener('ready', () => { body.dataset.model = 'ready'; res('ready'); });
  emote.addEventListener('error', () => { body.dataset.model = 'error'; $('#k-fallback').hidden = false; res('error'); });
});
emote.setActive(true);
emote.start();
const ready = () => emote.state === 'ready';

/* ------------------------------------------------------------ 加载器：首屏原画 + 模型（12 秒兜底）→ 一次淡入 */
const kvImg = $('#kv-img');
const artReady = (kvImg.complete ? Promise.resolve() : new Promise((r) => { kvImg.onload = kvImg.onerror = r; })).then(() => kvImg.decode?.().catch(() => {}));
const t0 = performance.now();
Promise.race([Promise.all([artReady, modelReady]), wait(12000)]).then(async () => {
  await wait(Math.max(0, 500 - (performance.now() - t0)));   // 至少转半秒，避免一闪
  body.dataset.loaded = '1';
  startObservers();
  setTimeout(() => { if (cur === 'hero' && ready()) { emote.setExpression(EX.calm); say(world === 'b' ? '……这里的空气，好像不太一样。' : '……连上了。你就是新的操作员？'); } }, 1400);
});

/* ------------------------------------------------------------ 视线 */
let gazeHold = 0, gRaf = 0, gx = 0, gy = 0;
function gazeTo(cx, cy) {
  const r = kurisu.getBoundingClientRect();
  gx = Math.max(-1, Math.min(1, (cx - (r.left + r.width / 2)) / (innerWidth * 0.42)));
  gy = Math.max(-1, Math.min(1, (cy - (r.top + r.height * 0.2)) / (innerHeight * 0.55)));
  if (!gRaf) gRaf = requestAnimationFrame(() => { gRaf = 0; if (ready()) emote.lookAt(gx, gy, 260); });
}
function lookAtEl(el, ms = 2000) { const r = el.getBoundingClientRect(); gazeTo(r.left + r.width / 2, r.top + r.height / 2); gazeHold = performance.now() + ms; }
addEventListener('pointermove', (e) => { if (performance.now() > gazeHold) gazeTo(e.clientX, e.clientY); }, { passive: true });

/* ------------------------------------------------------------ 入场 a：黑块遮罩退去 */
function reveal(el) {
  $$('.cap-line', el).forEach((l, i) => l.style.setProperty('--i', i));
  el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
}
// 台词：同样的黑块退去
let sayT = 0;
function say(text, hold = 4200) {
  const line = $('#line');
  clearTimeout(sayT);
  $('#line-t').textContent = text;
  line.classList.add('on');
  if (reduce) line.classList.add('in'); else reveal(line);
  sayT = setTimeout(() => line.classList.remove('on', 'in'), hold + 800);
}

/* ------------------------------------------------------------ 入场 b：英文章节名 0/1 乱码解码 */
function scramble(el) {
  const word = el.dataset.word || (el.dataset.word = el.textContent);
  if (reduce) { el.textContent = word; return; }
  const dur = 300 + word.length * 90, t = performance.now() + 400;
  el.textContent = word.replace(/\S/g, () => (Math.random() < 0.5 ? '0' : '1'));
  const tick = (now) => {
    const k = Math.max(0, (now - t) / dur);
    const n = Math.floor(k * word.length);
    el.textContent = word.slice(0, n) + word.slice(n).replace(/\S/g, () => (Math.random() < 0.5 ? '0' : '1'));
    if (k < 1) requestAnimationFrame(tick); else el.textContent = word;
  };
  requestAnimationFrame(tick);
}

function startObservers() {
  // 只触发一次
  const once = new IntersectionObserver((ents) => ents.forEach((e) => {
    if (!e.isIntersecting) return;
    once.unobserve(e.target);
    if (e.target.hasAttribute('data-scramble')) scramble(e.target);
    else if (reduce) e.target.classList.add('in'); else reveal(e.target);
  }), { threshold: 0.4 });
  $$('[data-reveal],[data-scramble]').forEach((el) => once.observe(el));
  // 章节：她移到可见章节的位置并换机位
  const secIO = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) setSection(e.target.dataset.sec); }), { threshold: 0.55 });
  $$('.sc').forEach((s) => secIO.observe(s));
}
// 章节名先显示成乱码占位，避免载入前一闪原词
$$('[data-scramble]').forEach((el) => { el.dataset.word = el.textContent; if (!reduce) el.textContent = el.textContent.replace(/\S/g, '0'); });

/* ------------------------------------------------------------ 章节 */
let cur = null;
function setSection(key) {
  if (key === cur) return;
  cur = key;
  body.dataset.sec = key;
  $(`#${key} .slot`).append(kurisu);
  emote.setView(CAM[key], reduce ? 1 : 1200);
  if (key !== 'her') performer.stop();
  if (ready()) emote.setExpression(key === 'her' ? HER[herI].ex : key === 'mem' && fragCur > 0 ? FRAGS[fragCur].ex : EX.calm);
  $$('.menu a').forEach((a) => a.setAttribute('aria-current', String(a.dataset.jump === key)));
}
/* ------------------------------------------------------------ 滚动：控件固定 / 回到顶部 / 首屏视差（平滑跟随） */
let py = 0, pyT = 0, pRaf = 0;
function onScroll() {
  body.classList.toggle('stuck', scrollY > innerHeight * 0.9);
  pyT = Math.min(scrollY, innerHeight) * 0.32;
  if (!pRaf && !reduce) pRaf = requestAnimationFrame(parallax);
}
function parallax() {
  py += (pyT - py) * 0.12;
  kvImg.style.transform = `translate3d(0,${py.toFixed(1)}px,0)`;
  pRaf = Math.abs(pyT - py) > 0.3 ? requestAnimationFrame(parallax) : 0;
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();
$('#totop').addEventListener('click', (e) => { e.preventDefault(); scrollTo({ top: 0, behavior: smooth }); });

/* ------------------------------------------------------------ 目录浮层：Esc 关闭，背后 inert，焦点留在浮层 */
const menu = $('#menu'), bMenu = $('#b-menu');
function openMenu() {
  if (!menu.hidden) return;
  menu.hidden = false; void menu.offsetWidth; menu.classList.add('open');
  body.classList.add('menu-open'); bMenu.setAttribute('aria-expanded', 'true'); bMenu.setAttribute('aria-label', '关闭目录');
  $('#main').inert = true; $('#totop').inert = true; $('#b-world').inert = true;
  ($('.menu a[aria-current="true"]') || $('.menu a')).focus();
}
function closeMenu(focusBack = true) {
  if (menu.hidden) return;
  menu.classList.remove('open'); body.classList.remove('menu-open');
  bMenu.setAttribute('aria-expanded', 'false'); bMenu.setAttribute('aria-label', '打开目录');
  $('#main').inert = false; $('#totop').inert = false; $('#b-world').inert = false;
  setTimeout(() => { if (!menu.classList.contains('open')) menu.hidden = true; }, reduce ? 0 : 400);
  if (focusBack) bMenu.focus();
}
bMenu.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));
$$('.menu a').forEach((a) => a.addEventListener('click', (e) => {
  e.preventDefault();
  closeMenu(false);
  document.getElementById(a.dataset.jump).scrollIntoView({ behavior: smooth, block: 'start' });
}));
menu.addEventListener('keydown', (e) => {   // 焦点循环：浮层链接 + 关闭按钮
  if (e.key !== 'Tab') return;
  const f = [bMenu, ...$$('.menu a')];
  const i = f.indexOf(document.activeElement);
  if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
  else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
});
bMenu.addEventListener('keydown', (e) => { if (e.key === 'Tab' && !menu.hidden) { e.preventDefault(); (e.shiftKey ? $$('.menu a').at(-1) : $('.menu a')).focus(); } });

/* ------------------------------------------------------------ 记忆：画廊 */
const FRAGS = [
  { img: 'img/cinema/mem-rooftop-obs.webp', ex: 'smile', mo: 'tilt', line: '那天的风很大。……你也还记得吧？' },
  { img: 'img/cinema/mem-lab-obs.webp', ex: 'smug', mo: 'nod', line: '我的实验室。别乱碰那些器材。' },
  { img: 'img/cinema/mem-radiokan-obs.webp', ex: 'worry', mo: 'lean', line: '那颗“人工卫星”……总觉得在哪里见过。' },
  { img: 'img/cinema/mem-meter-obs.webp', sealed: true, ex: 'glare', mo: 'cross', line: '那段我没有经历过。不知道的事，我不会编。' },
];
let fragCur = 0, galFront = 0;
const galImgs = $$('#gal img');
galImgs[0].src = BASE + FRAGS[0].img;
async function recallFrag(i, react = true) {
  const f = FRAGS[i]; if (!f) return;
  fragCur = i;
  $$('#frags button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.f) === i)));
  const front = galImgs[galFront], back = galImgs[1 - galFront];
  back.src = BASE + f.img;
  if (f.sealed) back.dataset.sealed = ''; else delete back.dataset.sealed;
  try { await back.decode(); } catch (e) { /* 照常切换 */ }
  if (fragCur !== i) return;
  back.classList.add('on'); front.classList.remove('on'); galFront = 1 - galFront;
  if (!react) return;
  lookAtEl($(`#frags button[data-f="${i}"]`), 1600);
  if (ready()) { emote.setExpression(EX[f.ex]); setTimeout(() => emote.motion(f.mo), 260); }
  say(f.line, 4200);
}
$$('#frags button').forEach((b) => b.addEventListener('click', () => recallFrag(Number(b.dataset.f))));

/* ------------------------------------------------------------ 她：状态缩略图 */
const HER = [
  { name: '平静', ex: EX.calm, mo: 'nod', thumb: 'calm', line: '……有事吗？我在整理实验数据。' },
  { name: '得意', ex: EX.smug, mo: 'tilt', thumb: 'smug', line: '哼，被我说中了吧？' },
  { name: '害羞', ex: EX.shy, mo: 'away', thumb: 'shy', line: '……别、别一直盯着看。' },
  { name: '惊讶', ex: EX.surprise, mo: 'lean', thumb: 'surprise', line: '欸？刚才那是什么？' },
  { name: '生气', ex: EX.pout, mo: 'cross', thumb: 'pout', line: '先说清楚：我可不是你的助手。' },
  { name: '开心', ex: EX.joy, mo: 'sway', thumb: 'joy', line: '……还不错。我是说，实验结果。' },
  { name: '疑问 · 原声', ex: EX.worry, act: 'voice', thumb: 'worry' },
  { name: '论述 · 原声', ex: EX.glare, act: 'form', thumb: 'glare' },
];
const thumbs = $('#thumbs');
HER.forEach((h, i) => thumbs.insertAdjacentHTML('beforeend', `<li><button type="button" data-h="${i}" aria-pressed="${i === 0}" aria-label="${h.name}" title="${h.name}"><img src="${BASE}img/cinema/ex-${h.thumb}.webp" alt="">${h.act ? '<span class="v" aria-hidden="true">♪</span>' : ''}</button></li>`));
const performer = createPerformer({ emote, EX, stageEl: body, buttons: [] });
let herI = 0;
async function setHer(i, { scroll = true } = {}) {
  herI = (i + HER.length) % HER.length;
  const h = HER[herI];
  $$('#thumbs button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.h) === herI)));
  $('#state-name').textContent = h.name;
  const sec = $('#her');
  if (scroll && Math.abs(sec.getBoundingClientRect().top) > 4) sec.scrollIntoView({ behavior: smooth, block: 'start' });
  performer.stop();
  await wait(reduce ? 0 : 120);
  if (h.act) { $('#line').classList.remove('on', 'in'); performer.play(h.act); return; }
  if (ready()) { emote.setExpression(h.ex); if (h.mo) setTimeout(() => emote.motion(h.mo), 180); }
  say(h.line, 3600);
}
$$('#thumbs button').forEach((b) => b.addEventListener('click', () => setHer(Number(b.dataset.h))));
$('#st-prev').addEventListener('click', () => setHer(herI - 1));
$('#st-next').addEventListener('click', () => setHer(herI + 1));

/* ------------------------------------------------------------ 世界线（D 键 / 右上角按钮） */
let shifting = false;
async function shiftWorld() {
  if (shifting || !ready()) return;
  shifting = true;
  performer.stop();
  const to = world === 'a' ? 'b' : 'a';
  kurisu.classList.add('swapping');
  await wait(reduce ? 0 : 450);
  let ok = true;
  try { ok = await emote.swap(WORLD[to].model); } catch (e) { ok = false; }
  if (ok) { world = to; applyWorld(); }
  kurisu.classList.remove('swapping');
  shifting = false;
  setTimeout(() => { if (ready()) say(ok ? '……刚才，是不是有什么变了？' : '……没事，什么都没变。', 3200); }, 500);
}
$('#b-world').addEventListener('click', shiftWorld);
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeMenu(); return; }
  if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest('input,textarea')) return;
  if ((e.key === 'd' || e.key === 'D') && menu.hidden) shiftWorld();
});

setSection('hero');

window.__cinema = {
  info: () => ({ loaded: !!body.dataset.loaded, sec: cur, world, model: emote.state, expr: emote.current, alias: emote.alias, shifting, frag: fragCur, her: herI, act: performer.current, menu: !menu.hidden, stuck: body.classList.contains('stuck'), frames: emote.stats.frames }),
  emote, EX, recallFrag, setHer, shiftWorld, openMenu, closeMenu, setSection,
};
