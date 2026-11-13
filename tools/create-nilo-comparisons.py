#!/usr/bin/env python3
"""
Evidence and Comparison Generator for Nilo Art Assets
BoyPunk-Web
Outputs:
- evidencias/art/nilo/comparacao-boypunk-nilo-native.png (1x native)
- evidencias/art/nilo/comparacao-boypunk-nilo-enlarged-4x.png (4x nearest-neighbor)
- evidencias/art/nilo/folha-de-contato-nilo-21frames.png (contact sheet with collider & ground line)
- evidencias/art/nilo/folha-de-contato-ambos-facings.png (contact sheet testing facing right & left)
- evidencias/art/nilo/animacao-nilo-walk.gif (12 fps loop)
- evidencias/art/nilo/animacao-nilo-idle.gif (5 fps loop)
- evidencias/art/nilo/animacao-nilo-attack.gif (22 fps attack)
"""
import os
from PIL import Image, ImageDraw, ImageFont

NILO_DIR = "assets/images/characters/nilo"
BOYPUNK_DIR = "assets/images/player-helmet"
OUT_DIR = "evidencias/art/nilo"
os.makedirs(OUT_DIR, exist_ok=True)

STATES_TO_COMPARE = [
    ("idle.0", "playeranim-idle-000.png", "nilo-idle-000.png", "Idle 0 (Repouso)"),
    ("walk.0", "playeranim-walk-000.png", "nilo-walk-000.png", "Walk 0 (Contato)"),
    ("walk.1", "playeranim-walk-001.png", "nilo-walk-001.png", "Walk 1 (Passagem)"),
    ("jump.0", "playeranim-jump-000.png", "nilo-jump-000.png", "Jump (Salto)"),
    ("fall.0", "playeranim-fall-000.png", "nilo-fall-000.png", "Fall (Queda)"),
    ("attack1.1", "playeranim-attack1-001.png", "nilo-attack1-001.png", "Attack 1 (Disparo)"),
    ("hurt.0", "playeranim-hurt-000.png", "nilo-hurt-000.png", "Hurt 0 (Impacto)"),
    ("die.3", "playeranim-die-003.png", "nilo-die-003.png", "Die 3 (Inerte)")
]

ALL_21_FRAMES = [
    ("nilo.idle.0", "nilo-idle-000.png", "idle 0"),
    ("nilo.idle.1", "nilo-idle-001.png", "idle 1"),
    ("nilo.idle.2", "nilo-idle-002.png", "idle 2"),
    ("nilo.idle.3", "nilo-idle-003.png", "idle 3"),
    ("nilo.walk.0", "nilo-walk-000.png", "walk 0"),
    ("nilo.walk.1", "nilo-walk-001.png", "walk 1"),
    ("nilo.walk.2", "nilo-walk-002.png", "walk 2"),
    ("nilo.walk.3", "nilo-walk-003.png", "walk 3"),
    ("nilo.jump.0", "nilo-jump-000.png", "jump 0"),
    ("nilo.fall.0", "nilo-fall-000.png", "fall 0"),
    ("nilo.attack1.0", "nilo-attack1-000.png", "attack 0"),
    ("nilo.attack1.1", "nilo-attack1-001.png", "attack 1"),
    ("nilo.attack1.2", "nilo-attack1-002.png", "attack 2"),
    ("nilo.attack1.3", "nilo-attack1-003.png", "attack 3"),
    ("nilo.hurt.0", "nilo-hurt-000.png", "hurt 0"),
    ("nilo.hurt.1", "nilo-hurt-001.png", "hurt 1"),
    ("nilo.hurt.2", "nilo-hurt-002.png", "hurt 2"),
    ("nilo.die.0", "nilo-die-000.png", "die 0"),
    ("nilo.die.1", "nilo-die-001.png", "die 1"),
    ("nilo.die.2", "nilo-die-002.png", "die 2"),
    ("nilo.die.3", "nilo-die-003.png", "die 3"),
]


