import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 760, height: 1000 } });
p.on('pageerror', e => console.log('pageerror', e.message));
p.on('console', m => { if (m.type()==='error') console.log('console.error', m.text().slice(0,200)); });
await p.goto('http://127.0.0.1:5290/probe.html');
await p.waitForFunction(() => window.st?.state === 'ready', null, { timeout: 300000 });
const c = await p.$('#c');
const shot = async (n) => { await p.waitForTimeout(1800); await c.screenshot({ path: `.tmp/pr/${n}.png` }); console.log('shot', n); };
await p.waitForTimeout(2000);
console.log('labels', await p.evaluate(() => window.st.player.mainTimelineLabels.length));
await shot('ab-base');
for (const [v, val] of [['arm_type', 1], ['act_sp', 100], ['act_sp', -100], ['act_sp2', 100], ['act_sp2', -100], ['act_sp3', 100], ['act_sp3', -100], ['body_slant', 60]]) {
  await p.evaluate(([v, val]) => window.st.player.setVariable(v, val), [v, val]);
  await shot(`ab-${v}${val}`);
  await p.evaluate(([v]) => window.st.player.setVariable(v, v === 'arm_type' ? 0 : 0), [v]);
}
// motions
await p.evaluate(() => window.st.motion('tilt')); await p.waitForTimeout(900); await c.screenshot({ path: '.tmp/pr/ab-motion-tilt.png' });
await p.waitForTimeout(2000);
await p.evaluate(() => window.st.setView({ zoom: 1.6, dx: 0, dy: -60 }, 100)); await shot('ab-zoom');
await p.evaluate(() => window.st.setView({}, 100));
for (const a of ['alt', 'lab']) {
  const t0 = Date.now();
  const ok = await p.evaluate((a) => window.st.swap(a), a);
  console.log('swap', a, ok, Date.now() - t0, 'ms', await p.evaluate(() => ({ labelsOk: window.st.labelsOk, state: window.st.state, n: window.st.player?.mainTimelineLabels?.length, cur: window.st.current })));
  await p.evaluate(() => window.st.setExpression('表情_笑う'));
  await shot(`${a}-smile`);
  await p.evaluate(() => window.st.setExpression('表情_普通'));
  await shot(`${a}-base`);
}
console.log('mem', await p.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) + 'MB' : 'n/a'));
await b.close();
