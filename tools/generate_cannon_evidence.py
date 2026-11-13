#!/usr/bin/env python3
"""
Generate high-fidelity visual comparison and contact sheets for the bonus cannon redesign.
Outputs are saved in evidencias/art/canhao/.
"""

import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART_DIR = os.path.join(ROOT, "evidencias", "art", "canhao")

FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

def get_font(bold=False, size=12):
    path = FONT_BOLD if bold else FONT_REGULAR
    if os.path.exists(path):
        return ImageFont.truetype(path, size)
    return ImageFont.load_default()

STATES = [
    ("01-idle", "1. REPOUSO (IDLE)", "Pulso de respiro ciano, gantry fixo na parede leste"),
    ("02-telegraph-charge", "2. CARGA (CHARGE)", "Trajetória laser pontilhada, ignição do núcleo"),
    ("03-telegraph-lock", "3. TRAVAMENTO (LOCK)", "Mira 11x11 travada no alvo, feixe branco contínuo"),
    ("04-recoil-fire", "4. DISPARO E RECUO (FIRE)", "Flash em estrela no bocal (448,220), recuo mecânico"),
    ("05-cooling-recovery", "5. RESFRIAMENTO (COOLING)", "Dissipação térmica âmbar, exaustores dorsais e vapor")
]


def load_crop(prefix, state_name):
    path = os.path.join(ART_DIR, f"{prefix}-{state_name}-crop.png")
    if not os.path.exists(path):
        raise FileNotFoundError(f"Missing {path}")
    return Image.open(path).convert("RGBA")

