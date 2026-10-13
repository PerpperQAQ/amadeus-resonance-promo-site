#!/usr/bin/env python3
"""按页面实际用到的字符，把开源字体（SIL OFL）裁成小体积 woff2，页面离线也能正常显示。
字体源文件放在 .tmp/fonts/（来自 github.com/google/fonts 的 OFL 目录），见 ASSETS.md。
用法：python3 scripts/build-fonts.py   （改了页面文案后重跑一次）
"""
import glob, os, re
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, '.tmp', 'fonts')
OUT = os.path.join(ROOT, 'src', 'fonts')
os.makedirs(OUT, exist_ok=True)

text = ''
for f in ['index.html', 'terminal.html', 'fusion.html', 'cinema.html', 'split.html', 'reboot-white.html'] + sorted(glob.glob(os.path.join(ROOT, 'src', '*.js')) + glob.glob(os.path.join(ROOT, 'src', 'reboot', '*.js')) + glob.glob(os.path.join(ROOT, 'src', '*.css'))):
    f = f if os.path.isabs(f) else os.path.join(ROOT, f)
    text += open(f, encoding='utf-8').read()
chars = set(text) | set(chr(c) for c in range(0x20, 0x7f))
chars |= set('·—–…→←↑↓↗▶×“”‘’《》（）、，。：；！？／ ')
chars = ''.join(sorted(c for c in chars if ord(c) >= 0x20))
print('chars:', len(chars))

def make(src, out, axes=None):
    f = TTFont(os.path.join(SRC, src))
    opts = subset.Options()
    opts.layout_features = ['kern', 'liga', 'calt', 'ccmp', 'locl', 'mark', 'mkmk']
    opts.notdef_outline = True
    opts.name_IDs = ['*']
    s = subset.Subsetter(opts)
    s.populate(text=chars)
    s.subset(f)               # 先裁字符（体积骤降），再限制可变字重范围，速度快很多
    if axes:
        f = instancer.instantiateVariableFont(f, axes)
    p = os.path.join(OUT, out)
    f.flavor = 'woff2'
    f.save(p)
    print(out, os.path.getsize(p) // 1024, 'KB', flush=True)

make('NotoSerifSC.ttf', 'ar-serif.woff2', {'wght': (700, 900)})
make('NotoSansSC.ttf', 'ar-sans.woff2', {'wght': (400, 700)})
make('BarlowCondensed-Medium.ttf', 'ar-cond-500.woff2')
make('BarlowCondensed-SemiBold.ttf', 'ar-cond-600.woff2')
make('ShareTechMono.ttf', 'ar-mono.woff2')
make('ZCOOLXiaoWei.ttf', 'ar-disp.woff2')

css = """/* 由 scripts/build-fonts.py 生成的字体声明（字体均为 SIL OFL 授权，已按页面字符裁剪） */
@font-face{font-family:"AR Serif";src:url(./fonts/ar-serif.woff2) format("woff2");font-weight:700 900;font-display:swap}
@font-face{font-family:"AR Sans";src:url(./fonts/ar-sans.woff2) format("woff2");font-weight:400 700;font-display:swap}
@font-face{font-family:"AR Display";src:url(./fonts/ar-disp.woff2) format("woff2");font-weight:400;font-display:swap}
@font-face{font-family:"AR Cond";src:url(./fonts/ar-cond-500.woff2) format("woff2");font-weight:500;font-display:swap}
@font-face{font-family:"AR Cond";src:url(./fonts/ar-cond-600.woff2) format("woff2");font-weight:600;font-display:swap}
@font-face{font-family:"AR Mono";src:url(./fonts/ar-mono.woff2) format("woff2");font-weight:400;font-display:swap}
/* IBM 5100 风格乱码用：DejaVu Sans Mono（Bitstream Vera 许可，可自由使用/再分发）按 APL 符号 + 十六进制字符裁剪，见 ASSETS.md */
@font-face{font-family:"AR APL";src:url(./fonts/ar-apl.woff2) format("woff2");font-weight:400;font-display:swap}
"""
open(os.path.join(ROOT, 'src', 'fonts.css'), 'w').write(css)
