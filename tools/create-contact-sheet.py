#!/usr/bin/env python3
"""
Create high-resolution labeled contact sheets for visual inspection.
"""
from PIL import Image, ImageDraw, ImageFont
import os
import glob

def make_contact_sheet(image_paths, titles, output_path, scale=4, ground_line_y=31):
    n = len(image_paths)
    cell_w = 16 * scale + 12
    cell_h = 32 * scale + 28
    sheet_w = n * cell_w + 16
    sheet_h = cell_h + 30

    sheet = Image.new("RGBA", (sheet_w, sheet_h), (10, 11, 18, 255))
    draw = ImageDraw.Draw(sheet)

    title_text = f"CHASER LOCOMOTION CYCLE ({n} FRAMES @ 12 FPS — GROUND Y={ground_line_y})"
    draw.text((12, 8), title_text, fill=(55, 230, 238, 255))

    for i, (path, title) in enumerate(zip(image_paths, titles)):
        img = Image.open(path).convert("RGBA")
        scaled = img.resize((16 * scale, 32 * scale), Image.NEAREST)

        x_offset = 12 + i * cell_w
        y_offset = 32

        # Draw box frame
        draw.rectangle([x_offset - 2, y_offset - 2, x_offset + 16 * scale + 1, y_offset + 32 * scale + 1], outline=(36, 42, 60, 255))

        # Paste sprite
        sheet.paste(scaled, (x_offset, y_offset), scaled)

        # Draw ground line (y = ground_line_y)
        ground_y = y_offset + ground_line_y * scale + (scale - 1)
        draw.line([(x_offset - 4, ground_y), (x_offset + 16 * scale + 3, ground_y)], fill=(255, 122, 40, 180), width=1)

        # Draw label
        draw.text((x_offset, y_offset + 32 * scale + 6), title, fill=(220, 225, 240, 255))

    sheet.save(output_path)
    print(f"Contact sheet saved: {output_path}")

if __name__ == "__main__":
    walk_paths = [f"assets/images/enemies/enemycaveira-walk-{i:03d}.png" for i in range(8)]
    walk_titles = [
        "0: R Strike", "1: R Dip", "2: R Pass", "3: L Reach",
        "4: L Strike", "5: L Dip", "6: L Pass", "7: R Reach"
    ]
    make_contact_sheet(walk_paths, walk_titles, "evidencias/art/chaser_locomotion_contact_sheet.png")

    state_paths = [
        "assets/images/enemies/enemycaveira-iddle-000.png",
        "assets/images/enemies/enemycaveira-walk-000.png",
        "assets/images/enemies/enemycaveira-jump-000.png",
        "assets/images/enemies/enemycaveira-attack-001.png",
        "assets/images/enemies/enemycaveira-dead-000.png"
    ]
    state_titles = ["Idle", "Walk", "Jump", "Attack", "Dead"]
    make_contact_sheet(state_paths, state_titles, "evidencias/art/chaser_contact_sheet.png")

    attack_paths = [f"assets/images/enemies/enemycaveira-attack-{i:03d}.png" for i in range(4)]
    attack_titles = ["0: Anticipate", "1: Strike", "2: Impact", "3: Recover"]
    make_contact_sheet(attack_paths, attack_titles, "evidencias/art/chaser_attack_contact_sheet.png")
