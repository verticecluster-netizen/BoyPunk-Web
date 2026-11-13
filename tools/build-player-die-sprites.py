#!/usr/bin/env python3
"""
Artisan Pixel-Art Generator & Rig for BoyPunk Protagonist Defeat Sequence (64x96 RGBA)
BoyPunk-Web
Specialized in Humanoid Kinetics, Weight Transfer, Stable Helmet Attachment & Weapon Handling.
Strictly conforms to BoyPunk Cyberpunk Aesthetic & Renderer Contract.
"""
from PIL import Image
import os
import shutil

# --- PALETTE DEFINITIONS (Strictly adhering to BoyPunk Protagonist Palette) ---
C_TRANS = (0, 0, 0, 0)
C_BLACK = (0, 0, 0, 255)            # #000000 - Crisp silhouette outline & joint seams
C_DEEP_SHADOW = (26, 30, 38, 255)   # #1a1e26 - Deep shadow / collar cavity
C_SLATE_DARK = (46, 52, 65, 255)    # #2e3441 - Helmet dark tone / pants / coat shadow
C_SLATE_MID = (72, 81, 98, 255)     # #485162 - Helmet midtone / armor bevel
C_SLATE_LIGHT = (110, 122, 146, 255)# #6e7a92 - Helmet highlight / specular chamfer

# Parka / Cyberpunk green outfit
C_GREEN_DARK = (45, 68, 67, 255)    # #2d4443 - Parka deep fold / dark green shadow
C_GREEN_BASE = (74, 122, 71, 255)   # #4a7a47 - Parka primary cyber green
C_GREEN_LIGHT = (105, 146, 108, 255)# #69926c - Parka highlight fold
C_TEAL_DARK = (11, 45, 54, 255)     # #0b2d36 - Inner lining / zipper seam

# Amber / Orange accents (boots, ear unit, collar lining)
C_AMB_DARK = (186, 75, 18, 255)     # #ba4b12 - Shadow / boot sole / ear module rim
C_AMB_BASE = (255, 122, 40, 255)    # #ff7a28 - Primary amber glow / ear module / boots
C_AMB_LIGHT = (255, 135, 65, 255)   # #ff8741 - Boot highlight / ear module bright
C_AMB_TINT = (174, 91, 57, 255)     # #ae5b39 - Boot shading transition

# Cyan Visor & HUD Optics
C_CYN_DARK = (20, 108, 125, 255)    # #146c7d - Visor rim / powered-down state
C_CYN_BASE = (55, 230, 238, 255)    # #37e6ee - Active neon cyan visor emission
C_CYN_HOT = (216, 253, 255, 255)    # #d8fdff - Specular reflection highlight
C_CYN_FLASH = (229, 243, 255, 255)  # #e5f3ff - Kinetic impact flash core

# Weapon (Metal pipe / shock bat)
C_MET_DARK = (46, 49, 52, 255)      # #2e3134 - Pipe dark seam / handle grip
C_MET_MID = (112, 119, 125, 255)    # #70777d - Metallic shaft midtone
C_MET_LIGHT = (181, 188, 194, 255)  # #b5bcc2 - Metallic specular edge

def new_canvas():
    return Image.new("RGBA", (64, 96), C_TRANS)

def px(img, x, y, color):
    if 0 <= x < 64 and 0 <= y < 96 and color[3] > 0:
        img.putpixel((x, y), color)

def rect(img, x1, y1, x2, y2, color):
    for y in range(y1, y2 + 1):
        for x in range(x1, x2 + 1):
            px(img, x, y, color)

