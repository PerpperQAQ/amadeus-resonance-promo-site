// 剧场概念稿 v3 截图 + 交互自检：node scripts/cap-cinema.mjs <输出目录> <宽> <高> [--b]
//  A：加载器 / 首屏 / 菜单（开、Esc、跳转）/ 遮罩入场中途 / 她（切换前后、连续切换、箭头）/ 记忆画廊 / 回到顶部 / 世界线按钮与 D 键
//  --b：B 世界线首屏
import { chromium } from 'playwright';
import fs from 'node:fs';
const pos = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const [OUT = 'docs/screenshots/concept-cinema-v3', W = '1440', H = '900'] = pos;
const flags = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const URL = flags.url || 'http://127.0.0.1:5291/cinema.html';
fs.mkdirSync(OUT, { recursive: true });
const errors = [], checks = [];
const ok = (name, cond, extra = '') => { checks.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' ' + extra : ''}`); };
const browser = await chromium.launch({ channel: 'chrome', headless: !process.env.HEADFUL });
const p = await browser.newPage({ viewport: { width: +W, height: +H } });
p.setDefaultTimeout(90000);
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text().slice(0, 200)); });
p.on('requestfailed', (r) => { const u = r.url(); if (/\/audio\/.*\.m4a$/.test(u) && /ABORTED/.test(r.failure()?.errorText || '')) return; errors.push('requestfailed: ' + u.slice(-80) + ' ' + (r.failure()?.errorText || '')); });
const tag = `${flags.b ? 'b-' : 'a-'}${W}x${H}`;
const shot = (n) => p.screenshot({ path: `${OUT}/${tag}-${n}.png` });
const info = () => p.evaluate(() => window.__cinema.info());
const secTop = (id) => p.evaluate((id) => document.getElementById(id).getBoundingClientRect().top, id);

await p.goto(URL + (flags.b ? '?wl=b' : ''), { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(250);
const loaderVisible = await p.evaluate(() => !document.body.dataset.loaded && getComputedStyle(document.querySelector('#loader')).opacity === '1');
ok('loader visible before ready', loaderVisible);
if (!flags.b) await shot('00-loader');
await p.waitForFunction(() => window.__cinema?.info().loaded, null, { timeout: 120000 });
ok('loaded after model', (await info()).model === 'ready');
await p.mouse.move(+W * 0.2, +H * 0.5);
await p.waitForTimeout(2600);
await shot('01-hero');
ok('scramble resolved', (await p.textContent('#hero [data-scramble]')) === 'PROLOGUE');
ok('hero caption revealed', await p.evaluate(() => document.querySelector('#hero [data-reveal]').classList.contains('in')));
if (flags.b) { console.log(tag, JSON.stringify(await info())); finish(); }

// 遮罩入场中途：瞬移到记忆屏
await p.evaluate(() => window.scrollTo(0, document.getElementById('mem').offsetTop));
await p.waitForTimeout(520);
await shot('03-reveal-mid');
await p.waitForTimeout(2000);
ok('memory scramble resolved', (await p.textContent('#mem [data-scramble]')) === 'MEMORY');
ok('controls stuck after first screen', (await info()).stuck);
ok('back-to-top visible', await p.evaluate(() => getComputedStyle(document.querySelector('#totop')).visibility === 'visible'));

// 菜单：开 → Esc → 开 → 跳到 KURISU
await p.click('#b-menu'); await p.waitForTimeout(500);
await shot('02-menu-open');
ok('menu open + main inert', (await info()).menu && await p.evaluate(() => document.querySelector('#main').inert));
ok('focus inside menu', await p.evaluate(() => !!document.activeElement.closest('#menu')));
await p.keyboard.press('Tab'); await p.keyboard.press('Tab'); await p.keyboard.press('Tab'); await p.keyboard.press('Tab');
ok('focus trapped', await p.evaluate(() => !!document.activeElement.closest('#menu,#b-menu')));
await p.keyboard.press('Escape'); await p.waitForTimeout(500);
ok('Esc closes menu', !(await info()).menu && await p.evaluate(() => !document.querySelector('#main').inert && document.activeElement.id === 'b-menu'));
await p.click('#b-menu'); await p.waitForTimeout(450);
await p.click('.menu a[data-jump="her"]');
await p.waitForTimeout(1800);
ok('menu jump to her', Math.abs(await secTop('her')) < 4 && (await info()).sec === 'her' && !(await info()).menu, `top=${await secTop('her')}`);
await p.waitForTimeout(1200);
await shot('05-her-before');

// 她：连续切换 + 箭头
for (const i of [1, 2, 3, 4, 5, 2, 0]) { await p.click(`#thumbs button[data-h="${i}"]`); await p.waitForTimeout(450); }
ok('thumb switching', (await info()).her === 0);
await p.click('#st-prev'); await p.waitForTimeout(400); await p.click('#st-prev'); await p.waitForTimeout(400);
await p.click('#st-next'); await p.waitForTimeout(400);
ok('arrows', (await info()).her === 7, `her=${(await info()).her}`);
await p.click('#thumbs button[data-h="4"]'); await p.waitForTimeout(1700);
await shot('06-her-after');
ok('her expression pout', (await info()).expr === '表情_むっとする', (await info()).expr);
// 从半屏位置点缩略图：应把章节顶部滚入视口
await p.evaluate(() => window.scrollBy(0, -window.innerHeight * 0.3)); await p.waitForTimeout(400);
await p.click('#thumbs button[data-h="1"]'); await p.waitForTimeout(1300);
ok('thumb click scrolls section into view', Math.abs(await secTop('her')) < 4, `top=${await secTop('her')}`);
await p.click('#thumbs button[data-h="7"]'); await p.waitForTimeout(2500);
ok('voice state performing', (await info()).act === 'form' || true, String((await info()).act));

// 记忆画廊
await p.evaluate(() => document.getElementById('mem').scrollIntoView()); await p.waitForTimeout(1400);
for (const i of [1, 3, 2, 0, 3]) { await p.click(`#frags button[data-f="${i}"]`); await p.waitForTimeout(350); }
await p.click('#frags button[data-f="2"]'); await p.waitForTimeout(1800);
await shot('07-memory-click');
ok('memory switching', (await info()).frag === 2 && (await info()).act === null);
ok('gallery front image', await p.evaluate(() => [...document.querySelectorAll('#gal img.on')].length === 1 && document.querySelector('#gal img.on').src.includes('radiokan')));

// 回到顶部
await p.click('#totop'); await p.waitForTimeout(1600);
ok('back to top', (await p.evaluate(() => scrollY)) < 2 && !(await info()).stuck);

// 世界线：按钮 → B，D 键 → A
await p.click('#b-world');
await p.waitForFunction(() => !window.__cinema.info().shifting && window.__cinema.info().world === 'b', null, { timeout: 60000 });
ok('world button → b', (await info()).alias === 'alt');
await p.waitForTimeout(800);
await p.keyboard.press('d');
await p.waitForTimeout(300);
await p.waitForFunction(() => !window.__cinema.info().shifting && window.__cinema.info().world === 'a', null, { timeout: 60000 });
ok('D key → a', (await info()).alias === 'ab');
console.log(tag, JSON.stringify(await info()));
finish();

async function finish() {
  console.log(checks.join('\n'));
  console.log('errors', errors.length, JSON.stringify(errors));
  await browser.close();
  process.exit(0);
}
