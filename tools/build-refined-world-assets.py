#!/usr/bin/env python3
"""
tools/build-refined-world-assets.py
Generates polished, coherent world assets for BoyPunk-Web:
1. Altar for Distrito Neon (32x48, 7 frames: 000..006) - Urban Energy Interface
2. Altar for Fábrica de Sucata (32x48, 7 frames: 000..006) - Industrial Mechanical Casing
3. Refined Cyber Soul (15x16, 4 frames: 000..003) - Cyan/Violet High-Energy Plasma
"""

import os
import math
from PIL import Image

WORLD_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "images", "world")
os.makedirs(WORLD_DIR, exist_ok=True)

# Helper for drawing on PIL image
def hex_to_rgba(hex_str, alpha=255):
    hex_str = hex_str.lstrip("#")
    r = int(hex_str[0:2], 16)
    g = int(hex_str[2:4], 16)
    b = int(hex_str[4:6], 16)
    return (r, g, b, alpha)

def create_neon_altar_frame(frame_index):
    """
    Creates a 32x48 RGBA image of the Distrito Neon Altar.
    Urban energy interface: sleek dark graphite, cyan conductive busbars,
    violet decorative wings/antennae, transparent glass chamber with charging plasma core.
    """
    img = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
    pixels = img.load()

    ratio = frame_index / 6.0
    core_radius = 3.0 + ratio * 6.5  # from radius ~3 (diam 6) to radius ~9.5 (diam 19)

    # 1. Base Pedestal (y = 38..47)
    # Bottom footing (y = 44..47, x = 2..29)
    for y in range(44, 48):
        for x in range(2, 30):
            pixels[x, y] = hex_to_rgba("#12141c")
    # Base bevel & contour
    for x in range(3, 29):
        pixels[x, 44] = hex_to_rgba("#384259")
        pixels[x, 47] = hex_to_rgba("#090a10")
    # Base pedestal riser (y = 38..43, x = 4..27)
    for y in range(38, 44):
        for x in range(4, 28):
            pixels[x, y] = hex_to_rgba("#1b202c")
    # Pedestal front armor panel (x = 7..24, y = 39..43)
    for y in range(39, 44):
        for x in range(7, 25):
            pixels[x, y] = hex_to_rgba("#252c3c")
    # Highlights & dark contours on pedestal
    for x in range(7, 25):
        pixels[x, 39] = hex_to_rgba("#505d7a")
    for y in range(38, 44):
        pixels[4, y] = hex_to_rgba("#090a10")
        pixels[27, y] = hex_to_rgba("#090a10")

    # Neon energy conduit on base (horizontal ciano runner: y = 41, x = 9..22)
    for x in range(9, 23):
        pixels[x, 41] = hex_to_rgba("#1d7580")
    for x in range(11, 21):
        pixels[x, 41] = hex_to_rgba("#37e6ee")
    for x in range(14, 18):
        pixels[x, 41] = hex_to_rgba("#ffffff")

    # 4 Status LEDs on base (x=10, 13, 18, 21, y=43)
    for i, led_x in enumerate([10, 13, 18, 21]):
        pixels[led_x, 43] = hex_to_rgba("#37e6ee")
        pixels[led_x + 1, 43] = hex_to_rgba("#1b202c")

    # 2. Side Support Columns / Pylons (y = 12..38, x = 4..7 and x = 24..27)
    for y in range(12, 38):
        # Left column
        pixels[4, y] = hex_to_rgba("#090a10")
        pixels[5, y] = hex_to_rgba("#505d7a")
        pixels[6, y] = hex_to_rgba("#252c3c")
        pixels[7, y] = hex_to_rgba("#12141c")
        # Right column
        pixels[24, y] = hex_to_rgba("#12141c")
        pixels[25, y] = hex_to_rgba("#384259")
        pixels[26, y] = hex_to_rgba("#505d7a")
        pixels[27, y] = hex_to_rgba("#090a10")

    # Neon conduit strips embedded inside columns (x = 5 and x = 26, y = 16..34)
    for y in range(16, 35):
        if y % 3 != 0:
            pixels[5, y] = hex_to_rgba("#ae62ff")
            pixels[26, y] = hex_to_rgba("#ae62ff")

    # Pylon collar clamps (y = 13..14 and y = 35..36)
    for y in [13, 14, 35, 36]:
        for x in [3, 4, 5, 6, 7]:
            pixels[x, y] = hex_to_rgba("#384259")
        for x in [24, 25, 26, 27, 28]:
            pixels[x, y] = hex_to_rgba("#384259")
        pixels[3, y] = hex_to_rgba("#090a10")
        pixels[28, y] = hex_to_rgba("#090a10")

    # 3. Top Canopy / Crown Cap (y = 0..12)
    # Lower canopy plate (y = 10..12, x = 4..27)
    for y in range(10, 13):
        for x in range(4, 28):
            pixels[x, y] = hex_to_rgba("#1b202c")
    for x in range(4, 28):
        pixels[x, 10] = hex_to_rgba("#505d7a")
        pixels[x, 12] = hex_to_rgba("#090a10")

    # Upper angled casing (y = 3..9, x = 6..25)
    for y in range(3, 10):
        inset = max(0, 5 - y)
        for x in range(6 + inset, 26 - inset):
            pixels[x, y] = hex_to_rgba("#252c3c")
    for x in range(8, 24):
        pixels[x, 3] = hex_to_rgba("#7282a6")

    # Angular violet neon crest / antennae (y = 0..3)
    # Center emitter node (x = 15..16, y = 0..2)
    pixels[15, 0] = hex_to_rgba("#ae62ff")
    pixels[16, 0] = hex_to_rgba("#ae62ff")
    pixels[15, 1] = hex_to_rgba("#d4a6ff")
    pixels[16, 1] = hex_to_rgba("#ffffff")
    pixels[15, 2] = hex_to_rgba("#8e3de6")
    pixels[16, 2] = hex_to_rgba("#8e3de6")

    # Left & right crown fins (x = 11..12 and x = 19..20, y = 1..3)
    pixels[11, 1] = hex_to_rgba("#ae62ff")
    pixels[12, 1] = hex_to_rgba("#ae62ff")
    pixels[11, 2] = hex_to_rgba("#5f269e")
    pixels[12, 2] = hex_to_rgba("#d4a6ff")
    pixels[19, 1] = hex_to_rgba("#ae62ff")
    pixels[20, 1] = hex_to_rgba("#ae62ff")
    pixels[19, 2] = hex_to_rgba("#d4a6ff")
    pixels[20, 2] = hex_to_rgba("#5f269e")

    # 4. Central Glass Chamber Backdrop & Containment Field (x = 8..23, y = 13..37)
    for y in range(13, 38):
        for x in range(8, 24):
            # Translucent dark cyberpunk containment tint
            pixels[x, y] = (16, 14, 28, 210)

    # Glass specular vertical reflection line (x = 9 and x = 10, y = 15..35)
    for y in range(15, 36):
        if y % 4 != 0:
            pixels[9, y] = (140, 245, 250, 48)

    # 5. Glowing Plasma Energy Core (Center at x = 15.5, y = 25.5)
    cx, cy = 15.5, 25.5
    for y in range(13, 38):
        for x in range(8, 24):
            dist = math.hypot(x - cx, y - cy)
            if dist <= core_radius:
                norm = dist / max(0.1, core_radius)
                if norm < 0.25:
                    # White-hot inner core
                    r_c, g_c, b_c = 255, 255, 255
                    a_c = 255
                elif norm < 0.55:
                    # Radiant cyan
                    r_c, g_c, b_c = 55, 230, 238
                    a_c = 240
                elif norm < 0.85:
                    # Electric cyan / violet blend
                    r_c, g_c, b_c = int(55 + (174 - 55) * ((norm - 0.55) / 0.3)), int(230 - 132 * ((norm - 0.55) / 0.3)), 255
                    a_c = 220
                else:
                    # Outer violet halo perimeter
                    r_c, g_c, b_c = 174, 98, 255
                    a_c = int(200 * (1 - (norm - 0.85) / 0.15))
                # Blend with existing
                pixels[x, y] = (r_c, g_c, b_c, max(pixels[x, y][3], a_c))

    # Top & bottom containment electrodes inside chamber (y = 13..15 and y = 35..37)
    for x in range(13, 19):
        pixels[x, 13] = hex_to_rgba("#12141c")
        pixels[x, 14] = hex_to_rgba("#384259")
        pixels[x, 36] = hex_to_rgba("#384259")
        pixels[x, 37] = hex_to_rgba("#12141c")
    pixels[15, 15] = hex_to_rgba("#37e6ee")
    pixels[16, 15] = hex_to_rgba("#37e6ee")
    pixels[15, 35] = hex_to_rgba("#37e6ee")
    pixels[16, 35] = hex_to_rgba("#37e6ee")

    return img


