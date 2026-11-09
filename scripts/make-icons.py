import sys, math
# Maakt icons/icon{16,32,48,128}.png: tegel in Simulise Docent-groen met een witte portfoliokaart
# en een vinkje (beoordelen). Zelfde stijl als het icoon van Docent Tools voor Magister.
# Gebruik: python3 scripts/make-icons.py icons   (vereist Pillow)
from PIL import Image, ImageDraw, ImageFilter, ImageChops
out = sys.argv[1]
N = 1024
GREEN_TOP, GREEN_BOT = (38, 184, 155), (10, 110, 92)
ACCENT = (14, 138, 116, 255)

def squircle_mask(n, inset, k=5.0):
    m = Image.new("L", (n, n), 0); d = ImageDraw.Draw(m)
    c = n / 2; r = n / 2 - inset; pts = []
    for i in range(720):
        t = 2 * math.pi * i / 720; ct, st = math.cos(t), math.sin(t)
        pts.append((c + r * math.copysign(abs(ct) ** (2 / k), ct), c + r * math.copysign(abs(st) ** (2 / k), st)))
    d.polygon(pts, fill=255); return m

def vgrad(n, top, bot):
    g = Image.new("RGB", (1, n))
    for y in range(n):
        t = y / (n - 1); g.putpixel((0, y), tuple(round(top[i] + (bot[i] - top[i]) * t) for i in range(3)))
    return g.resize((n, n))

def render(size):
    detail = size >= 32
    inset = N * 0.06 if size >= 48 else N * 0.02
    mask = squircle_mask(N, inset)
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    img.paste(vgrad(N, GREEN_TOP, GREEN_BOT).convert("RGBA"), (0, 0), mask)
    if detail:
        # zachte glans bovenaan en lichtrand binnenin
        hl = Image.new("L", (N, N), 0); ImageDraw.Draw(hl).ellipse((-N * .25, -N * .75, N * 1.25, N * .42), fill=70)
        hl = ImageChops.multiply(hl.filter(ImageFilter.GaussianBlur(N * .04)), mask)
        w = Image.new("RGBA", (N, N), (255, 255, 255, 0)); w.putalpha(hl); img = Image.alpha_composite(img, w)
        edge = ImageChops.subtract(mask, squircle_mask(N, inset + N * .008))
        e = Image.new("RGBA", (N, N), (255, 255, 255, 0)); e.putalpha(edge.point(lambda v: v * .35)); img = Image.alpha_composite(img, e)

    # Kaart: groter en eenvoudiger op kleine formaten
    big = size >= 48
    box = (N * .25, N * .22, N * .75, N * .78) if big else (N * .18, N * .14, N * .82, N * .86)
    rad = N * (.07 if big else .09)
    if detail:
        sh = Image.new("L", (N, N), 0)
        ImageDraw.Draw(sh).rounded_rectangle((box[0], box[1] + N * .025, box[2], box[3] + N * .025), rad, fill=90)
        sh = ImageChops.multiply(sh.filter(ImageFilter.GaussianBlur(N * .025)), mask)
        s = Image.new("RGBA", (N, N), (0, 50, 40, 0)); s.putalpha(sh); img = Image.alpha_composite(img, s)
    card = Image.new("RGBA", (N, N), (0, 0, 0, 0)); cd = ImageDraw.Draw(card)
    cd.rounded_rectangle(box, rad, fill=(255, 255, 255, 255))
    x0, x1 = box[0] + N * .08, box[2] - N * .08
    if big:
        # twee regels tekst en een vinkje
        lw = N * .045
        for y, xe in ((box[1] + N * .12, x1), (box[1] + N * .22, x1 - N * .1)):
            cd.rounded_rectangle((x0, y - lw / 2, xe, y + lw / 2), lw / 2, fill=(14, 138, 116, 110))
        pts = [(N * .37, N * .60), (N * .46, N * .69), (N * .64, N * .50)]
        cw = N * .065
    else:
        pts = [(N * .32, N * .52), (N * .45, N * .65), (N * .69, N * .38)]
        cw = N * .11
    cd.line(pts, fill=ACCENT, width=int(cw), joint="curve")
    for x, y in (pts[0], pts[-1]): cd.ellipse((x - cw / 2, y - cw / 2, x + cw / 2, y + cw / 2), fill=ACCENT)
    img = Image.alpha_composite(img, card)
    return img.resize((size, size), Image.LANCZOS)

for s in (16, 32, 48, 128):
    render(s).save(f"{out}/icon{s}.png", optimize=True)
print("ok")
