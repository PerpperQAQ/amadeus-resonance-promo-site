// 生成“她”章节的状态缩略图：用 E-mote 模型本身渲染各表情，截取脸部 → public/img/cinema/ex-*.webp
// 用法：node scripts/cap-cinema-stills.mjs（需 dev server 在 5291）
import { chromium } from 'playwright';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const NAMES = { calm: 'calm', smug: 'smug', shy: 'shy', surprise: 'surprise', pout: 'pout', joy: 'joy', worry: 'worry', glare: 'glare' };
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await p.goto('http://127.0.0.1:5291/cinema.html');
await p.waitForFunction(() => window.__cinema?.info().loaded && window.__cinema.info().model === 'ready', null, { timeout: 120000 });
await p.mouse.move(700, 300);
await p.waitForTimeout(1500);
fs.mkdirSync('.tmp/stills', { recursive: true });
for (const [k, file] of Object.entries(NAMES)) {
  await p.evaluate((k) => { const c = window.__cinema; c.emote.setExpression(c.EX[k]); }, k);
  await p.waitForTimeout(1600);
  const r = await p.evaluate(() => { const q = document.querySelector('#emote-canvas').getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height }; });
  const s = r.w * 0.26;
  await p.screenshot({ path: `.tmp/stills/${file}.png`, clip: { x: r.x + r.w * 0.48 - s / 2, y: r.y + r.h * 0.25 - s / 2, width: s, height: s } });
}
await b.close();
execFileSync('python3', ['-c', `
from PIL import Image
import glob, os
for f in glob.glob('.tmp/stills/*.png'):
    im = Image.open(f).convert('RGB').resize((160, 160), Image.LANCZOS)
    im.save('public/img/cinema/ex-' + os.path.basename(f)[:-4] + '.webp', 'WEBP', quality=86)
    print('ex-' + os.path.basename(f)[:-4] + '.webp')
`], { stdio: 'inherit' });
