/**
 * 人物背后的“共振光环”（Canvas 2D，多层）：
 *  ① 底部柔光  ② 不同转速的同心刻度环（慢/快/反向）  ③ 断弧环  ④ 世界线弧线（缓慢扫过、末端带红点）
 *  ⑤ 细碎粒子（环绕飘移、闪烁）  ⑥ 脉冲波（随表情/动作触发向外扩散）
 * 只在可见时运行；配色随世界线（琥珀 / 青）切换。
 */
export class Halo {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.pal = { a: [255, 174, 46], b: [216, 54, 44] };
    this.active = false; this.raf = 0; this.last = 0; this.t = 0;
    this.pulses = [];
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.parts = Array.from({ length: 64 }, (_, i) => ({
      a: Math.random() * Math.PI * 2, r: 0.42 + Math.random() * 0.62, s: (Math.random() - 0.5) * 0.18,
      z: 0.6 + Math.random() * 1.4, tw: Math.random() * 6, drift: (Math.random() - 0.5) * 0.02,
    }));
    this._loop = this._loop.bind(this);
    this.resize();
  }
  setPalette(a, b) { this.pal = { a, b }; if (!this.active) this._draw(0); }
  resize() {
    const dpr = Math.min(1.5, devicePixelRatio || 1);
    const w = Math.max(2, Math.round(this.cv.clientWidth * dpr)), h = Math.max(2, Math.round(this.cv.clientHeight * dpr));
    if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; }
    this.dpr = dpr;
    this._glow = null;
    if (!this.active) this._draw(0);
  }
  setActive(on) {
    if (on === this.active) return;
    this.active = on;
    if (on && !this.reduce) { this.last = performance.now(); this.raf = requestAnimationFrame(this._loop); }
    else { cancelAnimationFrame(this.raf); this.raf = 0; if (on) this._draw(0); }
  }
  /** 触发一次向外扩散的脉冲（strength 0–1） */
  pulse(strength = 0.7) { this.pulses.push({ t0: this.t, s: strength }); if (this.pulses.length > 5) this.pulses.shift(); if (!this.active || this.reduce) this._draw(0); }
  _loop(now) {
    this.raf = 0;
    if (!this.active) return;
    const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now; this.t += dt;
    this._draw(dt);
    this.raf = requestAnimationFrame(this._loop);
  }
  _glowImg(R) {
    if (this._glow && this._glowR === R) return this._glow;
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'); const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(0.35, 'rgba(255,255,255,.16)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    this._glow = c; this._glowR = R; return c;
  }
  _draw() {
    const { ctx, cv } = this, W = cv.width, H = cv.height, t = this.t;
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2;
    const [ar, ag, ab] = this.pal.a, [br, bg, bb] = this.pal.b;
    const A = (al) => `rgba(${ar},${ag},${ab},${al})`, B = (al) => `rgba(${br},${bg},${bb},${al})`;
    const lw = Math.max(1, this.dpr);

    // ① 底部柔光（用预渲染灰度光斑 + 着色）
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 + 0.08 * Math.sin(t * 0.9);
    const gi = this._glowImg(R);
    ctx.drawImage(gi, cx - R * 0.95, cy - R * 0.95, R * 1.9, R * 1.9);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = A(0.0); ctx.restore();
    // 着色柔光：直接画一层径向渐变（颜色可变）
    const rg = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 0.95);
    rg.addColorStop(0, A(0.16)); rg.addColorStop(0.55, A(0.06)); rg.addColorStop(1, A(0));
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(cx, cy, R * 0.95, 0, Math.PI * 2); ctx.fill();

    // ② 同心刻度环
    const ticks = (r, n, len, rot, alpha, every = 0, longMul = 2) => {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a = rot + (i / n) * Math.PI * 2, L = every && i % every === 0 ? len * longMul : len;
        const c = Math.cos(a), s = Math.sin(a);
        ctx.moveTo(cx + c * r, cy + s * r); ctx.lineTo(cx + c * (r + L), cy + s * (r + L));
      }
      ctx.strokeStyle = A(alpha); ctx.lineWidth = lw; ctx.stroke();
    };
    ticks(R * 0.5, 72, R * 0.018, t * 0.28, 0.32, 6, 2.2);                // 内圈：较快
    ticks(R * 0.66, 120, R * 0.016, -t * 0.07, 0.34, 10, 2.6);            // 中圈：慢、反向
    ticks(R * 0.84, 180, R * 0.012, t * 0.035, 0.22, 15, 2.8);             // 外圈：最慢
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.6, 0, Math.PI * 2); ctx.strokeStyle = A(0.22); ctx.lineWidth = lw; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.9, 0, Math.PI * 2); ctx.strokeStyle = A(0.12); ctx.stroke();

    // ③ 断弧环
    const arcs = [[R * 0.74, t * 0.12, [0.0, 0.9, 1.9, 2.5, 3.6, 5.1], 0.5, 2.2], [R * 0.57, -t * 0.19, [0.4, 1.1, 2.9, 3.4], 0.4, 1.6]];
    for (const [r, rot, seg, al, w] of arcs) {
      for (let i = 0; i < seg.length; i += 2) {
        ctx.beginPath(); ctx.arc(cx, cy, r, rot + seg[i], rot + seg[i + 1] );
        ctx.strokeStyle = A(al); ctx.lineWidth = w * lw; ctx.lineCap = 'butt'; ctx.stroke();
      }
    }

    // ④ 世界线弧线：缓慢扫过，末端红点
    for (let k = 0; k < 3; k++) {
      const r = R * (0.7 + k * 0.1), a0 = t * (0.16 + k * 0.05) + k * 2.1, span = 0.9 + 0.5 * Math.sin(t * 0.4 + k);
      const g = ctx.createLinearGradient(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, cx + Math.cos(a0 + span) * r, cy + Math.sin(a0 + span) * r);
      g.addColorStop(0, A(0)); g.addColorStop(1, A(0.75));
      ctx.beginPath(); ctx.arc(cx, cy, r, a0, a0 + span); ctx.strokeStyle = g; ctx.lineWidth = (1.2 + k * 0.5) * lw; ctx.stroke();
      const ex = cx + Math.cos(a0 + span) * r, ey = cy + Math.sin(a0 + span) * r;
      ctx.beginPath(); ctx.arc(ex, ey, (2.2 + (k === 1 ? 1.2 : 0)) * lw, 0, Math.PI * 2); ctx.fillStyle = k === 1 ? B(0.95) : A(0.9); ctx.fill();
    }

    // ⑤ 粒子
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of this.parts) {
      p.a += p.s * 0.016 * (this.reduce ? 0 : 1);
      p.r += p.drift * 0.016; if (p.r > 1.08) p.r = 0.42; if (p.r < 0.4) p.r = 1.05;
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.8 + p.tw));
      const x = cx + Math.cos(p.a) * R * p.r, y = cy + Math.sin(p.a) * R * p.r;
      ctx.fillStyle = A(0.55 * tw);
      ctx.fillRect(x - p.z * lw * 0.5, y - p.z * lw * 0.5, p.z * lw, p.z * lw);
    }
    ctx.restore();

    // ⑥ 脉冲波
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i], u = (t - p.t0) / 1.25;
      if (u > 1 || u < 0) { if (u > 1) this.pulses.splice(i, 1); continue; }
      const e = 1 - Math.pow(1 - u, 3);
      ctx.beginPath(); ctx.arc(cx, cy, R * (0.42 + 0.62 * e), 0, Math.PI * 2);
      ctx.strokeStyle = A(0.55 * p.s * (1 - u)); ctx.lineWidth = (3.2 - 2 * u) * lw; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R * (0.4 + 0.5 * e), 0, Math.PI * 2);
      ctx.strokeStyle = B(0.28 * p.s * (1 - u)); ctx.lineWidth = lw; ctx.stroke();
    }
  }
}
