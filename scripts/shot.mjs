// 用法：node scripts/shot.mjs <宽>x<高> <输出.png> [章节id,章节id...] [等待毫秒]
import { chromium } from 'playwright';
const [wh = '1440x900', out = '.tmp/shot.png', ids = 'hero', wait = '9000'] = process.argv.slice(2);
const [w, h] = wh.split('x').map(Number);
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: w, height: h } });
const errs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/GPU stall|favicon|404/.test(m.text())) errs.push(m.type() + ': ' + m.text().slice(0, 200)); });
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
await page.goto('http://127.0.0.1:5287/?autoenter');
// 截图专用：压缩过渡/动画时长（保留终态），避免慢速无头环境下截到半途画面
const still = process.env.STILL !== '0';
await page.waitForFunction(() => window.__promo?.info().state === 'ready', null, { timeout: 150000 }).catch(() => console.log('!! 模型未在超时内就绪'));
await page.waitForTimeout(Number(wait));
for (const id of ids.split(',')) {
  await page.evaluate((id) => { document.documentElement.style.scrollBehavior = 'auto'; document.getElementById(id).scrollIntoView({ block: 'start' }); }, id);
  if (still) await page.addStyleTag({ content: '*,*::before,*::after{transition-duration:.001ms!important;transition-delay:0s!important;animation-duration:.001ms!important;animation-delay:0s!important}.stage{transition-duration:.001ms!important}' });
  await page.waitForTimeout(Number(process.env.SETTLE || 4000));
  const f = ids.includes(',') ? out.replace('.png', `-${id}.png`) : out;
  await page.screenshot({ path: f });
  console.log('saved', f);
}
console.log(JSON.stringify(await page.evaluate(() => window.__promo?.info())));
console.log('errors:', errs.length ? errs : 'none');
await browser.close();
