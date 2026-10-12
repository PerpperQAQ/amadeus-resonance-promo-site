/**
 * 世界线（进度条 / 开屏共用，第四轮按用户反馈重画）：整体“从左往右”。
 * 造型依据用户确认的参考图（萌娘百科“世界线”词条配图，仅作造型参考，未嵌入本页；见 docs/worldline-reference.md §6）：
 * 黑底，细长线条，线上有大小/远近不一的白色发光光点。
 *  - 线条：若干条近水平、略有起伏的细长线，沿页面宽度从左向右延伸，彼此缓慢交织；
 *  - 光点：沿线从左向右缓慢漂移（大小不一，近大远小）；
 *  - 主线：串起各章节节点（较大的光球，可点击），滚动进度 = 主线从左向右被点亮的长度；
 *  - 开屏（full 模式）：线条随进度头从左向右“生长”，未到之处不画。
 * 第六轮：线条起伏不再是同相位正弦（像“海浪”），改为每条线各自独立的多层低频噪声（随机格点 + 平滑插值，非周期）
 *   叠加基线的缓慢随机漂移：各线幅度/波长/速度/相位都不同，偶尔相交又分开；光点速度也带缓慢的随机起伏。
 * 原图是静态图：线条起伏、光点漂移速度、切章涟漪均为视觉近似/本页设计。线条第七轮：颜色统一为暖橙单一色调、线宽加粗（随屏宽缩放）。
 */
const TAU = Math.PI * 2;
const rng = (seed) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const gauss = (d, s) => Math.exp(-(d * d) / (2 * s * s));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const noise = (L, u) => { const n = L.length, i = Math.floor(u), f = u - i, a = L[((i % n) + n) % n], b = L[(((i + 1) % n) + n) % n], k = f * f * (3 - 2 * f); return a + (b - a) * k; };   // 平滑值噪声，-1..1
const lattice = (r) => Float32Array.from({ length: 97 }, () => r() * 2 - 1);
const sstep = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };

