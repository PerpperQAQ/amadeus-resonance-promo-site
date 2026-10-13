// 终端概念稿截图：node scripts/cap-terminal.mjs <输出目录> <宽> <高> [--b] [--url=...]
import { chromium } from 'playwright';
import fs from 'node:fs';
const [OUT = 'docs/screenshots/concept-terminal', W = '1440', H = '900'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const flags = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const URL = flags.url || 'http://127.0.0.1:5291/terminal.html';
fs.mkdirSync(OUT, { recursive: true });
const errors = [];
const browser = await chromium.launch({ channel: 'chrome', headless: !process.env.HEADFUL });
const p = await browser.newPage({ viewport: { width: +W, height: +H } });
p.setDefaultTimeout(90000);
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text().slice(0, 200)); });
p.on('requestfailed', (r) => errors.push('requestfailed: ' + r.url().slice(-80) + ' ' + (r.failure()?.errorText || '')));
const tag = `${W}x${H}`;
const info = () => p.evaluate(() => window.__term.info());
await p.goto(URL + (flags.b ? '?wl=b' : ''));
await p.waitForFunction(() => window.__term?.info().boot === 'off' && window.__term.info().model === 'ready', null, { timeout: 120000 });
await p.mouse.move(+W * 0.3, +H * 0.4);
await p.waitForTimeout(2600);
const pre = flags.b ? 'b-' : '';
await p.screenshot({ path: `${OUT}/${pre}${tag}-01-hero.png` });
if (!flags.b || flags.mem) {
  await p.evaluate(() => window.__term.go('mem'));
  await p.waitForTimeout(3200);
  await p.screenshot({ path: `${OUT}/${pre}${tag}-02-memory-idle.png` });
  await p.click('#tiers li[data-t="2"]');
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/${pre}${tag}-03-memory-read-t2.png` });
  await p.click('#tiers li[data-t="3"]');
  await p.waitForTimeout(2200);
  await p.screenshot({ path: `${OUT}/${pre}${tag}-04-memory-read-t3.png` });
  await p.evaluate(() => window.__term.go('hero'));
  await p.waitForTimeout(1500);
}
if (flags.shift) {
  await p.keyboard.press('d');
  await p.waitForFunction(() => window.__term.info().world === 'b' && !window.__term.info().shifting && window.__term.info().model === 'ready', null, { timeout: 120000 });
  await p.waitForTimeout(1800);
  await p.screenshot({ path: `${OUT}/${tag}-05-hero-after-shift-b.png` });
}
const st = await info();
console.log(tag, JSON.stringify(st));
console.log('errors', errors.length, JSON.stringify(errors));
await browser.close();
