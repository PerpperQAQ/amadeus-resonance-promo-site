// 采集本页开场的关键帧（有 GPU 的 Mac 上跑）：node scripts/cap-boot.mjs [url] [outDir]
import { chromium } from 'playwright';
import fs from 'fs';
const url = process.argv[2] || 'http://127.0.0.1:5287/?autoenter', out = process.argv[3] || '.tmp/r3';
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
const t0 = Date.now(); await p.goto(url, { waitUntil: 'commit' });
let i = 0; const log = [];
while (Date.now() - t0 < 12000) {
  const t = Date.now() - t0;
  try { await p.screenshot({ path: `${out}/boot-${String(i).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 62 }); } catch (e) { break; }
  log.push(`${i}:${t}`); i++;
  await p.waitForTimeout(90);
}
console.log(log.join(' '));
console.log('boot=', await p.evaluate(() => document.body.dataset.boot), 'errs', JSON.stringify(errs.slice(0, 5)));
await b.close();
