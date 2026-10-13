// v4 QA：node scripts/qa/pv-ab-shots.mjs 1440x900 [reduce]
import { chromium } from 'playwright';
const [W, H] = (process.argv[2] || '1440x900').split('x').map(Number); const RM = process.argv[3] === 'reduce';
const O = `output/playwright/akqa/v4-${W}${RM ? '-rm' : ''}`;
const b = await chromium.launch({ channel: 'chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, reducedMotion: RM ? 'reduce' : 'no-preference' });
const pg = await ctx.newPage(); const errs = [];
pg.on('console', (m) => m.type() === 'error' && !/\/audio\//.test(m.text()) && errs.push(m.text())); pg.on('pageerror', (e) => errs.push('PE ' + e.message));
await pg.goto('http://127.0.0.1:5291/pv-ab.html');
await pg.waitForFunction(() => document.body.classList.contains('loaded') && (__ab.B.state === 'ready' || __ab.ghostLive === false), null, { timeout: 120000 });
const w = (ms) => pg.waitForTimeout(ms), shot = (n) => pg.screenshot({ path: `${O}-${n}.png` });
const sub = () => pg.evaluate(() => [document.querySelector('#sub').classList.contains('on'), document.querySelector('#sub-jp').textContent, document.querySelector('#sub-zh').textContent]);
const R = {};
await w(2500); await shot('s0');
await pg.evaluate(() => __ab.go(1)); await w(2400); await shot('s1');
const hb = await pg.locator('#hit').boundingBox();
R.react = [];
for (let i = 0; i < 3; i++) { await pg.mouse.click(hb.x + hb.width / 2, hb.y + hb.height * .3); await w(1200); R.react.push((await sub())[2]); await w(1800); }
await pg.click('#asks li:nth-child(1) button'); await w(2600); R.askText = await sub(); await shot('s1-ask-text'); await w(2500);
await pg.click('#asks li:nth-child(2) button'); await w(3500); R.askVoice = await sub(); await shot('s1-ask-voice');
await pg.click('#asks li:nth-child(2) button'); await w(900); R.interrupt = await sub(); await w(2500);
await pg.click('#asks li:nth-child(3) button'); await w(4200); R.askEmote = [await sub(), await pg.evaluate(() => __ab.state.expr)]; await w(8000); R.askEmoteAfter = [await sub(), await pg.evaluate(() => __ab.state.expr)];
await pg.mouse.click(W * .37, H * .3); await w(2600); await pg.mouse.move(10, 10); await w(400); R.swap = await pg.textContent('#outfit-now'); await shot('s1-swapped');
await pg.mouse.click(W * .37, H * .3); await w(2600); R.swap2 = await pg.textContent('#outfit-now');
await pg.evaluate(() => __ab.go(2)); await w(2600); await shot('s2-idle');
for (let i = 1; i <= 5; i++) { await pg.hover(`#flist li:nth-child(${i}) button`); await w(1300); await shot(`s2-f${i}`); }
await pg.mouse.move(10, 10); await w(1500);
const pf = await pg.locator('#pf').boundingBox();
await pg.hover('#flist li:nth-child(3) button'); await w(1300);
for (let i = 0; i < 12; i++) { await pg.mouse.move(W * .66 + i * 3, H * .5); await w(16); }
await shot('s2-repel'); await w(1500);
await pg.click('#flist li:nth-child(1) button'); await w(1500); await shot('s2-det1'); R.det = [];
for (let i = 0; i < 5; i++) { R.det.push(await pg.evaluate(() => [__ab.fKey, document.querySelector('#fd-copy h2')?.textContent, document.querySelector('#fd-prog').style.width])); if (i === 4) await shot('s2-det5'); await pg.click('#fd-next'); await w(1200); }
await pg.click('#fd-prev'); await w(900); await pg.click('#fd-back'); await w(900); R.detClosed = await pg.evaluate(() => !__ab.detOpen);
await pg.evaluate(() => __ab.go(3)); await w(5500); await shot('s3-line'); await w(6500); await shot('s3-deja');
await pg.waitForSelector('#gw-choice:not([hidden])', { timeout: 20000 }); await w(1500); R.hint = await sub(); await shot('s3-choice');
await pg.click('#gw-opts button[data-c="1"]'); await w(1500); R.pick = await sub(); await shot('s3-picked');
await pg.click('#cw-replay'); await w(2500); R.replay = await pg.textContent('#gw-t');
await pg.evaluate(() => __ab.go(4)); await w(2200); await shot('s4');
await pg.evaluate(() => __ab.go(5)); await w(1800); await shot('s5');
R.fieldOff = await pg.evaluate(() => !__ab.field.on);
R.log = await pg.evaluate(() => __ab.LOG.filter((x) => ['morph', 'ask', 'react', 'swap', 'detail', 'cw-choice', 'cw-pick'].includes(x[0])).map((x) => x.slice(0, 2).join(':')).join(' '));
console.log(JSON.stringify(R, null, 1)); console.log('errs', errs); await b.close();
