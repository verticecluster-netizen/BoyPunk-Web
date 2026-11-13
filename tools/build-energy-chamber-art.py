#!/usr/bin/env python3
"""
build-energy-chamber-art.py
Senior Pixel-Art Environment & Technical Game Artist tool for BoyPunk-Web.
Generates:
1. assets/images/world/camara-energia.png (Energy chamber background, 1365x768)
2. assets/images/world/energy-platformtiles.png (Modular energy platform tileset, 128x128 RGBA)
3. assets/images/world/bonus-soul-000..003.png (Distinct bonus soul frames, 15x16 RGBA)
"""

import os
from PIL import Image

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
WORLD_DIR = os.path.join(PROJECT_ROOT, "assets", "images", "world")
SOURCE_BG = "/home/flow/.gemini/antigravity-ide/brain/a616cda0-35aa-4966-9ae2-24ad471c5896/energy_chamber_bg_1793044966633.jpg"

def build_background():
    print(f"Loading source background from {SOURCE_BG}...")
    im = Image.open(SOURCE_BG).convert("RGB")
    src_w, src_h = im.size

    # 16:9 target aspect ratio
    target_ratio = 16.0 / 9.0
    current_ratio = src_w / src_h

    if current_ratio > target_ratio:
        new_w = int(src_h * target_ratio)
        offset = (src_w - new_w) // 2
        im = im.crop((offset, 0, offset + new_w, src_h))
    else:
        new_h = int(src_w / target_ratio)
        offset = (src_h - new_h) // 2
        im = im.crop((0, offset, src_w, offset + new_h))

    im = im.resize((1365, 768), Image.Resampling.LANCZOS)
    pixels = im.load()
    w, h = im.size

    # Process pixels:
    # 1. Tame the blinding white center in the reactor portal so cyan souls pop over it.
    # 2. Control luminance to sit in the 5% to 45% range.
    # 3. Enhance deep resonant violet/indigo shadows and cyan conduit accents.
    for y in range(h):
        for x in range(w):
            r, g, b = pixels[x, y]
            cx = x / w
            cy = y / h

            # Distance to central reactor portal (roughly cx=0.49, cy=0.48, oval)
            dist_to_portal = (((cx - 0.49) / 0.16) ** 2 + ((cy - 0.48) / 0.28) ** 2) ** 0.5

            if dist_to_portal < 1.0:
                lum = 0.299 * r + 0.587 * g + 0.114 * b
                # If overly bright white/cyan, cap and shift towards rich deep cyan (#146c7d / #0b2d36)
                if lum > 110:
                    factor = 110.0 / lum
                    r = int(r * factor * 0.45)
                    g = int(g * factor * 0.85)
                    b = int(b * factor * 0.95)
                # Boost rich cyan saturation in the portal
                g = min(180, int(g * 1.15))
                b = min(210, int(b * 1.2))

            # General background contrast control for gameplay readability
            r = int(r * 0.78)
            g = int(g * 0.76)
            b = int(b * 0.84)

            # Deep violet shadow tinting in dark regions (under 25% luminance)
            cur_lum = 0.299 * r + 0.587 * g + 0.114 * b
            if cur_lum < 50:
                b = min(255, int(b * 1.08 + 3))
                r = min(255, int(r * 1.04 + 2))

            pixels[x, y] = (max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)))

    out_path = os.path.join(WORLD_DIR, "camara-energia.png")
    im.save(out_path, format="PNG", optimize=True)
    print(f"Saved camara-energia.png to {out_path} ({im.size})")


