#!/usr/bin/env python3
"""
Artisan Pixel-Art Generator: Cyberpunk Double Burst Energy Cartridge (16x16 RGBA)
BoyPunk-Web — Phase 2B

Specifications:
- Dimensions: 16x16 RGBA canvas, transparent background.
- Physical Collider: 16x16 (pickup.x, pickup.y, w: 16, h: 16).
- Ground Support Baseline: y = 15 (bottom row rests flush on supporting platform at y = 16).
- Aesthetics: Graphite chassis (#12151f, #222738, #3b435c, #6c7899), crisp 1px borders,
  restrained cyan conduits (#155a68, #2ec8d4, #c8faff), twin amber plasma cores (#ba4b12, #ff7a28, #ffcd50, #fff5d7).
- 4 idle frames with subtle energy cycling and heat dissipation.
"""
import hashlib
import os
from PIL import Image

OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "assets", "images", "world"))

# Palette definitions
C_TRANS = (0, 0, 0, 0)
C_BLACK = (10, 12, 18, 255)         # Deepest outline / recess seam
C_GRAPH_DARK = (24, 28, 40, 255)    # Dark graphite shell plate
C_GRAPH_MID = (44, 52, 72, 255)     # Medium graphite body
C_GRAPH_LIGHT = (76, 88, 118, 255)  # Bevel edge highlight
C_GRAPH_RIM = (124, 138, 172, 255)  # Specular chamfer / rivet

# Glass chamber background
C_GLASS_DEEP = (12, 15, 24, 255)
C_GLASS_MID = (18, 22, 34, 255)

# Amber plasma projectile palette
C_AMB_DEEP = (168, 62, 14, 255)
C_AMB_BASE = (255, 122, 40, 255)
C_AMB_BRIGHT = (255, 195, 65, 255)
C_AMB_HOT = (255, 245, 205, 255)
C_WHITE = (255, 255, 255, 255)

# Cyan energy conduit palette
C_CYN_DARK = (18, 85, 98, 255)
C_CYN_BASE = (46, 200, 212, 255)
C_CYN_HOT = (195, 248, 255, 255)

