/**
 * 「记忆」一段，四种 UI 语言对照（card / nixie / phone / lab）。切换：右上 A–D 或 ?ui=。
 * 参考 Reverse:1999 官网的四点：统一的手作 UI、角色入场→待机、换话 450ms 交接、三态光标。
 * 台词与 pv.html 第 3 段一致；表情为手工编排。
 */
import '../fonts.css';
import './pv-ui.css';
import { EmoteStage } from '../emote-stage.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const BASE = import.meta.env.BASE_URL;
const body = document.body, actor = $('#actor');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const UIS = ['card', 'nixie', 'phone', 'lab'];
const HAND = 450; // 旧的退场 → 新的入场

// ---------------------------------------------------------------- E-mote
const emote = new EmoteStage({ canvas: $('#emote-canvas'), base: BASE, resolution: Math.min(devicePixelRatio, 1.5), minLogoMs: 0 });
const ready = () => emote.state === 'ready';
const ex = (n) => ready() && emote.setExpression('表情_' + n);
const mo = (n) => ready() && emote.motion?.(n);
let timers = [], lastAct = 0;
const later = (ms, fn) => timers.push(setTimeout(fn, ms));
const clear = () => { timers.forEach(clearTimeout); timers = []; };

// ---------------------------------------------------------------- 台词（与 pv.html 第 3 段相同）
const ASK = '还记得我上次说的吗？';
const LINES = {
  mem0: { her: '当然。你说考试周要熬夜——所以今天睡够了没有？', ex: [[0, 'ニヤニヤ'], [1600, '困る01']], mo: 'tilt' },
  local: { her: '记得。放在你这台电脑里，哪儿也没去。', ex: [[0, '普通'], [1200, '楽しい00']], mo: 'nod' },
  off: { her: '这次我不记。不过现在这一段，我还是会认真听。', ex: [[0, '困る00'], [1500, '普通']], mo: 'away' },
  eject: { her: '……记忆那边好像断线了。没关系，先接着聊。', ex: [[0, '驚き00'], [1200, '普通']], mo: 'lean' },
  story: { her: '那是剧情，不是你的经历。别想让我记混。', ex: [[0, 'むっとする']], mo: 'cross' },
};
const NIXIE = { idle: '-.---', mem0: '1.048', local: '0.571', off: '0.000', eject: '-.---' };

// ---------------------------------------------------------------- 换话：旧的退场，450ms 后新的入场
function say(key, { ask = true } = {}) {
  clear(); lastAct = Date.now();
  const L = LINES[key], box = $(`[data-v="${body.dataset.ui}"] [data-say]`);
  box.classList.remove('in'); box.classList.add('out'); ex('普通');
  later(HAND, () => {
    box.classList.remove('out', 'phone-her');
    $('.you', box).textContent = ask ? ASK : ''; $('.her', box).textContent = '';
    box.classList.toggle('has-you', ask);
    void box.offsetWidth; box.classList.add('in');
    const herDelay = body.dataset.ui === 'phone' ? (ask ? 1100 : 300) : (ask ? 700 : 0);
    if (body.dataset.ui === 'phone' && ask) { $('#sending').classList.add('on'); later(900, () => $('#sending').classList.remove('on')); }
    later(herDelay, () => {
      $('.her', box).textContent = L.her; box.classList.add('phone-her');
      mo(L.mo); for (const [ms, e] of L.ex) later(ms, () => ex(e));
    });
  });
}

// ---------------------------------------------------------------- 状态
function setMem(m) {
  body.dataset.mem = m; delete body.dataset.eject; body.dataset.drawer = m === 'off' ? '' : 'us';
  $$('[data-mem]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mem === m)));
  nixie(m); say(m);
}
function eject() {
  body.dataset.eject = '1'; body.dataset.drawer = '';
  $$('[data-mem]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  nixieFlicker(); say('eject', { ask: false });
}
function drawer(d) {
  body.dataset.drawer = body.dataset.drawer === d ? '' : d;
  if (d === 'story') say('story', { ask: false });
}
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-mem],[data-eject],[data-drawer],.switch [data-ui]');
  if (!t) return;
  if (t.matches('.switch [data-ui]')) return setUI(t.dataset.ui, true);
  if (t.dataset.mem) return setMem(t.dataset.mem);
  if (t.hasAttribute('data-eject')) return eject();
  if (t.dataset.drawer) return drawer(t.dataset.drawer);
});

