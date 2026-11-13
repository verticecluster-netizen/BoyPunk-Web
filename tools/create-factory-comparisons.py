#!/usr/bin/env python3
"""
create-factory-comparisons.py
Creates presentation contact sheets and before-and-after comparison images
for the Scrap Factory visual treatment handoff.
"""

import os
from PIL import Image, ImageDraw, ImageFont

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
ART_DIR = os.path.join(PROJECT_ROOT, "evidencias", "art")
EVIDENCIAS_DIR = os.path.join(PROJECT_ROOT, "evidencias")

FONT_TITLE = None
FONT_SUBTITLE = None
FONT_BODY = None

try:
    FONT_TITLE = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
    FONT_SUBTITLE = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13)
    FONT_BODY = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 11)
    FONT_LABEL = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 12)
except Exception:
    FONT_TITLE = ImageFont.load_default()
    FONT_SUBTITLE = ImageFont.load_default()
    FONT_BODY = ImageFont.load_default()
    FONT_LABEL = ImageFont.load_default()

def create_before_after():
    before_path = os.path.join(EVIDENCIAS_DIR, "10-factory-entry.png")
    after_path = os.path.join(ART_DIR, "scrap_factory_overview.png")
    if not os.path.exists(before_path) or not os.path.exists(after_path):
        print("Missing source images for before/after comparison.")
        return

    im_before = Image.open(before_path).convert("RGB")
    im_after = Image.open(after_path).convert("RGB")
    
    # Scale to standard width 640 for comparison
    w, h = 640, int(640 * im_before.height / im_before.width)
    before_resized = im_before.resize((w, h), Image.Resampling.LANCZOS)
    after_resized = im_after.resize((w, h), Image.Resampling.LANCZOS)
    
    # Header banner + two panels side-by-side + labels
    header_h = 56
    pad = 16
    total_w = w * 2 + pad * 3
    total_h = h + header_h + pad * 2 + 30
    
    comp = Image.new("RGB", (total_w, total_h), (10, 11, 16))
    draw = ImageDraw.Draw(comp)
    
    # Draw header
    draw.rectangle([0, 0, total_w, header_h], fill=(16, 18, 26))
    draw.line([0, header_h, total_w, header_h], fill=(46, 200, 212), width=2)
    
    # Title
    draw.text((pad, 12), "BOYPUNK! WEB — FÁBRICA DE SUCATA (SCRAP-FACTORY)", font=FONT_TITLE, fill=(212, 251, 255))
    draw.text((pad, 34), "Comparação Antes (Protótipo Provisório) vs Depois (Tratamento Visual Integrado)", font=FONT_SUBTITLE, fill=(255, 133, 34))
    
    # Place panels
    y_pos = header_h + pad
    x_before = pad
    x_after = pad * 2 + w
    
    comp.paste(before_resized, (x_before, y_pos))
    comp.paste(after_resized, (x_after, y_pos))
    
    # Panel borders
    draw.rectangle([x_before - 1, y_pos - 1, x_before + w, y_pos + h], outline=(60, 68, 85), width=1)
    draw.rectangle([x_after - 1, y_pos - 1, x_after + w, y_pos + h], outline=(46, 200, 212), width=1)
    
    # Labels
    draw.text((x_before + 8, y_pos + h + 8), "PROTÓTIPO ANTERIOR: Fundo reaproveitado com wash marrom, prensa provisional retangular", font=FONT_LABEL, fill=(180, 190, 205))
    draw.text((x_after + 8, y_pos + h + 8), "ARTE FINAL INTEGRADA: Hall industrial, catwalks metálicos, prensa hidráulica com guias e pistão", font=FONT_LABEL, fill=(55, 230, 238))
    
    out_path = os.path.join(ART_DIR, "scrap_factory_before_after_comparison.png")
    comp.save(out_path, format="PNG", optimize=True)
    print(f"Saved before/after comparison to {out_path}")

