from PIL import Image, ImageDraw
from pathlib import Path
out = Path(__file__).resolve().parent.parent / 'src' / 'assets'
out.mkdir(parents=True, exist_ok=True)
im = Image.new('RGBA', (1024,1024), '#080808')
d = ImageDraw.Draw(im)
d.rounded_rectangle((96,96,928,928), radius=220, fill='#153B28')
for x,h in [(320,160),(416,320),(512,460),(608,280),(704,120)]:
    d.rounded_rectangle((x-23,512-h//2,x+23,512+h//2), radius=23, fill='#1ED760')
im.save(out/'icon.png')
fg = Image.new('RGBA',(1024,1024),(0,0,0,0)); draw=ImageDraw.Draw(fg)
for x,h in [(320,160),(416,320),(512,460),(608,280),(704,120)]:
    draw.rounded_rectangle((x-23,512-h//2,x+23,512+h//2),radius=23,fill='#1ED760')
fg.save(out/'adaptive-icon.png')
