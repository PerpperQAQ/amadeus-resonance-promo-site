/**
 * 底部世界线进度条（第九轮重做；第十轮加两条以进度点为分歧点的分支线、读数刻度与小读数）：一条近乎笔直的暖橙细线 + 两条很淡的辅线，高度仅约 30px。
 *  - 主线几乎笔直，只有极轻微的、非周期的起伏（≤1.2px 的值噪声）；
 *  - 线上一个发白光的圆点 = 当前滚动进度，从左往右移动；已走过的一段略亮；
 *  - 章节节点 = 线上较小的光点（SVG 层负责点击/聚焦，见 rail.js）；切章时线上有一次很轻的涟漪；
 *  - 造型取自用户给的世界线参考图（细线 + 大小不一的白色发光圆点），但这里是水平、从左往右走的。
 * 接口与旧 WorldLines 保持一致（rail.js 直接替换）：resize / setLayout / setHead / setCurrent / kick / start / stop。
 */
const TAU = Math.PI * 2;
const WARM = [255, 174, 98];
const rng = (seed) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const lattice = (r) => Float32Array.from({ length: 64 }, () => r() * 2 - 1);
const noise = (L, u) => { const n = L.length, i = Math.floor(u), f = u - i, a = L[((i % n) + n) % n], b = L[(((i + 1) % n) + n) % n], k = f * f * (3 - 2 * f); return a + (b - a) * k; };

