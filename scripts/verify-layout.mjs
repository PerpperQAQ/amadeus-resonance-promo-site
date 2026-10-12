// 检查真实文字/控件是否超出视口；overflow-x:clip 不能掩盖截字。
// 运行：node scripts/verify-layout.mjs；输出均在 output/playwright/layout/。
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.BASE_URL || 'http://127.0.0.1:5287/';
const bootOnly = process.argv.includes('--boot-only');
const out = process.env.SHOT_DIR || (bootOnly ? 'output/playwright/final-boot' : 'output/playwright/layout');
fs.mkdirSync(out, { recursive: true });
const sizes = [[1920,1080],[1440,900],[1280,720],[1024,768],[2560,1440],[3440,1440],[800,1200],[390,844]];
const report = { at: new Date().toISOString(), base, checks: [], errors: [] };
const check = (name, pass, detail) => {
  report.checks.push({ name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} ${name}${pass ? '' : ' ' + JSON.stringify(detail)}`);
};
const browser = await chromium.launch({ channel:'chrome', headless:true });
try {
  const page = await browser.newPage({ viewport:{width:1440,height:900}, reducedMotion:'reduce' });
  page.setDefaultTimeout(90000);
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', m => { if (m.type()==='error') report.errors.push(m.text()); });
  await page.goto(base, {waitUntil:'commit'});
  await page.waitForSelector('.bt-entry.show.is-ready', {timeout:180000});
  await page.evaluate(() => document.fonts.ready);
  check('使用实际 E-mote 模型完成加载', await page.evaluate(() => window.__promo.info().state === 'ready'));
  for (const [width,height] of sizes) {
    await page.setViewportSize({width,height});
    await page.waitForTimeout(250);
    const boot = await page.evaluate(() => {
      const r = document.querySelector('.bt-cg').getBoundingClientRect();
      const b = document.querySelector('.be-btn').getBoundingClientRect();
      return {cover:r.x<=0 && r.y<=0 && r.right>=innerWidth && r.bottom>=innerHeight,
        entry:b.left>=0 && b.right<=innerWidth && b.top>=0 && b.bottom<=innerHeight};
    });
    check(`${width}×${height} 开屏底图满屏、进入按钮完整可见`,boot.cover&&boot.entry,boot);
    if ([1440,2560,3440,800,390].includes(width)) await page.screenshot({path:`${out}/boot-${width}.png`});
  }
  if (!bootOnly) {
  await page.setViewportSize({width:1440,height:900});
  await page.getByRole('button',{name:'El Psy Kongroo · 进入',exact:true}).click();
  await page.waitForFunction(()=>document.body.dataset.boot==='done');
  await page.waitForFunction(()=>!document.getElementById('boot'));
  const ids = await page.locator('.sec').evaluateAll(els=>els.map(el=>el.id));
  for (const [width,height] of sizes) {
    await page.setViewportSize({width,height});
    await page.waitForTimeout(350);
    for (const [i,id] of ids.entries()) {
      await page.locator('.rail-node').nth(i).click();
      await page.waitForFunction(id=>document.body.dataset.sec===id,id);
      await page.waitForTimeout(200);
      const layout = await page.locator(`#${id}`).evaluate(sec => {
        const selectors = '.h1,.h2,.lead,.rows li,.tabs,.plist:not([hidden]) li,.tier,.rings,.chain,.tri,.node,.rules li,.st,.cta,.credits';
        const clipped = [...sec.querySelectorAll(selectors)].flatMap(el=>{
          const r=el.getBoundingClientRect();
          return r.width>0 && (r.left< -1 || r.right>innerWidth+1) ? [{tag:el.className,left:Math.round(r.left),right:Math.round(r.right),text:el.textContent.trim().slice(0,36)}] : [];
        });
        return {clipped, current:document.querySelector('.rail-node[aria-current="step"]')?.getAttribute('aria-label')};
      });
      check(`${width}×${height} ${id}：导航可达、文字与控件未横向截断`,layout.clipped.length===0,layout);
      if ([1440,800,390].includes(width) || id==='hero' && [1024,2560,3440].includes(width)) {
        await page.mouse.move(width-2,Math.round(height*.5));
        await page.screenshot({path:`${out}/${id}-${width}.png`});
      }
      if (id==='road') {
        const first = await page.evaluate(()=>window.__promo.info().stats.frames);
        await page.waitForTimeout(450);
        const last = await page.evaluate(()=>({frames:window.__promo.info().stats.frames,rendering:window.__promo.info().rendering}));
        check(`${width}×${height} 人物离场后停止渲染`,!last.rendering && last.frames-first<=1,{first,...last});
      }
    }
    await page.getByRole('button',{name:'回到开头 ↑',exact:true}).click();
    await page.waitForFunction(()=>scrollY<2 && document.body.dataset.sec==='hero');
    check(`${width}×${height} 返回首页可用`,true);
  }
  // 同一套排版也须容纳彩蛋世界线的不同文案。
  await page.keyboard.press('d');
  await page.waitForFunction(()=>window.__promo.info().world==='b'&&!window.__promo.info().busy,{},{timeout:180000});
  for (const width of [1440,800,390]) {
    await page.setViewportSize({width,height:width===800?1200:900});
    await page.waitForTimeout(350);
    for (const id of ['hero','what','modes','road','outro']) {
      await page.getByRole('link',{name:`前往：${{hero:'序',what:'定位',modes:'双模式',road:'路线',outro:'终'}[id]}`,exact:true}).click();
      await page.waitForFunction(id=>document.body.dataset.sec===id,id);
      const bad=await page.locator(`#${id}`).evaluate(sec=>[...sec.querySelectorAll('.h1,.h2,.rows li,.tab,.st,.cta')].filter(el=>{const r=el.getBoundingClientRect();return r.left< -1||r.right>innerWidth+1}).map(el=>el.className));
      check(`B 世界线 ${width}px ${id} 无截断`,bad.length===0,bad);
    }
  }
  }
  check('正常页面无运行错误',report.errors.length===0,report.errors);
} finally {
  await browser.close();
  fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));
}
process.exitCode=report.checks.some(c=>!c.pass)||report.errors.length?1:0;
