/**
 * Amadeus-Resonance · 融合概念稿入口（fusion.html）
 * 结构借 moontide（分界、每屏一句大标题、编号章节、侧边进度）；性格是命运石之门：冷静、观测、略带忧郁。
 * 复用 src/emote-stage.js：同一个 E-mote 画布按章节移到“分界线”上，并换机位。
 */
import './fonts.css';
import './fusion.css';
import { EmoteStage } from './emote-stage.js';

const BASE = import.meta.env.BASE_URL;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const body = document.body;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pad2 = (n) => String(n).padStart(2, '0');
const hms = () => { const d = new Date(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`; };
const GEARX = '<svg viewBox="-10 -10 20 20" aria-hidden="true"><path d="M-2-10h4v6.2l4.4-4.4 2.8 2.8L4.8-1H10v4H4.8l4.4 4.4-2.8 2.8L2 5.8V10h-4V5.8l-4.4 4.4-2.8-2.8L-4.8 3H-10v-4h5.2l-4.4-4.4 2.8-2.8L-2-4.2z"/></svg>';

const EX = {
  calm: '表情_普通', smug: '表情_ニヤニヤ', shy: '表情_照れる', surprise: '表情_驚き00', smile: '表情_笑う',
  pout: '表情_むっとする', worry: '表情_困る03', glare: '表情_睨む', glareHard: '表情_睨む（強）', sad: '表情_哀しい01',
};

/* ------------------------------------------------------------ 八个主题（概念稿只实现 01 与 04） */
const SECTIONS = [
  { key: 'hero', no: '01', zh: '序', en: 'PROLOGUE' },
  { key: null, no: '02', zh: '定位', en: 'WHO' },
  { key: null, no: '03', zh: '模式', en: 'MODES' },
  { key: 'mem', no: '04', zh: '记忆', en: 'MEMORY' },
  { key: null, no: '05', zh: '表演', en: 'PERFORM' },
  { key: null, no: '06', zh: '本地', en: 'LOCAL' },
  { key: null, no: '07', zh: '路线', en: 'ROADMAP' },
  { key: null, no: '08', zh: '终', en: 'EPILOGUE' },
];
// 机位：hero 全身站在线上；mem 推近到半身，像在终端里说话
const CAM = { hero: { zoom: 1.0, dy: 0 }, mem: { zoom: 1.62, dy: 150 }, rest: { zoom: 1.0, dy: 0 } };
const RAILBG = { hero: 'ink', mem: 'paper', rest: 'paper' };   // 右侧导航所在的底色

/* ------------------------------------------------------------ 世界线 */
const WORLD = {
  a: { read: '1.048596', model: 'ab', name: 'kurisu_ab · 外套' },
  b: { read: '0.571024', model: 'alt', name: 'kurisu_ab_labcoat · 白大褂' },
};
let world = new URLSearchParams(location.search).get('wl') === 'b' ? 'b' : 'a';
function applyWorld() {
  body.dataset.world = world;
  $('#wl-read').textContent = WORLD[world].read;
  $('#nixie').innerHTML = WORLD[world].read.replace(/(\d)$/, '<span class="fl">$1</span>');
  $('#kv-model').textContent = WORLD[world].name;
  // B：终端一侧占主导 —— 首屏的终端扫描线改盖在左侧
  placeEdges();
}

/* ------------------------------------------------------------ 导航 / 侧栏 / 跑马灯 */
const tabs = $('#tabs'), rail = $('#rail');
SECTIONS.forEach((s, i) => {
  if (i) tabs.insertAdjacentHTML('beforeend', `<i class="tsep" aria-hidden="true">${GEARX}</i>`);
  const off = !s.key;
  tabs.insertAdjacentHTML('beforeend', `<button class="tab" type="button" data-go="${s.key || ''}" ${off ? 'aria-disabled="true" title="概念稿未实现"' : ''}><small>${s.no}</small><span>${s.zh}</span></button>`);
  rail.insertAdjacentHTML('beforeend', `<button class="rail-t" type="button" data-go="${s.key || ''}" ${off ? 'aria-disabled="true"' : ''} aria-label="${s.no} ${s.zh}"><span>${s.no} ${s.en}</span><i></i></button>`);
});
const TICK = ['AMADEUS-RESONANCE', '本地优先', '单用户', '日常陪伴', 'VN 陪玩', '长期记忆', '知识边界', '开发中', 'EL PSY KONGROO'];
const tkHtml = TICK.map((t) => `<span>${/^[A-Z -]+$/.test(t) ? `<em>${t}</em>` : t}${GEARX}</span>`).join('');
$('#tk').innerHTML = tkHtml + tkHtml;
$('.hero .ts').textContent = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
setInterval(() => { $('#clock').textContent = hms(); }, 1000);
$('#clock').textContent = hms();

/* ------------------------------------------------------------ 齿轮线稿（纸面） */
function gearPath(n, ro, ri) {
  const pts = [], step = (Math.PI * 2) / n;
  for (let i = 0; i < n; i++) {
    const a = i * step;
    [[a - step * 0.25, ri], [a - step * 0.16, ro], [a + step * 0.16, ro], [a + step * 0.25, ri]].forEach(([t, r]) => pts.push(`${(Math.cos(t) * r).toFixed(1)},${(Math.sin(t) * r).toFixed(1)}`));
  }
  return 'M' + pts.join('L') + 'Z';
}
function gearSvg({ x, y, size, n, gs, rev, label }) {
  const R = 100, ri = R * 0.86, hub = R * 0.22;
  const spokes = Array.from({ length: 6 }, (_, i) => { const a = (i * Math.PI) / 3; return `M${(Math.cos(a) * hub).toFixed(1)},${(Math.sin(a) * hub).toFixed(1)}L${(Math.cos(a) * ri * 0.72).toFixed(1)},${(Math.sin(a) * ri * 0.72).toFixed(1)}`; }).join('');
  return `<svg style="left:${x};top:${y};width:${size};height:${size}" viewBox="-130 -130 260 260">
    <g class="rot ${rev ? 'rev' : ''}" style="--gs:${gs}s"><path d="${gearPath(n, R, ri)}"/><circle r="${(ri * 0.72).toFixed(1)}"/><circle r="${hub}"/><circle r="6"/><path d="${spokes}"/></g>
    <circle class="dim" r="122"/><path class="dim" d="M-128 0H128M0-128V128"/>${label ? `<text x="-122" y="-112">${label}</text>` : ''}</svg>`;
}
const GEARS = {
  a: [{ x: '-6%', y: '52%', size: '34vw', n: 24, gs: 160, label: 'FIG.1 · PHASE GEAR' }, { x: '22%', y: '74%', size: '17vw', n: 14, gs: 90, rev: true }, { x: '36%', y: '8%', size: '12vw', n: 10, gs: 70, label: 'Ø 42' }],
  b: [{ x: '70%', y: '58%', size: '30vw', n: 22, gs: 150, label: 'FIG.4 · RECALL' }, { x: '86%', y: '-6%', size: '16vw', n: 12, gs: 80, rev: true }],
};
$$('[data-gears]').forEach((el) => { el.innerHTML = GEARS[el.dataset.gears].map(gearSvg).join(''); });

/* ------------------------------------------------------------ 分界线：读取每屏的 --s1/--s2，画线 + 刻度 + 标注 */
function placeEdges() {
  $$('.sec').forEach((sec) => {
    const svg = $('.edge', sec); if (!svg) return;
    const cs = getComputedStyle(sec);
    const s1 = parseFloat(cs.getPropertyValue('--s1')), s2 = parseFloat(cs.getPropertyValue('--s2'));
    let ticks = '';
    for (let k = 1; k < 20; k++) { const u = k / 20, x = s1 + (s2 - s1) * u, len = k % 5 ? 0.35 : 0.8; ticks += `<line class="tick" x1="${x}" y1="${u * 100}" x2="${x + len}" y2="${u * 100}"/>`; }
    svg.innerHTML = `<line x1="${s1}" y1="0" x2="${s2}" y2="100"/>${ticks}`;
    // 线两侧的小标注：PERSON | AMADEUS
    $$('.edge-tag', sec).forEach((t) => t.remove());
    const paperLeft = $('.side-l', sec)?.dataset.on === 'paper';
    const y = 0.3, x = s1 + (s2 - s1) * y;
    sec.insertAdjacentHTML('beforeend', `<span class="edge-tag" style="left:calc(${x}% - 12px);top:${y * 100}%;transform:translateX(-100%)">${paperLeft ? 'PERSON' : 'AMADEUS'}</span><span class="edge-tag" style="left:calc(${x}% + 12px);top:${y * 100}%">${paperLeft ? 'AMADEUS' : 'PERSON'}</span>`);
  });
}

/* ------------------------------------------------------------ 模型 */
const canvas = $('#emote-canvas');
const kurisu = $('#kurisu');
const emote = new EmoteStage({ canvas, base: BASE, resolution: devicePixelRatio >= 2 ? 1.5 : 1.25, minLogoMs: 600 });
emote.alias = WORLD[world].model;
emote.setView(CAM.hero, 1);
emote.addEventListener('progress', (e) => { $('#kv-state').textContent = `LOAD ${Math.round(e.detail.progress * 100)}%`; });
emote.addEventListener('ready', () => {
  body.dataset.model = 'ready'; $('#kv-state').textContent = 'READY';
  setTimeout(() => { if (cur === 'hero') { emote.setExpression(EX.calm); say('……终于连上了。你就是新的操作员？'); } }, 600);
});
emote.addEventListener('error', () => { body.dataset.model = 'error'; $('#kv-state').textContent = 'OFFLINE'; $('#k-fallback').hidden = false; });
emote.addEventListener('expression', (e) => { $('#kv-expr').textContent = e.detail.timeline; });
emote.setActive(true);
emote.start();

// fps
let lastF = 0;
setInterval(() => { const f = emote.stats.frames - lastF; lastF = emote.stats.frames; $('#kv-fps').textContent = `${emote.rendering ? f : 0} fps`; }, 1000);

// 视线：默认跟随指针；点击某个元素时，看向那个元素一会儿
let gazeHold = 0, gRaf = 0, gx = 0, gy = 0;
function gazeTo(cx, cy) {
  const r = kurisu.getBoundingClientRect();
  gx = Math.max(-1, Math.min(1, (cx - (r.left + r.width / 2)) / (innerWidth * 0.42)));
  gy = Math.max(-1, Math.min(1, (cy - (r.top + r.height * 0.2)) / (innerHeight * 0.55)));
  if (!gRaf) gRaf = requestAnimationFrame(() => {
    gRaf = 0;
    if (emote.state === 'ready') emote.lookAt(gx, gy, 260);
    $('#kv-gaze').textContent = `${gx >= 0 ? '+' : ''}${gx.toFixed(2)} / ${gy >= 0 ? '+' : ''}${gy.toFixed(2)}`;
  });
}
addEventListener('pointermove', (e) => { if (performance.now() > gazeHold) gazeTo(e.clientX, e.clientY); }, { passive: true });
function lookAtEl(el, ms = 1800) {
  const r = el.getBoundingClientRect();
  gazeTo(r.left + r.width / 2, r.top + r.height / 2);
  gazeHold = performance.now() + ms;
}

// 她的话：逐字出现
let sayT = 0, sayHide = 0;
function say(text, hold = 4200) {
  const box = $('#say'), t = $('#say-t');
  clearInterval(sayT); clearTimeout(sayHide);
  box.classList.add('on'); box.classList.remove('done');
  if (reduce) { t.textContent = text; box.classList.add('done'); } else {
    let n = 0; t.textContent = '';
    sayT = setInterval(() => { t.textContent = text.slice(0, ++n); if (n >= text.length) { clearInterval(sayT); box.classList.add('done'); } }, 55);
  }
  sayHide = setTimeout(() => box.classList.remove('on'), hold + text.length * 55);
}

// 点她
const POKE = [
  { ex: 'pout', mo: 'cross', line: '先说清楚：我可不是你的助手。' },
  { ex: 'shy', mo: 'away', line: '……别一直盯着看。' },
  { ex: 'smug', mo: 'tilt', line: '哼，被我说中了吧？' },
  { ex: 'surprise', mo: 'lean', line: '欸？刚才那是什么？' },
];
let pokeI = 0;
$('#k-hit').addEventListener('click', () => {
  if (emote.state !== 'ready') return;
  const p = POKE[pokeI++ % POKE.length];
  emote.setExpression(EX[p.ex]); emote.motion(p.mo); say(p.line);
});

/* ------------------------------------------------------------ 记忆屏 */
const mlog = $('#mlog');
function mline(op, k, v, hot = false) {
  const li = document.createElement('li');
  li.className = `op-${op.toLowerCase()}${hot ? ' hot' : ''}`;
  li.innerHTML = `<span class="t">${hms()}</span><b>${op}</b><span class="k">${k}</span><span class="v">${v}</span>`;
  mlog.append(li);
  while (mlog.children.length > 7) mlog.firstChild.remove();
}
// 示例记录：按产品真实规则编写（用户记忆与 VN 状态分开；原始截图 / 完整文本默认不留存）
const WRITES = [
  ['WRITE', 'user.pref', '「咖啡不加糖」 ← 对话 · 已确认'],
  ['WRITE', 'user.event', '「周五有组会」 ← 对话 · 已确认'],
  ['SKIP', 'screen.raw', '原始截图 · 默认不留存'],
  ['WRITE', 'vn.state', '第 3 章 · 已读 → VN 状态（与用户记忆分开）'],
  ['SKIP', 'vn.ocr', '完整文本 · 默认不留存'],
  ['HOLD', 'user.guess', '「好像不喜欢下雨」 · 未确认，不写入'],
  ['WRITE', 'user.topic', '「最近在读相对论」 ← 对话 · 已确认'],
];
let wI = 0, wTimer = 0;
const autoWrite = () => { const [op, k, v] = WRITES[wI++ % WRITES.length]; mline(op, k, v); };
const TIERS = [
  { key: 'tier.0 personal', rule: 'T0 / PERSONAL — 她自己的经历、你们在对话里确认过的事。可以直接说，不用查。', line: '这个我记得。你说过，咖啡不加糖。', ex: 'smile', mo: 'nod', img: 'img/bg-outro.webp', cap: 'T0 · 记录 · 天台' },
  { key: 'tier.1 observe', rule: 'T1 / OBSERVE — 只来自你选定的窗口。画面里有什么，她才说“我看到”。', line: '我看到的是……先别急着下结论。', ex: 'calm', mo: 'lean', img: 'img/bg-what.webp', cap: 'T1 · 观测帧 · 选定窗口', focus: true },
  { key: 'tier.2 deja-vu', rule: 'T2 / DEJA-VU — 别的世界线只剩碎片。只能说“好像”“有点眼熟”，不当成事实。', line: '奇怪……这一幕，好像在哪见过。', ex: 'worry', mo: 'tilt', img: 'img/bg-hero.webp', cap: 'T2 · 碎片 · 来源不明', flick: true },
  { key: 'tier.3 forbidden', rule: 'T3 / FORBIDDEN — 未解锁的剧情、作品外资料、Re:Boot 新内容。她不知道，也不剧透。', line: '结局？我怎么可能知道。', ex: 'glareHard', mo: 'cross', redact: true, cap: 'T3 · 禁区' },
];
let tierCur = -1, ruleT = 0;
function typeRule(text) {
  const el = $('#rule'); clearInterval(ruleT);
  if (reduce) { el.textContent = text; return; }
  let n = 0; el.textContent = '';
  ruleT = setInterval(() => { el.textContent = text.slice(0, ++n); if (n >= text.length) clearInterval(ruleT); }, 22);
}
function readTier(i) {
  const t = TIERS[i]; tierCur = i;
  if (cur !== 'mem') goTo('mem');
  $$('#tiers li').forEach((li) => { const on = Number(li.dataset.t) === i; li.classList.toggle('on', on); li.setAttribute('aria-selected', on); });
  mline(i === 3 ? 'DENY' : 'READ', t.key, i === 3 ? '拒绝读取' : '读取完成', true);
  typeRule(t.rule);
  const obs = $('#obs');
  obs.classList.remove('on', 'redacted', 'flick', 'focusing');
  if (t.img) $('#obs-img').src = BASE + t.img;
  $('#obs-cap').textContent = t.cap;
  void obs.offsetWidth;
  obs.classList.add('on');
  if (t.redact) obs.classList.add('redacted');
  if (t.flick) obs.classList.add('flick');
  if (t.focus) { obs.classList.add('focusing'); setTimeout(() => obs.classList.remove('focusing'), 60); }
  // 她看向被点的那一层，再回应
  lookAtEl($(`#tiers li[data-t="${i}"]`), 1400);
  if (emote.state === 'ready') { emote.setExpression(EX[t.ex]); setTimeout(() => emote.motion(t.mo), 300); }
  say(t.line, 3600);
  clearInterval(wTimer); wTimer = setInterval(autoWrite, 3000);
}
$$('#tiers li').forEach((li) => {
  const i = Number(li.dataset.t);
  li.addEventListener('click', () => readTier(i));
  li.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); readTier(i); }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); $$('#tiers li')[(i + (e.key === 'ArrowDown' ? 1 : 3)) % 4].focus(); }
  });
});

