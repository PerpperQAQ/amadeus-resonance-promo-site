/**
 * 2D canvas 粒子场（仿《明日方舟》源石像素点）：图片按规则网格采样成方点，
 * 亮度 = 色调 + 边缘，颜色全部取红莉栖发色系（暗 → #A6562F → #CC6E42 → 高光），没有白/灰点。
 * 形状之间按序号对应做 smoothstep 变形；指针附近的点被推开（弹簧回位）；离屏 stop() 即零开销。
 */
const PAL = [[96, 48, 26], [130, 66, 36], [166, 86, 47], [190, 104, 62], [204, 110, 66], [222, 142, 100], [240, 178, 140]];
const STY = PAL.map(([r, g, b]) => `rgb(${r},${g},${b})`);
const cache = new Map();
function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
/**
 * 采样：返回 n 个点 [x, y, l]（x/y ∈ [-.5,.5]，l ∈ [0,1] 亮度；l < 0 表示该点隐藏）与网格步长 pts.step。
 * opts.edge：边缘权重（0–1）；opts.gamma：色调曲线；opts.invert：暗部更亮（剪影类）。
 */
export function sample(src, n, { size = 360, minA = 110, edge = .55, gamma = .9, invert = false } = {}) {
  const key = [src, n, size, edge, gamma, invert].join('|');
  if (cache.has(key)) return cache.get(key);
  const p = new Promise((res, rej) => {
    const img = new Image(); img.decoding = 'async';
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = size;
      const x = c.getContext('2d', { willReadFrequently: true });
      const w = img.naturalWidth || size, h = img.naturalHeight || size, k = Math.min((size - 4) / w, (size - 4) / h);
      x.drawImage(img, (size - w * k) / 2, (size - h * k) / 2, w * k, h * k);
      const d = x.getImageData(0, 0, size, size).data;
      const L = new Float32Array(size * size), A = new Uint8Array(size * size);
      let inside = 0;
      for (let i = 0; i < size * size; i++) { A[i] = d[i * 4 + 3]; L[i] = (d[i * 4] * .3 + d[i * 4 + 1] * .59 + d[i * 4 + 2] * .11) / 255; if (A[i] >= minA) inside++; }
      const at = (xx, yy) => { xx = Math.max(0, Math.min(size - 1, xx)); yy = Math.max(0, Math.min(size - 1, yy)); const i = yy * size + xx; return A[i] < minA ? 0 : L[i]; };
      // 网格步长：让网格点数略多于 n，再均匀抽取
      const step = Math.max(1, Math.sqrt(inside / (n * 1.05)));
      const cells = [];
      for (let yy = step / 2; yy < size; yy += step) for (let xx = step / 2; xx < size; xx += step) {
        const ix = Math.floor(xx), iy = Math.floor(yy), i = iy * size + ix;
        if (A[i] < minA) continue;
        const gx = at(ix + 1, iy) - at(ix - 1, iy), gy = at(ix, iy + 1) - at(ix, iy - 1);
        const e = Math.min(1, Math.hypot(gx, gy) * 2.2);
        let t = Math.pow(L[i], gamma); if (invert) t = 1 - t;
        cells.push([(xx - size / 2) / size, (yy - size / 2) / size, Math.min(1, t * (1 - edge) + e * edge + .08)]);
      }
      const out = [];
      if (cells.length >= n) { const s = cells.length / n; for (let i = 0; i < n; i++) out.push(cells[Math.floor(i * s)]); }
      else { out.push(...cells); const r = rnd(cells.length); while (out.length < n) { const q = cells[Math.floor(r() * cells.length)] || [0, 0, 0]; out.push([q[0], q[1], -1]); } }
      // 打乱序号，让变形时点从四面八方汇入而不是整片平移
      const r = rnd(n * 7 + 1); for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
      out.step = step / size;
      res(out);
    };
    img.onerror = rej; img.src = src;
  });
  cache.set(key, p); return p;
}
export class Field {
  constructor(canvas, { n = 3000, reduced = false, repel = false } = {}) {
    this.cv = canvas; this.ctx = canvas.getContext('2d'); this.n = n; this.reduced = reduced;
    const r = rnd(7);
    this.p = Array.from({ length: n }, () => ({ x: r() - .5, y: r() - .5, ox: 0, oy: 0, tx: 0, ty: 0, l: .4, ol: .4, tl: .4, ph: r() * 6.28, rx: 0, ry: 0, vx: 0, vy: 0 }));
    this.p.forEach((q) => { q.ox = q.tx = q.x; q.oy = q.ty = q.y; });
    this.t0 = 0; this.dur = 900; this.alpha = 1; this.cx = .5; this.cy = .5; this.scale = .6; this.raf = 0; this.on = false; this.spread = 0;
    this.tcx = null; this.tscale = null;
    this.step = .012; this.ostep = .012; this.tstep = .012;
    this.motes = Array.from({ length: 30 }, () => ({ x: r(), y: r(), v: .2 + r() * .6, a: .1 + r() * .3 }));
    this.mouse = null; this.R = 100; this.lastT = 0;
    if (repel) {
      canvas.addEventListener('pointermove', (e) => { const b = canvas.getBoundingClientRect(); this.mouse = [e.clientX - b.left, e.clientY - b.top]; this.kick(); });
      canvas.addEventListener('pointerleave', () => { this.mouse = null; });
    }
  }
  /** 外部（例如上层元素挡住画布时）直接喂指针坐标（视口坐标） */
  pointer(cx, cy) { const b = this.cv.getBoundingClientRect(); this.mouse = cx == null ? null : [cx - b.left, cy - b.top]; this.kick(); }
  kick() { if (this.on && !this.raf) this.raf = requestAnimationFrame((t) => this._draw(t)); }
  to(pts, dur = 900) {
    const now = performance.now();
    for (let i = 0; i < this.n; i++) { const q = this.p[i], [x, y, l] = pts[i]; this._cur(q, now); q.ox = q.x; q.oy = q.y; q.ol = q.l; q.tx = x; q.ty = y; q.tl = l; }
    this.ostep = this.step; this.tstep = pts.step || .012;
    this.t0 = now; this.dur = this.reduced ? 1 : dur; this.spread = 0; this.start();
  }
  scatter(dur = 800) {
    const now = performance.now(), r = rnd(3);
    for (const q of this.p) { this._cur(q, now); q.ox = q.x; q.oy = q.y; q.ol = q.tl = q.l; const a = Math.atan2(q.y, q.x) + (r() - .5), d = .6 + r() * .9; q.tx = q.x + Math.cos(a) * d; q.ty = q.y + Math.sin(a) * d; }
    this.t0 = now; this.dur = this.reduced ? 1 : dur; this.spread = 1; this.start();
  }
  _e(now) { const m = Math.min(1, (now - this.t0) / this.dur); return m * m * (3 - 2 * m); }
  _cur(q, now) { const e = this._e(now); q.x = q.ox + (q.tx - q.ox) * e; q.y = q.oy + (q.ty - q.oy) * e; q.l = q.ol + (q.tl - q.ol) * e; }
  start() { this.on = true; this.kick(); }
  stop() { this.on = false; cancelAnimationFrame(this.raf); this.raf = 0; }
  _draw(now) {
    this.raf = 0; if (!this.on) return;
    const cv = this.cv, dpr = Math.min(devicePixelRatio, 1.5), W = cv.clientWidth, H = cv.clientHeight;
    if (!W || !H) return;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const dt = Math.min(48, now - (this.lastT || now)) / 16.7; this.lastT = now;
    const ease = 1 - Math.pow(1 - .08, dt);
    if (this.tcx != null) this.cx += (this.tcx - this.cx) * ease;
    if (this.tscale != null) this.scale += (this.tscale - this.scale) * ease;
    const x = this.ctx; x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
    const e = this._e(now), S = Math.min(W, H) * this.scale, cx = W * this.cx, cy = H * this.cy, t = this.reduced ? 0 : now / 1000;
    const fade = this.spread ? 1 - e : 1;
    this.step = this.ostep + (this.tstep - this.ostep) * e;
    const dot = Math.max(1.2, this.step * S * .62);
    const buckets = PAL.map(() => []);
    const m = this.mouse, R = this.R, R2 = R * R;
    let springy = false;
    for (const q of this.p) {
      const px = q.ox + (q.tx - q.ox) * e, py = q.oy + (q.ty - q.oy) * e, l = q.ol + (q.tl - q.ol) * e;
      if (l < 0 && q.tl < 0 && e >= 1) continue;
      const dx = Math.sin(t * .9 + q.ph) * .0016, dy = Math.cos(t * .7 + q.ph * 1.3) * .0016;
      let sx = cx + (px + dx) * S, sy = cy + (py + dy) * S;
      if (!this.reduced) {
        if (m) { const ddx = sx + q.rx - m[0], ddy = sy + q.ry - m[1], d2 = ddx * ddx + ddy * ddy; if (d2 < R2 && d2 > .01) { const d = Math.sqrt(d2), f = (1 - d / R) * (1 - d / R) * 1.1 * dt; q.vx += ddx / d * f; q.vy += ddy / d * f; } }
        if (q.rx || q.ry || q.vx || q.vy) {
          q.vx += -q.rx * .06 * dt; q.vy += -q.ry * .06 * dt; q.vx *= Math.pow(.84, dt); q.vy *= Math.pow(.84, dt); q.rx += q.vx * dt; q.ry += q.vy * dt;
          if (Math.abs(q.rx) + Math.abs(q.ry) + Math.abs(q.vx) + Math.abs(q.vy) < .05) q.rx = q.ry = q.vx = q.vy = 0; else springy = true;
        }
        sx += q.rx; sy += q.ry;
      }
      const ll = Math.max(0, l) * fade * this.alpha;
      if (ll <= .02) continue;
      const bi = Math.min(PAL.length - 1, Math.floor(ll * PAL.length));
      buckets[bi].push(sx, sy);
    }
    const h = dot / 2;
    for (let b = 0; b < PAL.length; b++) {
      const arr = buckets[b]; if (!arr.length) continue;
      x.fillStyle = STY[b]; x.globalAlpha = .45 + .55 * (b / (PAL.length - 1));
      for (let i = 0; i < arr.length; i += 2) x.fillRect(arr[i] - h, arr[i + 1] - h, dot, dot);
    }
    x.globalAlpha = 1;
    if (!this.spread) for (const mo of this.motes) {
      const yy = ((mo.y - t * .01 * mo.v) % 1 + 1) % 1;
      x.fillStyle = `rgba(204,110,66,${mo.a * (.5 + .5 * Math.sin(t + mo.x * 9))})`;
      x.fillRect(mo.x * W, yy * H, 1.6, 1.6);
    }
    const moving = now - this.t0 < this.dur + 50 || springy || (this.tcx != null && Math.abs(this.tcx - this.cx) > .001);
    if (!this.reduced || moving) this.raf = requestAnimationFrame((tt) => this._draw(tt));
  }
}