def build_platformtiles():
    """
    Creates a 128x128 RGBA tileset matching the engine layout:
    - Tile at (0, 0): One-way platform tile (16x16)
      Lightweight, floating superconductor rail with slotted open lattice
      and vibrant cyan/white emitter strip.
    - Tile at (16, 0): Solid containment platform tile (16x16)
      Heavy, massive, armored containment foundation with violet/cyan
      conduit grooves and solid ceramic/tungsten mass.
    """
    print("Building energy-platformtiles.png...")
    im = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    pixels = im.load()

    # =========================================================================
    # TILE (0, 0): One-way Superconductor Platform Rail (16x16)
    # Shape distinction: Slotted floating energy lattice, open negative space,
    # light profile with upward directional energy bus louvers.
    # =========================================================================
    c_white_high = (235, 253, 255, 255)    # specular white
    c_cyan_bright = (55, 230, 238, 255)    # electric cyan emitter
    c_cyan_deep = (20, 108, 125, 255)      # deep cyan bevel
    c_rail_light = (82, 98, 130, 255)      # superconductor bracket highlight
    c_rail_mid = (45, 52, 74, 255)         # dark superconductor alloy
    c_rail_dark = (24, 28, 42, 255)        # deep alloy shade
    c_energy_slot = (12, 14, 24, 220)      # slotted semi-open negative space
    c_violet_bus = (174, 98, 255, 255)     # resonance violet micro-capacitor

    for y in range(16):
        for x in range(16):
            if y == 0:
                # Top edge: continuous superconducting emission rail
                if x % 4 == 1 or x % 4 == 2:
                    col = c_white_high
                else:
                    col = c_cyan_bright
            elif y == 1:
                # Bevel with alternating cyan energy nodes
                if x % 4 in (1, 2):
                    col = c_cyan_bright
                else:
                    col = c_cyan_deep
            elif y == 2:
                # Upper conductor rail beam
                col = c_rail_light if x in (0, 15) else c_rail_mid
            elif y in (3, 4, 5, 6, 7, 8, 9, 10):
                # Slotted vertical energy louvers / open floating lattice
                # Columns 0 and 15 are end-caps
                if x in (0, 15):
                    col = c_rail_dark
                elif x in (1, 14):
                    col = c_rail_mid
                # Vertical conductive bars at x=4, 7, 11
                elif x in (4, 7, 11):
                    if y in (5, 6):
                        col = c_violet_bus # violet resonant capacitor node
                    elif y in (4, 7):
                        col = c_cyan_deep
                    else:
                        col = c_rail_light
                # Open slots between conductive bars
                elif x in (2, 3, 5, 6, 8, 9, 10, 12, 13):
                    if (y + x) % 3 == 0:
                        col = c_energy_slot
                    else:
                        col = c_rail_dark
                else:
                    col = c_rail_mid
            elif y == 11:
                # Lower magnetic containment bracket
                col = c_rail_mid if x % 2 == 0 else c_rail_dark
            elif y == 12:
                # Lower beam flange
                col = c_rail_dark
            elif y == 13:
                # Downward emitter nodes (subtle upward pass-through indication)
                if x in (4, 7, 11):
                    col = c_cyan_deep
                else:
                    col = (10, 12, 20, 240)
            elif y == 14:
                col = (6, 8, 14, 200)
            else:
                col = (4, 5, 10, 150)
            pixels[x, y] = col

    # =========================================================================
    # TILE (16, 0): Solid Heavy Containment Armor Platform (16x16)
    # Shape distinction: Dense, massive, impenetrable ceramic containment block.
    # Deep recessed violet/cyan energy conduit, heavy reinforced corner chamfers,
    # solid massive volume without open grating.
    # =========================================================================
    c_deck_violet_high = (220, 190, 255, 255) # violet highlight
    c_deck_violet = (174, 98, 255, 255)       # resonance violet border
    c_deck_amber_pip = (255, 177, 74, 255)    # warning amber status marker
    c_armor_light = (74, 86, 115, 255)        # armor plate highlight
    c_armor_mid = (36, 42, 60, 255)           # ceramic containment body
    c_armor_dark = (20, 24, 36, 255)          # armor groove / shadow
    c_conduit_core = (55, 230, 238, 255)      # recessed conduit glow
    c_conduit_glow = (22, 90, 110, 255)       # recessed conduit channel
    c_hex_bolt = (130, 145, 175, 255)         # heavy containment bolt

    for y in range(16):
        for x in range(16):
            tx = x + 16
            if y == 0:
                # Top edge: violet reinforced containment deck with amber indicator
                if x in (7, 8):
                    col = c_deck_amber_pip # center amber hazard marker
                elif x in (0, 15):
                    col = c_deck_violet_high
                else:
                    col = c_deck_violet
            elif y == 1:
                # Upper plate bevel
                if x in (7, 8):
                    col = (180, 95, 25, 255)
                else:
                    col = (100, 48, 160, 255)
            elif y == 2:
                col = c_armor_light if x in (0, 15) else c_armor_mid
            elif y in (3, 4, 5, 6):
                # Upper armor panel
                if x in (0, 15):
                    col = c_armor_dark
                elif x in (1, 14):
                    col = c_armor_mid
                elif (x == 3 or x == 12) and y == 4:
                    col = c_hex_bolt # containment hex bolt
                else:
                    col = c_armor_mid if (x % 2 == 0) else c_armor_dark
            elif y in (7, 8):
                # Central horizontal recessed superconducting conduit channel
                if x in (0, 15):
                    col = c_armor_dark
                elif y == 7:
                    col = c_conduit_core if x % 3 != 0 else c_conduit_glow
                else:
                    col = c_conduit_glow
            elif y in (9, 10, 11, 12):
                # Lower armor panel
                if x in (0, 15):
                    col = c_armor_dark
                elif x in (1, 14):
                    col = c_armor_mid
                elif (x == 3 or x == 12) and y == 11:
                    col = c_hex_bolt
                else:
                    col = c_armor_mid if (x % 2 != 0) else c_armor_dark
            elif y == 13:
                col = c_armor_dark
            elif y == 14:
                col = (12, 14, 22, 255)
            else:
                col = (6, 8, 14, 255)
            pixels[tx, y] = col

    out_path = os.path.join(WORLD_DIR, "energy-platformtiles.png")
    im.save(out_path, format="PNG", optimize=True)
    print(f"Saved energy-platformtiles.png to {out_path} ({im.size})")


