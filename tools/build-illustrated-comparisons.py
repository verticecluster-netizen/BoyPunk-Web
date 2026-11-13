#!/usr/bin/env python3
"""
Gera pranchas comparativas (contact sheets) de alta qualidade para o
upgrade ilustrado 2D cinematográfico de BoyPunk-Web.
Local: evidencias/art/illustrated-neon-upgrade/
"""

import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "evidencias", "art", "illustrated-neon-upgrade")
os.makedirs(OUT_DIR, exist_ok=True)

# Paleta da UI do Estúdio / Documentação
BG_COLOR = (12, 11, 24)
CARD_BG = (20, 18, 38)
CARD_BORDER = (45, 40, 75)
TEXT_WHITE = (245, 245, 255)
TEXT_MUTED = (160, 160, 185)
CYAN_ACCENT = (56, 217, 245)
AMBER_ACCENT = (255, 180, 50)
GREEN_ACCENT = (78, 242, 150)
RED_ACCENT = (255, 85, 105)
VIOLET_ACCENT = (180, 110, 255)

try:
    FONT_TITLE = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 14)
    FONT_SUB = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 11)
    FONT_LABEL = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 11)
    FONT_DETAIL = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 10)
except Exception:
    FONT_TITLE = ImageFont.load_default()
    FONT_SUB = ImageFont.load_default()
    FONT_LABEL = ImageFont.load_default()
    FONT_DETAIL = ImageFont.load_default()

def draw_header(draw, title, subtitle, width, y_start=14):
    draw.text((24, y_start), title, fill=CYAN_ACCENT, font=FONT_TITLE)
    draw.text((24, y_start + 20), subtitle, fill=TEXT_MUTED, font=FONT_SUB)
    draw.line([(24, y_start + 40), (width - 24, y_start + 40)], fill=CARD_BORDER, width=1)
    return y_start + 52

def make_boypunk_comparative():
    # BoyPunk comparison
    # Legacy: assets/images/characters/boypunk/playeranim-{state}-{idx}.png (64x96)
    # Illustrated: assets/images/characters/boypunk-illustrated/playeranim-{state}-{idx}.png (128x192)
    states = [
        ("IDLE (Pouso)", "idle", 0),
        ("RUN Frame 0", "run", 0),
        ("RUN Frame 2", "run", 2),
        ("ATTACK (Pulso)", "attack", 1),
        ("DIE Frame 0", "die", 0),
        ("DIE Frame 3", "die", 3),
    ]

    card_w = 170
    card_h = 320
    margin = 20
    cols = len(states)
    total_w = margin * 2 + cols * (card_w + 14) - 14
    total_h = 420

    img = Image.new("RGBA", (total_w, total_h), BG_COLOR)
    draw = ImageDraw.Draw(img)

    header_y = draw_header(
        draw,
        "BOYPUNK — COMPARATIVO: LEGACY (64x96) vs ILUSTRADO 2D (128x192)",
        "Transição de voxel escalado para silhuetas suaves, capacete grafite, viseira ciano curva e armadura arredondada",
        total_w
    )

    for i, (label, st, idx) in enumerate(states):
        cx = margin + i * (card_w + 14)
        cy = header_y + 10

        # Card box
        draw.rectangle([cx, cy, cx + card_w, cy + card_h], fill=CARD_BG, outline=CARD_BORDER, width=1)
        draw.text((cx + 10, cy + 10), label, fill=TEXT_WHITE, font=FONT_LABEL)

        # Legacy sprite path
        legacy_path = os.path.join(ROOT, "assets", "images", "characters", "boypunk", f"playeranim-{st}-{idx}.png")
        # Illustrated sprite path
        illust_path = os.path.join(ROOT, "assets", "images", "characters", "boypunk-illustrated", f"playeranim-{st}-{idx}.png")

        # Load legacy: crop relevant 64x64 portion or keep 64x96
        if os.path.exists(legacy_path):
            leg = Image.open(legacy_path).convert("RGBA")
            # Legacy display: show 64x96 scaled to fit card (e.g. 70x105)
            leg_disp = leg.resize((64, 96), Image.NEAREST)
            img.paste(leg_disp, (cx + 10, cy + 45), leg_disp)
            draw.text((cx + 82, cy + 50), "LEGACY", fill=TEXT_MUTED, font=FONT_DETAIL)
            draw.text((cx + 82, cy + 65), "64×96", fill=TEXT_MUTED, font=FONT_DETAIL)
            draw.text((cx + 82, cy + 80), "Voxel /", fill=TEXT_MUTED, font=FONT_DETAIL)
            draw.text((cx + 82, cy + 95), "Nearest", fill=TEXT_MUTED, font=FONT_DETAIL)

        draw.line([(cx + 10, cy + 155), (cx + card_w - 10, cy + 155)], fill=CARD_BORDER, width=1)

        if os.path.exists(illust_path):
            ill = Image.open(illust_path).convert("RGBA")
            # Illustrated display: 128x192 scaled to fit lower card area (e.g. 80x120)
            ill_disp = ill.resize((80, 120), Image.BILINEAR)
            img.paste(ill_disp, (cx + 10, cy + 175), ill_disp)
            draw.text((cx + 95, cy + 180), "ILUSTRADO", fill=CYAN_ACCENT, font=FONT_LABEL)
            draw.text((cx + 95, cy + 200), "128×192", fill=GREEN_ACCENT, font=FONT_DETAIL)
            draw.text((cx + 95, cy + 215), "Backing 2×", fill=TEXT_MUTED, font=FONT_DETAIL)
            draw.text((cx + 95, cy + 230), "Suave /", fill=TEXT_MUTED, font=FONT_DETAIL)
            draw.text((cx + 95, cy + 245), "Bilinear", fill=TEXT_MUTED, font=FONT_DETAIL)

    out_file = os.path.join(OUT_DIR, "comparativo-boypunk-legacy-vs-illustrated.png")
    img.save(out_file)
    print(f"Salvo: {out_file}")

