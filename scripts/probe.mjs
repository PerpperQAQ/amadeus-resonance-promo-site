import { chromium } from 'playwright';
const url = process.argv[2] || 'http://127.0.0.1:5287/?autoenter';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('console', m => console.log('[console]', m.type(), m.text().slice(0,300)));
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto(url);
for (let i=0;i<30;i++){ await page.waitForTimeout(1000); const st = await page.evaluate(()=>window.s?.stage+' '+window.s?.state+' '+Math.round((window.s?.progress||0)*100)); console.log(i, st); if(st.startsWith('ready ready')) break; }
await page.waitForTimeout(1500);
console.log(JSON.stringify(await page.evaluate(()=>window.s.pixelStats())));
await page.screenshot({ path: '.tmp/probe1.png' });
await browser.close();