def draw_helmet_standing(img, ox, oy, visor_state="normal", tilt_angle=0):
    """
    Renders the official BoyPunk cyberpunk helmet facing RIGHT.
    ox, oy: Anchor for the top-left of the helmet dome (typically ox=6, oy=36 in idle).
    Width: ~18px, Height: 16px.
    """
    # Dome top (y = oy)
    rect(img, ox + 3, oy, ox + 14, oy, C_BLACK)
    rect(img, ox + 4, oy, ox + 13, oy, C_SLATE_LIGHT)

    # Dome upper plate (y = oy + 1)
    px(img, ox + 2, oy + 1, C_BLACK)
    rect(img, ox + 3, oy + 1, ox + 14, oy + 1, C_SLATE_MID)
    px(img, ox + 15, oy + 1, C_BLACK)
    rect(img, ox + 5, oy + 1, ox + 11, oy + 1, C_SLATE_LIGHT)

    # Upper skull plate (y = oy + 2)
    px(img, ox + 1, oy + 2, C_BLACK)
    rect(img, ox + 2, oy + 2, ox + 15, oy + 2, C_SLATE_MID)
    px(img, ox + 16, oy + 2, C_BLACK)

    # Brow plate (y = oy + 3)
    px(img, ox, oy + 3, C_BLACK)
    rect(img, ox + 1, oy + 3, ox + 16, oy + 3, C_SLATE_DARK)
    px(img, ox + 17, oy + 3, C_BLACK)

    # Forehead & Ear unit top (y = oy + 4)
    px(img, ox, oy + 4, C_BLACK)
    rect(img, ox + 1, oy + 4, ox + 3, oy + 4, C_SLATE_MID)
    rect(img, ox + 4, oy + 4, ox + 8, oy + 4, C_AMB_BASE) # Ear unit top
    rect(img, ox + 9, oy + 4, ox + 16, oy + 4, C_SLATE_DARK)
    px(img, ox + 17, oy + 4, C_BLACK)

    # Visor row 1 & Ear module center (y = oy + 5)
    px(img, ox, oy + 5, C_BLACK)
    rect(img, ox + 1, oy + 5, ox + 3, oy + 5, C_SLATE_DARK)
    px(img, ox + 4, oy + 5, C_AMB_DARK)
    rect(img, ox + 5, oy + 5, ox + 8, oy + 5, C_AMB_BASE) # Ear module
    px(img, ox + 9, oy + 5, C_AMB_DARK)
    rect(img, ox + 10, oy + 5, ox + 11, oy + 5, C_SLATE_DARK)
    if visor_state == "flash":
        rect(img, ox + 12, oy + 5, ox + 16, oy + 5, C_CYN_FLASH)
    elif visor_state == "bright":
        rect(img, ox + 12, oy + 5, ox + 15, oy + 5, C_CYN_HOT)
        px(img, ox + 16, oy + 5, C_CYN_BASE)
    elif visor_state == "normal":
        px(img, ox + 12, oy + 5, C_CYN_DARK)
        rect(img, ox + 13, oy + 5, ox + 15, oy + 5, C_CYN_BASE)
        px(img, ox + 16, oy + 5, C_CYN_HOT)
    else: # dead / unpowered
        rect(img, ox + 12, oy + 5, ox + 16, oy + 5, C_SLATE_DARK)
        px(img, ox + 15, oy + 5, C_CYN_DARK)
    px(img, ox + 17, oy + 5, C_BLACK)

    # Visor row 2 & Ear module bottom (y = oy + 6)
    px(img, ox, oy + 6, C_BLACK)
    rect(img, ox + 1, oy + 6, ox + 3, oy + 6, C_SLATE_DARK)
    px(img, ox + 4, oy + 6, C_AMB_DARK)
    rect(img, ox + 5, oy + 6, ox + 7, oy + 6, C_AMB_LIGHT)
    px(img, ox + 8, oy + 6, C_AMB_DARK)
    rect(img, ox + 9, oy + 6, ox + 11, oy + 6, C_SLATE_DARK)
    if visor_state == "flash":
        rect(img, ox + 12, oy + 6, ox + 16, oy + 6, C_CYN_FLASH)
    elif visor_state == "bright":
        rect(img, ox + 12, oy + 6, ox + 16, oy + 6, C_CYN_BASE)
        px(img, ox + 14, oy + 6, C_CYN_HOT)
    elif visor_state == "normal":
        rect(img, ox + 12, oy + 6, ox + 15, oy + 6, C_CYN_BASE)
        px(img, ox + 16, oy + 6, C_CYN_DARK)
    else: # dead
        rect(img, ox + 12, oy + 6, ox + 16, oy + 6, C_SLATE_DARK)
    px(img, ox + 17, oy + 6, C_BLACK)

    # Visor row 3 & Cheek plate (y = oy + 7)
    px(img, ox, oy + 7, C_BLACK)
    rect(img, ox + 1, oy + 7, ox + 10, oy + 7, C_SLATE_MID)
    px(img, ox + 11, oy + 7, C_SLATE_DARK)
    if visor_state in ("flash", "bright", "normal"):
        rect(img, ox + 12, oy + 7, ox + 15, oy + 7, C_CYN_BASE if visor_state != "flash" else C_CYN_HOT)
        px(img, ox + 16, oy + 7, C_CYN_DARK)
    else:
        rect(img, ox + 12, oy + 7, ox + 16, oy + 7, C_SLATE_DARK)
    px(img, ox + 17, oy + 7, C_BLACK)

    # Cheek & lower jaw (y = oy + 8 .. oy + 11)
    for row in range(8, 12):
        y = oy + row
        px(img, ox, y, C_BLACK)
        rect(img, ox + 1, y, ox + 15, y, C_SLATE_MID)
        px(img, ox + 16, y, C_BLACK)

    # Chin & neck collar seal (y = oy + 12 .. oy + 14)
    for row in range(12, 15):
        y = oy + row
        px(img, ox + 1, y, C_BLACK)
        rect(img, ox + 2, y, ox + 14, y, C_DEEP_SHADOW)
        px(img, ox + 15, y, C_BLACK)


