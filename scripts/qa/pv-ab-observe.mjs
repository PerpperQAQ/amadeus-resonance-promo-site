// 第 4 屏观测小窗：自动演示（台词→选项让开→选择→反应）+ 9 种形态逐一截图。node scripts/qa/pv-ab-observe.mjs [WxH] [reduce]
import { chromium } from 'playwright';
const [W, H] = (process.argv[2] || '1440x900').split('x').map(Number), rm = process.argv[3] === 'reduce';
const b = await chromium.launch({ channel: 'chrome' }); const pg = await b.newPage({ viewport: { width: W, height: H }, reducedMotion: rm ? 'reduce' : 'no-preference' });
const errs = []; pg.on('console', (m) => m.type() === 'error' && !/\/audio\//.test(m.text()) && errs.push(m.text())); pg.on('pageerror', (e) => errs.push('PE ' + e.message));
await pg.goto('http://127.0.0.1:5291/pv-ab.html');
await pg.waitForFunction(() => document.body.classList.contains('loaded'), null, { timeout: 120000 });
const T = `output/playwright/akqa/obs-${W}${rm ? '-rm' : ''}`;
await pg.evaluate(() => __ab.go(3));
const r = {};
await pg.waitForSelector('#gw-choice:not([hidden])', { timeout: 30000 }); await pg.waitForTimeout(rm ? 300 : 2600);
r.choiceTier = await pg.$eval('.s3 .mw', (e) => e.dataset.tier); r.hint = await pg.$eval('.s3 .mw-talk', (e) => e.textContent.trim());
await pg.screenshot({ path: `${T}-choice.png` });
await pg.click('#gw-opts button[data-c="1"]'); await pg.waitForTimeout(rm ? 800 : 3500);
r.afterTier = await pg.$eval('.s3 .mw', (e) => e.dataset.tier); r.react = await pg.$eval('.s3 .mw-talk', (e) => e.textContent.trim());
await pg.screenshot({ path: `${T}-picked.png` });
r.modes = {};
for (const m of ['large', 'mid', 'strip', 'ask', 'paused', 'tucked', 'over', 'fault', 'auto']) {
  await pg.click(`.obs-modes button[data-m="${m}"]`); await pg.waitForTimeout(m === 'ask' ? 4200 : m === 'tucked' ? 3500 : 2400);
  r.modes[m] = await pg.evaluate(() => { const mw = document.querySelector('.s3 .mw'), pd = document.querySelector('.s3 .pd'); return [mw.dataset.tier, pd.dataset.layout, mw.hasAttribute('data-paused'), mw.dataset.fault || '', pd.hasAttribute('data-tucked'), (document.querySelector('.s3 .mw-tucked .mw-bubble:not([hidden])') || document.querySelector('.s3 .mw-talk')).textContent.trim().slice(0, 24)]; });
  await pg.screenshot({ path: `${T}-${m}.png` });
}
r.fit = await pg.evaluate(() => { const o = document.querySelector('.s3 .obs').getBoundingClientRect(), l = document.querySelector('.obs-modes').getBoundingClientRect(); return { obs: [o.left, o.top, o.right, o.bottom].map(Math.round), modes: [l.left, l.top, l.right, l.bottom].map(Math.round), bot: Math.round(innerHeight * .848), k: getComputedStyle(document.querySelector('.s3')).getPropertyValue('--k') }; });
await pg.evaluate(() => __ab.go(4)); await pg.waitForTimeout(800); await pg.evaluate(() => __ab.go(3)); await pg.waitForTimeout(1500);
r.reenter = await pg.$eval('.obs-modes button[aria-pressed="true"]', (e) => e.dataset.m);
console.log(JSON.stringify(r, null, 1)); console.log('errs', errs); await b.close();
