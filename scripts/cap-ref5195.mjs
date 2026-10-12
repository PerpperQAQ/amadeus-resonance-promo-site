// 评估用：连续抓取用户 Amadeus 前端开屏（5195 ready）全过程：开场 → 悬停入口 → Enter 转场。node scripts/cap-ref5195.mjs [outDir]
import { chromium } from 'playwright';
import fs from 'fs';
const out = process.argv[2] || '.tmp/assess/ref'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const cdp = await p.context().newCDPSession(p);
let T0 = 0, seg = 'a', i = 0;
cdp.on('Page.screencastFrame', (f) => { cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); if (!T0) return; fs.writeFileSync(`${out}/${seg}-${String(Date.now() - T0).padStart(6, '0')}.jpg`, Buffer.from(f.data, 'base64')); i++; });
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 72, everyNthFrame: 1 });
T0 = Date.now(); await p.goto('http://127.0.0.1:5195/?s=ready&bare', { waitUntil: 'commit' });
await p.waitForTimeout(14000);
const sel = await p.evaluate(() => { const e = document.querySelector('.r-entry, .r-enter, button[class*=entry], .r-ui button'); return e ? e.className + '|' + e.tagName + '|' + (e.innerText || '').slice(0, 20) : null; });
console.log('entry', sel);
seg = 'b'; T0 = Date.now();
const el = await p.$('.r-entry, .r-enter, button[class*=entry]');
if (el) { await el.hover(); }
await p.waitForTimeout(2200);
seg = 'c'; T0 = Date.now(); await p.keyboard.press('Enter'); await p.waitForTimeout(3500);
await cdp.send('Page.stopScreencast'); console.log(i, 'frames'); await b.close();
