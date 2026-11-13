#!/usr/bin/env python3
"""
tools/build-character-motion-contact-sheets.py

Generates professional contact sheets for:
- 02: BoyPunk Baseball Bat Attack Analysis (Frames 0..3 with swing arc, sweet spot, and coordinates)
- 03: BoyPunk Complete Motion Suite (Idle, Walk, Jump, Fall, Hurt, Die)
- 04: Nilo Android Motion Suite (Atompunk/nanopunk, articulated locomotion, nanorepair emitter)
- 05: Chaser Combat Droid Motion Suite (Bipedal stride, jaw snap, crimson eye)
- 06: Patrol Shooter Mechanical Suite (Patrol, Aim, Fire, Recovery)
"""

import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ASSETS_DIR = os.path.join(ROOT, "assets", "images")
BOYPUNK_DIR = os.path.join(ASSETS_DIR, "characters", "boypunk-illustrated")
NILO_DIR = os.path.join(ASSETS_DIR, "characters", "nilo-illustrated")
CHASER_DIR = os.path.join(ASSETS_DIR, "enemies", "chaser-illustrated")
PATROL_DIR = os.path.join(ASSETS_DIR, "enemies", "patrol-shooter-illustrated")
OUT_DIR = os.path.join(ROOT, "evidencias", "art", "character-motion-bat-polish")
os.makedirs(OUT_DIR, exist_ok=True)

BG_COLOR = (12, 11, 24)
CARD_BG = (20, 18, 38)
CARD_BORDER = (45, 40, 75)
TEXT_WHITE = (245, 245, 255)
TEXT_MUTED = (160, 160, 185)
CYAN_ACCENT = (56, 217, 245)
AMBER_ACCENT = (255, 180, 50)
GREEN_ACCENT = (78, 242, 150)
RED_ACCENT = (255, 85, 105)
ORANGE_ACCENT = (255, 122, 40)

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

# =============================================================================
# PRANCHA 02: BOYPUNK BAT ATTACK ANALYSIS
# =============================================================================
def make_boypunk_attack_sheet():
    frames_info = [
        ("Frame 0: Carregamento (Windup)", "attack1", 0, "Torso coiled back (-15°), peso no pé traseiro.\nTaco puxado atrás do ombro direito (-48°).\nEmpunhadura dupla pronta para carga."),
        ("Frame 1: Aceleração (Forward Drive)", "attack1", 1, "Quadril e ombros abrem para a frente.\nBraços estendem conduzindo o taco no plano horizontal.\nTransição de peso para pé dianteiro."),
        ("Frame 2: Ponto de Impacto (Strike)", "attack1", 2, "Extensão máxima na zona de colisão corpo a corpo.\nBarril maciço alinhado ao ponto de disparo.\nTorque muscular e inércia no sweet-spot."),
        ("Frame 3: Desaceleração (Follow-Through)", "attack1", 3, "Taco cruza o corpo para o lado esquerdo.\nDissipação suave de momento rotacional.\nReequilíbrio dinâmico em base sólida.")
    ]

    card_w = 215
    card_h = 340
    margin = 24
    total_w = margin * 2 + len(frames_info) * (card_w + 14) - 14
    total_h = 440

    img = Image.new("RGBA", (total_w, total_h), BG_COLOR)
    draw = ImageDraw.Draw(img)

    header_y = draw_header(
        draw,
        "BOYPUNK — ANÁLISE CINEMÁTICA DO ATAQUE COM TACO DE BEISEBOL (ATTACK1)",
        "Biomecânica de swing de rebatedor: Carregamento -> Condução horizontal -> Ponto de Impacto -> Follow-Through",
        total_w
    )

    for i, (label, st, idx, desc) in enumerate(frames_info):
        cx = margin + i * (card_w + 14)
        cy = header_y + 10

        draw.rectangle([cx, cy, cx + card_w, cy + card_h], fill=CARD_BG, outline=CARD_BORDER, width=1)
        draw.text((cx + 10, cy + 10), label, fill=ORANGE_ACCENT, font=FONT_LABEL)

        frame_path = os.path.join(BOYPUNK_DIR, f"playeranim-{st}-{idx:03d}.png")
        if os.path.exists(frame_path):
            f_img = Image.open(frame_path).convert("RGBA")
            # Crop around character body (top 30..140, x: 10..90)
            f_disp = f_img.resize((100, 150), Image.BILINEAR)
            img.paste(f_disp, (cx + 55, cy + 35), f_disp)

        draw.line([(cx + 10, cy + 195), (cx + card_w - 10, cy + 195)], fill=CARD_BORDER, width=1)

        # Description text
        lines = desc.split("\n")
        for l_idx, line in enumerate(lines):
            draw.text((cx + 10, cy + 205 + l_idx * 16), line, fill=TEXT_WHITE, font=FONT_DETAIL)

        # Coordinate annotations
        if idx == 0:
            draw.text((cx + 10, cy + 270), "• Grip: (X=31, Y=72)\n• Ângulo: -48° (atrás do ombro)\n• Colisor melee: inativo", fill=TEXT_MUTED, font=FONT_DETAIL)
        elif idx == 1:
            draw.text((cx + 10, cy + 270), "• Grip: (X=46, Y=74)\n• Ângulo: -10° (arco ascendente)\n• Colisor melee: ativando", fill=TEXT_MUTED, font=FONT_DETAIL)
        elif idx == 2:
            draw.text((cx + 10, cy + 270), "• Grip: (X=52, Y=76)\n• Ângulo: +5° (horizontal)\n• Sweet-spot: X=74 (no colisor!)", fill=GREEN_ACCENT, font=FONT_DETAIL)
        elif idx == 3:
            draw.text((cx + 10, cy + 270), "• Grip: (X=36, Y=72)\n• Ângulo: -110° (cruzando peito)\n• Colisor melee: expirando", fill=TEXT_MUTED, font=FONT_DETAIL)

    out_file = os.path.join(OUT_DIR, "02-boypunk-bat-attack-contact-sheet.png")
    img.save(out_file)
    print(f"Salvo: {out_file}")

