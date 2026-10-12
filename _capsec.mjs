import { chromium } from 'playwright';
const [wh = '1440x900', pre = 'docs/screenshots/r4/sec'] = process.argv.slice(2);
const [w, h] = wh.split('x').map(Number);
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage({ viewport: { width: w, height: h } });
await p.goto('http://127.0.0.1:5287/?autoenter');
await p.waitForFunction(() => window.__promo?.info().boot === 'done', null, { timeout: 120000 });
await p.evaluate(() => document.documentElement.style.scrollBehavior = 'auto');
for (const id of ['local', 'modes', 'outro']) {
  await p.evaluate((id) => document.getElementById(id).scrollIntoView(), id);
  await p.waitForTimeout(3500);
  await p.screenshot({ path: `${pre}-${id}-${wh}.png` });
}
await b.close();
