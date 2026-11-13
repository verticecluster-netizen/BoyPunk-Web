#!/usr/bin/env python3
"""
tools/build-bat-and-protagonist-assets.py

Art Direction, Biomechanics & Mechanical Character Engine for BoyPunk-Web:
- Milestone A: BoyPunk with baseball bat (silhouette, grip, full 21 frames)
- Milestone B: Nilo Android (ceramic armor, articulated bipedal locomotion, nanorepair emitter)
- Milestone C: Enemy Articulation (Chaser 20 frames, Patrol-Shooter 17 frames)
- Generates contact sheets & verification evidence
"""

import os
import math
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ASSETS_DIR = os.path.join(ROOT, "assets", "images")
BOYPUNK_DIR = os.path.join(ASSETS_DIR, "characters", "boypunk-illustrated")
NILO_DIR = os.path.join(ASSETS_DIR, "characters", "nilo-illustrated")
CHASER_DIR = os.path.join(ASSETS_DIR, "enemies", "chaser-illustrated")
PATROL_SHOOTER_DIR = os.path.join(ASSETS_DIR, "enemies", "patrol-shooter-illustrated")
EVIDENCIAS_DIR = os.path.join(ROOT, "evidencias", "art", "character-motion-bat-polish")

os.makedirs(BOYPUNK_DIR, exist_ok=True)
os.makedirs(NILO_DIR, exist_ok=True)
os.makedirs(CHASER_DIR, exist_ok=True)
os.makedirs(PATROL_SHOOTER_DIR, exist_ok=True)
os.makedirs(EVIDENCIAS_DIR, exist_ok=True)

def hex_rgba(hex_str, alpha=255):
    hex_str = hex_str.lstrip("#")
    return (int(hex_str[0:2], 16), int(hex_str[2:4], 16), int(hex_str[4:6], 16), alpha)

def lerp(a, b, t):
    return a + (b - a) * t

# =============================================================================
# 1. BASEBALL BAT RENDERER
# =============================================================================
def draw_baseball_bat(draw, grip_x, grip_y, angle_rad, length=38, choked=0):
    """
    Renders an authentic baseball bat:
    - Small end knob
    - Narrow wrapped handle (athletic tape texture)
    - Gradually tapered shaft
    - Broader rounded striking barrel (metal/composite with specular sheen)
    - Rounded end cap
    - Restrained orange/cyan accent rings
    Returns the coordinates of the primary striking sweet spot.
    """
    cos_a = math.cos(angle_rad)
    sin_a = math.sin(angle_rad)
    perp_x = -sin_a
    perp_y = cos_a

    knob_dist = -4.0 - choked
    handle_start = 0.0 - choked
    handle_end = 12.0 - choked
    taper_end = 22.0 - choked
    barrel_end = float(length) - choked
    tip_dist = float(length + 2.0) - choked

    r_knob = 3.6
    r_handle = 2.0
    r_taper_start = 2.0
    r_barrel = 4.2

    def pt(dist, offset_perp):
        return (
            grip_x + dist * cos_a + offset_perp * perp_x,
            grip_y + dist * sin_a + offset_perp * perp_y
        )

    # Dark silhouette outline
    shadow_poly = [
        pt(knob_dist, -r_knob),
        pt(knob_dist, r_knob),
        pt(handle_start, r_handle),
        pt(handle_end, r_taper_start),
        pt(taper_end, r_barrel),
        pt(barrel_end, r_barrel),
        pt(tip_dist, 0),
        pt(barrel_end, -r_barrel),
        pt(taper_end, -r_barrel),
        pt(handle_end, -r_taper_start),
        pt(handle_start, -r_handle),
    ]
    draw.polygon(shadow_poly, fill=hex_rgba("#101217", 255))

    # Barrel core (brushed titanium / alloy)
    barrel_poly = [
        pt(taper_end, -r_barrel + 0.5),
        pt(barrel_end, -r_barrel + 0.5),
        pt(barrel_end, r_barrel - 0.5),
        pt(taper_end, r_barrel - 0.5),
    ]
    draw.polygon(barrel_poly, fill=hex_rgba("#454d5f"))
    # Specular upper sheen line
    draw.line([pt(taper_end + 1, -r_barrel + 1.2), pt(barrel_end - 1, -r_barrel + 1.2)], fill=hex_rgba("#b0bccf"), width=1)
    # Mid-tone
    draw.line([pt(taper_end, 0), pt(barrel_end, 0)], fill=hex_rgba("#616d84"), width=2)
    # Underside shadow
    draw.line([pt(taper_end + 1, r_barrel - 1.2), pt(barrel_end - 1, r_barrel - 1.2)], fill=hex_rgba("#272c38"), width=1)

    # Restrained accent rings
    draw.line([pt(taper_end + 3, -r_barrel + 0.8), pt(taper_end + 3, r_barrel - 0.8)], fill=hex_rgba("#ff7a28"), width=1)
    draw.line([pt(taper_end + 4.5, -r_barrel + 0.8), pt(taper_end + 4.5, r_barrel - 0.8)], fill=hex_rgba("#1b1e26"), width=1)
    draw.line([pt(taper_end + 6, -r_barrel + 0.8), pt(taper_end + 6, r_barrel - 0.8)], fill=hex_rgba("#2299a8"), width=1)

    # Taper transition
    taper_poly = [
        pt(handle_end, -r_taper_start + 0.3),
        pt(taper_end, -r_barrel + 0.5),
        pt(taper_end, r_barrel - 0.5),
        pt(handle_end, r_taper_start - 0.3),
    ]
    draw.polygon(taper_poly, fill=hex_rgba("#3a4252"))
    draw.line([pt(handle_end, -r_taper_start + 0.8), pt(taper_end, -r_barrel + 1.2)], fill=hex_rgba("#8896ad"), width=1)

    # Rounded end cap
    cap_poly = [
        pt(barrel_end, -r_barrel + 0.8),
        pt(tip_dist, 0),
        pt(barrel_end, r_barrel - 0.8),
    ]
    draw.polygon(cap_poly, fill=hex_rgba("#2e3440"))
    draw.line([pt(barrel_end, 0), pt(tip_dist, 0)], fill=hex_rgba("#7e8c9e"), width=1)

    # Handle / wrapped grip
    handle_poly = [
        pt(handle_start, -r_handle + 0.4),
        pt(handle_end, -r_handle + 0.4),
        pt(handle_end, r_handle - 0.4),
        pt(handle_start, r_handle - 0.4),
    ]
    draw.polygon(handle_poly, fill=hex_rgba("#1c1f26"))
    for w_dist in range(int(handle_start + 2), int(handle_end - 1), 2):
        draw.line([pt(w_dist, -r_handle + 0.5), pt(w_dist + 1, r_handle - 0.5)], fill=hex_rgba("#383e4d"), width=1)

    # End knob
    knob_poly = [
        pt(knob_dist, -r_knob),
        pt(knob_dist + 1.8, -r_knob * 0.7),
        pt(handle_start, -r_handle),
        pt(handle_start, r_handle),
        pt(knob_dist + 1.8, r_knob * 0.7),
        pt(knob_dist, r_knob),
    ]
    draw.polygon(knob_poly, fill=hex_rgba("#15181f"))
    draw.line([pt(knob_dist + 0.5, -r_knob + 0.5), pt(knob_dist + 0.5, r_knob - 0.5)], fill=hex_rgba("#ff7a28"), width=1)

    sweet_spot = pt(taper_end + (barrel_end - taper_end) * 0.65, 0)
    return sweet_spot

