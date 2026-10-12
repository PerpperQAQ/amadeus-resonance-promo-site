/**
 * 《命运石之门》实验室道具（第四轮：实拍抠图 + 叠加动效，不再自绘 SVG）。
 *  - IBM 5100：Wikimedia 实拍抠图（Sandstein，CC BY-SA 3.0）+ 屏幕区域叠加 APL 文本/解码/辉光。
 *  - 电话微波炉（第六轮方案 A）：官方 Re:Boot 实验室背景里的原作电话微波炉裁切（官方素材，仅供课堂展示）+ Re:Boot 珊瑚红直板手机（官方图抠出）；
 *    炉灯/橙色刻度窗/红开关/4 位数码管/手机屏幕用光效点亮；可点击。
 *  - 世界线变动率读数仪（结尾章）：与开屏/变动演出同一套橙色细线数字（meter.js），不再用 GN-4 实拍图。
 * 署名见页面结尾小字与 ASSETS.md。
 */
import { APL_CHARS, cipherChar } from './cipher.js';
import { Meter } from './meter.js';


/* ------------------------------------------------------------------ IBM 5100 */
export class Ibm {
  constructor(host, uid) {
    this.host = host;
    const base = import.meta.env.BASE_URL;
    host.innerHTML = `<div class="ibm-img"><i class="ibm-desk"></i><i class="ibm-shadow"></i><img src="${base}img/props/ibm5100.webp" alt="IBM 5100 便携计算机（实拍）" draggable="false" decoding="async"><i class="ibm-tint"></i><i class="ibm-spill"></i>` +
      `<div class="ibm-scr ibm-text">${Array.from({ length: 7 }, () => '<i class="ibm-line"></i>').join('')}</div></div>`;
    this.lines = [...host.querySelectorAll('.ibm-line')];
    this.state = [];          // 每行当前显示字符串
    this.target = [];         // 每行目标文本
    this.mode = 'idle';
    this.active = false;
    this.timer = 0;
    this.W = 21;
    this._tick = this._tick.bind(this);
    for (let i = 0; i < this.lines.length; i++) this.state[i] = this._noise();
    this._paint();
  }
  _noise() { let s = ''; for (let i = 0; i < this.W; i++) s += i % 3 === 2 ? ' ' : cipherChar(); return s; }
  _paint() { this.lines.forEach((t, i) => { t.textContent = this.state[i] || ''; }); }
  setActive(on) {
    if (on === this.active) return;
    this.active = on;
    this.host.classList.toggle('is-active', on);
    clearInterval(this.timer);
    if (on) this.timer = setInterval(this._tick, this.mode === 'decode' ? 45 : 520);
  }
  /** 屏幕显示一组文本（逐行“解码”：从乱码逐字符落定）。 */
  show(lines, { decode = true } = {}) {
    this.target = lines.map((s) => s.padEnd(this.W).slice(0, this.W));
    this.mode = decode ? 'decode' : 'text';
    this.progress = this.target.map(() => 0);
    if (!decode) { this.state = [...this.target]; this._paint(); }
    this.host.classList.add('is-decoding');
    if (this.active) { clearInterval(this.timer); this.timer = setInterval(this._tick, 45); }
  }
  idle() {
    this.mode = 'idle';
    this.host.classList.remove('is-decoding');
    if (this.active) { clearInterval(this.timer); this.timer = setInterval(this._tick, 520); }
  }
  _tick() {
    if (this.mode === 'idle') {
      const i = Math.floor(Math.random() * this.lines.length);
      this.state[i] = this._noise();
      this._paint();
      return;
    }
    if (this.mode === 'decode') {
      let all = true;
      this.target.forEach((tgt, i) => {
        const p = this.progress[i];
        if (p >= tgt.length) { this.state[i] = tgt; return; }
        all = false;
        const lead = i === 0 || this.progress[i - 1] > 6;      // 上一行解到一半，下一行才开始
        if (lead) this.progress[i] = Math.min(tgt.length, p + 2);
        let s = tgt.slice(0, this.progress[i]);
        for (let k = this.progress[i]; k < tgt.length; k++) s += tgt[k] === ' ' ? ' ' : cipherChar();
        this.state[i] = lead ? s : this._noise();
      });
      this._paint();
      if (all) { this.mode = 'text'; this.host.classList.remove('is-decoding'); }
    }
  }
  destroy() { clearInterval(this.timer); }
}

