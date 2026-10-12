/**
 * 空间撕裂（世界线变动的前半段，第六轮）。
 * 依据：对原片六个特效区间用 ffmpeg 高密度抽帧（.tmp/wl-tear/，12fps）实看——原片并没有“硬矩形切片”，
 * 而是：横向冲糊 + 多层偏移残影 → 青绿高亮 → 棕褐/蓝黑色阶失稳 → 竖向拖糊（白亮拉长）→ 约 83ms 黑帧 → 蓝青人影 + 深蓝交叉长波。
 * 用户要求更强的“空间被撕开”冲击力，所以这里把上述连续扭曲用“切片位移 + 裂缝 + 残影”的方式夸张表达（近似，非原片做法）：
 *   对页面主要视觉层做快照（当前章节底图 + E-mote 画布，同一张 2D 画布），再逐帧切成横向条带位移、
 *   沿一条锯齿裂缝向两侧拉开，裂缝后露出深蓝色异空间与交叉正弦波；随后竖向拉伸、黑帧、蓝青人影。
 * 全程由一条时间轴 t（秒）驱动，Canvas 2D，约 22 条切片 + 少量残影，无需 WebGL。
 * 页面文字不在快照里：它保留 IBM 5100 乱码 + 轻微色散抖动（见 shift.js），因此文字层没有被切片，这是近似之一。
 */
const TAU = Math.PI * 2;
const ease = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
const rng = (seed) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

