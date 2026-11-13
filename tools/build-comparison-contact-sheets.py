#!/usr/bin/env python3
"""
Gera pranchas comparativas (contact sheets) de antes/depois para o Marco de Polimento Visual.
Usa redimensionamento nearest-neighbor para preservar a integridade dos pixels.
"""

import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EVIDENCIAS_DIR = os.path.join(ROOT, "evidencias", "art", "polimento-global")

BG_COLOR = (14, 13, 28)
CARD_BG = (22, 20, 42)
BORDER_COLOR = (60, 52, 95)
TEXT_COLOR = (240, 240, 255)
CYAN_ACCENT = (56, 217, 245)
AMBER_ACCENT = (255, 180, 50)
GREEN_ACCENT = (78, 242, 150)
RED_ACCENT = (255, 85, 105)

try:
    FONT_TITLE = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 13)
    FONT_SUB = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 11)
    FONT_LABEL = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 11)
    FONT_DETAIL = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 10)
except Exception:
    FONT_TITLE = ImageFont.load_default()
    FONT_SUB = ImageFont.load_default()
    FONT_LABEL = ImageFont.load_default()
    FONT_DETAIL = ImageFont.load_default()

def draw_header(draw, title, subtitle, width, y_start=12):
    draw.text((20, y_start), title, fill=CYAN_ACCENT, font=FONT_TITLE)
    draw.text((20, y_start + 18), subtitle, fill=(180, 180, 205), font=FONT_SUB)
    draw.line([(20, y_start + 36), (width - 20, y_start + 36)], fill=BORDER_COLOR, width=1)
    return y_start + 48

def make_altar_comparative():
    # Carrega imagens de altar
    base_empty = Image.open(os.path.join(EVIDENCIAS_DIR, "02-baseline-altar-distrito-neon-empty.png")).convert("RGBA")
    base_full = Image.open(os.path.join(EVIDENCIAS_DIR, "03-baseline-altar-distrito-neon-full.png")).convert("RGBA")
    
    neon_empty = Image.open(os.path.join(EVIDENCIAS_DIR, "02-distrito-neon-altar-idle-empty.png")).convert("RGBA")
    neon_full = Image.open(os.path.join(EVIDENCIAS_DIR, "03-distrito-neon-altar-full-charged.png")).convert("RGBA")
    neon_2hp = Image.open(os.path.join(EVIDENCIAS_DIR, "04-distrito-neon-altar-damaged-2hp.png")).convert("RGBA")
    neon_1hp = Image.open(os.path.join(EVIDENCIAS_DIR, "05-distrito-neon-altar-critical-1hp.png")).convert("RGBA")
    neon_surge = Image.open(os.path.join(EVIDENCIAS_DIR, "06-distrito-neon-altar-deposit-surge.png")).convert("RGBA")
    
    factory_altar = Image.open(os.path.join(EVIDENCIAS_DIR, "12-fabrica-sucata-industrial-altar.png")).convert("RGBA")

    # Crop altar central nos samples (32x48 nominal centralizado no crop de 70x75)
    # samples têm tamanho ~140x150 em 2x retina/scale ou 70x75
    # Vamos padronizar crops focados no altar para cada item
    items = [
        ("Base: Vazio", base_empty, (160, 160, 175)),
        ("Base: Cheio", base_full, (160, 160, 175)),
        ("Neon: Vazio", neon_empty, CYAN_ACCENT),
        ("Neon: Cheio (14)", neon_full, CYAN_ACCENT),
        ("Neon: Alerta 2HP", neon_2hp, AMBER_ACCENT),
        ("Neon: Crítico 1HP", neon_1hp, RED_ACCENT),
        ("Neon: Depósito", neon_surge, GREEN_ACCENT),
        ("Fábrica: Industrial", factory_altar, AMBER_ACCENT),
    ]

    target_w, target_h = 130, 160
    sheet_w = 20 + len(items) * (target_w + 14) + 10
    sheet_h = 270

    sheet = Image.new("RGBA", (sheet_w, sheet_h), BG_COLOR)
    draw = ImageDraw.Draw(sheet)
    y_start = draw_header(
        draw,
        "BOYPUNK-WEB: COMPARATIVO VISUAL DO ALTAR (BASELINE vs REFINAMENTO POR NÍVEL)",
        "Diferenciação por nível (Neon urbano vs Fábrica industrial) + LEDs e estados de integridade",
        sheet_w
    )

    x = 20
    for label, img, accent in items:
        # Card de fundo
        draw.rectangle([(x, y_start), (x + target_w, y_start + target_h + 36)], fill=CARD_BG, outline=BORDER_COLOR)
        draw.line([(x, y_start), (x + target_w, y_start)], fill=accent, width=2)
        
        # Redimensiona crop preservando proporção
        aspect = img.width / img.height
        disp_h = target_h - 10
        disp_w = int(disp_h * aspect)
        resized = img.resize((disp_w, disp_h), Image.Resampling.NEAREST)
        
        # Centraliza
        offset_x = x + (target_w - disp_w) // 2
        offset_y = y_start + 6
        sheet.paste(resized, (offset_x, offset_y), resized if resized.mode == "RGBA" else None)
        
        # Rótulo
        draw.text((x + 8, y_start + target_h + 8), label, fill=accent, font=FONT_LABEL)
        draw.text((x + 8, y_start + target_h + 22), f"{img.width}x{img.height}", fill=(130, 130, 150), font=FONT_DETAIL)
        
        x += target_w + 14

    out_path = os.path.join(EVIDENCIAS_DIR, "comparativo-altar-before-after.png")
    sheet.save(out_path)
    print("Salvo:", out_path)

