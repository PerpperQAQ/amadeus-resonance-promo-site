// 逐章截图：node scripts/cap-sections.mjs <输出目录> [宽 高]
import { chromium } from 'playwright';
const OUT = process.argv[2] || '.tmp/sec', W = +(process.argv[3] || 1440), H = +(process.argv[4] || 900);
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage({ viewport: { width: W, height: H } });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto('http://127.0.0.1:5287/?autoenter'); await p.waitForFunction(() => window.__promo?.info().boot === 'done', null, { timeout: 300000 });
const ids = await p.evaluate(() => [...document.querySelectorAll('.sec')].map((s) => s.id));
for (const [i, id] of ids.entries()) {
  await p.evaluate((id) => { document.documentElement.style.scrollBehavior = 'auto'; document.getElementById(id).scrollIntoView(); }, id);
  await p.waitForTimeout(2600);
  await p.screenshot({ path: `${OUT}/sec-${W}x${H}-${String(i + 1).padStart(2, '0')}-${id}.png` });
}
await b.close();
