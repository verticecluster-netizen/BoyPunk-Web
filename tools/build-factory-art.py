#!/usr/bin/env python3
"""
build-factory-art.py
Senior Pixel-Art Environment & Technical Game Artist tool for BoyPunk-Web.
Generates:
1. assets/images/world/fabrica-sucata.png (Interior factory background)
2. assets/images/world/factory-platformtiles.png (Modular industrial platform tileset)
"""

import os
from PIL import Image, ImageEnhance, ImageFilter

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
WORLD_DIR = os.path.join(PROJECT_ROOT, "assets", "images", "world")
SOURCE_BG = "/home/flow/.gemini/antigravity-ide/brain/a616cda0-35aa-4966-9ae2-24ad471c5896/factory_interior_bg_1792981858424.jpg"

def build_factory_background():
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
        
    # Resize to canonical 1365x768 (high-res source matching distrito-neon.png)
    im = im.resize((1365, 768), Image.Resampling.LANCZOS)
    
    # Process pixels:
    # 1. Tame the blinding white/yellow furnace center to restrained deep orange embers
    # 2. Keep distant machinery lower in contrast than enemies, projectiles, player, souls
    # 3. Enhance subtle violet highlights in upper clerestory windows
    pixels = im.load()
    w, h = im.size
    
    for y in range(h):
        for x in range(w):
            r, g, b = pixels[x, y]
            
            # Furnace center region check (middle 30% horizontally, y between 45% and 80%)
            cx = x / w
            cy = y / h
            dist_to_furnace = ((cx - 0.5) ** 2 + ((cy - 0.68) * 1.6) ** 2) ** 0.5
            
            if dist_to_furnace < 0.22:
                # Restrain high luminance in furnace: cap brightness and shift to deep warm amber
                lum = 0.299 * r + 0.587 * g + 0.114 * b
                if lum > 140:
                    factor = 140.0 / lum
                    r = int(r * factor)
                    g = int(g * factor * 0.55) # suppress green to avoid bright yellow/white
                    b = int(b * factor * 0.25)
                    # Warm industrial amber boost
                    r = min(200, int(r * 1.15))
                    g = min(90, int(g * 0.75))
                    b = min(25, int(b * 0.4))
            
            # Overall background contrast tuning:
            # Game art principle: background values should sit in 5% to 55% luminance
            # so glowing cyan souls, orange bullets, and player white highlights pop instantly!
            r = int(r * 0.82)
            g = int(g * 0.80)
            b = int(b * 0.85)
            
            # Violet atmosphere boost in the upper third (clerestory window connected to Distrito Neon)
            if cy < 0.35 and (x < w * 0.2 or x > w * 0.8 or cy < 0.25):
                b = min(255, int(b * 1.08 + 4))
                r = min(255, int(r * 1.04 + 2))
                
            pixels[x, y] = (max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)))
            
    out_path = os.path.join(WORLD_DIR, "fabrica-sucata.png")
    im.save(out_path, format="PNG", optimize=True)
    print(f"Saved fabrica-sucata.png to {out_path} ({im.size})")