def make_nilo_comparative():
    # Nilo comparison
    states = [
        ("IDLE (Android)", "idle", 0),
        ("RUN Frame 0", "run", 0),
        ("RUN Frame 2", "run", 2),
        ("ATTACK (Nano)", "attack", 1),
        ("DIE Frame 0", "die", 0),
        ("DIE Frame 3", "die", 3),
    ]

    card_w = 170
    card_h = 320
    margin = 20
    cols = len(states)
    total_w = margin * 2 + cols * (card_w + 14) - 14
    total_h = 420

    img = Image.new("RGBA", (total_w, total_h), BG_COLOR)
    draw = ImageDraw.Draw(img)

    header_y = draw_header(
        draw,
        "NILO ANDROID — COMPARATIVO: LEGACY (64x96) vs ILUSTRADO 2D (128x192)",
        "Chassis marfim polido, ótica âmbar suave, juntas de grafite e emissor de nanorreparo cilíndrico",
        total_w
    )

    for i, (label, st, idx) in enumerate(states):
        cx = margin + i * (card_w + 14)
        cy = header_y + 10

        draw.rectangle([cx, cy, cx + card_w, cy + card_h], fill=CARD_BG, outline=CARD_BORDER, width=1)
        draw.text((cx + 10, cy + 10), label, fill=TEXT_WHITE, font=FONT_LABEL)

        legacy_path = os.path.join(ROOT, "assets", "images", "characters", "nilo", f"nilo-{st}-{idx}.png")
        illust_path = os.path.join(ROOT, "assets", "images", "characters", "nilo-illustrated", f"nilo-{st}-{idx}.png")

        if os.path.exists(legacy_path):
            leg = Image.open(legacy_path).convert("RGBA")
            leg_disp = leg.resize((64, 96), Image.NEAREST)
            img.paste(leg_disp, (cx + 10, cy + 45), leg_disp)
            draw.text((cx + 82, cy + 50), "LEGACY", fill=TEXT_MUTED, font=FONT_DETAIL)
            draw.text((cx + 82, cy + 65), "64×96", fill=TEXT_MUTED, font=FONT_DETAIL)
            draw.text((cx + 82, cy + 80), "Voxel /", fill=TEXT_MUTED, font=FONT_DETAIL)
            draw.text((cx + 82, cy + 95), "Nearest", fill=TEXT_MUTED, font=FONT_DETAIL)

        draw.line([(cx + 10, cy + 155), (cx + card_w - 10, cy + 155)], fill=CARD_BORDER, width=1)

        if os.path.exists(illust_path):
            ill = Image.open(illust_path).convert("RGBA")
            ill_disp = ill.resize((80, 120), Image.BILINEAR)
            img.paste(ill_disp, (cx + 10, cy + 175), ill_disp)
            draw.text((cx + 95, cy + 180), "ILUSTRADO", fill=AMBER_ACCENT, font=FONT_LABEL)
            draw.text((cx + 95, cy + 200), "128×192", fill=GREEN_ACCENT, font=FONT_DETAIL)
            draw.text((cx + 95, cy + 215), "Backing 2×", fill=TEXT_MUTED, font=FONT_DETAIL)
            draw.text((cx + 95, cy + 230), "Marfim /", fill=TEXT_MUTED, font=FONT_DETAIL)
            draw.text((cx + 95, cy + 245), "Âmbar", fill=TEXT_MUTED, font=FONT_DETAIL)

    out_file = os.path.join(OUT_DIR, "comparativo-nilo-legacy-vs-illustrated.png")
    img.save(out_file)
    print(f"Salvo: {out_file}")

