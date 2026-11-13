#!/usr/bin/env python3
"""
Generate high-fidelity evidence artifacts for Patrol-Shooter enemy:
- Labeled animation contact sheet
- Native-size and 4x nearest-neighbor comparisons (Turret vs Mobile Patrol Shooter)
- Animated loop (GIF and WebP) demonstrating complete sequence (Patrol -> Aim -> Fire -> Recovery)
"""
import os
import glob
from PIL import Image, ImageDraw, ImageFont

root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
art_dir = os.path.join(root, "assets", "images", "enemies")
out_dir = os.path.join(root, "evidencias", "art", "patrol-shooter")
os.makedirs(out_dir, exist_ok=True)

# ------------------------------------------------------------------------------
# 1. LABELED CONTACT SHEET
# ------------------------------------------------------------------------------
def create_labeled_contact_sheet():
    scale = 4
    cell_w = 32 * scale + 16
    cell_h = 32 * scale + 24
    cols = 8
    rows = 3
    sheet_w = cols * cell_w + 32
    sheet_h = rows * cell_h + 80

    sheet = Image.new("RGBA", (sheet_w, sheet_h), (10, 11, 18, 255))
    draw = ImageDraw.Draw(sheet)

    # Header title
    draw.text((20, 14), "BOYPUNK! WEB — ATIRADOR DE PATRULHA (PATROL-SHOOTER) — CICLO DE ANIMAÇÃO", fill=(55, 230, 238, 255))
    draw.text((20, 32), "Canvas 32x32 RGBA | Colisor 16x32 | Boca Local (6, 13) | Linha de Piso Y=31 | Escala 4x Nearest-Neighbor", fill=(175, 188, 212, 255))

    # Row 1: Patrol Locomotion (8 frames)
    draw.text((20, 56), "1. LOCOMOÇÃO DE PATRULHA (8 frames @ 12 fps — 34 px/s)", fill=(255, 122, 40, 255))
    patrol_labels = [
        "0: Contato 1", "1: Amortecimento 1", "2: Passagem 1", "3: Extensão 1",
        "4: Contato 2", "5: Amortecimento 2", "6: Passagem 2", "7: Extensão 2"
    ]
    for col in range(8):
        fpath = os.path.join(art_dir, f"enemypatrolshooter-patrol-{col:03d}.png")
        img = Image.open(fpath).convert("RGBA")
        scaled = img.resize((32 * scale, 32 * scale), Image.NEAREST)

        x_pos = 20 + col * cell_w
        y_pos = 76

        # Frame border
        draw.rectangle([x_pos - 2, y_pos - 2, x_pos + 32 * scale + 1, y_pos + 32 * scale + 1], outline=(36, 42, 60, 255))
        # Ground line indicator at y=31
        ground_y = y_pos + 31 * scale + (scale - 1)
        draw.line([(x_pos - 4, ground_y), (x_pos + 32 * scale + 3, ground_y)], fill=(255, 122, 40, 140), width=1)

        # Paste sprite
        sheet.paste(scaled, (x_pos, y_pos), scaled)
        draw.text((x_pos, y_pos + 32 * scale + 4), patrol_labels[col], fill=(220, 225, 240, 255))

    # Row 2: Aim / Warning (4 frames)
    row2_y = 76 + cell_h + 16
    draw.text((20, row2_y - 20), "2. AVISO E MIRA TRAVADA (4 frames telegrafados — Duração 0,90 s)", fill=(255, 122, 40, 255))
    aim_labels = [
        "0: Base Travada", "1: Aquisição Óptica", "2: Carga de Capacitor", "3: Mira Bloqueada"
    ]
    for col in range(4):
        fpath = os.path.join(art_dir, f"enemypatrolshooter-aim-{col:03d}.png")
        img = Image.open(fpath).convert("RGBA")
        scaled = img.resize((32 * scale, 32 * scale), Image.NEAREST)

        x_pos = 20 + col * cell_w
        y_pos = row2_y

        draw.rectangle([x_pos - 2, y_pos - 2, x_pos + 32 * scale + 1, y_pos + 32 * scale + 1], outline=(36, 42, 60, 255))
        ground_y = y_pos + 31 * scale + (scale - 1)
        draw.line([(x_pos - 4, ground_y), (x_pos + 32 * scale + 3, ground_y)], fill=(255, 122, 40, 140), width=1)

        # Muzzle crosshair indicator at (6, 13)
        muzzle_px = x_pos + 6 * scale + scale // 2
        muzzle_py = y_pos + 13 * scale + scale // 2
        draw.line([(muzzle_px - 4, muzzle_py), (muzzle_px + 4, muzzle_py)], fill=(55, 230, 238, 255), width=1)
        draw.line([(muzzle_px, muzzle_py - 4), (muzzle_px, muzzle_py + 4)], fill=(55, 230, 238, 255), width=1)

        sheet.paste(scaled, (x_pos, y_pos), scaled)
        draw.text((x_pos, y_pos + 32 * scale + 4), aim_labels[col], fill=(220, 225, 240, 255))

    # Row 3: Fire & Recoil Recovery (5 frames)
    row3_y = row2_y + cell_h + 16
    draw.text((20, row3_y - 20), "3. DISPARO E RECUPERAÇÃO DE RECUO (1/120 s fogo + 1,25 s recuperação com 0,28 s recuo)", fill=(255, 122, 40, 255))
    fire_rec_paths = [os.path.join(art_dir, "enemypatrolshooter-fire-000.png")] + [
        os.path.join(art_dir, f"enemypatrolshooter-recovery-{i:03d}.png") for i in range(4)
    ]
    fire_rec_labels = [
        "Fogo: Pulso (6,13)", "Recuo 0: Choque Máx", "Recuo 1: Amortecedor", "Recuo 2: Resfriamento", "Recuo 3: Restabilizado"
    ]
    for col, (p, label) in enumerate(zip(fire_rec_paths, fire_rec_labels)):
        img = Image.open(p).convert("RGBA")
        scaled = img.resize((32 * scale, 32 * scale), Image.NEAREST)

        x_pos = 20 + col * cell_w
        y_pos = row3_y

        draw.rectangle([x_pos - 2, y_pos - 2, x_pos + 32 * scale + 1, y_pos + 32 * scale + 1], outline=(36, 42, 60, 255))
        ground_y = y_pos + 31 * scale + (scale - 1)
        draw.line([(x_pos - 4, ground_y), (x_pos + 32 * scale + 3, ground_y)], fill=(255, 122, 40, 140), width=1)

        sheet.paste(scaled, (x_pos, y_pos), scaled)
        draw.text((x_pos, y_pos + 32 * scale + 4), label, fill=(220, 225, 240, 255))

    out_path = os.path.join(out_dir, "folha-de-contato-animacao.png")
    sheet.save(out_path)
    print(f"Folha de contato salva: {out_path}")