def draw_weapon_pipe(img, x1, y1, x2, y2, loose=False):
    """
    Renders the metal pipe/bat weapon between two points, strictly resting on or above ground deck (y <= 63).
    """
    steps = max(abs(x2 - x1), abs(y2 - y1), 1)
    for i in range(steps + 1):
        t = i / steps
        x = int(round(x1 + (x2 - x1) * t))
        y = int(round(y1 + (y2 - y1) * t))
        if y < 63:
            px(img, x, y, C_MET_LIGHT)
            px(img, x + 1, y, C_MET_MID)
            px(img, x, y + 1, C_MET_DARK)
            px(img, x - 1, y, C_BLACK)
        else:
            px(img, x, 62, C_MET_LIGHT)
            px(img, x + 1, 62, C_MET_MID)
            px(img, x, 63, C_MET_DARK)
            px(img, x - 1, 63, C_BLACK)


def build_player_die_0():
    """
    Frame 0: Fatal Impact Recoil / Kinetic Shock Stagger.
    Torso snapped backward (to left), knees flexing under kinetic load,
    cyberpunk helmet securely attached with visor flaring in overload spark,
    right arm jarred back with staff weapon slipping from loosening grip.
    Feet planted at y=63.
    """
    img = new_canvas()
    ox = 5 # shifted back
    oy = 36

    # 1. Back leg & foot (grounded at y=63)
    rect(img, 9, 58, 13, 61, C_SLATE_DARK)
    rect(img, 9, 62, 14, 63, C_AMB_BASE)
    rect(img, 9, 63, 14, 63, C_AMB_DARK)
    rect(img, 8, 62, 8, 63, C_BLACK)
    rect(img, 15, 62, 15, 63, C_BLACK)

    # 2. Front leg & boot (grounded at y=63, flexing under shock)
    rect(img, 17, 58, 22, 61, C_SLATE_DARK)
    rect(img, 17, 62, 23, 63, C_AMB_BASE)
    rect(img, 17, 63, 23, 63, C_AMB_DARK)
    rect(img, 16, 62, 16, 63, C_BLACK)
    rect(img, 24, 62, 24, 63, C_BLACK)

    # 3. Torso & Cyber Parka (arched backward from impact)
    # Pelvis
    rect(img, 10, 56, 21, 58, C_SLATE_DARK)
    # Parka coat
    rect(img, 9, 51, 22, 56, C_GREEN_BASE)
    rect(img, 8, 52, 9, 56, C_GREEN_DARK)
    rect(img, 21, 52, 22, 56, C_GREEN_DARK)
    # Inner zipper / collar accent
    px(img, 15, 52, C_AMB_BASE)
    px(img, 15, 53, C_AMB_BASE)
    px(img, 15, 54, C_TEAL_DARK)

    # 4. Outstretched arms (left arm back, right arm jarred with slipping weapon)
    # Left arm (far)
    rect(img, 6, 51, 8, 55, C_GREEN_DARK)
    rect(img, 5, 54, 7, 56, C_DEEP_SHADOW)

    # Right arm & slipping weapon
    rect(img, 21, 50, 25, 54, C_GREEN_BASE)
    rect(img, 24, 52, 27, 54, C_DEEP_SHADOW) # open hand
    # Slipping weapon (pipe angling upward-right out of hand)
    draw_weapon_pipe(img, 24, 53, 33, 40, loose=True)

    # 5. Cyberpunk Helmet (reeling back with cyan flash visor)
    draw_helmet_standing(img, ox, oy, visor_state="flash")

    return img


