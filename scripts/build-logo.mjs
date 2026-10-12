// 从原始 logo.svg 渲染派生图层（原文件只读、不改动）：底图（无齿轮）+ 两个齿轮单独图层，供页面做反向缓转动画。
// 用法：node scripts/build-logo.mjs   输出 .tmp/logo/*.png，再由 scripts/build-logo.py 转 webp
import { chromium } from 'playwright';
import fs from 'node:fs';
const SRC = '/Users/perpperqaq/Documents/Codex/amadeus-system-new/public/local-private-assets/brand/amadeus-resonance/v1/logo.svg';
const svg = fs.readFileSync(SRC, 'utf8');
fs.mkdirSync('.tmp/logo', { recursive: true });
const css = `html,body{margin:0;background:transparent}svg.amadeus-logo-asset{display:block;width:1600px;height:690px}
*{animation:none!important;transition:none!important}
.logo-outline,.title-registration,.logo-reflection,.logo-shine{display:none!important}`;
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage({ viewport: { width: 1600, height: 690 }, deviceScaleFactor: 0.7 });
async function render(name, extra, clipSel) {
  await p.setContent(`<html><head><style>${css}${extra}</style></head><body>${svg}</body></html>`);
  await p.waitForTimeout(600);
  let clip = { x: 0, y: 0, width: 1600, height: 690 };
  if (clipSel) clip = await p.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: Math.floor(r.x), y: Math.max(0, Math.floor(r.y)), width: Math.ceil(r.width), height: Math.ceil(r.height) }; }, clipSel);
  await p.screenshot({ path: `.tmp/logo/${name}.png`, omitBackground: true, clip });
  console.log(name, JSON.stringify(clip));
  return clip;
}
await render('base', '.title-gear{display:none!important}');
const only = (keep) => `.logo-fill,.emblem-motif,.element-art,${keep === 'major' ? '.title-gear-minor' : '.title-gear-major'}{display:none!important}`;
await render('gear-major', only('major'));
await render('gear-minor', only('minor'));
await b.close();