def make_hud_comparative():
    base_hud = Image.open(os.path.join(EVIDENCIAS_DIR, "04-baseline-hud-distrito-neon.png")).convert("RGBA")
    polished_hud = Image.open(os.path.join(EVIDENCIAS_DIR, "07-hud-distrito-neon-polished.png")).convert("RGBA")

    w = max(base_hud.width, polished_hud.width)
    h_item = base_hud.height
    
    sheet_w = w + 40
    sheet_h = 48 + (h_item + 50) * 2 + 20

    sheet = Image.new("RGBA", (sheet_w, sheet_h), BG_COLOR)
    draw = ImageDraw.Draw(sheet)
    y_start = draw_header(
        draw,
        "BOYPUNK-WEB: COMPARATIVO VISUAL DO HUD (BASELINE vs HUD POLIDO)",
        "Separação Carga x Altar no Painel 2 + Barra de progresso segmentada estilo arcade com ticks",
        sheet_w
    )

    # Item 1: Baseline
    y1 = y_start + 10
    draw.text((20, y1), "BASELINE (Barra lisa contínua / Carga e Altar no mesmo fluxo):", fill=AMBER_ACCENT, font=FONT_LABEL)
    sheet.paste(base_hud, (20, y1 + 20), base_hud)
    draw.rectangle([(20, y1 + 20), (20 + base_hud.width, y1 + 20 + base_hud.height)], outline=BORDER_COLOR)

    # Item 2: Polished
    y2 = y1 + h_item + 50
    draw.text((20, y2), "POLIDO (CARGA à esquerda, ALTAR à direita, gauge segmentado em 15 passos com chanfro):", fill=CYAN_ACCENT, font=FONT_LABEL)
    sheet.paste(polished_hud, (20, y2 + 20), polished_hud)
    draw.rectangle([(20, y2 + 20), (20 + polished_hud.width, y2 + 20 + polished_hud.height)], outline=CYAN_ACCENT)

    out_path = os.path.join(EVIDENCIAS_DIR, "comparativo-hud-before-after.png")
    sheet.save(out_path)
    print("Salvo:", out_path)

