"""把 CDP 抓帧目录拼成对照表：python3 scripts/sheet.py <dir> <seg a|b|c> <t0> <t1> <step> <out.jpg> [cols] [tw]"""
import os,re,sys
from PIL import Image, ImageDraw
D,seg,t0,t1,st,out=sys.argv[1],sys.argv[2],int(sys.argv[3]),int(sys.argv[4]),int(sys.argv[5]),sys.argv[6]
cols=int(sys.argv[7]) if len(sys.argv)>7 else 4; tw=int(sys.argv[8]) if len(sys.argv)>8 else 400
fs=sorted(os.listdir(D)); fr=[(int(re.search(r'-(\d+)\.jpg',f).group(1)),D+'/'+f) for f in fs if f.startswith(seg+'-')]
items=[min(fr,key=lambda x:abs(x[0]-t)) for t in range(t0,t1,st)]
th=int(tw*9/16) if False else int(Image.open(items[0][1]).height*tw/Image.open(items[0][1]).width)
rows=(len(items)+cols-1)//cols; s=Image.new('RGB',(tw*cols,th*rows)); d=ImageDraw.Draw(s)
for i,(t,f) in enumerate(items):
    x,y=(i%cols)*tw,(i//cols)*th; s.paste(Image.open(f).resize((tw,th)),(x,y)); d.rectangle((x,y,x+50,y+12),fill=(0,0,0)); d.text((x+3,y+1),f'{t}ms',fill=(255,255,255))
s.save(out,quality=85); print(len(items),s.size, fr[-1][0])
