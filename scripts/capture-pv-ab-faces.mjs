// 从实时模型截取 pv-ab 表情缩略图（彩色、脸部特写）：node scripts/capture-pv-ab-faces.mjs（需 5291 dev server）
import { chromium } from 'playwright';
import { writeFileSync, unlinkSync } from 'node:fs';
const EX = { calm: '普通', smile: '笑う', smug: 'ニヤニヤ', joy: '楽しい00', shy: '照れる', pout: 'むっとする', glare: '睨む', surprise: '驚き01', worry: '困る01', sleepy: '眠そう' };
writeFileSync('zz-facecap.html', `<!doctype html><body style="margin:0;background:#1d1f20"><canvas id="c" width="720" height="960" style="width:720px;height:960px"></canvas><script type="module">
import { EmoteStage } from '/src/emote-stage.js';
const s = new EmoteStage({ canvas: document.getElementById('c'), base: '/', resolution: 1, minLogoMs: 0 });
s.addEventListener('ready', () => { s.setView({ zoom: 2.2 }, 0); window.__ready = true; }); s.setActive(true); s.start(); window.__s = s;
</script>`);
const b = await chromium.launch({ channel: 'chrome' });
try {
  const pg = await b.newPage({ viewport: { width: 760, height: 1000 } });
  await pg.goto('http://127.0.0.1:5291/zz-facecap.html');
  await pg.waitForFunction(() => window.__ready || window.__s?.state === 'ready', null, { timeout: 120000 });
  await pg.evaluate(() => window.__s.setView({ zoom: 2.2 }, 0)); await pg.waitForTimeout(2500);
  for (const [k, t] of Object.entries(EX)) {
    await pg.evaluate((t) => window.__s.setExpression('表情_' + t), t); await pg.waitForTimeout(1400);
    await pg.screenshot({ path: `.tmp/ex-${k}.png`, clip: { x: 180, y: 50, width: 360, height: 421 } }); console.log(k);
  }
} finally { await b.close(); unlinkSync('zz-facecap.html'); }
// 之后：.tmp/ex-*.png → 200x234 webp（scripts 外用 PIL/cwebp 转码）
import { execFileSync } from 'node:child_process';
execFileSync('python3', ['-c', `from PIL import Image\nfor k in ${JSON.stringify(Object.keys(EX))}: Image.open(f'.tmp/ex-{k}.png').convert('RGB').resize((200,234),Image.LANCZOS).save(f'public/img/pv-ab/ex-{k}.webp',quality=86)`]);
