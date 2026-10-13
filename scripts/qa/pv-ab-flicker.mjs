// 剪影闪烁检测：屏 2 上逐帧（rAF）采样 ghost 画布覆盖率，统计空白帧。node scripts/qa/pv-ab-flicker.mjs [every]
import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chrome' });
const pg = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://127.0.0.1:5291/pv-ab.html');
await pg.waitForFunction(() => document.body.classList.contains('loaded') && __ab.B.state === 'ready', null, { timeout: 120000 });
await pg.evaluate(() => __ab.go(1)); await pg.waitForTimeout(2500);
const r = await pg.evaluate((ev) => new Promise((res) => {
  if (ev) __ab.gh.every = +ev;
  const c = __ab.gh.canvas, o = document.createElement('canvas'); o.width = 64; o.height = 96; const x = o.getContext('2d', { willReadFrequently: true });
  const cov = []; let n = 0;
  const f = () => { x.clearRect(0, 0, 64, 96); x.drawImage(c, 0, 0, 64, 96); const d = x.getImageData(0, 0, 64, 96).data; let a = 0; for (let i = 3; i < d.length; i += 4) a += d[i] > 8; cov.push(a);
    if (++n < 240) requestAnimationFrame(f); else { const mx = Math.max(...cov); res({ frames: n, max: mx, min: Math.min(...cov), blank: cov.filter((v) => v < mx * .5).length }); } };
  requestAnimationFrame(f);
}), process.argv[2] || '');
console.log(JSON.stringify(r), 'errs', errs); await b.close();