# ------------------------------------------------------------------------------
# 2. NATIVE & 4X ENLARGED COMPARISONS (Stationary Turret vs Mobile Droid)
# ------------------------------------------------------------------------------
def create_comparisons():
    turret_path = os.path.join(art_dir, "enemytorreta-ready-000.png")
    patrol_path = os.path.join(art_dir, "enemypatrolshooter-patrol-000.png")
    aim_path = os.path.join(art_dir, "enemypatrolshooter-aim-000.png")

    turret_img = Image.open(turret_path).convert("RGBA")
    patrol_img = Image.open(patrol_path).convert("RGBA")
    aim_img = Image.open(aim_path).convert("RGBA")

    # Native 1:1 comparison
    comp_native = Image.new("RGBA", (140, 52), (10, 11, 18, 255))
    draw_n = ImageDraw.Draw(comp_native)
    draw_n.text((6, 4), "Torreta Fixa", fill=(175, 188, 212, 255))
    draw_n.text((50, 4), "Patrulha", fill=(55, 230, 238, 255))
    draw_n.text((94, 4), "Mira Travada", fill=(255, 122, 40, 255))

    comp_native.paste(turret_img, (6, 16), turret_img)
    comp_native.paste(patrol_img, (50, 16), patrol_img)
    comp_native.paste(aim_img, (94, 16), aim_img)

    native_out = os.path.join(out_dir, "comparacao-native.png")
    comp_native.save(native_out)
    print(f"Comparativo nativo 1:1 salvo: {native_out}")

    # 4X Enlarged Comparison with annotations
    scale = 4
    comp_4x = Image.new("RGBA", (560, 240), (10, 11, 18, 255))
    draw_4x = ImageDraw.Draw(comp_4x)

    draw_4x.text((20, 12), "COMPARATIVO ARQUITETURAL: TORRETA MONTADA VS ATIRADOR ARTICULADO MÓVEL", fill=(55, 230, 238, 255))
    draw_4x.text((20, 28), "BoyPunk! Web — Preservação da Identidade Gráfica, Colisor 16x32 e Articulação Robótica", fill=(175, 188, 212, 255))

    panels = [
        ("Torreta Fixa (Tripé Bunker)", turret_img, (175, 188, 212, 255)),
        ("Atirador Móvel (Patrulha)", patrol_img, (55, 230, 238, 255)),
        ("Atirador Móvel (Mira)", aim_img, (255, 122, 40, 255))
    ]

    for i, (title, img, color) in enumerate(panels):
        x_base = 20 + i * 176
        y_base = 56

        scaled = img.resize((32 * scale, 32 * scale), Image.NEAREST)
        draw_4x.rectangle([x_base - 2, y_base - 2, x_base + 32 * scale + 1, y_base + 32 * scale + 1], outline=(36, 42, 60, 255))

        # Ground line
        ground_y = y_base + 31 * scale + (scale - 1)
        draw_4x.line([(x_base - 4, ground_y), (x_base + 32 * scale + 3, ground_y)], fill=(255, 122, 40, 180), width=1)

        comp_4x.paste(scaled, (x_base, y_base), scaled)
        draw_4x.text((x_base, y_base + 32 * scale + 6), title, fill=color)

    # Technical annotations
    draw_4x.text((20, 206), "• Anatomia Humanóide: Cabeça com visor ciano, tórax com conduíte, cintura articulada, pernas móveis e rifle de pulso.", fill=(220, 225, 240, 255))
    draw_4x.text((20, 220), "• Integridade Física: Colisor 16x32 inalterado, boca alinhada em (6, 13) e contato do piso rigorosamente na linha Y=31.", fill=(220, 225, 240, 255))

    enlarged_out = os.path.join(out_dir, "comparacao-enlarged-4x.png")
    comp_4x.save(enlarged_out)
    print(f"Comparativo ampliado 4x salvo: {enlarged_out}")

