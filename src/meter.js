/**
 * “世界线变动率”读数（第四轮·按用户 Amadeus 前端的表现重做）。
 * 只画辉光管“里面”的橙色显示，不画玻璃管 / 金属壳：
 *   弯曲细线数字（字形来自用户自己的 divergence-meter/meterLib.js），四层叠加：
 *   外晕 #ff4a00（大模糊）→ 近晕 #ff7a10（小模糊）→ 本体 #ffb040 → 亮芯 #fff0c0；
 *   跳变中带一个暗的「+」支撑与两个残影字，锁定后只留干净的数字；小数点是一个独立的橙色光点（8 个位置）。
 * 编排（取自其 WorldlineShift.jsx 的节奏，代码自写）：
 *   tick(now)   —— 整排成组跳变（约 260ms 一次，换值时带 70ms 的 flash 加粗）
 *   seq(now,n)  —— 前 n 位已锁定为目标值，其余位继续每 55ms 乱跳；新锁定的一位 flash 150ms
 *   lock()      —— 整排一次锁定
 * 没有逐位计时器：所有变化都由外部同一个 rAF 调用上面的方法驱动。
 */
const DIG = {
  0: 'M0 -64 C 34 -64 34 64 0 64 C -34 64 -34 -64 0 -64 Z',
  1: 'M-12 -50 L 2 -64 V 64',
  2: 'M-28 -36 C -28 -72 30 -72 30 -34 C 30 -2 -30 24 -30 64 H 30',
  3: 'M-28 -64 H 28 L -4 -12 C 40 -12 40 64 0 64 C -17 64 -26 55 -30 44',
  4: 'M16 64 V -64 L -30 26 H 32',
  5: 'M26 -64 H -22 L -26 -6 C 0 -24 34 -12 34 24 C 34 70 -13 74 -30 48',
  6: 'M24 -62 C -38 -48 -32 64 0 64 C 34 64 34 2 0 2 C -19 2 -30 18 -31 30',
  7: 'M-30 -64 H 30 L -9 64',
  8: 'M0 -6 C -32 -6 -32 -64 0 -64 C 32 -64 32 -6 0 -6 C -37 -6 -37 64 0 64 C 37 64 37 -6 0 -6 Z',
  9: 'M-24 62 C 38 48 32 -64 0 -64 C -34 -64 -34 -2 0 -2 C 19 -2 30 -18 31 -30',
};
const CROSS = 'M0 -64 V 64 M-24 -22 H 24';
const P = 146, NS = 'http://www.w3.org/2000/svg';
const JUMPS = ['1.130426', '3.352468', '0.029135', '7.776802', '9.578024', '0.571024'];
let uid = 0;
const rd = () => String((Math.random() * 10) | 0);
const rv = () => (Math.random() < 0.5 ? '0' : '1') + '.' + Array.from({ length: 6 }, rd).join('');

