/**
 * Amadeus-Resonance · RE:BOOT 式长页概念稿（三个变体共用）。交互逻辑参考 RE:BOOT 宣传页，全部自写。
 *  全局：齿轮加载器 → 一次淡入；右上角 GitHub + 目录（滚过首屏后固定）；全屏目录、平滑滚动、Esc；
 *       入场只有两种（黑块遮罩退去 / 英文标题 0/1 解码）；首屏原画视差。
 *  模块内：角色（唯一出现 E-mote 模型，靠近时才载入，离开视口暂停）、系统（点击换图）、画廊（交叉淡化 + 大图浮层）、获取方式（页签）。
 */
import '../fonts.css';
import './reboot.css';
import { EmoteStage } from '../emote-stage.js';
import { createPerformer } from '../perform.js';

const BASE = import.meta.env.BASE_URL;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const body = document.body;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const smooth = reduce ? 'auto' : 'smooth';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const EX = {
  calm: '表情_普通', smug: '表情_ニヤニヤ', shy: '表情_照れる', surprise: '表情_驚き00', smile: '表情_笑う',
  pout: '表情_むっとする', worry: '表情_困る03', glare: '表情_睨む', glareHard: '表情_睨む（強）', sad: '表情_哀しい01', joy: '表情_喜ぶ01',
};
const WORLD = { a: { model: 'ab', mark: 'α' }, b: { model: 'alt', mark: 'β' } };
let world = new URLSearchParams(location.search).get('wl') === 'b' ? 'b' : 'a';
const applyWorld = () => { body.dataset.world = world; $('#b-world-t').textContent = WORLD[world].mark; };
applyWorld();

/* ------------------------------------------------------------ 加载器：首屏原画解码后一次淡入（模型不在首屏，不等它） */
const heroImg = $('#hero-img');
const t0 = performance.now();
Promise.race([
  (heroImg.complete ? Promise.resolve() : new Promise((r) => { heroImg.onload = heroImg.onerror = r; })).then(() => heroImg.decode?.().catch(() => {})).then(() => document.fonts?.ready),
  wait(8000),
]).then(async () => {
  await wait(Math.max(0, 600 - (performance.now() - t0)));
  body.dataset.loaded = '1';
  startObservers();
});

/* ------------------------------------------------------------ 入场 a：黑块遮罩退去 / 入场 b：0/1 解码 */
function reveal(el) {
  $$('.cap-line', el).forEach((l, i) => l.style.setProperty('--i', i));
  el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
}
function scramble(el) {
  const word = el.dataset.word;
  if (reduce) { el.textContent = word; return; }
  const dur = 300 + word.length * 80, t = performance.now() + 400;
  const tick = (now) => {
    const k = Math.max(0, (now - t) / dur), n = Math.floor(k * word.length);
    el.textContent = word.slice(0, n) + word.slice(n).replace(/\S/g, () => (Math.random() < 0.5 ? '0' : '1'));
    if (k < 1) requestAnimationFrame(tick); else el.textContent = word;
  };
  requestAnimationFrame(tick);
}
$$('[data-scramble]').forEach((el) => { el.dataset.word = el.textContent; if (!reduce) el.textContent = el.textContent.replace(/\S/g, '0'); });

let curMod = 'top';
function startObservers() {
  const once = new IntersectionObserver((ents) => ents.forEach((e) => {
    if (!e.isIntersecting) return;
    once.unobserve(e.target);
    if (e.target.hasAttribute('data-scramble')) scramble(e.target);
    else if (reduce) e.target.classList.add('in'); else reveal(e.target);
  }), { threshold: 0.35 });
  $$('[data-reveal],[data-scramble]').forEach((el) => once.observe(el));
  const modIO = new IntersectionObserver((ents) => ents.forEach((e) => {
    if (e.isIntersecting) { curMod = e.target.dataset.mod; $$('.menu a').forEach((a) => a.setAttribute('aria-current', String(a.dataset.jump === curMod))); }
  }), { rootMargin: '-45% 0px -45% 0px' });
  $$('.mod').forEach((m) => modIO.observe(m));
  // 角色模型：靠近才载入；离开视口暂停渲染
  new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) loadModel(); }), { rootMargin: '600px 0px' }).observe($('#character'));
  new IntersectionObserver((ents) => ents.forEach((e) => { inView = e.isIntersecting; emote?.setActive(inView); if (!inView) performer?.stop(); }), { threshold: 0.05 }).observe($('#character'));
}

