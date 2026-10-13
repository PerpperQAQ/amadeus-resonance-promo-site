// v6 QA（真模型）：首屏字标、6 屏页码、换装浮现逐帧/帧时间、第 5 屏。node scripts/qa/pv-ab-v6.mjs [WxH]
import { chromium } from 'playwright';
const [W, H] = (process.argv[2] || '1440x900').split('x').map(Number);
const b = await chromium.launch({ channel: 'chrome' }); const pg = await b.newPage({ viewport: { width: W, height: H } });
const errs = []; pg.on('console', (m) => m.type() === 'error' && !/\/audio\//.test(m.text()) && errs.push(m.text())); pg.on('pageerror', (e) => errs.push('PE ' + e.message));
await pg.goto('http://127.0.0.1:5291/pv-ab.html');
await pg.waitForFunction(() => document.body.classList.contains('loaded') && __ab.B.state === 'ready', null, { timeout: 120000 });
const T = `output/playwright/akqa/v6-${W}`;
await pg.evaluate(() => __ab.go(0)); await pg.waitForTimeout(2500); await pg.screenshot({ path: `${T}-s0.png` });
for (let n = 0; n < 6; n++) { await pg.evaluate((n) => __ab.go(n), n); await pg.waitForTimeout(1500);
  const r = await pg.evaluate(() => { const c = document.querySelector('.counter').getBoundingClientRect(); return { x: c.left - 10, y: c.top - 10, width: c.width + 20, height: c.height + 20 }; });
  await pg.screenshot({ path: `${T}-cn${n}.png`, clip: r }); if (n === 4) await pg.screenshot({ path: `${T}-s4.png` }); }
await pg.evaluate(() => __ab.go(1)); await pg.waitForTimeout(2500);
await pg.evaluate(() => { window.__ft = []; let l = performance.now(); const f = (t) => { __ft.push(t - l); l = t; window.__r = requestAnimationFrame(f); }; requestAnimationFrame(f); });
const t0 = Date.now(); const sw = pg.evaluate(() => __ab.swapOutfit());
for (const at of [800, 1200, 1600]) { await pg.waitForTimeout(Math.max(0, at - (Date.now() - t0))); await pg.screenshot({ path: `${T}-swap-${at}.png` }); }
const ok = await sw;
const ft = await pg.evaluate(() => { cancelAnimationFrame(__r); const a = __ft.slice(2), s = [...a].sort((x, y) => x - y); return { frames: a.length, mean: +(a.reduce((p, x) => p + x, 0) / a.length).toFixed(1), p95: +s[Math.floor(s.length * .95)].toFixed(1), max: +s[s.length - 1].toFixed(1), jank: a.filter((x) => x > 34).length }; });
await pg.waitForTimeout(800); await pg.screenshot({ path: `${T}-swap-end.png` });
const after = await pg.evaluate(() => [__ab.fg.alias, document.body.classList.contains('swapping'), !!document.querySelector('.rv-fx.on')]);
const back = await pg.evaluate(() => __ab.swapOutfit());
console.log(JSON.stringify({ ok, back, ft, after })); console.log('errs', errs); await b.close();
