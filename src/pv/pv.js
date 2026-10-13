/**
 * PV 预览：一个固定舞台、一条时间轴（参考 amadeus-promo-spatial-20261012/src/spatial.js）。
 * 滚动位置 = 播放头 progress 0→6；关键帧插值驱动 后层原画 / 中层 E-mote / 前层物件 的“镜头”。
 * 「▶」自动播放约 88 s：按时间滚动页面，并在分镜时刻触发各段互动；滚轮 / 触摸 / 键盘即暂停。
 * 分镜真源：docs/PV_STORYBOARD_v2.md。表情为手工编排；原声为原作游戏语音，仅演示。
 */
import '../fonts.css';
import './pv.css';
import { EmoteStage } from '../emote-stage.js';
import { createVoice } from './voice.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
const lerp = (a, b, t) => a + (b - a) * t;
const sm = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const win = (p, a, b, f = .12) => sm((p - a) / f) * (1 - sm((p - b) / f));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const BASE = import.meta.env.BASE_URL;
const body = document.body, stage = $('#stage'), journey = $('#journey'), actor = $('#actor');

// ---------------------------------------------------------------- 时间轴
const SEG_P = [0, 1, 2.3, 3.3, 4.6, 5.3, 6];
const SEG_T = [0, 14, 34, 50, 70, 80, 88];
const TOTAL = 88;
const tToP = (t) => { for (let i = 0; i < 6; i++) if (t <= SEG_T[i + 1]) return lerp(SEG_P[i], SEG_P[i + 1], (t - SEG_T[i]) / (SEG_T[i + 1] - SEG_T[i])); return 6; };
const pToT = (p) => { for (let i = 0; i < 6; i++) if (p <= SEG_P[i + 1]) return lerp(SEG_T[i], SEG_T[i + 1], (p - SEG_P[i]) / (SEG_P[i + 1] - SEG_P[i])); return TOTAL; };
const segOf = (p) => (p < 1 ? 1 : p < 2.3 ? 2 : p < 3.3 ? 3 : p < 4.6 ? 4 : p < 5.3 ? 5 : 6);

// 镜头关键帧：cs/cx/cy 后层缩放与位移(%)；ax/ay/as 人物；ao 人物不透明；gs 游戏画面缩放
const K = [
  { p: 0,    cs: 1,    cx: 0,  cy: 0,  ax: .74, ay: 1.04, as: .92, ao: 0, gs: 1 },
  { p: .3,   cs: 1,    cx: 0,  cy: 0,  ax: .74, ay: 1.04, as: .92, ao: 0, gs: 1 },
  { p: .45,  cs: 1.02, cx: 0,  cy: 0,  ax: .74, ay: 1.02, as: .92, ao: 1, gs: 1 },
  { p: .95,  cs: 1.06, cx: -3, cy: 0,  ax: .72, ay: 1.02, as: .92, ao: 1, gs: 1 },
  { p: 1.2,  cs: 1.14, cx: -2, cy: 2,  ax: .70, ay: 1.36, as: 1.38, ao: 1, gs: 1 },
  { p: 2.15, cs: 1.16, cx: -2, cy: 2,  ax: .70, ay: 1.36, as: 1.38, ao: 1, gs: 1 },
  { p: 2.45, cs: 1.04, cx: 0,  cy: 0,  ax: .76, ay: 1.06, as: 1.0, ao: 1, gs: 1 },
  { p: 3.2,  cs: 1.05, cx: 0,  cy: 0,  ax: .76, ay: 1.06, as: 1.0, ao: 1, gs: 1 },
  { p: 3.45, cs: 1.1,  cx: 3,  cy: 0,  ax: .85, ay: 1.0,  as: .64, ao: 1, gs: .96 },
  { p: 4.5,  cs: 1.1,  cx: 3,  cy: 0,  ax: .85, ay: 1.0,  as: .64, ao: 1, gs: 1.02 },
  { p: 5.25, cs: 1.1,  cx: 3,  cy: 0,  ax: .85, ay: 1.0,  as: .64, ao: 1, gs: 1.04 },
  { p: 5.4,  cs: 1.16, cx: 0,  cy: -7, ax: .30, ay: 1.02, as: .78, ao: 1, gs: 1 },
  { p: 5.7,  cs: 1.02, cx: 0,  cy: 0,  ax: .30, ay: 1.02, as: .78, ao: 1, gs: 1 },
  { p: 6,    cs: 1.02, cx: 0,  cy: 0,  ax: .30, ay: 1.02, as: .78, ao: 1, gs: 1 },
];
const STOPS = [.7, 1.75, 2.8, 4.0, 4.95, 5.6]; // 减少动态效果时直接用各段停点构图
function keyAt(p) {
  let i = 0; while (i < K.length - 2 && p > K[i + 1].p) i++;
  const a = K[i], b = K[i + 1], t = sm((p - a.p) / (b.p - a.p || 1));
  const o = {}; for (const k in a) o[k] = lerp(a[k], b[k], t); return o;
}