/* ------------------------------------------------------------ 滚动：控件固定 / 首屏视差 */
let py = 0, pyT = 0, pRaf = 0;
function onScroll() {
  body.classList.toggle('stuck', scrollY > innerHeight * 0.9);
  pyT = Math.min(scrollY, innerHeight) * 0.3;
  if (!pRaf && !reduce) pRaf = requestAnimationFrame(parallax);
}
function parallax() {
  py += (pyT - py) * 0.12;
  heroImg.style.transform = `translate3d(0,${py.toFixed(1)}px,0)`;
  pRaf = Math.abs(pyT - py) > 0.3 ? requestAnimationFrame(parallax) : 0;
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();
const jump = (id) => document.getElementById(id)?.scrollIntoView({ behavior: smooth, block: 'start' });
$('#totop').addEventListener('click', (e) => { e.preventDefault(); scrollTo({ top: 0, behavior: smooth }); });
$$('a[data-jump]:not(.menu a)').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); jump(a.dataset.jump); }));

/* ------------------------------------------------------------ 目录浮层 */
const menu = $('#menu'), bMenu = $('#b-menu');
const setInert = (v) => { $('#main').inert = v; $('.foot').inert = v; $('.ctl a').inert = v; };
function openMenu() {
  if (!menu.hidden) return;
  menu.hidden = false; void menu.offsetWidth; menu.classList.add('open');
  body.classList.add('menu-open'); bMenu.setAttribute('aria-expanded', 'true'); bMenu.setAttribute('aria-label', '关闭目录');
  setInert(true);
  ($('.menu a[aria-current="true"]') || $('.menu a')).focus();
}
function closeMenu(focusBack = true) {
  if (menu.hidden) return;
  menu.classList.remove('open'); body.classList.remove('menu-open');
  bMenu.setAttribute('aria-expanded', 'false'); bMenu.setAttribute('aria-label', '打开目录');
  setInert(false);
  setTimeout(() => { if (!menu.classList.contains('open')) menu.hidden = true; }, reduce ? 0 : 400);
  if (focusBack) bMenu.focus();
}
bMenu.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));
$$('.menu a').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); closeMenu(false); jump(a.dataset.jump); }));
menu.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  const f = [bMenu, ...$$('.menu a')], i = f.indexOf(document.activeElement);
  if (e.shiftKey && i <= 0) { e.preventDefault(); f.at(-1).focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
});
bMenu.addEventListener('keydown', (e) => { if (e.key === 'Tab' && !menu.hidden) { e.preventDefault(); (e.shiftKey ? $$('.menu a').at(-1) : $('.menu a')).focus(); } });

/* ------------------------------------------------------------ 大图浮层 */
const over = $('#over');
let overFrom = null;
function openOver(src, cap) {
  overFrom = document.activeElement;
  $('#over-img').src = src; $('#over-cap').textContent = cap;
  over.hidden = false; void over.offsetWidth; over.classList.add('open');
  setInert(true); $('#ctl').inert = true;
  $('#over-x').focus();
}
function closeOver() {
  if (over.hidden) return;
  over.classList.remove('open'); setInert(false); $('#ctl').inert = false;
  setTimeout(() => { if (!over.classList.contains('open')) over.hidden = true; }, reduce ? 0 : 350);
  overFrom?.focus();
}
$('#over-x').addEventListener('click', closeOver);
over.addEventListener('click', (e) => { if (e.target === over) closeOver(); });
over.addEventListener('keydown', (e) => { if (e.key === 'Tab') { e.preventDefault(); $('#over-x').focus(); } });