def make_gameplay_comparative():
    base_game = Image.open(os.path.join(EVIDENCIAS_DIR, "01-baseline-distrito-neon-boypunk.png")).convert("RGBA")
    polished_game = Image.open(os.path.join(EVIDENCIAS_DIR, "01-distrito-neon-boypunk-gameplay.png")).convert("RGBA")

    w = base_game.width
    h = base_game.height
    
    # Prancha lado a lado reduzida ou empilhada
    # Como são 960x540 cada, empilhamos com cards e zoom 3x nos detalhes
    sheet_w = w + 40
    sheet_h = 48 + h * 2 + 80

    sheet = Image.new("RGBA", (sheet_w, sheet_h), BG_COLOR)
    draw = ImageDraw.Draw(sheet)
    y_start = draw_header(
        draw,
        "BOYPUNK-WEB: COMPARATIVO GERAL DE GAMEPLAY (DISTRITO NEON)",
        "Visibilidade das almas cibernéticas, presença do altar urbano, e legibilidade do HUD",
        sheet_w
    )

    y1 = y_start + 10
    draw.text((20, y1), "BASELINE (Almas pequenas de contraste baixo, altar genérico):", fill=AMBER_ACCENT, font=FONT_LABEL)
    sheet.paste(base_game, (20, y1 + 20), base_game)
    draw.rectangle([(20, y1 + 20), (20 + w, y1 + 20 + h)], outline=BORDER_COLOR)

    y2 = y1 + h + 40
    draw.text((20, y2), "POLIDO (Almas radiantes com contorno, altar urbano tecnológico, HUD arcade):", fill=CYAN_ACCENT, font=FONT_LABEL)
    sheet.paste(polished_game, (20, y2 + 20), polished_game)
    draw.rectangle([(20, y2 + 20), (20 + w, y2 + 20 + h)], outline=CYAN_ACCENT)

    out_path = os.path.join(EVIDENCIAS_DIR, "comparativo-geral-distrito-neon.png")
    sheet.save(out_path)
    print("Salvo:", out_path)

def make_combat_feedback_sheet():
    hit_img = Image.open(os.path.join(EVIDENCIAS_DIR, "09-combat-hit-feedback.png")).convert("RGBA")
    heal_img = Image.open(os.path.join(EVIDENCIAS_DIR, "10-combat-heal-feedback.png")).convert("RGBA")
    surge_img = Image.open(os.path.join(EVIDENCIAS_DIR, "06-distrito-neon-altar-deposit-surge.png")).convert("RGBA")

    # Zoom 2x nearest-neighbor para leitura detalhada do pixel art
    hit_2x = hit_img.resize((hit_img.width * 2, hit_img.height * 2), Image.Resampling.NEAREST)
    heal_2x = heal_img.resize((heal_img.width * 2, heal_img.height * 2), Image.Resampling.NEAREST)
    surge_2x = surge_img.resize((surge_img.width * 2, surge_img.height * 2), Image.Resampling.NEAREST)

    items = [
        ("Acerto Cinético (-1)", hit_2x, "Flash de impacto conciso com '-1' âmbar", AMBER_ACCENT),
        ("Nanoreparo (+1)", heal_2x, "Aura esmeralda circular com '+1' ciano", GREEN_ACCENT),
        ("Depósito (+N)", surge_2x, "Coluna energética vertical e pulso radial", CYAN_ACCENT),
    ]

    sheet_w = 20 + sum(item[1].width + 30 for item in items)
    max_h = max(item[1].height for item in items)
    sheet_h = 48 + max_h + 80

    sheet = Image.new("RGBA", (sheet_w, sheet_h), BG_COLOR)
    draw = ImageDraw.Draw(sheet)
    y_start = draw_header(
        draw,
        "BOYPUNK-WEB: FEEDBACK VISUAL DE COMBATE E OBJETIVOS (SEM TEXTO LONGO / SEM GERAÇÃO POR QUADRO)",
        "Substituição de 'ACERTO' / '+1 VIDA' por numerais concisos e anéis de impacto pixelados",
        sheet_w
    )

    x = 20
    for title, img, desc, accent in items:
        draw.rectangle([(x, y_start), (x + img.width + 16, y_start + max_h + 50)], fill=CARD_BG, outline=BORDER_COLOR)
        draw.line([(x, y_start), (x + img.width + 16, y_start)], fill=accent, width=2)
        
        offset_y = y_start + (max_h - img.height) // 2 + 10
        sheet.paste(img, (x + 8, offset_y), img)
        
        draw.text((x + 8, y_start + max_h + 16), title, fill=accent, font=FONT_LABEL)
        draw.text((x + 8, y_start + max_h + 32), desc, fill=(160, 160, 180), font=FONT_DETAIL)
        
        x += img.width + 30

    out_path = os.path.join(EVIDENCIAS_DIR, "comparativo-feedback-combate.png")
    sheet.save(out_path)
    print("Salvo:", out_path)