/* ------------------------------------------------------------ 章节切换：人物移到该章的分界线上，换机位 */
let cur = null;
function setSection(key) {
  if (key === cur) return;
  cur = key;
  body.dataset.sec = key;
  body.dataset.railbg = RAILBG[key] || 'ink';
  const s = SECTIONS.find((x) => x.key === key);
  $('#act-no').textContent = s ? s.no : '—';
  $$('.tab').forEach((b) => b.setAttribute('aria-current', b.dataset.go === key ? 'true' : 'false'));
  $$('.rail-t').forEach((b) => b.setAttribute('aria-current', b.dataset.go === key ? 'true' : 'false'));
  const slot = $(`#${key} .slot`);
  if (slot) {
    slot.append(kurisu); kurisu.hidden = false;
    emote.setActive(true);
    emote.setView(CAM[key], reduce ? 1 : 1200);
  } else {
    kurisu.hidden = true; emote.setActive(false);
  }
  clearInterval(wTimer);
  if (key === 'mem') {
    if (!mlog.children.length) { autoWrite(); autoWrite(); autoWrite(); }
    wTimer = setInterval(autoWrite, 3000);
    if (emote.state === 'ready') { emote.setExpression(EX.calm); }
  } else if (key === 'hero' && emote.state === 'ready') emote.setExpression(EX.calm);
}
function goTo(key) {
  const el = document.getElementById(key);
  if (!el) return;
  scrollTo({ top: el.offsetTop, behavior: reduce ? 'auto' : 'smooth' });
  setSection(key);
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-go]');
  if (!b || b.getAttribute('aria-disabled') === 'true' || !b.dataset.go) return;
  e.preventDefault(); goTo(b.dataset.go);
});
const io = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) setSection(e.target.dataset.sec); }), { threshold: 0.6 });
$$('.sec').forEach((s) => io.observe(s));