def create_press_states_sheet():
    states = [
        ("press_phase_idle.png", "1. IDLE (2.80s / 4.00s inicial)", "Fase de espera estável e segura.\nFolga vertical aberta de 80px.\nLED nominal ciano no manômetro.\nPassagem segura sob a prensa."),
        ("press_phase_warning.png", "2. WARNING (1.25s)", "Telegrafia pré-golpe sem dano.\nChevrons ▼▼▼ e tremor mecânico.\nProjeção de linhas no piso da bigorna.\nStrobe âmbar e jatos de alívio."),
        ("press_phase_closing.png", "3. CLOSING (0.65s)", "GOLPE PERIGOSO ATIVO.\nCurso descendente veloz (80px).\nIncandescência térmica na lâmina.\nAlarme vermelho e manômetro no pico."),
        ("press_phase_recovery.png", "4. RECOVERY (1.35s)", "Retração hidráulica ascendente.\nRetorno suave para idleY (128px).\nAlívio de pressão e resfriamento.\nJanela de passagem restabelecida.")
    ]
    
    panels = []
    # Crop region around the press corridor: x=190..290 (normalized), y=10..245 (normalized)
    for filename, title, desc in states:
        p = os.path.join(ART_DIR, filename)
        if not os.path.exists(p):
            print(f"Missing {p}")
            return
        im = Image.open(p).convert("RGB")
        # In 1280x720 window, canvas is centered or stretched.
        # Let's crop the central vertical band of the screen
        cw, ch = im.size
        # The press is at logical x=218..262 on 480x270 canvas.
        # Crop logical region: x=195..285, y=8..252 (width 90, height 244)
        lx0, ly0 = 195.0 / 480.0, 8.0 / 270.0
        lx1, ly1 = 285.0 / 480.0, 255.0 / 270.0
        
        crop_box = (int(cw * lx0), int(ch * ly0), int(cw * lx1), int(ch * ly1))
        cropped = im.crop(crop_box)
        # Resize to 220x480
        pw, ph = 220, 480
        resized = cropped.resize((pw, ph), Image.Resampling.LANCZOS)
        panels.append((resized, title, desc))
        
    # 4 panels side-by-side
    header_h = 56
    footer_h = 90
    pad = 16
    total_w = len(panels) * 220 + (len(panels) + 1) * pad
    total_h = header_h + 480 + footer_h + pad * 2
    
    sheet = Image.new("RGB", (total_w, total_h), (10, 11, 16))
    draw = ImageDraw.Draw(sheet)
    
    # Header
    draw.rectangle([0, 0, total_w, header_h], fill=(16, 18, 26))
    draw.line([0, header_h, total_w, header_h], fill=(255, 133, 34), width=2)
    draw.text((pad, 12), "PRENSA INDUSTRIAL HIDRÁULICA — ESTADOS DE CICLO E TELEGRAFIA", font=FONT_TITLE, fill=(212, 251, 255))
    draw.text((pad, 34), "scrap-press-01 (44×16 px) · Stroke 80px (y=128 a 208) · Hitbox e temporização 100% preservadas", font=FONT_SUBTITLE, fill=(255, 180, 54))
    
    for i, (p_im, title, desc) in enumerate(panels):
        x = pad + i * (220 + pad)
        y = header_h + pad
        
        # Draw frame
        border_col = (255, 79, 56) if "CLOSING" in title else (255, 178, 54) if "WARNING" in title else (46, 200, 212)
        draw.rectangle([x - 1, y - 1, x + 220, y + 480], outline=border_col, width=2)
        sheet.paste(p_im, (x, y))
        
        # Titles and description in footer
        draw.text((x, y + 488), title, font=FONT_LABEL, fill=border_col)
        # Lines in description
        lines = desc.split("\n")
        for line_idx, line in enumerate(lines):
            draw.text((x, y + 508 + line_idx * 16), line, font=FONT_BODY, fill=(175, 185, 200))
            
    out_path = os.path.join(ART_DIR, "scrap_factory_press_states_comparison.png")
    sheet.save(out_path, format="PNG", optimize=True)
    print(f"Saved press states sheet to {out_path}")

if __name__ == "__main__":
    create_before_after()
    create_press_states_sheet()