def create_native_and_enlarged_comparisons():
    # Grid: 8 columns, 2 rows (Row 1: BoyPunk, Row 2: Nilo)
    # Cell size: 64x96 + padding
    cell_w, cell_h = 64, 96
    pad_x, pad_y = 12, 16
    header_h = 32
    cols = len(STATES_TO_COMPARE)
    rows = 2

    sheet_w = pad_x + cols * (cell_w + pad_x)
    sheet_h = header_h + pad_y + rows * (cell_h + pad_y)

    bg_color = (20, 24, 32, 255)
    img_native = Image.new("RGBA", (sheet_w, sheet_h), bg_color)
    draw = ImageDraw.Draw(img_native)

    for c, (state_id, bp_file, nilo_file, title) in enumerate(STATES_TO_COMPARE):
        x = pad_x + c * (cell_w + pad_x)

        # Title at top
        draw.text((x, 8), title.split(" ")[0], fill=(200, 215, 230, 255))

        # Ground line indicator
        # Ground line in canvas is Y=63
        y_bp = header_h + pad_y
        y_nilo = header_h + pad_y + cell_h + pad_y

        # Platform strip under each cell
        draw.line([(x - 2, y_bp + 64), (x + cell_w + 2, y_bp + 64)], fill=(50, 60, 80, 255))
        draw.line([(x - 2, y_nilo + 64), (x + cell_w + 2, y_nilo + 64)], fill=(50, 60, 80, 255))

        # BoyPunk
        bp_path = os.path.join(BOYPUNK_DIR, bp_file)
        if os.path.exists(bp_path):
            bp_img = Image.open(bp_path).convert("RGBA")
            img_native.paste(bp_img, (x, y_bp), bp_img)

        # Nilo
        nilo_path = os.path.join(NILO_DIR, nilo_file)
        if os.path.exists(nilo_path):
            nilo_img = Image.open(nilo_path).convert("RGBA")
            img_native.paste(nilo_img, (x, y_nilo), nilo_img)

    native_out = os.path.join(OUT_DIR, "comparacao-boypunk-nilo-native.png")
    img_native.save(native_out)
    print("Saved:", native_out)

    # 4x Nearest-neighbor enlarged
    img_4x = img_native.resize((sheet_w * 4, sheet_h * 4), Image.NEAREST)
    enlarged_out = os.path.join(OUT_DIR, "comparacao-boypunk-nilo-enlarged-4x.png")
    img_4x.save(enlarged_out)
    print("Saved:", enlarged_out)


def create_all_21_frames_contact_sheet():
    # 7 columns, 3 rows for 21 frames
    cols = 7
    rows = 3
    cell_w, cell_h = 64, 96
    pad_x, pad_y = 10, 16
    header_h = 24

    sheet_w = pad_x + cols * (cell_w + pad_x)
    sheet_h = header_h + rows * (cell_h + pad_y) + pad_y

    bg_color = (16, 18, 24, 255)
    sheet = Image.new("RGBA", (sheet_w, sheet_h), bg_color)
    draw = ImageDraw.Draw(sheet)

    draw.text((pad_x, 6), "NILO (ANDROID HEALER) — 21 FRAMES OBRIGATÓRIOS (64x96 RGBA)", fill=(46, 230, 168, 255))

    for idx, (key, filename, label) in enumerate(ALL_21_FRAMES):
        c = idx % cols
        r = idx // cols
        x = pad_x + c * (cell_w + pad_x)
        y = header_h + r * (cell_h + pad_y)

        # Canvas bounding box (64x96) outline
        draw.rectangle([x, y, x + cell_w - 1, y + cell_h - 1], outline=(36, 42, 54, 255))

        # Physical collider overlay relative to canonical origin: (x=5, y=32, w=22, h=32)
        coll_x1 = x + 5
        coll_y1 = y + 32
        coll_x2 = coll_x1 + 22 - 1
        coll_y2 = coll_y1 + 32 - 1
        draw.rectangle([coll_x1, coll_y1, coll_x2, coll_y2], outline=(255, 122, 40, 100))

        # Ground line at Y=63
        draw.line([(x, y + 63), (x + cell_w - 1, y + 63)], fill=(55, 230, 238, 120))

        # Body anchor guide at X=16
        draw.line([(x + 16, y + 32), (x + 16, y + 63)], fill=(255, 255, 255, 40))

        # Sprite image
        fpath = os.path.join(NILO_DIR, filename)
        if os.path.exists(fpath):
            fimg = Image.open(fpath).convert("RGBA")
            sheet.paste(fimg, (x, y), fimg)

        # Label below
        draw.text((x + 2, y + 66), label, fill=(180, 190, 205, 255))

    out_path = os.path.join(OUT_DIR, "folha-de-contato-nilo-21frames.png")
    sheet.save(out_path)
    print("Saved:", out_path)


