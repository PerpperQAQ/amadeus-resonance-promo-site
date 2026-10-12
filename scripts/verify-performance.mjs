/** Behavioral regressions for animation restarts, quick navigation and model loading under black. */
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE=process.env.BASE_URL||'http://127.0.0.1:5287/';
const OUT='output/playwright/performance/regression';fs.mkdirSync(OUT,{recursive:true});
const report={at:new Date().toISOString(),checks:[],errors:[],loads:[]};
const check=(name,pass,detail)=>{report.checks.push({name,pass:!!pass,detail});console.log(pass?'PASS':'FAIL',name,JSON.stringify(detail??''));};
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.setDefaultTimeout(90000);
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(BASE,{waitUntil:'commit'});
 await page.waitForSelector('.bt-entry.show.is-ready');await page.keyboard.press('Enter');
 await page.waitForFunction(()=>document.body.dataset.bootEnd==='1');await page.waitForTimeout(1200);
 await page.evaluate(()=>{const real=Element.prototype.animate;window.__fxCalls=[];Element.prototype.animate=function(k,o){if(this.id==='stage'||this.id==='stage-body')window.__fxCalls.push({duration:o.duration,t:performance.now()});return real.call(this,k,o);};});
 for(const kind of ['slide','push','rise','far','iris','flip','peek','cut']){
  const result=await page.evaluate(async kind=>{
   window.__fxCalls=[];let applied=0;window.__promo.sfx.run(kind,()=>applied++);
   await new Promise(r=>setTimeout(r,1550));
   return {applied,starts:window.__fxCalls.length,remaining:document.getElementById('stage').getAnimations({subtree:true}).filter(a=>a.playState==='running').length};
  },kind);
  check('Single entry: '+kind,result.applied===1&&result.starts===(kind==='cut'?0:2)&&result.remaining===0,result);
 }
 await page.evaluate(async()=>{for(const id of ['what','modes','local','hero','perform','boundary','outro','road','local']){document.getElementById(id).scrollIntoView({behavior:'instant'});await new Promise(r=>setTimeout(r,70));}});
 await page.waitForTimeout(1800);
 const quick=await page.evaluate(()=>({sec:document.body.dataset.sec,tx:parseFloat(document.getElementById('stage').style.getPropertyValue('--tx')),want:window.__promo.POS.local.x*innerWidth,hidden:document.getElementById('stage').classList.contains('hidden'),running:document.getElementById('stage').getAnimations({subtree:true}).filter(a=>a.playState==='running').length}));
 check('Quick navigation keeps last destination',quick.sec==='local'&&Math.abs(quick.tx-quick.want)<.2&&!quick.hidden&&quick.running===0,quick);
 await page.evaluate(()=>document.getElementById('road').scrollIntoView({behavior:'instant'}));await page.waitForTimeout(500);
 const before=await page.evaluate(()=>window.__promo.emote.stats.frames);await page.waitForTimeout(700);
 const pause=await page.evaluate(()=>({frames:window.__promo.emote.stats.frames,active:window.__promo.emote.active,halo:window.__promo.halo.active}));
 check('Off-screen model and halo stop',pause.frames===before&&!pause.active&&!pause.halo,pause);
 await page.evaluate(()=>document.getElementById('local').scrollIntoView({behavior:'instant'}));await page.waitForTimeout(1500);
 check('Model resumes after return',await page.evaluate(()=>window.__promo.emote.rendering&&window.__promo.halo.active));
 await page.evaluate(()=>{
  const P=(0,eval)('EmotePlayer'),load=P.prototype.loadData;window.__loads=[];
  P.prototype.loadData=function(...args){const el=document.querySelector('.sh-black'),r=el.getBoundingClientRect();const sample={phase:window.__promo.shift.state.phases.at(-1),black:+getComputedStyle(el).opacity,covers:r.width>=innerWidth&&r.height>=innerHeight};const start=performance.now();try{return load.apply(this,args);}finally{sample.ms=performance.now()-start;window.__loads.push(sample);}};
 });
 const count=await page.evaluate(()=>window.__promo.shift.state.count);
 await page.keyboard.press('d');await page.waitForTimeout(150);await page.keyboard.press('d');
 await page.waitForFunction(()=>!window.__promo.shift.state.busy);await page.waitForTimeout(800);
 report.loads=await page.evaluate(()=>window.__loads);
 const shifted=await page.evaluate(()=>window.__promo.info());
 check('Model load stays inside full black frame',report.loads.length===1&&report.loads.every(s=>s.black>=.99&&s.covers&&s.phase==='swap'),report.loads);
 check('Repeated trigger ignored; real model swapped',shifted.world==='b'&&shifted.alias==='alt'&&shifted.state==='ready'&&shifted.shifts===count+1&&shifted.rendering,shifted);
 await page.screenshot({path:OUT+'/world-b.png'});
 const pattern='**/models/kurisu_ab.expressions.psb';await page.route(pattern,r=>r.abort('failed'));
 await page.keyboard.press('d');await page.waitForFunction(()=>window.__promo.shift.state.busy);await page.waitForFunction(()=>!window.__promo.shift.state.busy);await page.waitForTimeout(800);
 const failed=await page.evaluate(()=>({state:window.__promo.info(),overlay:document.getElementById('shift').classList.contains('on'),ciphers:document.querySelectorAll('.ciph').length}));
 check('Download failure preserves current world and player',failed.state.world==='b'&&failed.state.alias==='alt'&&failed.state.state==='ready'&&failed.state.rendering&&!failed.overlay&&failed.ciphers===0,failed);
 await page.unroute(pattern);
 for(const [width,height] of [[800,1200],[390,844],[2560,1440]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(400);
  await page.locator('#rail .rail-node').nth(2).click();await page.waitForTimeout(1500);
  const r=await page.evaluate(()=>({sec:document.body.dataset.sec,overflow:document.documentElement.scrollWidth>innerWidth+2,ready:window.__promo.emote.state}));
  check('Resize and navigation '+width+'x'+height,r.sec==='modes'&&!r.overflow&&r.ready==='ready',r);
 }
 check('No JavaScript errors',report.errors.length===0,report.errors);
}finally{await browser.close();fs.writeFileSync(OUT+'/report.json',JSON.stringify(report,null,2));}
if(report.checks.some(x=>!x.pass)||report.errors.length)process.exitCode=1;