# =============================================================================
# PRANCHA 03: BOYPUNK COMPLETE MOTION SUITE
# =============================================================================
def make_boypunk_locomotion_sheet():
    states = [
        ("IDLE 0", "idle", 0), ("IDLE 1", "idle", 1), ("IDLE 2", "idle", 2), ("IDLE 3", "idle", 3),
        ("WALK 0 (Contact)", "walk", 0), ("WALK 1 (Passing)", "walk", 1), ("WALK 2 (Contact)", "walk", 2), ("WALK 3 (Passing)", "walk", 3),
        ("JUMP (Ascent)", "jump", 0), ("FALL (Descent)", "fall", 0),
        ("HURT (Flinch)", "hurt", 0), ("DIE 3 (Rest)", "die", 3),
    ]

    cols = 6
    rows = 2
    card_w = 150
    card_h = 200
    margin = 20
    total_w = margin * 2 + cols * (card_w + 10) - 10
    total_h = 100 + rows * (card_h + 10)

    img = Image.new("RGBA", (total_w, total_h), BG_COLOR)
    draw = ImageDraw.Draw(img)

    header_y = draw_header(
        draw,
        "BOYPUNK — SUÍTE COMPLETA DE ANIMAÇÃO E LOCOMOÇÃO ARTICULADA (COM TACO)",
        "Taco de beisebol sólido integrado em idle, locomoção de 4 fases, salto, queda, dano e repouso no solo",
        total_w
    )

    for i, (label, st, idx) in enumerate(states):
        col = i % cols
        row = i // cols
        cx = margin + col * (card_w + 10)
        cy = header_y + 10 + row * (card_h + 10)

        draw.rectangle([cx, cy, cx + card_w, cy + card_h], fill=CARD_BG, outline=CARD_BORDER, width=1)
        draw.text((cx + 8, cy + 6), label, fill=TEXT_WHITE, font=FONT_LABEL)

        frame_path = os.path.join(BOYPUNK_DIR, f"playeranim-{st}-{idx:03d}.png")
        if os.path.exists(frame_path):
            f_img = Image.open(frame_path).convert("RGBA")
            f_disp = f_img.resize((85, 128), Image.BILINEAR)
            img.paste(f_disp, (cx + 32, cy + 28), f_disp)

        draw.line([(cx + 6, cy + 162), (cx + card_w - 6, cy + 162)], fill=CARD_BORDER, width=1)
        draw.text((cx + 8, cy + 170), "Taco: metal/compósito\nPés: Y=126 solo exato", fill=TEXT_MUTED, font=FONT_DETAIL)

    out_file = os.path.join(OUT_DIR, "03-boypunk-locomotion-contact-sheet.png")
    img.save(out_file)
    print(f"Salvo: {out_file}")