// ---------------------------------------------------------------- E-mote
const emote = new EmoteStage({ canvas: $('#emote-canvas'), base: BASE, resolution: Math.min(devicePixelRatio, 1.5), minLogoMs: 0 });
const ready = () => emote.state === 'ready';
const ex = (name) => ready() && emote.setExpression('表情_' + name);
const voice = createVoice(emote);
let timers = [];
const later = (ms, fn) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
function seq(list) { list.forEach(([ms, name]) => later(ms, () => ex(name))); }

// ---------------------------------------------------------------- 字幕
const herEl = $('#her'), herJp = $('#her-jp'), herZh = $('#her-zh'), youEl = $('#you'), gameEl = $('#game');
let herTimer = 0;
function say(zh, { jp = '', hold = 3200 } = {}) {
  clearTimeout(herTimer); herEl.classList.remove('cut');
  herJp.textContent = jp; herZh.textContent = zh; herEl.classList.add('on');
  if (hold) herTimer = setTimeout(() => herEl.classList.remove('on'), hold);
}
function hush() { clearTimeout(herTimer); herEl.classList.remove('on', 'cut'); }
function you(t) { youEl.textContent = t; youEl.classList.toggle('on', !!t); }
function game(t) { gameEl.textContent = t; gameEl.classList.toggle('on', !!t); }