export class Meter {
  constructor(host) {
    const id = 'mt' + (++uid);
    this.host = host; host.textContent = '';
    this.row = document.createElement('div'); this.row.className = 'mt-row'; host.append(this.row);
    const chars = 'd.dddddd'.split('');
    this.idx = chars.map((c, i) => (c === '.' ? -1 : i)).filter((i) => i >= 0);
    let g = '';
    chars.forEach((c, i) => {
      const cx = 70 + i * P;
      if (c === '.') { g += `<g class="mt-dot" data-i="${i}"><circle cx="${cx + 18}" cy="204" r="13" fill="#ff7a10" opacity=".8" filter="url(#${id}a)"/><circle cx="${cx + 18}" cy="204" r="6" fill="#fff0c0"/></g>`; return; }
      g += `<g transform="translate(${cx} 120) scale(1.35)" data-i="${i}">
        <path class="mt-frame" d="${CROSS}"/><path class="mt-ghost" d="${DIG[8]} ${CROSS}" transform="translate(2 1)"/><path class="mt-ghost" d="${DIG[3]} ${CROSS}" transform="translate(-2 -1)"/>
        <g class="mt-lit"><path class="z0" filter="url(#${id}a)"/><path class="z1" filter="url(#${id}b)"/><path class="z2"/><path class="z3"/></g></g>`;
    });
    this.row.innerHTML = `<svg class="mt-svg" viewBox="0 0 1180 240" aria-hidden="true"><defs>
      <filter id="${id}a" x="-50%" y="-30%" width="200%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>
      <filter id="${id}b" x="-30%" y="-20%" width="160%" height="140%"><feGaussianBlur stdDeviation="2.4"/></filter></defs>${g}</svg>`;
    this.gs = chars.map((c, i) => (c === '.' ? null : this.row.querySelector(`g[data-i="${i}"]`)));
    this.locked = false; this.next = 0; this.k = 1; this.value = ''; this.flashT = new Map(); this.jt = 0; this.nLocked = 0;
  }
  _digit(i, ch, flash = false, clean = false) {
    const g = this.gs[i]; if (!g) return;
    const d = clean ? DIG[ch] : `${DIG[ch]} ${CROSS}`;
    const ps = g.querySelectorAll('.mt-lit path'); for (const p of ps) p.setAttribute('d', d);
    g.classList.toggle('flash', flash); g.classList.toggle('is-locked', clean);
  }
  _row(v, flash = false, clean = false) { this.idx.forEach((i) => this._digit(i, v[i], flash, clean)); this.value = v; }
  /** 直接显示（不动画）。 */
  set(str) { this.locked = false; this.nLocked = 0; this._row(str, false, true); }
  unlock() { this.locked = false; this.nLocked = 0; this.next = 0; }
  _flashOff(now) { for (const [i, t] of this.flashT) if (now >= t) { this.gs[i]?.classList.remove('flash'); this.flashT.delete(i); } }
  /** 整排成组跳变（约 260ms 一次；换值那一刻 flash）。 */
  tick(now, speed = 1) {
    if (this.locked) return; this._flashOff(now);
    if (now < this.next) return;
    const v = this.k < JUMPS.length * 2 ? JUMPS[this.k % JUMPS.length] : rv(); this.k++;
    this._row(v, true); this.next = now + 260 / Math.max(1, speed);
    this.idx.forEach((i) => this.flashT.set(i, now + 70));
  }
  /** 逐位收束：前 n 位 = 目标值，其余继续乱跳。 */
  seq(now, n, final) {
    this._flashOff(now);
    if (n > this.nLocked) {
      for (let k = this.nLocked; k < Math.min(n, this.idx.length); k++) { const i = this.idx[k]; this._digit(i, final[i], true, true); this.flashT.set(i, now + 150); }
      this.nLocked = n;
    }
    if (now - this.jt > 55) { this.jt = now; for (let k = this.nLocked; k < this.idx.length; k++) this._digit(this.idx[k], rd()); }
    if (this.nLocked >= this.idx.length) this.locked = true;
  }
  /** 整排一次落到目标值。 */
  lock(str, now = performance.now()) {
    this.locked = true; this.nLocked = this.idx.length; this._row(str, true, true);
    this.idx.forEach((i) => this.flashT.set(i, now + 150));
  }
  tickFlash(now) { this._flashOff(now); }
}

/**
 * 页码用的“辉光数字”（第九轮）：与开屏读数同一套弯曲细线字形与橙色四层辉光（外晕/近晕/本体/亮芯），
 * 没有玻璃管与金属壳；轻微的随机发光闪烁；换数字时先短促乱跳再落定。
 */
export class GlowNum {
  constructor(host, n = 2) {
    const id = 'gn' + (++uid); this.n = n; this.host = host; host.textContent = ''; host.classList.add('gn-host');
    let g = '';
    for (let i = 0; i < n; i++) g += `<g class="gn-d" data-i="${i}" transform="translate(${52 + i * 108} 84) scale(1.12)"><g class="mt-lit"><path class="z0" filter="url(#${id}a)"/><path class="z1" filter="url(#${id}b)"/><path class="z2"/><path class="z3"/></g></g>`;
    host.innerHTML = `<svg class="gn-svg" viewBox="0 0 ${n * 108 + 4} 168" aria-hidden="true"><defs>
      <filter id="${id}a" x="-60%" y="-30%" width="220%" height="160%"><feGaussianBlur stdDeviation="11"/></filter>
      <filter id="${id}b" x="-40%" y="-20%" width="180%" height="140%"><feGaussianBlur stdDeviation="3.2"/></filter></defs>${g}</svg>`;
    this.gs = [...host.querySelectorAll('.gn-d')]; this.iv = 0; this.val = '';
  }
  _show(str, flash) { this.gs.forEach((g, i) => { const d = DIG[str[i]]; g.querySelectorAll('.mt-lit path').forEach((p) => p.setAttribute('d', d)); g.classList.toggle('flash', flash); }); }
  set(str) { clearInterval(this.iv); clearTimeout(this.settle); this.val = str; this._show(str, false); }
  /** 乱跳 ms 毫秒后落定到 str（落定那一刻 flash 一下） */
  roll(str, ms = 420, every = 55) {
    clearInterval(this.iv); clearTimeout(this.settle); const t0 = performance.now(); this.val = str;
    this.iv = setInterval(() => {
      const k = performance.now() - t0;
      if (k >= ms) { clearInterval(this.iv); this._show(str, true); this.settle = setTimeout(() => this._show(str, false), 140); return; }
      this._show(Array.from({ length: this.n }, rd).join(''), true);
    }, every);
  }
}
