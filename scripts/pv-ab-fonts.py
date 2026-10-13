#!/usr/bin/env python3
"""重新生成 pv-ab 字体子集：收集 pv-ab.html + src/pv-ab/*.js + src/emote-stage.js 中的全部字符（含 JS 动态字符串）。
用法：python3 scripts/pv-ab-fonts.py <源字体目录>
源字体（OFL，google/fonts）：NotoSerifSC[wght].ttf  NotoSansSC[wght].ttf  CormorantGaramond[wght].ttf  CormorantGaramond-Italic[wght].ttf
需要 fonttools + brotli。"""
import glob, os, subprocess, sys
src = sys.argv[1]
files = ['pv-ab.html', 'src/emote-stage.js'] + glob.glob('src/pv-ab/*.js')
s = ''.join(open(f, encoding='utf-8').read() for f in files)
ch = {c for c in s if ord(c) > 0x2000} | {chr(i) for i in range(0x20, 0x7f)} | set('·—…「」『』，。、？！：；（）～“”‘’×–')
open('.tmp/pv-ab-chars.txt', 'w').write(''.join(sorted(ch)))
for f, o in [('NotoSerifSC[wght].ttf', 'serif-sc'), ('NotoSansSC[wght].ttf', 'sans-sc'), ('CormorantGaramond[wght].ttf', 'cormorant'), ('CormorantGaramond-Italic[wght].ttf', 'cormorant-italic')]:
    subprocess.run(['pyftsubset', os.path.join(src, f), '--text-file=.tmp/pv-ab-chars.txt', '--flavor=woff2', "--layout-features=*", f'--output-file=src/fonts/{o}.woff2'], check=True)
print(len(ch), 'chars')