def build_player_die_1():
    """
    Frame 1: Center-of-Mass Collapse / Buckling Fall.
    Weight drops downward and backward. Pelvis drops 8px (y=58).
    Front knee buckles toward the floor (y=62..63), rear leg drags on toe.
    Torso pitched backward at ~35°.
    Weapon disengaged, tumbling loose in space.
    Cyberpunk helmet tilted back toward neon sky.
    """
    img = new_canvas()
    ox = 8 # tilted and dropped
    oy = 42

    # 1. Rear leg (trailing back on toe at y=63)
    rect(img, 8, 60, 13, 62, C_SLATE_DARK)
    rect(img, 8, 62, 12, 63, C_AMB_BASE)
    rect(img, 7, 63, 11, 63, C_AMB_DARK)
    px(img, 6, 63, C_BLACK)
    px(img, 12, 63, C_BLACK)

    # 2. Front knee buckling to floor (knee at y=62, boot plant at y=63)
    rect(img, 16, 58, 22, 61, C_SLATE_DARK)
    rect(img, 18, 61, 24, 63, C_AMB_BASE)
    rect(img, 18, 63, 24, 63, C_AMB_DARK)
    px(img, 17, 62, C_BLACK)
    px(img, 25, 62, C_BLACK)

    # 3. Torso & Parka (tilted backward at ~35°, pelvis at y=56..59)
    rect(img, 11, 55, 23, 59, C_SLATE_DARK)
    rect(img, 10, 52, 24, 56, C_GREEN_BASE)
    rect(img, 9, 53, 11, 56, C_GREEN_DARK)
    rect(img, 22, 53, 24, 56, C_GREEN_DARK)
    px(img, 16, 53, C_AMB_BASE)
    px(img, 16, 54, C_AMB_BASE)

    # 4. Limp arms & tumbling weapon
    # Left arm thrown back
    rect(img, 7, 52, 10, 56, C_GREEN_DARK)
    # Right arm dropping
    rect(img, 22, 52, 26, 55, C_GREEN_BASE)
    rect(img, 25, 54, 27, 56, C_DEEP_SHADOW)
    # Weapon tumbling in mid-air (disconnected from hand)
    draw_weapon_pipe(img, 27, 56, 36, 47, loose=True)

    # 5. Cyberpunk Helmet (tilted upward ~25°, visor bright)
    draw_helmet_standing(img, ox, oy, visor_state="bright")

    return img


