// 04 观测：移植 Amadeus 前端「观测小窗」样稿（amadeus-resonance-frontend · screens/PlayFlow.jsx + styles/play.css，只读参考）
// 桌面示意 = 游戏窗口 + 陪伴小窗。无后端：所有台词、状态都是脚本。小窗里的她是静态替身（前端样稿同样如此，正式为 E-mote）。
import './observe.css';
import { GAME } from './content.js';

const BASE = import.meta.env.BASE_URL;
const PRESET = { large: { w: 26.25, h: 75.5 }, mid: { w: 24, h: 46 }, strip: { w: 30, h: 16 } };
// 小窗台词：前端样稿原文（MINI_LINES / MINI_REPLY / 暂停与中断说明）
const MINI_LINES = ['……「大桧山大楼」原来是这么走的。嗯，我记下了。', '这段路线写得很具体——作者大概真的走过那条街。你觉得是在给后面埋伏笔吗？', '别急着点。先看完这句——冈部的表情不太对。（……哼，我才没有紧张。）'];
const MINI_REPLY = '……你也注意到了？这个伏笔埋得很深。先别告诉我答案。';
export const MODES = [
  ['auto', '自动演示', '看一段剧情：她偶尔说一句，出现选项时小窗自动缩成字幕条让开'],
  ['large', '小窗 · 大', '房间里的她 + 她的话 + 一行插话'],
  ['mid', '小窗 · 中', '人物变小，台词为主'],
  ['strip', '小窗 · 字幕条', '左边小头像，右边她的话'],
  ['ask', '插话', '在小窗里打一句，她接着你的话说'],
  ['paused', '暂停', '她不看画面，但仍然可以聊天'],
  ['tucked', '收起', '缩成胶囊，她开口时弹出字幕气泡'],
  ['over', '叠在全屏游戏上', '无边框全屏时，小窗叠在画面上并避开台词框'],
];
const $ = (s, r = document) => r.querySelector(s);
const ICO = {
  mic: '<rect x="6" y="2" width="4" height="8" rx="2"/><path d="M3.5 7.5a4.5 4.5 0 0 0 9 0M8 12v2.5"/>',
  voice: '<path d="M2.5 6h2.5l3.5-3v10l-3.5-3h-2.5z"/><path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.8a6 6 0 0 1 0 8.4"/>',
  pause: '<path d="M5.5 3.5v9M10.5 3.5v9"/>', play: '<path d="M5 3.2v9.6l7.5-4.8z"/>', tuck: '<path d="M3.5 8h9"/>',
  more: '<circle cx="3.5" cy="8" r="1.1"/><circle cx="8" cy="8" r="1.1"/><circle cx="12.5" cy="8" r="1.1"/>',
};
const ico = (k) => `<svg viewBox="0 0 16 16" aria-hidden="true">${ICO[k]}</svg>`;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

let root, mw, pd, tok = 0, timers = [], mode = 'auto', t0 = Date.now(), clock = 0;
const later = (ms, fn) => { const my = tok; timers.push(setTimeout(() => { if (my === tok) fn(); }, ms)); };
const wait = (ms) => { const my = tok; return new Promise((res, rej) => timers.push(setTimeout(() => (my === tok ? res() : rej(new Error('stop'))), ms))); };
function reset() { tok++; timers.forEach(clearTimeout); timers = []; }

