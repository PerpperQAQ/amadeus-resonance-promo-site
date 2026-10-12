/**
 * 开屏“进入按钮”（第六轮）：参照用户 Amadeus 项目 Ready 界面的入口（IbmMark：平时一串 APL 乱码，
 * 悬停/聚焦时逐位跳动、锁定成台词；说明文字写成 APL 注释；PRESS ENTER 提示），代码自写。
 * 本页版本：默认是早期 IBM 5100 时代的“代码”乱码（APL 符号 / 十六进制 / BASIC 行），悬停解码成 “El Psy Kongroo”。
 * 状态：loading（模型未就绪：乱码快速刷新、按钮不可点、注释显示加载进度）→ ready（可点击 / Enter）→ offline（模型加载失败降级，仍可进入）。
 */
const TEXT = 'El Psy Kongroo';
const APL_BASE = '⍴⍳∊∆∇⎕⍞○∘⊥⊤⊂⊃⌈⌊←→×÷≠≤≥∨∧~⍺⍵¯¨';
const APL_OVER = '⍋⍒⌽⊖⍉⍟⌹⍱⍲⍝⌿⍀⍫';
const HEX = '0123456789ABCDEF';
const rnd = (s) => s[(Math.random() * s.length) | 0];
// 约 50% APL 基本符号 + 18% 叠打字符 + 20% 十六进制 + 12% 数字/BASIC 符号
const gch = () => { const r = Math.random(); return r < 0.5 ? rnd(APL_BASE) : r < 0.68 ? rnd(APL_OVER) : r < 0.88 ? rnd(HEX) : rnd('$#%&*@+=<>'); };
const garble = () => TEXT.split('').map((c) => (c === ' ' ? '·' : gch()));
const CODE = [
  () => `10 FOR K=1 TO 14 : PRINT CHR$(PEEK(&H${HEX[(Math.random() * 16) | 0]}0${HEX[(Math.random() * 16) | 0]}0+K)); : NEXT`,
  () => Array.from({ length: 9 }, () => rnd(HEX) + rnd(HEX)).join(' ') + '  ⎕←⍳' + ((Math.random() * 90 + 10) | 0) + ' ⋄ ⍴⍵',
];

export class BootEntry {
  constructor(host, { onEnter }) {
    this.host = host; this.onEnter = onEnter; this.state = 'loading'; host.dataset.state = 'loading'; this.hover = false; this.t0 = 0; this.done = false; this.shown = false;
    host.innerHTML = `<button class="be-btn" type="button" disabled aria-label="El Psy Kongroo · 进入"><span class="be-line"></span><span class="be-cur">_</span></button>
      <p class="be-cap" role="status"><span class="be-note"></span><kbd class="be-kbd"><i>⍝</i> PRESS ENTER</kbd></p>
      <div class="be-code" aria-hidden="true"><span></span><span></span></div>`;
    this.btn = host.querySelector('.be-btn'); this.line = host.querySelector('.be-line'); this.note = host.querySelector('.be-note');
    this.codeEls = [...host.querySelectorAll('.be-code span')];
    this.chars = garble(); this.locked = TEXT.split('').map(() => false); this._paint(); this._code(true);
    const on = () => { if (this.state === 'loading') return; this.hover = true; this.t0 = performance.now(); this.host.classList.add('is-hover'); };
    const off = () => { this.hover = false; this.done = false; this.host.classList.remove('is-hover'); this.chars = garble(); this.locked = TEXT.split('').map(() => false); this._paint(); };
    for (const [e, f] of [['mouseenter', on], ['mouseleave', off], ['focus', on], ['blur', off]]) this.btn.addEventListener(e, f);
    this.btn.addEventListener('click', () => this.go());
    this.lastSlow = 0; this.lastFast = 0; this.lastCode = 0;
  }
  go() { if (this.state !== 'loading' && !this.entered) { this.entered = true; this.onEnter?.(); } }
  _paint() {
    this.line.innerHTML = this.chars.map((c, i) => `<span class="ib-ch${c === '·' ? ' is-sep' : ''}${this.locked[i] ? '' : ' is-noise'}">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
  }
  _code() { this.codeEls.forEach((el, i) => { el.textContent = CODE[i](); }); }
  show() { this.shown = true; this.host.classList.add('show'); }
  /** 每帧调用：state = loading | ready | offline；pct 0..100 */
  update(now, state, pct) {
    if (state !== this.state) {
      this.state = state; this.host.dataset.state = state; this.btn.disabled = state === 'loading';
      this.host.classList.toggle('is-ready', state !== 'loading');
      this.note.textContent = state === 'offline' ? '⍝ MODEL.OFFLINE · STATIC.IMAGE' : '';
      if (state === 'loading') this.btn.removeAttribute('tabindex'); else if (this.hover) this.t0 = now;
    }
    if (state === 'loading') {
      this.note.textContent = `⍝ LOADING ${String(pct).padStart(2, '0')}% · 0x${(pct * 655).toString(16).toUpperCase().padStart(4, '0')}`;
      if (now - this.lastFast > 90) { this.lastFast = now; this.chars = garble(); this._paint(); }
    } else if (!this.hover) {
      if (now - this.lastSlow > 420) { this.lastSlow = now; this.chars = this.chars.map((c) => (c !== '·' && Math.random() < 0.12 ? gch() : c)); this._paint(); }
    } else if (!this.done) {
      const t = now - this.t0, ch = TEXT.split('');
      this.locked = ch.map((_, i) => t > 90 + i * 42);
      this.chars = ch.map((c, i) => (this.locked[i] ? c : (c === ' ' ? '·' : gch())));
      this._paint();
      if (this.locked.every(Boolean)) { this.done = true; this.chars = ch; this._paint(); this.line.classList.add('is-done'); }
    }
    if (!this.hover) this.line.classList.remove('is-done');
    if (now - this.lastCode > 700) { this.lastCode = now; if (Math.random() < 0.5) this._code(); }
  }
  /** 点击进入时：不管是否悬停，直接定格成台词。 */
  lockAll() { this.hover = true; this.done = true; this.chars = TEXT.split(''); this.locked = this.chars.map(() => true); this._paint(); this.line.classList.add('is-done'); }
}
