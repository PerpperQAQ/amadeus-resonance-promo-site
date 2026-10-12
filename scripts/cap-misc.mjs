// 第三轮目视检查采集（Mac GPU）：换场动效帧、世界线变动帧、指针、进度条、logo 放大
import { chromium } from 'playwright';
import fs from 'fs';
const url = process.argv[2] || 'http://127.0.0.1:5287/?autoenter', out = process.argv[3] || '.tmp/r3';
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 1 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
await p.goto(url); await p.waitForFunction(() => document.body.dataset.boot === 'done', null, { timeout: 90000 });
await p.waitForTimeout(1500);
const shot = (n, o = {}) => p.screenshot({ path: `${out}/${n}.jpg`, type: 'jpeg', quality: 70, ...o });
// logo 放大（原位）
const lg = await p.locator('#hero .logo').boundingBox();
if (lg) { const c = await b.newContext({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 3 }); await c.close(); }
await p.screenshot({ path: `${out}/logo-zoom.png`, clip: { x: lg.x - 10, y: lg.y - 10, width: lg.width + 20, height: lg.height + 20 } });
await p.waitForTimeout(6000);
await p.screenshot({ path: `${out}/logo-zoom2.png`, clip: { x: lg.x - 10, y: lg.y - 10, width: lg.width + 20, height: lg.height + 20 } });
// 指针
await p.mouse.move(700, 400); await p.mouse.move(760, 430, { steps: 4 }); await p.waitForTimeout(150);
await p.screenshot({ path: `${out}/cur-move.png`, clip: { x: 700, y: 380, width: 140, height: 100 } });
const gh = await p.locator('.gh').boundingBox();
await p.mouse.move(gh.x + 20, gh.y + 8, { steps: 6 }); await p.waitForTimeout(500);
await p.screenshot({ path: `${out}/cur-hover.png`, clip: { x: gh.x - 40, y: gh.y - 30, width: 160, height: 90 } });
await p.mouse.move(900, 500); await p.mouse.down(); await p.waitForTimeout(120);
await p.screenshot({ path: `${out}/cur-click.png`, clip: { x: 840, y: 440, width: 140, height: 120 } }); await p.mouse.up();
// 换场
const secs = ['what', 'modes', 'boundary', 'perform', 'local', 'outro'];
const fxs = [];
for (const s of secs) {
  await p.evaluate((id) => document.getElementById(id).scrollIntoView({ behavior: 'instant' }), s);
  const t0 = Date.now(); let i = 0;
  while (Date.now() - t0 < 1500) { await p.screenshot({ path: `${out}/tr-${s}-${String(i++).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 55 }); await p.waitForTimeout(40); }
  fxs.push(s + ':' + await p.evaluate(() => document.getElementById('stage').dataset.fx));
}
console.log('fx', fxs.join(' '));
await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(1500);
await p.evaluate(() => document.getElementById('modes').scrollIntoView({ behavior: 'instant' })); await p.waitForTimeout(1800);
await shot('rail');
// 世界线变动
await p.keyboard.press('d');
const t1 = Date.now(); let k = 0;
while (Date.now() - t1 < 9000) { await p.screenshot({ path: `${out}/sh-${String(k++).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 60 }); await p.waitForTimeout(60); }
console.log('shift frames', k, 'world', await p.evaluate(() => document.body.dataset.world), 'errs', JSON.stringify(errs.slice(0, 5)));
await b.close();
