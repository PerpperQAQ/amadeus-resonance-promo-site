// 离线几何回归：覆盖去黑边、超宽裁切、保护框交叠与线段跨矩形转角。
// 它只检验路径采样；画面和真实模型仍由浏览器检查。
import { ConvergeLines } from '../src/wconv.js';
import { avoidRects, targetPoint, CG_AVOID, cgLayout } from '../src/bootcg.js';
import fs from 'node:fs';

globalThis.devicePixelRatio = 1;
const results = [];
for (const variant of ['a','b']) {
  for (const [W,H] of [[1920,1080],[1440,900],[1280,720],[1024,768],[2560,1440],[3440,1440],[800,1200],[390,844]]) {
    const cv = { getContext:()=>({}), getBoundingClientRect:()=>({width:W,height:H}) };
    const lines = new ConvergeLines(cv,{...targetPoint(W,H),avoid:avoidRects,variant});
    lines.resize();
    const raw = Object.values(CG_AVOID).map(cgLayout(W,H).map);
    let hits = 0, samples = 0;
    for (const s of [...lines.S,...lines.F]) for (const time of [0,3,7,11,30,60]) {
      for (let j=0;j<=500;j++) {
        const [x,y] = lines._at(s,j/500,time); samples++;
        if (raw.some(([a,b,c,d])=>x>a&&x<c&&y>b&&y<d)) hits++;
      }
    }
    const point = [W*lines.px,H*lines.py];
    const endOffset = Math.max(...lines.S.map(s=>Math.hypot(s.pts.at(-1)[0]-point[0],s.pts.at(-1)[1]-point[1])));
    const pass = hits===0 && endOffset<.01;
    results.push({variant,W,H,samples,hits,endOffset,pass});
    console.log(`${pass?'✓':'✗'} ${variant} ${W}×${H}: ${hits} 个路径点穿入保护区，汇聚误差 ${endOffset.toFixed(3)}px`);
  }
}
fs.mkdirSync('output/playwright',{recursive:true});
fs.writeFileSync('output/playwright/worldline-geometry.json',JSON.stringify({at:new Date().toISOString(),results},null,2));
process.exitCode=results.every(r=>r.pass)?0:1;