/* ------------------------------------------------------------ 世界线变动（D 键）：扫描 + 读数逐位跳变 */
let shifting = false;
async function shiftWorld() {
  if (shifting || emote.state !== 'ready') return;
  shifting = true;
  const to = world === 'a' ? 'b' : 'a';
  const ov = $('#shift'), n = $('#shift-n');
  n.textContent = WORLD[world].read; ov.classList.add('on');
  let k = 0; const target = WORLD[to].read;
  const jt = setInterval(() => {
    n.textContent = Array.from(target, (c, i) => (c === '.' ? '.' : (i < k / 4 ? c : String(Math.floor(Math.random() * 10))))).join(''); k++;
  }, 45);
  let ok = true;
  try { ok = await emote.swap(WORLD[to].model); } catch (e) { ok = false; }
  await new Promise((r) => setTimeout(r, Math.max(0, 8 * 4 * 45 - 0)));
  clearInterval(jt);
  if (ok) { world = to; applyWorld(); n.textContent = target; }
  setTimeout(() => { ov.classList.remove('on'); shifting = false; if (emote.state === 'ready') say(ok ? '……刚才，是不是有什么变了？' : '……没事，什么都没变。', 3200); }, 650);
}
addEventListener('keydown', (e) => { if ((e.key === 'd' || e.key === 'D') && !e.metaKey && !e.ctrlKey) shiftWorld(); });

applyWorld();
setSection('hero');
addEventListener('resize', placeEdges);

window.__fusion = {
  info: () => ({ sec: cur, world, model: emote.state, expr: emote.current, alias: emote.alias, shifting, tier: tierCur, frames: emote.stats.frames, rendering: emote.rendering }),
  goTo, readTier, shiftWorld,
};
