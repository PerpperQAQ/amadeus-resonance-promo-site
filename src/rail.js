/**
 * 世界线进度条（第九轮重做）：贴底的窄条（约 34px），一条近乎笔直的暖橙细线 + 两条很淡的辅线，见 railline.js。
 * 线上发白光的圆点 = 滚动进度（从左往右）；章节 = 线上较小的光点，可点击、悬停显示章节名。
 * （旧版 wlines.js 的多线束造型保留在仓库里但不再用于进度条。）
 */
import { RailLine } from './railline.js';
const NS = 'http://www.w3.org/2000/svg';
const mk = (n, a = {}) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };


export class Rail {
  constructor(host, sections, { onGo } = {}) {
    this.host = host; this.sections = sections; this.onGo = onGo;
    this.cv = document.createElement('canvas'); this.cv.className = 'rail-cv';
    this.svg = mk('svg', { class: 'rail-svg', width: '100%', height: '100%', preserveAspectRatio: 'none' });
    this.nodes = mk('g', { class: 'rail-nodes' });
    this.svg.append(this.nodes);
    this.tip = document.createElement('div'); this.tip.className = 'rail-tip'; this.tip.setAttribute('aria-hidden', 'true');
    host.append(this.cv, this.svg, this.tip);
    this.waves = new RailLine(this.cv, { seed: 9 });
    this.xs = []; this.ys = []; this.cur = 0; this.p = 0; this.x0 = 0; this.x1 = 1;
    this.layout();
    this.waves.start();
  }
  setRgb() { /* A/B 世界线中的进度条均使用暖橙 */ }
  /** 重新布局（窗口缩放/内容高度变化后调用）。节点横向位置 ∝ 章节在页面中的滚动位置。 */
  layout() {
    const w = this.W = this.host.clientWidth || innerWidth, h = this.H = this.host.clientHeight || 34;
    this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    this.waves.resize();
    const padX = w <= 600 ? 66 : Math.max(96, w * 0.075);   // 左侧留给页码辉光数字
    const padRight = w <= 600 ? 20 : padX;
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    this.xs = this.sections.map((s) => padX + (w - padX - padRight) * Math.min(1, s.offsetTop / max));
    for (let i = 1; i < this.xs.length; i++) this.xs[i] = Math.max(this.xs[i], this.xs[i - 1] + 24);
    const over = this.xs[this.xs.length - 1] - (w - padRight);
    if (over > 0) this.xs = this.xs.map((x, i) => x - over * (i / (this.xs.length - 1)));
    this.x0 = padX - 14; this.x1 = w - padRight + 14;
    this.waves.setLayout({ xn: this.xs });
    this.ys = this.xs.map(() => this.waves.yBase);
    // 节点（SVG，可点击/聚焦）
    this.nodes.textContent = '';
    this.nodeEls = this.xs.map((x, i) => {
      const y = this.ys[i];
      const g = mk('g', { class: 'rail-node', tabindex: 0, role: 'link', 'aria-label': `前往：${this.sections[i].dataset.name}` });
      g.append(mk('circle', { class: 'rn-hit', cx: x, cy: y, r: 11 }), mk('circle', { class: 'rn-ring', cx: x, cy: y, r: 5 }), mk('circle', { class: 'rn-dot', cx: x, cy: y, r: 2 }));
      const go = () => this.onGo?.(i);
      g.addEventListener('click', go);
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      g.addEventListener('pointerenter', () => this.showTip(i));
      g.addEventListener('pointerleave', () => this.hideTip());
      g.addEventListener('focus', () => this.showTip(i));
      g.addEventListener('blur', () => this.hideTip());
      this.nodes.append(g);
      return g;
    });
    this.setProgress(this.p);
    this.setCurrent(this.cur, true);
  }
  setProgress(p) {
    this.p = Math.max(0, Math.min(1, p));
    // 亮线头位置：落在 [第一个节点, 最后一个节点] 之间
    const a = this.xs[0] ?? 0, b = this.xs[this.xs.length - 1] ?? 1;
    const hx = a + (b - a) * this.p;
    this.waves.setHead(hx, this.p);
    this.nodeEls?.forEach((g, i) => g.classList.toggle('passed', this.xs[i] <= hx + 1));
  }
  setCurrent(i, silent) {
    const prev = this.cur;
    this.cur = i; this.waves.setCurrent(i);
    this.nodeEls?.forEach((g, k) => {
      g.classList.toggle('is-cur', k === i);
      if (k === i) g.setAttribute('aria-current', 'step'); else g.removeAttribute('aria-current');
    });
    if (!silent && prev !== i) this.migrate(prev, i);
  }
  /** 切章时给主线一次很轻的涟漪。 */
  migrate() { this.waves.kick(this.cur); }
  showTip(i) {
    const s = this.sections[i];
    this.tip.textContent = `${String(i + 1).padStart(2, '0')}  ${s.dataset.name}`;
    this.tip.style.left = Math.max(50, Math.min(this.W - 50, this.xs[i])) + 'px'; this.tip.style.bottom = Math.round(this.H - this.ys[i] + 12) + 'px';
    this.tip.classList.add('on');
  }
  hideTip() { this.tip.classList.remove('on'); }
  setLabels() { /* 章节名在 data-name 上 */ }
}
