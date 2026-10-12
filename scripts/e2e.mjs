/**
 * 端到端验证（Playwright + 本机 Chrome，无头）：四种分辨率逐一跑完，控制台零错误，保存截图到 docs/screenshots/。
 * 用法：BASE_URL=http://127.0.0.1:5287/ node scripts/e2e.mjs [--res=1440x900] [--noshift] [--shifts=4]
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5287/';
const OUT = process.env.SHOT_DIR || 'docs/screenshots';
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
const RES = (args.res ? [args.res] : ['1920x1080', '1440x900', '1280x720', '1024x768']).map((r) => r.split('x').map(Number));
const SHIFTS = Number(args.shifts || 4);
fs.mkdirSync(OUT, { recursive: true });

const report = { base: BASE, at: new Date().toISOString(), results: {} };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;

async function runRes([W, H]) {
  const tag = `${W}x${H}`;
  const R = { checks: [], errors: [] };
  const ok = (name, cond, extra) => { R.checks.push({ name, pass: !!cond, ...(extra !== undefined ? { extra } : {}) }); if (!cond) { failures++; console.log(`  ✗ ${name}`, extra ?? ''); } else console.log(`  ✓ ${name}`); };
  console.log(`\n=== ${tag} ===`);
  const browser = await chromium.launch({ channel: 'chrome', headless: !process.env.HEADFUL, args: process.env.SOFT ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] : ['--enable-precise-memory-info'] });   // 默认用真实 GPU；SOFT=1 强制软件渲染
  try {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.setDefaultTimeout(60000);  // 约 205MB PSB 的同步解析可能阻塞主线程
  page.on('pageerror', (e) => R.errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') R.errors.push('console.error: ' + m.text().slice(0, 240)); });
  page.on('requestfailed', (r) => {
    // 第十轮：语音停止/切章时浏览器会中止媒体的分段请求（net::ERR_ABORTED），属正常行为，不计为错误
    const why = r.failure()?.errorText || '';
    if (/\/audio\/.*\.m4a$/.test(r.url()) && /ABORTED/i.test(why)) return;
    R.errors.push('requestfailed: ' + r.url().slice(-80) + ' ' + why);
  });
  const info = () => page.evaluate(() => window.__promo.info());
  const shot = (n) => page.screenshot({ path: path.join(OUT, `${tag}-${n}.png`) });

  // ---- 开场
  // 时间线采样（50ms 一次）：用来核对“世界线与数字变动并行”“logo 在数字变动结束之后才出现”
  await page.addInitScript(() => {
    window.__bootTrace = [];
    const iv = setInterval(() => {
      const st = window.__bootState?.(), lg = document.getElementById('bt-logo'), wl = window.__bootLines?.wl;
      if (!st || !lg) { if (!document.getElementById('boot')) clearInterval(iv); return; }
      window.__bootTrace.push({ ph: st.phase, grow: +st.grow.toFixed(2), logoOp: +getComputedStyle(lg).opacity, head: wl ? Math.max(...wl.S.map((s) => s.head || 0)) : 0, arrived: wl?.arrived || 0 });
      if (st.phase === 'enter') clearInterval(iv);
    }, 50);
  });
  await page.goto(BASE, { waitUntil: 'commit' });
  await page.waitForSelector('#boot.on', { timeout: 60000 });
  await sleep(1800);
  await shot('00-boot');
  const bootVisible = await page.evaluate(() => !!document.getElementById('boot') && getComputedStyle(document.getElementById('boot')).display !== 'none');
  ok('开场动画可见', bootVisible);
  const bt = await page.evaluate(() => { const r = document.querySelector('#bt-meter .mt-svg'); const c = document.getElementById('bt-wl'); const cs = c ? c.getBoundingClientRect() : { width: 0 }; return { digits: r ? r.querySelectorAll('g[data-i]').length : 0, wl: !!c, glyphs: r ? r.querySelectorAll('.mt-lit .z2').length : 0, glass: document.querySelectorAll('#bt-meter .tube, #bt-meter .gl').length, logo: !!document.querySelector('#boot .lg-base,#boot .bt-logo'), wlW: Math.round(cs.width) }; });
  ok('开场：大号读数（8 个位置，细线数字、无玻璃管）、世界线画布存在，且 logo 已就位但数字阶段尚未显示', bt.digits === 8 && bt.wl && bt.glyphs === 7 && bt.glass === 0 && bt.logo && bt.wlW >= W - 4, bt);
  // 数字演出期间点击只加速，不会进入主页
  await page.mouse.click(W / 2, H / 3);
  await sleep(300);
  ok('数字演出期间点击不会跳过开屏', await page.evaluate(() => document.body.dataset.boot === 'on'));
  // 世界线汇聚 → 进入按钮出现
  await page.waitForSelector('.bt-entry.show', { timeout: 120000 });
  await sleep(600);
  await shot('00b-boot-entry');
  const e0 = await page.evaluate(() => { const b = document.querySelector('.be-btn'), r = b.getBoundingClientRect(); return { state: document.getElementById('bt-entry').dataset.state, disabled: b.disabled, txt: b.textContent, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), aria: b.getAttribute('aria-label'), emote: window.__promo.emote.state }; });
  ok('进入按钮默认显示乱码（APL/十六进制），不是台词', !/El Psy Kongroo/i.test(e0.txt) && e0.txt.length > 8, e0.txt);
  ok('进入按钮位于屏幕下半部（世界线汇聚点附近）', e0.y > H * 0.6 && Math.abs(e0.x - W / 2) < W * 0.1, e0);
  // 开屏 CG 底图：加载成功；世界线 6 条独立，路径（含节点沿线的游移）不穿过人物脸部/颈领口/真由理的脸
  {
    const g = await page.evaluate(() => {
      const bl = window.__bootLines, wl = bl?.wl, cg = document.querySelector('.bt-cg'), root = document.getElementById('boot');
      if (!wl) return null;
      const pad = Math.max(10, wl.W * 0.012), raw = wl.rects.map(([a, b, c, d]) => [a + pad, b + pad, c - pad, d - pad]);
      let bad = 0, n = 0; const hit = [];
      for (const s of [...wl.S, ...wl.F]) for (const t of [0, 3, 7, 11]) for (let u = 0; u <= 1.0001; u += 0.01) {
        const [x, y] = wl._at(s, Math.min(1, u), t); n++;
        if (raw.some(([a, b, c, d]) => x > a && x < c && y > b && y < d)) { bad++; if (hit.length < 3) hit.push([s.i, +u.toFixed(2), Math.round(x), Math.round(y)]); }
      }
      const starts = wl.S.map((s) => s.pts[0]), P = [wl.W * wl.px, wl.H * wl.py];
      let minD = 1e9; for (let i = 0; i < starts.length; i++) for (let j = i + 1; j < starts.length; j++) minD = Math.min(minD, Math.hypot(starts[i][0] - starts[j][0], starts[i][1] - starts[j][1]));
      const edge = starts.every(([x, y]) => x < wl.W * 0.02 || y > wl.H * 0.94);
      const t0s = new Set(wl.S.map((s) => s.t0.toFixed(3))).size;
      return { cg: root.classList.contains('cg'), bg: getComputedStyle(cg).backgroundImage.includes('boot-cg'), cgOn: bl.cgOn, lines: wl.S.length, rects: raw.length, samples: n, bad, hit, minD: Math.round(minD), edge, t0s, endOut: !raw.some(([a, b, c, d]) => P[0] > a && P[0] < c && P[1] > b && P[1] < d), arrived: wl.arrived };
    });
    ok('开屏底图：红莉栖 CG（WebP）已加载并作为底图', !!g && g.cg && g.bg && g.cgOn, g);
    ok('开屏世界线：6 条独立线（起点互不相同、出发时刻各异），从左缘/底缘进入', !!g && g.lines === 6 && g.minD > 30 && g.edge && g.t0s === 6, g);
    ok('开屏世界线几何：路径与节点游移均不穿过人物脸部/颈领口/真由理的脸，汇聚点在避让区之外', !!g && g.rects === 3 && g.bad === 0 && g.endOut, g);
    ok('开屏世界线：6 条逐条汇入，各亮闪一次', !!g && g.arrived === 6, g?.arrived);
    // 并行播放：数字变动（phase=run）期间世界线已经在生长；logo 在变动结束之前不可见
    const tr = await page.evaluate(() => window.__bootTrace);
    const par = tr.filter((x) => x.ph === 'run' && x.grow > 0.2 && x.head > 0.05);
    ok('世界线与数字变动并行播放（数字阶段 run 期间世界线已在生长）', par.length >= 5, { samples: tr.length, par: par.length, maxGrowInRun: Math.max(...tr.filter((x) => x.ph === 'run').map((x) => x.grow)) });
    const preLogo = tr.filter((x) => x.ph === 'run' || x.ph === 'finale' && x.logoOp > 0.05 && false);
    ok('Amadeus logo：数字变动（run）结束之前不可见', tr.filter((x) => x.ph === 'run').every((x) => x.logoOp < 0.02) && tr.filter((x) => x.ph === 'run').length > 5, { run: tr.filter((x) => x.ph === 'run').length });
    ok('世界线汇聚在数字锁定前后完成（run 阶段内 grow 已 ≥ 0.9）', Math.max(...tr.filter((x) => x.ph === 'run').map((x) => x.grow)) >= 0.9 || tr.some((x) => x.ph === 'finale' && x.grow >= 0.99));
    await page.waitForFunction(() => window.__bootState().logo && +getComputedStyle(document.getElementById('bt-logo')).opacity > 0.85, null, { timeout: 15000 });
    const lg = await page.evaluate(() => {
      const R = (el) => { const r = el.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; };
      const L = R(document.getElementById('bt-logo')), wl = window.__bootLines.wl, pad = Math.max(10, wl.W * 0.012);
      const raw = wl.rects.map(([a, b, c, d]) => [a + pad, b + pad, c - pad, d - pad]);
      const hit = (A, B) => A[0] < B[2] && A[2] > B[0] && A[1] < B[3] && A[3] > B[1];
      const hud = R(document.querySelector('.bt-hud')), btn = R(document.querySelector('.be-btn'));
      const imgs = [...document.querySelectorAll('#bt-logo img')].map((i) => i.complete && i.naturalWidth > 0);
      const z = (el) => +getComputedStyle(el).zIndex || 0, b = document.querySelector('#bt-logo .lg-base'), g1 = document.querySelector('#bt-logo .lg-g1');
      return { L: L.map(Math.round), W: innerWidth, H: innerHeight, topLeft: L[2] < innerWidth * 0.3 && L[3] < innerHeight * 0.3, noFace: !raw.some((r) => hit(L, r)), noHud: !hit(L, hud), noBtn: !hit(L, btn), imgs, zBase: z(b), zGear: z(g1), spin: getComputedStyle(g1).animationName };
    });
    ok('开屏 Amadeus logo：数字变动结束后出现，位于左上区域，不遮人物脸部/按钮/HUD', lg.topLeft && lg.noFace && lg.noHud && lg.noBtn, lg);
    ok('开屏 logo：双齿轮图层存在且缓慢旋转，字标在齿轮上方（不遮字）', lg.imgs.length === 3 && lg.imgs.every(Boolean) && lg.zBase > lg.zGear && /spin/.test(lg.spin), lg);
    // 汇聚后保持动态：等待点击期间，汇集点周围的画面持续变化（光晕呼吸、流光粒子、细弧散出回流）
    await page.waitForSelector('.bt-entry.show', { timeout: 120000 });
    const snap = () => page.evaluate(() => { const wl = window.__bootLines.wl, d = wl.dpr, x = Math.max(0, Math.round((wl.W * wl.px - 170) * d)), y = Math.max(0, Math.round((wl.H * wl.py - 70) * d)); const im = wl.ctx.getImageData(x, y, Math.round(340 * d), Math.round(140 * d)).data; return Array.from(im.filter((_, i) => i % 4 === 3).slice(0, 20000)); });
    const diff = (a, b) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0);
    const s1 = await snap(); await sleep(700); const s2 = await snap(); await sleep(900); const s3 = await snap();
    const d12 = diff(s1, s2), d23 = diff(s2, s3), fr = await page.evaluate(() => window.__bootLines.wl.frames);
    ok('汇聚后世界线仍持续有动态（汇集点周围画面随时间变化）', d12 > 600 && d23 > 600, { d12, d23, frames: fr });
    const v = await page.evaluate(() => ({ F: window.__bootLines.wl.F.length, variant: window.__bootLines.wl.variant }));
    ok('世界线默认变体 a（远景线 12 条）', v.variant === 'a' && v.F === 12, v);
  }
  if (e0.emote !== 'ready' && e0.emote !== 'error') {
    ok('模型未就绪：按钮为加载态且不可点', e0.state === 'loading' && e0.disabled, e0);
    await page.evaluate(() => document.querySelector('.be-btn').click());   // 强制 click 也不应进入（disabled）
    await page.keyboard.press('Enter'); await sleep(500);
    ok('模型未就绪：点击/Enter 不会进入主页', await page.evaluate(() => document.body.dataset.boot === 'on'));
  }
  await page.waitForFunction(() => window.__promo?.emote?.state === 'ready' || window.__promo?.emote?.state === 'error', null, { timeout: 300000 });
  const stReady = await info();
  ok('E-mote 模型加载完成（state=ready）', stReady.state === 'ready', stReady.state);
  await page.waitForFunction(() => !document.querySelector('.be-btn').disabled, null, { timeout: 10000 });
  await page.keyboard.press('Tab');
  ok('开屏键盘焦点留在入口，背景内容不可操作', await page.evaluate(() => document.activeElement === document.querySelector('.be-btn') && document.getElementById('main').inert && scrollY === 0));
  await page.evaluate(() => document.activeElement.blur());
  await sleep(2500);
  ok('模型就绪后开屏不会自动结束（等待用户点击）', await page.evaluate(() => document.body.dataset.boot === 'on'));
  // 悬停：乱码解码成 El Psy Kongroo
  await page.hover('.be-btn'); await sleep(200); await shot('00c-boot-hover-mid');
  await page.waitForFunction(() => /El Psy Kongroo/.test(document.querySelector('.be-btn').textContent.replace(/\u00a0/g, ' ')), null, { timeout: 5000 });
  await shot('00d-boot-hover');
  ok('悬停后按钮文字解码为 “El Psy Kongroo”', true);
  await page.mouse.move(8, 8); await sleep(300);
  ok('移开后恢复乱码', await page.evaluate(() => !/El Psy Kongroo/.test(document.querySelector('.be-btn').textContent.replace(/\u00a0/g, ' '))));
  await page.click('.be-btn');
  await shot('00e-boot-click');
  await page.waitForFunction(() => document.body.dataset.boot === 'done', null, { timeout: 20000 });
  ok('点击按钮后才进入主页（开屏在模型就绪之后、点击之后才结束）', true);
  await page.waitForTimeout(1800);
  ok('点击进入落在首页顶部，背景恢复可操作', await page.evaluate(() => scrollY < 2 && document.body.dataset.sec === 'hero' && !document.getElementById('main').inert));
  await shot('01-hero');

  // ---- 结构：无顶栏、无表情面板
  const struct = await page.evaluate(() => ({
    topbar: !!document.querySelector('.topbar,.nav,header nav'), chips: document.querySelectorAll('.chip,#chips,.expr-panel').length,
    nodes: document.querySelectorAll('.rail-node').length, secs: document.querySelectorAll('.sec').length,
    hasNixieHero: !!document.querySelector('#hero .nixie'), bgs: [...document.querySelectorAll('.bgl')].length,
    gh: !!document.querySelector('.gh'), logoGear: document.querySelectorAll('#hero .lg-gear').length,
  }));
  ok('顶部菜单栏已移除', !struct.topbar);
  ok('表情面板已移除', struct.chips === 0);
  ok('首屏无辉光管读数', !struct.hasNixieHero);
  ok('世界线节点数 = 章节数', struct.nodes === struct.secs && struct.nodes === 8, struct);
  ok('每章一张底图（8）', struct.bgs === 8);
  { const pr = await page.evaluate(async () => { const imgs = [...document.querySelectorAll('.ibm-img img,.mw-img')]; await Promise.all(imgs.map((i) => i.decode().catch(() => {}))); return { n: imgs.length, bad: imgs.filter((i) => !i.naturalWidth).length, ibm: !!document.querySelector('.ibm-scr'), mw: !!document.querySelector('.mw-win'), tubes: document.querySelectorAll('#prop-dm .mt-lit .z2').length, credit: /Sandstein/.test(document.querySelector('.credits-img')?.textContent || '') }; });
    ok('道具：IBM 5100 / 微波炉为实拍图并带署名，读数仪为橙色细线数字（7 位）', pr.n >= 2 && pr.bad === 0 && pr.ibm && pr.mw && pr.tubes === 7 && pr.credit, pr); }
  ok('Logo 双齿轮图层存在', struct.logoGear === 2);
  const z = await page.evaluate(() => ({ base: +getComputedStyle(document.querySelector('#hero .lg-base')).zIndex, gear: +getComputedStyle(document.querySelector('#hero .lg-g1')).zIndex }));
  ok('Logo 字标在齿轮上方（不遮挡文字）', z.base > z.gear, z);
  const railPx = await page.evaluate(() => { const c = document.querySelector('.rail-cv'); if (!c) return -1; const g = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < g.length; i += 16) if (g[i] > 8) n++; return n; });
  ok('世界线进度条有绘制内容', railPx > 80, railPx);
  { // 第九轮：窄条进度条（≤40px）、近乎笔直、页码为辉光数字（无玻璃管）
    const rb = await page.evaluate(() => { const r = document.getElementById('rail').getBoundingClientRect(), nx = document.querySelector('.rail-nix'); return { h: Math.round(r.height), bottom: Math.round(innerHeight - r.bottom), digits: nx ? nx.querySelectorAll('.gn-d').length : 0, d: nx ? [...nx.querySelectorAll('.gn-d .z3')].map((p) => (p.getAttribute('d') || '').length > 5) : [], glass: document.querySelectorAll('.rail-nix .nixie, .rail-nix [class*=glass]').length, secNo: document.querySelectorAll('.sec-no .gn-d').length }; });
    ok('进度条高度压缩到 24–40px、贴底', rb.h >= 24 && rb.h <= 40 && rb.bottom <= 1, rb);
    ok('页码为辉光数字（橙色细线数字，两位，无玻璃管）', rb.digits === 2 && rb.d.every(Boolean) && rb.glass === 0 && rb.secNo >= 12, rb);
    const flat = await page.evaluate(() => { const c = document.querySelector('.rail-cv'), g = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let y0 = 1e9, y1 = -1; for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x += 3) if (g[(y * c.width + x) * 4 + 3] > 50) { if (y < y0) y0 = y; if (y > y1) y1 = y; } return { spanPx: (y1 - y0) / (devicePixelRatio > 1.5 ? 1.5 : devicePixelRatio) }; });
    ok('进度条线条近乎笔直（竖向分布 ≤ 34px）', flat.spanPx <= 34, flat);
  }
  { // 世界线方向：进度从左往右点亮（顶部≈左端，页面底部≈右端），且线条水平延伸（画布内横向跨度远大于纵向）
    const h0 = (await info()).railHead;
    await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })); await page.waitForTimeout(1500);
    const h1 = (await info()).railHead;
    const span = await page.evaluate(() => { const c = document.querySelector('.rail-cv'); const g = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1; for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) if (g[(y * c.width + x) * 4 + 3] > 60) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return { w: (x1 - x0) / c.width, h: (y1 - y0) / c.height }; });
    ok('世界线从左往右：滚动进度由左向右点亮，线条沿整页宽度水平延伸', h0 < 0.25 && h1 > 0.8 && span.w > 0.7, { h0, h1, span });
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await page.waitForTimeout(800);
  }

  // ---- 世界线导航：点击每个节点 → 跳到对应章节；悬停显示名称；切章时表情变化
  const secIds = await page.evaluate(() => [...document.querySelectorAll('.sec')].map((s) => s.id));
  const exprSeen = new Set();
  let prevSw = (await info()).stats.switches;
  for (let i = 0; i < secIds.length; i++) {
    const node = page.locator('.rail-node').nth(i);
    await node.hover();
    const tip = await page.evaluate(() => ({ on: document.querySelector('.rail-tip').classList.contains('on'), t: document.querySelector('.rail-tip').textContent }));
    const pf0 = (await info()).perf;
    await node.click();
    await page.waitForFunction((id) => document.body.dataset.sec === id, secIds[i], { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const s = await info();
    if (i > 0) {
      const a = pf0.last, b = s.perf.last;
      ok(`切章 → ${secIds[i]}：触发了新的表情+动作（表情、动作均与上一次不同）`, s.perf.n > pf0.n && b && (!a || (b.ex !== a.ex && b.mo !== a.mo)), { n0: pf0.n, n1: s.perf.n, from: a && [a.ex, a.mo], to: b && [b.ex, b.mo], kind: b && b.kind });
    }
    const sec = await page.evaluate((id) => Math.abs(document.getElementById(id).getBoundingClientRect().top), secIds[i]);
    ok(`节点 ${i + 1}（${secIds[i]}）：悬停有名称、点击可达`, tip.on && tip.t.length > 2 && s.sec === secIds[i] && sec < H * 0.6, { tip: tip.t, sec: s.sec, top: Math.round(sec) });
    if (s.current) exprSeen.add(s.current);
    await shot(`02-sec-${i + 1}-${secIds[i]}`);
  }
  const swNow = (await info()).stats.switches;
  ok('切换章节会触发表情切换', swNow - prevSw >= 5, { delta: swNow - prevSw });
  { const lg = (await info()).perf.log.filter((x) => !x.click); let bad = 0; for (let k = 1; k < lg.length; k++) if (lg[k].ex === lg[k - 1].ex || lg[k].mo === lg[k - 1].mo) bad++; ok('切章表情/动作序列无连续重复', lg.length >= 5 && bad === 0, lg.map((x) => `${x.key}:${x.kind}:${x.ex}/${x.mo}`)); }
  ok('章节表情有多样性（≥3 种）', exprSeen.size >= 3, [...exprSeen]);

  // ---- 点击人物：随机表情，不连续重复；连点不出问题
  await page.evaluate(() => document.getElementById('modes').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(1800);
  const seq = [];
  for (let i = 0; i < 8; i++) {
    const hit = await page.locator('#stage-hit').boundingBox();
    await page.mouse.click(hit.x + hit.width / 2, hit.y + hit.height * 0.4);
    await page.waitForTimeout(650);
    seq.push((await info()).current);
  }
  const noRepeat = seq.every((x, i) => i === 0 || x !== seq[i - 1]);
  ok('点击人物：表情随机且不连续重复', noRepeat && new Set(seq).size >= 4, seq);
  const sw1 = (await info()).stats.switches;
  const hit = await page.locator('#stage-hit').boundingBox();
  const t0 = Date.now();
  for (let i = 0; i < 24; i++) await page.mouse.click(hit.x + hit.width / 2, hit.y + hit.height * 0.4, { delay: 5 });
  const spent = Date.now() - t0;
  await page.waitForTimeout(1200);
  const s2 = await info();
  // 同一帧内连发 12 次点击：节流应只放行 1–2 次
  const sw2 = (await info()).stats.switches;
  await page.waitForTimeout(600);
  const sw2b = (await info()).stats.switches;
  await page.evaluate(({ x, y }) => { for (let i = 0; i < 12; i++) document.elementFromPoint(x, y)?.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y, detail: 1 })); }, { x: hit.x + hit.width / 2, y: hit.y + hit.height * 0.4 });
  await page.waitForTimeout(300);
  const burst = (await info()).stats.switches - sw2b;
  ok('同一瞬间连发 12 次点击只触发 ≤2 次切换', burst >= 1 && burst <= 2, { burst });
  ok('连点 24 次被节流且状态正常', s2.state === 'ready' && s2.stats.switches - sw1 <= Math.floor(spent / 420) + 2, { delta: s2.stats.switches - sw1, spentMs: spent });

  // ---- 光环 / 指针 / 交互
  const halo = await page.evaluate(() => { const c = document.getElementById('halo'); const g = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < g.length; i += 40) if (g[i] > 10) n++; return n; });
  ok('人物光环有绘制内容', halo > 200, halo);
  await page.mouse.move(W * 0.4, H * 0.5); await page.mouse.move(W * 0.45, H * 0.52, { steps: 5 });
  const cur = await page.evaluate(() => ({ on: document.getElementById('cursor-layer').classList.contains('on'), dot: !!document.querySelector('.cu-dot'), has: document.documentElement.classList.contains('has-cursor') }));
  const gearCur = await page.evaluate(() => ({ gear: !!document.querySelector('.cu-gear polygon'), trail: !!document.querySelector('.cu-trail') }));
  ok('自定义指针（齿轮，无拖尾）已启用', cur.on && cur.dot && cur.has && gearCur.gear && !gearCur.trail, { ...cur, ...gearCur });
  const fxi = (await info()).fx;
  ok('人物换场动效：至少出现 3 种不同方式', fxi.used.length >= 3, fxi);
  await page.locator('.tab').nth(1).hover();
  ok('悬停可点击元素：指针展开为齿轮环', await page.evaluate(() => document.getElementById('cursor-layer').classList.contains('hover')));
  await page.evaluate(() => {
    window.__rippleSeen = false;
    const obs = new MutationObserver((entries) => {
      if (entries.some((e) => [...e.addedNodes].some((n) => n.classList?.contains('cu-ripple')))) {
        window.__rippleSeen = true; obs.disconnect();
      }
    });
    obs.observe(document.getElementById('cursor-layer'), { childList: true });
  });
  await page.locator('.tab').nth(1).click();
  ok('点击产生涟漪元素', await page.evaluate(() => window.__rippleSeen));
  ok('VN 面板切换', await page.evaluate(() => !document.getElementById('panel-vn').hidden && document.getElementById('panel-daily').hidden));
  await page.locator('.tab').nth(0).click();
  await page.evaluate(() => document.getElementById('boundary').scrollIntoView({ behavior: 'instant' })); await page.waitForTimeout(1200);
  await page.locator('#rings .ring[data-tier="3"]').dispatchEvent('click');
  ok('知识边界环可点击切换', (await page.textContent('#td-title')) === '禁止全知');
  await page.evaluate(() => document.getElementById('local').scrollIntoView({ behavior: 'instant' })); await page.waitForTimeout(1200);
  const before = await page.evaluate(() => [...document.querySelectorAll('.ibm-line')].map((t) => t.textContent).join('|'));
  await page.locator('.node').nth(2).click();
  await page.waitForFunction(() => /PYTHON/.test([...document.querySelectorAll('.ibm-line')].map((t) => t.textContent).join('|')), null, { timeout: 30000 }).catch(() => {});
  const after = await page.evaluate(() => [...document.querySelectorAll('.ibm-line')].map((t) => t.textContent).join('|'));
  ok('本地服务节点切换 → IBM 5100 屏幕解码出新内容', after !== before && /PYTHON/.test(after), after.slice(0, 60));
  await shot('03-local-ibm');
  await page.evaluate(() => document.getElementById('perform').scrollIntoView({ behavior: 'instant' })); await page.waitForTimeout(1500);
  await page.locator('.tri').nth(2).click(); await page.waitForTimeout(900);
  await shot('04-perform');

  // ---- 世界线变动彩蛋
  if (!args.noshift) {
    await page.evaluate(() => { const s = document.getElementById('modes'); window.scrollTo({ top: s.offsetTop + innerHeight * 0.5, behavior: 'instant' }); });
    await page.waitForTimeout(1800);
    const h1a = await page.evaluate(() => document.querySelector('#hero .h1').textContent);
    await shot('05-shift-0-before');
    for (let n = 1; n <= SHIFTS; n++) {
      const t0 = Date.now();
      if (n % 2) await page.click('#mw'); else await page.keyboard.press('d');
      await page.waitForTimeout(400);
      const mid = await page.evaluate(() => ({ busy: window.__promo.shift.state.busy, shift: document.body.dataset.shift }));
      if (n === 1) {
        // 重复触发在进行中被忽略
        await page.keyboard.press('d'); await page.click('#mw', { force: true }).catch(() => {});
        await sleep(1200); await shot('05-shift-1-ciphers');
        // 窗口缩放：变动进行中缩放不出错
        await page.setViewportSize({ width: Math.round(W * 0.8), height: Math.round(H * 0.85) }); await sleep(900);
        await shot('05-shift-2-resized'); await page.setViewportSize({ width: W, height: H });
      }
      await page.waitForFunction(() => !window.__promo.shift.state.busy, null, { timeout: 180000 });
      const s = await info();
      const want = n % 2 ? 'b' : 'a';
      const txt = await page.evaluate(() => document.querySelector('#hero .h1').textContent);
      const apl = await page.evaluate(() => document.querySelectorAll('.ciph').length);
      ok(`世界线变动 #${n} → ${want}：完成、文案${want === 'b' ? '重组为新文案' : '还原'}、无残留乱码`, mid.busy && s.world === want && s.shifts === n && apl === 0 && (want === 'b' ? txt !== h1a : txt === h1a), { ms: Date.now() - t0, world: s.world, shifts: s.shifts, txt: txt.slice(0, 14) });
      ok(`  └ 模型随世界线切换（${want === 'b' ? 'alt 白大褂' : 'ab 外套'}）且可正常换表情`, s.state === 'ready' && s.alias === (want === 'b' ? 'alt' : 'ab') && s.swapping === false, { alias: s.alias, state: s.state, cur: s.current });
      if (n === 1) {
        const ph = await page.evaluate(() => window.__promo.shift.state.phases);
        ok('世界线变动演出分段完整（失稳→空间撕裂→压暗转红→橙色数字跳变→锁定→黑场换线→显现）', ['glitch', 'tear', 'dim', 'digits', 'lock', 'swap', 'reveal'].every((k) => ph.includes(k)), ph);
        await page.waitForTimeout(1500); await shot('05-shift-3-after-b');
      }
      await page.waitForTimeout(600);
    }
    // 低配降级：强制 lite（不用整页 SVG 模糊/液化滤镜），演出仍须完整可用
    {
      await page.evaluate(() => { window.__wlLite = true; });
      const t1 = Date.now(); const w0 = (await info()).world;
      await page.keyboard.press('d'); await page.waitForTimeout(500);
      const mid = await page.evaluate(() => ({ f: getComputedStyle(document.documentElement).getPropertyValue('--wl-f'), gh: document.documentElement.className }));
      await page.waitForFunction(() => !window.__promo.shift.state.busy, null, { timeout: 180000 });
      const s2 = await page.evaluate(() => ({ lite: window.__promo.shift.state.lite, ph: window.__promo.shift.state.phases, wl: document.documentElement.dataset.wl || '', cls: document.documentElement.className, ciph: document.querySelectorAll('.ciph').length }));
      const i2 = await info();
      ok('低配降级：lite 模式下变动演出完整、不含 url() 滤镜、结束后无残留', s2.lite && i2.world !== w0 && ['glitch', 'digits', 'lock', 'swap', 'reveal'].every((k) => s2.ph.includes(k)) && !/url\(/.test(mid.f) && !s2.wl && !/wl-g/.test(s2.cls) && s2.ciph === 0, { ms: Date.now() - t1, mid, s2 });
      await page.evaluate(() => { window.__wlLite = false; });
    }
    ok('重复触发计数正确（进行中的重复触发被忽略）', (await info()).shifts === SHIFTS + 1, (await info()).shifts);
    await page.waitForTimeout(1200);
    await shot('05-shift-4-back');
    const mem = await page.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : -1);
    R.memMB = mem; console.log('  · JS 堆', mem, 'MB');
  }

  // ---- 窗口缩放 / 滚动回顶
  await page.setViewportSize({ width: Math.round(W * 0.75), height: Math.round(H * 0.8) }); await page.waitForTimeout(800);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await page.waitForTimeout(1200);
  const ov = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2);
  ok('窗口缩放后无横向溢出', ov);
  await page.setViewportSize({ width: W, height: H }); await page.waitForTimeout(800);
  await shot('06-final-hero');

  R.errors = [...new Set(R.errors)].filter((e) => !/Failed to load resource.*404.*favicon/.test(e));
  ok('控制台 / 页面零错误', R.errors.length === 0, R.errors.slice(0, 5));
  await page.close(); // 每次只保留一个 E-mote 实例，避免测试页面之间争用显存
  if (!args['core-only']) {
  // ---- 键盘 Enter 进入
  {
    const pg = await browser.newPage({ viewport: { width: W, height: H } });
    await pg.goto(BASE, { waitUntil: 'commit' });
    await pg.waitForSelector('.bt-entry.show.is-ready', { timeout: 300000 });
    await pg.keyboard.press('Enter');
    await pg.waitForFunction(() => document.body.dataset.boot === 'done', null, { timeout: 20000 }).then(() => ok('键盘 Enter 可进入主页', true), () => ok('键盘 Enter 可进入主页', false));
    await pg.close();
  }
  // ---- 模型加载慢：按钮为加载态且不可点；加载完才可点
  {
    const pg = await browser.newPage({ viewport: { width: W, height: H } });
    await pg.route('**/models/kurisu_ab.expressions.psb', async (r) => { await sleep(14000); r.continue().catch(() => {}); });
    await pg.goto(BASE, { waitUntil: 'commit' });
    await pg.waitForSelector('.bt-entry.show', { timeout: 120000 });
    const a = await pg.evaluate(() => ({ st: document.getElementById('bt-entry').dataset.state, dis: document.querySelector('.be-btn').disabled, note: document.querySelector('.be-note').textContent }));
    ok('模型加载慢：按钮为加载态、不可点、显示加载进度', a.st === 'loading' && a.dis && /LOADING/.test(a.note), a);
    await pg.screenshot({ path: path.join(OUT, `${tag}-00f-boot-entry-loading.png`) });
    await pg.keyboard.press('Enter'); await pg.evaluate(() => window.__bootEnter?.()); await sleep(600);
    ok('模型加载中：Enter / 点击均不会进入', await pg.evaluate(() => document.body.dataset.boot === 'on'));
    await pg.waitForFunction(() => !document.querySelector('.be-btn').disabled, null, { timeout: 120000 });
    ok('模型就绪后按钮变为可点', await pg.evaluate(() => document.getElementById('bt-entry').dataset.state === 'ready'));
    await pg.close();
  }
  // ---- 模型加载失败：降级为静态图，仍可进入
  {
    const pg = await browser.newPage({ viewport: { width: W, height: H } });
    await pg.route('**/models/kurisu_ab.expressions.psb', (r) => r.abort());
    await pg.goto(BASE, { waitUntil: 'commit' });
    await pg.waitForSelector('.bt-entry.show.is-ready', { timeout: 120000 });
    const f = await pg.evaluate(() => ({ st: document.getElementById('bt-entry').dataset.state, dis: document.querySelector('.be-btn').disabled }));
    ok('模型加载失败：按钮降级为可点（offline）', f.st === 'offline' && !f.dis, f);
    await pg.click('.be-btn');
    await pg.waitForFunction(() => document.body.dataset.boot === 'done', null, { timeout: 20000 }).then(() => ok('模型加载失败：仍可点击进入主页', true), () => ok('模型加载失败：仍可点击进入主页', false));
    await pg.close();
  }
  // ---- 开屏底图无黑边：任意窗口比例都满屏（取消上下 4.5% 黑边条；cover 铺满）
  {
    const pg = await browser.newPage({ viewport: { width: W, height: H } });
    await pg.goto(BASE, { waitUntil: 'commit' }); await pg.waitForSelector('#boot.on', { timeout: 20000 }); await sleep(1200);
    const chk = async (w, h) => { await pg.setViewportSize({ width: w, height: h }); await sleep(500);
      return pg.evaluate(() => { const r = document.querySelector('.bt-cg').getBoundingClientRect(), fx = getComputedStyle(document.querySelector('.bt-cgfx')).backgroundImage; return { w: innerWidth, h: innerHeight, covers: r.left <= 0.5 && r.top <= 0.5 && r.right >= innerWidth - 0.5 && r.bottom >= innerHeight - 0.5, bars: /4\.5%/.test(fx), size: getComputedStyle(document.querySelector('.bt-cg')).backgroundSize }; }); };
    const rs = []; for (const [w, h] of [[1920, 1080], [1440, 900], [1280, 720], [1024, 768], [2560, 1440], [3440, 1440], [800, 1200]]) rs.push(await chk(w, h));
    ok('开屏底图无黑边：7 种窗口比例（含 2560×1440、超宽、竖向）均 cover 满屏', rs.every((r) => r.covers && !r.bars && r.size === 'cover'), rs);
    await pg.close();
  }
  // ---- 世界线变体 b（?wl=b）
  {
    const pg = await browser.newPage({ viewport: { width: W, height: H } });
    await pg.goto(BASE + '?wl=b', { waitUntil: 'commit' }); await pg.waitForSelector('#boot.on', { timeout: 20000 }); await sleep(1500);
    const v = await pg.evaluate(() => ({ F: window.__bootLines?.wl.F.length, variant: window.__bootLines?.wl.variant, cg: document.getElementById('boot').classList.contains('cg') }));
    ok('?wl=b：暖橙高密度变体可预览（远景线 18 条）', v.variant === 'b' && v.F === 18, v);
    await pg.close();
  }
  // ---- CG 底图加载失败：回退纯黑星图背景，世界线与按钮仍可用
  {
    const pg = await browser.newPage({ viewport: { width: W, height: H } });
    const fallbackErrors = [];
    pg.on('pageerror', (e) => fallbackErrors.push(e.message));
    await pg.route('**/img/boot-cg.webp', (r) => r.abort());
    await pg.goto(BASE, { waitUntil: 'commit' });
    await pg.waitForSelector('.bt-entry.show.is-ready', { timeout: 120000 });
    const f = await pg.evaluate(() => ({ cg: document.getElementById('boot').classList.contains('cg'), fail: document.getElementById('boot').classList.contains('cg-fail'), field: getComputedStyle(document.getElementById('bt-bgc')).display !== 'none', lines: window.__bootLines?.wl.S.length, rects: window.__bootLines?.wl.rects.length }));
    ok('CG 底图加载失败：回退到纯黑星图背景，世界线仍在', !f.cg && f.fail && f.field && f.lines === 6 && f.rects === 0, f);
    ok('CG 加载失败后无计时器访问已移除元素的错误', fallbackErrors.length === 0, fallbackErrors);
    await pg.click('.be-btn');
    await pg.waitForFunction(() => document.body.dataset.boot === 'done', null, { timeout: 20000 }).then(() => ok('CG 底图加载失败：仍可点击进入主页', true), () => ok('CG 底图加载失败：仍可点击进入主页', false));
    await pg.close();
  }
  }
  R.pass = R.checks.every((c) => c.pass);
  report.results[tag] = R;
  } finally { await browser.close(); }
}

for (const r of RES) {
  try { await runRes(r); } catch (e) { failures++; console.log('  ✗ 异常', e.message); report.results[`${r[0]}x${r[1]}`] = { error: e.message, pass: false }; }
}
const fp = process.env.REPORT || (process.env.SHOT_DIR ? path.join(OUT, 'report.json') : 'docs/e2e-report.json');
fs.writeFileSync(fp, JSON.stringify(report, null, 2));
console.log(failures ? `\n失败项：${failures}` : '\n全部通过');
process.exit(failures ? 1 : 0);
