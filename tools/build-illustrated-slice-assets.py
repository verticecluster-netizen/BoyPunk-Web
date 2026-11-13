#!/usr/bin/env python3
"""
tools/build-illustrated-slice-assets.py

Generates 2x illustrated assets for the cinematic cyberpunk visual upgrade:
1. BoyPunk Illustrated (128x192 RGBA - 2x for logical 64x96 box)
2. Nilo Illustrated (128x192 RGBA - 2x for logical 64x96 box)
3. Distrito Neon Altar Illustrated (64x96 RGBA - 2x for logical 32x48 box, 7 frames)
4. Chaser Combat Droid Illustrated (32x64 RGBA - 2x for logical 16x32 box)
5. Illustrated Energy Projectiles (16x16 RGBA - 2x for logical 8x8 box)

All assets adhere strictly to anchor contracts:
- Characters: Body center at X=32, feet line at Y=126 (logical X=16, Y=63).
- Altar: 64x96 matching 32x48 logical bounds.
- Chaser: 32x64 matching 16x32 logical bounds.
"""

import os
import math
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ASSETS_DIR = os.path.join(ROOT, "assets", "images")
BOYPUNK_ILL_DIR = os.path.join(ASSETS_DIR, "characters", "boypunk-illustrated")
NILO_ILL_DIR = os.path.join(ASSETS_DIR, "characters", "nilo-illustrated")
CHASER_ILL_DIR = os.path.join(ASSETS_DIR, "enemies", "chaser-illustrated")
WORLD_DIR = os.path.join(ASSETS_DIR, "world")

os.makedirs(BOYPUNK_ILL_DIR, exist_ok=True)
os.makedirs(NILO_ILL_DIR, exist_ok=True)
os.makedirs(CHASER_ILL_DIR, exist_ok=True)
os.makedirs(WORLD_DIR, exist_ok=True)

def hex_rgba(hex_str, alpha=255):
    hex_str = hex_str.lstrip("#")
    return (int(hex_str[0:2], 16), int(hex_str[2:4], 16), int(hex_str[4:6], 16), alpha)

def lerp(a, b, t):
    return a + (b - a) * t

def lerp_color(c1, c2, t):
    return tuple(int(lerp(c1[i], c2[i], t)) for i in range(4))

