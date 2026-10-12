"""开屏底图：用户 Amadeus 项目 ready 界面的红莉栖近景 CG → WebP（约 140KB，原图 1672×941 PNG 2.1MB）。
源文件（只读，不修改）：
/Volumes/GM7 2T/Mac扩容/项目/Amadeus-Resonance/Documents/Playground/amadeus-resonance-frontend-claude-20260925/public/assets/ready-cg-owner-r3.png
用法：python3 scripts/build-bootcg.py [源 png 路径]"""
import sys
from PIL import Image
SRC = sys.argv[1] if len(sys.argv) > 1 else '/Volumes/GM7 2T/Mac扩容/项目/Amadeus-Resonance/Documents/Playground/amadeus-resonance-frontend-claude-20260925/public/assets/ready-cg-owner-r3.png'
im = Image.open(SRC).convert('RGB'); print(im.size)
im.save('public/img/boot-cg.webp', quality=86, method=6)
