#!/usr/bin/env python3
"""从原始素材生成页面用的派生副本（只读原件，不改动原始文件）。
每章一张底图：保留原图色彩倾向，统一压暗 + 暗角 + 噪点 + 极淡暖调/琥珀高光：
  世界线 A（默认）：暖调 + 琥珀高光
  世界线 B（彩蛋，第十轮改）：琥珀主色 + 淡紫辅色（暗部淡紫、高光琥珀的分离色调），不再偏冷青
用法：python3 scripts/build-images.py
"""
from PIL import Image, ImageFilter
import numpy as np, os

R = '/Users/perpperqaq/Pictures/Amadeus-Resonance-Art-References/2026-07-26/'
BRAND = '/Users/perpperqaq/Documents/Codex/amadeus-system-new/public/local-private-assets/brand/amadeus-resonance/v1'
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'img')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)

def lut(stops):
    xs = [s[0] for s in stops]
    return np.stack([np.interp(np.linspace(0, 1, 256), xs, [s[1][c] for s in stops]) for c in range(3)], 1)

def grade(im, stops, name, mix=0.22, dim=0.9, noise=5.5, width=1600):
    im = im.convert('RGB')
    r = width / im.size[0]
    im = im.resize((width, round(im.size[1] * r)), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32) / 255
    lum = (a @ np.array([0.299, 0.587, 0.114], np.float32))
    lum = np.clip((lum - lum.min()) / (np.ptp(lum) + 1e-6), 0, 1) ** 0.95
    mapped = lut(stops)[(lum * 255).astype(np.uint8)] / 255
    gray = lum[..., None]
    out = mapped * (1 - mix) + (a * 0.55 + gray * 0.45) * mix * (mapped.mean() / max(a.mean(), 1e-3)) ** 0.0
    out = out * dim
    h, w = lum.shape
    yy, xx = np.mgrid[0:h, 0:w]
    v = ((xx / w - .5) ** 2 * 1.0 + (yy / h - .5) ** 2 * 1.4)
    out *= (1 - np.clip(v, 0, .8))[..., None]
    out += rng.normal(0, noise / 255, (h, w, 1))
    out = np.clip(out, 0, 1)
    img = Image.fromarray((out * 255).astype(np.uint8))
    p = os.path.join(OUT, name)
    img.save(p, 'WEBP', quality=70, method=6)
    print(name, img.size, os.path.getsize(p) // 1024, 'KB')

# 第三轮：保留底图原有色彩倾向（夜蓝/紫红街招/暖黄实验室…），只做统一的明暗、颗粒与轻微琥珀点缀。
def grade2(im, name, world='a', width=1600, dim=0.97, gamma=1.0, sat=1.0, noise=3.5):
    im = im.convert('RGB')
    r = width / im.size[0]
    im = im.resize((width, round(im.size[1] * r)), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32) / 255
    lum = (a @ np.array([0.299, 0.587, 0.114], np.float32))[..., None]
    out = lum + (a - lum) * sat                      # 轻微降饱和，保留色相
    if world == 'a':
        out = out * np.array([1.015, 1.0, 0.975], np.float32)       # 极淡暖调，使 7 章统一
        amber = np.array([1.0, 0.68, 0.26], np.float32)
        hi = np.clip((lum - 0.55) / 0.45, 0, 1) ** 1.5
        out = out * (1 - hi * 0.08) + amber * lum * hi * 0.08 * 1.25  # 高光处极少量琥珀
    else:
        # 第十轮：B 世界线 = 琥珀主色 + 淡紫辅色（暗部/中间调偏淡紫，高光偏琥珀金）
        out = lum + (out - lum) * 0.8
        lilac = np.array([0.80, 0.72, 1.0], np.float32)
        amber = np.array([1.0, 0.78, 0.40], np.float32)
        sw = np.clip(1 - lum / 0.6, 0, 1) ** 1.2
        hi = np.clip((lum - 0.5) / 0.5, 0, 1) ** 1.3
        out = out * (1 - sw * 0.32) + lilac * lum * sw * 0.32 * 1.2
        out = out * (1 - hi * 0.2) + amber * lum * hi * 0.2 * 1.2
        out = out * np.array([1.0, 0.97, 0.98], np.float32)
    out = np.clip(out, 0, 1) ** gamma * dim
    h, w = lum.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    v = ((xx / w - .5) ** 2 * 1.0 + (yy / h - .5) ** 2 * 1.4)
    out *= (1 - np.clip(v, 0, .42))[..., None]
    out += rng.normal(0, noise / 255, (h, w, 1))
    img = Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))
    p = os.path.join(OUT, name)
    img.save(p, 'WEBP', quality=72, method=6)
    print(name, img.size, os.path.getsize(p) // 1024, 'KB')

# (章节 id, 来源, 裁切底边比例, 世界线 A 中/高亮色, 世界线 B 中/高亮色)
SECS = [
  ('hero',     '03_reboot/reboot_intro_04.jpg',        0.0,  ((92, 70, 38), (206, 150, 72)),  ((70, 110, 126), (176, 214, 220))),
  ('what',     '03_reboot/reboot_background_03.jpg',   0.07, ((84, 74, 44), (196, 160, 92)),  ((74, 104, 118), (186, 216, 214))),
  ('modes',    '03_reboot/reboot_background_01.jpg',   0.07, ((96, 72, 40), (214, 160, 84)),  ((84, 112, 124), (196, 222, 222))),
  ('boundary', '03_reboot/reboot_story.jpg',           0.0,  ((70, 76, 46), (222, 168, 70)),  ((60, 100, 124), (170, 208, 226))),
  ('perform',  '03_reboot/reboot_background_02.jpg',   0.07, ((54, 82, 62), (176, 170, 96)),  ((62, 96, 120), (160, 204, 216))),
  ('local',    '03_reboot/reboot_intro_05.jpg',        0.0,  ((88, 72, 40), (208, 154, 76)),  ((72, 106, 118), (182, 214, 214))),
  ('road',     '06_official_store_screenshots/steins_gate_2009/originals/screenshot_full_03__3efed34996.jpg', 0.26, ((78, 70, 42), (190, 150, 82)), ((66, 100, 120), (170, 206, 218))),
  ('outro',    '03_reboot/reboot_background_04.jpg',   0.07, ((84, 78, 46), (210, 160, 82)),  ((76, 108, 124), (190, 220, 224))),
]
SHRINE = '/Users/perpperqaq/Downloads/resg_bg028a1.png'   # 用户指定（3072×1728 RGBA，柳林神社空景）；只读
ONLY = set(os.environ.get('ONLY', '').split(',')) - {''}
for sid, src, cb, *_ in SECS:
    if ONLY and sid not in ONLY: continue
    if sid == 'local':
        # 第十轮：06 本地章底图改为柳林神社空景（IBM 5100 存放处），用户指定的 resg_bg028a1.png；略压暗、略降饱和
        im = Image.open(SHRINE).convert('RGB')
        grade2(im, 'bg-local.webp', 'a', dim=0.86, sat=0.9, gamma=1.05, width=1920)
        grade2(im, 'bg-local-b.webp', 'b', dim=0.86, sat=0.9, gamma=1.05, width=1920)
        continue
    im = Image.open(R + src).convert('RGB')
    if cb:
        w, h = im.size
        im = im.crop((0, 0, w, int(h * (1 - cb))))  # 裁掉底部水印/字幕条
    grade2(im, f'bg-{sid}.webp', 'a')
    grade2(im, f'bg-{sid}-b.webp', 'b', dim=0.97)
