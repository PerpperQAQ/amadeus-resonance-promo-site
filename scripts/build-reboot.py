"""reboot-*.html 用图：主项目真实界面截图（amadeus-system-new/artifacts，只读）→ public/img/reboot/；
首屏原画来自美术参考库（official_reference_only），并做与 cinema 相同的“观测”处理。"""
import os, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
ART = '/Users/perpperqaq/Documents/Codex/amadeus-system-new/artifacts'
LIB = '/Users/perpperqaq/Pictures/Amadeus-Resonance-Art-References/2026-07-26'
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'img', 'reboot')
os.makedirs(OUT, exist_ok=True)
SHOTS = [
    ('wp8-8/frontend-acceptance/wp8-8-1280-daily.png', 'app-daily'),
    ('wp8-8/frontend-acceptance/wp8-8-1280-vn.png', 'app-vn'),
    ('wp8-8/frontend-acceptance/wp8-8-1280-health.png', 'app-health'),
    ('wp8-8/frontend-acceptance/wp8-8-1280-boot.png', 'app-boot'),
    ('wp8-6/frontend-daily/wp8-6-1280-history-drawer.png', 'app-history'),
    ('wp8-6/frontend-daily/wp8-6-1280-settings-drawer.png', 'app-settings'),
    ('wp8-8/frontend-acceptance/wp8-8-overlay.png', 'app-overlay'),
    ('frontend-boot-logo-20260907/boot-1920x1080.png', 'app-bootlogo'),
]
for src, name in SHOTS:
    im = Image.open(os.path.join(ART, src)).convert('RGB')
    w = 1600 if im.width > im.height else 700
    im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=84, method=6)
    th = im.copy(); th.thumbnail((360, 360)); th.save(os.path.join(OUT, name + '-t.webp'), 'WEBP', quality=80)
    print(name, im.size)
# 首屏：RE:BOOT 实验室中的红莉栖（1920 宽）+ 观测处理
im = Image.open(os.path.join(LIB, '03_reboot/reboot_intro_03.jpg')).convert('RGB')
im.save(os.path.join(OUT, 'hero.webp'), 'WEBP', quality=86, method=6)
import numpy as np
def observe(path, cell=4.2, shift=2, amt=0.11, angle=0.785):
    """与 build-cinema.py 相同：R/B 通道错位 + 细网点，只作用在图像本身。"""
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    h, w, _ = a.shape
    out = a.copy()
    out[:, :, 0] = np.roll(a[:, :, 0], shift, axis=1)
    out[:, :, 2] = np.roll(a[:, :, 2], -shift, axis=1)
    lum = (0.299 * a[:, :, 0] + 0.587 * a[:, :, 1] + 0.114 * a[:, :, 2]) / 255
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    c, s = np.cos(angle), np.sin(angle)
    u, v = (xx * c + yy * s) / cell, (-xx * s + yy * c) / cell
    d = np.hypot(u - np.round(u), v - np.round(v))
    r = 0.5 * np.clip(1 - lum, 0, 1) ** 0.8
    dot = np.clip((r - d) * 6 + 0.5, 0, 1)
    out *= (1 - amt * dot)[:, :, None]
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(path, 'WEBP', quality=86, method=6)
observe(os.path.join(OUT, 'hero.webp'))
print('hero.webp')
