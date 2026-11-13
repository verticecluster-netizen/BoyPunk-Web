#!/usr/bin/env python3
"""
Art Evidence Generator for Cyberpunk Double Burst Energy Cartridge
BoyPunk-Web — Phase 2B
Generates:
1. Contact sheet showing all 4 frames at 1x, 4x, 8x with palette metrics.
2. Animated GIF showing the idle cycle at 8x with crisp nearest-neighbor sampling.
3. Before/After comparison panel: Provisional Procedural Box vs Artisan Cyberpunk Cartridge.
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ASSETS_DIR = os.path.join(ROOT, "assets", "images", "world")
OUT_DIR = os.path.join(ROOT, "evidencias", "art", "powerups")
os.makedirs(OUT_DIR, exist_ok=True)

# Load the 4 frames
frames = []
for i in range(4):
    path = os.path.join(ASSETS_DIR, f"powerup-double-burst-idle-{str(i).zfill(3)}.png")
    frames.append(Image.open(path).convert("RGBA"))

# 1. Generate Animated GIF of Idle Cycle at 8x (128x128)
gif_frames = []
for f in frames:
    scaled = f.resize((128, 128), Image.Resampling.NEAREST)
    # Add dark background so transparent areas are readable
    bg = Image.new("RGBA", (128, 128), (14, 17, 26, 255))
    bg.paste(scaled, (0, 0), scaled)
    gif_frames.append(bg.convert("P", palette=Image.Palette.ADAPTIVE))

gif_path = os.path.join(OUT_DIR, "double-burst-cartridge-idle-loop.gif")
gif_frames[0].save(
    gif_path,
    save_all=True,
    append_images=gif_frames[1:],
    duration=140, # ~7 fps
    loop=0,
    optimize=False
)
print(f"Gerado loop animado: {gif_path}")

# 2. Contact Sheet of the 4 Frames with Annotations (8x Scale)
SCALE = 8
CARD_SIZE = 16 * SCALE # 128
MARGIN = 16
HEADER_H = 48
SHEET_W = (CARD_SIZE + MARGIN) * 4 + MARGIN
SHEET_H = CARD_SIZE + HEADER_H + 64

sheet = Image.new("RGBA", (SHEET_W, SHEET_H), (10, 12, 18, 255))
draw = ImageDraw.Draw(sheet)

# Header
draw.rectangle([(0, 0), (SHEET_W, HEADER_H)], fill=(18, 22, 34, 255))
draw.text((MARGIN, 10), "BOYPUNK! WEB — FASE 2B: RAJADA DUPLA (DOUBLE BURST)", fill=(255, 170, 51, 255))
draw.text((MARGIN, 26), "Cartucho de Energia Cyberpunk (16x16 RGBA) · Escala 8x (128x128 px) · 4 Frames Idle", fill=(55, 230, 238, 255))

labels = [
    "Frame 0: Standby / Carga",
    "Frame 1: Pulso Ascendente",
    "Frame 2: Pico / Prontidão",
    "Frame 3: Resfriamento"
]

for i, (frame, label) in enumerate(zip(frames, labels)):
    x = MARGIN + i * (CARD_SIZE + MARGIN)
    y = HEADER_H + MARGIN
    
    # Backdrop grid box
    draw.rectangle([(x - 2, y - 2), (x + CARD_SIZE + 1, y + CARD_SIZE + 1)], outline=(55, 230, 238, 120), fill=(16, 20, 30, 255))
    
    # 1px checkerboard pattern for alpha transparency visualization
    for cy in range(0, CARD_SIZE, 8):
        for cx in range(0, CARD_SIZE, 8):
            if ((cx // 8) + (cy // 8)) % 2 == 0:
                draw.rectangle([(x + cx, y + cy), (x + cx + 7, y + cy + 7)], fill=(22, 26, 38, 255))
    
    # Scaled sprite
    scaled_f = frame.resize((CARD_SIZE, CARD_SIZE), Image.Resampling.NEAREST)
    sheet.paste(scaled_f, (x, y), scaled_f)
    
    # Label and technical specs
    draw.text((x, y + CARD_SIZE + 6), label, fill=(255, 245, 220, 255))
    draw.text((x, y + CARD_SIZE + 20), f"16x16 · Baseline Y=15", fill=(120, 132, 160, 255))
    draw.text((x, y + CARD_SIZE + 34), f"Duplo Núcleo Plasma", fill=(255, 170, 51, 255))

contact_path = os.path.join(OUT_DIR, "double-burst-contact-sheet.png")
sheet.save(contact_path, "PNG")
print(f"Gerada folha de contato: {contact_path}")

# 3. Before vs After Comparison: Provisional Procedural Box vs Cyberpunk Cartridge
COMP_SCALE = 10
SPRITE_W = 16 * COMP_SCALE # 160
PANEL_W = SPRITE_W * 2 + MARGIN * 3
PANEL_H = SPRITE_W + HEADER_H + 50

comp = Image.new("RGBA", (PANEL_W, PANEL_H), (10, 12, 18, 255))
cdraw = ImageDraw.Draw(comp)

cdraw.rectangle([(0, 0), (PANEL_W, HEADER_H)], fill=(18, 22, 34, 255))
cdraw.text((MARGIN, 10), "BOYPUNK! WEB — COMPARATIVO VISUAL DO PICKUP (10x / 160x160 px)", fill=(255, 170, 51, 255))
cdraw.text((MARGIN, 26), "Antes: Caixa Procedural Provisória  VS  Depois: Cartucho de Energia Cyberpunk", fill=(55, 230, 238, 255))

# Generate provisional box image at 16x16
prov = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
pdraw = ImageDraw.Draw(prov)
pdraw.rectangle([(0, 0), (15, 15)], fill=(5, 4, 10, 224), outline=(55, 230, 238, 255))
pdraw.rectangle([(3, 4), (5, 6)], fill=(255, 177, 74, 255))
pdraw.rectangle([(10, 4), (12, 6)], fill=(255, 177, 74, 255))
pdraw.text((4, 7), "x2", fill=(255, 245, 220, 255))
prov_scaled = prov.resize((SPRITE_W, SPRITE_W), Image.Resampling.NEAREST)

# Position 1: Provisional
px1 = MARGIN
py1 = HEADER_H + MARGIN
cdraw.rectangle([(px1 - 2, py1 - 2), (px1 + SPRITE_W + 1, py1 + SPRITE_W + 1)], outline=(255, 95, 81, 160), fill=(16, 20, 30, 255))
comp.paste(prov_scaled, (px1, py1), prov_scaled)
cdraw.text((px1, py1 + SPRITE_W + 8), "ANTES: Provisório Procedural (16x16)", fill=(255, 95, 81, 255))
cdraw.text((px1, py1 + SPRITE_W + 22), "Caixa geométrica simples com texto ×2", fill=(160, 168, 190, 255))

# Position 2: Final Cyberpunk Cartridge (Frame 1)
px2 = MARGIN * 2 + SPRITE_W
py2 = HEADER_H + MARGIN
cart_scaled = frames[1].resize((SPRITE_W, SPRITE_W), Image.Resampling.NEAREST)
cdraw.rectangle([(px2 - 2, py2 - 2), (px2 + SPRITE_W + 1, py2 + SPRITE_W + 1)], outline=(55, 230, 238, 200), fill=(16, 20, 30, 255))
comp.paste(cart_scaled, (px2, py2), cart_scaled)
cdraw.text((px2, py2 + SPRITE_W + 8), "DEPOIS: Cartucho Cyberpunk (16x16)", fill=(55, 230, 238, 255))
cdraw.text((px2, py2 + SPRITE_W + 22), "Chassi grafite, ciano elétrico, duplo núcleo plasma", fill=(255, 245, 220, 255))

comp_path = os.path.join(OUT_DIR, "double-burst-before-after-comparison.png")
comp.save(comp_path, "PNG")
print(f"Gerado comparativo antes/depois: {comp_path}")