def create_factory_altar_frame(frame_index):
    """
    Creates a 32x48 RGBA image of the Fábrica de Sucata Altar.
    Industrial mechanical casing: heavy riveted graphite/steel plates,
    brass/bronze fittings, hazard chevron trim, analog/thermal arc vacuum tube.
    """
    img = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
    pixels = img.load()

    ratio = frame_index / 6.0
    core_radius = 2.5 + ratio * 6.5

    # 1. Base Pedestal (y = 38..47)
    # Heavy cast-iron floor flange (y = 44..47, x = 2..29)
    for y in range(44, 48):
        for x in range(2, 30):
            pixels[x, y] = hex_to_rgba("#181920")
    for x in range(3, 29):
        pixels[x, 44] = hex_to_rgba("#444b5c")
        pixels[x, 47] = hex_to_rgba("#0a0a0e")
    # Foundation anchor bolts
    for bx in [5, 10, 21, 26]:
        pixels[bx, 45] = hex_to_rgba("#8892a6")
        pixels[bx + 1, 45] = hex_to_rgba("#252833")

    # Pedestal armor body (y = 38..43, x = 4..27)
    for y in range(38, 44):
        for x in range(4, 28):
            pixels[x, y] = hex_to_rgba("#272b36")
    for x in range(4, 28):
        pixels[x, 38] = hex_to_rgba("#5a6378")
    for y in range(38, 44):
        pixels[4, y] = hex_to_rgba("#0a0a0e")
        pixels[27, y] = hex_to_rgba("#0a0a0e")

    # Industrial Hazard Striping on Pedestal (x = 8..23, y = 40..42)
    for y in range(40, 43):
        for x in range(8, 24):
            if (x + y) % 5 < 3:
                pixels[x, y] = hex_to_rgba("#ff9b38")
            else:
                pixels[x, y] = hex_to_rgba("#1a1d24")

    # 2. Side Structural Girders & Rivets (y = 12..38, x = 3..7 and x = 24..28)
    for y in range(12, 38):
        # Left girder
        pixels[3, y] = hex_to_rgba("#0a0a0e")
        pixels[4, y] = hex_to_rgba("#5a6378")
        pixels[5, y] = hex_to_rgba("#383e4d")
        pixels[6, y] = hex_to_rgba("#272b36")
        pixels[7, y] = hex_to_rgba("#181920")
        # Right girder
        pixels[24, y] = hex_to_rgba("#181920")
        pixels[25, y] = hex_to_rgba("#272b36")
        pixels[26, y] = hex_to_rgba("#383e4d")
        pixels[27, y] = hex_to_rgba("#5a6378")
        pixels[28, y] = hex_to_rgba("#0a0a0e")

    # Rivets on girders
    for ry in [14, 19, 24, 29, 34]:
        pixels[5, ry] = hex_to_rgba("#a4b0c7")
        pixels[26, ry] = hex_to_rgba("#a4b0c7")

    # Bronze pipe fittings on sides (x = 2 and x = 29, y = 20..30)
    for y in range(20, 31):
        pixels[2, y] = hex_to_rgba("#a47832")
        pixels[29, y] = hex_to_rgba("#a47832")

    # 3. Heavy Industrial Top Cap / Cowl (y = 0..12)
    # Lower cowl flange (y = 10..12, x = 4..27)
    for y in range(10, 13):
        for x in range(4, 28):
            pixels[x, y] = hex_to_rgba("#272b36")
    for x in range(4, 28):
        pixels[x, 10] = hex_to_rgba("#5a6378")
        pixels[x, 12] = hex_to_rgba("#0a0a0e")

    # Upper exhaust cowl (y = 3..9, x = 5..26)
    for y in range(3, 10):
        for x in range(6, 26):
            pixels[x, y] = hex_to_rgba("#383e4d")
    for x in range(6, 26):
        pixels[x, 3] = hex_to_rgba("#727d96")

    # Twin steam/heat exhaust vents (x = 10..12 and x = 19..21, y = 0..3)
    for y in range(0, 4):
        for x in [10, 11, 12, 19, 20, 21]:
            pixels[x, y] = hex_to_rgba("#181920")
        pixels[10, y] = hex_to_rgba("#0a0a0e")
        pixels[12, y] = hex_to_rgba("#5a6378")
        pixels[19, y] = hex_to_rgba("#0a0a0e")
        pixels[21, y] = hex_to_rgba("#5a6378")
    pixels[11, 0] = hex_to_rgba("#a47832")
    pixels[20, 0] = hex_to_rgba("#a47832")

    # Analog Dial / Pressure Gauge in center of top cowl (x = 14..17, y = 5..8)
    for y in range(5, 9):
        for x in range(14, 18):
            pixels[x, y] = hex_to_rgba("#fae28e")
    pixels[14, 5] = hex_to_rgba("#383e4d")
    pixels[17, 5] = hex_to_rgba("#383e4d")
    pixels[14, 8] = hex_to_rgba("#383e4d")
    pixels[17, 8] = hex_to_rgba("#383e4d")
    # Needle
    needle_x = 15 if ratio < 0.5 else 16
    pixels[needle_x, 6] = hex_to_rgba("#ff3624")

    # 4. Central Thermal Vacuum Chamber (x = 8..23, y = 13..37)
    for y in range(13, 38):
        for x in range(8, 24):
            pixels[x, y] = (20, 16, 18, 220)

    # 5. Glowing Thermal Fire / Arc Energy Core (Center at x = 15.5, y = 25.5)
    cx, cy = 15.5, 25.5
    for y in range(13, 38):
        for x in range(8, 24):
            dist = math.hypot(x - cx, y - cy)
            if dist <= core_radius:
                norm = dist / max(0.1, core_radius)
                if norm < 0.25:
                    # White/yellow hot center
                    r_c, g_c, b_c = 255, 255, 220
                    a_c = 255
                elif norm < 0.55:
                    # Electric yellow-amber
                    r_c, g_c, b_c = 255, 210, 80
                    a_c = 240
                elif norm < 0.85:
                    # Fire amber / industrial orange
                    r_c, g_c, b_c = 255, 155, 56
                    a_c = 220
                else:
                    # Dark red-orange thermal perimeter
                    r_c, g_c, b_c = 200, 60, 20
                    a_c = int(190 * (1 - (norm - 0.85) / 0.15))
                pixels[x, y] = (r_c, g_c, b_c, max(pixels[x, y][3], a_c))

    # Heavy tungsten electrodes top & bottom (x = 13..18, y = 13..15 and y = 35..37)
    for x in range(13, 19):
        pixels[x, 13] = hex_to_rgba("#181920")
        pixels[x, 14] = hex_to_rgba("#5a6378")
        pixels[x, 36] = hex_to_rgba("#5a6378")
        pixels[x, 37] = hex_to_rgba("#181920")
    pixels[15, 15] = hex_to_rgba("#ff9b38")
    pixels[16, 15] = hex_to_rgba("#ff9b38")
    pixels[15, 35] = hex_to_rgba("#ff9b38")
    pixels[16, 35] = hex_to_rgba("#ff9b38")

    return img