// 打字（括号嘀咕：小字淡色）
function typeLine(el, text, { speed = 48, voice = true } = {}) {
  const my = tok; el.innerHTML = '<p class="mw-line"></p>' + (voice ? '<p class="mw-voice"><b></b><b></b><b></b><b></b></p>' : '');
  const p = el.firstChild; let i = 0;
  const paint = (n) => { const s = text.slice(0, n); p.innerHTML = s.split(/(（[^）]*）?)/).map((x) => (x.startsWith('（') ? `<span class="mw-aside">${x}</span>` : x)).join('') + (n < text.length ? '<i class="caret"></i>' : ''); };
  if (reduced) { paint(text.length); return Promise.resolve(); }
  return new Promise((res) => { const step = () => { if (my !== tok) return res(); i++; paint(i); if (i >= text.length) res(); else timers.push(setTimeout(step, speed)); }; step(); });
}
const talk = () => $('.mw-talk', root);
function set(st) {   // st: {tier, layout, paused, tucked, fault, choice}
  const tier = st.choice ? 'strip' : st.tier || 'large', box = st.choice ? { w: 30, h: 14 } : PRESET[tier];
  pd.dataset.layout = st.layout || 'side'; pd.toggleAttribute('data-tucked', !!st.tucked);
  mw.dataset.tier = tier; mw.toggleAttribute('data-paused', !!st.paused);
  if (st.fault) mw.dataset.fault = 'gone'; else delete mw.dataset.fault;
  $('.pd-game', root).toggleAttribute('data-gone', !!st.fault);
  const over = st.layout === 'over';
  Object.assign(mw.style, { width: box.w + '%', height: box.h + '%', top: over ? (st.choice ? '3%' : '6%') : '12.2%', opacity: over ? .94 : 1 });
  const led = st.fault ? 'is-fault' : st.paused ? 'is-paused' : '';
  root.querySelectorAll('.mw-led').forEach((l) => { l.className = 'mw-led ' + led; });
  $('.mw-osd.is-l span', root).textContent = st.fault ? '画面中断' : st.paused ? '已暂停' : '观测中';
  $('.mw-pill span', root).textContent = st.paused ? '已暂停' : '观测中';
  $('.mw-input input', root).placeholder = '插一句……';
  $('.pd-note', root).textContent = over ? '示意：游戏无边框全屏，小窗叠在游戏画面上（避开台词框与选项区）'
    : st.choice ? '示意：游戏出现选项，小窗自动缩成字幕条让开' : '示意：屏幕上由你操作的游戏窗口；右侧是 Amadeus 的陪伴小窗，主窗口已收起';
}
function cap(who, t) { $('#gw-who').textContent = who || ''; $('#gw-t').textContent = t || ''; $('#gw-cap').classList.toggle('on', !!t); }
async function capType(who, t) { const el = $('#gw-t'); $('#gw-who').textContent = who; el.textContent = ''; $('#gw-cap').classList.add('on'); if (reduced) { el.textContent = t; return; } for (const ch of t) { el.textContent += ch; await wait(42); } }