def build_factory_platformtiles():
    """
    Creates a 128x128 RGBA tileset matching the structure of platformtiles.png:
    - Tile at (0, 0): one-way industrial catwalk platform (16x16)
    - Tile at (16, 0): solid industrial wall/floor platform (16x16)
    """
    print("Building factory-platformtiles.png...")
    im = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    pixels = im.load()
    
    # =========================================================================
    # TILE (0, 0): One-way Catwalk Platform (16x16)
    # Graphite steel framing, slotted diamond-mesh grating deck,
    # and a distinct cyan maintenance safety edge with white highlight.
    # =========================================================================
    # Colors:
    c_edge_high = (196, 245, 248, 255)   # bright cyan highlight
    c_edge_cyan = (46, 200, 212, 255)    # vibrant maintenance cyan
    c_edge_deep = (20, 112, 122, 255)    # deep cyan bevel
    c_steel_light = (78, 91, 116, 255)   # steel highlight
    c_steel_mid = (43, 49, 63, 255)      # graphite steel body
    c_steel_dark = (26, 29, 38, 255)     # dark steel shade
    c_grate_slot = (14, 16, 22, 255)     # open grating slot
    c_rivet = (128, 146, 175, 255)       # hex rivet head
    c_shadow = (8, 9, 13, 255)           # bottom drop shadow
    
    for y in range(16):
        for x in range(16):
            if y == 0:
                # Top edge strip: bright cyan maintenance strip
                if x % 4 == 0:
                    col = c_edge_high
                else:
                    col = c_edge_cyan
            elif y == 1:
                col = c_edge_deep
            elif y == 2:
                # Upper deck beam flange
                col = c_steel_light if x in (0, 15) else c_steel_mid
            elif y in (3, 4, 5, 6, 7, 8, 9, 10, 11):
                # Slotted grating pattern
                # Border columns at x=0, 1 and x=14, 15
                if x in (0, 15):
                    col = c_steel_dark
                elif x in (1, 14):
                    col = c_steel_mid
                elif (x + y) % 4 == 0 and y not in (3, 11):
                    # Diamond tread slot
                    col = c_grate_slot
                elif (x + y) % 4 == 1 and y not in (3, 11):
                    col = c_steel_dark
                elif (x == 3 or x == 12) and (y == 4 or y == 10):
                    # Rivet / bolt studs
                    col = c_rivet
                else:
                    col = c_steel_mid
            elif y == 12:
                # Lower structural flange
                col = c_steel_dark
            elif y == 13:
                col = c_steel_dark if x % 2 == 0 else c_grate_slot
            elif y == 14:
                col = c_shadow
            else:
                col = (6, 7, 10, 255)
            pixels[x, y] = col
            
    # =========================================================================
    # TILE (16, 0): Solid Heavy Armor Platform (16x16)
    # Heavy riveted graphite steel armor plate, industrial amber safety line,
    # corner reinforcement brackets and massive hex bolts.
    # =========================================================================
    c_solid_amber_high = (255, 224, 160, 255) # amber core highlight
    c_solid_amber = (255, 133, 34, 255)       # industrial amber border
    c_solid_amber_deep = (180, 75, 18, 255)   # deep amber shadow
    c_plate_light = (86, 96, 120, 255)        # steel plate highlight
    c_plate_mid = (46, 53, 71, 255)           # graphite steel body
    c_plate_dark = (28, 32, 43, 255)          # plate shadow
    c_plate_deep = (18, 20, 28, 255)          # plate seam / groove
    c_plate_rivet = (140, 155, 180, 255)      # heavy hex bolt
    c_violet_bounce = (36, 28, 54, 255)       # ambient violet reflection
    
    for y in range(16):
        for x in range(16):
            tx = x + 16
            if y == 0:
                # Top edge strip: industrial amber hazard strip
                if x % 4 == 0:
                    col = c_solid_amber_high
                else:
                    col = c_solid_amber
            elif y == 1:
                col = c_solid_amber_deep
            elif y == 2:
                # Top plate bevel
                col = c_plate_light if x in (0, 15) else c_plate_mid
            elif y in (3, 4, 5, 6, 7):
                # Upper armor plate panel
                if x in (0, 15):
                    col = c_plate_deep
                elif x in (1, 14):
                    col = c_plate_dark
                elif (x == 3 or x == 12) and y == 4:
                    col = c_plate_rivet
                elif y == 7:
                    # Horizontal plate seam
                    col = c_plate_deep
                else:
                    col = c_plate_mid if (x % 3 != 0) else c_plate_dark
            elif y in (8, 9, 10, 11, 12):
                # Lower armor plate panel
                if x in (0, 15):
                    col = c_plate_deep
                elif x in (1, 14):
                    col = c_plate_dark
                elif (x == 3 or x == 12) and y == 10:
                    col = c_plate_rivet
                elif (x + y) % 5 == 0:
                    col = c_violet_bounce
                else:
                    col = c_plate_mid if (x % 3 != 0) else c_plate_dark
            elif y == 13:
                col = c_plate_deep
            elif y == 14:
                col = c_plate_deep if x % 2 == 0 else c_shadow
            else:
                col = (8, 9, 12, 255)
            pixels[tx, y] = col
            
    out_path = os.path.join(WORLD_DIR, "factory-platformtiles.png")
    im.save(out_path, format="PNG", optimize=True)
    print(f"Saved factory-platformtiles.png to {out_path} ({im.size})")

if __name__ == "__main__":
    build_factory_background()
    build_factory_platformtiles()
