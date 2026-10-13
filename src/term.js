/**
 * Amadeus 终端 · 概念稿入口（concept/terminal）
 * 一个固定的终端舞台：滚动 / 频道切换只改变终端里的状态、人物机位和信息，不换整页背景。
 * 复用：src/emote-stage.js（真实 E-mote 模型）、齿轮 Logo、本地字体、原 CG（降级为记忆碎片 / 观测帧）。
 */
import './fonts.css';
import './term.css';
import { EmoteStage } from './emote-stage.js';

const BASE = import.meta.env.BASE_URL;
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const body = document.body;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pad2 = (n) => String(n).padStart(2, '0');
const now = () => { const d = new Date(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`; };

const EX = {
  calm: '表情_普通', smug: '表情_ニヤニヤ', shy: '表情_照れる', surprise: '表情_驚き00', smile: '表情_笑う',
  pout: '表情_むっとする', worry: '表情_困る03', glare: '表情_睨む', joy: '表情_喜ぶ01', glareHard: '表情_睨む（強）',
};
const EX_NAME = Object.fromEntries(Object.entries(EX).map(([k, v]) => [v, k]));

/* ------------------------------------------------------------ 世界线（同一系统，不同参数） */
const WORLD = {
  a: { read: '1.048596', model: 'ab', tag: 'AB', name: 'kurisu_ab · 外套 · E-mote' },
  b: { read: '0.571024', model: 'alt', tag: 'LABCOAT', name: 'kurisu_ab_labcoat · 白大褂 · E-mote' },
};
let world = new URLSearchParams(location.search).get('wl') === 'b' ? 'b' : 'a';
body.dataset.world = world;
$('#wl-read').textContent = WORLD[world].read;
$('#feed-model').textContent = WORLD[world].tag;
$('#kv-model').textContent = WORLD[world].name;

/* ------------------------------------------------------------ 机位（每屏一套） */
const CAM = {
  hero: { zoom: 1.0, dy: 0, label: '×1.00' },
  mem: { zoom: 1.55, dy: 120, label: '×1.55' },
};

/* ------------------------------------------------------------ 模型 */
const canvas = $('#emote-canvas');
const emote = new EmoteStage({ canvas, base: BASE, resolution: devicePixelRatio >= 2 ? 1.5 : 1.25, minLogoMs: 900 });
emote.alias = WORLD[world].model;
emote.setView(CAM.hero, 1);

/* ------------------------------------------------------------ 开机日志 */
const bootLog = $('#boot-log');
const bootLine = (html) => { const li = document.createElement('li'); li.innerHTML = html; bootLog.append(li); while (bootLog.children.length > 7) bootLog.firstChild.remove(); return li; };
const BOOT = [
  '<b>AMADEUS</b> resonance · dev build',
  'mount  fonts / ui ............ ok',
  'link   127.0.0.1 ............. local',
  `worldline  ${WORLD[world].read}`,
];
let bootDone = false, bootT0 = performance.now(), progLi = null;
BOOT.forEach((l, i) => setTimeout(() => !bootDone && bootLine(l), reduce ? 0 : 160 + i * 220));
setTimeout(() => { if (!bootDone) progLi = bootLine('load   kurisu model .......... <b>0%</b>'); }, reduce ? 0 : 1100);
emote.addEventListener('progress', (e) => { if (progLi) progLi.innerHTML = `load   kurisu model .......... <b>${Math.round(e.detail.progress * 100)}%</b>`; });
emote.addEventListener('stage', (e) => { if (e.detail.stage === 'parse' && !bootDone) bootLine('parse  e-mote timeline ........ <b>…</b>'); });
function finishBoot(ok) {
  if (bootDone) return;
  bootDone = true;
  if (!ok) bootLine('model  unavailable · 静态立绘');
  const wait = Math.max(0, 1500 - (performance.now() - bootT0));
  setTimeout(() => { body.dataset.boot = 'off'; ev('session', 'open · local'); setTimeout(() => sayHello(), 700); }, reduce ? 0 : wait + 250);
}
$('#boot').addEventListener('click', () => finishBoot(emote.state === 'ready'));

emote.addEventListener('ready', () => {
  body.dataset.model = 'ready';
  $('#kv-state').textContent = 'READY';
  emote.setActive(true);
  finishBoot(true);
});
emote.addEventListener('error', (e) => {
  body.dataset.model = 'error';
  $('#kv-state').textContent = 'OFFLINE';
  $('#feed-fallback').hidden = false;
  ev('model', 'error · ' + String(e.detail.message).slice(0, 40));
  finishBoot(false);
});
emote.addEventListener('expression', (e) => {
  const t = e.detail.timeline;
  $('#kv-expr').textContent = t;
  if (body.dataset.boot === 'off') ev('expr', `→ ${t}`);
});
emote.setActive(true);
emote.start();
setTimeout(() => finishBoot(emote.state === 'ready'), 25000);   // 兜底：模型过慢也能进入

/* ------------------------------------------------------------ 首屏：真实状态控制台 */
const evlog = $('#evlog');
function ev(k, v) {
  const li = document.createElement('li');
  li.innerHTML = `<span class="t">${now()}</span><b>${k}</b>${v}`;
  evlog.append(li);
  while (evlog.children.length > 3) evlog.firstChild.remove();
}
// fps：数 SDK 实际画出的帧
const spark = $('#spark').getContext('2d'), fpsHist = [];
let lastFrames = 0;
setInterval(() => {
  const f = emote.stats.frames - lastFrames; lastFrames = emote.stats.frames;
  const fps = emote.rendering ? f : 0;
  $('#kv-fps').textContent = `${fps} fps`;
  $('#feed-fps').textContent = `${pad2(fps)} FPS`;
  fpsHist.push(fps); if (fpsHist.length > 30) fpsHist.shift();
  const c = spark, W = 120, H = 16;
  c.clearRect(0, 0, W, H);
  c.strokeStyle = getComputedStyle(body).getPropertyValue('--a').trim() ? `rgba(${getComputedStyle(body).getPropertyValue('--a')},.9)` : '#fa3';
  c.lineWidth = 1; c.beginPath();
  fpsHist.forEach((v, i) => { const x = (i / 29) * (W - 1), y = H - 1 - Math.min(1, v / 65) * (H - 3); i ? c.lineTo(x, y) : c.moveTo(x, y); });
  c.stroke();
}, 1000);
setInterval(() => { $('#clock').textContent = now(); }, 1000);
$('#clock').textContent = now();

// 视线跟随指针（节流到每帧一次）
let gx = 0, gy = 0, gazeRaf = 0;
addEventListener('pointermove', (e) => {
  const r = $('#feed-body').getBoundingClientRect();
  gx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (innerWidth * 0.45)));
  gy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height * 0.22)) / (innerHeight * 0.5)));
  if (!gazeRaf) gazeRaf = requestAnimationFrame(() => {
    gazeRaf = 0;
    if (emote.state === 'ready') emote.lookAt(gx, gy, 220);
    $('#kv-gaze').textContent = `${gx >= 0 ? '+' : ''}${gx.toFixed(2)} / ${gy >= 0 ? '+' : ''}${gy.toFixed(2)}`;
    $('#kv-gbar').style.left = `${50 + gx * 50}%`;
  });
}, { passive: true });

// 点她：换表情 + 动作，并在终端里回一句
const POKE = [
  { ex: 'pout', mo: 'cross', line: '先说清楚：我可不是你的助手。' },
  { ex: 'smug', mo: 'tilt', line: '哼，被我说中了吧？' },
  { ex: 'shy', mo: 'away', line: '……别一直盯着看。' },
  { ex: 'surprise', mo: 'lean', line: '欸？等一下，刚才那是什么？' },
  { ex: 'smile', mo: 'nod', line: '好啦，我在听。' },
];
let pokeI = 0;
$('#feed-hit').addEventListener('click', () => {
  if (emote.state !== 'ready') return;
  const p = POKE[pokeI++ % POKE.length];
  emote.setExpression(EX[p.ex]); emote.motion(p.mo);
  typeReply(p.line); ev('say', p.ex);
});
function sayHello() {
  if (emote.state !== 'ready') return;
  emote.setExpression(EX.smile); emote.motion('nod');
  typeReply('终于连上了。……你就是新的操作员？', $('#reply-hero'));
  setTimeout(() => { if (screen === 'hero' && emote.state === 'ready') emote.setExpression(EX.smug); }, 2600);
}

/* ------------------------------------------------------------ 记忆屏 */
const mlog = $('#mlog');
function mline(op, k, v, cls = '') {
  const li = document.createElement('li');
  li.className = `op-${op[0].toLowerCase()} ${cls}`;
  li.innerHTML = `<span class="t">${now()}</span><b>${op.padEnd(5, ' ')}</b><span class="k">${k}</span><span class="v">${v}</span>`;
  mlog.append(li);
  while (mlog.children.length > 8) mlog.firstChild.remove();
  return li;
}
// 示例写入：按真实产品规则编写（用户记忆与 VN 状态分开、原始截图默认不留存），不是真实数据
const WRITES = [
  ['WRITE', 'user.pref', '「咖啡不加糖」 ← 对话 · 已确认'],
  ['WRITE', 'user.event', '「周五有组会」 ← 对话 · 已确认'],
  ['SKIP', 'screen.raw', '原始截图 · 默认不留存'],
  ['WRITE', 'vn.state', '第 3 章 · 已读 → VN 状态（与用户记忆分开）'],
  ['SKIP', 'vn.ocr', '完整文本 · 默认不留存'],
  ['WRITE', 'user.topic', '「最近在看相对论」 ← 对话 · 已确认'],
  ['HOLD', 'user.guess', '「好像不喜欢下雨」 · 未确认，暂不写入'],
];
let wI = 0, writeTimer = 0;
function autoWrite() {
  const [op, k, v] = WRITES[wI++ % WRITES.length];
  mline(op, k, v);
}
const TIERS = [
  { key: '亲历', read: 'tier.0 personal', rule: '确定的事，可以直接说', line: '这个我记得，不用查。你说过咖啡不加糖。', ex: 'smile', mo: 'nod', frag: { img: 'img/bg-outro.webp', cap: 'T0 · 亲历 · 天台' } },
  { key: '所见', read: 'tier.1 observe', rule: '只说你选定窗口里的画面', line: '我看到的是……先别急着下结论。', ex: 'calm', mo: 'lean', frag: { img: 'img/bg-what.webp', cap: 'T1 · 观测帧 · 用户选定窗口' } },
  { key: '既视感', read: 'tier.2 deja-vu', rule: '只能说“好像”，不当成事实', line: '奇怪……这一幕，好像在哪见过。', ex: 'worry', mo: 'tilt', frag: { img: 'img/bg-hero.webp', cap: 'T2 · 碎片 · 来源不明的世界线', glitch: true } },
  { key: '禁区', read: 'tier.3 forbidden', rule: '未解锁的剧情与作品外资料：拒绝', line: '结局？我怎么可能知道。别想套我的话。', ex: 'glareHard', mo: 'cross', frag: { redact: true, cap: 'T3 · 禁区 · Re:Boot 新内容' } },
];
let tierCur = -1, fragT = 0, replyT = 0;
function typeReply(text, q = $(screen === 'mem' ? '#reply-q' : '#reply-hero')) {
  clearInterval(replyT); q.classList.add('typing');
  if (reduce) { q.textContent = text; q.classList.remove('typing'); return; }
  let n = 0; q.textContent = '';
  replyT = setInterval(() => { q.textContent = text.slice(0, ++n); if (n >= text.length) { clearInterval(replyT); q.classList.remove('typing'); } }, 45);
}
function showFrag(f) {
  const el = $('#frag');
  clearTimeout(fragT);
  el.classList.remove('on', 'glitch', 'redact');
  if (f.img) $('#frag-img').src = BASE + f.img;
  $('#frag-cap').textContent = f.cap;
  void el.offsetWidth;
  el.classList.add('on');
  if (f.glitch) el.classList.add('glitch');
  if (f.redact) el.classList.add('redact');
  fragT = setTimeout(() => el.classList.remove('on'), 4200);
}
function readTier(i) {
  const t = TIERS[i];
  if (screen !== 'mem') scrollToScreen('mem');
  tierCur = i;
  $$('#tiers li').forEach((li) => { const on = Number(li.dataset.t) === i; li.classList.toggle('on', on); li.setAttribute('aria-selected', on); });
  if (i === 3) mline('DENY', t.read, t.rule, 'hot').className = 'op-x hot';
  else mline('READ', t.read, t.rule, 'hot');
  typeReply(t.line);
  showFrag(t.frag);
  if (emote.state === 'ready') { emote.setExpression(EX[t.ex]); emote.motion(t.mo); }
  clearInterval(writeTimer); writeTimer = setInterval(autoWrite, 2600);   // 读取后稍等再继续写入
}
$$('#tiers li').forEach((li) => {
  const i = Number(li.dataset.t);
  li.addEventListener('click', () => readTier(i));
  li.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); readTier(i); }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const n = $$('#tiers li')[(i + (e.key === 'ArrowDown' ? 1 : 3)) % 4]; n.focus(); }
  });
});

/* ------------------------------------------------------------ 屏幕切换（滚动 / 频道） */
const SCR = {
  hero: { ch: 'CH.01', name: '会话 · SESSION', ruler: 0.02, wipe: 'img/bg-perform.webp' },
  mem: { ch: 'CH.04', name: '记忆 · MEMORY', ruler: 0.39, wipe: 'img/bg-boundary.webp' },
};
let screen = 'hero';
function go(key, { instant = false } = {}) {
  if (!SCR[key] || key === screen) return;
  screen = key;
  body.dataset.screen = key;
  const s = SCR[key];
  $('#ch-no').textContent = s.ch; $('#ch-name').textContent = s.name;
  $('#ruler-head').style.left = `calc(${s.ruler * 100}% - 3px)`;
  $$('.chs button').forEach((b) => b.classList.toggle('on', b.dataset.go === key));
  emote.setView(CAM[key], instant ? 1 : 1100);
  $('#feed-zoom').textContent = CAM[key].label;
  ev('channel', `→ ${s.ch} ${s.name.split(' ')[0]}`);
  if (!instant && !reduce) {
    const w = $('#wipe'); $('#wipe-img').src = BASE + s.wipe;
    w.classList.remove('go'); void w.offsetWidth; w.classList.add('go');
  }
  clearInterval(writeTimer);
  if (key === 'mem') {
    if (!mlog.children.length) { autoWrite(); autoWrite(); autoWrite(); }
    writeTimer = setInterval(autoWrite, 2600);
    if (emote.state === 'ready') { emote.setExpression(EX.calm); emote.motion('tilt'); }
  } else if (emote.state === 'ready') { emote.setExpression(EX.smile); }
}
$$('.chs button').forEach((b) => b.addEventListener('click', () => scrollToScreen(b.dataset.go)));
const tracks = $$('.track > div');
function scrollToScreen(key) {
  const el = tracks.find((d) => d.dataset.scr === key);
  if (el) scrollTo({ top: el.offsetTop, behavior: reduce ? 'auto' : 'smooth' });
  go(key);
}
const io = new IntersectionObserver((ents) => {
  ents.forEach((e) => { if (e.isIntersecting && e.intersectionRatio > 0.55) go(e.target.dataset.scr); });
}, { threshold: [0.55] });
tracks.forEach((t) => io.observe(t));
$('#ruler-head').style.left = `calc(${SCR.hero.ruler * 100}% - 3px)`;

/* ------------------------------------------------------------ 世界线变动（同一系统换参数） */
let shifting = false;
async function shiftWorld() {
  if (shifting || emote.state !== 'ready') return;
  shifting = true;
  const to = world === 'a' ? 'b' : 'a';
  ev('worldline', `${WORLD[world].read} → ${WORLD[to].read}`);
  const msg = $('#feed-msg'); msg.hidden = false;
  const w = $('#wipe'); $('#wipe-img').src = BASE + 'img/bg-boundary.webp'; w.classList.remove('go'); void w.offsetWidth; w.classList.add('go');
  // 读数逐位跳变
  const el = $('#wl-read'); let k = 0;
  const jt = setInterval(() => { el.textContent = Array.from(WORLD[to].read, (c, i) => (c === '.' || i < k / 3) ? (i < k / 3 ? WORLD[to].read[i] : c) : String(Math.floor(Math.random() * 10))).join(''); k++; }, 50);
  world = to; body.dataset.world = to;
  $('#feed-model').textContent = WORLD[to].tag; $('#kv-model').textContent = WORLD[to].name;
  try { await emote.swap(WORLD[to].model); } finally {
    clearInterval(jt); el.textContent = WORLD[to].read;
    msg.hidden = true; shifting = false;
  }
}
addEventListener('keydown', (e) => {
  if (e.target.closest('input,textarea')) return;
  if (e.key === 'd' || e.key === 'D') shiftWorld();
  if (body.dataset.boot === 'on' && (e.key === 'Enter' || e.key === ' ')) finishBoot(emote.state === 'ready');
});

/* ------------------------------------------------------------ 测试 / 截图钩子 */
window.__term = {
  info: () => ({ boot: body.dataset.boot, screen, world, model: emote.state, expr: emote.current, alias: emote.alias, shifting, frames: emote.stats.frames, rendering: emote.rendering, tier: tierCur }),
  go: scrollToScreen, readTier, shiftWorld,
};
