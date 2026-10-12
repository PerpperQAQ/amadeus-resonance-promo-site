/** Real background-tab resize: desired model activity must survive visibility changes. */
import {chromium} from 'playwright';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawn} from 'node:child_process';
const out='output/playwright/performance/visibility';fs.mkdirSync(out,{recursive:true});
const report={at:new Date().toISOString(),checks:[],errors:[]};
const check=(name,pass,detail)=>{report.checks.push({name,pass:!!pass,detail});console.log(pass?'PASS':'FAIL',name,detail);};
// 用独立 Chrome + noDefaults 连接，避免自动化内部会话强制焦点导致 document.hidden 永远为 false。
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'amadeus-visibility-'));
const chrome=spawn(process.env.CHROME_BIN||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--user-data-dir='+profile,'--remote-debugging-port=0','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--disable-extensions','about:blank'],{stdio:'ignore'});
let browser;
try{
 const portFile=path.join(profile,'DevToolsActivePort');
 for(let i=0;i<200&&!fs.existsSync(portFile);i++)await new Promise(r=>setTimeout(r,50));
 const port=Number(fs.readFileSync(portFile,'utf8').split('\n')[0]);
 browser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{noDefaults:true});
 const context=browser.contexts()[0],page=context.pages()[0];await page.setViewportSize({width:1440,height:900});
 page.on('pageerror',e=>report.errors.push(e.message));await page.goto('http://127.0.0.1:5287/',{waitUntil:'commit'});
 await page.waitForSelector('.bt-entry.show.is-ready',{timeout:90000});await page.keyboard.press('Enter');await page.waitForFunction(()=>document.body.dataset.bootEnd==='1');
 // Playwright 默认强制页面获得焦点，须关闭该覆盖后才能测真实后台标签页。
 const cdp=await context.newCDPSession(page),root=await browser.newBrowserCDPSession();
 await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:false});
 const {targetInfo}=await cdp.send('Target.getTargetInfo');
 const {targetId}=await root.send('Target.createTarget',{url:'about:blank',browserContextId:targetInfo.browserContextId,newWindow:false,background:false});
 await root.send('Target.activateTarget',{targetId});await page.waitForTimeout(250);
 check('Actual tab hidden',await page.evaluate(()=>document.hidden));
 const before=await page.evaluate(()=>window.__promo.emote.stats.frames);
 await page.setViewportSize({width:1280,height:720});await page.waitForTimeout(700);
 const hidden=await page.evaluate(()=>({hidden:document.hidden,active:window.__promo.emote.active,frames:window.__promo.emote.stats.frames,rendering:window.__promo.emote.rendering,halo:window.__promo.halo.active}));
 check('Hidden resize keeps intent and stops frames',hidden.hidden&&hidden.active&&!hidden.rendering&&!hidden.halo&&hidden.frames===before,hidden);
 await root.send('Target.activateTarget',{targetId:targetInfo.targetId});await page.waitForTimeout(900);
 const restored=await page.evaluate(()=>({hidden:document.hidden,frames:window.__promo.emote.stats.frames,rendering:window.__promo.emote.rendering,halo:window.__promo.halo.active}));
 check('Foreground resumes model and halo',!restored.hidden&&restored.rendering&&restored.halo&&restored.frames>before,restored);
 check('No JavaScript errors',report.errors.length===0,report.errors);
 await page.screenshot({path:out+'/restored.png'});
}finally{await browser?.close();chrome.kill('SIGTERM');await new Promise(r=>setTimeout(r,300));fs.rmSync(profile,{recursive:true,force:true});fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));}
if(report.checks.some(c=>!c.pass)||report.errors.length)process.exitCode=1;