/* ------------------------------------------------------------------ 电话微波炉（暂定） */
export function microwaveHtml() {
  const base = import.meta.env.BASE_URL;
  return `
<div class="mw-fig">
  <div class="mw-oven">
    <i class="mw-shelf"></i><i class="mw-shadow"></i>
    <img class="mw-img" src="${base}img/props/mw-oven.webp" alt="" width="600" height="590" draggable="false" decoding="async">
    <i class="mw-scale"></i><i class="mw-sw"></i>
    <i class="mw-dig"><b>0</b><b>0</b><b>0</b><b>0</b></i>
    <i class="mw-win"><i class="mw-plate"></i></i>
    <i class="mw-tint"></i><i class="mw-spill"></i>
  </div>
  <div class="mw-phone" aria-hidden="true">
    <i class="mw-ph-shadow"></i>
    <img class="mw-ph-img" src="${base}img/props/mw-phone.webp" alt="" width="240" height="459" draggable="false" decoding="async">
    <i class="mw-ph-scr"></i>
  </div>
  <i class="mw-hint" aria-hidden="true"></i>
</div>`;
}

/** 轻轻“叮”一声（可选，失败即忽略）：门灯闪的同时给一点听觉反馈，音量很低。 */
export function ding() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ac = ding.ac || (ding.ac = new AC());
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(1760, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.75);
  } catch (e) { /* ignore */ }
}

/* ------------------------------------------------------------------ 世界线变动率读数仪（GN-4 实拍数字拼装） */
export class Divergence {
  constructor(host, value = '1.048596') {
    this.host = host; this.token = 0;
    host.classList.add('dm');
    host.innerHTML = '<div class="dm-meter"></div><div class="dm-cap">世界线变动率</div>';
    this.m = new Meter(host.firstChild); this.set(value);
  }
  set(str) { this.token++; this.m.set(str); }
  /** 整排成组跳变 ms 毫秒后落到目标值（与开屏/变动演出同一套橙色细线数字）。 */
  roll(str, ms = 1500) {
    const my = ++this.token, t0 = performance.now();
    this.host.classList.add('dm-rolling'); this.m.unlock();
    return new Promise((res) => {
      const loop = (now) => {
        if (my !== this.token) { res(false); return; }
        if (now - t0 >= ms) { this.m.lock(str, now); this.host.classList.remove('dm-rolling'); res(true); return; }
        this.m.tick(now, 1.6); requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });
  }
}

/** 微波炉“点亮”时让 4 位数码管跳字闪烁（读取 .mw 的 lit 类，不依赖触发方）；点击时再给一次“叮”的闪光。 */
export function bindMicrowaveFx(mw) {
  const digs = [...mw.querySelectorAll('.mw-dig b')]; let iv = 0, n = 0;
  const FIN = '0571';
  const start = () => { clearInterval(iv); n = 0; iv = setInterval(() => { n++; digs.forEach((d, i) => { d.textContent = n > 60 ? FIN[i] : String((Math.random() * 10) | 0); }); }, 70); };
  const stop = () => { clearInterval(iv); iv = 0; digs.forEach((d) => { d.textContent = '0'; }); };
  new MutationObserver(() => { if (mw.classList.contains('lit')) { if (!iv) start(); } else stop(); }).observe(mw, { attributes: true, attributeFilter: ['class'] });
  mw.addEventListener('click', () => { mw.classList.add('dg'); setTimeout(() => mw.classList.remove('dg'), 950); });
}