# =============================================================================
# PRANCHA 04: NILO ANDROID MOTION SUITE
# =============================================================================
def make_nilo_locomotion_sheet():
    states = [
        ("IDLE 0", "idle", 0), ("IDLE 1", "idle", 1), ("IDLE 2", "idle", 2), ("IDLE 3", "idle", 3),
        ("WALK 0 (Contact)", "walk", 0), ("WALK 1 (Passing)", "walk", 1), ("WALK 2 (Contact)", "walk", 2), ("WALK 3 (Passing)", "walk", 3),
        ("ATTACK 1 (Nanorepair)", "attack1", 1), ("JUMP (Ascent)", "jump", 0),
        ("HURT (Flinch)", "hurt", 0), ("DIE 3 (Rest)", "die", 3),
    ]

    cols = 6
    rows = 2
    card_w = 150
    card_h = 200
    margin = 20
    total_w = margin * 2 + cols * (card_w + 10) - 10
    total_h = 100 + rows * (card_h + 10)

    img = Image.new("RGBA", (total_w, total_h), BG_COLOR)
    draw = ImageDraw.Draw(img)

    header_y = draw_header(
        draw,
        "NILO ANDROID — SUÍTE DE LOCOMOÇÃO ARTICULADA E EMISSOR DE NANORREPARO",
        "Cerâmica marfim polida, ótica âmbar suave, juntas de grafite e antebraço curador (sem taco de beisebol)",
        total_w
    )

    for i, (label, st, idx) in enumerate(states):
        col = i % cols
        row = i // cols
        cx = margin + col * (card_w + 10)
        cy = header_y + 10 + row * (card_h + 10)

        draw.rectangle([cx, cy, cx + card_w, cy + card_h], fill=CARD_BG, outline=CARD_BORDER, width=1)
        draw.text((cx + 8, cy + 6), label, fill=AMBER_ACCENT, font=FONT_LABEL)

        frame_path = os.path.join(NILO_DIR, f"nilo-{st}-{idx:03d}.png")
        if os.path.exists(frame_path):
            f_img = Image.open(frame_path).convert("RGBA")
            f_disp = f_img.resize((85, 128), Image.BILINEAR)
            img.paste(f_disp, (cx + 32, cy + 28), f_disp)

        draw.line([(cx + 6, cy + 162), (cx + card_w - 6, cy + 162)], fill=CARD_BORDER, width=1)
        draw.text((cx + 8, cy + 170), "Cerâmica: #f0eee6\nEmissor: nanocurador", fill=TEXT_MUTED, font=FONT_DETAIL)

    out_file = os.path.join(OUT_DIR, "04-nilo-locomotion-contact-sheet.png")
    img.save(out_file)
    print(f"Salvo: {out_file}")

# =============================================================================
# PRANCHA 05: CHASER COMBAT DROID
# =============================================================================
def make_chaser_motion_sheet():
    states = [
        ("IDLE 0", "idle", 0), ("IDLE 1", "idle", 1),
        ("WALK 0", "walk", 0), ("WALK 2", "walk", 2), ("WALK 4", "walk", 4), ("WALK 6", "walk", 6),
        ("ATTACK 1 (Lunge)", "attack", 1), ("ATTACK 2 (Bite)", "attack", 2),
        ("DEAD 0", "dead", 0), ("DEAD 3 (Scrap)", "dead", 3),
    ]

    cols = 5
    rows = 2
    card_w = 175
    card_h = 190
    margin = 20
    total_w = margin * 2 + cols * (card_w + 12) - 12
    total_h = 100 + rows * (card_h + 10)

    img = Image.new("RGBA", (total_w, total_h), BG_COLOR)
    draw = ImageDraw.Draw(img)

    header_y = draw_header(
        draw,
        "CHASER COMBAT DROID — SUÍTE MECÂNICA ARTICULADA E MANDÍBULA CINÉTICA",
        "Olho monocular carmesim esférico, garras de aço temperado rebitadas e marcha mecânica bipedal",
        total_w
    )

    for i, (label, st, idx) in enumerate(states):
        col = i % cols
        row = i // cols
        cx = margin + col * (card_w + 12)
        cy = header_y + 10 + row * (card_h + 10)

        draw.rectangle([cx, cy, cx + card_w, cy + card_h], fill=CARD_BG, outline=CARD_BORDER, width=1)
        draw.text((cx + 8, cy + 6), label, fill=RED_ACCENT, font=FONT_LABEL)

        frame_path = os.path.join(CHASER_DIR, f"enemycaveira-{st}-{idx:03d}.png")
        if os.path.exists(frame_path):
            f_img = Image.open(frame_path).convert("RGBA")
            f_disp = f_img.resize((50, 100), Image.BILINEAR)
            img.paste(f_disp, (cx + 60, cy + 28), f_disp)

        draw.line([(cx + 6, cy + 145), (cx + card_w - 6, cy + 145)], fill=CARD_BORDER, width=1)
        draw.text((cx + 8, cy + 155), "Sensor: carmesim\nMandíbula: aço rebitado", fill=TEXT_MUTED, font=FONT_DETAIL)

    out_file = os.path.join(OUT_DIR, "05-chaser-motion-contact-sheet.png")
    img.save(out_file)
    print(f"Salvo: {out_file}")

