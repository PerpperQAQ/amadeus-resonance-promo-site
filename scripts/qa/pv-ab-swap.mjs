// 景深交换 + 空闲剪影帧时。node scripts/qa/pv-ab-swap.mjs [WxH] [reduce]
import { chromium } from 'playwright';
const [W, H] = (process.argv[2] || '1440x900').split('x').map(Number), rm = process.argv[3] === 'reduce';
const b = await chromium.launch({ channel: 'chrome' });
const pg = await b.newPage({ viewport: { width: W, height: H }, reducedMotion: rm ? 'reduce' : 'no-preference' });
const errs = [];
pg.on('console', (m) => m.type() === 'error' && !/\/audio\//.test(m.text()) && errs.push(m.text()));
pg.on('pageerror', (e) => errs.push('PE ' + e.message));
await pg.goto('http://127.0.0.1:5291/pv-ab.html');
await pg.waitForFunction(() => document.body.classList.contains('loaded') && __ab.B.state === 'ready', null, { timeout: 120000 });
const T = `output/playwright/akqa/swap-${W}${rm ? '-rm' : ''}`;
await pg.evaluate(() => __ab.go(1));
await pg.waitForTimeout(3200);
await pg.waitForFunction(() => !__ab.gh.active && !__ab.gh.rendering, null, { timeout: 5000 }).catch(() => {});
await pg.screenshot({ path: `${T}-0.png` });
const hintXY = async () => pg.evaluate(() => {
  const t = document.getElementById('swap-tag').getBoundingClientRect();
  return [t.left + 4, t.top + t.height / 2];
});
let g = await hintXY();
await pg.mouse.move(g[0], g[1]);
await pg.waitForTimeout(400);
const hintOn = await pg.evaluate(() => [getComputedStyle(document.getElementById('swap-tag')).opacity, document.body.classList.contains('ghost-hover')]);
await pg.screenshot({ path: `${T}-hover.png` });

const frameStats = (ft) => {
  const a = ft.slice(2), s = [...a].sort((x, y) => x - y), over = s.filter((x) => x > 20);
  return { frames: a.length, mean: +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1), p95: +s[Math.floor(s.length * .95)].toFixed(1), max: +s[s.length - 1].toFixed(1), over20: over.length };
};

const idle = await pg.evaluate(() => new Promise((res) => {
  const ft = []; let l = performance.now();
  const f = (t) => {
    ft.push(t - l); l = t;
    if (ft.length < 90) requestAnimationFrame(f);
    else {
      const sil = document.querySelector('.stage.ghost canvas.sil');
      res({ ft, ghostActive: __ab.gh.active, ghostRendering: __ab.gh.rendering, fgRendering: __ab.fg.rendering, sil: !!sil && parseFloat(getComputedStyle(sil).opacity) > 0.2 });
    }
  };
  requestAnimationFrame(f);
}));
const idleStats = { ...frameStats(idle.ft), ghostActive: idle.ghostActive, ghostRendering: idle.ghostRendering, fgRendering: idle.fgRendering, silVisible: idle.sil };

await pg.evaluate(() => __ab.swapOutfit());
await pg.waitForTimeout(rm ? 500 : 1800);
await pg.waitForFunction(() => !__ab.gh.active, null, { timeout: 3000 }).catch(() => {});

const measure = async () => {
  await pg.evaluate(() => {
    window.__fr = []; let l = performance.now();
    const f = (t) => { __fr.push([t - l, document.body.classList.contains('swapping')]); l = t; window.__rr = requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
  g = await hintXY();
  await pg.mouse.click(g[0], g[1]);
  await pg.waitForFunction(() => document.body.classList.contains('swapping'), null, { timeout: 3000 });
  await pg.waitForFunction(() => !document.body.classList.contains('swapping'), null, { timeout: 5000 });
  await pg.waitForTimeout(250);
  await pg.waitForFunction(() => !__ab.gh.active, null, { timeout: 3000 }).catch(() => {});
  return pg.evaluate(() => {
    cancelAnimationFrame(__rr);
    const a = __fr.slice(2), sw = a.filter((r) => r[1]), ft = a.map((r) => r[0]);
    const sorted = [...ft].sort((x, y) => x - y), over = sorted.filter((x) => x > 20);
    return {
      frames: a.length, swapFrames: sw.length,
      mean: +(ft.reduce((s, x) => s + x, 0) / ft.length).toFixed(1),
      p95: +sorted[Math.floor(sorted.length * .95)].toFixed(1),
      max: +sorted[sorted.length - 1].toFixed(1), over20: over.length,
      fg: __ab.fg.alias, ghostActive: __ab.gh.active,
    };
  });
};

const r1 = await measure();
await pg.waitForTimeout(400);
const idle2 = await pg.evaluate(() => new Promise((res) => {
  const ft = []; let l = performance.now();
  const f = (t) => { ft.push(t - l); l = t; if (ft.length < 90) requestAnimationFrame(f); else res({ ft, ghostActive: __ab.gh.active }); };
  requestAnimationFrame(f);
}));
const idleAfter = { ...frameStats(idle2.ft), ghostActive: idle2.ghostActive };
const r2 = await measure();

const vis = async (tag) => {
  g = await hintXY();
  const p = pg.mouse.click(g[0], g[1]);
  const t0 = Date.now();
  for (const at of rm ? [80, 160, 300] : [375, 750, 1125, 1500]) {
    await pg.waitForTimeout(Math.max(0, at - (Date.now() - t0)));
    await pg.screenshot({ path: `${T}-${tag}-${at}.png` });
  }
  await p;
  await pg.waitForTimeout(rm ? 400 : 400);
  await pg.waitForFunction(() => !__ab.gh.active, null, { timeout: 3000 }).catch(() => {});
};
await vis('go');
await pg.screenshot({ path: `${T}-1.png` });

const hit = await pg.evaluate(async () => {
  const n = __ab.LOG.length;
  document.getElementById('hit').click();
  await new Promise((r) => setTimeout(r, 600));
  return __ab.LOG.slice(n).map((x) => x[0]);
});
console.log(JSON.stringify({ hintOn, idle: idleStats, idleAfter, r1, r2, hit }));
console.log('errs', errs);
await b.close();