def build_player_die_2():
    """
    Frame 2: Deck Impact & Kinetic Rebound.
    Torso and shoulders slam into metal deck (y=58..63).
    Kinetic rebound: legs and boots kick up 3-4 pixels above floor (y=56..61).
    Helmet strikes deck at x=28..44, visor dimmed to deep teal with floor reflection.
    Weapon clatters onto floor deck at y=62..63.
    """
    img = new_canvas()

    # Rebound legs (lifted above floor: boots at y=57..60)
    # Left boot
    rect(img, 7, 57, 12, 59, C_AMB_BASE)
    rect(img, 7, 59, 12, 60, C_AMB_DARK)
    rect(img, 6, 57, 6, 60, C_BLACK)
    rect(img, 13, 57, 13, 60, C_BLACK)
    # Right boot
    rect(img, 13, 56, 18, 58, C_AMB_BASE)
    rect(img, 13, 58, 18, 59, C_AMB_DARK)
    rect(img, 12, 56, 12, 59, C_BLACK)
    rect(img, 19, 56, 19, 59, C_BLACK)
    # Pants
    rect(img, 14, 58, 22, 62, C_SLATE_DARK)

    # Prone torso slamming floor (y=56..63)
    rect(img, 18, 57, 32, 62, C_GREEN_BASE)
    rect(img, 18, 60, 32, 63, C_GREEN_DARK)
    rect(img, 17, 57, 17, 63, C_BLACK)

    # Weapon hitting floor deck
    draw_weapon_pipe(img, 11, 62, 23, 63, loose=True)

    # Helmet striking deck (resting on right side at x=30..47, y=49..63)
    # Rebuilt with full BoyPunk cyberpunk helmet details
    hx = 30
    hy = 48
    # Outer outline
    rect(img, hx + 3, hy, hx + 13, hy, C_BLACK)
    rect(img, hx + 1, hy + 1, hx + 15, hy + 1, C_BLACK)
    rect(img, hx, hy + 2, hx + 16, hy + 14, C_BLACK)
    rect(img, hx + 1, hy + 15, hx + 15, hy + 15, C_BLACK)

    # Helmet shell (lying horizontally on floor)
    rect(img, hx + 2, hy + 1, hx + 14, hy + 14, C_SLATE_MID)
    rect(img, hx + 3, hy + 2, hx + 11, hy + 4, C_SLATE_LIGHT) # top highlight
    rect(img, hx + 2, hy + 10, hx + 14, hy + 14, C_SLATE_DARK) # floor shadow

    # Ear unit on top edge
    rect(img, hx + 5, hy + 2, hx + 9, hy + 4, C_AMB_BASE)
    rect(img, hx + 6, hy + 3, hx + 8, hy + 3, C_AMB_LIGHT)

    # Visor reflecting floor (dimmed to deep teal / cyan specular)
    rect(img, hx + 11, hy + 6, hx + 15, hy + 12, C_CYN_DARK)
    rect(img, hx + 12, hy + 8, hx + 14, hy + 11, C_CYN_BASE)
    px(img, hx + 14, hy + 9, C_CYN_HOT)

    # Floor ground line (y=63)
    for x in range(10, 48):
        px(img, x, 63, C_BLACK)

    return img