// ---------------------------------------------------------------- 各段重置
let seg = 0;
function resetAll() {
  timers.forEach(clearTimeout); timers = []; voice.stop(); hush(); you(''); game('');
  $$('.blk[data-act]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  acting = null;
}
function enterSeg(n) {
  resetAll(); rearm(n); seg = n; body.dataset.seg = n;
  $$('.seg').forEach((s) => s.classList.toggle('on', +s.dataset.seg === n));
  $$('.jumps .blk').forEach((b, i) => b.setAttribute('aria-current', String(i === n - 1)));
  $('#corner').textContent = n === 2 ? '原作语音，演示用｜表情为演示编排' : '表情为演示编排';
  if (n === 4 && !picked) { $('#windows').classList.remove('gone'); }
  if (n === 5) { picked = true; game(GAME_LINE); setLevel(0, false); }
  if (n === 6) { /* 卡片保持上次状态，便于来回看 */ }
  ex(n === 4 || n === 5 ? '困る03' : '普通');
}

// ---------------------------------------------------------------- 1 序章
const TAGS = [
  () => { say('年龄不是重点。论文才是。'); seq([[0, 'ニヤニヤ'], [1400, '普通']]); },
  () => { say('研究方向是记忆。所以记住你这件事，我是专业的。', { hold: 3800 }); seq([[0, '楽しい00']]); },
  () => { say('……这张卡是谁贴的。撕掉，马上撕掉。', { hold: 3600 }); seq([[0, '驚き01'], [450, '頬染め01'], [1000, 'むっとする']]); },
];
const tagsDone = new Set();
$$('.tag').forEach((b) => b.addEventListener('click', () => {
  const i = +b.dataset.tag; TAGS[i](); tagsDone.add(i); b.classList.add('done');
  if (tagsDone.size === 3) later(1400, showSetup);
}));
function showSetup() { $('#setup').classList.add('out'); }
$('#self').addEventListener('click', () => {
  showSetup(); $('#self').classList.add('lit'); $('#setup').classList.add('lit');
  say('好，就按你本来的样子。称呼什么的，之后慢慢改也行。', { hold: 3600 });
  seq([[0, '照れる'], [600, '普通']]);
});

// ---------------------------------------------------------------- 2 声与形
const ACT = {
  text: { zh: '把漆原的性别变回男性，IBN5100 就真的能回来吗？' },
  voice: { src: 'audio/kurisu-crs_2148.m4a', cues: [[0, '普通', '漆原さんの性別を男に戻すことで、本当にIBN5100は戻ってくるのか、っていうこと。', '把漆原的性别变回男性，IBN5100 就真的会回来吗——我想问的是这个。'], [3000, '困る01'], [7000, '睨む']] },
  form: { src: 'audio/kurisu-crs_1897.m4a', max: 7.2, cues: [[0, 'むっとする', '極端な管理社会。全体主義。', '极端的管理社会，极权主义。'], [3900, '睨む（強）', 'まゆりがバナナを食べたいと思っても、', '就算真由理想吃香蕉，'], [6700, '驚き01', '今日がバナナを食べていい日でなければ……', '只要今天不是“可以吃香蕉的日子”……']] },
};
let acting = null;
function interrupt() {
  timers.forEach(clearTimeout); timers = []; voice.stop(); acting = null;
  herEl.classList.add('cut');
  $$('.blk[data-act]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  later(380, () => { say('嗯？你说。', { hold: 2400 }); seq([[0, '驚き00'], [900, '普通']]); });
}
function act(name) {
  if (acting === 'voice' || acting === 'form') return interrupt();
  timers.forEach(clearTimeout); timers = []; voice.stop();
  $$('.blk[data-act]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.act === name)));
  const a = ACT[name];
  if (name === 'text') { ex('困る00'); say(a.zh, { hold: 3000 }); later(3000, () => $(`[data-act="text"]`).setAttribute('aria-pressed', 'false')); return; }
  acting = name;
  const done = () => { acting = null; $(`[data-act="${name}"]`).setAttribute('aria-pressed', 'false'); later(600, hush); };
  voice.play(BASE + a.src, { maxSec: a.max ?? Infinity, onEnd: done });
  for (const [ms, e, jp, zh] of a.cues) later(ms, () => { ex(e); if (zh) say(zh, { jp, hold: 0 }); });
  // 素材缺失时仍按时间线完成字幕与表情
  later((a.max ? a.max * 1000 : 7800) + 300, () => { if (acting === name) { voice.stop(); done(); } });
}
$$('.blk[data-act]').forEach((b) => b.addEventListener('click', () => act(b.dataset.act)));
const GROUP = ['普通', '楽しい00', '睨む', '困る02'];
$$('.gcard').forEach((c) => c.addEventListener('click', () => { c.classList.toggle('flip'); ex(GROUP[+c.dataset.g]); }));

// ---------------------------------------------------------------- 3 记忆
let memMode = '';
const memcard = $('#memcard');
function setMem(m) {
  memMode = m;
  $$('[data-mem]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mem === m)));
  memcard.className = 'paper memcard'; $('#localbox').classList.toggle('on', m === 'local');
  $('#eject').classList.toggle('on', m === 'mem0');
  $$('.drawer').forEach((d) => d.classList.toggle('open', m !== 'off' && d.dataset.drawer === 'us'));
  you('还记得我上次说的吗？'); hush();
  later(900, () => {
    if (m === 'mem0') { memcard.classList.add('fly'); say('当然。你说考试周要熬夜——所以今天睡够了没有？', { hold: 3400 }); seq([[0, 'ニヤニヤ'], [1600, '困る01']]); }
    if (m === 'local') { memcard.classList.add('boxed'); say('记得。放在你这台电脑里，哪儿也没去。', { hold: 3000 }); seq([[0, '普通'], [1200, '楽しい00']]); }
    if (m === 'off') { memcard.classList.add('shut', 'blank'); say('这次我不记。不过现在这一段，我还是会认真听。', { hold: 3200 }); seq([[0, '困る00'], [1500, '普通']]); }
  });
}
$$('[data-mem]').forEach((b) => b.addEventListener('click', () => setMem(b.dataset.mem)));
$('#eject').addEventListener('click', () => {
  $('#eject').classList.add('lit'); memcard.className = 'paper memcard shut blank';
  $$('.drawer').forEach((d) => d.classList.remove('open')); you('');
  say('……记忆那边好像断线了。没关系，先接着聊。', { hold: 3200 }); seq([[0, '驚き00'], [1200, '普通']]);
  later(3400, () => $('#eject').classList.remove('lit'));
});
$('[data-drawer="story"]').addEventListener('click', () => { you(''); say('那是剧情，不是你的经历。别想让我记混。', { hold: 3000 }); ex('むっとする'); });
$('[data-drawer="us"]').addEventListener('click', (e) => e.currentTarget.classList.toggle('open'));
function flashDrawers() { $$('.drawer').forEach((d) => { d.classList.remove('flash'); void d.offsetWidth; d.classList.add('flash'); }); }

// ---------------------------------------------------------------- 4 一起看
let picked = false;
function pick(w) {
  if (w !== 'game') { say(w === 'browser' ? '这是浏览器。我要看的是游戏。' : '那是你的编辑器。换一个。', { hold: 2200 }); ex('ニヤニヤ'); return; }
  picked = true; $('#windows').classList.add('gone'); position();
  say('就这个？好，我看着。', { hold: 2200 }); ex('普通');
  later(1200, dejavu); later(8200, showChoices);
}
$$('.win').forEach((b) => b.addEventListener('click', () => pick(b.dataset.win)));
function setMis(dx) { $('#mis-r').setAttribute('dx', dx); $('#mis-b').setAttribute('dx', -dx); }
function dejavu() {
  hush(); body.classList.add('dejavu'); setMis(9);
  later(500, () => { body.classList.remove('dejavu'); setMis(2); });
  // 先静止 1.2 s，再看向画面
  later(1200, () => { if (ready()) emote.lookAt(-.75, .05, 600); ex('驚き00'); });
  later(2100, () => { ex('困る01'); say('……说不上来，总觉得在哪见过。', { hold: 3600 }); $('#ask').classList.add('on'); });
}
$('#ask').addEventListener('click', () => { say('后面的剧情我也不知道。我只知道我亲身经历过的。', { hold: 3600 }); ex('普通'); });
function showChoices() { $('#choices').classList.add('on'); say('换成我，会选 B。……干嘛看我，按的人又不是我。', { hold: 3800 }); ex('ニヤニヤ'); if (ready()) emote.lookAt(0, 0, 500); }
$$('.choice').forEach((b) => b.addEventListener('click', () => {
  $$('.choice').forEach((x) => x.classList.toggle('lit', x === b));
  if (b.dataset.ch === 'B') { say('嗯，不坏。', { hold: 2200 }); seq([[0, '照れる'], [600, '普通']]); }
  else { say('也行。看看会怎样。', { hold: 2400 }); ex('楽しい00'); }
}));

// ---------------------------------------------------------------- 5 分寸
const GAME_LINE = '大家今天也辛苦啦——先吃点东西再继续吧？';
function setLevel(lv, react = true) {
  timers.forEach(clearTimeout); timers = []; hush();
  $$('.frame').forEach((f) => f.classList.toggle('lit', +f.dataset.lv === lv));
  if (!react) return;
  game(''); later(120, () => game(GAME_LINE));
  const END = 1900; // 游戏台词“播放”时长
  ex('普通');
  if (lv === 1) { seq([[500, '睨む'], [2000, '普通']]); }
  if (lv === 2) later(END, () => say('……嗯。', { hold: 2000 }));
  if (lv === 3) later(END + 800, () => { say('这人说话总绕弯子。', { hold: 2600 }); ex('ニヤニヤ'); });
  if (lv === 4) later(END, () => say('如果到了选项，我会提醒你。现在不用。', { hold: 3200 }));
}
$$('.frame').forEach((f) => { f.style.backgroundImage = `url(${BASE}img/pv/talk-mayuri.webp)`; f.addEventListener('click', () => setLevel(+f.dataset.lv)); });

// ---------------------------------------------------------------- 6 本机
function flipCard(cap) { $(`.icard[data-cap="${cap}"]`).classList.add('flip'); }
function testCard(cap) {
  const c = $(`.icard[data-cap="${cap}"]`), st = $('.stamp', c); c.classList.add('flip');
  if (cap === 'screen') { st.textContent = '未配置'; st.className = 'stamp gray on'; say('这一项还没接上。不急，其他照样能用。', { hold: 3000 }); ex('困る00'); }
  else { st.textContent = '通'; st.className = 'stamp on'; say('连上了。你的钥匙，你自己保管。', { hold: 3000 }); ex('楽しい00'); }
}
$$('.icard').forEach((c) => {
  $('.face', c).addEventListener('click', () => c.classList.add('flip'));
  $('[data-k="key"]', c).addEventListener('click', (e) => e.currentTarget.classList.add('lit'));
  $('[data-k="test"]', c).addEventListener('click', () => testCard(c.dataset.cap));
});
let endSaid = false;
function endLine() { if (endSaid) return; endSaid = true; say('下次见。……我是说，记得来。', { hold: 4200 }); ex('頬染め01'); }
$('#replay').addEventListener('click', () => { resetScenes(); scrollTo(0, 0); later(300, startPlay); });
function resetScenes() {
  tagsDone.clear(); $$('.tag').forEach((t) => t.classList.remove('done')); $('.tags').classList.remove('blown');
  $('#setup').classList.remove('out', 'lit'); $('#self').classList.remove('lit');
  $$('.gcard').forEach((c) => c.classList.remove('flip'));
  memcard.className = 'paper memcard'; $('#localbox').classList.remove('on'); $('#eject').classList.remove('on', 'lit'); $$('[data-mem]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  picked = false; $('#windows').classList.remove('gone'); $('#ask').classList.remove('on'); $('#choices').classList.remove('on'); $$('.choice').forEach((x) => x.classList.remove('lit'));
  $$('.icard').forEach((c) => { c.classList.remove('flip'); $('.stamp', c).className = 'stamp'; $$('.blk', c).forEach((b) => b.classList.remove('lit')); });
  endSaid = false; $('#replay').classList.remove('on');
}

// 再次进入某段时把该段道具复位，互动可以重新触发
function rearm(n) {
  if (n === 1) { tagsDone.clear(); $$('.tag').forEach((t) => t.classList.remove('done')); $('.tags').classList.remove('blown'); $('#setup').classList.remove('out', 'lit'); $('#self').classList.remove('lit'); }
  if (n === 2) $$('.gcard').forEach((c) => c.classList.remove('flip'));
  if (n === 3) { memMode = ''; memcard.className = 'paper memcard'; $('#localbox').classList.remove('on'); $('#eject').classList.remove('on', 'lit'); $$('[data-mem]').forEach((b) => b.setAttribute('aria-pressed', 'false')); $$('.drawer').forEach((d) => d.classList.remove('open', 'flash')); }
  if (n === 4) { picked = false; $('#windows').classList.remove('gone'); $('#ask').classList.remove('on'); $('#choices').classList.remove('on'); $$('.choice').forEach((x) => x.classList.remove('lit')); body.classList.remove('dejavu'); setMis(2); if (ready()) emote.lookAt(0, 0, 300); }
  if (n === 5) $$('.frame').forEach((f) => f.classList.remove('lit'));
  requestAnimationFrame(position);
  if (n === 6) { $$('.icard').forEach((c) => { c.classList.remove('flip'); $('.stamp', c).className = 'stamp'; $$('.blk', c).forEach((b) => b.classList.remove('lit')); }); endSaid = false; $('#replay').classList.remove('on'); }
}

// ---------------------------------------------------------------- 自动播放（时刻表 = 分镜 v2）
const click = (sel) => $(sel)?.click();
const CUES = [
  [6.0, () => click('[data-tag="0"]')], [7.3, () => click('[data-tag="1"]')], [8.6, () => click('[data-tag="2"]')],
  [10.0, showSetup], [10.6, () => click('#self')], [12.6, () => $('.tags').classList.add('blown')],
  [15, () => act('text')], [18, () => act('voice')], [26, () => act('form')], [31, () => interrupt()],
  [31.6, () => click('[data-g="0"]')], [32.3, () => click('[data-g="1"]')], [33.0, () => click('[data-g="2"]')], [33.6, () => click('[data-g="3"]')],
  [35, () => setMem('mem0')], [39, () => setMem('local')], [42, () => setMem('off')], [45, () => setMem('mem0')], [46.6, () => click('#eject')], [48.5, flashDrawers],
  [51.8, () => pick('game')], [57.5, () => click('#ask')], [66, () => click('[data-ch="B"]')],
  [70.3, () => setLevel(0, false)], [72, () => setLevel(1)], [74, () => setLevel(2)], [76, () => setLevel(3)], [78.6, () => setLevel(0, false)],
  [82, () => flipCard('chat')], [83, () => testCard('chat')], [84.2, () => testCard('screen')],
  [86.6, endLine], [88, () => $('#replay').classList.add('on')],
];
let playing = false, raf = 0, t0 = 0, tFrom = 0, lastT = 0;
const playBtn = $('#play');
function scrollMax() { return journey.offsetHeight - innerHeight; }
function startPlay() {
  if (playing) return;
  let p = clamp(scrollY / scrollMax()) * 6; if (p > 5.97) { resetScenes(); scrollTo(0, 0); p = 0; }
  tFrom = pToT(p); lastT = tFrom - .001; t0 = performance.now(); playing = true;
  playBtn.textContent = '❚❚'; playBtn.setAttribute('aria-pressed', 'true'); playBtn.setAttribute('aria-label', '暂停');
  raf = requestAnimationFrame(tick);
}
function stopPlay() {
  if (!playing) return; playing = false; cancelAnimationFrame(raf);
  playBtn.textContent = '▶'; playBtn.setAttribute('aria-pressed', 'false'); playBtn.setAttribute('aria-label', '播放 PV');
}
function tick(now) {
  if (!playing) return;
  const t = Math.min(TOTAL, tFrom + (now - t0) / 1000);
  scrollTo(0, tToP(t) / 6 * scrollMax());
  current = target = tToP(t); // 自动播放时不做惯性，让时刻与画面一致
  for (const [ct, fn] of CUES) if (ct > lastT && ct <= t) { try { fn(); } catch (e) { console.warn(e); } }
  lastT = t;
  if (t >= TOTAL) { stopPlay(); return; }
  raf = requestAnimationFrame(tick);
}
playBtn.addEventListener('click', () => (playing ? stopPlay() : startPlay()));
addEventListener('wheel', stopPlay, { passive: true });
addEventListener('touchstart', (e) => { if (!e.target.closest('button')) stopPlay(); }, { passive: true });
addEventListener('keydown', (e) => { if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ', 'Escape'].includes(e.key) && e.target === document.body) stopPlay(); });
$$('[data-jump]').forEach((b) => b.addEventListener('click', () => { stopPlay(); const i = +b.dataset.jump; scrollTo({ top: STOPS[i] / 6 * scrollMax(), behavior: reduced ? 'instant' : 'smooth' }); }));

// ---------------------------------------------------------------- 绘制
let current = 0, target = 0, drawRaf = 0;
function position() { target = clamp(scrollY / scrollMax()) * 6; if (!drawRaf) drawRaf = requestAnimationFrame(draw); }
function draw() {
  drawRaf = 0;
  current = reduced || playing ? target : lerp(current, target, .14);
  if (Math.abs(current - target) < .001) current = target;
  const p = current, w = innerWidth, h = stage.clientHeight;
  const n = segOf(p); if (n !== seg) enterSeg(n);
  const k = keyAt(reduced ? STOPS[n - 1] : p);
  $('#cam').style.transform = `translate3d(${k.cx}%,${k.cy}%,0) scale(${k.cs})`;
  // 原画透明度窗
  $('#pl-boot').style.opacity = win(p, .28, .95, .12);
  $('#pl-lab').style.opacity = win(p, .92, 3.32, .14);
  $('#pl-lab').style.setProperty('--dots', (.3 + .25 * sm((p - 2.3) / .3)).toFixed(3));
  $('#pl-local').style.opacity = sm((p - 5.26) / .14);
  const pg = $('#pl-game'), pt = $('#pl-talk');
  pg.style.opacity = (picked ? 1 : 0) * win(p, 3.3, 4.62, .1); pg.style.transform = `scale(${k.gs})`;
  pt.style.opacity = win(p, 4.6, 5.26, .1); pt.style.transform = `scale(${k.gs})`;
  // Logo 开场：齿轮转半圈
  const bl = $('#boot-logo'); bl.style.opacity = 1 - sm((p - .24) / .1); bl.style.visibility = p > .36 ? 'hidden' : 'visible';
  $$('.lg-gear', bl).forEach((g, i) => { g.style.transform = `rotate(${(i ? -1 : 1) * 180 * sm(p / .26)}deg)`; });
  // 人物
  const ah = h, aw = ah * .75;
  actor.style.transform = `translate3d(${k.ax * w - aw / 2}px,${(k.ay - 1) * h}px,0) scale(${k.as})`;
  actor.style.opacity = k.ao * (1 - sm((p - 5.74) / .08));
  herEl.style.setProperty('--hx', `${clamp(k.ax * 100 - (n === 6 ? 0 : 8), 22, 78)}%`);
  youEl.style.setProperty('--hx', `${clamp(k.ax * 100 - 8, 22, 78)}%`);
  // 前层 IBM 5100
  const fg = $('#fg-ibm'), fo = sm((p - 5.3) / .14);
  fg.style.opacity = fo * (1 - sm((p - 5.74) / .08));
  fg.style.transform = `translate3d(${w * .03}px,${(1 - fo) * 8}vh,0) scale(${lerp(1.25, 1, sm((p - 5.3) / .4))})`;
  // 段落文案
  const SW = [[.4, .95], [1.15, 2.25], [2.42, 3.26], [3.4, 4.56], [4.66, 5.26], [5.42, 5.74]];
  $$('.seg').forEach((s, i) => { const o = win(p, SW[i][0], SW[i][1], .08); s.style.opacity = o; s.classList.toggle('shown', o > .5); });
  const cur = $(`.seg.s${n}`); if (!playing && cur && +cur.style.opacity < .2 && n !== 6) { hush(); you(''); if (n !== 5) game(''); }
  // 结尾黑场
  const eo = sm((p - 5.74) / .07), en = $('#ending'); en.style.opacity = eo; en.classList.toggle('on', eo > .6);
  $('#lines').classList.toggle('end', eo > .5); if (eo > .5) herEl.style.setProperty('--hx', '50%');
  $$('.lg-gear', $('#end-logo')).forEach((g, i) => { g.style.transform = `rotate(${(i ? -1 : 1) * 180 * sm((p - 5.82) / .14)}deg)`; });
  if (eo > .9 && !playing) { endLine(); $('#replay').classList.add('on'); }
  if (eo < .3 && endSaid && !playing) { endSaid = false; $('#replay').classList.remove('on'); hush(); }
  $('#head').style.width = `${p / 6 * 100}%`;
  stage.dataset.p = p.toFixed(3);
  if (current !== target) drawRaf = requestAnimationFrame(draw);
}

// ---------------------------------------------------------------- 启动
let loaded = false;
const reveal = () => { if (loaded) return; loaded = true; body.dataset.loaded = ''; };
emote.addEventListener('ready', () => { $('#fallback').hidden = true; body.dataset.model = 'ready'; ex(seg === 4 || seg === 5 ? '困る03' : '普通'); reveal(); });
emote.addEventListener('error', () => { $('#fallback').hidden = false; $('#emote-canvas').hidden = true; body.dataset.model = 'error'; reveal(); });
setTimeout(reveal, 12000); // 模型慢也不一直挡着页面
emote.setActive(true); emote.start();
addEventListener('scroll', position, { passive: true }); addEventListener('resize', position);
document.addEventListener('visibilitychange', () => { if (document.hidden) { stopPlay(); resetAll(); } });
addEventListener('pagehide', () => { stopPlay(); resetAll(); emote.dispose(); });
if (import.meta.hot) import.meta.hot.dispose(() => { stopPlay(); resetAll(); emote.dispose(); });
window.__pv = { tToP, pToT, get p() { return current; }, get seg() { return seg; }, get playing() { return playing; }, emote, startPlay, stopPlay };
enterSeg(1); position();
