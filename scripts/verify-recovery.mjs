import {chromium} from 'playwright';
import fs from 'node:fs';
const out=process.env.SHOT_DIR||'output/playwright';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={at:new Date().toISOString(),checks:[],errors:[]};
const check=(name,pass)=>{report.checks.push({name,pass});console.log(pass?'✓':'✗',name);};
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.route('**/img/boot-cg.webp',r=>r.abort());
 await page.route('**/models/kurisu_ab.expressions.psb',r=>r.abort());
 await page.goto('http://127.0.0.1:5287/',{waitUntil:'commit'});
 await page.waitForSelector('.bt-entry.show.is-ready',{timeout:90000});
 await page.keyboard.press('Tab');
 check('失败降级入口仍可通过键盘聚焦',await page.evaluate(()=>document.activeElement===document.querySelector('.be-btn')));
 await page.keyboard.press('Enter');
 await page.waitForFunction(()=>document.body.dataset.boot==='done');
 await page.waitForFunction(()=>!document.getElementById('boot'));
 check('CG 与模型同时失败仍进入首页',await page.evaluate(()=>scrollY===0&&document.body.dataset.sec==='hero'));
 check('静态立绘及重试按钮可见',await page.locator('#stage-fallback').isVisible()&&await page.getByRole('button',{name:'重试',exact:true}).isVisible());
 await page.screenshot({path:`${out}/recovery-fallback.png`});
 await page.unroute('**/models/kurisu_ab.expressions.psb');
 await page.getByRole('button',{name:'重试',exact:true}).click();
 await page.waitForFunction(()=>window.__promo.info().state==='ready',null,{timeout:180000});
 await page.waitForTimeout(1200);
 check('点击重试后恢复真实模型、收起错误提示',await page.evaluate(()=>window.__promo.info().rendering&&document.getElementById('stage-fallback').hidden&&document.getElementById('stage-msg').hidden));
 await page.screenshot({path:`${out}/recovery-ready.png`});
 check('失败与恢复过程中没有 JavaScript 错误',report.errors.length===0);
}finally{
 await browser.close();
 fs.writeFileSync(`${out}/recovery.json`,JSON.stringify(report,null,2));
}
process.exitCode=report.checks.some(c=>!c.pass)||report.errors.length?1:0;
