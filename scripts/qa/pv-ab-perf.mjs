// 帧时间：node scripts/qa/pv-ab-perf.mjs [1440x900]  —— 每屏 5 s，鼠标持续移动，统计 rAF 间隔
import { chromium } from 'playwright';
const [W, H] = (process.argv[2] || '1440x900').split('x').map(Number);
const b = await chromium.launch({ channel: 'chrome' });
const pg = await b.newPage({ viewport: { width: W, height: H } }); const errs = [];
pg.on('console', (m) => m.type() === 'error' && !/\/audio\//.test(m.text()) && errs.push(m.text())); pg.on('pageerror', (e) => errs.push('PE ' + e.message));
await pg.goto('http://127.0.0.1:5291/pv-ab.html');
await pg.waitForFunction(() => document.body.classList.contains('loaded') && (__ab.B.state === 'ready' || __ab.ghostLive === false), null, { timeout: 120000 });
await pg.waitForTimeout(3000);
const out = {};
for (const [n, act] of [[0, null], [1, 'motion'], [1, 'swap'], [2, null], [3, null]]) {
  await pg.evaluate((n) => __ab.go(n), n); await pg.waitForTimeout(1800);
  await pg.evaluate(() => { window.__ft = []; __ab.tick.cost.length = 0; let l = performance.now(); const f = (t) => { __ft.push(t - l); l = t; if (__ft.length < 2000) window.__ftr = requestAnimationFrame(f); }; requestAnimationFrame(f); });
  const t0 = Date.now(); let i = 0;
  if (act === 'motion') pg.evaluate(() => { const m = ['lean', 'sway', 'think', 'cross']; m.forEach((k, j) => setTimeout(() => document.querySelector(`[data-mo="${k}"]`).click(), j * 1200)); });
  if (act === 'swap') pg.evaluate(() => { __ab.swapOutfit(); setTimeout(() => __ab.swapOutfit(), 2400); });
  while (Date.now() - t0 < 5000) { i++; if (process.env.NOMOUSE) { await pg.waitForTimeout(100); continue; } await pg.mouse.move(W * (.3 + .4 * Math.sin(i / 7)), H * (.4 + .2 * Math.cos(i / 5))); await pg.waitForTimeout(16); }
  const r = await pg.evaluate(() => { cancelAnimationFrame(__ftr); const a = __ft.slice(2).sort((x, y) => x - y); const q = (p) => a[Math.floor(a.length * p)];
    return { frames: a.length, mean: +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(1), p95: +q(.95).toFixed(1), p99: +q(.99).toFixed(1), max: +a[a.length - 1].toFixed(1), jank: a.filter((x) => x > 25).length,
      draw: +(__ab.tick.cost.reduce((s, x) => s + x, 0) / Math.max(1, __ab.tick.cost.length)).toFixed(1), drawMax: +Math.max(0, ...__ab.tick.cost).toFixed(1), renderA: __ab.A.rendering, renderB: __ab.B.rendering }; });
  out[`s${n}${act ? '-' + act : ''}`] = r;
}
out.dpr = await pg.evaluate(() => [devicePixelRatio, __ab.A.canvas?.width, __ab.A.canvas?.height]);
console.log(JSON.stringify(out)); console.log('errs', errs); await b.close();
