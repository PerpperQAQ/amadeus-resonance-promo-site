"""PV 预览用派生图：裁切 + “印刷纸”处理（细网点半调 + R/B 错位 + 纸色压暗）。原图不改。
来源见 ASSETS.md「PV 预览素材」。运行：python3 scripts/build-pv.py"""
from PIL import Image, ImageChops, ImageDraw
import os
G = '/Users/perpperqaq/Documents/Codex/amadeus-system-new/artifacts/'
C = '/Volumes/GM7 2T/Mac扩容/项目/Amadeus-Resonance/Documents/Playground/amadeus-resonance-frontend-claude-20260925/captures/'
R = '/Users/perpperqaq/Pictures/Amadeus-Resonance-Art-References/2026-07-26/03_reboot/'
HERE = os.path.dirname(os.path.abspath(__file__))
T = os.path.join(HERE, '..', '.tmp', 'pvcap') + '/'
OUT = os.path.join(HERE, '..', 'public', 'img', 'pv')
JOBS = {  # name: (src, crop box, out width, strength)
  'mem-story':   (G+'wp8-6/frontend-daily/wp8-6-1280-history-drawer.png', (1810, 0, 2560, 900), 420, .5),
  'mem-card':    (C+'11-record.png', (420, 70, 1000, 620), 360, .5),
  'cfg-chat':    (C+'13-config-llm-filled.png', (290, 50, 900, 640), 360, .5),
  'cfg-voice':   (C+'14-config-tts-error.png', (290, 50, 900, 640), 360, .5),
  'cfg-mem':     (G+'wp8-8/frontend-acceptance/wp8-8-1280-health.png', (0, 60, 900, 760), 360, .5),
  'cfg-screen':  (C+'cfg-diag.png', (290, 50, 900, 640), 360, .5),
  'win-game':    (R+'reboot_character_scene_03.jpg', None, 420, .35),
  'win-browser': (T+'browser.png', None, 420, .35),
  'win-editor':  (T+'editor.png', None, 420, .35),
  'play-game':   (R+'reboot_character_scene_03.jpg', None, 1600, .25),
  'talk-mayuri': (R+'reboot_intro_02.jpg', None, 1600, .25),
}
def printed(im, k):
  im = im.convert('RGB'); w, h = im.size
  r, g, b = im.split(); d = max(1, round(w / 260))
  im = Image.merge('RGB', (ImageChops.offset(r, d, 0), g, ImageChops.offset(b, -d, 0)))
  dots = Image.new('L', (w, h), 0); dr = ImageDraw.Draw(dots); s = max(3, round(w / 140))
  for y in range(0, h, s):
    for x in range((y // s % 2) * s // 2, w, s): dr.ellipse((x, y, x + s * .45, y + s * .45), fill=255)
  dark = Image.composite(Image.new('RGB', (w, h), (20, 16, 12)), im, dots)
  im = Image.blend(im, dark, .18 * k / .5)
  return Image.blend(im, Image.new('RGB', (w, h), (236, 226, 204)), .06 * k / .5)
os.makedirs(OUT, exist_ok=True)
for n, (src, box, ow, k) in JOBS.items():
  if not os.path.exists(src): print('skip', n, src); continue
  im = Image.open(src); im = im.crop(box) if box else im
  im = im.resize((ow, round(im.height * ow / im.width)), Image.LANCZOS)
  printed(im, k).save(os.path.join(OUT, n + '.webp'), quality=82); print('ok', n)