# =============================================================================
# 1. BOYPUNK ILLUSTRATED (128x192)
# =============================================================================
def draw_boypunk_frame(state, frame_idx):
    """
    Renders an illustrated 128x192 RGBA frame for BoyPunk.
    Anchor: Center X=32, Feet Y=126.
    """
    img = Image.new("RGBA", (128, 192), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Bob / animation offsets
    sway_x = 0
    sway_y = 0
    head_tilt = 0
    arm_angle = 0
    baton_swing = False
    leg_spread = 0
    hurt_flash = None
    die_stage = None

    if state == "idle":
        sway_y = [0, 1, 0, 1][frame_idx % 4]
    elif state == "walk":
        sway_y = [0, -1, 0, -1][frame_idx % 4]
        leg_spread = [-4, 0, 4, 0][frame_idx % 4]
        sway_x = [-1, 0, 1, 0][frame_idx % 4]
    elif state == "jump":
        sway_y = -3
        leg_spread = -2
    elif state == "fall":
        sway_y = 1
        leg_spread = 3
    elif state == "attack1":
        if frame_idx == 0:  # Anticipation
            arm_angle = -0.4
            sway_x = -2
        elif frame_idx == 1:  # Strike
            arm_angle = 0.6
            baton_swing = True
            sway_x = 3
        elif frame_idx == 2:  # Impact follow-through
            arm_angle = 0.8
            sway_x = 2
        elif frame_idx == 3:  # Recovery
            arm_angle = 0.2
            sway_x = 0
    elif state == "hurt":
        sway_x = -3
        sway_y = -1
        if frame_idx == 1: hurt_flash = "white"
        elif frame_idx == 2: hurt_flash = "dark"
    elif state == "die":
        die_stage = frame_idx

    # Center anchors
    cx = 32 + sway_x
    cy = 126 + sway_y

    if die_stage == 3:
        # Repouso no chão: horizontal collapsed on floor Y=126
        # Helmet resting sideways
        draw.rounded_rectangle([cx - 16, cy - 14, cx + 18, cy - 2], radius=6, fill=hex_rgba("#222733"), outline=hex_rgba("#10121a"), width=2)
        draw.line([cx - 8, cy - 9, cx + 10, cy - 9], fill=hex_rgba("#37e6ee"), width=3)
        # Body collapsed
        draw.rounded_rectangle([cx + 14, cy - 12, cx + 46, cy - 2], radius=4, fill=hex_rgba("#334d33"), outline=hex_rgba("#1a261a"), width=2)
        # Boots
        draw.rounded_rectangle([cx + 44, cy - 10, cx + 56, cy - 2], radius=3, fill=hex_rgba("#1a1c22"), outline=hex_rgba("#0d0e12"), width=2)
        return img
    elif die_stage == 2:
        # Fall impact
        cx += 6
        cy += 2

    # --- LEGS & BOOTS ---
    hip_y = cy - 30
    boot_l_x = cx - 8 + leg_spread
    boot_r_x = cx + 8 - leg_spread
    boot_y = cy - 2

    # Left Leg (dark combat cargo)
    draw.line([cx - 5, hip_y, boot_l_x, boot_y - 8], fill=hex_rgba("#1e222b"), width=8)
    draw.line([cx - 5, hip_y, boot_l_x, boot_y - 8], fill=hex_rgba("#2c3240"), width=5)
    # Left Knee armor pad
    draw.rounded_rectangle([boot_l_x - 4, hip_y + 10, boot_l_x + 4, hip_y + 18], radius=2, fill=hex_rgba("#3b4457"), outline=hex_rgba("#14161c"), width=1)
    # Left Boot
    draw.rounded_rectangle([boot_l_x - 6, boot_y - 8, boot_l_x + 6, boot_y], radius=3, fill=hex_rgba("#14161d"), outline=hex_rgba("#0b0c10"), width=2)
    draw.line([boot_l_x - 5, boot_y, boot_l_x + 5, boot_y], fill=hex_rgba("#ff7a28"), width=1)

    # Right Leg
    draw.line([cx + 5, hip_y, boot_r_x, boot_y - 8], fill=hex_rgba("#1e222b"), width=8)
    draw.line([cx + 5, hip_y, boot_r_x, boot_y - 8], fill=hex_rgba("#2c3240"), width=5)
    # Right Knee armor pad
    draw.rounded_rectangle([boot_r_x - 4, hip_y + 10, boot_r_x + 4, hip_y + 18], radius=2, fill=hex_rgba("#3b4457"), outline=hex_rgba("#14161c"), width=1)
    # Right Boot
    draw.rounded_rectangle([boot_r_x - 6, boot_y - 8, boot_r_x + 6, boot_y], radius=3, fill=hex_rgba("#14161d"), outline=hex_rgba("#0b0c10"), width=2)
    draw.line([boot_r_x - 5, boot_y, boot_r_x + 5, boot_y], fill=hex_rgba("#ff7a28"), width=1)

    # --- TORSO / JACKET ---
    torso_top = cy - 54
    torso_bot = cy - 28
    # Dark olive ballistic nylon jacket
    draw.rounded_rectangle([cx - 13, torso_top, cx + 13, torso_bot], radius=5, fill=hex_rgba("#2f452f"), outline=hex_rgba("#182418"), width=2)
    # Shadow and fabric creases
    draw.line([cx - 11, torso_top + 4, cx - 11, torso_bot - 4], fill=hex_rgba("#223322"), width=2)
    draw.line([cx + 10, torso_top + 4, cx + 10, torso_bot - 4], fill=hex_rgba("#415f41"), width=2)
    # Orange center zipper track & collar lining
    draw.line([cx, torso_top + 2, cx, torso_bot - 2], fill=hex_rgba("#ff7a28"), width=2)
    draw.polygon([(cx - 7, torso_top), (cx + 7, torso_top), (cx, torso_top + 6)], fill=hex_rgba("#ff924a"))

    # Utility belt
    draw.line([cx - 12, torso_bot - 2, cx + 12, torso_bot - 2], fill=hex_rgba("#12141a"), width=4)
    draw.rectangle([cx - 3, torso_bot - 4, cx + 3, torso_bot], fill=hex_rgba("#68748a"), outline=hex_rgba("#12141a"))

    # --- HELMET ---
    helmet_cx = cx
    helmet_cy = torso_top - 14
    # Matte graphite aerodynamic dome
    draw.rounded_rectangle([helmet_cx - 14, helmet_cy - 14, helmet_cx + 14, helmet_cy + 12], radius=9, fill=hex_rgba("#282e3d"), outline=hex_rgba("#10131a"), width=2)
    # Bevel highlight on upper plate
    draw.arc([helmet_cx - 12, helmet_cy - 12, helmet_cx + 12, helmet_cy], start=190, end=350, fill=hex_rgba("#5a6785"), width=2)
    # Ear module (orange acoustic/comm sensor)
    draw.rounded_rectangle([helmet_cx - 16, helmet_cy - 2, helmet_cx - 12, helmet_cy + 6], radius=2, fill=hex_rgba("#ff7a28"), outline=hex_rgba("#10131a"))

    # Cyan visor (smooth curved slit)
    visor_y = helmet_cy + 1
    draw.rounded_rectangle([helmet_cx - 8, visor_y - 3, helmet_cx + 12, visor_y + 3], radius=3, fill=hex_rgba("#124d57"), outline=hex_rgba("#0a252a"), width=1)
    draw.line([helmet_cx - 6, visor_y, helmet_cx + 10, visor_y], fill=hex_rgba("#37e6ee"), width=3)
    draw.line([helmet_cx - 4, visor_y - 1, helmet_cx + 5, visor_y - 1], fill=hex_rgba("#e0fcff"), width=1)

    # --- ARMS & WEAPON ---
    shoulder_y = torso_top + 4
    # Left Arm
    draw.line([cx - 12, shoulder_y, cx - 16, shoulder_y + 16], fill=hex_rgba("#2f452f"), width=6)
    draw.line([cx - 16, shoulder_y + 16, cx - 13, shoulder_y + 24], fill=hex_rgba("#223322"), width=5)

    # Right Arm (holds kinetic baton/blaster)
    hand_x = cx + 18 + int(math.cos(arm_angle) * 12)
    hand_y = shoulder_y + 14 + int(math.sin(arm_angle) * 12)
    draw.line([cx + 12, shoulder_y, cx + 16, shoulder_y + 10], fill=hex_rgba("#2f452f"), width=6)
    draw.line([cx + 16, shoulder_y + 10, hand_x, hand_y], fill=hex_rgba("#3d573d"), width=5)
    # Hand glove
    draw.ellipse([hand_x - 3, hand_y - 3, hand_x + 3, hand_y + 3], fill=hex_rgba("#14161d"), outline=hex_rgba("#ff7a28"))

    # Kinetic Baton / Blaster
    baton_dx = int(math.cos(arm_angle + 0.8) * 18)
    baton_dy = int(math.sin(arm_angle + 0.8) * 18)
    baton_tip_x = hand_x + baton_dx
    baton_tip_y = hand_y + baton_dy
    draw.line([hand_x, hand_y, baton_tip_x, baton_tip_y], fill=hex_rgba("#1f2430"), width=4)
    draw.line([hand_x, hand_y, baton_tip_x, baton_tip_y], fill=hex_rgba("#505c75"), width=2)
    # Kinetic emitter head
    draw.ellipse([baton_tip_x - 3, baton_tip_y - 3, baton_tip_x + 3, baton_tip_y + 3], fill=hex_rgba("#37e6ee"), outline=hex_rgba("#d8fdff"))

    # Attack slash arc
    if baton_swing:
        arc_cx = hand_x + 12
        arc_cy = hand_y - 4
        draw.arc([arc_cx - 24, arc_cy - 24, arc_cx + 24, arc_cy + 24], start=280, end=400, fill=hex_rgba("#37e6ee", 180), width=4)
        draw.arc([arc_cx - 22, arc_cy - 22, arc_cx + 22, arc_cy + 22], start=290, end=390, fill=hex_rgba("#ffffff", 240), width=2)

    # Hurt flash styling
    if hurt_flash == "white":
        # White damage silhouette
        mask = img.split()[3]
        white_img = Image.new("RGBA", (128, 192), hex_rgba("#ffffff", 240))
        img.paste(white_img, (0, 0), mask)
    elif hurt_flash == "dark":
        mask = img.split()[3]
        dark_img = Image.new("RGBA", (128, 192), hex_rgba("#0a0c10", 240))
        img.paste(dark_img, (0, 0), mask)

    return img

# =============================================================================
# 2. NILO ILLUSTRATED (128x192)
# =============================================================================
def draw_nilo_frame(state, frame_idx):
    """
    Renders an illustrated 128x192 RGBA frame for Nilo (android curador atompunk/nanopunk).
    Anchor: Center X=32, Feet Y=126.
    Palette: Warm Ivory armor (#f7f3e8, #ffffff), Titanium chassis (#242833),
    Amber optic visor (#ffb428), Mint nanite reactor (#2ee6a8).
    """
    img = Image.new("RGBA", (128, 192), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    sway_x = 0
    sway_y = 0
    arm_angle = 0
    leg_spread = 0
    die_stage = None
    hurt_flash = None

    if state == "idle":
        sway_y = [0, 1, 0, 1][frame_idx % 4]
    elif state == "walk":
        sway_y = [0, -1, 0, -1][frame_idx % 4]
        leg_spread = [-4, 0, 4, 0][frame_idx % 4]
        sway_x = [-1, 0, 1, 0][frame_idx % 4]
    elif state == "jump":
        sway_y = -3
        leg_spread = -2
    elif state == "fall":
        sway_y = 1
        leg_spread = 3
    elif state == "attack1":
        arm_angle = [0.2, 0.7, 0.8, 0.3][frame_idx % 4]
        sway_x = [0, 2, 2, 0][frame_idx % 4]
    elif state == "hurt":
        sway_x = -3
        if frame_idx == 1: hurt_flash = "white"
        elif frame_idx == 2: hurt_flash = "dark"
    elif state == "die":
        die_stage = frame_idx

    cx = 32 + sway_x
    cy = 126 + sway_y

    if die_stage == 3:
        # Inactive on ground
        draw.rounded_rectangle([cx - 16, cy - 14, cx + 18, cy - 2], radius=6, fill=hex_rgba("#383e4d"), outline=hex_rgba("#181a22"), width=2)
        draw.rounded_rectangle([cx + 14, cy - 12, cx + 46, cy - 2], radius=4, fill=hex_rgba("#d9d2c5"), outline=hex_rgba("#222630"), width=2)
        draw.ellipse([cx + 26, cy - 9, cx + 34, cy - 3], fill=hex_rgba("#1a382e"))  # Deactivated core
        return img

    # Legs & Feet
    hip_y = cy - 30
    boot_l_x = cx - 8 + leg_spread
    boot_r_x = cx + 8 - leg_spread
    boot_y = cy - 2

    # Left leg: chassis strut + ivory shin armor
    draw.line([cx - 5, hip_y, boot_l_x, boot_y - 8], fill=hex_rgba("#262a35"), width=8)
    draw.rounded_rectangle([boot_l_x - 5, hip_y + 8, boot_l_x + 5, boot_y - 6], radius=3, fill=hex_rgba("#f2ede2"), outline=hex_rgba("#1b1e26"), width=2)
    # Left footpad
    draw.rounded_rectangle([boot_l_x - 6, boot_y - 6, boot_l_x + 6, boot_y], radius=3, fill=hex_rgba("#2b303d"), outline=hex_rgba("#12141a"), width=2)

    # Right leg
    draw.line([cx + 5, hip_y, boot_r_x, boot_y - 8], fill=hex_rgba("#262a35"), width=8)
    draw.rounded_rectangle([boot_r_x - 5, hip_y + 8, boot_r_x + 5, boot_y - 6], radius=3, fill=hex_rgba("#f2ede2"), outline=hex_rgba("#1b1e26"), width=2)
    # Right footpad
    draw.rounded_rectangle([boot_r_x - 6, boot_y - 6, boot_r_x + 6, boot_y], radius=3, fill=hex_rgba("#2b303d"), outline=hex_rgba("#12141a"), width=2)

    # Torso (Ivory breastplate over titanium chassis)
    torso_top = cy - 54
    torso_bot = cy - 28
    # Dark internal chassis
    draw.rounded_rectangle([cx - 12, torso_top + 2, cx + 12, torso_bot], radius=4, fill=hex_rgba("#222632"), outline=hex_rgba("#101218"), width=2)
    # Curved ivory breastplate
    draw.rounded_rectangle([cx - 13, torso_top, cx + 13, torso_bot - 4], radius=6, fill=hex_rgba("#fcf8ee"), outline=hex_rgba("#2b303c"), width=2)
    draw.line([cx - 10, torso_top + 2, cx + 10, torso_top + 2], fill=hex_rgba("#ffffff"), width=2)

    # Circular nanite core (mint glow)
    core_cx = cx
    core_cy = torso_top + 13
    draw.ellipse([core_cx - 7, core_cy - 7, core_cx + 7, core_cy + 7], fill=hex_rgba("#16382c"), outline=hex_rgba("#2ee6a8"), width=2)
    draw.ellipse([core_cx - 4, core_cy - 4, core_cx + 4, core_cy + 4], fill=hex_rgba("#2ee6a8"))
    draw.ellipse([core_cx - 2, core_cy - 2, core_cx + 2, core_cy + 2], fill=hex_rgba("#e0fff5"))

    # Head (Robotic dome with occipital fin)
    head_cx = cx
    head_cy = torso_top - 14
    # Occipital cooling fin behind head
    draw.polygon([(head_cx - 12, head_cy - 8), (head_cx - 18, head_cy - 2), (head_cx - 12, head_cy + 4)], fill=hex_rgba("#3b4254"))
    # Rounded ivory robotic head
    draw.rounded_rectangle([head_cx - 13, head_cy - 13, head_cx + 13, head_cy + 11], radius=8, fill=hex_rgba("#fcf8ee"), outline=hex_rgba("#242834"), width=2)
    draw.arc([head_cx - 11, head_cy - 11, head_cx + 11, head_cy], start=190, end=350, fill=hex_rgba("#ffffff"), width=2)

    # Amber optical sensor visor
    draw.rounded_rectangle([head_cx - 8, head_cy - 2, head_cx + 11, head_cy + 4], radius=3, fill=hex_rgba("#57350d"), outline=hex_rgba("#241405"), width=1)
    draw.line([head_cx - 6, head_cy + 1, head_cx + 9, head_cy + 1], fill=hex_rgba("#ffb428"), width=3)
    draw.line([head_cx - 4, head_cy, head_cx + 6, head_cy], fill=hex_rgba("#fff2cc"), width=1)

    # Arms
    shoulder_y = torso_top + 4
    # Left arm
    draw.line([cx - 12, shoulder_y, cx - 16, shoulder_y + 14], fill=hex_rgba("#f2ede2"), width=6)
    draw.line([cx - 16, shoulder_y + 14, cx - 14, shoulder_y + 24], fill=hex_rgba("#2b303d"), width=5)

    # Right arm: Nanite repair projector forearm
    hand_x = cx + 18 + int(math.cos(arm_angle) * 12)
    hand_y = shoulder_y + 14 + int(math.sin(arm_angle) * 12)
    draw.line([cx + 12, shoulder_y, cx + 16, shoulder_y + 10], fill=hex_rgba("#f2ede2"), width=6)
    draw.line([cx + 16, shoulder_y + 10, hand_x, hand_y], fill=hex_rgba("#2b303d"), width=6)
    # Nanorepair emitter nozzle
    draw.rounded_rectangle([hand_x - 3, hand_y - 4, hand_x + 6, hand_y + 4], radius=2, fill=hex_rgba("#3d4557"), outline=hex_rgba("#2ee6a8"), width=1)
    draw.ellipse([hand_x + 4, hand_y - 2, hand_x + 8, hand_y + 2], fill=hex_rgba("#2ee6a8"))

    if hurt_flash == "white":
        mask = img.split()[3]
        white_img = Image.new("RGBA", (128, 192), hex_rgba("#ffffff", 240))
        img.paste(white_img, (0, 0), mask)
    elif hurt_flash == "dark":
        mask = img.split()[3]
        dark_img = Image.new("RGBA", (128, 192), hex_rgba("#0a0c10", 240))
        img.paste(dark_img, (0, 0), mask)

    return img

# =============================================================================
# 3. DISTRITO NEON ALTAR ILLUSTRATED (64x96)
# =============================================================================
def draw_altar_distrito_neon_frame(frame_idx):
    """
    Renders an illustrated 64x96 RGBA frame for Distrito Neon Altar (2x for 32x48).
    Urban cyber energy interface: curved dark graphite, cyan conductive busbars,
    violet decorative wings, cylindrical glass containment chamber with glowing plasma vortex.
    """
    img = Image.new("RGBA", (64, 96), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    ratio = frame_idx / 6.0
    core_radius = 4.0 + ratio * 14.0

    # 1. Base Pedestal (y = 76..95)
    # Heavy machined footing
    draw.rounded_rectangle([4, 88, 60, 95], radius=3, fill=hex_rgba("#12141c"), outline=hex_rgba("#090a10"), width=2)
    draw.line([6, 88, 58, 88], fill=hex_rgba("#384259"), width=1)

    # Base housing
    draw.rounded_rectangle([8, 76, 56, 88], radius=4, fill=hex_rgba("#1b202c"), outline=hex_rgba("#0d0f14"), width=2)
    draw.rounded_rectangle([14, 78, 50, 86], radius=2, fill=hex_rgba("#252c3c"), outline=hex_rgba("#4a5773"), width=1)

    # 4 Status LEDs on Base (y = 86..90)
    for i in range(4):
        led_x = 18 + i * 8
        draw.rounded_rectangle([led_x, 82, led_x + 5, 86], radius=1, fill=hex_rgba("#37e6ee"), outline=hex_rgba("#104852"))

    # 2. Side Structural Columns with Violet Busbars
    # Left Column
    draw.rounded_rectangle([6, 24, 16, 76], radius=3, fill=hex_rgba("#161a24"), outline=hex_rgba("#0d0e14"), width=2)
    draw.line([11, 28, 11, 72], fill=hex_rgba("#9d4edd"), width=2)
    # Right Column
    draw.rounded_rectangle([48, 24, 58, 76], radius=3, fill=hex_rgba("#161a24"), outline=hex_rgba("#0d0e14"), width=2)
    draw.line([53, 28, 53, 72], fill=hex_rgba("#9d4edd"), width=2)

    # 3. Top Cap & Antennae
    draw.rounded_rectangle([10, 16, 54, 26], radius=4, fill=hex_rgba("#1f2533"), outline=hex_rgba("#0d0e14"), width=2)
    draw.line([14, 18, 50, 18], fill=hex_rgba("#505e7d"), width=1)
    # Decorative antennae
    draw.line([14, 16, 8, 4], fill=hex_rgba("#9d4edd"), width=2)
    draw.ellipse([6, 2, 10, 6], fill=hex_rgba("#37e6ee"))
    draw.line([50, 16, 56, 4], fill=hex_rgba("#9d4edd"), width=2)
    draw.ellipse([54, 2, 58, 6], fill=hex_rgba("#37e6ee"))

    # 4. Cylindrical Glass Containment Chamber (x = 16..48, y = 26..76)
    chamber_rect = [16, 26, 48, 76]
    draw.rounded_rectangle(chamber_rect, radius=6, fill=hex_rgba("#070a14", 200), outline=hex_rgba("#20354d"), width=2)

    # Internal Plasma Energy Core
    core_cx = 32
    core_cy = 51
    if ratio > 0.05:
        # Outer soft glow aura
        aura_r = int(core_radius * 1.5)
        aura_img = Image.new("RGBA", (64, 96), (0, 0, 0, 0))
        aura_draw = ImageDraw.Draw(aura_img)
        aura_draw.ellipse([core_cx - aura_r, core_cy - aura_r, core_cx + aura_r, core_cy + aura_r], fill=hex_rgba("#9d4edd", int(100 * ratio)))
        aura_img = aura_img.filter(ImageFilter.GaussianBlur(3))
        img = Image.alpha_composite(img, aura_img)
        draw = ImageDraw.Draw(img)

        # Concentric cyan plasma core
        cr = int(core_radius)
        draw.ellipse([core_cx - cr, core_cy - cr, core_cx + cr, core_cy + cr], fill=hex_rgba("#1a8fa3", 220), outline=hex_rgba("#37e6ee"), width=2)
        inner_r = max(2, int(cr * 0.6))
        draw.ellipse([core_cx - inner_r, core_cy - inner_r, core_cx + inner_r, core_cy + inner_r], fill=hex_rgba("#37e6ee", 240))
        spec_r = max(1, int(cr * 0.3))
        draw.ellipse([core_cx - spec_r, core_cy - spec_r - 1, core_cx + spec_r, core_cy + spec_r - 1], fill=hex_rgba("#ffffff", 255))

    # Glass reflection highlight (curved vertical gleam)
    draw.line([20, 28, 20, 72], fill=hex_rgba("#ffffff", 80), width=2)
    draw.line([22, 30, 22, 70], fill=hex_rgba("#37e6ee", 50), width=1)

    return img

# =============================================================================
# 4. CHASER COMBAT DROID ILLUSTRATED (32x64)
# =============================================================================
def draw_chaser_frame(state, frame_idx):
    """
    Renders an illustrated 32x64 RGBA frame for the Chaser Combat Droid (2x for 16x32).
    Dark steel carapace (#1c1e29), amber sensor slit (#ff7a28), articulated hydraulic legs.
    """
    img = Image.new("RGBA", (32, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    sway_y = 0
    sway_x = 0
    leg_offset = 0
    blade_active = False

    if state == "idle":
        sway_y = [0, 1][frame_idx % 2]
    elif state == "walk":
        sway_y = [0, -1, 0, 1, 0, -1, 0, 1][frame_idx % 8]
        leg_offset = [-3, -1, 1, 3, 3, 1, -1, -3][frame_idx % 8]
    elif state == "attack":
        blade_active = True
        sway_x = [0, 2, 4, 1][frame_idx % 4]
    elif state == "dead":
        # Collapsed droid
        draw.rounded_rectangle([4, 48, 28, 62], radius=4, fill=hex_rgba("#181922"), outline=hex_rgba("#0a0b0f"), width=2)
        draw.line([8, 54, 24, 54], fill=hex_rgba("#383e52"), width=2)
        return img

    cx = 16 + sway_x
    cy = 62 + sway_y

    # Legs & Hydraulic Pistons
    hip_y = cy - 24
    foot_l = cx - 5 + leg_offset
    foot_r = cx + 5 - leg_offset
    foot_y = cy - 2

    # Left leg
    draw.line([cx - 4, hip_y, foot_l, foot_y], fill=hex_rgba("#181a24"), width=4)
    draw.line([cx - 4, hip_y, foot_l, foot_y], fill=hex_rgba("#2c3142"), width=2)
    draw.rectangle([foot_l - 3, foot_y - 2, foot_l + 3, foot_y], fill=hex_rgba("#3d455c"))

    # Right leg
    draw.line([cx + 4, hip_y, foot_r, foot_y], fill=hex_rgba("#181a24"), width=4)
    draw.line([cx + 4, hip_y, foot_r, foot_y], fill=hex_rgba("#2c3142"), width=2)
    draw.rectangle([foot_r - 3, foot_y - 2, foot_r + 3, foot_y], fill=hex_rgba("#3d455c"))

    # Armored Torso / Shell
    shell_top = cy - 44
    draw.rounded_rectangle([cx - 10, shell_top, cx + 10, hip_y + 4], radius=6, fill=hex_rgba("#1c1e29"), outline=hex_rgba("#0c0d12"), width=2)
    # Armor plate highlights
    draw.line([cx - 7, shell_top + 3, cx + 7, shell_top + 3], fill=hex_rgba("#434961"), width=2)

    # Amber Optical Sensor Slit
    sensor_y = shell_top + 10
    draw.rounded_rectangle([cx - 6, sensor_y - 2, cx + 6, sensor_y + 2], radius=2, fill=hex_rgba("#3b1a06"), outline=hex_rgba("#120700"), width=1)
    draw.line([cx - 4, sensor_y, cx + 4, sensor_y], fill=hex_rgba("#ff7a28"), width=2)
    draw.line([cx - 2, sensor_y, cx + 2, sensor_y], fill=hex_rgba("#ffd280"), width=1)

    # Electro-blade
    if blade_active:
        blade_x = cx + 12
        blade_y = cy - 20
        draw.polygon([(blade_x, blade_y - 12), (blade_x + 6, blade_y), (blade_x, blade_y + 4)], fill=hex_rgba("#37e6ee"), outline=hex_rgba("#ffffff"))
    else:
        # Retracted blade housing
        draw.rectangle([cx + 8, cy - 26, cx + 11, cy - 14], fill=hex_rgba("#2d3345"), outline=hex_rgba("#12141c"))

    return img

# =============================================================================
# 5. ENERGY PROJECTILES (16x16)
# =============================================================================
def draw_projectile_frame(kind="player"):
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = 8, 8

    if kind == "player":
        # Cyan Pulse Ball
        draw.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], fill=hex_rgba("#146c7d", 140))
        draw.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], fill=hex_rgba("#37e6ee", 220), outline=hex_rgba("#d8fdff"), width=1)
        draw.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=hex_rgba("#ffffff", 255))
    else:
        # Enemy Bullet
        draw.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], fill=hex_rgba("#7d1414", 140))
        draw.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], fill=hex_rgba("#ff4d3b", 220), outline=hex_rgba("#ffd8d8"), width=1)
        draw.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=hex_rgba("#ffffff", 255))

    return img

