/**
 * 指针模块（可整体替换）：机械齿轮指针（取自 Amadeus Logo 的齿轮意象）。
 *  - 近乎即时跟随（直接取指针坐标，无拖尾、无牵引）
 *  - 移动时齿轮按移动速度轻微旋转；静止时极缓慢空转
 *  - 悬停可点击元素：齿轮放大、加速旋转、外圈出现刻度环
 *  - 点击：齿轮“咬合”式短促转过一个齿距 + 一圈涟漪
 * 用法：const c = createCursor({ layer, hoverSelector }); c.destroy();
 * 只在精细指针（鼠标）设备启用；触屏设备保持系统指针。
 */
const TEETH = 12;
function gearSvg() {
  // 齿轮轮廓：12 齿梯形齿，外圈 R=11、齿根 8.4；内圈 + 3 根轮辐 + 轴心
  const R = 11, r = 8.4, pts = [];
  for (let i = 0; i < TEETH; i++) {
    const a = (i / TEETH) * Math.PI * 2, w = Math.PI / TEETH;
    const P = (rad, ang) => `${(Math.cos(ang) * rad).toFixed(2)},${(Math.sin(ang) * rad).toFixed(2)}`;
    pts.push(P(r, a - w * 0.95), P(R, a - w * 0.5), P(R, a + w * 0.5), P(r, a + w * 0.95));
  }
  const spokes = [0, 120, 240].map((d) => `<line x1="0" y1="0" x2="${(Math.cos(d * Math.PI / 180) * 5.6).toFixed(2)}" y2="${(Math.sin(d * Math.PI / 180) * 5.6).toFixed(2)}"/>`).join('');
  const ticks = Array.from({ length: 24 }, (_, i) => `<line x1="0" y1="-17.5" x2="0" y2="${i % 6 ? -16.2 : -15}" transform="rotate(${i * 15})"/>`).join('');
  return `<svg viewBox="-20 -20 40 40" aria-hidden="true"><g class="cu-ticks">${ticks}<circle r="18.4"/></g>` +
    `<g class="cu-gear"><polygon points="${pts.join(' ')}"/><circle r="5.8" class="cu-in"/>${spokes}<circle r="1.7" class="cu-hub"/></g></svg>`;
}

export function createCursor({ layer, hoverSelector = 'a,button,[role="button"],[role="tab"],[role="link"],.ring,[data-hover]' } = {}) {
  if (!matchMedia('(pointer:fine)').matches) return { destroy() {}, enabled: false };
  document.documentElement.classList.add('has-cursor');
  const dot = document.createElement('i'); dot.className = 'cu-dot'; dot.innerHTML = gearSvg();
  layer.append(dot);
  const gear = dot.querySelector('.cu-gear'), ticks = dot.querySelector('.cu-ticks'), box = dot.querySelector('svg');
  let mx = -100, my = -100, lx = 0, ly = 0, shown = false, hover = false, raf = 0;
  let ang = 0, vel = 0, snap = 0, snapShown = 0, scale = 1, tAng = 0;

  const loop = () => {
    raf = requestAnimationFrame(loop);
    const dx = mx - lx, dy = my - ly; lx = mx; ly = my;
    const speed = Math.hypot(dx, dy);
    const dir = Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : Math.sign(dy);
    const idle = hover ? 1.5 : 0.18;
    vel += ((dir * Math.min(speed, 40) * 0.5 + (hover ? 1 : 0.18) * (dir || 1) * 0.0) - vel) * 0.18;
    ang += vel + idle;
    snapShown += (snap - snapShown) * 0.32;
    scale += ((hover ? 1.55 : 1) * (pressedNow ? 0.86 : 1) - scale) * 0.22;
    tAng -= (hover ? 0.5 : 0.08);
    dot.style.transform = `translate3d(${mx}px,${my}px,0)`;
    gear.style.transform = `rotate(${(ang + snapShown).toFixed(2)}deg)`;
    ticks.style.transform = `rotate(${tAng.toFixed(2)}deg)`;
    box.style.transform = `scale(${scale.toFixed(3)})`;
  };
  let pressedNow = false;
  const onMove = (e) => {
    mx = e.clientX; my = e.clientY;
    if (!shown) { shown = true; lx = mx; ly = my; layer.classList.add('on'); if (!raf) raf = requestAnimationFrame(loop); }
  };
  const onOver = (e) => {
    const on = !!e.target.closest?.(hoverSelector);
    if (on !== hover) { hover = on; layer.classList.toggle('hover', on); }
  };
  const onDown = (e) => {
    pressedNow = true; layer.classList.add('press');
    snap += 360 / TEETH * 1.0;                 // 咬合：转过一个齿距
    const r = document.createElement('i'); r.className = 'cu-ripple';
    r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px';
    layer.append(r);
    r.addEventListener('animationend', () => r.remove(), { once: true });
    setTimeout(() => r.remove(), 1200);
  };
  const onUp = () => { pressedNow = false; layer.classList.remove('press'); };
  const onLeave = () => { shown = false; layer.classList.remove('on'); };
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerover', onOver, { passive: true });
  addEventListener('pointerdown', onDown, { passive: true });
  addEventListener('pointerup', onUp, { passive: true });
  document.documentElement.addEventListener('mouseleave', onLeave);
  return {
    enabled: true,
    destroy() {
      cancelAnimationFrame(raf);
      removeEventListener('pointermove', onMove); removeEventListener('pointerover', onOver);
      removeEventListener('pointerdown', onDown); removeEventListener('pointerup', onUp);
      document.documentElement.classList.remove('has-cursor');
      layer.textContent = '';
    },
  };
}
