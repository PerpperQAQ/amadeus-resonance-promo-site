import { chromium } from 'playwright';
import fs from 'fs';
const out = 'docs/screenshots/r6/boot-wl'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://127.0.0.1:5287/', { waitUntil: 'commit' });
await p.waitForSelector('#boot.on, #boot', {}); 
const cdp = await p.context().newCDPSession(p);
let i = 0, t0 = 0, started = false; const t00 = Date.now();
cdp.on('Page.screencastFrame', async (f) => { cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(()=>{}); if (!started) return; fs.writeFileSync(`${out}/f${String(i++).padStart(3, '0')}-${Date.now() - t0}.jpg`, Buffer.from(f.data, 'base64')); });
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, everyNthFrame: 1 });
// 等进入 flow 阶段（entry 出现之前），开始记录
await p.waitForFunction(() => document.querySelector('#boot')?.classList.contains('dig-out'), null, { timeout: 120000 });
started = true; t0 = Date.now();
await p.waitForTimeout(6500);
await cdp.send('Page.stopScreencast'); console.log(i, 'frames');
await b.close();