# =============================================================================
# EXECUTION & FILE SAVING
# =============================================================================
def main():
    print("Iniciando geração de assets ilustrados 2x para BoyPunk! Web...")

    # 1. BoyPunk Illustrated
    boypunk_states = [
        ("idle", 4), ("walk", 4), ("jump", 1), ("fall", 1),
        ("attack1", 4), ("hurt", 3), ("die", 4)
    ]
    for state, count in boypunk_states:
        for idx in range(count):
            img = draw_boypunk_frame(state, idx)
            out_name = f"playeranim-{state}-{StringIndex(idx)}.png"
            img.save(os.path.join(BOYPUNK_ILL_DIR, out_name), "PNG")
    print(f"✓ Gerados {sum(c for _, c in boypunk_states)} frames ilustrados para BoyPunk em {BOYPUNK_ILL_DIR}")

    # 2. Nilo Illustrated
    nilo_states = [
        ("idle", 4), ("walk", 4), ("jump", 1), ("fall", 1),
        ("attack1", 4), ("hurt", 3), ("die", 4)
    ]
    for state, count in nilo_states:
        for idx in range(count):
            img = draw_nilo_frame(state, idx)
            out_name = f"nilo-{state}-{StringIndex(idx)}.png"
            img.save(os.path.join(NILO_ILL_DIR, out_name), "PNG")
    print(f"✓ Gerados {sum(c for _, c in nilo_states)} frames ilustrados para Nilo em {NILO_ILL_DIR}")

    # 3. Altar Distrito Neon Illustrated (7 frames: 000..006)
    for idx in range(7):
        img = draw_altar_distrito_neon_frame(idx)
        out_name = f"altar-distrito-neon-illustrated-{StringIndex(idx)}.png"
        img.save(os.path.join(WORLD_DIR, out_name), "PNG")
    print(f"✓ Gerados 7 frames ilustrados para o Altar de Distrito Neon em {WORLD_DIR}")

    # 4. Chaser Combat Droid Illustrated
    chaser_states = [("idle", 2), ("walk", 8), ("attack", 4), ("dead", 4)]
    for state, count in chaser_states:
        for idx in range(count):
            img = draw_chaser_frame(state, idx)
            out_name = f"enemycaveira-{state}-{StringIndex(idx)}.png"
            img.save(os.path.join(CHASER_ILL_DIR, out_name), "PNG")
    print(f"✓ Gerados {sum(c for _, c in chaser_states)} frames ilustrados para o Chaser em {CHASER_ILL_DIR}")

    # 5. Projectiles
    p_bullet = draw_projectile_frame("player")
    p_bullet.save(os.path.join(BOYPUNK_ILL_DIR, "bulletcandymachine-normal-000.png"), "PNG")
    e_bullet = draw_projectile_frame("enemy")
    e_bullet.save(os.path.join(CHASER_ILL_DIR, "enemybalabasic-walk-000.png"), "PNG")
    print("✓ Gerados projéteis ilustrados para jogador e inimigo.")

def StringIndex(idx):
    return str(idx).zfill(3)

if __name__ == "__main__":
    main()
