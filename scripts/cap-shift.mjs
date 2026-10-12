// 抓世界线变动的时间线帧：node scripts/cap-shift.mjs <宽>x<高> <输出目录>
import { chromium } from 'playwright';
import fs from 'node:fs';
const [wh = '1440x900', out = '.tmp/shift-frames'] = process.argv.slice(2);
const [w, h] = wh.split('x').map(Number);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/404|GPU/.test(m.text())) errs.push(m.text()); });
await p.goto('http://127.0.0.1:5287/?autoenter');
await p.waitForFunction(() => window.__promo?.info().boot === 'done', null, { timeout: 120000 });
await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; document.getElementById('modes').scrollIntoView(); });
await p.waitForTimeout(2500);
await p.evaluate(() => document.getElementById('mw').click());
const t0 = Date.now(); let i = 0;
while (Date.now() - t0 < 9500) {
  const t = Date.now() - t0;
  await p.screenshot({ path: `${out}/f${String(i).padStart(3, '0')}-${t}.jpg`, type: 'jpeg', quality: 70 });
  i++;
}
console.log(i, 'frames', JSON.stringify(await p.evaluate(() => window.__promo.shift.state.phases)), errs);
await b.close();
