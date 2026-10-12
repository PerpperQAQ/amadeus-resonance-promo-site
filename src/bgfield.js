/**
 * 开屏背景（第六轮，极简版）：不用任何照片，canvas 单层绘制，只有三层——
 *   ① 深黑偏冷底色 + 极缓呼吸的中心暗光，叠一层极淡的星图（细密点阵 + 以汇聚点为圆心的几圈细环与刻度）；
 *   ② 几列极淡的 IBM 5100 风格代码（十六进制 / APL / BASIC 行），缓慢纵向漂移，像远景数据流；
 *   ③ 随世界线汇聚，汇聚点处逐步亮起一团很淡的暖光（setWarm 0..1），点击进入时随开屏整体淡出。
 * 静态的星图与代码列预渲染到离屏画布，每帧只做平移/混合，开销很小；页面不可见时暂停。胶片噪点/CRT 扫描线由 CSS 提供（极轻）。
 */
const HEX = '0123456789ABCDEF', APL = '⍴⍳∊∆∇⎕⍞○∘⊥⊤←→×÷≠≤≥∨∧⍋⍒⌽⊖⍉⍝⌿⍀', BAS = ['10 FOR I=1 TO 16', '20 PRINT CHR$(PEEK(&H1000+I))', '30 NEXT I : GOTO 10', 'REM IBM 5100 BASIC', '40 IF A$="" THEN 40', 'LOAD "SERN.APL"'];
const rng = (s) => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;

export class BootField {
  constructor(cv, { px = 0.5, py = 0.62, seed = 7 } = {}) {
    this.cv = cv; this.ctx = cv.getContext('2d'); this.px = px; this.py = py; this.warm = 0; this.raf = 0; this.running = false;
    this.r = rng(seed); this.t0 = performance.now(); this._loop = this._loop.bind(this);
    this._vis = () => { if (document.hidden) this._halt(); else if (this.want) this.start(); };
    document.addEventListener('visibilitychange', this._vis);
  }
  resize() {
    const W = innerWidth, H = innerHeight, d = 1; this.W = W; this.H = H; this.cv.width = W * d; this.cv.height = H * d;
    // ① 星图：点阵 + 同心细环 + 刻度（静态，预渲染）
    const g = (this.chart = document.createElement('canvas')); g.width = W; g.height = H; const c = g.getContext('2d');
    c.fillStyle = 'rgba(150,175,205,.16)'; const s = Math.max(40, Math.round(W / 32));
    for (let y = s / 2; y < H; y += s) for (let x = s / 2; x < W; x += s) c.fillRect(x, y, 1.2, 1.2);
    const cx = W * this.px, cy = H * this.py; c.strokeStyle = 'rgba(150,175,205,.10)'; c.lineWidth = 1;
    for (const k of [0.16, 0.3, 0.46, 0.66, 0.9]) { c.beginPath(); c.arc(cx, cy, H * k, 0, Math.PI * 2); c.stroke(); }
    c.strokeStyle = 'rgba(150,175,205,.14)'; const R = H * 0.46;
    for (let a = 0; a < 360; a += 5) { const t = a * Math.PI / 180, l = a % 30 === 0 ? 10 : 4; c.beginPath(); c.moveTo(cx + Math.cos(t) * R, cy + Math.sin(t) * R); c.lineTo(cx + Math.cos(t) * (R + l), cy + Math.sin(t) * (R + l)); c.stroke(); }
    c.beginPath(); c.moveTo(cx - H * 0.9, cy); c.lineTo(cx + H * 0.9, cy); c.moveTo(cx, cy - H * 0.9); c.lineTo(cx, cy + H * 0.9); c.strokeStyle = 'rgba(150,175,205,.07)'; c.stroke();
    // ② 代码列（静态文本，预渲染；运行时纵向平移）
    const nc = W > 1100 ? 6 : 4, fs = Math.max(10, Math.round(H / 70)), lh = fs * 1.7, r = rng(11);
    this.cols = Array.from({ length: nc }, (_, i) => {
      const cw = fs * 18, rows = Math.ceil(H / lh) + 2, cc = document.createElement('canvas'); cc.width = cw; cc.height = rows * lh; const x = cc.getContext('2d');
      x.font = `${fs}px 'AR APL','AR Mono',monospace`; x.textBaseline = 'top';
      for (let k = 0; k < rows; k++) {
        const t = r(); let line;
        if (t < 0.5) line = Array.from({ length: 6 }, () => HEX[(r() * 16) | 0] + HEX[(r() * 16) | 0]).join(' ');
        else if (t < 0.8) line = Array.from({ length: 12 }, () => APL[(r() * APL.length) | 0]).join('');
        else line = BAS[(r() * BAS.length) | 0];
        x.fillStyle = i % 3 === 2 ? 'rgba(217,150,95,1)' : 'rgba(150,175,205,1)'; x.fillText(line, 0, k * lh);
      }
      return { cv: cc, x: (i + 0.5) * W / nc - cw / 2 + (r() - 0.5) * W * 0.03, v: 5 + r() * 9, a: 0.035 + r() * 0.03, off: r() * rows * lh, h: rows * lh };
    });
    this.draw(0);
  }
  setWarm(v) { this.warm = v; }
  start() { this.want = true; if (this.running || document.hidden) return; this.running = true; this.raf = requestAnimationFrame(this._loop); }
  _halt() { this.running = false; cancelAnimationFrame(this.raf); }
  stop() { this.want = false; this._halt(); }
  destroy() { this.stop(); document.removeEventListener('visibilitychange', this._vis); }
  _loop(now) { if (!this.running) return; this.draw((now - this.t0) / 1000); this.raf = requestAnimationFrame(this._loop); }
  draw(t) {
    const c = this.ctx, { W, H } = this; if (!W) return;
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    c.fillStyle = '#03050a'; c.fillRect(0, 0, W, H);
    const cx = W * this.px, cy = H * this.py, br = 0.9 + 0.1 * Math.sin(t * 0.5);
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7); g.addColorStop(0, `rgba(22,32,48,${0.55 * br})`); g.addColorStop(1, 'rgba(3,5,10,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.drawImage(this.chart, Math.sin(t * 0.07) * 4, Math.cos(t * 0.05) * 3);
    for (const k of this.cols) {
      const y = -((k.off + t * k.v) % k.h); c.globalAlpha = k.a;
      c.drawImage(k.cv, k.x, y); c.drawImage(k.cv, k.x, y + k.h);
    }
    c.globalAlpha = 1;
    if (this.warm > 0.005) {
      c.globalCompositeOperation = 'lighter';
      const w = c.createRadialGradient(cx, cy, 0, cx, cy, H * 0.62); w.addColorStop(0, `rgba(255,150,70,${0.17 * this.warm})`); w.addColorStop(0.45, `rgba(200,100,40,${0.06 * this.warm})`); w.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = w; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over';
    }
  }
}