def create_cyber_soul_frame(frame_index):
    """
    Creates a 15x16 RGBA image of the Refined Cyber Soul.
    High-energy plasma drop in electric cyan (#37e6ee) and violet (#ae62ff)
    with pure white center (#ffffff) and crisp 1px dark perimeter.
    Each of the 4 frames has distinct energy swirl and flare characteristics.
    """
    img = Image.new("RGBA", (15, 16), (0, 0, 0, 0))
    pixels = img.load()

    # Distinct center and shape modulation per frame
    offsets = [(0.0, 0.0), (-0.4, -0.6), (0.0, -0.2), (0.4, 0.4)]
    ox, oy = offsets[frame_index % 4]
    cx = 7.0 + ox
    cy = 8.5 + oy

    for y in range(16):
        for x in range(15):
            dx = x - cx
            dy = (y - cy) * 0.85  # tear elongation
            dist = math.hypot(dx, dy)

            # Upward tail pinch modulated by frame
            if y < cy:
                factor = 1.0 + (cy - y) * (0.22 + 0.04 * frame_index)
                dist *= factor

            if dist <= 5.8:
                if dist > 4.6:
                    # 1px Dark Outline
                    pixels[x, y] = hex_to_rgba("#07050e", 230)
                elif dist > 3.4:
                    # Violet Resonance Corona
                    pixels[x, y] = hex_to_rgba("#ae62ff", 220)
                elif dist > 2.0:
                    # Electric Cyan Field
                    pixels[x, y] = hex_to_rgba("#37e6ee", 240)
                elif dist > 1.0:
                    # Bright Cyan Glow
                    pixels[x, y] = hex_to_rgba("#8cf5fa", 255)
                else:
                    # Brilliant White Center
                    pixels[x, y] = hex_to_rgba("#ffffff", 255)

    # Frame-specific dynamic energy motes
    if frame_index == 0:
        pixels[7, 2] = hex_to_rgba("#8cf5fa", 200)
    elif frame_index == 1:
        pixels[4, 5] = hex_to_rgba("#ae62ff", 220)
        pixels[10, 6] = hex_to_rgba("#37e6ee", 220)
    elif frame_index == 2:
        pixels[7, 1] = hex_to_rgba("#ffffff", 240)
        pixels[3, 9] = hex_to_rgba("#37e6ee", 200)
    elif frame_index == 3:
        pixels[11, 8] = hex_to_rgba("#ae62ff", 220)
        pixels[5, 12] = hex_to_rgba("#37e6ee", 200)

    return img