def build_bonus_souls():
    """
    Creates 4 frames (15x16 RGBA) of high-energy bonus soul:
    Distinct silhouette: Faceted diamond / quantum energy crystal with
    radiant golden/amber solar core and orbiting electric violet/cyan aura.
    Preserves exact 15x16 collision AABB.
    """
    print("Building bonus-soul-000..003.png...")
    
    # Color palette
    c_white = (255, 255, 255, 255)
    c_amber_bright = (255, 228, 140, 255)
    c_amber_core = (255, 177, 74, 255)
    c_amber_deep = (220, 105, 15, 255)
    c_cyan_spark = (55, 230, 238, 255)
    c_cyan_glow = (20, 110, 130, 220)
    c_violet_aura = (174, 98, 255, 240)
    c_violet_deep = (90, 35, 150, 180)

    # 4 distinct animation frames
    # Frame 0: Standard faceted diamond with 4 corner quantum sparks
    # Frame 1: Core vertically elongated, corner sparks orbit clockwise
    # Frame 2: Core expanded horizontally into faceted hexagon, intense solar flare
    # Frame 3: Core compresses back, orbiting micro-sparks return to corners
    
    patterns = [
        # Frame 0
        {
            "core_y": 8, "core_x": 7,
            "sparks": [(3, 4), (11, 4), (3, 12), (11, 12)],
            "diamond_w": [
                (4, 1), (5, 3), (6, 5), (7, 7), (8, 9), (9, 7), (10, 5), (11, 3), (12, 1)
            ]
        },
        # Frame 1
        {
            "core_y": 8, "core_x": 7,
            "sparks": [(4, 3), (12, 5), (2, 11), (10, 13)],
            "diamond_w": [
                (3, 1), (4, 3), (5, 5), (6, 7), (7, 7), (8, 9), (9, 7), (10, 7), (11, 5), (12, 3), (13, 1)
            ]
        },
        # Frame 2
        {
            "core_y": 8, "core_x": 7,
            "sparks": [(5, 2), (13, 6), (1, 10), (9, 14)],
            "diamond_w": [
                (5, 3), (6, 7), (7, 9), (8, 11), (9, 9), (10, 7), (11, 3)
            ]
        },
        # Frame 3
        {
            "core_y": 8, "core_x": 7,
            "sparks": [(4, 4), (10, 3), (4, 13), (11, 11)],
            "diamond_w": [
                (4, 1), (5, 3), (6, 5), (7, 7), (8, 9), (9, 7), (10, 5), (11, 3), (12, 1)
            ]
        }
    ]

    for f_idx, pat in enumerate(patterns):
        im = Image.new("RGBA", (15, 16), (0, 0, 0, 0))
        pixels = im.load()

        # 1. Draw violet/cyan outer aura from diamond shape
        for y, span in pat["diamond_w"]:
            half = span // 2
            for x in range(pat["core_x"] - half, pat["core_x"] + half + 1):
                if 0 <= x < 15 and 0 <= y < 16:
                    pixels[x, y] = c_violet_aura

        # 2. Draw amber diamond core inside
        for y, span in pat["diamond_w"]:
            if span > 2:
                inner_half = (span - 2) // 2
                for x in range(pat["core_x"] - inner_half, pat["core_x"] + inner_half + 1):
                    if 0 <= x < 15 and 0 <= y < 16:
                        # Edge of core is deep amber, center is bright
                        dist = abs(x - pat["core_x"]) + abs(y - pat["core_y"])
                        if dist <= 1:
                            pixels[x, y] = c_white
                        elif dist <= 3:
                            pixels[x, y] = c_amber_bright
                        else:
                            pixels[x, y] = c_amber_core

        # 3. Add orbiting quantum sparks
        for sx, sy in pat["sparks"]:
            if 0 <= sx < 15 and 0 <= sy < 16:
                pixels[sx, sy] = c_cyan_spark
                # Halo pixel next to spark
                if sx + 1 < 15 and pixels[sx + 1, sy][3] == 0:
                    pixels[sx + 1, sy] = c_cyan_glow

        out_path = os.path.join(WORLD_DIR, f"bonus-soul-{f_idx:03d}.png")
        im.save(out_path, format="PNG", optimize=True)
        print(f"Saved {out_path} ({im.size})")


if __name__ == "__main__":
    build_background()
    build_platformtiles()
    build_bonus_souls()