def create_cartridge_frame(cycle_index):
    img = Image.new("RGBA", (16, 16), C_TRANS)
    
    def px(x, y, c):
        if 0 <= x < 16 and 0 <= y < 16:
            img.putpixel((x, y), c)

    def hline(x1, x2, y, c):
        for x in range(x1, x2 + 1):
            px(x, y, c)

    # 1. Top Connector Pins / Terminals (y = 0..1)
    # Prongs at x=4..5 and x=10..11
    if cycle_index == 1:
        prong_tip_l = C_CYN_HOT
        prong_tip_r = C_CYN_BASE
    elif cycle_index == 2:
        prong_tip_l = C_CYN_HOT
        prong_tip_r = C_CYN_HOT
    elif cycle_index == 3:
        prong_tip_l = C_CYN_BASE
        prong_tip_r = C_CYN_HOT
    else:
        prong_tip_l = C_CYN_BASE
        prong_tip_r = C_CYN_BASE

    px(4, 0, prong_tip_l)
    px(5, 0, C_GRAPH_RIM)
    px(10, 0, C_GRAPH_RIM)
    px(11, 0, prong_tip_r)

    px(4, 1, C_GRAPH_LIGHT)
    px(5, 1, C_GRAPH_LIGHT)
    px(10, 1, C_GRAPH_LIGHT)
    px(11, 1, C_GRAPH_LIGHT)

    # 2. Top Collar / Header Cap (y = 1..2)
    # y = 1 shoulders
    px(3, 1, C_BLACK)
    px(6, 1, C_BLACK)
    px(7, 1, C_GRAPH_DARK)
    px(8, 1, C_GRAPH_DARK)
    px(9, 1, C_BLACK)
    px(12, 1, C_BLACK)

    # y = 2 top chamfer plate (x = 2..13)
    px(2, 2, C_BLACK)
    px(3, 2, C_GRAPH_RIM)
    hline(4, 11, 2, C_GRAPH_LIGHT)
    px(12, 2, C_GRAPH_MID)
    px(13, 2, C_BLACK)

    # 3. Outer Chassis Casing & Grip Sides (y = 3..14)
    for y in range(3, 14):
        # Outer boundary outline
        px(1, y, C_BLACK)
        px(14, y, C_BLACK)
        # Left casing column
        px(2, y, C_GRAPH_LIGHT if y in (3, 4, 11, 12) else C_GRAPH_MID)
        px(3, y, C_GRAPH_DARK)
        # Right casing column
        px(12, y, C_GRAPH_DARK)
        px(13, y, C_GRAPH_MID if y in (3, 4, 11, 12) else C_GRAPH_DARK)

    # Lateral heat-vent slits (y = 5, 7, 9)
    vent_glow_l = C_CYN_BASE if cycle_index == 2 else (C_CYN_DARK if cycle_index in (1, 3) else C_BLACK)
    vent_glow_r = C_CYN_BASE if cycle_index == 2 else (C_CYN_DARK if cycle_index in (1, 3) else C_BLACK)
    for vy in (5, 7, 9):
        px(2, vy, vent_glow_l)
        px(13, vy, vent_glow_r)

    # 4. Central Chamber Bezel & Glass Window (y = 3..10, x = 4..11)
    # y = 3 chamber top rim
    hline(4, 11, 3, C_BLACK)
    px(4, 3, C_GRAPH_MID)
    px(11, 3, C_GRAPH_MID)

    # Glass background (y = 4..10, x = 4..11)
    for y in range(4, 11):
        for x in range(4, 12):
            px(x, y, C_GLASS_DEEP if y in (4, 10) or x in (4, 11) else C_GLASS_MID)

    # Central divider / isolation waveguide (x = 7..8, y = 4..10)
    for y in range(4, 11):
        px(7, y, C_BLACK)
        divider_color = C_CYN_BASE if (cycle_index == 1 and y in (6, 7)) or (cycle_index == 2 and y in (5, 6, 7)) else (
            C_CYN_DARK if y in (7, 8) else C_BLACK
        )
        px(8, y, divider_color)

    # 5. DUAL PLASMA PROJECTILE CORES (The Double-Burst Symbol)
    # Left projectile: x = 5..6, y = 5..9
    # Right projectile: x = 9..10, y = 5..9
    if cycle_index == 0:
        # Standard stable dual glow
        # Tips (y = 5)
        px(5, 5, C_AMB_BRIGHT)
        px(6, 5, C_AMB_BASE)
        px(9, 5, C_AMB_BRIGHT)
        px(10, 5, C_AMB_BASE)
        # Body (y = 6..8)
        for y in range(6, 9):
            px(5, y, C_AMB_HOT if y == 7 else C_AMB_BRIGHT)
            px(6, y, C_AMB_BASE)
            px(9, y, C_AMB_HOT if y == 7 else C_AMB_BRIGHT)
            px(10, y, C_AMB_BASE)
        # Base nodes (y = 9)
        px(5, 9, C_AMB_BASE)
        px(6, 9, C_AMB_DEEP)
        px(9, 9, C_AMB_BASE)
        px(10, 9, C_AMB_DEEP)

    elif cycle_index == 1:
        # Charging pulse: intensifies from bottom upward
        # Tips (y = 5)
        px(5, 5, C_AMB_HOT)
        px(6, 5, C_AMB_BRIGHT)
        px(9, 5, C_AMB_HOT)
        px(10, 5, C_AMB_BRIGHT)
        # Body (y = 6..8)
        for y in range(6, 9):
            px(5, y, C_WHITE if y == 7 else C_AMB_HOT)
            px(6, y, C_AMB_BRIGHT)
            px(9, y, C_WHITE if y == 7 else C_AMB_HOT)
            px(10, y, C_AMB_BRIGHT)
        # Base nodes (y = 9)
        px(5, 9, C_AMB_BRIGHT)
        px(6, 9, C_AMB_BASE)
        px(9, 9, C_AMB_BRIGHT)
        px(10, 9, C_AMB_BASE)

    elif cycle_index == 2:
        # Peak readiness: twin coronal tips at y=4
        px(5, 4, C_AMB_HOT)
        px(10, 4, C_AMB_HOT)
        # Tips (y = 5)
        px(5, 5, C_WHITE)
        px(6, 5, C_AMB_HOT)
        px(9, 5, C_WHITE)
        px(10, 5, C_AMB_HOT)
        # Body (y = 6..8)
        for y in range(6, 9):
            px(5, y, C_WHITE if y in (6, 7) else C_AMB_HOT)
            px(6, y, C_AMB_HOT)
            px(9, y, C_WHITE if y in (6, 7) else C_AMB_HOT)
            px(10, y, C_AMB_HOT)
        # Base nodes (y = 9)
        px(5, 9, C_AMB_BRIGHT)
        px(6, 9, C_AMB_BASE)
        px(9, 9, C_AMB_BRIGHT)
        px(10, 9, C_AMB_BASE)

    else: # cycle_index == 3
        # Cooling / thermal settling
        # Tips (y = 5)
        px(5, 5, C_AMB_BRIGHT)
        px(6, 5, C_AMB_DEEP)
        px(9, 5, C_AMB_BRIGHT)
        px(10, 5, C_AMB_DEEP)
        # Body (y = 6..8)
        for y in range(6, 9):
            px(5, y, C_AMB_BASE if y == 7 else C_AMB_DEEP)
            px(6, y, C_AMB_DEEP)
            px(9, y, C_AMB_BASE if y == 7 else C_AMB_DEEP)
            px(10, y, C_AMB_DEEP)
        # Base nodes (y = 9)
        px(5, 9, C_AMB_DEEP)
        px(6, 9, C_BLACK)
        px(9, 9, C_AMB_DEEP)
        px(10, 9, C_BLACK)

    # 6. Lower Chamber Bus Bar (y = 11)
    hline(4, 11, 11, C_BLACK)
    px(4, 11, C_GRAPH_LIGHT)
    px(5, 11, C_CYN_BASE if cycle_index in (1, 2) else C_CYN_DARK)
    px(6, 11, C_CYN_HOT if cycle_index == 2 else C_CYN_BASE)
    px(7, 11, C_GRAPH_DARK)
    px(8, 11, C_GRAPH_DARK)
    px(9, 11, C_CYN_HOT if cycle_index == 2 else C_CYN_BASE)
    px(10, 11, C_CYN_BASE if cycle_index in (1, 2) else C_CYN_DARK)
    px(11, 11, C_GRAPH_LIGHT)

    # 7. Lower Chassis Faceplate & Dual Identifier Notch (y = 12..13)
    # y = 12
    px(2, 12, C_GRAPH_LIGHT)
    px(3, 12, C_GRAPH_MID)
    hline(4, 11, 12, C_GRAPH_DARK)
    px(12, 12, C_GRAPH_MID)
    px(13, 12, C_GRAPH_MID)

    # Twin chevron micro-grooves at x=6, x=9
    notch_color = C_AMB_BASE if cycle_index == 2 else (C_AMB_DEEP if cycle_index in (0, 1) else C_BLACK)
    px(6, 12, notch_color)
    px(9, 12, notch_color)

    # y = 13
    px(2, 13, C_GRAPH_MID)
    px(3, 13, C_GRAPH_MID)
    hline(4, 11, 13, C_GRAPH_DARK)
    # Micro-accent cyan circuit line at y = 13 (x = 5, 10)
    px(5, 13, C_CYN_DARK if cycle_index != 2 else C_CYN_BASE)
    px(10, 13, C_CYN_DARK if cycle_index != 2 else C_CYN_BASE)
    px(12, 13, C_GRAPH_MID)
    px(13, 13, C_GRAPH_DARK)

    # 8. Bottom Mounting Plate (y = 14)
    px(1, 14, C_TRANS)  # chamfer corner
    px(2, 14, C_BLACK)
    px(3, 14, C_GRAPH_LIGHT)
    hline(4, 11, 14, C_GRAPH_MID)
    px(12, 14, C_GRAPH_MID)
    px(13, 14, C_BLACK)
    px(14, 14, C_TRANS)  # chamfer corner

    # 9. Ground Contact Skid Pads (y = 15 - Baseline resting on platform)
    # Flush ground support line at y = 15 (bottom row of 16x16 canvas)
    px(2, 15, C_TRANS)
    px(3, 15, C_BLACK)
    px(4, 15, C_GRAPH_MID)
    px(5, 15, C_GRAPH_DARK)
    hline(6, 9, 15, C_BLACK)       # recessed central undercarriage
    px(10, 15, C_GRAPH_MID)
    px(11, 15, C_GRAPH_DARK)
    px(12, 15, C_BLACK)
    px(13, 15, C_TRANS)

    return img

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    frames = []
    hashes = []

    print("Gerando frames do Cyberpunk Energy Cartridge (Double Burst)...")
    for i in range(4):
        img = create_cartridge_frame(i)
        filename = f"powerup-double-burst-idle-{str(i).zfill(3)}.png"
        filepath = os.path.join(OUT_DIR, filename)
        img.save(filepath, "PNG")
        frames.append(img)
        
        with open(filepath, "rb") as f:
            digest = hashlib.sha256(f.read()).hexdigest()
        hashes.append(digest)
        print(f"  Frame {i}: {filename} (16x16 RGBA) SHA-256: {digest[:16]}...")

    assert len(set(hashes)) == 4, f"Falha: frames duplicados detectados! Hashes: {hashes}"
    print(f"Sucesso: 4/4 frames gerados com hashes distintos em {OUT_DIR}")

if __name__ == "__main__":
    main()
