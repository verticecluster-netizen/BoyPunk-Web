#!/usr/bin/env python3
"""
Generate Before vs After Comparison Sheet for Chaser Combat Droid.
BoyPunk-Web Art Direction
"""
from PIL import Image, ImageDraw, ImageFont
import tarfile
import io

def generate_comparison():
    # 1. Extract old frames from our checkpoint tarball
    checkpoint_tar = "/home/flow/Projetos/Backups/BoyPunk-Web/BoyPunk-Web-checkpoint-art-director-20261023123145.tar.gz"
    old_frames = []
    with tarfile.open(checkpoint_tar, "r:gz") as tar:
        for i in range(8):
            member = tar.getmember(f"./assets/images/enemies/enemycaveira-walk-{i:03d}.png")
            f = tar.extractfile(member)
            img = Image.open(io.BytesIO(f.read())).convert("RGBA")
            old_frames.append(img)

    # 2. Load new frames
    new_frames = [Image.open(f"assets/images/enemies/enemycaveira-walk-{i:03d}.png").convert("RGBA") for i in range(8)]

    scale = 4
    n = 8
    frame_w = 16 * scale
    frame_h = 32 * scale
    col_w = frame_w + 14
    margin_x = 16
    margin_y = 16
    header_h = 40
    row_h = frame_h + 36

    sheet_w = margin_x * 2 + n * col_w
    sheet_h = margin_y * 2 + header_h + row_h * 2

    sheet = Image.new("RGBA", (sheet_w, sheet_h), (12, 14, 22, 255))
    draw = ImageDraw.Draw(sheet)

    # Header
    draw.text((margin_x, margin_y), "CHASER COMBAT DROID — LOCOMOTION COMPARISON (8 FRAMES @ 12 FPS)", fill=(55, 230, 238, 255))
    draw.text((margin_x, margin_y + 18), "TOP: PREVIOUS RIGID PLACEHOLDER   |   BOTTOM: NEW ARTICULATED BIOMECHANICAL RIG", fill=(255, 122, 40, 255))

    phases = [
        "0: R Strike", "1: R Dip", "2: R Pass", "3: L Reach",
        "4: L Strike", "5: L Dip", "6: L Pass", "7: R Reach"
    ]

    # Row 1: Old Frames
    y_old = margin_y + header_h
    draw.text((margin_x, y_old), "PREVIOUS: FROZEN TORSO / DUPLICATE LEG PHASES (5==1, 6==2, 7==3)", fill=(200, 100, 100, 255))
    for i in range(n):
        x = margin_x + i * col_w
        y = y_old + 16
        scaled = old_frames[i].resize((frame_w, frame_h), Image.NEAREST)
        draw.rectangle([x - 2, y - 2, x + frame_w + 1, y + frame_h + 1], outline=(40, 45, 60, 255))
        sheet.paste(scaled, (x, y), scaled)
        ground_y = y + 31 * scale + scale - 1
        draw.line([(x - 4, ground_y), (x + frame_w + 3, ground_y)], fill=(120, 60, 60, 200), width=1)
        draw.text((x, y + frame_h + 4), phases[i], fill=(160, 165, 180, 255))

    # Row 2: New Frames
    y_new = y_old + row_h
    draw.text((margin_x, y_new), "NEW: ARTICULATED CHASSIS / ALTERNATING STRIDE / KNEE FLEXION / COUNTER-MOTION", fill=(100, 240, 150, 255))
    for i in range(n):
        x = margin_x + i * col_w
        y = y_new + 16
        scaled = new_frames[i].resize((frame_w, frame_h), Image.NEAREST)
        draw.rectangle([x - 2, y - 2, x + frame_w + 1, y + frame_h + 1], outline=(55, 230, 238, 120))
        sheet.paste(scaled, (x, y), scaled)
        ground_y = y + 31 * scale + scale - 1
        draw.line([(x - 4, ground_y), (x + frame_w + 3, ground_y)], fill=(255, 122, 40, 220), width=1)
        draw_col = (255, 205, 80, 255) if i in [2, 6] else (220, 230, 255, 255)
        draw.text((x, y + frame_h + 4), phases[i], fill=draw_col)

    out_path = "evidencias/art/chaser_before_after_comparison.png"
    sheet.save(out_path)
    print(f"Comparison saved: {out_path}")

if __name__ == "__main__":
    generate_comparison()