def build_player_die_3():
    """
    Frame 3: Inert Power-Down / Motionless Rest on Floor.
    Rebound settles completely: legs and boots flat on deck (y=61..63).
    Torso settled prone on floor deck (y=55..63).
    Weapon resting inert alongside hand on the metal plating (y=62..63).
    Cyberpunk helmet horizontal on floor, visor dark/cool with faint residual trace.
    Full baseline grounded at y=63.
    """
    img = new_canvas()

    # Rebuilding settled prone body based on established die-002 silhouette
    # but with refined full palette, weapon permanency, and proper ground alignment
    hx = 30
    hy = 48

    # 1. Boots resting flat on floor (y=61..63)
    # Left boot
    rect(img, 8, 61, 14, 63, C_AMB_BASE)
    rect(img, 8, 63, 14, 63, C_AMB_DARK)
    rect(img, 7, 61, 7, 63, C_BLACK)
    rect(img, 15, 61, 15, 63, C_BLACK)
    # Right boot
    rect(img, 13, 60, 19, 62, C_AMB_BASE)
    rect(img, 13, 62, 19, 63, C_AMB_DARK)

    # 2. Pants & Legs (y=59..63)
    rect(img, 14, 59, 23, 62, C_SLATE_DARK)
    rect(img, 15, 60, 22, 61, C_DEEP_SHADOW)

    # 3. Torso & Cyber Parka (sprawled limp on floor at y=56..63)
    rect(img, 18, 56, 32, 62, C_GREEN_BASE)
    rect(img, 18, 59, 32, 63, C_GREEN_DARK)
    rect(img, 20, 57, 28, 58, C_GREEN_LIGHT)
    # Limp hand resting beside hip
    rect(img, 23, 61, 26, 62, C_DEEP_SHADOW)

    # 4. Weapon resting inert on floor deck beside hand (y=62..63)
    draw_weapon_pipe(img, 11, 62, 23, 63, loose=True)

    # 5. Cyberpunk Helmet resting flat on deck (x=30..47, y=48..63)
    # Dome outline
    rect(img, hx + 3, hy, hx + 13, hy, C_BLACK)
    rect(img, hx + 1, hy + 1, hx + 15, hy + 1, C_BLACK)
    rect(img, hx, hy + 2, hx + 16, hy + 14, C_BLACK)
    rect(img, hx + 1, hy + 15, hx + 15, hy + 15, C_BLACK)

    # Shell plating
    rect(img, hx + 2, hy + 1, hx + 14, hy + 14, C_SLATE_MID)
    rect(img, hx + 3, hy + 2, hx + 10, hy + 4, C_SLATE_LIGHT)
    rect(img, hx + 2, hy + 10, hx + 14, hy + 14, C_SLATE_DARK)

    # Ear module (unpowered / cooling down)
    rect(img, hx + 5, hy + 2, hx + 9, hy + 4, C_AMB_DARK)
    rect(img, hx + 6, hy + 3, hx + 8, hy + 3, C_AMB_BASE)

    # Visor (powered-off: dark slate with single faint residual teal pixel)
    rect(img, hx + 11, hy + 6, hx + 15, hy + 12, C_SLATE_DARK)
    rect(img, hx + 12, hy + 7, hx + 14, hy + 10, C_DEEP_SHADOW)
    px(img, hx + 13, hy + 9, C_CYN_DARK) # 1 faint residual optic trace

    # Ground baseline anchor (y=63)
    for x in range(7, 48):
        px(img, x, 63, C_BLACK)

    return img


def generate_all_player_die_frames():
    """Generates 4 frames of player defeat animation in 64x96 RGBA."""
    return [
        build_player_die_0(),
        build_player_die_1(),
        build_player_die_2(),
        build_player_die_3()
    ]


if __name__ == "__main__":
    frames = generate_all_player_die_frames()
    out_helmet = "assets/images/player-helmet"
    out_player = "assets/images/player"
    out_compat = "assets/images/player-helmet/compat-64x32"

    os.makedirs(out_compat, exist_ok=True)
    os.makedirs(out_helmet, exist_ok=True)
    os.makedirs(out_player, exist_ok=True)

    print("Saving 4 articulated player defeat frames (64x96 RGBA)...")
    for i, f in enumerate(frames):
        p_h = os.path.join(out_helmet, f"playeranim-die-{i:03d}.png")
        p_p = os.path.join(out_player, f"playeranim-die-{i:03d}.png")
        f.save(p_h)
        f.save(p_p)

        # 64x32 Compatibility Crop (rows 32..64 of the 64x96 canvas)
        compat_crop = f.crop((0, 32, 64, 64))
        p_c = os.path.join(out_compat, f"playeranim-die-{i:03d}.png")
        compat_crop.save(p_c)

        bbox = f.getbbox()
        print(f"  Frame {i}: size={f.size} bbox={bbox} max_y={bbox[3]} (ground baseline y=63: {'OK' if bbox[3]==64 else 'WARN'})")

    print("Articulated player defeat frames generated successfully.")