def make_souls_comparative():
    world_dir = os.path.join(ROOT, "assets", "images", "world")
    old_frames = [Image.open(os.path.join(world_dir, f"souls-animation 1-00{i}.png")).convert("RGBA") for i in range(4)]
    new_frames = [Image.open(os.path.join(world_dir, f"soul-cyber-00{i}.png")).convert("RGBA") for i in range(4)]
    bonus_frames = [Image.open(os.path.join(world_dir, f"bonus-soul-00{i}.png")).convert("RGBA") for i in range(4)]

    scale = 6
    cell_w, cell_h = 16 * scale, 16 * scale
    pad = 16

    grid_w = 4 * (cell_w + pad) - pad
    sheet_w = max(660, grid_w + 60)
    sheet_h = 48 + 3 * (cell_h + 40) + 20
    grid_left = (sheet_w - grid_w) // 2

    sheet = Image.new("RGBA", (sheet_w, sheet_h), BG_COLOR)
    draw = ImageDraw.Draw(sheet)
    y_start = draw_header(
        draw,
        "BOYPUNK-WEB: COMPARATIVO DAS ALMAS COLETÁVEIS (AMPLIAÇÃO 6X NEAREST-NEIGHBOR)",
        "Contraste radiante ciano/violeta com contorno escuro vs silhueta anterior de baixo contraste",
        sheet_w
    )

    rows = [
        ("Legado: Almas Campanha (Baixo Contraste)", old_frames, AMBER_ACCENT),
        ("Refinamento: Almas Cibernéticas (Campanha)", new_frames, CYAN_ACCENT),
        ("Preservado: Almas Bônus (Câmara de Energia)", bonus_frames, (255, 215, 60))
    ]

    curr_y = y_start + 10
    for label, frames, accent in rows:
        draw.text((grid_left, curr_y), label, fill=accent, font=FONT_LABEL)
        curr_y += 18
        for i, frame in enumerate(frames):
            x = grid_left + i * (cell_w + pad)
            draw.rectangle([(x, curr_y), (x + cell_w, curr_y + cell_h)], fill=CARD_BG, outline=BORDER_COLOR)
            
            scaled = frame.resize((frame.width * scale, frame.height * scale), Image.Resampling.NEAREST)
            offset_x = x + (cell_w - scaled.width) // 2
            offset_y = curr_y + (cell_h - scaled.height) // 2
            sheet.paste(scaled, (offset_x, offset_y), scaled)
            draw.text((x + 4, curr_y + cell_h - 14), f"F{i} {frame.width}x{frame.height}", fill=(140, 140, 160), font=FONT_DETAIL)
        curr_y += cell_h + 16

    out_path = os.path.join(EVIDENCIAS_DIR, "comparativo-souls-before-after.png")
    sheet.save(out_path)
    print("Salvo:", out_path)

if __name__ == "__main__":
    make_altar_comparative()
    make_hud_comparative()
    make_gameplay_comparative()
    make_combat_feedback_sheet()
    make_souls_comparative()
    print("Todas as pranchas comparativas geradas com sucesso!")
