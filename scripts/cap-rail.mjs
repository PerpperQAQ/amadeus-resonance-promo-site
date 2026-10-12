// 采集底部世界线进度条：node scripts/cap-rail.mjs [输出目录]  （含 3 个章节位置，整页截图 + 底部条放大）
import { chromium } from 'playwright';
const OUT = process.argv[2] || '.tmp/r6';
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://127.0.0.1:5287/?autoenter'); await p.waitForFunction(() => window.__promo?.info().boot === 'done', null, { timeout: 300000 });
const ids = await p.evaluate(() => [...document.querySelectorAll('main section[id], section[id]')].map((s) => s.id).slice(0, 8));
for (const [i, k] of [[1, 0], [3, 1], [6, 2]]) {
  await p.evaluate((id) => { document.documentElement.style.scrollBehavior = 'auto'; document.getElementById(id)?.scrollIntoView(); }, ids[i] || ids[0]);
  await p.waitForTimeout(3200);
  await p.screenshot({ path: `${OUT}/rail-full-${k}.png` });
  await p.screenshot({ path: `${OUT}/rail-strip-${k}.png`, clip: { x: 0, y: 740, width: 1440, height: 160 } });
}
await b.close(); console.log(ids.join(','));