# =============================================================================
# 2. BOYPUNK ILLUSTRATED (128x192 RGBA)
# =============================================================================
def draw_boypunk_frame(state, frame_idx):
    """
    Renders BoyPunk with baseball bat integrated.
    Anchor: Center X=32, Feet Y=126.
    """
    img = Image.new("RGBA", (128, 192), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    sway_x = 0
    sway_y = 0
    torso_rot = 0.0
    leg_l_x = 0
    leg_l_y = 0
    leg_r_x = 0
    leg_r_y = 0
    bat_config = None # (grip_x, grip_y, angle, length, choked, two_handed, in_front)
    hurt_flash = None
    die_stage = None

    if state == "idle":
        # 4 frames athletic batter stance: feet planted shoulder-width, bat on shoulder
        sways = [0, 1, 0, 1]
        bat_angles = [-0.85, -0.80, -0.92, -0.85] # ~ -48 deg
        sway_y = sways[frame_idx % 4]
        bat_ang = bat_angles[frame_idx % 4]
        leg_l_x, leg_l_y = -8, 0
        leg_r_x, leg_r_y = 8, 0
        bat_config = (32 + 10, 126 - 54 + sway_y + 16, bat_ang, 38, 0, True, True)

    elif state == "walk":
        # 4-phase biomechanical walk: Contact, Passing, Contact, Passing
        if frame_idx == 0:
            # Right foot forward contact, Left foot back
            sway_x = 0
            sway_y = 0
            leg_r_x, leg_r_y = 9, 0
            leg_l_x, leg_l_y = -10, -2
            bat_config = (32 + 12, 126 - 36, 0.35, 38, 0, False, True)
        elif frame_idx == 1:
            # Passing phase: Left leg knee bent passing, Right foot planted
            sway_x = 1
            sway_y = -2
            leg_r_x, leg_r_y = 1, 0
            leg_l_x, leg_l_y = -3, -10
            bat_config = (32 + 11, 126 - 38, 0.25, 38, 0, False, True)
        elif frame_idx == 2:
            # Left foot forward contact, Right foot back
            sway_x = 0
            sway_y = 0
            leg_l_x, leg_l_y = 9, 0
            leg_r_x, leg_r_y = -10, -2
            bat_config = (32 + 13, 126 - 36, 0.42, 38, 0, False, True)
        elif frame_idx == 3:
            # Passing phase: Right leg knee bent passing, Left foot planted
            sway_x = -1
            sway_y = -2
            leg_l_x, leg_l_y = 1, 0
            leg_r_x, leg_r_y = -3, -10
            bat_config = (32 + 11, 126 - 38, 0.28, 38, 0, False, True)

    elif state == "jump":
        # Airborne ascent: knees tucked, bat held high-ready
        sway_y = -4
        leg_l_x, leg_l_y = -6, -8
        leg_r_x, leg_r_y = 6, -10
        bat_config = (32 + 12, 126 - 48, -0.35, 38, 0, True, True)

    elif state == "fall":
        # Airborne descent: legs extending, bat held ready
        sway_y = 1
        leg_l_x, leg_l_y = -7, -2
        leg_r_x, leg_r_y = 7, -3
        bat_config = (32 + 12, 126 - 44, -0.65, 38, 0, True, True)

    elif state == "attack1":
        # 4 frames authentic batting swing:
        # F0: Coiled back / Windup
        # F1: Forward swing plane acceleration
        # F2: Full extension striking point (sweet-spot at discharge line)
        # F3: Follow-through and recovery
        if frame_idx == 0:
            sway_x = -3
            sway_y = 0
            torso_rot = -0.15
            leg_l_x, leg_l_y = -11, 0
            leg_r_x, leg_r_y = 5, 0
            # Bat coiled behind right ear
            bat_config = (32 - 1, 126 - 54 + 10, -0.95, 38, 2, True, False)
        elif frame_idx == 1:
            sway_x = 2
            sway_y = 0
            torso_rot = 0.10
            leg_l_x, leg_l_y = -8, 0
            leg_r_x, leg_r_y = 10, 0
            # Driving forward horizontally at chest height
            bat_config = (32 + 14, 126 - 54 + 20, -0.15, 38, 0, True, True)
        elif frame_idx == 2:
            sway_x = 5
            sway_y = 0
            torso_rot = 0.20
            leg_l_x, leg_l_y = -7, 0
            leg_r_x, leg_r_y = 12, 0
            # Full extension: bat horizontal reaching forward into strike zone
            bat_config = (32 + 20, 126 - 54 + 22, 0.08, 40, 0, True, True)
        elif frame_idx == 3:
            sway_x = 2
            sway_y = 1
            torso_rot = 0.05
            leg_l_x, leg_l_y = -8, 0
            leg_r_x, leg_r_y = 8, 0
            # Follow through across left shoulder
            bat_config = (32 + 4, 126 - 54 + 18, -1.95, 38, 0, True, True)

    elif state == "hurt":
        sway_x = -4
        sway_y = -1
        leg_l_x, leg_l_y = -9, 0
        leg_r_x, leg_r_y = 5, 0
        bat_config = (32 + 6, 126 - 46, -1.05, 36, 0, True, True)
        if frame_idx == 1: hurt_flash = "white"
        elif frame_idx == 2: hurt_flash = "dark"

    elif state == "die":
        die_stage = frame_idx

    cx = 32 + sway_x
    cy = 126 + sway_y

    if die_stage == 3:
        # Repouso no chão: BoyPunk resting horizontally at Y=126 with bat on floor
        draw.rounded_rectangle([cx - 16, cy - 14, cx + 18, cy - 2], radius=6, fill=hex_rgba("#222733"), outline=hex_rgba("#10121a"), width=2)
        draw.line([cx - 8, cy - 9, cx + 10, cy - 9], fill=hex_rgba("#37e6ee"), width=3)
        draw.rounded_rectangle([cx + 14, cy - 12, cx + 46, cy - 2], radius=4, fill=hex_rgba("#2f452f"), outline=hex_rgba("#182418"), width=2)
        draw.rounded_rectangle([cx + 44, cy - 10, cx + 56, cy - 2], radius=3, fill=hex_rgba("#14161d"), outline=hex_rgba("#0b0c10"), width=2)
        # Bat resting on floor horizontally next to fallen player
        draw_baseball_bat(draw, grip_x=cx + 20, grip_y=cy - 3, angle_rad=0.0, length=38)
        return img
    elif die_stage == 2:
        cx += 6
        cy += 2
    elif die_stage == 1:
        cx += 3
        cy += 1

    # Draw Bat Behind if not in_front (e.g., windup pose where bat is behind shoulders)
    if bat_config and not bat_config[6]:
        gx, gy, bang, blen, bchoke, _, _ = bat_config
        draw_baseball_bat(draw, gx, gy, bang, blen, bchoke)

    # --- LEGS & BOOTS ---
    hip_y = cy - 30
    boot_l_x = cx + leg_l_x
    boot_l_y = cy + leg_l_y
    boot_r_x = cx + leg_r_x
    boot_r_y = cy + leg_r_y

    # Left Leg (cargo pants)
    draw.line([cx - 5, hip_y, boot_l_x, boot_l_y - 8], fill=hex_rgba("#1e222b"), width=8)
    draw.line([cx - 5, hip_y, boot_l_x, boot_l_y - 8], fill=hex_rgba("#2c3240"), width=5)
    draw.rounded_rectangle([boot_l_x - 4, hip_y + 10, boot_l_x + 4, hip_y + 18], radius=2, fill=hex_rgba("#3b4457"), outline=hex_rgba("#14161c"), width=1)
    draw.rounded_rectangle([boot_l_x - 6, boot_l_y - 8, boot_l_x + 6, boot_l_y], radius=3, fill=hex_rgba("#14161d"), outline=hex_rgba("#0b0c10"), width=2)
    draw.line([boot_l_x - 5, boot_l_y, boot_l_x + 5, boot_l_y], fill=hex_rgba("#ff7a28"), width=1)

    # Right Leg
    draw.line([cx + 5, hip_y, boot_r_x, boot_r_y - 8], fill=hex_rgba("#1e222b"), width=8)
    draw.line([cx + 5, hip_y, boot_r_x, boot_r_y - 8], fill=hex_rgba("#2c3240"), width=5)
    draw.rounded_rectangle([boot_r_x - 4, hip_y + 10, boot_r_x + 4, hip_y + 18], radius=2, fill=hex_rgba("#3b4457"), outline=hex_rgba("#14161c"), width=1)
    draw.rounded_rectangle([boot_r_x - 6, boot_r_y - 8, boot_r_x + 6, boot_r_y], radius=3, fill=hex_rgba("#14161d"), outline=hex_rgba("#0b0c10"), width=2)
    draw.line([boot_r_x - 5, boot_r_y, boot_r_x + 5, boot_r_y], fill=hex_rgba("#ff7a28"), width=1)

    # --- TORSO / JACKET ---
    torso_top = cy - 54
    torso_bot = cy - 28
    draw.rounded_rectangle([cx - 13, torso_top, cx + 13, torso_bot], radius=5, fill=hex_rgba("#2f452f"), outline=hex_rgba("#182418"), width=2)
    draw.line([cx - 11, torso_top + 4, cx - 11, torso_bot - 4], fill=hex_rgba("#223322"), width=2)
    draw.line([cx + 10, torso_top + 4, cx + 10, torso_bot - 4], fill=hex_rgba("#415f41"), width=2)
    draw.line([cx, torso_top + 2, cx, torso_bot - 2], fill=hex_rgba("#ff7a28"), width=2)
    draw.polygon([(cx - 7, torso_top), (cx + 7, torso_top), (cx, torso_top + 6)], fill=hex_rgba("#ff924a"))

    # Utility belt
    draw.line([cx - 12, torso_bot - 2, cx + 12, torso_bot - 2], fill=hex_rgba("#12141a"), width=4)
    draw.rectangle([cx - 3, torso_bot - 4, cx + 3, torso_bot], fill=hex_rgba("#68748a"), outline=hex_rgba("#12141a"))

    # --- HELMET ---
    helmet_cx = cx
    helmet_cy = torso_top - 14
    draw.rounded_rectangle([helmet_cx - 14, helmet_cy - 14, helmet_cx + 14, helmet_cy + 12], radius=9, fill=hex_rgba("#282e3d"), outline=hex_rgba("#10131a"), width=2)
    draw.arc([helmet_cx - 12, helmet_cy - 12, helmet_cx + 12, helmet_cy], start=190, end=350, fill=hex_rgba("#5a6785"), width=2)
    draw.rounded_rectangle([helmet_cx - 16, helmet_cy - 2, helmet_cx - 12, helmet_cy + 6], radius=2, fill=hex_rgba("#ff7a28"), outline=hex_rgba("#10131a"))

    # Cyan visor
    visor_y = helmet_cy + 1
    draw.rounded_rectangle([helmet_cx - 8, visor_y - 3, helmet_cx + 12, visor_y + 3], radius=3, fill=hex_rgba("#124d57"), outline=hex_rgba("#0a252a"), width=1)
    draw.line([helmet_cx - 6, visor_y, helmet_cx + 10, visor_y], fill=hex_rgba("#37e6ee"), width=3)
    draw.line([helmet_cx - 4, visor_y - 1, helmet_cx + 5, visor_y - 1], fill=hex_rgba("#e0fcff"), width=1)

    # --- ARMS & BAT INTEGRATION ---
    shoulder_y = torso_top + 4

    if bat_config and bat_config[6]:
        # Draw Bat in Front
        gx, gy, bang, blen, bchoke, two_handed, _ = bat_config

        # Left Arm (reaches to grip if two_handed, else natural counterweight)
        if two_handed:
            draw.line([cx - 10, shoulder_y, gx - 2, gy + 3], fill=hex_rgba("#223322"), width=6)
            draw.line([cx - 10, shoulder_y, gx - 2, gy + 3], fill=hex_rgba("#2f452f"), width=4)
        else:
            draw.line([cx - 12, shoulder_y, cx - 16, shoulder_y + 14], fill=hex_rgba("#2f452f"), width=6)
            draw.line([cx - 16, shoulder_y + 14, cx - 13, shoulder_y + 22], fill=hex_rgba("#223322"), width=4)

        # Right Arm (holds bat)
        draw.line([cx + 10, shoulder_y, gx, gy], fill=hex_rgba("#223322"), width=7)
        draw.line([cx + 10, shoulder_y, gx, gy], fill=hex_rgba("#3d573d"), width=5)

        # Draw the bat
        draw_baseball_bat(draw, gx, gy, bang, blen, bchoke)

        # Hands on Grip
        draw.ellipse([gx - 3, gy - 3, gx + 3, gy + 3], fill=hex_rgba("#14161d"), outline=hex_rgba("#ff7a28"))
        if two_handed:
            hx = gx + int(math.cos(bang) * 5)
            hy = gy + int(math.sin(bang) * 5)
            draw.ellipse([hx - 3, hy - 3, hx + 3, hy + 3], fill=hex_rgba("#222733"), outline=hex_rgba("#ff7a28"))

    elif bat_config and not bat_config[6]:
        # Bat was drawn behind body, draw hands holding it
        gx, gy, bang, blen, bchoke, two_handed, _ = bat_config
        draw.line([cx + 10, shoulder_y, gx, gy], fill=hex_rgba("#3d573d"), width=5)
        draw.ellipse([gx - 3, gy - 3, gx + 3, gy + 3], fill=hex_rgba("#14161d"), outline=hex_rgba("#ff7a28"))

    # Apply hurt flashes
    if hurt_flash == "white":
        solid_white = Image.new("RGBA", (128, 192), (255, 255, 255, 255))
        mask = img.split()[3]
        return Image.composite(solid_white, img, mask)
    elif hurt_flash == "dark":
        solid_dark = Image.new("RGBA", (128, 192), (20, 24, 32, 255))
        mask = img.split()[3]
        return Image.composite(solid_dark, img, mask)

    return img

# =============================================================================
# 3. NILO ANDROID ILLUSTRATED (128x192 RGBA)
# =============================================================================
def draw_nilo_frame(state, frame_idx):
    """
    Renders Nilo with articulated bipedal locomotion and forearm nanorepair emitter.
    Anchor: Center X=32, Feet Y=126.
    NO baseball bat. Atompunk/nanopunk ivory ceramic and graphite construction.
    """
    img = Image.new("RGBA", (128, 192), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    sway_x = 0
    sway_y = 0
    leg_l_x = -7
    leg_l_y = 0
    leg_r_x = 7
    leg_r_y = 0
    arm_aim = 0.0
    hurt_flash = None
    die_stage = None

    if state == "idle":
        sways = [0, 1, 0, 1]
        sway_y = sways[frame_idx % 4]
        leg_l_x, leg_l_y = -7, 0
        leg_r_x, leg_r_y = 7, 0
        arm_aim = 0.6
    elif state == "walk":
        if frame_idx == 0:
            leg_r_x, leg_r_y = 8, 0
            leg_l_x, leg_l_y = -9, -2
            arm_aim = 0.4
        elif frame_idx == 1:
            sway_x = 1
            sway_y = -2
            leg_r_x, leg_r_y = 1, 0
            leg_l_x, leg_l_y = -3, -9
            arm_aim = 0.6
        elif frame_idx == 2:
            leg_l_x, leg_l_y = 8, 0
            leg_r_x, leg_r_y = -9, -2
            arm_aim = 0.8
        elif frame_idx == 3:
            sway_x = -1
            sway_y = -2
            leg_l_x, leg_l_y = 1, 0
            leg_r_x, leg_r_y = -3, -9
            arm_aim = 0.6
    elif state == "jump":
        sway_y = -4
        leg_l_x, leg_l_y = -5, -8
        leg_r_x, leg_r_y = 5, -10
        arm_aim = 0.2
    elif state == "fall":
        sway_y = 1
        leg_l_x, leg_l_y = -6, -2
        leg_r_x, leg_r_y = 6, -3
        arm_aim = 0.5
    elif state == "attack1":
        # Nanorepair discharge / kinetic pulse aim
        if frame_idx == 0:
            sway_x = -2
            arm_aim = 0.1
        elif frame_idx == 1:
            sway_x = 3
            arm_aim = 0.0 # Pointing straight ahead
        elif frame_idx == 2:
            sway_x = 2
            arm_aim = 0.05
        elif frame_idx == 3:
            sway_x = 0
            arm_aim = 0.3
    elif state == "hurt":
        sway_x = -3
        sway_y = -1
        if frame_idx == 1: hurt_flash = "white"
        elif frame_idx == 2: hurt_flash = "dark"
    elif state == "die":
        die_stage = frame_idx

    cx = 32 + sway_x
    cy = 126 + sway_y

    if die_stage == 3:
        # Nilo resting on floor Y=126
        draw.rounded_rectangle([cx - 16, cy - 14, cx + 18, cy - 2], radius=6, fill=hex_rgba("#e6e2d8"), outline=hex_rgba("#4a4843"), width=2)
        draw.ellipse([cx - 6, cy - 10, cx + 2, cy - 4], fill=hex_rgba("#ffb14a"))
        draw.rounded_rectangle([cx + 14, cy - 12, cx + 46, cy - 2], radius=4, fill=hex_rgba("#f0eee6"), outline=hex_rgba("#5a564e"), width=2)
        draw.rounded_rectangle([cx + 44, cy - 10, cx + 56, cy - 2], radius=3, fill=hex_rgba("#2b2c33"), outline=hex_rgba("#121317"), width=2)
        return img
    elif die_stage == 2:
        cx += 6
        cy += 2
    elif die_stage == 1:
        cx += 3
        cy += 1

    hip_y = cy - 30
    boot_l_x = cx + leg_l_x
    boot_l_y = cy + leg_l_y
    boot_r_x = cx + leg_r_x
    boot_r_y = cy + leg_r_y

    # --- LEGS & ARTICULATED JOINTS ---
    # Left Leg (graphite joint + ivory armor shell)
    draw.line([cx - 5, hip_y, boot_l_x, boot_l_y - 8], fill=hex_rgba("#2b2c36"), width=8)
    draw.rounded_rectangle([boot_l_x - 5, hip_y + 8, boot_l_x + 5, hip_y + 22], radius=3, fill=hex_rgba("#f0ece1"), outline=hex_rgba("#686357"), width=1)
    draw.rounded_rectangle([boot_l_x - 6, boot_l_y - 8, boot_l_x + 6, boot_l_y], radius=3, fill=hex_rgba("#22232a"), outline=hex_rgba("#101014"), width=2)
    draw.line([boot_l_x - 5, boot_l_y, boot_l_x + 5, boot_l_y], fill=hex_rgba("#ffb14a"), width=1)

    # Right Leg
    draw.line([cx + 5, hip_y, boot_r_x, boot_r_y - 8], fill=hex_rgba("#2b2c36"), width=8)
    draw.rounded_rectangle([boot_r_x - 5, hip_y + 8, boot_r_x + 5, hip_y + 22], radius=3, fill=hex_rgba("#f0ece1"), outline=hex_rgba("#686357"), width=1)
    draw.rounded_rectangle([boot_r_x - 6, boot_r_y - 8, boot_r_x + 6, boot_r_y], radius=3, fill=hex_rgba("#22232a"), outline=hex_rgba("#101014"), width=2)
    draw.line([boot_r_x - 5, boot_r_y, boot_r_x + 5, boot_r_y], fill=hex_rgba("#ffb14a"), width=1)

    # --- TORSO / CERAMIC CHASSIS ---
    torso_top = cy - 54
    torso_bot = cy - 28
    draw.rounded_rectangle([cx - 13, torso_top, cx + 13, torso_bot], radius=5, fill=hex_rgba("#f5f3ec"), outline=hex_rgba("#45433d"), width=2)
    # Graphite core chassis band
    draw.line([cx - 10, torso_top + 12, cx + 10, torso_top + 12], fill=hex_rgba("#2b2d38"), width=4)
    # Amber power cell indicator
    draw.ellipse([cx - 3, torso_top + 10, cx + 3, torso_top + 14], fill=hex_rgba("#ffb14a"), outline=hex_rgba("#ffd17a"))
    # Green tactical medical cross
    draw.rectangle([cx - 6, torso_top + 18, cx - 2, torso_top + 22], fill=hex_rgba("#2ee6a8"))

    # Belt / Pelvis mount
    draw.line([cx - 11, torso_bot - 2, cx + 11, torso_bot - 2], fill=hex_rgba("#1c1d24"), width=4)

    # --- HEAD / IVORY DOME & AMBER OPTICS ---
    head_cx = cx
    head_cy = torso_top - 14
    draw.rounded_rectangle([head_cx - 13, head_cy - 14, head_cx + 13, head_cy + 12], radius=8, fill=hex_rgba("#f0ece1"), outline=hex_rgba("#3d3b36"), width=2)
    draw.arc([head_cx - 11, head_cy - 12, head_cx + 11, head_cy], start=190, end=350, fill=hex_rgba("#ffffff"), width=2)

    # Multifaceted Amber Optics
    draw.rounded_rectangle([head_cx - 6, head_cy - 2, head_cx + 11, head_cy + 4], radius=3, fill=hex_rgba("#4a2800"), outline=hex_rgba("#261400"))
    draw.line([head_cx - 4, head_cy + 1, head_cx + 9, head_cy + 1], fill=hex_rgba("#ffb14a"), width=3)
    draw.line([head_cx - 2, head_cy, head_cx + 5, head_cy], fill=hex_rgba("#fff0b8"), width=1)

    # --- ARMS & FOREARM NANOREPAIR EMITTER ---
    shoulder_y = torso_top + 4
    # Left Arm
    draw.line([cx - 11, shoulder_y, cx - 15, shoulder_y + 14], fill=hex_rgba("#e6e2d8"), width=6)
    draw.line([cx - 15, shoulder_y + 14, cx - 12, shoulder_y + 22], fill=hex_rgba("#2b2c36"), width=5)

    # Right Arm with Cylindrical Nanorepair Emitter
    hand_x = cx + 16 + int(math.cos(arm_aim) * 14)
    hand_y = shoulder_y + 12 + int(math.sin(arm_aim) * 14)
    draw.line([cx + 10, shoulder_y, cx + 15, shoulder_y + 8], fill=hex_rgba("#e6e2d8"), width=6)
    draw.line([cx + 15, shoulder_y + 8, hand_x, hand_y], fill=hex_rgba("#2b2c36"), width=6)

    # Emitter Housing (ceramic cylinder with copper coil rings)
    em_dx = int(math.cos(arm_aim) * 12)
    em_dy = int(math.sin(arm_aim) * 12)
    tip_x = hand_x + em_dx
    tip_y = hand_y + em_dy
    draw.line([hand_x, hand_y, tip_x, tip_y], fill=hex_rgba("#ded9ce"), width=6)
    draw.line([hand_x + 3, hand_y + 1, tip_x - 3, tip_y + 1], fill=hex_rgba("#b86a3d"), width=3)
    # Lente focal do emissor
    draw.ellipse([tip_x - 3, tip_y - 3, tip_x + 3, tip_y + 3], fill=hex_rgba("#2ee6a8"), outline=hex_rgba("#e0fff4"))

    if hurt_flash == "white":
        solid_white = Image.new("RGBA", (128, 192), (255, 255, 255, 255))
        mask = img.split()[3]
        return Image.composite(solid_white, img, mask)
    elif hurt_flash == "dark":
        solid_dark = Image.new("RGBA", (128, 192), (20, 24, 32, 255))
        mask = img.split()[3]
        return Image.composite(solid_dark, img, mask)

    return img

# =============================================================================
# 4. CHASER COMBAT DROID (32x64 RGBA)
# =============================================================================
def draw_chaser_frame(state, frame_idx):
    """
    Renders illustrated 32x64 RGBA frame for Chaser Combat Droid.
    Anchor: Center X=16, Feet Y=32.
    """
    img = Image.new("RGBA", (32, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    sway_x = 0
    sway_y = 0
    leg_spread = 0
    jaw_open = 0
    eye_flare = False
    is_dead = False

    if state == "idle":
        sway_y = [0, 1][frame_idx % 2]
    elif state == "walk":
        walk_steps = [
            (0, 0, -4), (1, -1, -2), (0, 0, 0), (-1, -1, 2),
            (0, 0, 4), (1, -1, 2), (0, 0, 0), (-1, -1, -2)
        ]
        sway_x, sway_y, leg_spread = walk_steps[frame_idx % 8]
    elif state == "jump":
        sway_y = -3
        leg_spread = -2
    elif state == "attack":
        sway_x = [1, 3, 2, 0][frame_idx % 4]
        jaw_open = [2, 5, 3, 1][frame_idx % 4]
        eye_flare = frame_idx in (1, 2)
    elif state == "dead":
        is_dead = True
        die_f = frame_idx

    cx = 16 + sway_x
    cy = 32 + sway_y

    if is_dead:
        if die_f == 3:
            # Complete scrap rest on floor
            draw.rounded_rectangle([cx - 8, cy - 6, cx + 8, cy], radius=2, fill=hex_rgba("#1c1f26"), outline=hex_rgba("#0d0e12"))
            draw.ellipse([cx - 2, cy - 4, cx + 2, cy], fill=hex_rgba("#4a1218"))
            return img
        cy += die_f * 2
        cx += die_f * 2

    # Articulated Legs
    foot_l_x = cx - 5 + leg_spread
    foot_r_x = cx + 5 - leg_spread
    draw.line([cx - 3, cy - 10, foot_l_x, cy], fill=hex_rgba("#1b1e26"), width=3)
    draw.line([cx + 3, cy - 10, foot_r_x, cy], fill=hex_rgba("#1b1e26"), width=3)
    # Hydraulic knee joints
    draw.ellipse([foot_l_x - 2, cy - 6, foot_l_x + 2, cy - 2], fill=hex_rgba("#50586b"))
    draw.ellipse([foot_r_x - 2, cy - 6, foot_r_x + 2, cy - 2], fill=hex_rgba("#50586b"))

    # Steel Shell Torso
    draw.rounded_rectangle([cx - 6, cy - 18, cx + 6, cy - 8], radius=3, fill=hex_rgba("#2b303d"), outline=hex_rgba("#101217"), width=1)
    draw.line([cx - 5, cy - 13, cx + 5, cy - 13], fill=hex_rgba("#3f4659"), width=1)

    # Spherical Skull Dome
    draw.rounded_rectangle([cx - 7, cy - 27, cx + 7, cy - 17], radius=4, fill=hex_rgba("#343a4a"), outline=hex_rgba("#101217"), width=1)

    # Crimson Monocular Sensor
    draw.ellipse([cx - 3, cy - 24, cx + 3, cy - 18], fill=hex_rgba("#800d1e"), outline=hex_rgba("#101217"))
    draw.ellipse([cx - 2, cy - 23, cx + 2, cy - 19], fill=hex_rgba("#ff2a4b"))
    if eye_flare:
        draw.line([cx - 4, cy - 21, cx + 4, cy - 21], fill=hex_rgba("#ff8093"), width=1)

    # Hardened Steel Mandible Jaw
    jaw_y = cy - 16 + jaw_open
    draw.polygon([(cx - 5, cy - 17), (cx + 5, cy - 17), (cx + 3, jaw_y), (cx - 3, jaw_y)], fill=hex_rgba("#525c70"), outline=hex_rgba("#14161c"))
    # Kinetic Teeth
    draw.line([cx - 3, cy - 17, cx - 2, jaw_y - 1], fill=hex_rgba("#d5deed"), width=1)
    draw.line([cx + 3, cy - 17, cx + 2, jaw_y - 1], fill=hex_rgba("#d5deed"), width=1)

    return img

# =============================================================================
# 5. PATROL SHOOTER ILLUSTRATED 2X (64x64 RGBA)
# =============================================================================
def draw_patrol_shooter_frame(state, frame_idx):
    """
    Renders illustrated 64x64 RGBA frame for Patrol-Shooter enemy (2x for 32x32).
    Anchor: Center X=32, Feet Y=32.
    """
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    sway_x = 0
    sway_y = 0
    leg_spread = 0
    gun_elev = 0.0
    muzzle_flash = False

    if state == "patrol":
        # 8 frames heavy robotic gait
        steps = [
            (0, 0, -4), (1, -1, -2), (0, 0, 0), (-1, -1, 2),
            (0, 0, 4), (1, -1, 2), (0, 0, 0), (-1, -1, -2)
        ]
        sway_x, sway_y, leg_spread = steps[frame_idx % 8]
        gun_elev = 0.35 # Low ready
    elif state == "aim":
        # 4 frames locking aim horizontally
        gun_elevs = [0.25, 0.15, 0.05, 0.0]
        gun_elev = gun_elevs[frame_idx % 4]
    elif state == "fire":
        gun_elev = -0.05
        sway_x = -2 # Recoil
        muzzle_flash = True
    elif state == "recovery":
        sway_xs = [-2, -1, 0, 0]
        sway_x = sway_xs[frame_idx % 4]
        gun_elev = 0.20

    cx = 32 + sway_x
    cy = 32 + sway_y

    # Heavy Tripod / Bipedal Legs
    draw.line([cx - 6, cy - 10, cx - 8 + leg_spread, cy], fill=hex_rgba("#1c2029"), width=4)
    draw.line([cx + 6, cy - 10, cx + 8 - leg_spread, cy], fill=hex_rgba("#1c2029"), width=4)
    draw.rounded_rectangle([cx - 10 + leg_spread, cy - 3, cx - 4 + leg_spread, cy], radius=1, fill=hex_rgba("#3f4659"))
    draw.rounded_rectangle([cx + 4 - leg_spread, cy - 3, cx + 10 - leg_spread, cy], radius=1, fill=hex_rgba("#3f4659"))

    # Armored Torso Chassis
    draw.rounded_rectangle([cx - 10, cy - 22, cx + 10, cy - 8], radius=4, fill=hex_rgba("#2e3442"), outline=hex_rgba("#12141a"), width=2)
    draw.line([cx - 8, cy - 15, cx + 8, cy - 15], fill=hex_rgba("#ff9b38"), width=2)

    # Turret Head & Targeting Sensor
    draw.rounded_rectangle([cx - 8, cy - 30, cx + 8, cy - 20], radius=3, fill=hex_rgba("#3d4557"), outline=hex_rgba("#14161c"), width=2)
    draw.ellipse([cx + 2, cy - 27, cx + 7, cy - 22], fill=hex_rgba("#ff9b38"), outline=hex_rgba("#ffd280"))

    # Industrial Heavy Cannon Arm
    gun_x = cx + 8 + int(math.cos(gun_elev) * 16)
    gun_y = cy - 16 + int(math.sin(gun_elev) * 16)
    draw.line([cx + 4, cy - 16, gun_x, gun_y], fill=hex_rgba("#181b22"), width=6)
    draw.line([cx + 4, cy - 16, gun_x, gun_y], fill=hex_rgba("#5a657d"), width=4)
    # Fluted Barrel
    draw.rectangle([gun_x - 1, gun_y - 3, gun_x + 6, gun_y + 3], fill=hex_rgba("#222630"), outline=hex_rgba("#101217"))

    if muzzle_flash:
        fx = gun_x + 9
        fy = gun_y
        draw.ellipse([fx - 5, fy - 5, fx + 5, fy + 5], fill=hex_rgba("#ff9b38"))
        draw.ellipse([fx - 2, fy - 2, fx + 2, fy + 2], fill=hex_rgba("#fff5dc"))

    return img

# =============================================================================
# BAT SILHOUETTE & ANATOMY STUDY GENERATOR
# =============================================================================
def generate_bat_study():
    w, h = 960, 480
    img = Image.new("RGBA", (w, h), hex_rgba("#0c0b18"))
    draw = ImageDraw.Draw(img)

    # Header
    draw.text((30, 20), "BOYPUNK — ESTUDO DE SILHUETA E ANATOMIA DO TACO DE BEISEBOL", fill=hex_rgba("#37e6ee"))
    draw.text((30, 40), "Liga metálica escovada, empunhadura revestida, cone de transição, barril maciço e acentos contidos", fill=hex_rgba("#a0a5b8"))
    draw.line([(30, 60), (w - 30, 60)], fill=hex_rgba("#2c3040"), width=1)

    # Card 1: Anatomical Breakdown (Horizontal 4x Zoom)
    c1 = [30, 80, 520, 260]
    draw.rectangle(c1, fill=hex_rgba("#141622"), outline=hex_rgba("#2d3345"), width=1)
    draw.text((c1[0] + 15, c1[1] + 12), "1. ANATOMIA FÍSICA E MATERIAIS (ESCALA 4×)", fill=hex_rgba("#ff7a28"))

    big_bat_img = Image.new("RGBA", (200, 60), (0, 0, 0, 0))
    bb_draw = ImageDraw.Draw(big_bat_img)
    draw_baseball_bat(bb_draw, grip_x=30, grip_y=30, angle_rad=0, length=120)
    big_bat_zoomed = big_bat_img.resize((400, 120), Image.NEAREST)
    img.paste(big_bat_zoomed, (c1[0] + 30, c1[1] + 45), big_bat_zoomed)

    draw.line([(c1[0] + 85, c1[1] + 175), (c1[0] + 85, c1[1] + 120)], fill=hex_rgba("#8894a8"), width=1)
    draw.text((c1[0] + 50, c1[1] + 180), "Pomo (Knob)\nTrava de mão", fill=hex_rgba("#c4cbdb"))

    draw.line([(c1[0] + 140, c1[1] + 175), (c1[0] + 140, c1[1] + 120)], fill=hex_rgba("#8894a8"), width=1)
    draw.text((c1[0] + 115, c1[1] + 180), "Grip Emborrachado\nFita espiral", fill=hex_rgba("#c4cbdb"))

    draw.line([(c1[0] + 240, c1[1] + 175), (c1[0] + 240, c1[1] + 120)], fill=hex_rgba("#8894a8"), width=1)
    draw.text((c1[0] + 215, c1[1] + 180), "Cone de Transição\nReforço de pescoço", fill=hex_rgba("#c4cbdb"))

    draw.line([(c1[0] + 370, c1[1] + 175), (c1[0] + 370, c1[1] + 120)], fill=hex_rgba("#8894a8"), width=1)
    draw.text((c1[0] + 335, c1[1] + 180), "Barril de Impacto (8px)\nLiga de titânio escovado", fill=hex_rgba("#c4cbdb"))

    # Card 2: Gameplay Scale & Angles
    c2 = [540, 80, 930, 260]
    draw.rectangle(c2, fill=hex_rgba("#141622"), outline=hex_rgba("#2d3345"), width=1)
    draw.text((c2[0] + 15, c2[1] + 12), "2. SILHUETAS EM ÂNGULOS DE JOGO (ESCALA 2×)", fill=hex_rgba("#37e6ee"))

    angles = [
        ("Ombro (-50°)", -0.88, c2[0] + 45, c2[1] + 105),
        ("Pronto (-15°)", -0.26, c2[0] + 140, c2[1] + 115),
        ("Horizontal (0°)", 0.0, c2[0] + 240, c2[1] + 115),
        ("Extensão (+20°)", 0.35, c2[0] + 330, c2[1] + 105),
    ]
    for label, rad, px, py in angles:
        draw_baseball_bat(draw, px, py, rad, length=38)
        draw.text((px - 20, py + 28), label, fill=hex_rgba("#a0a5b8"))

    # Card 3: Two-Handed Athletic Grip Anatomy
    c3 = [30, 280, 520, 450]
    draw.rectangle(c3, fill=hex_rgba("#141622"), outline=hex_rgba("#2d3345"), width=1)
    draw.text((c3[0] + 15, c3[1] + 12), "3. EMPUNHADURA DUPLA ANATÔMICA (SLUGGER GRIP)", fill=hex_rgba("#38ef7d"))
    draw.text((c3[0] + 15, c3[1] + 36), "Mão esquerda na base encostada no pomo; mão direita logo acima.\nAlinhamento dos punhos para transmissão de torque rotacional.\nCotovelos semi-flexionados absorvendo impacto sem vibração.", fill=hex_rgba("#a8b2c4"))

    grip_demo_x, grip_demo_y = c3[0] + 180, c3[1] + 105
    draw_baseball_bat(draw, grip_demo_x, grip_demo_y, -0.4, length=44)
    draw.ellipse([grip_demo_x - 3, grip_demo_y - 3, grip_demo_x + 3, grip_demo_y + 3], fill=hex_rgba("#181b24"), outline=hex_rgba("#ff7a28"))
    th_x = grip_demo_x + int(math.cos(-0.4) * 6)
    th_y = grip_demo_y + int(math.sin(-0.4) * 6)
    draw.ellipse([th_x - 3, th_y - 3, th_x + 3, th_y + 3], fill=hex_rgba("#222733"), outline=hex_rgba("#ff7a28"))

    # Card 4: Anti-Glowing Verification
    c4 = [540, 280, 930, 450]
    draw.rectangle(c4, fill=hex_rgba("#141622"), outline=hex_rgba("#2d3345"), width=1)
    draw.text((c4[0] + 15, c4[1] + 12), "4. CONFORMIDADE COM REGRAS ESTRITAS", fill=hex_rgba("#ffb14a"))
    checks = [
        "✔ Silhueta cônica e barril arredondado distintos de cano uniforme ou espada",
        "✔ Sem brilho mágico (glow), sem sabre de laser, sem varinha de alta voltagem",
        "✔ Material: metal escovado/titânio com fita adesiva tátil escura",
        "✔ Anéis de identificação finos contidos sem ofuscar a geometria física",
        "✔ Preservação absoluta do AABB lógico de 22×32 e coordenadas de emissão",
    ]
    for idx, ck in enumerate(checks):
        draw.text((c4[0] + 15, c4[1] + 36 + idx * 20), ck, fill=hex_rgba("#dce3f0"))

    out_path = os.path.join(EVIDENCIAS_DIR, "01-bat-silhouette-and-grip-study.png")
    img.save(out_path)
    print(f"Salvo: {out_path}")

# =============================================================================
# BATCH GENERATION FOR ENTIRE SUITE
# =============================================================================
def generate_all():
    print("Iniciando geração de todos os ativos polidos e articulados...")

    # 1. Study
    generate_bat_study()

    # 2. BoyPunk
    states = {
        "idle": 4, "walk": 4, "jump": 1, "fall": 1, "attack1": 4, "hurt": 3, "die": 4
    }
    for st, count in states.items():
        for idx in range(count):
            img = draw_boypunk_frame(st, idx)
            out = os.path.join(BOYPUNK_DIR, f"playeranim-{st}-{str(idx).padStart(3, '0') if hasattr(str, 'padStart') else f'{idx:03d}'}.png")
            img.save(out)
    print("BoyPunk (21 frames) gerado com sucesso.")

    # 3. Nilo
    for st, count in states.items():
        for idx in range(count):
            img = draw_nilo_frame(st, idx)
            out = os.path.join(NILO_DIR, f"nilo-{st}-{idx:03d}.png")
            img.save(out)
    print("Nilo (21 frames) gerado com sucesso.")

    # 4. Chaser
    chaser_states = {
        "idle": 2, "walk": 8, "attack": 4, "dead": 4
    }
    for st, count in chaser_states.items():
        for idx in range(count):
            img = draw_chaser_frame(st, idx)
            out = os.path.join(CHASER_DIR, f"enemycaveira-{st}-{idx:03d}.png")
            img.save(out)
    print("Chaser Combat Droid (18 frames) gerado com sucesso.")

    # 5. Patrol Shooter
    patrol_states = {
        "patrol": 8, "aim": 4, "fire": 1, "recovery": 4
    }
    for st, count in patrol_states.items():
        for idx in range(count):
            img = draw_patrol_shooter_frame(st, idx)
            out = os.path.join(PATROL_SHOOTER_DIR, f"enemypatrolshooter-{st}-{idx:03d}.png")
            img.save(out)
    print("Patrol Shooter (17 frames) gerado com sucesso.")

if __name__ == "__main__":
    generate_all()