# =============================================================================
# PRANCHA 06: PATROL SHOOTER MECHANICAL SUITE
# =============================================================================
def make_patrol_shooter_sheet():
    states = [
        ("PATROL 0", "patrol", 0), ("PATROL 2", "patrol", 2), ("PATROL 4", "patrol", 4), ("PATROL 6", "patrol", 6),
        ("AIM 0 (Ready)", "aim", 0), ("AIM 2 (Lock-On)", "aim", 2), ("AIM 3 (Aligned)", "aim", 3),
        ("FIRE (Recoil)", "fire", 0), ("RECOVERY 1", "recovery", 1), ("RECOVERY 3", "recovery", 3)
    ]

    cols = 5
    rows = 2
    card_w = 175
    card_h = 190
    margin = 20
    total_w = margin * 2 + cols * (card_w + 12) - 12
    total_h = 100 + rows * (card_h + 10)

    img = Image.new("RGBA", (total_w, total_h), BG_COLOR)
    draw = ImageDraw.Draw(img)

    header_y = draw_header(
        draw,
        "PATROL SHOOTER — SUÍTE DE ANIMAÇÃO ROBÓTICA 2× (CANHÃO INDUSTRIAL E MIRA)",
        "Chassis blindado grafite, sensor de mira âmbar de alta precisão e recuo mecânico estabilizado",
        total_w
    )

    for i, (label, st, idx) in enumerate(states):
        col = i % cols
        row = i // cols
        cx = margin + col * (card_w + 12)
        cy = header_y + 10 + row * (card_h + 10)

        draw.rectangle([cx, cy, cx + card_w, cy + card_h], fill=CARD_BG, outline=CARD_BORDER, width=1)
        draw.text((cx + 8, cy + 6), label, fill=AMBER_ACCENT, font=FONT_LABEL)

        frame_path = os.path.join(PATROL_DIR, f"enemypatrolshooter-{st}-{idx:03d}.png")
        if os.path.exists(frame_path):
            f_img = Image.open(frame_path).convert("RGBA")
            f_disp = f_img.resize((96, 96), Image.BILINEAR)
            img.paste(f_disp, (cx + 40, cy + 30), f_disp)

        draw.line([(cx + 6, cy + 145), (cx + card_w - 6, cy + 145)], fill=CARD_BORDER, width=1)
        draw.text((cx + 8, cy + 155), "Canhão: liga grafite\nMira: sensor âmbar", fill=TEXT_MUTED, font=FONT_DETAIL)

    out_file = os.path.join(OUT_DIR, "06-patrol-shooter-motion-contact-sheet.png")
    img.save(out_file)
    print(f"Salvo: {out_file}")

if __name__ == "__main__":
    print("Iniciando geração de pranchas comparativas e de movimento...")
    make_boypunk_attack_sheet()
    make_boypunk_locomotion_sheet()
    make_nilo_locomotion_sheet()
    make_chaser_motion_sheet()
    make_patrol_shooter_sheet()
    print("Todas as pranchas geradas com sucesso!")