def make_altar_comparative():
    # Altar comparison
    # Legacy: assets/images/world/altar-distrito-neon-{idx}.png (32x48)
    # Illustrated: assets/images/world/altar-distrito-neon-illustrated-{idx}.png (64x96)
    states = [
        ("Vazio / Base", 0),
        ("Pulso Ativo (F1)", 1),
        ("Carga Máxima (F2)", 2),
        ("Alerta 2HP (F3)", 3),
        ("Crítico 1HP (F4)", 4),
        ("Surge Depósito (F5)", 5),
        ("Esgotado (F6)", 6),
    ]

    card_w = 145
    card_h = 280
    margin = 20
    cols = len(states)
    total_w = margin * 2 + cols * (card_w + 12) - 12
    total_h = 380

    img = Image.new("RGBA", (total_w, total_h), BG_COLOR)
    draw = ImageDraw.Draw(img)

    header_y = draw_header(
        draw,
        "ALTAR DISTRITO NEON — COMPARATIVO: LEGACY (32x48) vs ILUSTRADO 2D (64x96)",
        "Duto de contenção curvo, núcleo de plasma ciano, aletas de cobre e luz refletida direcional",
        total_w
    )

    for i, (label, idx) in enumerate(states):
        cx = margin + i * (card_w + 12)
        cy = header_y + 10

        draw.rectangle([cx, cy, cx + card_w, cy + card_h], fill=CARD_BG, outline=CARD_BORDER, width=1)
        draw.text((cx + 8, cy + 8), label, fill=TEXT_WHITE, font=FONT_LABEL)

        legacy_path = os.path.join(ROOT, "assets", "images", "world", f"altar-distrito-neon-{idx}.png")
        illust_path = os.path.join(ROOT, "assets", "images", "world", f"altar-distrito-neon-illustrated-{idx}.png")

        if os.path.exists(legacy_path):
            leg = Image.open(legacy_path).convert("RGBA")
            leg_disp = leg.resize((48, 72), Image.NEAREST)
            img.paste(leg_disp, (cx + 8, cy + 35), leg_disp)
            draw.text((cx + 62, cy + 45), "LEGACY", fill=TEXT_MUTED, font=FONT_DETAIL)
            draw.text((cx + 62, cy + 60), "32×48", fill=TEXT_MUTED, font=FONT_DETAIL)

        draw.line([(cx + 8, cy + 125), (cx + card_w - 8, cy + 125)], fill=CARD_BORDER, width=1)

        if os.path.exists(illust_path):
            ill = Image.open(illust_path).convert("RGBA")
            ill_disp = ill.resize((56, 84), Image.BILINEAR)
            img.paste(ill_disp, (cx + 8, cy + 145), ill_disp)
            draw.text((cx + 70, cy + 155), "ILUST.", fill=CYAN_ACCENT, font=FONT_LABEL)
            draw.text((cx + 70, cy + 175), "64×96", fill=GREEN_ACCENT, font=FONT_DETAIL)
            draw.text((cx + 70, cy + 195), "Plasma", fill=TEXT_MUTED, font=FONT_DETAIL)

    out_file = os.path.join(OUT_DIR, "comparativo-altar-legacy-vs-illustrated.png")
    img.save(out_file)
    print(f"Salvo: {out_file}")