export class RailLine {
  constructor(cv, { seed = 9 } = {}) {
    this.cv = cv; this.ctx = cv.getContext('2d'); this.raf = 0; this.running = false; this.t0 = performance.now();
    this.W = 0; this.H = 0; this.dpr = 1; this.maxDpr = 1.5; this.xn = []; this.cur = 0; this.hx = 0; this.kickT = -9; this.kickX = 0; this.sc = 1;
    const r = rng(seed);
    this.L = [lattice(r), lattice(r), lattice(r)];
    // 辅线：偏移（px）、振幅、速度、透明度——很淡、很少
    this.aux = [{ off: -5.5, A: 1.4, v: 0.05, o: r() * 40, al: 0.1, x0: 0.06, x1: 0.97 }, { off: 4.5, A: 1.2, v: 0.04, o: r() * 40, al: 0.08, x0: 0.0, x1: 0.88 }];
    this._loop = this._loop.bind(this);
    this._vis = () => { if (document.hidden) { cancelAnimationFrame(this.raf); this.raf = 0; } else if (this.running) { this.last = 0; this._go(); } };
    document.addEventListener('visibilitychange', this._vis);
  }
  resize() {
    this.dpr = Math.min(this.maxDpr, devicePixelRatio || 1); this.sc = Math.min(1.4, Math.max(0.9, innerWidth / 1440));
    const b = this.cv.getBoundingClientRect(); this.W = Math.max(1, b.width); this.H = Math.max(1, b.height);
    this.cv.width = Math.round(this.W * this.dpr); this.cv.height = Math.round(this.H * this.dpr);
  }
  get yBase() { return this.H * 0.62; }
  setLayout({ xn }) { this.xn = xn; this.nodeH = xn.map(() => 0); }
  setHead(x, p) { this.hx = x; if (p != null) this.prog = p; }
  setCurrent(i) { this.cur = i; }
  kick(i = this.cur) { this.kickT = performance.now() / 1000; this.kickX = this.xn[i] ?? this.W / 2; }
  start() { if (this.running) return; this.running = true; this._go(); }
  stop() { this.running = false; cancelAnimationFrame(this.raf); this.raf = 0; this.ctx.clearRect(0, 0, this.cv.width, this.cv.height); }
  destroy() { this.stop(); document.removeEventListener('visibilitychange', this._vis); }
  _go() { if (!this.raf) this.raf = requestAnimationFrame(this._loop); }
  _loop(now) { this.raf = 0; if (!this.running) return; this.last = now; this.frame((now - this.t0) / 1000); this._go(); }
  _orb(c, x, y, r, a, hot = false) {
    const g = c.createRadialGradient(x, y, 0, x, y, r * 4), [R, G, B] = WARM;
    g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.24, `rgba(255,${hot ? 248 : 240},${hot ? 236 : 216},${a * 0.95})`);
    g.addColorStop(0.34, `rgba(${R},${G + 40},${B + 50},${a * 0.5})`); g.addColorStop(0.65, `rgba(${R},${G},${B},${a * 0.14})`); g.addColorStop(1, `rgba(${R},${G},${B},0)`);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 4, 0, TAU); c.fill();
  }
  /** 主线在 x 处的 y：极轻微的非周期起伏 + 切章涟漪（≤3px，很快衰减） */
  yAt(x, t, k = 0) {
    const n = this.L[k % 3], A = k === 0 ? 1.1 : 1.4;
    const w = noise(n, x / 520 + t * 0.03 + k * 9) * 0.7 + noise(n, x / 150 + t * 0.07 + 31) * 0.3;
    const now = performance.now() / 1000, ka = Math.max(0, 1 - (now - this.kickT) / 1.6);
    const bump = k === 0 ? ka * 2.6 * Math.sin((x - this.kickX) * 0.05 - (now - this.kickT) * 8) * Math.exp(-((x - this.kickX) ** 2) / (2 * (90 + (now - this.kickT) * 420) ** 2)) : 0;
    return this.yBase + w * A + bump;
  }
  frame(t) {
    const c = this.ctx, d = this.dpr, W = this.W, H = this.H, sc = this.sc; if (!W) return;
    c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, W, H); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round';
    const xs = this.xn, a = xs.length ? xs[0] - 14 : 8, b = xs.length ? xs[xs.length - 1] + 14 : W - 8, hx = this.hx, step = 8;
    const path = (x0, x1, k, off = 0) => { const p = new Path2D(); p.moveTo(x0, this.yAt(x0, t, k) + off); for (let x = x0 + step; x < x1; x += step) p.lineTo(x, this.yAt(x, t, k) + off); p.lineTo(x1, this.yAt(x1, t, k) + off); return p; };
    // 第十轮：两条分支线——以白色进度点为“分歧点”，过去的一条在左侧从上方并入、未来的一条在右侧向下分出，越远越淡
    const ss = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
    const branch = (x0, x1, off, fadeLeft) => {
      if (x1 - x0 < 4) return;
      const p = new Path2D(); let first = true;
      for (let x = x0; x <= x1 + 0.1; x += 6) { const u = fadeLeft ? (hx - x) / 150 : (x - hx) / 130; const y = this.yAt(x, t, fadeLeft ? 1 : 2) + off * ss(u); if (first) { p.moveTo(x, y); first = false; } else p.lineTo(x, y); }
      const g = c.createLinearGradient(x0, 0, x1, 0), A = 0.34;
      if (fadeLeft) { g.addColorStop(0, `rgba(${WARM},0)`); g.addColorStop(0.55, `rgba(${WARM},${A * 0.6})`); g.addColorStop(1, `rgba(${WARM},${A})`); }
      else { g.addColorStop(0, `rgba(${WARM},${A})`); g.addColorStop(0.5, `rgba(${WARM},${A * 0.45})`); g.addColorStop(1, `rgba(${WARM},0)`); }
      c.strokeStyle = g; c.lineWidth = 1 * sc; c.stroke(p);
    };
    branch(a, hx, -6.5 * sc, true);
    branch(hx, b, 7 * sc, false);
    // 读数刻度：主线下方的短刻度（像变动率表的标尺），章节处是长刻度
    const tickY = this.yBase + 6 * sc;
    c.fillStyle = `rgba(${WARM},.16)`;
    for (let x = a; x <= b; x += Math.max(10, (b - a) / 64)) c.fillRect(Math.round(x), tickY, 1, 2.5 * sc);
    c.fillStyle = `rgba(${WARM},.42)`;
    xs.forEach((x) => c.fillRect(Math.round(x), tickY, 1, 5 * sc));
    // 主线：未走过的一段淡，已走过的一段亮
    const main = path(a, b, 0);
    c.strokeStyle = 'rgba(255,176,100,.24)'; c.lineWidth = 1.5 * sc; c.stroke(main);
    c.save(); c.beginPath(); c.rect(0, 0, Math.max(0, hx), H); c.clip();
    c.strokeStyle = 'rgba(255,176,100,.16)'; c.lineWidth = 5 * sc; c.stroke(main);
    c.strokeStyle = 'rgba(255,190,120,.9)'; c.lineWidth = 1.7 * sc; c.stroke(main); c.restore();
    // 章节节点：线上较小的光点
    xs.forEach((x, i) => { const y = this.yAt(x, t, 0), passed = x <= hx + 1, cur = i === this.cur, pulse = cur ? 1 + 0.12 * Math.sin(t * 2.2) : 1;
      this._orb(c, x, y, (cur ? 2.7 : passed ? 2.2 : 1.7) * pulse * sc, passed ? 0.95 : 0.5);
      if (cur) { c.strokeStyle = 'rgba(255,214,160,.45)'; c.lineWidth = 1 * sc; c.beginPath(); c.arc(x, y, 8.5 * sc, 0, TAU); c.stroke(); } });
    // 当前进度：发白光的圆点，从左往右
    const hy = this.yAt(hx, t, 0); this._orb(c, hx, hy, 4.4 * sc, 1, true);
    // 进度点上方的小读数（装饰性：把滚动进度写成变动率的样子，不代表任何数据）
    if (this.readout !== false && W > 700) {
      const v = (this.prog ?? 0) * 1.048596;
      c.globalCompositeOperation = 'source-over';
      c.font = `${Math.round(9 * sc)}px "AR Mono", ui-monospace, monospace`; c.textAlign = 'center';
      c.fillStyle = 'rgba(255,214,160,.62)'; c.fillText(v.toFixed(6), Math.max(30, Math.min(W - 30, hx)), hy - 9 * sc);
    }
    c.globalCompositeOperation = 'source-over';
  }
}
