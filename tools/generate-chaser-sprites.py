#!/usr/bin/env python3
"""
Artisan Pixel-Art Generator & Rig for Chaser Combat Droid (16x32 RGBA)
BoyPunk-Web
"""
from PIL import Image
import os

# Palette
CLR_TRANS = (0, 0, 0, 0)
CLR_OUTLINE = (0, 0, 0, 255)
CLR_RECESS = (10, 11, 16, 255)
CLR_DARK = (24, 28, 40, 255)
CLR_BASE = (44, 50, 68, 255)
CLR_LIGHT = (76, 86, 110, 255)
CLR_HI = (120, 132, 160, 255)

# Amber energy / optics
CLR_AMBER_DARK = (186, 75, 18, 255)
CLR_AMBER_BRIGHT = (255, 122, 40, 255)
CLR_AMBER_WARM = (255, 205, 80, 255)
CLR_AMBER_HOT = (255, 240, 200, 255)

# Cyan plasma core
CLR_CYAN_DARK = (20, 108, 125, 255)
CLR_CYAN_BRIGHT = (55, 230, 238, 255)
CLR_CYAN_HOT = (200, 250, 255, 255)

# Far limb shading (depth)
CLR_FAR_DARK = (14, 16, 24, 255)
CLR_FAR_BASE = (28, 32, 46, 255)
CLR_FAR_LIGHT = (48, 56, 76, 255)

def create_frame():
    return Image.new("RGBA", (16, 32), CLR_TRANS)

def set_px(img, x, y, clr):
    if 0 <= x < 16 and 0 <= y < 32 and clr[3] > 0:
        img.putpixel((x, y), clr)

def print_frame_ascii(img, name=""):
    print(f"=== {name} ===")
    for y in range(32):
        line = ""
        for x in range(16):
            r, g, b, a = img.getpixel((x, y))
            if a == 0: line += " "
            elif (r, g, b) == (0, 0, 0): line += "#"
            elif (r, g, b) in [CLR_AMBER_BRIGHT[:3], CLR_AMBER_WARM[:3], CLR_AMBER_HOT[:3]]: line += "A"
            elif (r, g, b) in [CLR_CYAN_BRIGHT[:3], CLR_CYAN_HOT[:3]]: line += "C"
            elif (r, g, b) == CLR_HI[:3]: line += "H"
            elif (r, g, b) == CLR_LIGHT[:3]: line += "+"
            elif (r, g, b) == CLR_BASE[:3]: line += "o"
            else: line += "."
        print(f"{y:02d}: {line}")

print("Rig generator module loaded.")
