// 连续抓取开屏全过程（CDP screencast，文件名带毫秒）：VW=1440 VH=900 node scripts/cap-boot-frames.mjs [url] [outDir]；a=开场到按钮就绪，b=悬停，c=点击进入
import { chromium } from 'playwright'; import fs from 'fs';
const out = process.argv[3] || '.tmp/assess/proto'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage({ viewport: { width: +(process.env.VW || 1440), height: +(process.env.VH || 900) } });
const cdp = await p.context().newCDPSession(p); let T0 = 0, seg = 'a';
cdp.on('Page.screencastFrame', (f) => { cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); if (T0) fs.writeFileSync(`${out}/${seg}-${String(Date.now() - T0).padStart(6, '0')}.jpg`, Buffer.from(f.data, 'base64')); });
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 72, everyNthFrame: 1 });
T0 = Date.now(); await p.goto(process.argv[2] || 'http://127.0.0.1:5287/?boot=amadeus', { waitUntil: 'commit' });
await p.waitForSelector('.bt-entry.show.is-ready', { timeout: 120000 }); await p.waitForTimeout(3600);
seg = 'b'; T0 = Date.now(); await p.hover('.be-btn'); await p.waitForTimeout(1600);
seg = 'c'; T0 = Date.now(); await p.click('.be-btn'); await p.waitForTimeout(2500);
await cdp.send('Page.stopScreencast'); await b.close();
