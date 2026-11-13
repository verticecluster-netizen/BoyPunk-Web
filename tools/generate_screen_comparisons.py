#!/usr/bin/env python3
"""
Generate side-by-side before and after comparisons for polished screens.
"""

import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCREEN_DIR = os.path.join(ROOT, "evidencias", "screens")

FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

def get_font(bold=False, size=12):
    path = FONT_BOLD if bold else FONT_REGULAR
    if os.path.exists(path):
        return ImageFont.truetype(path, size)
    return ImageFont.load_default()

def create_screen_comparison(screen_id, title, desc_before, desc_after):
    before_path = os.path.join(SCREEN_DIR, f"{screen_id}-before.png")
    after_path = os.path.join(SCREEN_DIR, f"{screen_id}-after.png")
    
    if not os.path.exists(before_path) or not os.path.exists(after_path):
        print(f"Skipping {screen_id}: missing before or after")
        return

    b_img = Image.open(before_path).convert("RGBA")
    a_img = Image.open(after_path).convert("RGBA")
    
    # Scale down slightly to fit a clean side-by-side image
    w, h = b_img.size
    target_w = 600
    target_h = int(h * (target_w / w))
    
    b_scaled = b_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
    a_scaled = a_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    pad = 18
    gap = 16
    header_h = 56
    footer_h = 42
    
    total_w = pad * 2 + target_w * 2 + gap
    total_h = pad * 2 + header_h + target_h + footer_h
    
    comp = Image.new("RGBA", (total_w, total_h), (11, 8, 20, 255))
    draw = ImageDraw.Draw(comp)
    
    # Border
    draw.rectangle([(2, 2), (total_w - 3, total_h - 3)], outline=(45, 34, 68, 255), width=2)
    
    title_font = get_font(bold=True, size=16)
    sub_font = get_font(bold=False, size=12)
    label_font = get_font(bold=True, size=13)
    desc_font = get_font(bold=False, size=11)
    
    # Header
    draw.text((pad + 4, pad + 4), f"BOYPUNK! — POLIMENTO TIER A: {title}", fill=(255, 255, 255, 255), font=title_font)
    draw.text((pad + 4, pad + 28), "Resolução de referência 480 × 270 (16:9) | Coesão visual e hierarquia tipográfica", fill=(55, 230, 238, 255), font=sub_font)
    
    # Column Labels
    draw.text((pad + 6, pad + header_h - 18), "ANTES (PROTÓTIPO)", fill=(180, 170, 200, 255), font=label_font)
    draw.text((pad + target_w + gap + 6, pad + header_h - 18), "DEPOIS (TIER A POLISHED)", fill=(255, 122, 40, 255), font=label_font)
    
    # Images
    comp.paste(b_scaled, (pad, pad + header_h))
    comp.paste(a_scaled, (pad + target_w + gap, pad + header_h))
    
    # Footers
    draw.text((pad + 6, pad + header_h + target_h + 10), desc_before, fill=(150, 140, 170, 255), font=desc_font)
    draw.text((pad + target_w + gap + 6, pad + header_h + target_h + 10), desc_after, fill=(55, 230, 238, 255), font=desc_font)
    
    out_path = os.path.join(SCREEN_DIR, f"{screen_id}-comparison.png")
    comp.save(out_path)
    print(f"Salvo comparativo: {out_path}")

if __name__ == "__main__":
    create_screen_comparison(
        "S2",
        "S2 MENU PRINCIPAL (MAIN MENU)",
        "Scrollbar vertical ativo, bordas genéricas, texto colado e hierarquia comprimida",
        "Zero scrollbar, moldura pixel-art dupla com chanfro, tipografia balanceada e espaçamento fluído"
    )
    create_screen_comparison(
        "S1",
        "S1 TELA DE TÍTULO / ABERTURA (TITLE / LOADING)",
        "Fundo plano preto, logotipo sem profundidade, trilha simples de 1px",
        "Atmosfera radial cyberpunk, título com sombra 3D em camadas, barra de energia em neon ciano"
    )
    create_screen_comparison(
        "S6",
        "S6 TELA DE PAUSA (PAUSED)",
        "Painel genérico, botões soltos sem hierarquia primária/secundária, borda plana",
        "Overlay compacto centralizado, moldura dupla violeta, primário destacado em laranja, zero overflow"
    )
    create_screen_comparison(
        "S7",
        "S7 VITÓRIA (VICTORY)",
        "Scrollbar vertical ativo, botões com conflito de estilo primário, badges comprimidas",
        "Acento esmeralda coeso, card do próximo nível limpo, ranking claro de botões, zero scrollbar"
    )
    create_screen_comparison(
        "S8",
        "S8 DERROTA (GAME OVER / DEFEAT)",
        "Borda genérica avermelhada, espaçamento desigual, botões sem diferenciação primária",
        "Acento coral dramático, hierarquia motivo/estatísticas nítida, primário Tentar Novamente"
    )
    create_screen_comparison(
        "S9",
        "S9 RESULTADO BÔNUS (BONUS RESULT)",
        "Layout de texto esticado, ausência de moldura chanfrada de energia, rotas sem ranking",
        "Identidade ciano da câmara, destaque de novos pontos em esmeralda, rotas claras de saída"
    )

