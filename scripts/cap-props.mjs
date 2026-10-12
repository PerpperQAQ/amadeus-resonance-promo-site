// 道具截图：node scripts/cap-props.mjs <宽>x<高> <输出前缀>
import { chromium } from 'playwright';
const [wh = '1440x900', pre = 'docs/screenshots/r4/prop'] = process.argv.slice(2);
const [w, h] = wh.split('x').map(Number);
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage({ viewport: { width: w, height: h } });
await p.goto('http://127.0.0.1:5287/?autoenter');
await p.waitForFunction(() => window.__promo?.info().boot === 'done', null, { timeout: 120000 });
await p.evaluate(() => document.documentElement.style.scrollBehavior = 'auto');
await p.evaluate(() => document.getElementById('modes').scrollIntoView());
await p.waitForTimeout(3000);
await p.screenshot({ path: `${pre}-mw-idle-${wh}.png` });
await p.evaluate(() => document.getElementById('mw').click());
await p.waitForTimeout(700);
await p.screenshot({ path: `${pre}-mw-lit-${wh}.png` });
await p.waitForTimeout(9000);
await p.screenshot({ path: `${pre}-mw-after-${wh}.png` });
await b.close();