// ---------------------------------------------------------------- 辉光管
const tubes = $$('#tubes .tube b');
function nixie(key) { const s = NIXIE[key] || NIXIE.idle; tubes.forEach((b, i) => { b.textContent = s[i] === '-' ? '' : s[i]; b.parentElement.classList.toggle('lit', s[i] !== '-'); }); }
function nixieFlicker() {
  let n = 0; const id = setInterval(() => { tubes.forEach((b, i) => { if (i !== 2) b.textContent = String((Math.random() * 10) | 0); b.parentElement.classList.add('lit'); }); if (++n > 9) { clearInterval(id); nixie('eject'); } }, 70);
}
nixie('idle');

// ---------------------------------------------------------------- 切换 UI：旧角色左出，450ms 后右入
function setUI(v, animate) {
  if (!UIS.includes(v)) v = 'card';
  clear(); $$('[data-say]').forEach((b) => { b.classList.remove('in', 'out', 'has-you', 'phone-her'); $$('span', b).forEach((s) => (s.textContent = '')); });
  $$('.switch [data-ui]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ui === v)));
  const url = new URL(location.href); url.searchParams.set('ui', v); history.replaceState(null, '', url);
  const go = () => {
    body.dataset.ui = v; delete body.dataset.mem; delete body.dataset.eject; body.dataset.drawer = '';
    $$('[data-mem]').forEach((b) => b.setAttribute('aria-pressed', 'false')); nixie('idle');
    enter();
  };
  if (!animate || reduced) return go();
  actor.className = 'actor exit'; later(HAND, go);
}
function enter() {
  actor.className = 'actor'; void actor.offsetWidth; actor.className = 'actor enter';
  ex('驚き00'); mo('lean');
  later(700, () => ex('普通'));
  later(1400, () => { actor.className = 'actor idle'; });
}
// 待机：偶尔换个小动作
setInterval(() => { if (!document.hidden && actor.classList.contains('idle') && Date.now() - lastAct > 6000) mo(Math.random() < .5 ? 'sway' : 'tilt'); }, 7000);

// ---------------------------------------------------------------- 三态光标：点 / 可点（放大 + 小标签）/ 图像（放大镜）
const cur = $('#cur'), lens = $('#lens'), tip = $('#tip');
const fine = matchMedia('(pointer: fine)').matches;
if (fine && !reduced) {
  body.classList.add('own-cursor');
  let x = -99, y = -99, cx = x, cy = y;
  addEventListener('pointermove', (e) => {
    x = e.clientX; y = e.clientY;
    const el = document.elementFromPoint(x, y);
    const img = el?.closest('img[data-lens]');
    const clk = el?.closest('[data-tip],button');
    const dom = !clk && !img && el?.closest('[data-lens-dom]');
    cur.dataset.state = img || dom ? 'big' : clk ? 'mid' : 'small';
    tip.textContent = clk ? clk.dataset.tip || '観測' : '';
    if (img) {
      const r = img.getBoundingClientRect(), Z = 2.2, R = 70;
      lens.style.backgroundImage = `url("${img.currentSrc || img.src}")`;
      lens.style.backgroundSize = `${r.width * Z}px ${r.height * Z}px`;
      lens.style.backgroundPosition = `${-(x - r.left) * Z + R}px ${-(y - r.top) * Z + R}px`;
    } else lens.style.backgroundImage = 'none';
  }, { passive: true });
  addEventListener('pointerdown', () => cur.classList.add('press')); addEventListener('pointerup', () => cur.classList.remove('press'));
  document.addEventListener('pointerleave', () => { cur.dataset.state = 'off'; });
  (function loop() { cx += (x - cx) * .35; cy += (y - cy) * .35; cur.style.transform = `translate3d(${cx}px,${cy}px,0)`; requestAnimationFrame(loop); })();
}

// ---------------------------------------------------------------- 启动
emote.addEventListener('ready', () => { $('#fallback').hidden = true; body.dataset.model = 'ready'; enter(); });
emote.addEventListener('error', () => { $('#fallback').hidden = false; $('#emote-canvas').hidden = true; body.dataset.model = 'error'; });
emote.setActive(true); emote.start();
setUI(new URLSearchParams(location.search).get('ui'), false);
addEventListener('pagehide', () => { clear(); emote.dispose(); });
if (import.meta.hot) import.meta.hot.dispose(() => { clear(); emote.dispose(); });
window.__ui = { setUI, setMem, eject, emote, get timers() { return timers.length; } };
