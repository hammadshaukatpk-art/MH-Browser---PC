"""Generate clean, crisp MH Browser branding for Windows and NSIS.

Source: desktop/ui/assets/mh-logo.webp. Rebuilds a transparent rounded-square
PNG and a multi-resolution ICO with no white fringe at the tile edges.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
UI = ROOT / "ui" / "assets"
BUILD = ROOT / "build"
BUILD.mkdir(exist_ok=True)

source = Image.open(UI / "mh-logo.webp").convert("RGBA")
if source.width != source.height:
    side = min(source.size)
    left = (source.width - side) // 2
    top = (source.height - side) // 2
    source = source.crop((left, top, left + side, top + side))

# Remove the baked-in pale antialiasing fringe from the source tile before
# resizing it. These pixels are near the OUTER tile border, not the white MH.
side = source.width
crop = max(3, round(side * .0235))
source = source.crop((crop, crop, side - crop, side - crop))
source = source.resize((768, 768), Image.Resampling.LANCZOS)
px = source.load()
for y in range(768):
    for x in range(768):
        if min(x, y, 767 - x, 767 - y) > 67:
            continue
        r, g, b, a = px[x, y]
        if a and min(r, g, b) > 115 and max(r, g, b) - min(r, g, b) < 90:
            px[x, y] = (22, 31, 59, a)

# A true alpha channel, not a white or opaque square around the logo.
mask = Image.new("L", (768, 768), 0)
draw = ImageDraw.Draw(mask)
draw.rounded_rectangle((4, 4, 763, 763), radius=168, fill=255)
source.putalpha(mask.filter(ImageFilter.GaussianBlur(1.1)))
source.save(UI / "mh-logo-clean.png", optimize=True)
source.resize((256, 256), Image.Resampling.LANCZOS).save(
    BUILD / "mh-browser.ico", format="ICO",
    sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
)

def paste_logo(canvas, size, xy):
    logo = source.resize((size, size), Image.Resampling.LANCZOS)
    canvas.paste(logo, xy, logo.getchannel("A"))

def centered_text(draw, text, y, width):
    bounds = draw.textbbox((0, 0), text)
    draw.text(((width - (bounds[2] - bounds[0])) / 2, y), text, fill="#FFFFFF")

sidebar = Image.new("RGB", (164, 314), "#071326")
paste_logo(sidebar, 140, (12, 43))
centered_text(ImageDraw.Draw(sidebar), "MH BROWSER", 203, 164)
sidebar.save(BUILD / "installer-sidebar.bmp")
header = Image.new("RGB", (150, 57), "#10223A")
paste_logo(header, 49, (4, 4))
ImageDraw.Draw(header).text((58, 22), "MH Browser", fill="#FFFFFF")
header.save(BUILD / "installer-header.bmp")

print("MH branding generated: 768px PNG, multi-resolution ICO, installer and uninstaller artwork")
