"""pv-ab「二重观测」背景脸：从本项目 E-mote 模型的实时截图（.tmp/faces/*.png，白底，Playwright 截取
pv-ui.html 画布）裁出头部 → 去色 → 粗网点半调 → 透明底 WebP。原模型素材不改。运行：python3 scripts/build-pv-ab.py"""
from PIL import Image, ImageChops, ImageDraw, ImageOps
import glob, os
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.join(HERE, '..', '.tmp', 'faces'); OUT = os.path.join(HERE, '..', 'public', 'img', 'pv-ab')
os.makedirs(OUT, exist_ok=True)
for f in sorted(glob.glob(SRC + '/*.png')):
  k = os.path.splitext(os.path.basename(f))[0]
  im = Image.open(f).convert('RGB').crop(tuple(round(v * Image.open(f).width / 768) for v in (240, 60, 540, 370))).resize((860, 880), Image.LANCZOS)
  diff = ImageChops.difference(im, Image.new('RGB', im.size, 'white')).convert('L')
  alpha = diff.point(lambda v: 255 if v > 10 else 0)
  g = ImageOps.autocontrast(ImageOps.grayscale(im), cutoff=1)
  # 网点：每格画一个圆，半径随暗度变化
  s = 8; dots = Image.new('L', im.size, 0); d = ImageDraw.Draw(dots)
  for y in range(0, im.height, s):
    for x in range((y // s % 2) * s // 2, im.width, s):
      v = g.getpixel((min(x, im.width - 1), min(y, im.height - 1))) / 255
      r = s * .58 * (v ** 1.8) + .5
      d.ellipse((x - r, y - r, x + r, y + r), fill=255)
  a = ImageChops.multiply(dots, alpha)
  out = Image.new('RGBA', im.size, (225, 225, 220, 0)); out.putalpha(a)
  out.save(os.path.join(OUT, f'face-{k}.webp'), quality=80); print('ok', k)
