/** Reproducible real-SDK performance scenarios; same browser/viewport for before and after. */
import { chromium } from 'playwright';
import fs from 'node:fs';
const out = process.env.PERF_OUT || 'output/playwright/performance/before';
const base = process.env.BASE_URL || 'http://127.0.0.1:5287/';
const [width,height] = (process.env.PERF_RES || '1440x900').split('x').map(Number);
fs.mkdirSync(out,{recursive:true});
const browser = await chromium.launch({channel:'chrome',headless:!process.env.HEADFUL});
process.on('SIGINT',async()=>{await browser.close();process.exit(130);});
const report={base,at:new Date().toISOString(),viewport:{width,height},headless:!process.env.HEADFUL,dpr:Number(process.env.PERF_DPR||1),phases:[],errors:[]};
try {
 const page = await browser.newPage({viewport:{width,height},deviceScaleFactor:Number(process.env.PERF_DPR||1)});
 page.setDefaultTimeout(120000);
 page.on('pageerror',e=>report.errors.push(e.message));
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Performance.enable');
 await page.addInitScript(()=>{
  let seed=42021; Math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
  const P=window.__measure={frames:[],long:[],anims:[],draws:{},phase:'boot',last:0};
  const loop=t=>{if(P.last)P.frames.push({t,dt:t-P.last,phase:P.phase});P.last=t;requestAnimationFrame(loop);};requestAnimationFrame(loop);
  new PerformanceObserver(list=>{for(const e of list.getEntries())P.long.push({start:e.startTime,ms:e.duration});}).observe({type:'longtask',buffered:true});
  const animate=Element.prototype.animate;
  Element.prototype.animate=function(k,o){if(this.id==='stage'||this.id==='stage-body')P.anims.push({t:performance.now(),id:this.id,duration:o.duration,phase:P.phase});return animate.call(this,k,o);};
 });
 const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
 const phase=async(name,job)=>{
  const a=await metrics();const t0=await page.evaluate(n=>{window.__measure.phase=n;return performance.now();},name);
  await job();
  const t1=await page.evaluate(()=>performance.now());const b=await metrics();
  const p=await page.evaluate(({name,t0,t1})=>{
   const p=window.__measure, f=p.frames.filter(x=>x.phase===name&&x.t>=t0&&x.t<=t1).map(x=>x.dt).sort((a,b)=>a-b),l=p.long.filter(x=>x.start>=t0&&x.start<t1);
   return {name,ms:t1-t0,frames:f.length,mean:f.reduce((a,b)=>a+b,0)/Math.max(1,f.length),p95:f[Math.floor(f.length*.95)]||0,max:f.at(-1)||0,over25:f.filter(x=>x>25).length,over50:f.filter(x=>x>50).length,longTasks:l,animations:p.anims.filter(x=>x.phase===name),state:window.__promo.info()};
  },{name,t0,t1});
  p.metrics=Object.fromEntries(['LayoutCount','RecalcStyleCount','LayoutDuration','RecalcStyleDuration','ScriptDuration','TaskDuration'].map(k=>[k,b[k]-a[k]]));
  report.phases.push(p);fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(name,JSON.stringify({mean:p.mean,p95:p.p95,max:p.max,over50:p.over50,long:p.longTasks.map(x=>x.ms),anims:p.animations.length,metrics:p.metrics}));
 };
 await page.goto(base,{waitUntil:'commit'});
 console.log('Loaded document; waiting for model and entry');
 await page.waitForFunction(()=>window.__promo?.emote.state==='ready'&&document.querySelector('.bt-entry.show')&&!document.querySelector('.be-btn').disabled);
 report.boot=await page.evaluate(()=>({long:window.__measure.long,state:window.__promo.info()}));
 report.gpu=await page.evaluate(()=>{const gl=(0,eval)('EmotePlayer.device.gl'),e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'unavailable';});
 await page.evaluate(()=>{
  window.__measure.modelLoads=[];
  const playerClass=(0,eval)('EmotePlayer'),original=playerClass.prototype.loadData;
  playerClass.prototype.loadData=function(...args){
   const black=document.querySelector('.sh-black'),r=black.getBoundingClientRect();
   const sample={phase:window.__promo.shift.state.phases.at(-1),opacity:+getComputedStyle(black).opacity,covers:r.width>=innerWidth&&r.height>=innerHeight,start:performance.now()};
   try{return original.apply(this,args);}finally{sample.ms=performance.now()-sample.start;window.__measure.modelLoads.push(sample);}
  };
 });
 await phase('entry',async()=>{await page.keyboard.press('Enter');await page.waitForFunction(()=>document.body.dataset.bootEnd==='1');await page.waitForTimeout(1200);});
 await phase('idle-hero',()=>page.waitForTimeout(2500));
 for(const id of ['what','modes','boundary','perform','local','road','outro']){
  await phase('navigate-'+id,async()=>{await page.locator('#rail .rail-node').nth(['hero','what','modes','boundary','perform','local','road','outro'].indexOf(id)).click();await page.waitForTimeout(2100);});
 }
 if(!process.env.NO_SHIFT){
  await page.evaluate(()=>document.getElementById('local').scrollIntoView({behavior:'instant'}));await page.waitForTimeout(1500);
  await phase('world-shift',async()=>{await page.keyboard.press('d');await page.waitForFunction(()=>window.__promo.shift.state.busy);await page.waitForFunction(()=>!window.__promo.shift.state.busy);await page.waitForTimeout(600);});
 }
 await page.screenshot({path:out+'/final.png'});
 report.animations=await page.evaluate(()=>window.__measure.anims);
 report.modelLoads=await page.evaluate(()=>window.__measure.modelLoads);
 fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));
}finally{await browser.close();}
