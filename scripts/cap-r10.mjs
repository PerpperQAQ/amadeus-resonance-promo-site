// 第十轮截图：node scripts/cap-r10.mjs <输出目录> [宽 高] [--world=a|b|ab] [--only=perform,local]
// 逐章截图（A/B 世界线）、顶栏特写、进度条特写、05 章“字/声/形”演出中截图；同时记录控制台错误。
import { chromium } from 'playwright';
import fs from 'node:fs';
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const flags = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const OUT = args[0] || 'docs/screenshots/r10', W = +(args[1] || 1440), H = +(args[2] || 900);
const worlds = (flags.world || 'ab').split('');
const only = flags.only ? flags.only.split(',') : null;
fs.mkdirSync(OUT, { recursive: true });
const errors = [];
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage({ viewport: { width: W, height: H } });
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await p.goto((process.env.BASE_URL || 'http://127.0.0.1:5287/') + '?autoenter'); await p.waitForFunction(() => window.__promo?.info().boot === 'done', null, { timeout: 300000 });
await p.evaluate(() => document.fonts.ready);
const ids = await p.evaluate(() => [...document.querySelectorAll('.sec')].map((s) => s.id));
const go = async (id) => { await p.evaluate((id) => { document.documentElement.style.scrollBehavior = 'auto'; document.getElementById(id).scrollIntoView(); }, id); await p.waitForTimeout(2600); };
for (const w of worlds) {
  if (w === 'b') { await p.keyboard.press('d'); await p.waitForFunction(() => window.__promo.info().world === 'b' && !window.__promo.info().busy, null, { timeout: 180000 }); await p.waitForTimeout(600); }
  for (const [i, id] of ids.entries()) {
    if (only && !only.includes(id)) continue;
    await go(id);
    if (id === 'boundary') { await p.locator('#rings .ring[data-tier="2"]').dispatchEvent('click'); await p.waitForTimeout(1800); }
    await p.mouse.move(W - 4, H * 0.4);
    await p.screenshot({ path: `${OUT}/${w}-${W}x${H}-${String(i + 1).padStart(2, '0')}-${id}.png` });
    if (id === 'hero') await p.screenshot({ path: `${OUT}/${w}-${W}-topbar.png`, clip: { x: 0, y: 0, width: Math.min(560, W), height: 90 } });
    if (id === 'what') await p.screenshot({ path: `${OUT}/${w}-${W}-rail.png`, clip: { x: 0, y: H - 60, width: W, height: 60 } });
    if (id === 'boundary') { await p.locator('#rings .ring[data-tier="3"]').dispatchEvent('click'); await p.waitForTimeout(1800); await p.screenshot({ path: `${OUT}/${w}-${W}x${H}-04-boundary-locked.png` }); }
    if (id === 'perform') {
      for (const [k, act] of ['text', 'voice', 'form'].entries()) {
        await p.locator('.tri').nth(k).click(); await p.waitForTimeout(act === 'form' ? 4600 : 1900);
        await p.screenshot({ path: `${OUT}/${w}-${W}x${H}-05-perform-${act}.png` });
      }
      await go('local');   // 离开本章应停止
    }
  }
}
fs.writeFileSync(`${OUT}/errors-${W}x${H}.json`, JSON.stringify(errors, null, 2));
console.log('errors', errors.length, errors.slice(0, 5));
await b.close();