def make_chaser_comparative():
    # Chaser comparison
    # Legacy: assets/images/enemies/chaser/enemycaveira-{state}-{idx}.png (16x32)
    # Illustrated: assets/images/enemies/chaser-illustrated/enemycaveira-{state}-{idx}.png (32x64)
    states = [
        ("IDLE (Sentinela)", "idle", 0),
        ("RUN Frame 0", "run", 0),
        ("RUN Frame 2", "run", 2),
        ("ATTACK (Mordida)", "attack", 1),
        ("DIE Frame 0", "die", 0),
        ("DIE Frame 2", "die", 2),
    ]

    card_w = 150
    card_h = 280
    margin = 20
    cols = len(states)
    total_w = margin * 2 + cols * (card_w + 12) - 12
    total_h = 380

    img = Image.new("RGBA", (total_w, total_h), BG_COLOR)
    draw = ImageDraw.Draw(img)

    header_y = draw_header(
        draw,
        "CHASER DROID — COMPARATIVO: LEGACY (16x32) vs ILUSTRADO 2D (32x64)",
        "Olho monocular carmesim, mandíbula de aço temperado, pernas articuladas e sombreamento volumétrico",
        total_w
    )

    for i, (label, st, idx) in enumerate(states):
        cx = margin + i * (card_w + 12)
        cy = header_y + 10

        draw.rectangle([cx, cy, cx + card_w, cy + card_h], fill=CARD_BG, outline=CARD_BORDER, width=1)
        draw.text((cx + 8, cy + 8), label, fill=TEXT_WHITE, font=FONT_LABEL)

        legacy_path = os.path.join(ROOT, "assets", "images", "enemies", "chaser", f"enemycaveira-{st}-{idx}.png")
        illust_path = os.path.join(ROOT, "assets", "images", "enemies", "chaser-illustrated", f"enemycaveira-{st}-{idx}.png")

        if os.path.exists(legacy_path):
            leg = Image.open(legacy_path).convert("RGBA")
            leg_disp = leg.resize((32, 64), Image.NEAREST)
            img.paste(leg_disp, (cx + 15, cy + 38), leg_disp)
            draw.text((cx + 65, cy + 45), "LEGACY", fill=TEXT_MUTED, font=FONT_DETAIL)
            draw.text((cx + 65, cy + 60), "16×32", fill=TEXT_MUTED, font=FONT_DETAIL)
            draw.text((cx + 65, cy + 75), "Voxel", fill=TEXT_MUTED, font=FONT_DETAIL)

        draw.line([(cx + 8, cy + 125), (cx + card_w - 8, cy + 125)], fill=CARD_BORDER, width=1)

        if os.path.exists(illust_path):
            ill = Image.open(illust_path).convert("RGBA")
            ill_disp = ill.resize((48, 96), Image.BILINEAR)
            img.paste(ill_disp, (cx + 15, cy + 140), ill_disp)
            draw.text((cx + 72, cy + 155), "ILUST.", fill=RED_ACCENT, font=FONT_LABEL)
            draw.text((cx + 72, cy + 175), "32×64", fill=GREEN_ACCENT, font=FONT_DETAIL)
            draw.text((cx + 72, cy + 195), "Carmesim", fill=TEXT_MUTED, font=FONT_DETAIL)

    out_file = os.path.join(OUT_DIR, "comparativo-chaser-legacy-vs-illustrated.png")
    img.save(out_file)
    print(f"Salvo: {out_file}")

