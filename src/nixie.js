/**
 * 辉光管（Nixie）读数：纯 DOM/CSS 绘制。每根管内叠放 0–9 十个阴极，点亮其中一个。
 * 仅作装饰性致敬，不代表产品数据。
 */
const rnd = () => String(Math.floor(Math.random() * 10));

export class Nixie {
  /** @param {HTMLElement} host  @param {string} pattern 例如 "d.dddddd"（d=数字管，.=小数点灯） */
  constructor(host, pattern = 'd.dddddd') {
    this.host = host;
    this.tubes = [];
    this.token = 0;
    host.classList.add('nixie');
    host.textContent = '';
    for (const ch of pattern) {
      const el = document.createElement('span');
      if (ch === '.') {
        el.className = 'nx-dot';
        el.innerHTML = '<i></i>';
      } else {
        el.className = 'nx-tube';
        el.innerHTML = '<span class="nx-glass">' + Array.from({ length: 10 }, (_, n) => `<b data-n="${n}">${n}</b>`).join('') + '</span><span class="nx-base"></span>';
        this.tubes.push(el);
      }
      host.append(el);
    }
  }
  setDigit(i, c) {
    const t = this.tubes[i];
    if (!t || t._c === c) return;
    t._c = c;
    t.querySelector('.on')?.classList.remove('on');
    if (c != null && c !== ' ') t.querySelector(`[data-n="${c}"]`)?.classList.add('on');
  }
  set(str) {
    this.token++;
    str.replace('.', '').split('').forEach((c, i) => this.setDigit(i, c));
  }
  clear() { this.token++; this.tubes.forEach((_, i) => this.setDigit(i, null)); }
  /** 随机跳变（时间线跳动感）。 */
  shuffle(from = 0) { for (let i = from; i < this.tubes.length; i++) this.setDigit(i, rnd()); }
  /**
   * 滚动到目标读数：每根管先乱跳，再按顺序依次落定。返回 Promise（被新的 roll/set 打断时也会 resolve）。
   */
  roll(str, ms = 900, step = 55) {
    const my = ++this.token;
    const target = str.replace('.', '').split('');
    const n = this.tubes.length;
    const t0 = performance.now();
    return new Promise((resolve) => {
      const tick = () => {
        if (my !== this.token) { resolve(false); return; }
        const el = performance.now() - t0;
        let done = true;
        for (let i = 0; i < n; i++) {
          const settleAt = ms * (0.35 + 0.65 * (i / Math.max(1, n - 1))) ;
          if (el >= settleAt) this.setDigit(i, target[i]);
          else { this.setDigit(i, rnd()); done = false; }
        }
        if (done) { resolve(true); return; }
        setTimeout(tick, step);
      };
      tick();
    });
  }
}
