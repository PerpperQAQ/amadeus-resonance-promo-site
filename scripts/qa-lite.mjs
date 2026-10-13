// Lite-model QA: node scripts/qa-lite.mjs [baseURL] [pages,csv]  (times in ms; reboot pages relative to scrolling #character into view)
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://127.0.0.1:5291/';
const pages = (process.argv[3] || 'index.html,cinema.html,terminal.html,fusion.html,split.html,reboot-white.html,reboot-dark.html,reboot-hybrid.html,pv.html,pv-ui.html,pv-ab.html').split(',');
const b = await chromium.launch({ channel: 'chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
for (const p of pages) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const pg = await ctx.newPage();
  const errs = []; pg.on('console', (m) => m.type() === 'error' && errs.push(m.text())); pg.on('pageerror', (e) => errs.push(e.message));
  const run = async () => { await pg.goto(base + p, { waitUntil: 'domcontentloaded' });
    let t0 = 0; if (p.startsWith('reboot')) { await pg.waitForTimeout(800); t0 = await pg.evaluate(() => { document.querySelector('#character').scrollIntoView(); return performance.now(); }); }
    try { await pg.waitForFunction(() => performance.getEntriesByName('emote-ready').length || performance.getEntriesByName('emote-error').length, null, { timeout: 120000, polling: 100 }); } catch { return 'timeout'; }
    return pg.evaluate((t0) => { const g = (n) => { const e = performance.getEntriesByName(n)[0]; return e ? Math.round(e.startTime - t0) : -1; }; return `poster ${g('emote-poster')} ready ${g('emote-ready')}${g('emote-error') >= 0 ? ' ERROR' : ''}`; }, t0); };
  const cold = await run(); const warm = await run();
  console.log(p, '| cold', cold, '| warm', warm, '| errs', JSON.stringify(errs.slice(0, 3)));
  await ctx.close();
}
await b.close();