def make_projectiles_comparative():
    # Projectiles comparison
    # Pulse Ball & Enemy Bullet
    items = [
        ("Pulso BoyPunk (Jogador)", "bullet.png", "pulse-ball-illustrated.png", CYAN_ACCENT),
        ("Projétil Inimigo (Sniper)", "enemy-bullet.png", "enemy-bullet-illustrated.png", RED_ACCENT),
    ]

    card_w = 260
    card_h = 240
    margin = 24
    total_w = margin * 2 + len(items) * (card_w + 20) - 20
    total_h = 340

    img = Image.new("RGBA", (total_w, total_h), BG_COLOR)
    draw = ImageDraw.Draw(img)

    header_y = draw_header(
        draw,
        "PROJÉTEIS & IMPACTO — COMPARATIVO: LEGACY (8x8) vs ILUSTRADO 2D (16x16)",
        "Gradiente radial suave com núcleo de energia densa e halo esférico sem distorção",
        total_w
    )

    for i, (label, leg_name, ill_name, col) in enumerate(items):
        cx = margin + i * (card_w + 20)
        cy = header_y + 12

        draw.rectangle([cx, cy, cx + card_w, cy + card_h], fill=CARD_BG, outline=CARD_BORDER, width=1)
        draw.text((cx + 12, cy + 12), label, fill=TEXT_WHITE, font=FONT_LABEL)

        leg_path = os.path.join(ROOT, "assets", "images", "projectiles", leg_name)
        ill_path = os.path.join(ROOT, "assets", "images", "projectiles", ill_name)

        # Legacy
        if os.path.exists(leg_path):
            leg = Image.open(leg_path).convert("RGBA")
            leg_disp = leg.resize((48, 48), Image.NEAREST)
            img.paste(leg_disp, (cx + 20, cy + 50), leg_disp)
            draw.text((cx + 85, cy + 55), "LEGACY (8×8)", fill=TEXT_MUTED, font=FONT_DETAIL)
            draw.text((cx + 85, cy + 70), "Bloco quadrado 4x4", fill=TEXT_MUTED, font=FONT_DETAIL)

        draw.line([(cx + 12, cy + 120), (cx + card_w - 12, cy + 120)], fill=CARD_BORDER, width=1)

        # Illustrated
        if os.path.exists(ill_path):
            ill = Image.open(ill_path).convert("RGBA")
            ill_disp = ill.resize((56, 56), Image.BILINEAR)
            img.paste(ill_disp, (cx + 20, cy + 140), ill_disp)
            draw.text((cx + 90, cy + 145), "ILUSTRADO (16×16)", fill=col, font=FONT_LABEL)
            draw.text((cx + 90, cy + 165), "Halo radial antialiased", fill=GREEN_ACCENT, font=FONT_DETAIL)
            draw.text((cx + 90, cy + 180), "Escalonado 2× limpo", fill=TEXT_MUTED, font=FONT_DETAIL)

    out_file = os.path.join(OUT_DIR, "comparativo-projectiles-legacy-vs-illustrated.png")
    img.save(out_file)
    print(f"Salvo: {out_file}")

