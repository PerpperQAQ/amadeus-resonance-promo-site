// RE:BOOT 式长页概念稿：截图 + 交互自检。node scripts/cap-reboot.mjs <white|dark|hybrid> [宽] [高] [--b]
import { chromium } from 'playwright';
import fs from 'node:fs';
const pos = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const [V = 'white', W = '1440', H = '900'] = pos;
const B = process.argv.includes('--b');
const OUT = `docs/screenshots/concept-reboot/${V}`;
fs.mkdirSync(OUT, { recursive: true });
const errors = [], checks = [];
const ok = (n, c, x = '') => checks.push(`${c ? 'PASS' : 'FAIL'} ${n}${x ? ' ' + x : ''}`);
const browser = await chromium.launch({ channel: 'chrome' });
const p = await browser.newPage({ viewport: { width: +W, height: +H } });
p.setDefaultTimeout(90000);
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text().slice(0, 200)); });
p.on('requestfailed', (r) => { const u = r.url(); if (/\/audio\/.*\.m4a$/.test(u) && /ABORTED/.test(r.failure()?.errorText || '')) return; errors.push('requestfailed: ' + u.slice(-80) + ' ' + (r.failure()?.errorText || '')); });
const tag = `${B ? 'b' : 'a'}-${W}x${H}`;
const shot = (n, o = {}) => p.screenshot({ path: `${OUT}/${tag}-${n}.png`, ...o });
const info = () => p.evaluate(() => window.__reboot.info());
const top = (id) => p.evaluate((id) => Math.round(document.getElementById(id).getBoundingClientRect().top), id);

await p.goto(`http://127.0.0.1:5291/reboot-${V}.html${B ? '?wl=b' : ''}`);
await p.waitForFunction(() => window.__reboot?.info().loaded, null, { timeout: 60000 });
await p.mouse.move(+W * 0.6, +H * 0.4);
await p.waitForTimeout(2200);
await shot('01-hero');
ok('model not loaded at top (lazy)', (await info()).model === 'not-loaded');
if (B) { console.log(tag, JSON.stringify(await info())); await done(); }

// 慢速滚完整页，触发所有入场与模型懒加载
const total = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < total; y += 380) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(140); }
await p.waitForTimeout(800);
ok('controls stuck', (await info()).stuck);
await p.evaluate(() => document.getElementById('character').scrollIntoView());
await p.waitForFunction(() => window.__reboot.info().model === 'ready', null, { timeout: 120000 });
ok('model loaded near character', true);
await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(1200);
ok('model paused out of view', (await info()).rendering === false, String((await info()).rendering));

// 介绍 / 特性
await p.evaluate(() => document.querySelector('.feats').scrollIntoView({ block: 'center' })); await p.waitForTimeout(1200);
await shot('02-features');

// 目录：开 → Esc → 开 → 跳到画廊
await p.click('#b-menu'); await p.waitForTimeout(450);
ok('menu open', (await info()).menu && await p.evaluate(() => document.querySelector('#main').inert));
await shot('05-menu-open');
await p.keyboard.press('Escape'); await p.waitForTimeout(450);
ok('Esc closes menu', !(await info()).menu && await p.evaluate(() => document.activeElement.id === 'b-menu'));
await p.click('#b-menu'); await p.waitForTimeout(450);
await p.click('.menu a[data-jump="gallery"]'); await p.waitForTimeout(1600);
ok('menu jump → gallery', Math.abs(await top('gallery')) < 4, `top=${await top('gallery')}`);

// 画廊：切换 + 浮层
for (const i of [3, 1, 5, 2]) { await p.click(`#strip button[data-g="${i}"]`); await p.waitForTimeout(300); }
await p.waitForTimeout(700);
ok('gallery switch', (await info()).gal === 2);
await p.click('#viewer'); await p.waitForTimeout(500);
ok('overlay open', (await info()).over && await p.evaluate(() => document.activeElement.id === 'over-x'));
await shot('04-gallery-overlay');
await p.keyboard.press('Escape'); await p.waitForTimeout(450);
ok('overlay Esc', !(await info()).over);
await p.click('#viewer'); await p.waitForTimeout(450); await p.click('#over-x'); await p.waitForTimeout(450);
ok('overlay close button', !(await info()).over);

// 系统
await p.evaluate(() => document.getElementById('system').scrollIntoView()); await p.waitForTimeout(600);
await p.click('#tiers button[data-t="2"]'); await p.waitForTimeout(700);
ok('system tier switch', (await info()).sys === 2 && await p.evaluate(() => document.querySelector('.sys-fig img.on').src.includes('app-vn')));

// 获取方式：页签
await p.evaluate(() => document.getElementById('product').scrollIntoView()); await p.waitForTimeout(600);
await p.click('#tab-win'); await p.waitForTimeout(200);
ok('tab windows', (await info()).tab === 1 && await p.evaluate(() => !document.getElementById('pane-win').hidden && document.getElementById('pane-mac').hidden));
await p.keyboard.press('ArrowRight'); await p.waitForTimeout(200);
ok('tab arrow key → 配置要求', (await info()).tab === 2);

// 角色：从别处点缩略图应滚入视口；连续切换
await p.evaluate(() => document.getElementById('character').scrollIntoView()); await p.waitForTimeout(300);
await p.evaluate(() => scrollBy(0, -innerHeight * 0.35)); await p.waitForTimeout(400);
await p.click('#thumbs button[data-h="1"]'); await p.waitForTimeout(1300);
ok('thumb click scrolls into view', Math.abs(await top('character')) < 4, `top=${await top('character')}`);
for (const i of [2, 3, 5, 0, 4]) { await p.click(`#thumbs button[data-h="${i}"]`); await p.waitForTimeout(420); }
await p.click('#st-next'); await p.waitForTimeout(350); await p.click('#st-prev'); await p.waitForTimeout(1500);
ok('character switch', (await info()).her === 4 && (await info()).expr === '表情_むっとする', (await info()).expr);
await shot('03-character-after');
await p.click('#thumbs button[data-h="7"]'); await p.waitForTimeout(2200);
ok('voice state', true, String((await info()).act));
// 世界线
await p.click('#b-world'); await p.waitForFunction(() => !window.__reboot.info().shifting && window.__reboot.info().world === 'b', null, { timeout: 60000 });
ok('world → b (model alt)', (await info()).alias === 'alt');
await p.keyboard.press('d'); await p.waitForTimeout(200);
await p.waitForFunction(() => !window.__reboot.info().shifting && window.__reboot.info().world === 'a', null, { timeout: 60000 });
ok('D → a', (await info()).alias === 'ab');

// 整页长图
await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(1500);
await shot('00-full', { fullPage: true });
console.log(tag, JSON.stringify(await info()));
await done();
async function done() { console.log(checks.join('\n')); console.log('errors', errors.length, JSON.stringify(errors)); await browser.close(); process.exit(0); }