def create_facing_contact_sheet():
    # Compare Facing Right vs Facing Left (with renderX = drawX - 32 compensation)
    # Testing Idle 0, Walk 0, Attack 1, Jump
    test_frames = [
        ("idle 0", "nilo-idle-000.png"),
        ("walk 0", "nilo-walk-000.png"),
        ("attack 1", "nilo-attack1-001.png"),
        ("jump 0", "nilo-jump-000.png"),
    ]

    cell_w, cell_h = 64, 96
    pad = 16
    cols = len(test_frames)
    rows = 2 # Row 0: Facing Right, Row 1: Facing Left (mirrored)

    sheet_w = pad + cols * (cell_w + pad)
    sheet_h = 32 + rows * (cell_h + pad) + pad

    sheet = Image.new("RGBA", (sheet_w, sheet_h), (18, 20, 28, 255))
    draw = ImageDraw.Draw(sheet)

    draw.text((pad, 8), "VERIFICAÇÃO DE FACINGS — DIREITA (ORIGINAL) E ESQUERDA (ESPELHADO NO PIVÔ X=16)", fill=(255, 200, 80, 255))

    for c, (label, fname) in enumerate(test_frames):
        x = pad + c * (cell_w + pad)
        y_r = 32 + pad
        y_l = 32 + pad + cell_h + pad

        fpath = os.path.join(NILO_DIR, fname)
        if not os.path.exists(fpath):
            continue
        im = Image.open(fpath).convert("RGBA")

        # Facing Right (canonical)
        # Ground line and collider
        draw.rectangle([x + 5, y_r + 32, x + 26, y_r + 63], outline=(255, 122, 40, 120))
        draw.line([(x, y_r + 63), (x + 63, y_r + 63)], fill=(55, 230, 238, 120))
        sheet.paste(im, (x, y_r), im)
        draw.text((x + 4, y_r + 66), f"{label} (Dir)", fill=(180, 190, 205, 255))

        # Facing Left (horizontally mirrored around body anchor X=16)
        # Note: in renderer, renderX = player.facing < 0 ? drawX - 32 : drawX;
        # drawMirrored flips horizontally across the 64px width:
        # Screen position of local px: renderX + width - px = (drawX - 32) + 64 - px = drawX + 32 - px.
        # For local px=16: drawX + 32 - 16 = drawX + 16 (identical to Facing Right: drawX + 16).
        im_flipped = im.transpose(Image.FLIP_LEFT_RIGHT)
        draw.rectangle([x + 5, y_l + 32, x + 26, y_l + 63], outline=(255, 122, 40, 120))
        draw.line([(x, y_l + 63), (x + 63, y_l + 63)], fill=(55, 230, 238, 120))
        # The engine renders im_flipped at renderX = drawX - 32:
        # In this 64px cell centered on drawX:
        # Paste with -32 offset so the flipped body (at x=48 in flipped image) lands at x=16 in the cell!
        sheet.paste(im_flipped, (x - 32, y_l), im_flipped)
        draw.text((x + 4, y_l + 66), f"{label} (Esq)", fill=(180, 190, 205, 255))

    out_path = os.path.join(OUT_DIR, "folha-de-contato-ambos-facings.png")
    sheet.save(out_path)
    print("Saved:", out_path)


def create_animated_gifs():
    # 1. Walk Cycle (4 frames @ 12 fps = 83ms per frame)
    walk_imgs = [Image.open(os.path.join(NILO_DIR, f"nilo-walk-{i:03d}.png")).convert("RGBA") for i in range(4)]
    # Scale 4x nearest-neighbor for crisp preview
    walk_4x = [img.resize((64 * 4, 96 * 4), Image.NEAREST) for img in walk_imgs]
    walk_gif = os.path.join(OUT_DIR, "animacao-nilo-walk.gif")
    walk_4x[0].save(walk_gif, save_all=True, append_images=walk_4x[1:], duration=83, loop=0, disposal=2)
    print("Saved:", walk_gif)

    # 2. Idle Cycle (4 frames @ 5 fps = 200ms per frame)
    idle_imgs = [Image.open(os.path.join(NILO_DIR, f"nilo-idle-{i:03d}.png")).convert("RGBA") for i in range(4)]
    idle_4x = [img.resize((64 * 4, 96 * 4), Image.NEAREST) for img in idle_imgs]
    idle_gif = os.path.join(OUT_DIR, "animacao-nilo-idle.gif")
    idle_4x[0].save(idle_gif, save_all=True, append_images=idle_4x[1:], duration=200, loop=0, disposal=2)
    print("Saved:", idle_gif)

    # 3. Attack Cycle (4 frames @ 22 fps = 45ms per frame)
    atk_imgs = [Image.open(os.path.join(NILO_DIR, f"nilo-attack1-{i:03d}.png")).convert("RGBA") for i in range(4)]
    atk_4x = [img.resize((64 * 4, 96 * 4), Image.NEAREST) for img in atk_imgs]
    atk_gif = os.path.join(OUT_DIR, "animacao-nilo-attack.gif")
    atk_4x[0].save(atk_gif, save_all=True, append_images=atk_4x[1:], duration=45, loop=0, disposal=2)
    print("Saved:", atk_gif)

    # 4. Heal VFX (4 frames @ 8 fps = 125ms per frame)
    heal_imgs = [Image.open(os.path.join(NILO_DIR, f"nilo-heal-{i:03d}.png")).convert("RGBA") for i in range(4)]
    heal_4x = [img.resize((32 * 4, 32 * 4), Image.NEAREST) for img in heal_imgs]
    heal_gif = os.path.join(OUT_DIR, "animacao-nilo-heal-vfx.gif")
    heal_4x[0].save(heal_gif, save_all=True, append_images=heal_4x[1:], duration=125, loop=0, disposal=2)
    print("Saved:", heal_gif)


if __name__ == "__main__":
    create_native_and_enlarged_comparisons()
    create_all_21_frames_contact_sheet()
    create_facing_contact_sheet()
    create_animated_gifs()