// ---- 自动演示：剧情推进（游戏台词框）+ 她在小窗里偶尔说一句 + 选项时小窗让开
export async function obsPlay() {
  obsStop(); mode = 'auto'; markMode(); const my = tok;
  set({ tier: 'large' }); cap(); $('#gw-choice').hidden = true; talk().innerHTML = '<p class="mw-line is-quiet">……</p>';
  try {
    await wait(500);
    for (const l of GAME.lines) {
      await capType(l.who, l.t);
      const s = l.kurisu?.say;
      if (s) { await wait(l.kurisu.delay || 800); await typeLine(talk(), s); await wait(2600); } else await wait(1900);
    }
    const c = GAME.choice; cap(); $('#gw-q').textContent = c.q;
    $('#gw-opts').innerHTML = c.a.map((t, i) => `<button data-c="${i}">${t}</button>`).join('');
    $('#gw-choice').hidden = false; set({ tier: 'large', choice: true });
    root.querySelectorAll('#gw-opts button').forEach((b) => b.addEventListener('click', () => pick(+b.dataset.c, my)));
    await wait(700); await typeLine(talk(), c.hint[0]);
  } catch { /* 被切换模式打断 */ }
}
function pick(i, my) {
  if (my !== tok) return;
  root.querySelectorAll('#gw-opts button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.c === i)));
  later(500, () => { $('#gw-choice').hidden = true; set({ tier: 'large' }); typeLine(talk(), GAME.choice.react[i][0]); });
  window.__ab?.LOG?.push(['cw-pick', i, performance.now()]);
}
export function obsStop() { reset(); $('#gw-choice') && ($('#gw-choice').hidden = true); }

// ---- 静态模式：各展示一种小窗状态（台词取自前端样稿）
async function show(m) {
  obsStop(); mode = m; markMode();
  if (m === 'auto') return obsPlay();
  $('#gw-choice').hidden = true; cap('真由理', '刚才窗外有道光，好像以前也见过一样。');
  const bubble = $('.mw-bubble', root); bubble.hidden = true;
  if (m === 'large' || m === 'mid' || m === 'strip') { set({ tier: m }); await typeLine(talk(), MINI_LINES[m === 'mid' ? 1 : m === 'strip' ? 2 : 0], { voice: m !== 'large' }); }
  else if (m === 'ask') {
    set({ tier: 'large' }); const t = talk(); const inp = $('.mw-input input', root); inp.value = '';
    for (const ch of '这里是不是有伏笔？') { inp.value += ch; await wait(reduced ? 0 : 70).catch(() => {}); if (mode !== 'ask') { inp.value = ''; return; } }
    await wait(400).catch(() => {}); inp.value = ''; if (mode !== 'ask') return;
    t.innerHTML = '<p class="mw-you"><em>你</em>这里是不是有伏笔？</p><p class="mw-line"><span class="mw-dots"><i></i><i></i><i></i></span></p>';
    await wait(1400).catch(() => {}); if (mode !== 'ask') return;
    const box = document.createElement('div'); t.lastChild.replaceWith(box); await typeLine(box, MINI_REPLY);
  } else if (m === 'paused') { set({ tier: 'large', paused: true }); talk().innerHTML = '<p class="mw-line is-paused">观测已暂停。她现在不看游戏画面，但你仍然可以和她说话。<button type="button">继续观测</button></p>'; $('.mw-line.is-paused button', root).onclick = () => show('large'); }
  else if (m === 'tucked') { set({ tier: 'large', tucked: true }); await wait(900).catch(() => {}); if (mode !== 'tucked') return; bubble.hidden = false; await typeLine($('.mw-bubble-in', root), MINI_LINES[1]); }
  else if (m === 'over') { set({ tier: 'mid', layout: 'over' }); cap(); await typeLine(talk(), MINI_LINES[2]); }
  else if (m === 'fault') { set({ tier: 'large', fault: true }); cap();
    talk().innerHTML = `<div class="mw-fault"><p class="mw-line is-frozen">${MINI_LINES[0]}</p><p class="mw-fault-note"><svg class="fc-note-ico" viewBox="0 0 24 12" aria-hidden="true"><path d="M1 6h7M16 6h7M8 2v8M16 2v8M11 4h2M11 8h2"/></svg>游戏窗口关掉了，观测先停在这里。<span class="mw-fault-acts"><button type="button">换个窗口</button><button type="button" class="is-end">结束观测</button></span></p></div>`;
    root.querySelectorAll('.mw-fault-acts button').forEach((b) => { b.onclick = () => show('large'); }); }
}
function markMode() { root.querySelectorAll('.obs-modes button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.m === mode))); }

export function initObserve() {
  root = $('.s3'); if (!root) return; pd = $('.pd', root); mw = $('.mw', root);
  $('.obs-modes', root).innerHTML = MODES.map(([k, zh, d]) => `<li><button type="button" data-m="${k}" aria-pressed="${k === 'auto'}"><b>${zh}</b><small>${d}</small></button></li>`).join('');
  root.querySelectorAll('.obs-modes button').forEach((b) => b.addEventListener('click', () => show(b.dataset.m)));
  root.querySelectorAll('.mw-tools [data-i]').forEach((b) => { b.innerHTML = ico(b.dataset.i); });
  $('.mw-pill', root).addEventListener('click', () => show('large'));
  $('.mw-tools [data-i="tuck"]', root).addEventListener('click', () => show('tucked'));
  $('.mw-tools [data-i="pause"]', root).addEventListener('click', () => show(mw.hasAttribute('data-paused') ? 'large' : 'paused'));
  $('.mw-input', root).addEventListener('submit', (e) => { e.preventDefault(); show('ask'); });
  // 等比缩放：按 1120×700 的“屏幕”排版（与前端样稿同一套 cqw 比例），整体缩放进版面
  const fit = () => { const box = $('.obs-fit', root); root.style.setProperty('--k', box.clientWidth / 1120); };
  addEventListener('resize', fit); fit();
  clearInterval(clock); clock = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000), p = (n) => String(n).padStart(2, '0'); const t = `00:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`; root.querySelectorAll('.mw-time').forEach((e) => { e.textContent = t; }); }, 1000);
  set({ tier: 'large' });
}
export const obsMode = () => mode;
