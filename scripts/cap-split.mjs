// 分栏概念稿截图：node scripts/cap-split.mjs <输出目录> <宽> <高> [--b] [--full]
//  默认：三个画面（A）+ 记忆屏点击后；--b：首屏 B；--full：再测 D 键切换、表演“字”。
import { chromium } from 'playwright';
import fs from 'node:fs';
const pos = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const [OUT = 'docs/screenshots/concept-split', W = '1440', H = '900'] = pos;
const flags = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const URL = flags.url || 'http://127.0.0.1:5291/split.html';
fs.mkdirSync(OUT, { recursive: true });
const errors = [];
const browser = await chromium.launch({ channel: 'chrome', headless: !process.env.HEADFUL });
const p = await browser.newPage({ viewport: { width: +W, height: +H } });
p.setDefaultTimeout(90000);
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text().slice(0, 200)); });
p.on('requestfailed', (r) => { const u = r.url(); if (/\/audio\/.*\.m4a$/.test(u) && /ABORTED/.test(r.failure()?.errorText || '')) return; errors.push('requestfailed: ' + u.slice(-80) + ' ' + (r.failure()?.errorText || '')); });
const tag = `${flags.b ? 'b-' : 'a-'}${W}x${H}`;
const info = () => p.evaluate(() => window.__split.info());
const idle = () => p.waitForFunction(() => !window.__split.info().busy && !window.__split.info().shifting, null, { timeout: 120000 });
await p.goto(URL + (flags.b ? '?wl=b' : ''));
await p.waitForFunction(() => window.__split?.info().model === 'ready', null, { timeout: 120000 });
await p.mouse.move(+W * 0.2, +H * 0.5);
await p.waitForTimeout(3600);
await p.screenshot({ path: `${OUT}/${tag}-01-hero.png` });
if (!flags.b) {
  await p.keyboard.press('ArrowDown'); await idle(); await p.waitForTimeout(2600);
  await p.screenshot({ path: `${OUT}/${tag}-02-memory.png` });
  await p.click('#frags button[data-f="0"]'); await p.waitForTimeout(2800);
  await p.screenshot({ path: `${OUT}/${tag}-03-memory-click-rooftop.png` });
  await p.click('#frags button[data-f="3"]'); await p.waitForTimeout(2800);
  await p.screenshot({ path: `${OUT}/${tag}-04-memory-click-sealed.png` });
  await p.mouse.wheel(0, 300); await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/${tag}-05-transition-mid.png` });
  await idle(); await p.waitForTimeout(2400);
  await p.screenshot({ path: `${OUT}/${tag}-06-perform.png` });
  if (flags.full) {
    await p.click('#acts button[data-act="text"]'); await p.waitForTimeout(2200);
    await p.screenshot({ path: `${OUT}/${tag}-07-perform-text.png` });
    await p.click('#k-menu'); await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/${tag}-09-menu-open.png` });
    await p.click('#k-menu');
    await p.keyboard.press('d'); await p.waitForTimeout(250); await idle(); await p.waitForTimeout(2200);
    await p.screenshot({ path: `${OUT}/${tag}-08-perform-after-shift-b.png` });
  }
}
console.log(tag, JSON.stringify(await info()));
console.log('errors', errors.length, JSON.stringify(errors));
await browser.close();
