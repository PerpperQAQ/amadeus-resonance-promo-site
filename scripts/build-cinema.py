"""cinema.html 用图：从美术参考库（只读）裁切 / 缩放 / 转 WebP，写入 public/img/cinema/。
来源均为官方公开宣传素材（official_reference_only），仅限本机课堂演示，详见 ASSETS.md。"""
import os
from PIL import Image
LIB = '/Users/perpperqaq/Pictures/Amadeus-Resonance-Art-References/2026-07-26'
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'img', 'cinema')
os.makedirs(OUT, exist_ok=True)
JOBS = [
    # (源, 裁切框 (l,t,r,b) 或 None, 输出宽, 输出名)
    ('01_games_original/steinsgate_zero_key_visual.jpg', (780, 0, 1440, 1300), 1000, 'kv-ghost.webp'),
    ('03_reboot/reboot_background_04.jpg', None, 1600, 'mem-rooftop.webp'),
    ('03_reboot/reboot_intro_03.jpg', None, 1600, 'mem-lab.webp'),
    ('03_reboot/reboot_intro_04.jpg', None, 1600, 'mem-radiokan.webp'),
    ('03_reboot/reboot_story.jpg', None, 1600, 'mem-meter.webp'),
    ('03_reboot/reboot_background_03.jpg', None, 1600, 'stage-lab.webp'),
]
for src, box, w, name in JOBS:
    im = Image.open(os.path.join(LIB, src)).convert('RGB')
    if box: im = im.crop(box)
    h = round(im.height * w / im.width)
    im = im.resize((w, h), Image.LANCZOS)
    p = os.path.join(OUT, name)
    im.save(p, 'WEBP', quality=84, method=6)
    print(name, im.size, os.path.getsize(p) // 1024, 'KB')

# ---- v2：“被观测的画面”处理（只作用在图像本身）：轻微 RGB 通道错位 + 细网点（半调）
import numpy as np
def observe(src, dst, cell=4.2, shift=2, amt=0.11, angle=0.785):
    a = np.asarray(Image.open(os.path.join(OUT, src)).convert('RGB')).astype(np.float32)
    h, w, _ = a.shape
    out = a.copy()
    out[:, :, 0] = np.roll(a[:, :, 0], shift, axis=1)    # R 右移
    out[:, :, 2] = np.roll(a[:, :, 2], -shift, axis=1)   # B 左移
    lum = (0.299 * a[:, :, 0] + 0.587 * a[:, :, 1] + 0.114 * a[:, :, 2]) / 255
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    c, s = np.cos(angle), np.sin(angle)
    u, v = (xx * c + yy * s) / cell, (-xx * s + yy * c) / cell
    d = np.hypot(u - np.round(u), v - np.round(v))           # 到最近网点中心的距离（0..0.707）
    r = 0.5 * np.clip(1 - lum, 0, 1) ** 0.8             # 越暗网点越大
    dot = np.clip((r - d) * 6 + 0.5, 0, 1)                   # 抗锯齿网点
    out *= (1 - amt * dot)[:, :, None]
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(os.path.join(OUT, dst), 'WEBP', quality=86, method=6)
    print('observe', dst)
for n in ['kv-ghost', 'mem-rooftop', 'mem-lab', 'mem-radiokan', 'mem-meter', 'stage-lab']:
    observe(f'{n}.webp', f'{n}-obs.webp')