export class WorldLines {
  constructor(cv, { seed = 9, count = 11, full = false, maxDpr = 1.5 } = {}) {
    this.cv = cv; this.ctx = cv.getContext('2d'); this.raf = 0; this.running = false; this.t0 = performance.now();
    this.full = full; this.sc = 1; this.W = 0; this.H = 0; this.dpr = 1; this.maxDpr = maxDpr;
    const r = rng(seed);
    const [b0, b1] = full ? [0.64, 0.95] : [0.12, 0.88];
    this.strands = Array.from({ length: count }, (_, i) => {
      const x0 = r() < 0.45 ? 0 : r() * 0.3, x1 = r() < 0.5 ? 1 : 0.7 + r() * 0.3;
      return {
        base: b0 + (b1 - b0) * ((i + r() * 0.8) / count), x0, x1,
        L1: lattice(r), L2: lattice(r), L3: lattice(r), Lb: lattice(r), A: 0.1 + r() * 0.24, l1: 420 + r() * 900, l2: 240 + r() * 260, l3: 90 + r() * 90,
        v1: (r() - 0.5) * 0.06, v2: (r() - 0.5) * 0.11, v3: (r() - 0.5) * 0.2, o1: r() * 50, o2: r() * 50, o3: r() * 50, bs: 0.03 + r() * 0.05, bA: 0.04 + r() * 0.1, ob: r() * 50,
        al: 0.28 + r() * 0.4, w: 1.4 + r() * 0.6, lag: r() * 0.12,
        dots: Array.from({ length: 3 + ((r() * 3) | 0) }, () => ({ u: r(), v: 0.012 + r() * 0.035, ph: r() * 40, rad: 1.2 + Math.pow(r(), 1.8) * 4.4, a: 0.5 + r() * 0.5 })),
      };
    });
    this.nzL = lattice(r); /* 单一暖橙色调（与开屏世界线、辉光管数字一致） */ this.cols = [[255, 174, 98]]; this.xn = []; this.cur = 0; this.hx = 0; this.kickT = -9; this.kickX = 0; this.nodeH = [];
    this._loop = this._loop.bind(this);
    this._vis = () => { if (document.hidden) { cancelAnimationFrame(this.raf); this.raf = 0; } else if (this.running) { this.last = 0; this._go(); } };
    document.addEventListener('visibilitychange', this._vis);
  }
  resize() {
    this.dpr = Math.min(this.maxDpr, devicePixelRatio || 1); this.sc = Math.min(1.5, Math.max(0.85, innerWidth / 1440));
    const b = this.cv.getBoundingClientRect(); this.W = Math.max(1, b.width); this.H = Math.max(1, b.height);
    this.cv.width = Math.round(this.W * this.dpr); this.cv.height = Math.round(this.H * this.dpr);
  }
  /** xn：章节节点 x；cols：每章颜色 */
  setLayout({ xn, cols }) {
    this.xn = xn;   // cols 不再使用：世界线统一为暖橙色调，不按章节换色
    const hs = this.full ? [0.1, 0.17, 0.12, 0.2, 0.14, 0.22, 0.12, 0.18] : [0.46, 0.34, 0.5, 0.3, 0.44, 0.37, 0.52, 0.32];
    this.nodeH = xn.map((_, i) => hs[i % hs.length]);
  }
  colAt(x) {
    const n = this.xn.length; if (!n) return this.cols[0];
    if (x <= this.xn[0]) return this.cols[0]; if (x >= this.xn[n - 1]) return this.cols[Math.min(n - 1, this.cols.length - 1)];
    for (let i = 1; i < n; i++) if (x <= this.xn[i]) return mix(this.cols[i - 1] || this.cols[0], this.cols[i] || this.cols[0], (x - this.xn[i - 1]) / Math.max(1, this.xn[i] - this.xn[i - 1]));
    return this.cols[0];
  }
  setHead(x) { this.hx = x; }
  setCurrent(i) { this.cur = i; }
  kick(i = this.cur) { this.kickT = performance.now() / 1000; this.kickX = this.xn[i] ?? this.W / 2; }
  start() { if (this.running) return; this.running = true; this._go(); }
  stop() { this.running = false; cancelAnimationFrame(this.raf); this.raf = 0; this.ctx.clearRect(0, 0, this.cv.width, this.cv.height); }
  destroy() { this.stop(); document.removeEventListener('visibilitychange', this._vis); }
  _go() { if (!this.raf) this.raf = requestAnimationFrame(this._loop); }
  _loop(now) { this.raf = 0; if (!this.running) return; const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 0.016; this.last = now; this.frame((now - this.t0) / 1000, dt); this._go(); }