export class Tear {
  constructor(host) {
    this.cv = document.createElement('canvas'); this.cv.id = 'tear'; this.cv.setAttribute('aria-hidden', 'true');
    this.cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:none;pointer-events:none';
    host.append(this.cv); this.ctx = this.cv.getContext('2d'); this.snap = document.createElement('canvas');
    this.scale = 0.75; this.on = false; this.raf = 0; this.imgs = new Map();
  }
  async _img(url) {
    if (this.imgs.has(url)) return this.imgs.get(url);
    const im = new Image(); im.src = url; try { await im.decode(); } catch (e) { return null; }
    this.imgs.set(url, im); return im;
  }
  /** 对当前画面（章节底图 + E-mote 画布）做快照。失败返回 false（调用方降级为不撕裂）。 */
  async prepare(emoteCanvas) {
    const W = Math.round(innerWidth * this.scale), H = Math.round(innerHeight * this.scale);
    this.W = W; this.H = H; this.cv.width = W; this.cv.height = H; this.snap.width = W; this.snap.height = H;
    const c = this.snap.getContext('2d'); c.fillStyle = '#0b0a09'; c.fillRect(0, 0, W, H);
    const bg = document.querySelector('.bgl.on'); if (!bg) return false;
    const m = /url\(["']?(.+?)["']?\)/.exec(getComputedStyle(bg).backgroundImage); if (!m) return false;
    const im = await this._img(m[1]); if (!im) return false;
    const bw = W * 1.06, bh = H * 1.12 * 1.06, k = Math.max(bw / im.width, bh / im.height), dw = im.width * k, dh = im.height * k;
    c.globalAlpha = 0.96; c.drawImage(im, (W - dw) / 2, (H - dh) / 2, dw, dh); c.globalAlpha = 1;
    // 与页面上的叠层大致一致的暗角（本页 fx-tint 的上下渐变）
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(4,5,5,.34)'); g.addColorStop(0.22, 'rgba(4,5,5,0)'); g.addColorStop(0.74, 'rgba(4,5,5,0)'); g.addColorStop(1, 'rgba(4,5,5,.62)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    if (emoteCanvas) {
      const r = emoteCanvas.getBoundingClientRect(), s = this.scale;
      try { c.drawImage(emoteCanvas, r.left * s, r.top * s, r.width * s, r.height * s); } catch (e) { /* 角色快照失败也继续 */ }
    }
    // 每次的切片参数不同
    const rnd = rng((Math.random() * 1e9) | 0); this.K = 22;
    const hs = Array.from({ length: this.K }, () => 0.4 + rnd()); const sum = hs.reduce((a, b) => a + b, 0);
    let y = 0; this.strips = hs.map((h) => { const s = { y: y * H / sum, h: h * H / sum, a: 0.05 + rnd() * 0.22, j: rnd(), flip: rnd() < 0.18 ? -1 : 1, dy: (rnd() - 0.5) * 0.03 }; y += h; return s; });
    this.rift = 0.38 + rnd() * 0.2; this.seed = rnd() * 100;
    return true;
  }
  start() {
    this.on = true; this.cv.style.display = 'block'; this.t0 = performance.now();
    const loop = (now) => { if (!this.on) return; this.draw((now - this.t0) / 1000); this.raf = requestAnimationFrame(loop); };
    this.draw(0); this.raf = requestAnimationFrame(loop);
  }
  stop() { this.on = false; cancelAnimationFrame(this.raf); this.cv.style.display = 'none'; }
  _void(c, t, a = 1) {
    const { W, H } = this;
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#02070f'); g.addColorStop(1, '#0a2552');
    c.globalAlpha = a; c.fillStyle = g; c.fillRect(0, 0, W, H);
    // 深蓝交叉长波（原片 1.0–1.4s 一小段）
    c.lineCap = 'round';
    for (let j = 0; j < 5; j++) {
      const y0 = H * (0.28 + j * 0.1), amp = H * (0.07 + (j % 3) * 0.035), f = TAU * (1.2 + j * 0.45) / W, ph = t * (1.6 + j * 0.35) + j * 1.7;
      c.beginPath(); for (let x = 0; x <= W; x += 6) { const y = y0 + Math.sin(x * f + ph) * amp * Math.sin(Math.PI * Math.min(1, x / W + 0.05)); x ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.strokeStyle = 'rgba(14,52,128,.95)'; c.lineWidth = 3.2; c.stroke(); c.strokeStyle = 'rgba(90,210,255,.32)'; c.lineWidth = 1; c.stroke();
    }
    c.globalAlpha = 1;
  }
  draw(t) {
    const c = this.ctx, { W, H, snap } = this; c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.filter = 'none';
    // 时间轴（秒）：0–.30 冲糊+残影 → .30–.70 撕开 → .70–.95 竖向拖糊 → .95–1.03 黑帧 → 1.03– 蓝青人影 + 长波
    if (t >= 0.95 && t < 1.035) { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); return; }
    if (t >= 1.035) {
      const u = Math.min(1, (t - 1.035) / 0.2), tt = t;
      this._void(c, tt);
      c.globalAlpha = 0.5 * (1 - ease((t - 1.3) / 0.4)); c.drawImage(snap, 0, -H * 0.05, W, H * 1.1);
      c.globalCompositeOperation = 'multiply'; c.fillStyle = 'rgba(60,150,230,1)'; c.globalAlpha = 0.7 * (1 - ease((t - 1.3) / 0.4)); c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
      return;
    }
    const open = ease((t - 0.3) / 0.4), v = ease((t - 0.7) / 0.25), ghost = t < 0.3 ? ease(t / 0.3) : 1 - 0.55 * ease((t - 0.3) / 0.5);
    if (t >= 0.3) this._void(c, t, Math.min(1, open * 1.4));
    else { c.drawImage(snap, 0, 0); }
    // ① 横向冲糊 + 多层偏移残影
    if (t < 0.3) {
      const B = 0.06 * W * ghost;
      c.globalAlpha = 0.16; for (let k = -3; k <= 3; k++) c.drawImage(snap, k * B / 3, 0);
      for (let k = 0; k < 4; k++) { c.globalAlpha = 0.34 * ghost; c.drawImage(snap, (k - 1.5) * 0.045 * W * ghost, (k % 2 ? 1 : -1) * 0.006 * H * ghost); }
      c.globalAlpha = 1;
    }
    // ② 撕开：切片沿锯齿裂缝向两侧拉开（上半向左、下半向右，少数反向）
    if (t >= 0.3) {
      const st = 1 - v * 0.5;   // 竖向拖糊阶段切片回收
      for (const s of this.strips) {
        const above = (s.y + s.h / 2) / H < this.rift, dir = (above ? -1 : 1) * s.flip;
        const jag = Math.sin(s.j * 40 + this.seed + t * 14) * 0.012 * W * open;
        const dx = dir * (s.a * W * open * st + jag), dy = s.dy * H * open;
        const gap = 1 - 0.16 * open * (1 - v);
        c.drawImage(snap, 0, s.y, W, s.h, dx, s.y + dy + s.h * (1 - gap) / 2, W, s.h * gap);
        // 切片边缘的青色亮线（裂缝的“切口”）
        if (open > 0.15 && s.j < 0.55) { c.fillStyle = `rgba(110,255,230,${0.5 * open * (1 - v)})`; c.fillRect(dx < 0 ? W + dx - 2 : dx, s.y + dy, 2, s.h * gap); }
      }
      // 裂缝本身：一条锯齿亮线
      const ry = this.rift * H; c.beginPath(); c.moveTo(0, ry);
      for (let x = 0; x <= W; x += 18) c.lineTo(x, ry + Math.sin(x * 0.07 + this.seed + t * 20) * 6 * open + (Math.sin(x * 0.31 + this.seed) * 3));
      c.strokeStyle = `rgba(190,255,245,${0.8 * open * (1 - v)})`; c.lineWidth = 2; c.stroke();
      // 色阶失稳：暖棕/蓝黑
      c.globalCompositeOperation = 'multiply'; c.fillStyle = `rgba(150,110,80,${0.55 * open * (1 - v)})`; c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'source-over';
      // 残影仍在
      c.globalAlpha = 0.28 * ghost; c.drawImage(snap, -0.05 * W * open, 0); c.drawImage(snap, 0.04 * W * open, 0); c.globalAlpha = 1;
    }
    // ③ 竖向拖糊（白亮拉长）
    if (t >= 0.7) {
      const s = 1 + v * 1.6;
      c.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 5; k++) { const sk = 1 + (s - 1) * (k + 1) / 5; c.globalAlpha = 0.22 * v; c.drawImage(snap, 0, 0, W, H, 0, H * 0.5 - H * 0.5 * sk, W, H * sk); }
      c.globalAlpha = 0.3 * v; c.fillStyle = '#cfeee8'; c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    }
    // 青绿高亮（原片 9.5s / 28.4s 处很短的一帧）
    if (t > 0.22 && t < 0.4) { c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(30,200,170,${0.4 * (1 - Math.abs(t - 0.31) / 0.09)})`; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over'; }
  }
}
