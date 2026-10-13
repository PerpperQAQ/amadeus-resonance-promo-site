// Validate the actual production build under the Pages repository path.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const url=process.env.PAGES_URL||'http://127.0.0.1:5313/amadeus-resonance-promo-site/';
const out=process.env.PAGES_QA_OUT||'output/playwright/pages-pv-ab/local';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],badResponses=[],modelRequests=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400)badResponses.push({url:r.url(),status:r.status()});});
page.on('request',r=>{if(/models\/.+\.(psbz|psb)$/.test(r.url()))modelRequests.push(r.url());});
const result={url};
try {
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.body.classList.contains('loaded')&&window.__ab?.A.state==='ready'&&window.__ab?.B.state==='ready',null,{timeout:180000});
 await page.waitForTimeout(1200);
 result.models=await page.evaluate(()=>({A:__ab.A.state,B:__ab.B.state}));
 await page.screenshot({path:`${out}/home.png`});
 await page.locator('#nav a[href="#1"]').click();await page.waitForTimeout(1400);
 result.alignment=[];
 for(const [width,height] of [[1440,900],[900,700],[390,844]]) {
  await page.setViewportSize({width,height});await page.waitForTimeout(600);
  const metrics=await page.evaluate(()=>{const h=document.querySelector('.nm h2').getBoundingClientRect(),g=document.querySelector('.emblem').getBoundingClientRect();return {viewport:[innerWidth,innerHeight],centerDelta:Math.abs(h.y+h.height/2-g.y-g.height/2),gap:g.left-h.right,gearRow:getComputedStyle(document.querySelector('.emblem')).gridRow};});
  result.alignment.push(metrics);
  await page.locator('.nm').screenshot({path:`${out}/gear-${width}.png`});
 }
 await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(700);
 await page.screenshot({path:`${out}/character.png`});
 result.swap=await page.evaluate(()=>__ab.swapOutfit());await page.waitForTimeout(1900);
 result.outfit=await page.evaluate(()=>__ab.fg.alias);
 result.swapBack=await page.evaluate(()=>__ab.swapOutfit());await page.waitForTimeout(1900);
 result.sections=[];
 for(let i=2;i<6;i++) {await page.locator(`#nav a[href="#${i}"]`).click();await page.waitForTimeout(i===3?2000:950);result.sections.push(await page.evaluate(()=>({screen:__ab.screen,label:document.querySelector('#cn-name').textContent})));if(i===4)await page.screenshot({path:`${out}/report.png`});}
 result.brokenImages=await page.evaluate(()=>[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src));
 result.badResponses=badResponses;result.errors=errors;result.modelRequests=modelRequests;
 await page.goto(new URL('pv-ab.html?hero=decode#1',url).href);await page.waitForURL(u=>!u.pathname.endsWith('pv-ab.html'),{timeout:15000});result.alias=page.url();
 await writeFile(`${out}/report.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 if(errors.length||badResponses.length||result.brokenImages.length||result.alignment.some(x=>x.centerDelta>1)||!result.swap||!result.swapBack)throw Error('Pages release verification failed');
}finally{await browser.close();}
