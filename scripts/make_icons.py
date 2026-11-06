# يعدّل صلاحيات الأندرويد، ويولّد أيقونة التطبيق واللوجو وأيقونة الإشعارات من icon.png
import os, sys, math, re
from PIL import Image, ImageFilter, ImageDraw

RES = 'android/app/src/main/res'
MANIFEST = 'android/app/src/main/AndroidManifest.xml'

# ---- صلاحيات الإشعارات والتنبيهات ----
try:
    x = open(MANIFEST, encoding='utf8').read()
    for p in ('POST_NOTIFICATIONS', 'RECEIVE_BOOT_COMPLETED', 'WAKE_LOCK', 'VIBRATE', 'SCHEDULE_EXACT_ALARM'):
        tag = f'<uses-permission android:name="android.permission.{p}"'
        if tag not in x:
            x = x.replace('</manifest>', f'    {tag} />\n</manifest>')
    open(MANIFEST, 'w', encoding='utf8').write(x)
    print('تم تحديث الصلاحيات')
except Exception as e:
    print('تعذر تعديل المانيفست:', e)

# ---- أيقونة الإشعار (نجمة بيضاء) ----
def star(size):
    S = size * 8; im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    c = S / 2; R = S * 0.46; r = S * 0.30
    pts = []
    for i in range(16):
        ang = math.pi / 8 * i - math.pi / 2; rad = R if i % 2 == 0 else r
        pts.append((c + rad * math.cos(ang), c + rad * math.sin(ang)))
    d.polygon(pts, fill=(255, 255, 255, 255))
    d.ellipse((c - S * .12, c - S * .12, c + S * .12, c + S * .12), fill=(0, 0, 0, 0))
    return im.resize((size, size), Image.LANCZOS)
for d, sz in {'mdpi': 24, 'hdpi': 36, 'xhdpi': 48, 'xxhdpi': 72, 'xxxhdpi': 96}.items():
    f = f'{RES}/drawable-{d}'; os.makedirs(f, exist_ok=True); star(sz).save(f'{f}/ic_stat_noor.png')

# ---- أيقونة التطبيق ----
SRC = 'icon.png'
if not os.path.exists(SRC):
    print('icon.png غير موجود - سيتم استخدام الأيقونة الافتراضية'); sys.exit(0)
im = Image.open(SRC).convert('RGB')
w, h = im.size; s = min(w, h)
im = im.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s))
os.makedirs('www/assets', exist_ok=True)
# شعار الإشعار الكبير (يظهر بجانب نص الإشعار حتى لو التطبيق مغلق)
os.makedirs(f'{RES}/drawable-nodpi', exist_ok=True)
im.resize((192, 192), Image.LANCZOS).save(f'{RES}/drawable-nodpi/noor_logo.png')
im.resize((320, 320), Image.LANCZOS).save('www/assets/logo.png', optimize=True)

dens = {'mdpi': (48, 108), 'hdpi': (72, 162), 'xhdpi': (96, 216), 'xxhdpi': (144, 324), 'xxxhdpi': (192, 432)}
for d, (leg, ad) in dens.items():
    folder = f'{RES}/mipmap-{d}'; os.makedirs(folder, exist_ok=True)
    im.resize((leg, leg), Image.LANCZOS).save(f'{folder}/ic_launcher.png')
    big = im.resize((leg * 4, leg * 4), Image.LANCZOS)
    m = Image.new('L', big.size, 0); ImageDraw.Draw(m).ellipse((0, 0, big.size[0] - 1, big.size[1] - 1), fill=255)
    rd = Image.new('RGBA', big.size, (0, 0, 0, 0)); rd.paste(big, (0, 0), m)
    rd.resize((leg, leg), Image.LANCZOS).save(f'{folder}/ic_launcher_round.png')
    im.resize((ad, ad), Image.LANCZOS).filter(ImageFilter.GaussianBlur(ad * 0.05)).save(f'{folder}/noor_bg.png')
    n = int(ad * 0.64); fg = im.resize((n, n), Image.LANCZOS).convert('RGBA')
    f = max(2, int(n * 0.10)); mk = Image.new('L', (n, n), 0)
    ImageDraw.Draw(mk).rectangle((f, f, n - f, n - f), fill=255)
    fg.putalpha(mk.filter(ImageFilter.GaussianBlur(f / 2.2)))
    cv = Image.new('RGBA', (ad, ad), (0, 0, 0, 0)); cv.paste(fg, ((ad - n) // 2, (ad - n) // 2), fg)
    cv.save(f'{folder}/noor_fg.png')

xml = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/noor_bg"/>
    <foreground android:drawable="@mipmap/noor_fg"/>
</adaptive-icon>
'''
os.makedirs(f'{RES}/mipmap-anydpi-v26', exist_ok=True)
for name in ('ic_launcher.xml', 'ic_launcher_round.xml'):
    open(f'{RES}/mipmap-anydpi-v26/{name}', 'w').write(xml)
print('تم توليد الأيقونات')
