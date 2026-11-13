#!/usr/bin/env python3
"""
Generate Visual Validation Contact Sheets and Animated GIFs for:
- BoyPunk Player Defeat Sequence (64x96 RGBA)
- Chaser Combat Droid Defeat Sequence (16x32 RGBA)
- Master Character Animations Overview Sheet
BoyPunk-Web Art Direction & Technical Animation Review
"""
from PIL import Image, ImageDraw
import hashlib
import os

def get_hash(img_path):
    with open(img_path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()[:8]

def create_player_defeat_contact_sheet():
    paths = [
        f"assets/images/player-helmet/playeranim-die-{i:03d}.png" for i in range(4)
    ]
    phases = [
        "0: Recoil Stagger (Visor Flash)",
        "1: Knee Buckle (Center Drop)",
        "2: Deck Slam (Kinetic Rebound)",
        "3: Motionless Rest (Power-Down)"
    ]
    notes = [
        "Torso snaps back, visor flares cyan, weapon slips loose",
        "Pelvis drops 8px, front knee buckles, weapon tumbles",
        "Shoulders hit deck, boots kick up 4px in rebound, visor dims",
        "Settled flat on deck, weapon resting beside hand, visor off"
    ]

    scale = 3
    n = 4
    fw = 64 * scale
    fh = 96 * scale
    col_w = fw + 24
    margin_x = 24
    margin_y = 20
    header_h = 75

    sheet_w = margin_x * 2 + n * col_w
    sheet_h = header_h + fh + 150

    sheet = Image.new("RGBA", (sheet_w, sheet_h), (10, 11, 18, 255))
    draw = ImageDraw.Draw(sheet)

    # Title & Subtitle
    draw.text((margin_x, margin_y), "BOYPUNK PROTAGONIST — DEFEAT ANIMATION SEQUENCE", fill=(55, 230, 238, 255))
    draw.text((margin_x, margin_y + 18), "CANONICAL 64x96 RGBA FORMAT — ZERO VERTICAL DISTORTION — GROUND CONTACT AT Y=63", fill=(255, 205, 80, 255))
    draw.text((margin_x, margin_y + 36), "Orange reference line = Ground floor contact (y = 63 in 64x96 canvas) | Nearest-Neighbor scaling", fill=(160, 170, 195, 255))

    y_pos = margin_y + header_h
    for i in range(n):
        x = margin_x + i * col_w
        y = y_pos
        img = Image.open(paths[i]).convert("RGBA")
        scaled = img.resize((fw, fh), Image.NEAREST)

        # Border
        draw.rectangle([x - 2, y - 2, x + fw + 1, y + fh + 1], outline=(45, 52, 70, 255), width=1)
        sheet.paste(scaled, (x, y), scaled)

        # Ground line at y=63
        ground_y = y + 63 * scale + scale - 1
        draw.line([(x - 6, ground_y), (x + fw + 5, ground_y)], fill=(255, 122, 40, 220), width=2)
        draw.text((x + fw - 42, ground_y + 3), "y=63 ground", fill=(255, 122, 40, 220))

        # Labels
        draw.text((x, y + fh + 6), phases[i], fill=(220, 230, 255, 255))
        draw.text((x, y + fh + 20), f"sha:{get_hash(paths[i])} | size: 64x96", fill=(130, 140, 160, 255))
        draw.text((x, y + fh + 34), notes[i], fill=(160, 190, 175, 255))

    # Native 1x previews
    native_y = y_pos + fh + 62
    draw.text((margin_x, native_y), "Native 1x Gameplay Size:", fill=(255, 205, 80, 255))
    for i in range(n):
        img = Image.open(paths[i]).convert("RGBA")
        nx = margin_x + i * 80
        ny = native_y + 16
        draw.rectangle([nx - 1, ny - 1, nx + 64, ny + 96], outline=(30, 36, 50, 255))
        sheet.paste(img, (nx, ny), img)
        # Ground line 1x
        draw.line([(nx - 2, ny + 63), (nx + 65, ny + 63)], fill=(255, 122, 40, 200), width=1)

    out_path = "evidencias/art/player_defeat_contact_sheet.png"
    sheet.save(out_path)
    print(f"Generated {out_path}")


def create_player_defeat_before_after_sheet():
    before_paths = [
        "evidencias/recovery/playeranim-die-000-original-64x32.png",
        "evidencias/recovery/playeranim-die-001-original-64x32.png",
        "evidencias/recovery/playeranim-die-002-original-64x32.png"
    ]
    after_paths = [
        f"assets/images/player-helmet/playeranim-die-{i:03d}.png" for i in range(4)
    ]

    scale = 3
    col_w = 64 * scale + 20
    margin_x = 24
    margin_y = 20
    header_h = 70

    sheet_w = margin_x * 2 + 4 * col_w + 30
    sheet_h = 750

    sheet = Image.new("RGBA", (sheet_w, sheet_h), (10, 11, 18, 255))
    draw = ImageDraw.Draw(sheet)

    draw.text((margin_x, margin_y), "BOYPUNK PLAYER DEFEAT — BEFORE VS AFTER COMPARISON", fill=(55, 230, 238, 255))
    draw.text((margin_x, margin_y + 18), "DEFECT RESOLUTION: INCONSISTENT 64x32 CANVAS & REPEATED IDLE POSE -> ARTICULATED 64x96 RGBA", fill=(255, 205, 80, 255))
    draw.text((margin_x, margin_y + 36), "Red/Orange lines = alignment reference | Left: Legacy 64x32 (Stretched 3x in 64x96 renderer) | Right: Corrected 64x96", fill=(160, 170, 195, 255))

    # Row 1: BEFORE (64x32 images, showing how renderer was forced to stretch them 3x vertically)
    y_row1 = margin_y + header_h
    draw.text((margin_x, y_row1), "BEFORE (Construct 3 Crop: 64x32 Canvas — Stretched 3x in 64x96 Renderer — Frame 0 was copy of Idle)", fill=(240, 80, 80, 255))

    before_labels = [
        "0: DUPLICATE (== idle-000)",
        "1: Static Shift (feet cut)",
        "2: Abrupt Floor Rest (4 colors)"
    ]

    for i in range(3):
        x = margin_x + i * col_w
        y = y_row1 + 18
        img = Image.open(before_paths[i]).convert("RGBA")
        # In renderer, drawImage(img, ..., 64, 96) stretched 64x32 into 64x96!
        stretched_h = 96 * scale
        stretched_w = 64 * scale
        stretched = img.resize((stretched_w, stretched_h), Image.NEAREST)

        draw.rectangle([x - 2, y - 2, x + stretched_w + 1, y + stretched_h + 1], outline=(200, 60, 60, 255), width=2)
        sheet.paste(stretched, (x, y), stretched)

        draw.text((x, y + stretched_h + 4), before_labels[i], fill=(255, 120, 120, 255))
        draw.text((x, y + stretched_h + 18), f"64x32 stretched 3x -> {get_hash(before_paths[i])}", fill=(160, 140, 140, 255))

    # Row 2: AFTER (Full 64x96 RGBA canon)
    y_row2 = y_row1 + 96 * scale + 65
    draw.text((margin_x, y_row2), "AFTER (Canonical 64x96 Canvas — Ground Contact at y=63 — Articulated Fall & Weapon Drop)", fill=(80, 240, 140, 255))

    after_labels = [
        "0: Recoil Stagger",
        "1: Center Collapse",
        "2: Deck Slam Rebound",
        "3: Settled Prone Rest"
    ]

    for i in range(4):
        x = margin_x + i * col_w
        y = y_row2 + 18
        img = Image.open(after_paths[i]).convert("RGBA")
        fw = 64 * scale
        fh = 96 * scale
        scaled = img.resize((fw, fh), Image.NEAREST)

        draw.rectangle([x - 2, y - 2, x + fw + 1, y + fh + 1], outline=(50, 200, 100, 255), width=2)
        sheet.paste(scaled, (x, y), scaled)

        # Ground line y=63
        ground_y = y + 63 * scale + scale - 1
        draw.line([(x - 4, ground_y), (x + fw + 3, ground_y)], fill=(255, 122, 40, 220), width=1)

        draw.text((x, y + fh + 4), after_labels[i], fill=(120, 255, 160, 255))
        draw.text((x, y + fh + 18), f"64x96 1:1 -> {get_hash(after_paths[i])}", fill=(140, 180, 160, 255))

    out_path = "evidencias/art/player_defeat_before_after_contact_sheet.png"
    sheet.save(out_path)
    print(f"Generated {out_path}")


def create_player_defeat_gif():
    paths = [f"assets/images/player-helmet/playeranim-die-{i:03d}.png" for i in range(4)]
    scale = 3
    frames = []
    # Hold last frame longer to represent settling
    durations = [120, 120, 140, 800] # ms

    for p in paths:
        im = Image.open(p).convert("RGBA")
        scaled = im.resize((64 * scale, 96 * scale), Image.NEAREST)
        # Create solid dark backdrop for crisp GIF display
        bg = Image.new("RGBA", scaled.size, (16, 13, 31, 255))
        bg.paste(scaled, (0, 0), scaled)
        frames.append(bg.convert("P", palette=Image.ADAPTIVE))

    out_path = "evidencias/art/player_defeat_animation_preview.gif"
    frames[0].save(out_path, save_all=True, append_images=frames[1:], duration=durations, loop=0)
    print(f"Generated {out_path}")


def create_chaser_defeat_contact_sheet():
    paths = [f"assets/images/enemies/enemycaveira-dead-{i:03d}.png" for i in range(4)]
    phases = [
        "0: Kinetic Breach (Reactor Overload)",
        "1: Knee Buckle (Hydraulic Drop)",
        "2: Deck Slam (Impact Rebound)",
        "3: Inert Wreck (Power-Down)"
    ]
    notes = [
        "Chassis recoils back, core ruptures in cyan bloom, optic glitches",
        "Weight buckles onto front knee, blade tip drops to deck, smoke vents",
        "Torso crashes to floor, spark discharge, rear leg rebounds at y=28",
        "Dormant wreckage settled on floor deck at y=31, optics powered off"
    ]

    scale = 5
    n = 4
    fw = 16 * scale
    fh = 32 * scale
    col_w = fw + 32
    margin_x = 24
    margin_y = 20
    header_h = 75

    sheet_w = margin_x * 2 + n * col_w + 40
    sheet_h = header_h + fh + 150

    sheet = Image.new("RGBA", (sheet_w, sheet_h), (12, 14, 22, 255))
    draw = ImageDraw.Draw(sheet)

    draw.text((margin_x, margin_y), "CHASER COMBAT DROID — DEFEAT ANIMATION SEQUENCE", fill=(55, 230, 238, 255))
    draw.text((margin_x, margin_y + 18), "16x32 RGBA CANONICAL FORMAT — GROUND CONTACT AT Y=31 — ARTICULATED KINETICS", fill=(255, 205, 80, 255))
    draw.text((margin_x, margin_y + 36), "Orange line = Ground contact reference (y=31) | Nearest-Neighbor enlargement (5x)", fill=(160, 170, 195, 255))

    y_pos = margin_y + header_h
    for i in range(n):
        x = margin_x + i * col_w
        y = y_pos
        img = Image.open(paths[i]).convert("RGBA")
        scaled = img.resize((fw, fh), Image.NEAREST)

        draw.rectangle([x - 2, y - 2, x + fw + 1, y + fh + 1], outline=(45, 52, 70, 255), width=1)
        sheet.paste(scaled, (x, y), scaled)

        # Ground line at y=31
        ground_y = y + 31 * scale + scale - 1
        draw.line([(x - 6, ground_y), (x + fw + 5, ground_y)], fill=(255, 122, 40, 220), width=2)
        draw.text((x + fw - 42, ground_y + 3), "y=31 ground", fill=(255, 122, 40, 220))

        draw.text((x, y + fh + 6), phases[i], fill=(220, 230, 255, 255))
        draw.text((x, y + fh + 20), f"sha:{get_hash(paths[i])} | 16x32 RGBA", fill=(130, 140, 160, 255))
        draw.text((x, y + fh + 34), notes[i], fill=(160, 190, 175, 255))

    # Native 1x previews
    native_y = y_pos + fh + 60
    draw.text((margin_x, native_y), "Native 1x Gameplay Size:", fill=(255, 205, 80, 255))
    for i in range(n):
        img = Image.open(paths[i]).convert("RGBA")
        nx = margin_x + i * 36
        ny = native_y + 16
        draw.rectangle([nx - 1, ny - 1, nx + 16, ny + 32], outline=(30, 36, 50, 255))
        sheet.paste(img, (nx, ny), img)
        draw.line([(nx - 2, ny + 31), (nx + 17, ny + 31)], fill=(255, 122, 40, 200), width=1)

    out_path = "evidencias/art/chaser_defeat_contact_sheet.png"
    sheet.save(out_path)
    print(f"Generated {out_path}")


def create_chaser_defeat_before_after_sheet():
    before_path = "evidencias/recovery/enemycaveira-dead-000-original.png"
    after_paths = [f"assets/images/enemies/enemycaveira-dead-{i:03d}.png" for i in range(4)]

    scale = 5
    col_w = 16 * scale + 30
    margin_x = 24
    margin_y = 20
    header_h = 70

    sheet_w = margin_x * 2 + 4 * col_w + 30
    sheet_h = 620

    sheet = Image.new("RGBA", (sheet_w, sheet_h), (12, 14, 22, 255))
    draw = ImageDraw.Draw(sheet)

    draw.text((margin_x, margin_y), "CHASER DROID DEFEAT — BEFORE VS AFTER COMPARISON", fill=(55, 230, 238, 255))
    draw.text((margin_x, margin_y + 18), "DEFECT RESOLUTION: SINGLE STATIC POSE (REMOVED IMMEDIATELY) -> 4-FRAME ARTICULATED DESTRUCTION", fill=(255, 205, 80, 255))
    draw.text((margin_x, margin_y + 36), "Nearest-Neighbor scaling (5x) | Ground contact y=31 | Preserving inert wreck silhouette as final resting pose", fill=(160, 170, 195, 255))

    # Row 1: BEFORE (Single pose)
    y_row1 = margin_y + header_h
    draw.text((margin_x, y_row1), "BEFORE (Only 1 static frame: droid already dead on floor, entity removed instantly in code)", fill=(240, 80, 80, 255))

    x = margin_x
    y = y_row1 + 18
    img = Image.open(before_path).convert("RGBA")
    fw = 16 * scale
    fh = 32 * scale
    scaled = img.resize((fw, fh), Image.NEAREST)

    draw.rectangle([x - 2, y - 2, x + fw + 1, y + fh + 1], outline=(200, 60, 60, 255), width=2)
    sheet.paste(scaled, (x, y), scaled)
    draw.text((x, y + fh + 4), "0: Static Rest (1 frame only)", fill=(255, 120, 120, 255))
    draw.text((x, y + fh + 18), f"sha:{get_hash(before_path)}", fill=(160, 140, 140, 255))

    draw.text((x + col_w, y + 40), "<--- No destruction sequence, no breach recoil, no knee buckle.", fill=(220, 150, 150, 255))

    # Row 2: AFTER (4 frames)
    y_row2 = y_row1 + fh + 55
    draw.text((margin_x, y_row2), "AFTER (4 Articulated Frames: Breach Recoil -> Knee Buckle -> Deck Slam -> Inert Wreckage)", fill=(80, 240, 140, 255))

    after_labels = [
        "0: Core Breach",
        "1: Knee Buckle",
        "2: Deck Slam",
        "3: Inert Rest"
    ]

    for i in range(4):
        x = margin_x + i * col_w
        y = y_row2 + 18
        img = Image.open(after_paths[i]).convert("RGBA")
        scaled = img.resize((fw, fh), Image.NEAREST)

        draw.rectangle([x - 2, y - 2, x + fw + 1, y + fh + 1], outline=(50, 200, 100, 255), width=2)
        sheet.paste(scaled, (x, y), scaled)

        # Ground line y=31
        ground_y = y + 31 * scale + scale - 1
        draw.line([(x - 4, ground_y), (x + fw + 3, ground_y)], fill=(255, 122, 40, 220), width=1)

        draw.text((x, y + fh + 4), after_labels[i], fill=(120, 255, 160, 255))
        draw.text((x, y + fh + 18), f"sha:{get_hash(after_paths[i])}", fill=(140, 180, 160, 255))

    out_path = "evidencias/art/chaser_defeat_before_after_contact_sheet.png"
    sheet.save(out_path)
    print(f"Generated {out_path}")


def create_chaser_defeat_gif():
    paths = [f"assets/images/enemies/enemycaveira-dead-{i:03d}.png" for i in range(4)]
    scale = 5
    frames = []
    durations = [90, 100, 120, 700] # ms

    for p in paths:
        im = Image.open(p).convert("RGBA")
        scaled = im.resize((16 * scale, 32 * scale), Image.NEAREST)
        bg = Image.new("RGBA", scaled.size, (14, 11, 24, 255))
        bg.paste(scaled, (0, 0), scaled)
        frames.append(bg.convert("P", palette=Image.ADAPTIVE))

    out_path = "evidencias/art/chaser_defeat_animation_preview.gif"
    frames[0].save(out_path, save_all=True, append_images=frames[1:], duration=durations, loop=0)
    print(f"Generated {out_path}")


def create_master_character_animations_overview():
    """Generates a complete overview contact sheet of all project animations."""
    sheet_w = 980
    sheet_h = 760
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (9, 7, 20, 255))
    draw = ImageDraw.Draw(sheet)

    draw.text((24, 18), "BOYPUNK-WEB — MASTER CHARACTER ANIMATIONS OVERVIEW", fill=(55, 230, 238, 255))
    draw.text((24, 34), "ALL COMPLETE AND VERIFIED ARTWORK ASSETS (2X / 4X NEAREST-NEIGHBOR VISUAL AUDIT)", fill=(255, 205, 80, 255))

    # SECTION 1: BOYPUNK PLAYER (64x96)
    y_sec1 = 65
    draw.text((24, y_sec1), "PROTAGONIST (BOYPUNK) — 64x96 RGBA — PALETTE: SLATE / CYBER GREEN / NEON CYAN / AMBER", fill=(200, 220, 255, 255))

    player_anims = [
        ("idle", 4, "Idle (4f @ 5fps)"),
        ("walk", 4, "Walk (4f @ 12fps)"),
        ("jump", 1, "Jump (1f)"),
        ("fall", 1, "Fall (1f)"),
        ("attack1", 4, "Attack (4f @ 22fps)"),
        ("hurt", 3, "Hurt (3f)"),
        ("die", 4, "Defeat (4f @ 10fps)")
    ]

    p_scale = 1 # 1x native in master overview, with key states shown at 2x
    cx = 24
    cy = y_sec1 + 20
    for state, count, label in player_anims:
        draw.text((cx, cy), label, fill=(160, 180, 210, 255))
        for f in range(count):
            p = f"assets/images/player-helmet/playeranim-{state}-{f:03d}.png"
            if os.path.exists(p):
                im = Image.open(p).convert("RGBA")
                # 1.5x scale
                sw, sh = int(64 * 1.0), int(96 * 1.0)
                scaled = im.resize((sw, sh), Image.NEAREST)
                px_pos = cx + f * 56
                sheet.paste(scaled, (px_pos, cy + 14), scaled)
        cx += count * 56 + 18
        if cx > sheet_w - 200 and state != "die":
            cx = 24
            cy += 120

    # SECTION 2: CHASER ROBOT (16x32)
    y_sec2 = 330
    draw.text((24, y_sec2), "GROUND CHASER COMBAT DROID — 16x32 RGBA — 15-COLOR CYBERPUNK PALETTE", fill=(200, 220, 255, 255))

    chaser_anims = [
        ("iddle", 2, "Idle (2f @ 3fps)"),
        ("walk", 8, "Walk (8f @ 12fps)"),
        ("jump", 1, "Jump (1f)"),
        ("attack", 4, "Attack (4f @ 22fps)"),
        ("dead", 4, "Defeat (4f @ 12fps)")
    ]

    cx = 24
    cy = y_sec2 + 20
    for state, count, label in chaser_anims:
        draw.text((cx, cy), label, fill=(160, 180, 210, 255))
        for f in range(count):
            p = f"assets/images/enemies/enemycaveira-{state}-{f:03d}.png"
            if os.path.exists(p):
                im = Image.open(p).convert("RGBA")
                sw, sh = 16 * 2, 32 * 2 # 2x
                scaled = im.resize((sw, sh), Image.NEAREST)
                px_pos = cx + f * 36
                sheet.paste(scaled, (px_pos, cy + 14), scaled)
        cx += count * 36 + 20
        if cx > sheet_w - 200 and state != "dead":
            cx = 24
            cy += 85

    # SECTION 3: SHOOTER TURRET (32x32 / 16x32)
    y_sec3 = 540
    draw.text((24, y_sec3), "STATIONARY SHOOTER TURRET — 32x32 RGBA (READY/SHOOTING) & 16x32 (CREATED/OUT)", fill=(200, 220, 255, 255))

    cx = 24
    cy = y_sec3 + 20
    # Ready
    draw.text((cx, cy), "Ready (1f)", fill=(160, 180, 210, 255))
    im = Image.open("assets/images/enemies/enemytorreta-ready-000.png").convert("RGBA")
    sheet.paste(im.resize((64, 64), Image.NEAREST), (cx, cy + 14), im.resize((64, 64), Image.NEAREST))
    cx += 80

    # Shooting
    draw.text((cx, cy), "Shooting / Recoil (4f)", fill=(160, 180, 210, 255))
    for f in range(4):
        p = f"assets/images/enemies/enemytorreta-shooting-{f:03d}.png"
        im = Image.open(p).convert("RGBA")
        sheet.paste(im.resize((64, 64), Image.NEAREST), (cx + f * 70, cy + 14), im.resize((64, 64), Image.NEAREST))
    cx += 4 * 70 + 20

    # Created (Deploy)
    draw.text((cx, cy), "Created Pod (5f)", fill=(160, 180, 210, 255))
    for f in range(5):
        p = f"assets/images/enemies/enemytorreta-created-{f:03d}.png"
        im = Image.open(p).convert("RGBA")
        sheet.paste(im.resize((32, 64), Image.NEAREST), (cx + f * 38, cy + 14), im.resize((32, 64), Image.NEAREST))

    out_path = "evidencias/art/complete_character_animations_overview.png"
    sheet.save(out_path)
    print(f"Generated {out_path}")


if __name__ == "__main__":
    os.makedirs("evidencias/art", exist_ok=True)
    print("Generating visual evidence sheets and GIFs...")
    create_player_defeat_contact_sheet()
    create_player_defeat_before_after_sheet()
    create_player_defeat_gif()
    create_chaser_defeat_contact_sheet()
    create_chaser_defeat_before_after_sheet()
    create_chaser_defeat_gif()
    create_master_character_animations_overview()
    print("All evidence sheets and GIFs successfully created.")
