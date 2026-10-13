#!/usr/bin/env python3
"""第 5 屏 REPORT 拼贴道具：.tmp/props2/<name>/cutout.png → public/img/pv-ab/report/<name>.webp（长边 ≤ 640）。
来源与权利见 ASSETS.md（各目录 source.txt）。用法：python3 scripts/pv-ab-report-props.py [.tmp/props2]"""
import os, sys
from PIL import Image
src = sys.argv[1] if len(sys.argv) > 1 else '.tmp/props2'
out = 'public/img/pv-ab/report'; os.makedirs(out, exist_ok=True)
for n in ['dr_pepper', 'phone_microwave', 'upa_green', 'future_gadget_12', 'divergence_meter', 'time_leap_machine', 'ibn5100', 'radio_kaikan']:
    im = Image.open(os.path.join(src, n, 'cutout.png'))
    im.thumbnail((640, 640), Image.LANCZOS)
    im.save(os.path.join(out, n + '.webp'), 'WEBP', quality=84, method=6)
    print(n, im.size)
