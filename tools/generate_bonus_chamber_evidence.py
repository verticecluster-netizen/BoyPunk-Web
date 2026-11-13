#!/usr/bin/env python3
"""
generate_bonus_chamber_evidence.py
Generates comprehensive visual evidence for Camara de Energia (energy-chamber):
- after-4x.png (1920x1080 nearest-neighbor)
- comparacao-native.png (960x270 side-by-side labeled before vs after)
- comparacao-enlarged-4x.png (3840x1080 side-by-side 4x)
- crop-plataformas-comparacao.png (zoomed 4x view of one-way vs solid tiles)
- crop-alma-comparacao.png (zoomed 8x view of campaign vs bonus soul)
- crop-fundo-reator.png (zoomed 2x view of central reactor core)
"""

import os
from PIL import Image, ImageDraw, ImageFont

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
EVIDENCE_DIR = os.path.join(PROJECT_ROOT, "evidencias", "art", "camara-energia")

def main():
    before_path = os.path.join(EVIDENCE_DIR, "before-native.png")
    after_path = os.path.join(EVIDENCE_DIR, "after-native.png")

    if not os.path.exists(before_path) or not os.path.exists(after_path):
        raise FileNotFoundError("Both before-native.png and after-native.png must exist.")

    im_before = Image.open(before_path).convert("RGBA")
    im_after = Image.open(after_path).convert("RGBA")
    w, h = im_before.size # 480, 270

    # 1. after-4x.png
    im_after_4x = im_after.resize((w * 4, h * 4), Image.Resampling.NEAREST)
    im_after_4x.save(os.path.join(EVIDENCE_DIR, "after-4x.png"))
    print("Saved after-4x.png")

    # 2. comparacao-native.png (960x270 + 20px label header = 960x290)
    header_h = 24
    comp_native = Image.new("RGBA", (w * 2, h + header_h), (9, 7, 17, 255))
    comp_native.paste(im_before, (0, header_h))
    comp_native.paste(im_after, (w, header_h))

    draw = ImageDraw.Draw(comp_native)
    # Header bar
    draw.rectangle([0, 0, w * 2, header_h], fill=(14, 11, 28, 255))
    draw.line([(0, header_h - 1), (w * 2, header_h - 1)], fill=(174, 98, 255, 255), width=1)
    draw.line([(w, 0), (w, h + header_h)], fill=(55, 230, 238, 255), width=1)

    draw.text((w // 2, 4), "ANTES: PROTÓTIPO COM FUNDO FÁBRICA REUTILIZADO", fill=(255, 177, 74, 255), anchor="mt")
    draw.text((w + w // 2, 4), "DEPOIS: CÂMARA DE ENERGIA (FUNDO + TILES + ALMA DEDICADOS)", fill=(55, 230, 238, 255), anchor="mt")

    comp_native.save(os.path.join(EVIDENCE_DIR, "comparacao-native.png"))
    print("Saved comparacao-native.png")

    # 3. comparacao-enlarged-4x.png (nearest-neighbor)
    comp_4x = comp_native.resize((comp_native.width * 4, comp_native.height * 4), Image.Resampling.NEAREST)
    comp_4x.save(os.path.join(EVIDENCE_DIR, "comparacao-enlarged-4x.png"))
    print("Saved comparacao-enlarged-4x.png")

    # 4. crop-plataformas-comparacao.png (Focus on Platform 1B central deck x=112..260, y=190..256)
    box_plat = (100, 185, 275, 255)
    crop_plat_before = im_before.crop(box_plat)
    crop_plat_after = im_after.crop(box_plat)
    
    pw = crop_plat_before.width
    ph = crop_plat_before.height
    plat_comp = Image.new("RGBA", (pw * 2 + 10, ph + 24), (14, 11, 28, 255))
    plat_comp.paste(crop_plat_before, (0, 24))
    plat_comp.paste(crop_plat_after, (pw + 10, 24))
    
    pdraw = ImageDraw.Draw(plat_comp)
    pdraw.text((pw // 2, 4), "ANTES (Tiles Genéricos)", fill=(255, 177, 74, 255), anchor="mt")
    pdraw.text((pw + 10 + pw // 2, 4), "DEPOIS (Supercondutor + Fosso)", fill=(55, 230, 238, 255), anchor="mt")
    
    plat_comp_4x = plat_comp.resize((plat_comp.width * 4, plat_comp.height * 4), Image.Resampling.NEAREST)
    plat_comp_4x.save(os.path.join(EVIDENCE_DIR, "crop-plataformas-comparacao.png"))
    print("Saved crop-plataformas-comparacao.png")

    # 5. crop-alma-comparacao.png (Campaign soul vs new Bonus Soul, 8x nearest-neighbor)
    soul_campaign = Image.open(os.path.join(PROJECT_ROOT, "assets", "images", "world", "souls-animation 1-000.png")).convert("RGBA")
    soul_bonus = Image.open(os.path.join(PROJECT_ROOT, "assets", "images", "world", "bonus-soul-000.png")).convert("RGBA")
    
    sw, sh = 15, 16
    soul_card = Image.new("RGBA", (sw * 2 + 20, sh + 16), (9, 7, 17, 255))
    soul_card.paste(soul_campaign, (4, 14))
    soul_card.paste(soul_bonus, (sw + 16, 14))
    
    sdraw = ImageDraw.Draw(soul_card)
    sdraw.text((4 + sw // 2, 2), "CAMPANHA", fill=(55, 230, 238, 255), anchor="mt")
    sdraw.text((sw + 16 + sw // 2, 2), "BÔNUS 10P", fill=(255, 177, 74, 255), anchor="mt")
    
    soul_card_8x = soul_card.resize((soul_card.width * 8, soul_card.height * 8), Image.Resampling.NEAREST)
    soul_card_8x.save(os.path.join(EVIDENCE_DIR, "crop-alma-comparacao.png"))
    print("Saved crop-alma-comparacao.png")

    # 6. crop-fundo-reator.png (Center reactor core comparison)
    box_core = (160, 50, 320, 190)
    core_before = im_before.crop(box_core)
    core_after = im_after.crop(box_core)
    cw, ch = core_before.size
    
    core_comp = Image.new("RGBA", (cw * 2 + 8, ch + 20), (9, 7, 17, 255))
    core_comp.paste(core_before, (0, 20))
    core_comp.paste(core_after, (cw + 8, 20))
    cdraw = ImageDraw.Draw(core_comp)
    cdraw.text((cw // 2, 3), "ANTES: Fundo Fábrica", fill=(255, 177, 74, 255), anchor="mt")
    cdraw.text((cw + 8 + cw // 2, 3), "DEPOIS: Reator de Alta Tensão", fill=(55, 230, 238, 255), anchor="mt")
    
    core_comp_3x = core_comp.resize((core_comp.width * 3, core_comp.height * 3), Image.Resampling.NEAREST)
    core_comp_3x.save(os.path.join(EVIDENCE_DIR, "crop-fundo-reator.png"))
    print("Saved crop-fundo-reator.png")

if __name__ == "__main__":
    main()