  _orb(c, x, y, r, rgb, a) {
    const [R, G, B] = rgb;
    const g = c.createRadialGradient(x, y, 0, x, y, r * 4.2);
    g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.22, `rgba(255,255,255,${a * 0.95})`);
    g.addColorStop(0.3, `rgba(${Math.min(255, R + 90)},${Math.min(255, G + 90)},${Math.min(255, B + 90)},${a * 0.5})`);
    g.addColorStop(0.6, `rgba(${R},${G},${B},${a * 0.16})`); g.addColorStop(1, `rgba(${R},${G},${B},0)`);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 4.2, 0, TAU); c.fill();
  }
  frame(t, dt = 0.016) {
    const c = this.ctx, d = this.dpr, W = this.W, H = this.H; if (!W) return;
    c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, W, H);
    c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round';
    const now = performance.now() / 1000, ka = Math.max(0, 1 - (now - this.kickT) / 2.0), kf = 140 + (now - this.kickT) * 560;
    const bump = (x) => ka * 12 * Math.sin((x - this.kickX) * 0.035 - (now - this.kickT) * 9) * gauss(x - this.kickX, kf);
    const hx = this.hx, full = this.full, step = 10, sc = this.sc;
    const AH = full ? H * 0.38 : H;
    // 每条线：低频大起伏 + 中频 + 细碎抖动（非周期值噪声）+ 基线随机漂移；full 模式幅度更小
    const yOf = (s, x) => H * s.base + H * s.bA * noise(s.Lb, s.ob + t * s.bs) + AH * s.A * (noise(s.L1, s.o1 + x / s.l1 + t * s.v1) * 0.62 + noise(s.L2, s.o2 + x / s.l2 + t * s.v2) * 0.28 + noise(s.L3, s.o3 + x / s.l3 + t * s.v3) * 0.1) + bump(x);
    // ---- 细长线条
    for (const s of this.strands) {
      const xa = 8 + s.x0 * (W - 16), xb = 8 + s.x1 * (W - 16);
      const xe = full ? Math.min(xb, hx - s.lag * W) : xb;
      if (xe <= xa + 2) continue;
      const p = new Path2D(); p.moveTo(xa, yOf(s, xa));
      for (let x = xa + step; x < xe; x += step) p.lineTo(x, yOf(s, x));
      p.lineTo(xe, yOf(s, xe));
      const col = this.colAt((xa + xe) / 2);
      c.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${s.al * (full ? 0.9 : 0.36)})`; c.lineWidth = s.w * sc; c.stroke(p);
      if (!full) {   // 进度已到的一段更亮
        c.save(); c.beginPath(); c.rect(0, 0, hx, H); c.clip();
        c.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${s.al * 0.75})`; c.lineWidth = s.w * sc; c.stroke(p); c.restore();
      } else {
        c.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${s.al * 0.14})`; c.lineWidth = s.w * sc + 3; c.stroke(p);
        this._orb(c, xe, yOf(s, xe), 1.8, col, 0.9);              // 生长中的线头
      }
      // 光点：沿线从左向右缓慢漂移
      for (const o of s.dots) {
        o.u += o.v * dt * (full ? 2.5 : 1) * (0.55 + 0.9 * (0.5 + 0.5 * Math.sin(t * 0.23 + o.ph))); if (o.u > 1) o.u -= 1;
        const x = xa + o.u * (xb - xa); if (x > xe - 2) continue;
        const edge = Math.min(sstep(o.u * 8), sstep((1 - o.u) * 8)), lit = x <= hx ? 1 : 0.55;
        this._orb(c, x, yOf(s, x), o.rad, this.colAt(x), o.a * edge * lit * (full ? 0.9 : 1));
      }
    }
    // ---- 主线：串起章节节点，进度从左向右点亮
    const n = this.xn.length; if (!n) { c.globalCompositeOperation = 'source-over'; return; }
    const pts = this.xn.map((x, i) => ({ x, y: H * (1 - this.nodeH[i]) + (noise(this.nzL, i * 3.1 + t * 0.12) * 6) + bump(x) }));
    const link = () => { c.beginPath(); c.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < n; i++) { const p = pts[i - 1], q = pts[i], mx = (p.x + q.x) / 2; c.bezierCurveTo(mx, p.y, mx, q.y, q.x, q.y); } };
    if (!full) { link(); c.strokeStyle = 'rgba(255,176,100,.2)'; c.lineWidth = 1.6 * sc; c.stroke(); }
    c.save(); c.beginPath(); c.rect(0, 0, Math.max(0, hx), H); c.clip();
    link(); const hc = this.colAt(hx); c.strokeStyle = `rgba(${hc[0]},${hc[1]},${hc[2]},.5)`; c.lineWidth = 4.6 * sc; c.stroke();
    c.strokeStyle = 'rgba(255,236,206,.9)'; c.lineWidth = 1.8 * sc; c.stroke(); c.restore();
    for (let i = 0; i < n; i++) {
      const p = pts[i], col = this.colAt(p.x), passed = p.x <= hx + 1, cur = i === this.cur;
      if (full && !passed) continue;
      const rad = cur ? 7.2 + Math.sin(t * 2.2) * 0.5 : passed ? 5.2 : 4.1;
      this._orb(c, p.x, p.y, rad, col, passed ? 1 : 0.62);
    }
    let hy = pts[0].y; for (let i = 1; i < n; i++) if (hx >= pts[i - 1].x && hx <= pts[i].x) { const u = (hx - pts[i - 1].x) / Math.max(1, pts[i].x - pts[i - 1].x); hy = pts[i - 1].y + (pts[i].y - pts[i - 1].y) * sstep(u); }
    if (hx > pts[n - 1].x) hy = pts[n - 1].y;
    this._orb(c, hx, hy, 3.2, this.colAt(hx), 1);
    c.globalCompositeOperation = 'source-over';
  }
}
