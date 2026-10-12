/**
 * 人物换场动效（8 种，章节各配 2–3 种并带随机）：
 *   slide 滑入+视差 · cut 世界线色散硬切 · push 推近特写 · rise 自下升起
 *   far 远景缩小淡入 · iris 圆形光圈遮罩 · flip 辉光管翻页式（逐行显现） · peek 边缘探头
 * 使用 Web Animations（transform/opacity/clip-path/filter），共享同一个 E-mote 实例，不重新加载人物；
 * 连续触发时旧动画会被取消，新的接管（令牌防抖）；过快的重复切换自动降级为只播“入场”。
 */
const vw = (n) => `${n}vw`;
const FX = {
  slide: { out: [{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: '-4vw 0' }], dOut: 170,
    inn: (d) => [{ opacity: 0, translate: `${d * 30}vw 0` }, { opacity: 1, translate: '0 0' }], dIn: 820, ease: 'cubic-bezier(.16,1,.3,1)' },
  push: { out: [{ opacity: 1, scale: 1 }, { opacity: 0, scale: 1.3 }], dOut: 200,
    inn: () => [{ opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1 }], dIn: 900, ease: 'cubic-bezier(.2,.9,.2,1)' },
  rise: { out: [{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: '0 6vh' }], dOut: 150,
    inn: () => [{ opacity: 0, translate: '0 58vh' }, { opacity: 1, translate: '0 -1.6vh', offset: 0.72 }, { opacity: 1, translate: '0 0' }], dIn: 980, ease: 'cubic-bezier(.22,.9,.3,1)' },
  far: { out: [{ opacity: 1, scale: 1 }, { opacity: 0, scale: 0.9 }], dOut: 150,
    inn: () => [{ opacity: 0, scale: 0.42 }, { opacity: 1, scale: 1 }], dIn: 1150, ease: 'cubic-bezier(.25,.8,.25,1)' },
  iris: { target: 'body', out: [{ clipPath: 'circle(80% at 50% 36%)' }, { clipPath: 'circle(0% at 50% 36%)' }], dOut: 240,
    inn: () => [{ clipPath: 'circle(0% at 50% 36%)' }, { clipPath: 'circle(82% at 50% 36%)' }], dIn: 900, ease: 'cubic-bezier(.3,.7,.2,1)' },
  flip: { target: 'body', out: [{ clipPath: 'inset(0 0 0 0)', filter: 'brightness(1)' }, { clipPath: 'inset(100% 0 0 0)', filter: 'brightness(2)' }], dOut: 200, outEase: 'steps(5,end)',
    inn: () => [{ clipPath: 'inset(0 0 100% 0)', filter: 'brightness(2.4)' }, { clipPath: 'inset(0 0 0% 0)', filter: 'brightness(1)' }], dIn: 760, ease: 'steps(9,end)' },
  peek: { out: [{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: '3vw 0' }], dOut: 140,
    inn: (d) => [{ opacity: 1, translate: `${d * 56}vw 5vh`, rotate: `${d * 9}deg` }, { opacity: 1, translate: `${d * -2.4}vw 0`, rotate: `${d * -1.2}deg`, offset: 0.62 }, { opacity: 1, translate: '0 0', rotate: '0deg' }], dIn: 880, ease: 'cubic-bezier(.3,.9,.3,1)' },
  cut: { cls: true },
};
export const KINDS = Object.keys(FX);

export function createStageFx({ stage, bodyEl }) {
  let token = 0, anims = [], lastAt = 0, timers = [];
  const clear = () => {
    anims.forEach((a) => { try { a.cancel(); } catch (e) { /* ignore */ } }); anims = [];
    timers.forEach(clearTimeout); timers = [];
    stage.classList.remove('warp-out', 'warp-in');
  };
  /**
   * @param kind  动效名
   * @param apply 在“看不见”的瞬间调用，切到新位置（改 CSS 变量/视图）
   * @param dir   新位置相对旧位置的方向（-1 左 / 1 右），决定滑入/探头的来向
   */
  function run(kind, apply, dir = 1) {
    const my = ++token; clear();
    const fx = FX[kind] || FX.cut;
    const now = performance.now(), rapid = now - lastAt < 520; lastAt = now;
    let applied = false, entered = false, fallback = 0;
    const doApply = () => { if (!applied) { applied = true; apply(); } };
    const done = (ms) => timers.push(setTimeout(() => { if (my === token) clear(); }, ms));
    if (fx.cls) {   // 世界线色散硬切：沿用 CSS 的 warp-out / warp-in
      stage.classList.add('warp-out');
      timers.push(setTimeout(() => { if (my !== token) return; doApply(); stage.classList.remove('warp-out'); stage.classList.add('warp-in'); done(660); }, rapid ? 60 : 190));
      return;
    }
    const tgt = fx.target === 'body' ? bodyEl : stage;
    const playIn = () => {
      // onfinish 与超时兜底只能有一个获胜，否则会在入场 120ms 后重播。
      if (my !== token || entered) return;
      entered = true;
      clearTimeout(fallback);
      doApply();
      const a = tgt.animate(fx.inn(dir), { duration: rapid ? fx.dIn * 0.6 : fx.dIn, easing: fx.ease, fill: 'backwards' });
      anims.forEach((o) => { try { o.cancel(); } catch (e) { /* ignore */ } }); anims = [a];
      a.onfinish = () => { if (my === token) clear(); };
      done(fx.dIn + 200);
    };
    if (rapid) { playIn(); return; }
    const o = tgt.animate(fx.out, { duration: fx.dOut, easing: fx.outEase || 'ease-in', fill: 'forwards' });
    anims = [o];
    o.onfinish = playIn;
    fallback = setTimeout(playIn, fx.dOut + 120);   // 后台标签页不出帧时的兜底
    timers.push(fallback);
  }
  return { run, cancel: () => { token++; clear(); } };
}

export const POOL = {
  hero: ['slide', 'far'],
  what: ['slide', 'peek', 'far'],
  modes: ['rise', 'slide', 'push'],
  boundary: ['cut', 'iris', 'far'],
  perform: ['push', 'flip', 'iris'],
  local: ['peek', 'slide', 'cut'],
  road: ['far', 'slide'],
  outro: ['rise', 'far', 'iris'],
};
