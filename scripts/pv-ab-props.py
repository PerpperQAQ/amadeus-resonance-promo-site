"""把 .tmp/props/<prop>/cutout.png 处理成粒子采样源 public/img/pv-ab/props/<prop>.webp（只用于采样，不直接展示）。
冈部手机：先用屏幕底色抹掉短信文字。来源与权利见 ASSETS.md。"""
from PIL import Image, ImageDraw
import os
SRC = '.tmp/props'; OUT = 'public/img/pv-ab/props'
for k in ['phone_sg001', 'phone_microwave', 'metal_upa', 'divergence_meter', 'ibn5100']:
    im = Image.open(f'{SRC}/{k}/cutout.png').convert('RGBA')
    if k == 'phone_sg001':
        d = ImageDraw.Draw(im); fill = im.getpixel((200, 470))
        d.rectangle((52, 147, 364, 506), fill=fill)
    im.thumbnail((560, 560), Image.LANCZOS)
    im.save(f'{OUT}/{k}.webp', quality=88, method=6)
    print(k, im.size, os.path.getsize(f'{OUT}/{k}.webp'))
