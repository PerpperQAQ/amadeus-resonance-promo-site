"""电话微波炉图像（第六轮方案 A）：
官方 Re:Boot 实验室背景（03_reboot/reboot_background_02.jpg，约 285×265 像素的微波炉）→ 裁切、放大、轻微锐化+颗粒、按矩形轮廓抠图；
官方 Re:Boot 触发手机图（reboot_phone_trigger.png，已去白底）→ 缩小、底部渐隐。
输出 public/img/props/mw-oven.webp、mw-phone.webp，并打印光效叠层需要的区域百分比。素材为官方图，仅供课堂展示。"""
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
D = 'assets-candidates/microwave/'
src = Image.open(D + 'official-lab-microwave-crop-x3.png').convert('RGB')   # 855×795（原图 ×3，已 Lanczos + USM）
# 炉体在 ×3 图中的外框：顶盒 (68,82)-(750,248)，炉身 (76,248)-(742,700)，底座 (105,700)-(722,752)
x0, y0, x1, y1 = 66, 80, 752, 754
W, H = x1 - x0, y1 - y0
im = src.crop((x0, y0, x1, y1))
m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
d.rounded_rectangle((2, 2, 750 - x0 - 2, 248 - y0), 5, fill=255)
d.rectangle((76 - x0, 246 - y0, 742 - x0, 701 - y0), fill=255)
d.rectangle((105 - x0, 698 - y0, 722 - x0, 752 - y0), fill=255)
m = m.filter(ImageFilter.GaussianBlur(1.1))
k = 600 / W; sz = (600, round(H * k))
im = im.resize(sz, Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.2, 70, 2)); m = m.resize(sz, Image.LANCZOS)
a = np.asarray(im).astype(float); rng = np.random.default_rng(3)
a += rng.normal(0, 3.2, a.shape[:2])[..., None]          # 轻微颗粒，和页面胶片噪点一致，也掩盖放大后的涂抹感
a = np.clip(a, 0, 255).astype('uint8')
out = Image.fromarray(a).convert('RGBA'); out.putalpha(m)
out.save('public/img/props/mw-oven.webp', quality=90, method=6); print('oven', out.size)
def pc(bx, by, bw, bh): return dict(left=round((bx - x0) / W * 100, 1), top=round((by - y0) / H * 100, 1), w=round(bw / W * 100, 1), h=round(bh / H * 100, 1))
print('刻度窗', pc(160, 123, 345, 87)); print('红开关', pc(697, 162, 25, 48)); print('数码管', pc(628, 372, 100, 65)); print('炉门窗', pc(133, 357, 447, 298)); print('4 键', pc(527, 123, 110, 87))
# 手机
ph = Image.open(D + 'official-reboot-phone-trigger-cut.png').convert('RGBA')
PW = 240; ph = ph.resize((PW, round(ph.height * PW / ph.width)), Image.LANCZOS)
al = np.asarray(ph.getchannel('A')).astype(float); h = al.shape[0]
fade = np.clip((h - np.arange(h)) / (h * 0.12), 0, 1)[:, None]; al *= fade
ph.putalpha(Image.fromarray(al.astype('uint8'))); ph.save('public/img/props/mw-phone.webp', quality=90, method=6); print('phone', ph.size)
print('手机屏幕', dict(left=round(66 / 549 * 100, 1), top=round(150 / 1051 * 100, 1), w=round(404 / 549 * 100, 1), h=round(498 / 1051 * 100, 1)))
