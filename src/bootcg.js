/**
 * 开屏 CG 底图（红莉栖直视镜头近景）的几何：底图在 #boot 里是“满屏、background-size:cover、position 50% 38%（无黑边，任意窗口比例都铺满）”，
 * 这里用同一套公式把“图上的人物区域”换算到视口像素，供世界线避让（脸部、颈领口、真由理的脸）和汇聚点定位使用。
 * 图上的区域用归一化坐标（相对 1672×941 原图），在 docs/boot-assessment.md 的叠框图里核对过。
 */
export const CG_W = 1672, CG_H = 941, INSET = 0, POS_Y = 0.38;
// 归一化区域：[x0, y0, x1, y1]
export const CG_AVOID = {
  face: [0.31, 0.08, 0.69, 0.72],       // 红莉栖的脸（含耳侧发丝）
  collar: [0.42, 0.66, 0.69, 0.84],     // 颈部 + 领口 + 领结
  mayuri: [0.085, 0.33, 0.17, 0.52],    // 左后方沙发上真由理的脸，别让线从她脸上划过
};
const CG_TARGET_Y = 0.885;               // 汇聚点：领口下沿以下的衬衫区域（图上 y）

export function cgLayout(W, H) {
  const top = H * INSET, bh = H * (1 - 2 * INSET), s = Math.max(W / CG_W, bh / CG_H);
  const iw = CG_W * s, ih = CG_H * s, ox = (W - iw) * 0.5;
  // 超宽屏把裁切重心向下移，为领口下方的汇聚点保留空间。
  const positionY = ih > bh + 1 ? Math.min(1, Math.max(POS_Y, (CG_AVOID.collar[3] * ih - bh * .76) / (ih - bh))) : POS_Y;
  const oy = top + (bh - ih) * positionY;
  const map = ([x0, y0, x1, y1]) => [ox + x0 * iw, oy + y0 * ih, ox + x1 * iw, oy + y1 * ih];
  return { ox, oy, iw, ih, s, positionY, map, top, bottom: H - top };
}
/** 视口像素下的避让矩形（已按屏宽放大安全边距 pad）。 */
export function avoidRects(W, H, pad = 0.012) {
  const L = cgLayout(W, H), p = Math.max(10, W * pad);
  return Object.values(CG_AVOID).map((r) => { const [a, b, c, d] = L.map(r); return [a - p, b - p, c + p, d + p]; });
}
/** 汇聚点（= 进入按钮的上沿）：水平居中，位于领口下方，并为按钮保留视口内空间。 */
export function targetPoint(W, H) {
  const L = cgLayout(W, H), y = L.oy + CG_TARGET_Y * L.ih;
  return { px: 0.5, py: Math.min(0.87, Math.max(0.78, y / H)) };
}