def create_native_comparison():
    """Side-by-side comparison at 1:1 scale for idle state and full sequence."""
    before_idle = load_crop("before", "01-idle")
    after_idle = load_crop("after", "01-idle")
    
    w, h = before_idle.size
    gap = 8
    pad = 8
    header_h = 24
    
    total_w = pad * 2 + w * 2 + gap
    total_h = pad * 2 + header_h + h
    
    comp = Image.new("RGBA", (total_w, total_h), (16, 20, 30, 255))
    draw = ImageDraw.Draw(comp)
    font = get_font(bold=True, size=10)
    
    draw.text((pad + w//8, pad + 4), "ANTES (PROTÓTIPO)", fill=(180, 190, 210, 255), font=font)
    draw.text((pad + w + gap + w//8, pad + 4), "DEPOIS (REDESIGN)", fill=(55, 230, 238, 255), font=font)
    
    comp.paste(before_idle, (pad, pad + header_h))
    comp.paste(after_idle, (pad + w + gap, pad + header_h))
    
    out_path = os.path.join(ART_DIR, "comparacao-native.png")
    comp.save(out_path)
    print(f"Salvo: {out_path}")

def create_enlarged_comparison():
    """Enlarged 4x nearest-neighbor comparison."""
    before_idle = load_crop("before", "01-idle")
    after_idle = load_crop("after", "01-idle")
    
    scale = 4
    w, h = before_idle.size
    sw, sh = w * scale, h * scale
    
    b_scaled = before_idle.resize((sw, sh), Image.Resampling.NEAREST)
    a_scaled = after_idle.resize((sw, sh), Image.Resampling.NEAREST)
    
    gap = 20
    pad = 20
    header_h = 44
    footer_h = 44
    
    total_w = pad * 2 + sw * 2 + gap
    total_h = pad * 2 + header_h + sh + footer_h
    
    comp = Image.new("RGBA", (total_w, total_h), (12, 15, 24, 255))
    draw = ImageDraw.Draw(comp)
    
    title_font = get_font(bold=True, size=13)
    desc_font = get_font(bold=False, size=11)
    
    # Border decorations
    draw.rectangle([(2, 2), (total_w - 3, total_h - 3)], outline=(40, 50, 70, 255), width=2)
    
    draw.text((pad + 6, pad + 12), "ANTES: Retângulo Plano / Muzzle Flutuante (480x270)", fill=(160, 175, 195, 255), font=title_font)
    draw.text((pad + sw + gap + 6, pad + 12), "DEPOIS: Canhão Robótico Industrial BoyPunk (4x Pixel-Art)", fill=(55, 230, 238, 255), font=title_font)
    
    comp.paste(b_scaled, (pad, pad + header_h))
    comp.paste(a_scaled, (pad + sw + gap, pad + header_h))
    
    draw.text((pad + 6, pad + header_h + sh + 12), "Geometria original sem fixação crível", fill=(130, 140, 160, 255), font=desc_font)
    draw.text((pad + sw + gap + 6, pad + header_h + sh + 12), "Placa de montagem (457..464), mancal giratório (454,220), núcleo ciano e blindagem grafite", fill=(255, 155, 56, 255), font=desc_font)
    
    out_path = os.path.join(ART_DIR, "comparacao-enlarged-4x.png")
    comp.save(out_path)
    print(f"Salvo: {out_path}")

def create_state_sequence_sheet():
    """Contact sheet showing all 5 operational animation states with annotations."""
    scale = 3
    gap = 14
    pad = 18
    header_h = 56
    card_header_h = 28
    card_footer_h = 48
    
    first = load_crop("after", STATES[0][0])
    w, h = first.size
    sw, sh = w * scale, h * scale
    
    card_w = sw
    card_h = card_header_h + sh + card_footer_h
    
    total_w = pad * 2 + len(STATES) * card_w + (len(STATES) - 1) * gap
    total_h = pad * 2 + header_h + card_h
    
    sheet = Image.new("RGBA", (total_w, total_h), (10, 13, 20, 255))
    draw = ImageDraw.Draw(sheet)
    
    sheet_title_font = get_font(bold=True, size=15)
    sheet_sub_font = get_font(bold=False, size=12)
    card_title_font = get_font(bold=True, size=11)
    card_desc_font = get_font(bold=False, size=9)
    
    # Outer frame
    draw.rectangle([(2, 2), (total_w - 3, total_h - 3)], outline=(35, 45, 65, 255), width=2)
    
    # Title
    draw.text((pad, pad + 6), "BOYPUNK — CICLO COMPLETO DE ANIMAÇÃO DO CANHÃO ROBÓTICO (CÂMARA DE ENERGIA)", fill=(255, 255, 255, 255), font=sheet_title_font)
    draw.text((pad, pad + 28), "Resolução nativa 480x270 aumentada 3x com nearest-neighbor | Sincronizado ao loop de simulação", fill=(55, 230, 238, 255), font=sheet_sub_font)
    
    for i, (state_name, title, desc) in enumerate(STATES):
        img = load_crop("after", state_name)
        scaled = img.resize((sw, sh), Image.Resampling.NEAREST)
        
        cx = pad + i * (card_w + gap)
        cy = pad + header_h
        
        # Card background
        draw.rectangle([(cx - 2, cy - 2), (cx + card_w + 1, cy + card_h + 1)], fill=(16, 21, 32, 255), outline=(42, 54, 76, 255), width=1)
        
        # Header text
        color = (255, 155, 56, 255) if "DISPARO" in title or "CARGA" in title else (55, 230, 238, 255)
        draw.text((cx + 6, cy + 6), title, fill=color, font=card_title_font)
        
        # Image
        sheet.paste(scaled, (cx, cy + card_header_h))
        
        # Description (split into lines)
        draw.text((cx + 6, cy + card_header_h + sh + 8), desc[:44], fill=(180, 195, 215, 255), font=card_desc_font)
        if len(desc) > 44:
            draw.text((cx + 6, cy + card_header_h + sh + 24), desc[44:], fill=(150, 165, 185, 255), font=card_desc_font)
    
    out_path = os.path.join(ART_DIR, "sequencia-estados-canhao.png")
    sheet.save(out_path)
    print(f"Salvo: {out_path}")


def create_animated_media():
    """Animated WebP, GIF, and MP4 video representing the continuous firing sequence."""
    sequence_plan = [
        ("01-idle", 400),
        ("01-idle", 400),
        ("02-telegraph-charge", 350),
        ("03-telegraph-lock", 250),
        ("04-recoil-fire", 120),
        ("05-cooling-recovery", 300),
        ("05-cooling-recovery", 300),
        ("01-idle", 400)
    ]
    
    scale = 3
    frames = []
    durations = []
    for state_name, duration in sequence_plan:
        img = load_crop("after", state_name)
        scaled = img.resize((img.width * scale, img.height * scale), Image.Resampling.NEAREST)
        frames.append(scaled)
        durations.append(duration)
        
    webp_path = os.path.join(ART_DIR, "animacao-canhao.webp")
    frames[0].save(webp_path, save_all=True, append_images=frames[1:], duration=durations, loop=0)
    print(f"Salvo: {webp_path}")

    gif_path = os.path.join(ART_DIR, "animacao-canhao.gif")
    frames[0].convert("RGB").save(gif_path, save_all=True, append_images=[f.convert("RGB") for f in frames[1:]], duration=durations, loop=0)
    print(f"Salvo: {gif_path}")

    # Export numbered PNGs and build MP4 with ffmpeg
    temp_dir = os.path.join(ART_DIR, "_temp_frames")
    os.makedirs(temp_dir, exist_ok=True)
    frame_idx = 0
    # Duplicate frames to match durations at 30 fps
    for state_name, duration_ms in sequence_plan:
        img = load_crop("after", state_name)
        scaled = img.resize((img.width * scale, img.height * scale), Image.Resampling.NEAREST)
        # Ensure dimensions are even for H.264
        even_w = (scaled.width // 2) * 2
        even_h = (scaled.height // 2) * 2
        if scaled.width != even_w or scaled.height != even_h:
            scaled = scaled.crop((0, 0, even_w, even_h))
        
        repeat_count = max(1, round((duration_ms / 1000) * 30))
        for _ in range(repeat_count):
            scaled.convert("RGB").save(os.path.join(temp_dir, f"frame_{frame_idx:04d}.png"))
            frame_idx += 1
            
    mp4_path = os.path.join(ART_DIR, "animacao-canhao.mp4")
    os.system(f"ffmpeg -y -framerate 30 -i {temp_dir}/frame_%04d.png -c:v libx264 -pix_fmt yuv420p -vf 'scale=trunc(iw/2)*2:trunc(ih/2)*2' {mp4_path} >/dev/null 2>&1")
    # Clean up temp frames
    for f in os.listdir(temp_dir):
        os.remove(os.path.join(temp_dir, f))
    os.rmdir(temp_dir)
    print(f"Salvo: {mp4_path}")

if __name__ == "__main__":
    create_native_comparison()
    create_enlarged_comparison()
    create_state_sequence_sheet()
    create_animated_media()
    print("Todas as evidências visuais foram geradas com sucesso.")

