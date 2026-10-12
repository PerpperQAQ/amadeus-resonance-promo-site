import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 760, height: 1000 } });
await p.goto('http://127.0.0.1:5290/probe.html');
await p.waitForFunction(() => window.st?.state === 'ready', null, { timeout: 300000 });
const c = await p.$('#c');
await p.waitForTimeout(2500);
const shot = async (n) => { await p.waitForTimeout(2500); await c.screenshot({ path: `.tmp/pr/m-${n}.png` }); console.log(n); };
await shot('base');
for (const [n, to] of [['slant', { head_slant: 100 }], ['headLR', { head_LR: 100 }], ['headUD', { head_UD: 100 }], ['bodyLR', { body_LR: 100 }], ['bodyUD', { body_UD: 100 }], ['bodySlant', { body_slant: 100 }]]) {
  await p.evaluate((to) => { for (const [v, val] of Object.entries(to)) window.st.player.setVariableDiff('mot', v, val, 100); }, to);
  await shot(n);
  await p.evaluate((to) => { for (const v of Object.keys(to)) window.st.player.setVariableDiff('mot', v, 0, 100); }, to);
}
// arm_type via real transition
await p.evaluate(() => window.st.player.setVariable('arm_type', 1)); await shot('arms');
await b.close();