# ------------------------------------------------------------------------------
# 3. ANIMATED LOOP (GIF & WebP)
# ------------------------------------------------------------------------------
def create_animated_demo():
    scale = 3
    # Build complete cycle:
    # 8 walk frames (played twice = 16 frames @ 12 fps = 1.33 s)
    # 4 aim frames (played with holding = 8 frames @ 12 fps = 0.67 s)
    # 1 fire frame (2 frames @ 12 fps)
    # 4 recovery frames (6 frames @ 12 fps)
    sequence = []
    durations = []

    # Patrol walk (2 loops)
    for _ in range(2):
        for i in range(8):
            fpath = os.path.join(art_dir, f"enemypatrolshooter-patrol-{i:03d}.png")
            sequence.append(Image.open(fpath).convert("RGBA"))
            durations.append(83)  # ~12 fps

    # Aim / Warning
    for i in range(4):
        fpath = os.path.join(art_dir, f"enemypatrolshooter-aim-{i:03d}.png")
        img = Image.open(fpath).convert("RGBA")
        sequence.append(img)
        durations.append(180 if i == 3 else 140)

    # Fire
    fire_img = Image.open(os.path.join(art_dir, "enemypatrolshooter-fire-000.png")).convert("RGBA")
    sequence.append(fire_img)
    durations.append(100)

    # Recovery
    for i in range(4):
        fpath = os.path.join(art_dir, f"enemypatrolshooter-recovery-{i:03d}.png")
        img = Image.open(fpath).convert("RGBA")
        sequence.append(img)
        durations.append(100 if i < 2 else 150)

    # Scale frames up with dark cyberpunk background
    scaled_frames = []
    for frame in sequence:
        bg = Image.new("RGBA", (32 * scale + 16, 32 * scale + 16), (10, 11, 18, 255))
        scaled_sprite = frame.resize((32 * scale, 32 * scale), Image.NEAREST)
        bg.paste(scaled_sprite, (8, 8), scaled_sprite)
        # Ground line
        d = ImageDraw.Draw(bg)
        gy = 8 + 31 * scale + (scale - 1)
        d.line([(4, gy), (32 * scale + 12, gy)], fill=(255, 122, 40, 160), width=1)
        scaled_frames.append(bg.convert("P", palette=Image.ADAPTIVE))

    gif_path = os.path.join(out_dir, "animacao-patrol-shooter.gif")
    scaled_frames[0].save(
        gif_path,
        save_all=True,
        append_images=scaled_frames[1:],
        duration=durations,
        loop=0
    )
    print(f"Animação GIF salva: {gif_path}")

    # WebP recording
    webp_path = os.path.join(out_dir, "animacao-patrol-shooter.webp")
    sequence_rgba = []
    for frame in sequence:
        bg = Image.new("RGBA", (32 * scale + 16, 32 * scale + 16), (10, 11, 18, 255))
        scaled_sprite = frame.resize((32 * scale, 32 * scale), Image.NEAREST)
        bg.paste(scaled_sprite, (8, 8), scaled_sprite)
        d = ImageDraw.Draw(bg)
        gy = 8 + 31 * scale + (scale - 1)
        d.line([(4, gy), (32 * scale + 12, gy)], fill=(255, 122, 40, 160), width=1)
        sequence_rgba.append(bg)

    sequence_rgba[0].save(
        webp_path,
        format="WEBP",
        save_all=True,
        append_images=sequence_rgba[1:],
        duration=durations,
        loop=0
    )
    print(f"Animação WebP salva: {webp_path}")

def main():
    print("Gerando evidências gráficas do atirador de patrulha...")
    create_labeled_contact_sheet()
    create_comparisons()
    create_animated_demo()
    print("Todas as evidências salvas em evidencias/art/patrol-shooter/ com sucesso!")

if __name__ == "__main__":
    main()