/* ------------------------------------------------------------ 角色：模型（懒加载）+ 状态缩略图 */
let emote = null, performer = null, inView = false;
const HER = [
  { name: '平静', ex: 'calm', mo: 'nod', line: '……有事吗？我在整理实验数据。' },
  { name: '得意', ex: 'smug', mo: 'tilt', line: '哼，被我说中了吧？' },
  { name: '害羞', ex: 'shy', mo: 'away', line: '……别、别一直盯着看。' },
  { name: '惊讶', ex: 'surprise', mo: 'lean', line: '欸？刚才那是什么？' },
  { name: '生气', ex: 'pout', mo: 'cross', line: '先说清楚：我可不是你的助手。' },
  { name: '开心', ex: 'joy', mo: 'sway', line: '……还不错。我是说，实验结果。' },
  { name: '疑问 · 原声', ex: 'worry', act: 'voice' },
  { name: '论述 · 原声', ex: 'glare', act: 'form' },
];
$('#thumbs').innerHTML = HER.map((h, i) => `<li><button type="button" data-h="${i}" aria-pressed="${i === 0}" aria-label="${h.name}" title="${h.name}"><img src="${BASE}img/cinema/ex-${h.ex}.webp" alt="">${h.act ? '<span class="v" aria-hidden="true">♪</span>' : ''}</button></li>`).join('');
const ready = () => emote?.state === 'ready';
function loadModel() {
  if (emote) return;
  emote = new EmoteStage({ canvas: $('#emote-canvas'), base: BASE, resolution: devicePixelRatio >= 2 ? 1.5 : 1.25, minLogoMs: 0 });
  emote.alias = WORLD[world].model;
  emote.setView({ zoom: 1.05, dy: 20 }, 1);
  emote.addEventListener('ready', () => { body.dataset.model = 'ready'; emote.setExpression(EX[HER[herI].ex]); emote.setActive(inView); });
  emote.addEventListener('error', () => { body.dataset.model = 'error'; $('#k-fallback').hidden = false; });
  performer = createPerformer({ emote, EX, stageEl: body, buttons: [] });
  emote.setActive(true);
  emote.start();
}
// 视线：在角色模块里跟随指针
let gRaf = 0, gazeHold = 0;
function gazeTo(cx, cy) {
  if (!ready() || !inView) return;
  const r = $('#emote-canvas').getBoundingClientRect();
  const gx = Math.max(-1, Math.min(1, (cx - (r.left + r.width / 2)) / (innerWidth * 0.42)));
  const gy = Math.max(-1, Math.min(1, (cy - (r.top + r.height * 0.2)) / (innerHeight * 0.55)));
  if (!gRaf) gRaf = requestAnimationFrame(() => { gRaf = 0; emote.lookAt(gx, gy, 260); });
}
addEventListener('pointermove', (e) => { if (performance.now() > gazeHold) gazeTo(e.clientX, e.clientY); }, { passive: true });
let sayT = 0;
function say(text, hold = 3800) {
  const line = $('#line');
  clearTimeout(sayT);
  $('#line-t').textContent = text;
  line.classList.add('on');
  if (reduce) line.classList.add('in'); else reveal(line);
  sayT = setTimeout(() => line.classList.remove('on', 'in'), hold + 800);
}
let herI = 0;
async function setHer(i, { scroll = true } = {}) {
  herI = (i + HER.length) % HER.length;
  const h = HER[herI];
  $$('#thumbs button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.h) === herI)));
  $('#state-name').textContent = h.name;
  const sec = $('#character');
  if (scroll && Math.abs(sec.getBoundingClientRect().top) > 4) sec.scrollIntoView({ behavior: smooth, block: 'start' });
  loadModel();
  performer?.stop();
  const b = $(`#thumbs button[data-h="${herI}"]`); const r = b.getBoundingClientRect();
  gazeTo(r.left + r.width / 2, r.top + r.height / 2); gazeHold = performance.now() + 1400;
  await wait(reduce ? 0 : 120);
  if (h.act) { $('#line').classList.remove('on', 'in'); performer?.play(h.act); return; }
  if (ready()) { emote.setExpression(EX[h.ex]); setTimeout(() => emote.motion(h.mo), 180); }
  say(h.line);
}
$$('#thumbs button').forEach((b) => b.addEventListener('click', () => setHer(Number(b.dataset.h))));
$('#st-prev').addEventListener('click', () => setHer(herI - 1));
$('#st-next').addEventListener('click', () => setHer(herI + 1));
$('#pv').addEventListener('click', () => setHer(7));

/* ------------------------------------------------------------ 世界线 */
let shifting = false;
async function shiftWorld() {
  if (shifting) return;
  shifting = true;
  const to = world === 'a' ? 'b' : 'a';
  let ok = true;
  if (ready()) {
    performer?.stop();
    const cv = $('#emote-canvas'); cv.style.opacity = '0';
    await wait(reduce ? 0 : 450);
    try { ok = await emote.swap(WORLD[to].model); } catch (e) { ok = false; }
    cv.style.opacity = '';
  } else if (emote) { emote.alias = WORLD[to].model; }
  if (ok) { world = to; applyWorld(); }
  shifting = false;
  if (ready() && inView) say(ok ? '……刚才，是不是有什么变了？' : '……没事，什么都没变。', 3000);
}
$('#b-world').addEventListener('click', shiftWorld);

/* ------------------------------------------------------------ 系统：点击换图 */
const SYS = [
  { img: 'img/reboot/app-daily.webp', cap: '日常舞台与 VN 面板。' },
  { img: 'img/reboot/app-health.webp', cap: '同源 API 网关；前端请求都经过它。' },
  { img: 'img/reboot/app-vn.webp', cap: 'WebRTC、语音识别、对话、TTS、记忆与 VN 视觉运行时。' },
];
let sysFront = 0, sysI = 0;
async function setSys(i) {
  sysI = i;
  $$('#tiers button').forEach((b) => b.setAttribute('aria-selected', String(Number(b.dataset.t) === i)));
  const imgs = $$('.sys-fig img'), back = imgs[1 - sysFront];
  back.src = BASE + SYS[i].img;
  try { await back.decode(); } catch (e) { /* 照常切换 */ }
  if (sysI !== i) return;
  back.classList.add('on'); imgs[sysFront].classList.remove('on'); sysFront = 1 - sysFront;
  $('#sys-cap').textContent = SYS[i].cap;
}
$$('#tiers button').forEach((b) => b.addEventListener('click', () => setSys(Number(b.dataset.t))));

/* ------------------------------------------------------------ 画廊：交叉淡化 + 缩略图条 + 大图浮层 */
const GAL = [
  { k: 'app-daily', cap: '日常舞台 · Stage 8（WP8-8 验收）' },
  { k: 'app-vn', cap: 'VN 陪玩面板 · Stage 8（WP8-8 验收）' },
  { k: 'app-health', cap: '本地服务状态 · Stage 8（WP8-8 验收）' },
  { k: 'app-history', cap: '对话历史抽屉 · WP8-6' },
  { k: 'app-settings', cap: '设置抽屉 · WP8-6' },
  { k: 'app-overlay', cap: '桌面 Overlay · WP8-8' },
  { k: 'app-boot', cap: '启动界面 · WP8-8' },
  { k: 'app-bootlogo', cap: '启动标志 · 2026-09-07' },
];
$('#strip').innerHTML = GAL.map((g, i) => `<li><button type="button" data-g="${i}" aria-pressed="${i === 0}" aria-label="${g.cap}"><img src="${BASE}img/reboot/${g.k}-t.webp" alt=""></button></li>`).join('');
let galI = 0, galFront = 0;
const galImgs = $$('#viewer img');
galImgs[0].src = `${BASE}img/reboot/${GAL[0].k}.webp`; $('#vcap').textContent = GAL[0].cap;
async function setGal(i) {
  galI = i;
  $$('#strip button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.g) === i)));
  const back = galImgs[1 - galFront];
  back.src = `${BASE}img/reboot/${GAL[i].k}.webp`;
  try { await back.decode(); } catch (e) { /* 照常切换 */ }
  if (galI !== i) return;
  back.classList.add('on'); galImgs[galFront].classList.remove('on'); galFront = 1 - galFront;
  $('#vcap').textContent = GAL[i].cap;
}
$$('#strip button').forEach((b) => b.addEventListener('click', () => setGal(Number(b.dataset.g))));
$('#viewer').addEventListener('click', () => openOver(`${BASE}img/reboot/${GAL[galI].k}.webp`, GAL[galI].cap));

/* ------------------------------------------------------------ 获取方式：页签（←→ 键可切换） */
const tabs = $$('.tabs [role="tab"]');
function setTab(t) {
  tabs.forEach((x) => { const on = x === t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; document.getElementById(x.getAttribute('aria-controls')).hidden = !on; });
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => setTab(t));
  t.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; setTab(n); n.focus(); } });
});

/* ------------------------------------------------------------ 键盘 */
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (!over.hidden) closeOver(); else closeMenu(); return; }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if ((e.key === 'd' || e.key === 'D') && menu.hidden && over.hidden) shiftWorld();
});

window.__reboot = {
  info: () => ({ variant: body.dataset.variant, loaded: !!body.dataset.loaded, world, mod: curMod, model: emote?.state || 'not-loaded', alias: emote?.alias, expr: emote?.current, her: herI, act: performer?.current || null, menu: !menu.hidden, over: !over.hidden, gal: galI, sys: sysI, tab: tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'), stuck: body.classList.contains('stuck'), rendering: emote?.rendering, shifting }),
  setHer, setGal, setSys, openMenu, closeMenu, shiftWorld,
};