def main():
    print("=== Gerando Assets Visuais Refinados do Mundo ===")

    # 1. Altar Distrito Neon (000..006)
    for i in range(7):
        frame = create_neon_altar_frame(i)
        filename = f"altar-distrito-neon-{str(i).padStart(3, '0') if hasattr(str, 'padStart') else str(i).zfill(3)}.png"
        filepath = os.path.join(WORLD_DIR, filename)
        frame.save(filepath)
        print(f"Salvo: {filename} (32x48)")

    # 2. Altar Fábrica de Sucata (000..006)
    for i in range(7):
        frame = create_factory_altar_frame(i)
        filename = f"altar-fabrica-sucata-{str(i).zfill(3)}.png"
        filepath = os.path.join(WORLD_DIR, filename)
        frame.save(filepath)
        print(f"Salvo: {filename} (32x48)")

    # 3. Refined Cyber Souls (000..003)
    for i in range(4):
        frame = create_cyber_soul_frame(i)
        filename = f"soul-cyber-{str(i).zfill(3)}.png"
        filepath = os.path.join(WORLD_DIR, filename)
        frame.save(filepath)
        print(f"Salvo: {filename} (15x16)")

    print("Todos os novos assets foram gerados com sucesso!")

if __name__ == "__main__":
    main()
