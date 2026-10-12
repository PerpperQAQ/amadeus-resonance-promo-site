#!/usr/bin/env python3
"""把 build-logo.mjs 渲染出的 PNG 转为 webp：底图 + 两个齿轮（按透明边界裁切），并输出齿轮在底图中的百分比位置。"""
from PIL import Image
import json, os
T = os.path.join(os.path.dirname(__file__), '..', '.tmp', 'logo'); O = os.path.join(os.path.dirname(__file__), '..', 'public', 'img')
base = Image.open(f'{T}/base.png').convert('RGBA')
W, H = base.size
base.save(f'{O}/logo-base.webp', 'WEBP', quality=90, method=6, exact=True)
print('base', base.size, os.path.getsize(f'{O}/logo-base.webp') // 1024, 'KB')
out = {}
for n in ['gear-major', 'gear-minor']:
    im = Image.open(f'{T}/{n}.png').convert('RGBA')
    bb = im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    c = im.crop(bb); c.save(f'{O}/logo-{n}.webp', 'WEBP', quality=90, method=6, exact=True)
    out[n] = dict(left=round(bb[0] / W * 100, 3), top=round(bb[1] / H * 100, 3), width=round((bb[2] - bb[0]) / W * 100, 3), size=c.size)
    print(n, bb, out[n], os.path.getsize(f'{O}/logo-{n}.webp') // 1024, 'KB')
json.dump(out, open(f'{T}/gears.json', 'w'))
