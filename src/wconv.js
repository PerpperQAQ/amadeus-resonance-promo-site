/**
 * 开屏世界线（第七轮）：星图 / 地铁线路风格的“世界线”，与数字变动并行播放，汇聚后持续有动态。
 *  主线 6 条：互相独立（不同起点：左缘/底缘；不同路径；错开出发），极细的线串着大小不一的发光节点，逐条汇入同一点（进入按钮上方），
 *    每次汇入在汇集点亮闪并扩散多层冲击光环；路径按人物脸部/颈领口/真由理脸的包围盒避让（bootcg.js）。
 *  远景细线 12–18 条：更细、更暗、更慢，只有微尘般的小节点，同样避开人物脸部框，给画面纵深；不做逐条汇入的闪光。
 *  层次：单一暖橙色调（明暗/透明度/粗细区分）、节点十字星芒与光环、节点间星座式细连线、偶尔“分叉再汇合”的细支线。
 *  汇聚后的动态（等待点击期间始终存在）：汇集点光晕呼吸、沿线流动的亮粒子与流光脉冲、节点缓慢漂移与呼吸、从汇集点向两侧散出又回流的细弧。
 * 变体：variant 'a'（默认，疏）/ 'b'（同一色调，仅更密：远景线更多、星座连线更强）。颜色统一为暖橙/琥珀单一色相。
 * setGrow(0..1)：整体进度（由开屏时间轴驱动，与数字变动并行）；setGlow(0..1)：汇集点的就绪亮度（随进入按钮就绪程度变化）。
 */
const TAU = Math.PI * 2;
const rng = (seed) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const sstep = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };

const WARM = [255, 174, 98];   // 单一暖橙/琥珀色调（与橙色辉光管数字、进入按钮协调）；层次只靠明暗/透明度/粗细区分
const WARM_HI = [255, 222, 176]; // 同色相的高光（亮部），用于星芒/冲击环
const VARIANTS = {
  a: { main: [WARM], far: [WARM], farN: 12, link: 0.16, nodes: [5, 8] },     // 默认：疏
  b: { main: [WARM], far: [WARM], farN: 18, link: 0.28, nodes: [6, 9] },     // 仅密度不同：远景线更多、连线更强
};
// 主线起点与走向（占屏幕宽高的比例）：L=从左缘 y 处进入，B=从底缘 x 处进入
const STARTS = [{ k: 'L', v: 0.42 }, { k: 'B', v: 0.1 }, { k: 'L', v: 0.62 }, { k: 'B', v: 0.34 }, { k: 'L', v: 0.76 }, { k: 'B', v: 0.82 }, { k: 'B', v: 0.2 }];
const catmull = (P, N) => {
  const out = [], n = P.length - 1;
  for (let k = 0; k <= N; k++) {
    const g = (k / N) * n, i = Math.min(n - 1, Math.floor(g)), t = g - i, p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(n, i + 2)], t2 = t * t, t3 = t2 * t;
    out.push([0, 1].map((d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
  }
  return out;
};
const inside = (p, rects) => rects.some(([a, b, c, d]) => p[0] > a && p[0] < c && p[1] > b && p[1] < d);
// 点在框外不代表相邻点之间的线段也在框外；在矩形转角处补一条绕行路径。
const crosses = (p, q, rects) => rects.some(([a, b, c, d]) => {
  let lo = 0, hi = 1;
  for (const [axis, min, max] of [[0, a + .01, c - .01], [1, b + .01, d - .01]]) {
    const delta = q[axis] - p[axis];
    if (Math.abs(delta) < 1e-8) { if (p[axis] < min || p[axis] > max) return false; }
    else {
      const u = (min - p[axis]) / delta, v = (max - p[axis]) / delta;
      lo = Math.max(lo, Math.min(u, v)); hi = Math.min(hi, Math.max(u, v));
      if (lo >= hi) return false;
    }
  }
  return lo < hi;
});
function detour(p, q, rects) {
  const points = [p, q, ...rects.flatMap(([a, b, c, d]) => [[a-1,b-1],[c+1,b-1],[c+1,d+1],[a-1,d+1]]).filter(p => !inside(p, rects))];
  const dist = points.map(() => Infinity), prev = points.map(() => -1), done = new Set();
  dist[0] = 0;
  for (let step = 0; step < points.length; step++) {
    let i = -1;
    for (let k = 0; k < points.length; k++) if (!done.has(k) && (i < 0 || dist[k] < dist[i])) i = k;
    if (i < 0 || !Number.isFinite(dist[i]) || i === 1) break;
    done.add(i);
    for (let j = 0; j < points.length; j++) {
      if (done.has(j) || crosses(points[i], points[j], rects)) continue;
      const next = dist[i] + Math.hypot(points[j][0]-points[i][0], points[j][1]-points[i][1]);
      if (next < dist[j]) { dist[j] = next; prev[j] = i; }
    }
  }
  const route = []; let i = 1;
  while (i >= 0) { route.unshift(points[i]); i = prev[i]; }
  return route.length > 1 ? route : [p, q];
}
/** 点先推出避让框，再平滑并补齐转角绕行；被竖向裁切压入人物区域的起点也随之移开。 */
export function repel(pts, rects) {
  const push = () => {
    for (const p of pts) {
      if (!inside(p, rects)) continue;
      // 脸与领口的保护框可能相交；选离所有框都在外的最近位置，避免逐框来回推挤。
      const candidates = rects.flatMap(([a,b,c,d]) => [[a-1,p[1]],[c+1,p[1]],[p[0],b-1],[p[0],d+1]])
        .filter(q => !inside(q, rects))
        .sort((a,b) => Math.hypot(a[0]-p[0],a[1]-p[1])-Math.hypot(b[0]-p[0],b[1]-p[1]));
      if (candidates.length) { p[0]=candidates[0][0]; p[1]=candidates[0][1]; }
    }
  };
  for (let r = 0; r < 5; r++) {
    push();
    for (let i = 1; i < pts.length - 1; i++) { const a = pts[i - 1], b = pts[i], c = pts[i + 1]; b[0] = b[0] * 0.5 + (a[0] + c[0]) * 0.25; b[1] = b[1] * 0.5 + (a[1] + c[1]) * 0.25; }
  }
  push();
  const routed = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const p = routed[routed.length-1], q = pts[i];
    routed.push(...(crosses(p,q,rects) ? detour(p,q,rects).slice(1) : [q]));
  }
  pts.splice(0,pts.length,...routed);
}

export class ConvergeLines {
  constructor(cv, { seed = 31, count = 6, maxDpr = 1.25, px = 0.5, py = 0.62, avoid = null, variant = 'a' } = {}) {
    this.cv = cv; this.ctx = cv.getContext('2d'); this.dpr = 1; this.maxDpr = maxDpr; this.W = 0; this.H = 0;
    this.px = px; this.py = py; this.grow = 0; this.glow = 0; this.raf = 0; this.running = false; this.t0 = performance.now();
    this.avoid = avoid; this.rects = []; this.events = []; this.flash = 0; this.arrived = 0; this.frames = 0; this.lite = false; this._slow = 0; this.sc = 1;
    this.variant = VARIANTS[variant] ? variant : 'a'; const V = VARIANTS[this.variant];
    const r = rng(seed), n = Math.max(5, Math.min(7, count));
    this._sprites = new Map();
    const order = Array.from({ length: n }, (_, i) => i).sort(() => r() - 0.5);       // 出发顺序与空间位置无关
    this.S = Array.from({ length: n }, (_, i) => {
      const nd = V.nodes[0] + ((r() * (V.nodes[1] - V.nodes[0] + 1)) | 0);
      return {
        i, j: Array.from({ length: 6 }, r), t0: 0.02 + order[i] * (0.4 / (n - 1)), dur: 0.5 + r() * 0.1,   // 错开出发，最后一条在 grow≈1 时抵达
        w: 2.3 + r() * 0.85, al: 0.62 + r() * 0.25, amp: 3 + r() * 7, ph: r() * TAU, sp: 0.16 + r() * 0.3, col: V.main[i % V.main.length],
        nodes: Array.from({ length: nd }, (_, k) => ({
          u: (k + 0.4 + r() * 0.5) / (nd + 0.3), rad: 0.7 + Math.pow(r(), 2.1) * 4.0, a: 0.5 + r() * 0.5, ph: r() * TAU, dr: 0.004 + r() * 0.008, on: -1, x: 0, y: 0,
        })),
        parts: Array.from({ length: 3 }, (_, k) => ({ u: r(), v: 0.05 + r() * 0.07, big: k === 0 })),
        br: Array.from({ length: 1 + ((r() * 2) | 0) }, () => { const u1 = 0.12 + r() * 0.4; return { u1, u2: Math.min(0.92, u1 + 0.2 + r() * 0.2), amp: 12 + r() * 20, sg: r() < 0.5 ? -1 : 1 }; }),
        pts: [], arrivedAt: -1, head: 0,
      };
    });
    const FN = V.farN;
    this.F = Array.from({ length: FN }, (_, i) => ({
      i, j: Array.from({ length: 6 }, r), kind: ['L', 'B', 'R', 'B', 'L', 'B'][i % 6], v: r(),
      t0: r() * 0.5, dur: 0.4 + r() * 0.35, w: 1.45 + r() * 0.4, al: 0.14 + r() * 0.12, amp: 4 + r() * 10, ph: r() * TAU, sp: 0.08 + r() * 0.16, col: V.far[i % V.far.length],
      nodes: Array.from({ length: 2 + ((r() * 3) | 0) }, () => ({ u: 0.1 + r() * 0.75, rad: 0.5 + r() * 1.0, a: 0.3 + r() * 0.5, ph: r() * TAU, dr: 0.003 + r() * 0.006, on: -1 })),
      parts: [{ u: r(), v: 0.03 + r() * 0.04 }], pts: [], head: 0,
    }));
    // 汇集点散出又回流的细弧（朝两侧，不朝上/下，避免与人物领口、按钮重叠）
    this.arcs = Array.from({ length: 5 }, (_, i) => ({ ang: (i % 2 ? Math.PI : 0) + (r() - 0.5) * 0.6, len: 60 + r() * 70, bend: (r() - 0.5) * 50, per: 3.2 + r() * 2.4, off: r() * 5, col: V.main[i % V.main.length] }));
    this._loop = this._loop.bind(this);
  }
  resize() {
    this.dpr = Math.min(this.maxDpr, devicePixelRatio || 1);
    const b = this.cv.getBoundingClientRect(); this.W = Math.max(1, b.width); this.H = Math.max(1, b.height);
    this.cv.width = Math.round(this.W * this.dpr); this.cv.height = Math.round(this.H * this.dpr);
    const { W, H } = this, P = [W * this.px, H * this.py], N = 90, k = W / 1440;
    this.sc = Math.min(1.5, Math.max(0.85, k));   // 线宽随屏宽缩放
    this.rects = this.avoid ? this.avoid(W, H) : [];
    for (const s of this.S) {
      const [a, b2, c, d] = s.j, sp = STARTS[s.i % STARTS.length]; let way;
      if (sp.k === 'L') {
        const y0 = Math.min(0.8, sp.v + (a - 0.5) * 0.08), p0 = [-W * 0.01, H * y0];
        way = [p0, [W * (0.05 + b2 * 0.06), H * Math.min(0.9, y0 + 0.14 + c * 0.06)], [W * (0.2 + d * 0.1), H * (0.865 + a * 0.05)], [W * (0.37 + b2 * 0.05), P[1] + H * (c - 0.5) * 0.05], P];
      } else {
        const x0 = sp.v + (a - 0.5) * 0.06, p0 = [W * x0, H * 0.96];
        way = [p0, [W * (x0 + (0.42 - x0) * (0.3 + b2 * 0.2)), H * (0.915 - c * 0.03)], [W * (x0 < 0.5 ? 0.33 + d * 0.08 : 0.64 + d * 0.06), P[1] + H * (c - 0.3) * 0.05], P];
      }
      s.pts = catmull(way, N); repel(s.pts, this.rects);
      // 分叉再汇合的细支线：沿主线法向鼓出一个“眼”；若鼓出的一侧会进入避让框就换边，两边都不行则取消
      s.brOk = s.br.map((q) => {
        for (const sg of [q.sg, -q.sg]) {
          let ok = true;
          for (let u = q.u1; u <= q.u2 + 1e-6; u += 0.02) { const p = this._branchAt(s, q, u, 0, sg, k); if (inside(p, this.rects)) { ok = false; break; } }
          if (ok) return sg;
        }
        return 0;
      });
    }
    for (const f of this.F) {
      const [a, b2, c, d, e] = f.j; let way;
      const end = [P[0] + (c - 0.5) * W * 0.16, P[1] + (d - 0.2) * H * 0.04 + 2];
      if (f.kind === 'L') { const y0 = 0.3 + f.v * 0.62; way = [[-W * 0.01, H * y0], [W * (0.08 + a * 0.1), H * Math.min(0.92, y0 + 0.1)], [W * (0.22 + b2 * 0.12), H * (0.84 + e * 0.1)], end]; }
      else if (f.kind === 'R') { const y0 = 0.55 + f.v * 0.38; way = [[W * 1.01, H * y0], [W * (0.9 - a * 0.08), H * Math.min(0.94, y0 + 0.05)], [W * (0.68 - b2 * 0.1), H * (0.86 + e * 0.08)], end]; }
      else { const x0 = 0.04 + f.v * 0.92; way = [[W * x0, H * 0.96], [W * (x0 + (0.5 - x0) * (0.3 + a * 0.2)), H * (0.92 - b2 * 0.03)], [W * (x0 < 0.5 ? 0.3 + d * 0.1 : 0.66 + d * 0.08), H * (0.87 + e * 0.05)], end]; }
      const m = f.amp + 8; f.pts = catmull(way, 60); repel(f.pts, this.rects.map(([a, b, c2, d2]) => [a - m, b - m, c2 + m, d2 + m]));   // 远景线按摆动幅度多留边距，游移时也不进入避让框
    }
  }
  setGrow(g) { this.grow = g; }
  setGlow(v) { this.glow = v; }
  start() { if (this.running) return; this.running = true; this.last = 0; this.raf = requestAnimationFrame(this._loop); }
  stop() { this.running = false; cancelAnimationFrame(this.raf); this.raf = 0; }
  destroy() { this.stop(); }
  _loop(now) {
    if (!this.running) return;
    const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 0.016; this.last = now;
    this._slow = this._slow * 0.96 + (dt > 0.045 ? 0.04 : 0); this.lite = this._slow > 0.5 ? true : this.lite && this._slow > 0.2;   // 持续掉帧 → 精简（不画连线/一半远景线）
    this.frame((now - this.t0) / 1000, dt); this.raf = requestAnimationFrame(this._loop);
  }
  _sprite(rgb) {   // 预渲染的发光球（白芯 + 着色晕），用 drawImage 缩放绘制，避免每帧创建大量渐变
    const key = rgb.join(','); let s = this._sprites.get(key); if (s) return s;
    s = document.createElement('canvas'); s.width = s.height = 96; const g = s.getContext('2d'), [R, G, B] = rgb, gr = g.createRadialGradient(48, 48, 0, 48, 48, 48);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,252,242,.95)'); gr.addColorStop(0.3, `rgba(${R},${Math.min(255, G + 40)},${Math.min(255, B + 60)},.5)`);
    gr.addColorStop(0.6, `rgba(${R},${G},${B},.15)`); gr.addColorStop(1, `rgba(${R},${G},${B},0)`); g.fillStyle = gr; g.fillRect(0, 0, 96, 96);
    this._sprites.set(key, s); return s;
  }
  _orb(c, x, y, r, rgb, a) { if (a <= 0.01) return; c.globalAlpha = Math.min(1, a); c.drawImage(this._sprite(rgb), x - r * 4, y - r * 4, r * 8, r * 8); c.globalAlpha = 1; }
  _at(s, u, t) {   // 路径上 u 处的点（叠一个各线独立、缓慢的垂向偏移，两端为 0）
    const n = s.pts.length - 1, k = Math.min(n - 1, Math.floor(u * n)), f = u * n - k, a = s.pts[k], b = s.pts[k + 1];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const w = (Math.sin(u * 9 + t * s.sp + s.ph) * 0.65 + Math.sin(u * 4.3 - t * s.sp * 0.7 + s.ph * 2) * 0.35) * s.amp * Math.sin(Math.PI * u);
    return [a[0] + dx * f - dy / L * w, a[1] + dy * f + dx / L * w];
  }
  _branchAt(s, q, u, t, sg, k = 1) {   // 支线上 u 处的点：主线点 + 法向鼓出（半个正弦，两端回到主线）
    const p = this._at(s, u, t), p2 = this._at(s, Math.min(1, u + 0.01), t), dx = p2[0] - p[0], dy = p2[1] - p[1], L = Math.hypot(dx, dy) || 1;
    const e = Math.sin(Math.PI * Math.min(1, Math.max(0, (u - q.u1) / (q.u2 - q.u1)))) * q.amp * k * sg;
    return [p[0] - dy / L * e, p[1] + dx / L * e];
  }
  frame(t, dt) {
    const c = this.ctx, d = this.dpr, V = VARIANTS[this.variant]; if (!this.W) return;
    this.frames++;
    c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, this.W, this.H);
    c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round';
    const g = this.grow, X = this.W * this.px, Y = this.H * this.py, k = this.W / 1440, lite = this.lite, sc = this.sc;
    // ---- 远景细线（纵深）：更细更暗，近 P 处淡出；只有微尘小节点
    for (let fi = 0; fi < this.F.length; fi++) {
      if (lite && fi % 2) continue;
      const f = this.F[fi], q = (g - f.t0) / f.dur; if (q <= 0) continue;
      const u = q < 1 ? sstep(q) : 1; if (u <= 0.003) continue; f.head = u;
      const N = Math.max(6, Math.ceil(u * 48)), breath = 0.8 + 0.2 * Math.sin(t * 0.5 + f.ph), rgb = f.col;
      const p = new Path2D(); for (let i = 0; i <= N; i++) { const pt = this._at(f, (i / N) * u, t); if (i) p.lineTo(pt[0], pt[1]); else p.moveTo(pt[0], pt[1]); }
      c.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${f.al * breath})`; c.lineWidth = f.w * sc; c.stroke(p);
      for (const o of f.nodes) { const uu = o.u + Math.sin(t * 0.22 + o.ph) * o.dr; if (uu > u) continue; if (o.on < 0) o.on = t; const pt = this._at(f, uu, t); this._orb(c, pt[0], pt[1], o.rad * (1 + 0.8 * Math.exp(-(t - o.on) * 2.5)), rgb, o.a * 0.55 * (0.7 + 0.3 * Math.sin(t * 0.8 + o.ph))); }
      for (const pa of f.parts) { pa.u += pa.v * dt; if (pa.u > f.head) pa.u = 0; if (pa.u > 0.02) { const pt = this._at(f, pa.u, t); this._orb(c, pt[0], pt[1], 0.9, rgb, 0.35); } }
    }
    // ---- 主线
    const lit = [];
    for (const s of this.S) {
      const q = (g - s.t0) / s.dur; if (q <= 0) continue;
      const u = Math.min(1, q < 1 ? sstep(q * 0.5 + 0.5 * sstep(q)) : 1) || 0; if (u <= 0.002) continue; s.head = u;
      const rgb = s.col, breath = 0.86 + 0.14 * Math.sin(t * 0.6 + s.ph), p = new Path2D(); let first = true;
      const N = Math.max(8, Math.ceil(u * 90));
      for (let i = 0; i <= N; i++) { const pt = this._at(s, (i / N) * u, t); if (first) { p.moveTo(pt[0], pt[1]); first = false; } else p.lineTo(pt[0], pt[1]); }
      c.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${s.al * 0.85 * breath})`; c.lineWidth = s.w * sc; c.stroke(p);
      c.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${s.al * 0.14 * breath})`; c.lineWidth = s.w * sc + 5; c.stroke(p);
      // 分叉再汇合的细支线
      s.br.forEach((bq, bi) => {
        const sg = s.brOk?.[bi]; if (!sg || u < bq.u2) return;
        const grow = sstep((u - bq.u2) / 0.1), bp = new Path2D(), m = 24;
        let previous = null;
        for (let i = 0; i <= m; i++) {
          const pt = this._branchAt(s, bq, bq.u1 + (bq.u2 - bq.u1) * (i / m), t, sg * grow, k);
          if (inside(pt, this.rects) || previous && crosses(previous, pt, this.rects)) return;
          if (i) bp.lineTo(pt[0], pt[1]); else bp.moveTo(pt[0], pt[1]);
          previous = pt;
        }
        c.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${s.al * 0.55 * breath})`; c.lineWidth = 1.5 * sc; c.stroke(bp);
      });
      // 节点：线头经过时依次亮起；十字星芒 + 光环（较大的节点）；缓慢漂移与呼吸
      for (const o of s.nodes) {
        const uu = o.u + Math.sin(t * 0.3 + o.ph) * o.dr;
        if (uu > u) continue;
        if (o.on < 0) o.on = t;
        const age = t - o.on, pop = 1 + 1.1 * Math.exp(-age * 3.2), tw = 0.78 + 0.22 * Math.sin(t * 0.9 + o.ph), aa = o.a * tw * Math.min(1, age * 6 + 0.3);
        const pt = this._at(s, Math.min(1, uu), t); o.x = pt[0]; o.y = pt[1]; o.aa = aa; o.col = rgb; lit.push(o);
        this._orb(c, pt[0], pt[1], o.rad * pop, rgb, aa);
        if (o.rad > 2.1 && !lite) {
          const L = o.rad * (5 + 3 * Math.exp(-age * 1.5)) * Math.max(0.8, k), al = 0.32 * aa;
          c.strokeStyle = `rgba(255,226,184,${al})`; c.lineWidth = 1.2 * sc; c.beginPath(); c.moveTo(pt[0] - L, pt[1]); c.lineTo(pt[0] + L, pt[1]); c.moveTo(pt[0], pt[1] - L * 0.8); c.lineTo(pt[0], pt[1] + L * 0.8); c.stroke();
          if (o.rad > 3) { c.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${0.18 * aa * (0.7 + 0.3 * Math.sin(t * 1.3 + o.ph))})`; c.lineWidth = 1.2 * sc; c.beginPath(); c.arc(pt[0], pt[1], o.rad * 3 + 2 * Math.sin(t * 0.8 + o.ph), 0, TAU); c.stroke(); }
        }
      }
      // 沿线流动的亮粒子（含一个较大的流光脉冲）
      for (const pa of s.parts) {
        pa.u += pa.v * dt * (pa.big ? 1.6 : 1); if (pa.u > u) pa.u = 0;
        if (pa.u > 0.01) {
          const pt = this._at(s, pa.u, t), e = Math.min(sstep(pa.u * 8), sstep((u - pa.u) * 8));
          if (pa.big) { for (let z = 1; z <= 4; z++) { const tp = this._at(s, Math.max(0, pa.u - z * 0.012), t); this._orb(c, tp[0], tp[1], 1.1, rgb, 0.28 * e * (1 - z / 5)); } this._orb(c, pt[0], pt[1], 1.9, rgb, 0.8 * e); }
          else this._orb(c, pt[0], pt[1], 0.95, rgb, 0.45 * e);
        }
      }
      if (u < 0.999) { const h = this._at(s, u, t); this._orb(c, h[0], h[1], 1.9, rgb, 0.95); }
      else if (s.arrivedAt < 0) { s.arrivedAt = t; this.arrived++; this.flash = 1; this.events.push({ t0: t, col: rgb }); }
    }
    // ---- 星座式细连线：相近的亮节点之间
    if (!lite && V.link > 0) {
      const R = this.W * 0.115, R2 = R * R;
      for (let i = 0; i < lit.length; i++) for (let j = i + 1; j < lit.length; j++) {
        const a = lit[i], b = lit[j]; if (a.col === b.col && a.rad < 1.6 && b.rad < 1.6) continue;
        const dx = a.x - b.x, dy = a.y - b.y, dd = dx * dx + dy * dy; if (dd > R2 || dd < (this.W * 0.02) ** 2) continue;
        if (crosses([a.x, a.y], [b.x, b.y], this.rects)) continue;
        const al = V.link * (1 - Math.sqrt(dd) / R) * Math.min(a.aa, b.aa) * (0.7 + 0.3 * Math.sin(t * 0.7 + i));
        c.strokeStyle = `rgba(${(a.col[0] + b.col[0]) >> 1},${(a.col[1] + b.col[1]) >> 1},${(a.col[2] + b.col[2]) >> 1},${al})`; c.lineWidth = 1.2 * sc; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
      }
    }
    // ---- 汇集点：多层冲击光环 + 持续呼吸
    this.flash *= Math.exp(-dt / 0.3);
    const acc = this.arrived / this.S.length, gl = Math.max(this.glow * sstep((g - 0.7) / 0.3), 0), base = acc * 0.45 + gl * 0.5, br = 1 + 0.12 * Math.sin(t * 1.7) + 0.06 * Math.sin(t * 0.9);
    if (base > 0.01 || this.flash > 0.01) {
      this._orb(c, X, Y, (4 + acc * 3 + gl * 4) * br + this.flash * 9, [255, 188, 108], Math.min(1, 0.35 + base * 0.5 + this.flash * 0.7));
      this._orb(c, X, Y, (22 + acc * 18) * k * br, [255, 170, 96], 0.1 + base * 0.12);                  // 外圈暖晕，缓慢呼吸
    }
    this.events = this.events.filter((e) => t - e.t0 < 2);
    for (const e of this.events) {
      const a = t - e.t0, r1 = a / 1.1, r2 = a / 1.9, [R, G, B] = e.col;
      if (r1 < 1) { c.strokeStyle = `rgba(${R},${G},${B},${(1 - r1) * 0.6})`; c.lineWidth = 2.1 * sc; c.beginPath(); c.arc(X, Y, 6 + r1 * 52 * k, 0, TAU); c.stroke(); }
      if (r2 < 1) { c.strokeStyle = `rgba(255,214,160,${(1 - r2) * 0.3})`; c.lineWidth = 1.5 * sc; c.beginPath(); c.arc(X, Y, 4 + sstep(r2) * 120 * k, 0, TAU); c.stroke(); }
      if (a < 0.5) { const f = 1 - a / 0.5; c.strokeStyle = `rgba(255,226,184,${0.55 * f})`; c.lineWidth = 1 * sc; c.beginPath(); for (let i = 0; i < 10; i++) { const an = (i / 10) * TAU + e.t0, r0 = 8 + a * 40, r1b = r0 + 14 * f * k; c.moveTo(X + Math.cos(an) * r0, Y + Math.sin(an) * r0); c.lineTo(X + Math.cos(an) * r1b, Y + Math.sin(an) * r1b); } c.stroke(); }
      if (a < 0.35) { const f = 1 - a / 0.35; c.strokeStyle = `rgba(255,224,180,${0.5 * f})`; c.lineWidth = 1.1 * sc; c.beginPath(); c.moveTo(X - 70 * k * (1 - f * 0.4), Y); c.lineTo(X + 70 * k * (1 - f * 0.4), Y); c.stroke(); }
    }
    if (gl > 0.01) for (const off of [0, 1.3]) { const ph = ((t + off) % 2.6) / 2.6; c.strokeStyle = `rgba(255,190,120,${(1 - ph) * 0.3 * gl})`; c.lineWidth = 1.3 * sc; c.beginPath(); c.arc(X, Y, 10 + ph * 70 * k, 0, TAU); c.stroke(); }
    // ---- 汇聚后的细弧：从汇集点向两侧散出再回流
    if (acc > 0.99 && !lite) for (const a of this.arcs) {
      const ph = ((t + a.off) % a.per) / a.per, ext = Math.sin(Math.PI * ph) ** 1.4, L = a.len * k * ext; if (L < 3) continue;
      const ca = Math.cos(a.ang), sa = Math.sin(a.ang), bx = -sa * a.bend * k * ext, by = ca * a.bend * k * ext;
      const ex = X + ca * L + bx, ey = Y + sa * L * 0.5 + by;
      c.strokeStyle = `rgba(${a.col[0]},${a.col[1]},${a.col[2]},${0.34 * ext})`; c.lineWidth = 1.7 * sc; c.beginPath(); c.moveTo(X, Y); c.quadraticCurveTo(X + ca * L * 0.5 + bx * 1.4, Y + sa * L * 0.2 + by * 1.4, ex, ey); c.stroke();
      this._orb(c, ex, ey, 1.2, a.col, 0.55 * ext);
    }
    c.globalCompositeOperation = 'source-over';
  }
}