def make_distrito_neon_slice_comparative():
    # Slice comparison: 1x legacy vs 2x illustrated
    leg_path = os.path.join(OUT_DIR, "08-distrito-neon-legacy-baseline-1x.png")
    ill_path = os.path.join(OUT_DIR, "01-distrito-neon-illustrated-overview.png")

    if not (os.path.exists(leg_path) and os.path.exists(ill_path)):
        print("Avisos: Screenshots 08 e 01 não encontrados para slice comparativo.")
        return

    leg_img = Image.open(leg_path).convert("RGBA")
    ill_img = Image.open(ill_path).convert("RGBA")

    # Canvas width: 1040, height: 760
    total_w = 1040
    total_h = 760
    img = Image.new("RGBA", (total_w, total_h), BG_COLOR)
    draw = ImageDraw.Draw(img)

    header_y = draw_header(
        draw,
        "DISTRITO NEON — COMPARATIVO: BASELINE LEGACY 1× vs SLICE ILUSTRADO 2× BACKING CANVAS",
        "Comparação direta de gameplay no mesmo viewport (960×540) e crop com zoom de 2.5× na zona de ação (Altar + Plataformas)",
        total_w
    )

    # Top: Overview side-by-side (each 480x270)
    top_w = 480
    top_h = 270
    leg_top = leg_img.resize((top_w, top_h), Image.BILINEAR)
    ill_top = ill_img.resize((top_w, top_h), Image.BILINEAR)

    # Card 1: Legacy Overview
    c1_x = 24
    c1_y = header_y + 10
    draw.rectangle([c1_x - 2, c1_y - 2, c1_x + top_w + 2, c1_y + top_h + 26], fill=CARD_BG, outline=CARD_BORDER, width=1)
    img.paste(leg_top, (c1_x, c1_y + 24))
    draw.text((c1_x + 8, c1_y + 6), "LEGACY 1× (Backing 480×270 esticado)", fill=TEXT_MUTED, font=FONT_LABEL)

    # Card 2: Illustrated Overview
    c2_x = 24 + top_w + 32
    c2_y = header_y + 10
    draw.rectangle([c2_x - 2, c2_y - 2, c2_x + top_w + 2, c2_y + top_h + 26], fill=CARD_BG, outline=CARD_BORDER, width=1)
    img.paste(ill_top, (c2_x, c2_y + 24))
    draw.text((c2_x + 8, c2_y + 6), "UPGRADE ILUSTRADO 2× (Backing 960×540 nativo)", fill=CYAN_ACCENT, font=FONT_LABEL)

    # Bottom: Zoomed Crop (2.5x) around Altar & Player (logical coords ~ [180..340, 160..250])
    # In 960x540: [360..680, 320..500] -> width: 320, height: 180
    zoom_crop_box = (360, 320, 680, 500)
    leg_crop = leg_img.crop(zoom_crop_box).resize((top_w, top_h), Image.NEAREST)
    ill_crop = ill_img.crop(zoom_crop_box).resize((top_w, top_h), Image.BILINEAR)

    b1_y = c1_y + top_h + 46
    draw.rectangle([c1_x - 2, b1_y - 2, c1_x + top_w + 2, b1_y + top_h + 44], fill=CARD_BG, outline=CARD_BORDER, width=1)
    img.paste(leg_crop, (c1_x, b1_y + 24))
    draw.text((c1_x + 8, b1_y + 6), "DETALHE 2.5×: LEGACY VOXEL (Pixels blocados, degraus rígidos)", fill=RED_ACCENT, font=FONT_LABEL)
    draw.text((c1_x + 8, b1_y + top_h + 28), "Artefatos visíveis de pixel art esticada sem transição de materiais", fill=TEXT_MUTED, font=FONT_DETAIL)

    b2_y = b1_y
    draw.rectangle([c2_x - 2, b2_y - 2, c2_x + top_w + 2, b2_y + top_h + 44], fill=CARD_BG, outline=CARD_BORDER, width=1)
    img.paste(ill_crop, (c2_x, b2_y + 24))
    draw.text((c2_x + 8, b2_y + 6), "DETALHE 2.5×: ILUSTRADO 2D (Silhuetas suaves, aletas, brackets e sombras)", fill=GREEN_ACCENT, font=FONT_LABEL)
    draw.text((c2_x + 8, b2_y + top_h + 28), "Suporte cantilever industrial, sombras de contato e gradientes suaves", fill=TEXT_MUTED, font=FONT_DETAIL)

    out_file = os.path.join(OUT_DIR, "comparativo-distrito-neon-before-after.png")
    img.save(out_file)
    print(f"Salvo: {out_file}")

if __name__ == "__main__":
    print("Iniciando geração de pranchas comparativas ilustradas...")
    make_boypunk_comparative()
    make_nilo_comparative()
    make_altar_comparative()
    make_chaser_comparative()
    make_projectiles_comparative()
    make_distrito_neon_slice_comparative()
    print("Todas as pranchas comparativas geradas com sucesso.")
