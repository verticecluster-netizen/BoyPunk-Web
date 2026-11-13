#!/usr/bin/env python3
"""
Artisan Pixel-Art Generator & Rig for Patrol-Shooter Combat Droid (32x32 RGBA)
BoyPunk-Web
Specialized in Humanoid Robotics, Articulated Machinery & Ranged Combatants.

Technical & Artistic Specifications:
- Dimensions: 32x32 RGBA canvas, transparent background.
- Physical Collider: 16x32 centered (canvas x: 8..23, y: 0..31).
- Baseline: Ground contact at y = 31 (bottom row).
- Canonical Orientation: Facing LEFT (mirrored horizontally by engine when facing > 0).
- Muzzle Emission Anchor: Local (6, 13) in 32x32 canvas, matching gameplay projectile spawn.
- Aesthetics: Graphite armor (#2c3244, #4c566e, #7884a0), #000000 1px outline,
  restrained orange accents (#ff7a28, #ba4b12), cyan optics & conduits (#37e6ee, #c8faff).
- Articulation: Distinct bipedal humanoid robotics with head, torso, pelvis,
  articulated legs (contact, dip, pass, extension), two-handed rifle carry.
"""
import os
import shutil
from PIL import Image

# --- COLOR DEFINITIONS (BoyPunk Master Cyberpunk Palette) ---
C_TRANS = (0, 0, 0, 0)
C_BLACK = (0, 0, 0, 255)            # #000000 - Crisp 1px outline & joint seams
C_RECESS = (10, 11, 16, 255)         # #0a0b10 - Deep recesses, joint shadow cutaways
C_FRAME = (24, 28, 40, 255)          # #181c28 - Chassis interior frame, joint pivots, spinal vertebrae
C_BASE = (44, 50, 68, 255)           # #2c3244 - Primary dark metallic armor plate (Graphite)
C_LIGHT = (76, 86, 110, 255)         # #4c566e - Armor midtone / bevel highlight
C_HI = (120, 132, 160, 255)          # #7884a0 - Armor specular rim / plate chamfer
C_BRIGHT_HI = (175, 188, 212, 255)   # #afbcd4 - Specular crest highlight

# Far limb depth shading (subdued rear silhouette)
C_FAR_RECESS = (8, 9, 14, 255)
C_FAR_FRAME = (16, 18, 26, 255)
C_FAR_BASE = (28, 32, 44, 255)
C_FAR_LIGHT = (46, 52, 70, 255)

# Orange warning accents & identifiers (Restrained accents)
C_AMB_DARK = (186, 75, 18, 255)      # #ba4b12 - Shadow / rim
C_AMB_BASE = (255, 122, 40, 255)     # #ff7a28 - Primary orange accent
C_AMB_BRIGHT = (255, 205, 80, 255)   # #ffcd50 - Intense warning indicator
C_AMB_HOT = (255, 245, 215, 255)     # #fff5d7 - Core specular amber

# Cyan optics & plasma power conduits
C_CYN_DARK = (20, 108, 125, 255)     # #146c7d - Housing conduit recess
C_CYN_BASE = (55, 230, 238, 255)     # #37e6ee - Active optic sensor & plasma core
C_CYN_HOT = (200, 250, 255, 255)     # #c8faff - Specular energy bloom
C_WHITE = (255, 255, 255, 255)

def new_canvas():
    return Image.new("RGBA", (32, 32), C_TRANS)

def px(img, x, y, color):
    if 0 <= x < 32 and 0 <= y < 32 and color[3] > 0:
        img.putpixel((x, y), color)

def rect(img, x1, y1, x2, y2, color):
    for y in range(y1, y2 + 1):
        for x in range(x1, x2 + 1):
            px(img, x, y, color)

def draw_head(img, ox, oy, visor_state="normal"):
    """
    Articulated combat sensor helmet facing LEFT.
    ox, oy: head anchor (top-right/center of helmet, ox ~ 13, oy ~ 3..5)
    """
    # Dome top crest (y=oy)
    px(img, ox + 1, oy, C_BLACK)
    for x in range(ox + 2, ox + 6):
        px(img, x, oy, C_HI)
    px(img, ox + 6, oy, C_BLACK)

    # Dome upper plate (y=oy+1)
    px(img, ox, oy + 1, C_BLACK)
    px(img, ox + 1, oy + 1, C_HI)
    for x in range(ox + 2, ox + 5):
        px(img, x, oy + 1, C_LIGHT)
    px(img, ox + 5, oy + 1, C_HI)
    px(img, ox + 6, oy + 1, C_BLACK)

    # Forehead brow & visor cowl (y=oy+2) - Facing LEFT
    px(img, ox - 1, oy + 2, C_BLACK)
    px(img, ox, oy + 2, C_HI)
    px(img, ox + 1, oy + 2, C_LIGHT)
    px(img, ox + 2, oy + 2, C_BASE)
    px(img, ox + 3, oy + 2, C_BASE)
    px(img, ox + 4, oy + 2, C_AMB_BASE)  # Orange comm accent on temple
    px(img, ox + 5, oy + 2, C_LIGHT)
    px(img, ox + 6, oy + 2, C_BLACK)

    # Optic Visor row (y=oy+3) - Sensor slit facing LEFT
    px(img, ox - 2, oy + 3, C_BLACK)
    if visor_state == "normal":
        px(img, ox - 1, oy + 3, C_CYN_HOT)
        px(img, ox, oy + 3, C_CYN_BASE)
        px(img, ox + 1, oy + 3, C_CYN_BASE)
    elif visor_state == "bright":
        px(img, ox - 1, oy + 3, C_WHITE)
        px(img, ox, oy + 3, C_CYN_HOT)
        px(img, ox + 1, oy + 3, C_CYN_HOT)
    elif visor_state == "aim":
        px(img, ox - 1, oy + 3, C_CYN_HOT)
        px(img, ox, oy + 3, C_AMB_BRIGHT)
        px(img, ox + 1, oy + 3, C_CYN_BASE)
    elif visor_state == "fire":
        px(img, ox - 1, oy + 3, C_WHITE)
        px(img, ox, oy + 3, C_WHITE)
        px(img, ox + 1, oy + 3, C_CYN_HOT)
    else:  # dim
        px(img, ox - 1, oy + 3, C_CYN_DARK)
        px(img, ox, oy + 3, C_CYN_DARK)
        px(img, ox + 1, oy + 3, C_FRAME)

    px(img, ox + 2, oy + 3, C_RECESS)
    px(img, ox + 3, oy + 3, C_BASE)
    px(img, ox + 4, oy + 3, C_AMB_DARK)
    px(img, ox + 5, oy + 3, C_BASE)
    px(img, ox + 6, oy + 3, C_BLACK)

    # Mandible / lower sensor cowl (y=oy+4)
    px(img, ox - 1, oy + 4, C_BLACK)
    px(img, ox, oy + 4, C_HI)
    px(img, ox + 1, oy + 4, C_LIGHT)
    px(img, ox + 2, oy + 4, C_BASE)
    px(img, ox + 3, oy + 4, C_FRAME)
    px(img, ox + 4, oy + 4, C_FRAME)
    px(img, ox + 5, oy + 4, C_LIGHT)
    px(img, ox + 6, oy + 4, C_BLACK)

    # Chin & neck actuator socket (y=oy+5)
    px(img, ox, oy + 5, C_BLACK)
    px(img, ox + 1, oy + 5, C_BASE)
    px(img, ox + 2, oy + 5, C_FRAME)
    px(img, ox + 3, oy + 5, C_RECESS)
    px(img, ox + 4, oy + 5, C_FRAME)
    px(img, ox + 5, oy + 5, C_BLACK)

    # Hydraulic neck collar (y=oy+6)
    px(img, ox + 1, oy + 6, C_BLACK)
    px(img, ox + 2, oy + 6, C_RECESS)
    px(img, ox + 3, oy + 6, C_FRAME)
    px(img, ox + 4, oy + 6, C_BLACK)

def draw_torso(img, tx, ty, core_state="normal"):
    """
    Armored humanoid thorax with central cyan plasma conduit and mechanical spinal column.
    tx, ty: top-left of chest plate, typically tx ~ 13, ty ~ 10..12
    """
    # Clavicle plate & collar rim (y=ty)
    px(img, tx, ty, C_BLACK)
    px(img, tx + 1, ty, C_HI)
    for x in range(tx + 2, tx + 6):
        px(img, x, ty, C_LIGHT)
    px(img, tx + 6, ty, C_HI)
    px(img, tx + 7, ty, C_BLACK)

    # Upper pectoral & reactor top (y=ty+1)
    px(img, tx - 1, ty + 1, C_BLACK)
    px(img, tx, ty + 1, C_HI)
    px(img, tx + 1, ty + 1, C_LIGHT)
    px(img, tx + 2, ty + 1, C_BASE)
    px(img, tx + 3, ty + 1, C_CYN_DARK if core_state != "dim" else C_FRAME)
    px(img, tx + 4, ty + 1, C_BASE)
    px(img, tx + 5, ty + 1, C_BASE)
    px(img, tx + 6, ty + 1, C_LIGHT)
    px(img, tx + 7, ty + 1, C_BLACK)

    # Reactor center / power core (y=ty+2)
    px(img, tx - 1, ty + 2, C_BLACK)
    px(img, tx, ty + 2, C_LIGHT)
    px(img, tx + 1, ty + 2, C_BASE)
    if core_state == "normal":
        px(img, tx + 2, ty + 2, C_CYN_DARK)
        px(img, tx + 3, ty + 2, C_CYN_BASE)
        px(img, tx + 4, ty + 2, C_CYN_DARK)
    elif core_state == "bright":
        px(img, tx + 2, ty + 2, C_CYN_BASE)
        px(img, tx + 3, ty + 2, C_CYN_HOT)
        px(img, tx + 4, ty + 2, C_CYN_BASE)
    elif core_state == "aim":
        px(img, tx + 2, ty + 2, C_CYN_BASE)
        px(img, tx + 3, ty + 2, C_CYN_HOT)
        px(img, tx + 4, ty + 2, C_CYN_BASE)
    elif core_state == "fire":
        px(img, tx + 2, ty + 2, C_CYN_HOT)
        px(img, tx + 3, ty + 2, C_WHITE)
        px(img, tx + 4, ty + 2, C_CYN_HOT)
    else:
        px(img, tx + 2, ty + 2, C_FRAME)
        px(img, tx + 3, ty + 2, C_CYN_DARK)
        px(img, tx + 4, ty + 2, C_FRAME)

    px(img, tx + 5, ty + 2, C_BASE)
    px(img, tx + 6, ty + 2, C_AMB_BASE)  # Orange accent plate on dorsal flank
    px(img, tx + 7, ty + 2, C_BLACK)

    # Lower ribcage plate (y=ty+3)
    px(img, tx - 1, ty + 3, C_BLACK)
    px(img, tx, ty + 3, C_BASE)
    px(img, tx + 1, ty + 3, C_FRAME)
    px(img, tx + 2, ty + 3, C_BASE)
    px(img, tx + 3, ty + 3, C_CYN_DARK if core_state != "dim" else C_FRAME)
    px(img, tx + 4, ty + 3, C_BASE)
    px(img, tx + 5, ty + 3, C_FRAME)
    px(img, tx + 6, ty + 3, C_AMB_DARK)
    px(img, tx + 7, ty + 3, C_BLACK)

    # Mechanical waist / lumbar vertebra (y=ty+4) - narrow silhouette cutaway
    px(img, tx, ty + 4, C_BLACK)
    px(img, tx + 1, ty + 4, C_FRAME)
    px(img, tx + 2, ty + 4, C_RECESS)
    px(img, tx + 3, ty + 4, C_FRAME)
    px(img, tx + 4, ty + 4, C_RECESS)
    px(img, tx + 5, ty + 4, C_FRAME)
    px(img, tx + 6, ty + 4, C_BLACK)

    # Lower spinal pivot (y=ty+5)
    px(img, tx, ty + 5, C_BLACK)
    px(img, tx + 1, ty + 5, C_RECESS)
    px(img, tx + 2, ty + 5, C_FRAME)
    px(img, tx + 3, ty + 5, C_RECESS)
    px(img, tx + 4, ty + 5, C_FRAME)
    px(img, tx + 5, ty + 5, C_RECESS)
    px(img, tx + 6, ty + 5, C_BLACK)

def draw_pelvis(img, px_val, py_val):
    """
    Armored pelvis girder and hip socket assembly.
    px_val, py_val: typically px ~ 13, py ~ 17..19
    """
    # Pelvis upper flange (y=py)
    px(img, px_val, py_val, C_BLACK)
    px(img, px_val + 1, py_val, C_HI)
    for x in range(px_val + 2, px_val + 6):
        px(img, x, py_val, C_BASE)
    px(img, px_val + 6, py_val, C_LIGHT)
    px(img, px_val + 7, py_val, C_BLACK)

    # Pelvis plate & hip socket cavities (y=py+1)
    px(img, px_val - 1, py_val + 1, C_BLACK)
    px(img, px_val, py_val + 1, C_LIGHT)
    px(img, px_val + 1, py_val + 1, C_RECESS)   # near hip pivot
    px(img, px_val + 2, py_val + 1, C_FRAME)
    px(img, px_val + 3, py_val + 1, C_BASE)
    px(img, px_val + 4, py_val + 1, C_FRAME)
    px(img, px_val + 5, py_val + 1, C_FAR_RECESS) # far hip pivot
    px(img, px_val + 6, py_val + 1, C_BASE)
    px(img, px_val + 7, py_val + 1, C_BLACK)

    # Pelvis bottom bracket (y=py+2)
    px(img, px_val, py_val + 2, C_BLACK)
    px(img, px_val + 1, py_val + 2, C_BASE)
    px(img, px_val + 2, py_val + 2, C_FRAME)
    px(img, px_val + 3, py_val + 2, C_RECESS)
    px(img, px_val + 4, py_val + 2, C_FRAME)
    px(img, px_val + 5, py_val + 2, C_FAR_FRAME)
    px(img, px_val + 6, py_val + 2, C_BLACK)

def draw_leg_segment(img, x1, y1, x2, y2, is_far=False):
    """Draws an articulated robotic limb segment with outline and metallic fill."""
    steps = max(abs(x2 - x1), abs(y2 - y1), 1)
    c_out = C_BLACK if not is_far else C_FAR_RECESS
    c_fill = C_BASE if not is_far else C_FAR_BASE
    c_hi = C_LIGHT if not is_far else C_FAR_LIGHT

    for i in range(steps + 1):
        t = i / steps
        cx = int(round(x1 + (x2 - x1) * t))
        cy = int(round(y1 + (y2 - y1) * t))
        px(img, cx - 1, cy, c_out)
        px(img, cx, cy, c_fill)
        px(img, cx + 1, cy, c_hi if not is_far else c_fill)
        px(img, cx + 2, cy, c_out)

def draw_knee_joint(img, kx, ky, is_far=False):
    """Articulated cylindrical knee hinge pin."""
    c_pin = C_HI if not is_far else C_FAR_LIGHT
    c_casing = C_FRAME if not is_far else C_FAR_FRAME
    c_out = C_BLACK if not is_far else C_FAR_RECESS

    px(img, kx - 1, ky - 1, c_out)
    px(img, kx, ky - 1, c_casing)
    px(img, kx + 1, ky - 1, c_out)

    px(img, kx - 1, ky, c_casing)
    px(img, kx, ky, c_pin)
    px(img, kx + 1, ky, c_casing)

    px(img, kx - 1, ky + 1, c_out)
    px(img, kx, ky + 1, c_casing)
    px(img, kx + 1, ky + 1, c_out)

def draw_combat_boot(img, fx, fy, is_far=False, heel_lift=0, toe_lift=0):
    """
    Reinforced industrial combat boot resting on y=31 or articulating during stride.
    fx, fy: ankle position (typically fy ~ 29..30)
    heel_lift: pixels heel is lifted off ground
    toe_lift: pixels toe is lifted off ground
    """
    c_out = C_BLACK if not is_far else C_FAR_RECESS
    c_base = C_BASE if not is_far else C_FAR_BASE
    c_light = C_LIGHT if not is_far else C_FAR_LIGHT
    c_hi = C_HI if not is_far else C_FAR_LIGHT
    c_sole = C_FRAME if not is_far else C_FAR_FRAME

    # Ankle cuff (y = fy)
    px(img, fx - 1, fy, c_out)
    px(img, fx, fy, c_light)
    px(img, fx + 1, fy, c_base)
    px(img, fx + 2, fy, c_out)

    # Foot upper / vamp (y = fy + 1, typically 30)
    y_vamp = fy + 1
    px(img, fx - 2, y_vamp - toe_lift, c_out)
    px(img, fx - 1, y_vamp - toe_lift, c_hi)
    px(img, fx, y_vamp, c_light)
    px(img, fx + 1, y_vamp, c_base)
    px(img, fx + 2, y_vamp - heel_lift, c_out)

    # Sole / tread (y = 31 or lifted)
    y_sole = min(31, fy + 2)
    # Toe cap to heel
    for x in range(fx - 2, fx + 2):
        lift = toe_lift if x < fx else heel_lift
        cur_y = y_sole - lift
        px(img, x, cur_y, c_sole)
        # 1px bottom outline
        px(img, x, cur_y + 1 if cur_y < 31 else cur_y, c_out if cur_y < 31 else c_sole)

    px(img, fx - 3, y_sole - toe_lift, c_out)
    px(img, fx + 2, y_sole - heel_lift, c_out)

def draw_leg(img, hx, hy, kx, ky, fx, fy, is_far=False, heel_lift=0, toe_lift=0):
    """Complete articulated robotic leg: thigh -> knee -> shin -> boot."""
    # Thigh segment
    draw_leg_segment(img, hx, hy + 1, kx, ky - 1, is_far)
    # Knee actuator joint
    draw_knee_joint(img, kx, ky, is_far)
    # Shin segment
    draw_leg_segment(img, kx, ky + 1, fx, fy - 1, is_far)
    # Combat boot
    draw_combat_boot(img, fx, fy, is_far, heel_lift, toe_lift)

def draw_pulse_rifle_patrol(img, rx, ry):
    """
    Carried in low-ready two-handed combat grip across chest during patrol.
    rx, ry: anchor of rifle receiver (typically rx ~ 11, ry ~ 14..15)
    Barrel points forward/downward toward (7, 16).
    """
    # Stock (resting near arm/torso)
    px(img, rx + 4, ry - 1, C_BLACK)
    px(img, rx + 4, ry, C_FRAME)
    px(img, rx + 5, ry, C_BLACK)

    # Receiver / action casing
    px(img, rx + 1, ry - 1, C_BLACK)
    px(img, rx + 2, ry - 1, C_BASE)
    px(img, rx + 3, ry - 1, C_LIGHT)
    px(img, rx + 4, ry - 1, C_BLACK)

    px(img, rx, ry, C_BLACK)
    px(img, rx + 1, ry, C_LIGHT)
    px(img, rx + 2, ry, C_BASE)
    px(img, rx + 3, ry, C_AMB_BASE)  # Orange diagnostic line on receiver
    px(img, rx + 4, ry, C_FRAME)

    # Trigger assembly & magazine
    px(img, rx + 2, ry + 1, C_RECESS)
    px(img, rx + 3, ry + 1, C_FRAME)
    px(img, rx + 4, ry + 1, C_BLACK)

    # Fore-end & barrel (pointing forward-down)
    px(img, rx - 1, ry, C_BLACK)
    px(img, rx - 1, ry + 1, C_LIGHT)
    px(img, rx, ry + 1, C_BASE)
    px(img, rx + 1, ry + 1, C_CYN_BASE)  # Cyan power conduit along shroud

    # Shroud bottom & handguard
    px(img, rx - 2, ry + 1, C_BLACK)
    px(img, rx - 2, ry + 2, C_FRAME)  # Foregrip support
    px(img, rx - 1, ry + 2, C_BLACK)

    # Barrel tip
    px(img, rx - 3, ry + 1, C_BLACK)
    px(img, rx - 3, ry + 2, C_LIGHT)
    px(img, rx - 4, ry + 2, C_BLACK)

def draw_pulse_rifle_aim(img, rx, ry, state="aim"):
    """
    Rifle held in rigid, locked shoulder aim position.
    CRITICAL ANCHOR: Weapon muzzle tip MUST align precisely at canonical local (6, 13)!
    rx, ry: anchor positioned so barrel muzzle reaches (6, 13).
    When rx = 10, ry = 13:
      Barrel tip at (6, 13).
    """
    # Muzzle tip exactly at local (6, 13)
    # Outline around muzzle: (5, 13), (6, 12), (6, 14)
    px(img, 5, 13, C_BLACK)
    px(img, 6, 12, C_BLACK)
    px(img, 6, 14, C_BLACK)

    # Muzzle aperture
    if state == "fire":
        # Intense muzzle flash & plasma discharge!
        px(img, 6, 13, C_WHITE)
        px(img, 5, 12, C_CYN_HOT)
        px(img, 5, 13, C_WHITE)
        px(img, 5, 14, C_CYN_HOT)
        px(img, 4, 13, C_CYN_HOT)
        px(img, 3, 13, C_CYN_BASE)
        # Ambient bloom
        px(img, 4, 12, C_CYN_BASE)
        px(img, 4, 14, C_CYN_BASE)
    elif state == "aim_3":
        px(img, 6, 13, C_WHITE)
        px(img, 5, 13, C_CYN_HOT)
    elif state == "aim_2":
        px(img, 6, 13, C_CYN_HOT)
    elif state == "aim_1":
        px(img, 6, 13, C_CYN_BASE)
    else:  # aim_0, recovery
        px(img, 6, 13, C_CYN_DARK if "recovery" in state else C_CYN_BASE)

    # Barrel tube (x: 7..9, y: 13)
    px(img, 7, 12, C_BLACK)
    px(img, 7, 13, C_LIGHT if state != "fire" else C_CYN_HOT)
    px(img, 7, 14, C_BLACK)

    px(img, 8, 12, C_BLACK)
    px(img, 8, 13, C_BASE if state != "fire" else C_WHITE)
    px(img, 8, 14, C_BLACK)

    px(img, 9, 12, C_BLACK)
    px(img, 9, 13, C_LIGHT if state != "fire" else C_CYN_HOT)
    px(img, 9, 14, C_BLACK)

    # Top rail optic sight (x: 8..11, y: 11..12) - Emits target warning lock
    px(img, 8, 11, C_BLACK)
    if state == "fire":
        px(img, 9, 11, C_WHITE)
        px(img, 10, 11, C_CYN_HOT)
    elif state == "aim_3":
        px(img, 9, 11, C_WHITE)
        px(img, 10, 11, C_AMB_BRIGHT)
    elif state == "aim_2":
        px(img, 9, 11, C_CYN_HOT)
        px(img, 10, 11, C_AMB_BASE)
    elif state == "aim_1":
        px(img, 9, 11, C_CYN_HOT)
        px(img, 10, 11, C_CYN_BASE)
    elif state == "recovery_0":
        px(img, 9, 11, C_AMB_BRIGHT)
        px(img, 10, 11, C_AMB_DARK)
    elif state == "recovery_1":
        px(img, 9, 11, C_AMB_DARK)
        px(img, 10, 11, C_FRAME)
    elif state == "recovery_3":
        px(img, 9, 11, C_CYN_DARK)
        px(img, 10, 11, C_AMB_BASE)  # Standby cycle LED
    else:
        px(img, 9, 11, C_CYN_BASE)
        px(img, 10, 11, C_CYN_DARK)
    px(img, 11, 11, C_BLACK)

    # Shroud & heat dissipation cooling fins (x: 10..13, y: 12..14)
    for x in range(10, 14):
        px(img, x, 12, C_HI)
        px(img, x, 13, C_BASE)
        px(img, x, 14, C_FRAME)

    # Orange accent line along rifle shroud
    px(img, 11, 13, C_AMB_BASE)
    px(img, 12, 13, C_AMB_BASE)

    # Plasma chamber conduit
    if state == "fire":
        px(img, 10, 13, C_CYN_HOT)
        px(img, 11, 13, C_WHITE)
    elif state == "aim_3":
        px(img, 10, 13, C_CYN_HOT)
        px(img, 11, 13, C_CYN_HOT)
    elif state == "aim_2":
        px(img, 10, 13, C_CYN_BASE)
        px(img, 11, 13, C_CYN_HOT)
    elif state == "recovery_0":
        px(img, 10, 13, C_AMB_HOT)
        px(img, 11, 13, C_AMB_BRIGHT)
    elif state == "recovery_1":
        px(img, 10, 13, C_AMB_BRIGHT)
        px(img, 11, 13, C_AMB_DARK)
    elif state == "recovery_2":
        px(img, 10, 13, C_AMB_DARK)
        px(img, 11, 13, C_CYN_DARK)
    else:
        px(img, 10, 13, C_CYN_DARK)

    # Receiver & ejection port (x: 14..16, y: 12..14)
    for x in range(14, 17):
        px(img, x, 12, C_LIGHT)
        px(img, x, 13, C_BASE)
        px(img, x, 14, C_RECESS)

    px(img, 14, 11, C_BLACK)
    px(img, 15, 11, C_BLACK)
    px(img, 16, 11, C_BLACK)

    # Stock & shoulder pad (x: 17..18, y: 12..15)
    px(img, 17, 12, C_FRAME)
    px(img, 17, 13, C_BASE)
    px(img, 17, 14, C_FRAME)
    px(img, 17, 15, C_BLACK)

    px(img, 18, 12, C_BLACK)
    px(img, 18, 13, C_RECESS)
    px(img, 18, 14, C_FRAME)
    px(img, 18, 15, C_BLACK)

    # Lower magazine & trigger housing (x: 13..15, y: 15..16)
    px(img, 13, 15, C_BLACK)
    px(img, 14, 15, C_FRAME)
    px(img, 15, 15, C_BLACK)

    px(img, 14, 16, C_RECESS)
    px(img, 15, 16, C_BLACK)

    # Outlines top and bottom
    for x in range(10, 14):
        px(img, x, 15, C_BLACK)

def draw_arms_patrol(img, tx, ty, rx, ry):
    """
    Mechanically believable two-handed weapon hold during locomotion.
    Right arm (rear/far) grips handle at (rx+4, ry), near arm grips fore-end at (rx-1, ry+2).
    """
    # Far shoulder & arm (subdued depth)
    px(img, tx + 6, ty + 1, C_FAR_BASE)
    px(img, tx + 7, ty + 2, C_FAR_LIGHT)
    px(img, tx + 6, ty + 3, C_FAR_FRAME)
    px(img, rx + 4, ry - 1, C_FAR_LIGHT)  # Far hand on stock/trigger

    # Near shoulder pauldron (facing viewer, graphite with specular rim)
    px(img, tx + 2, ty + 1, C_BLACK)
    px(img, tx + 1, ty + 2, C_BLACK)
    px(img, tx + 2, ty + 2, C_HI)
    px(img, tx + 3, ty + 2, C_LIGHT)
    px(img, tx + 4, ty + 2, C_AMB_BASE)  # Orange shoulder unit insignia
    px(img, tx + 5, ty + 2, C_BLACK)

    px(img, tx + 1, ty + 3, C_BLACK)
    px(img, tx + 2, ty + 3, C_LIGHT)
    px(img, tx + 3, ty + 3, C_BASE)
    px(img, tx + 4, ty + 3, C_FRAME)
    px(img, tx + 5, ty + 3, C_BLACK)

    # Near bicep & elbow actuator
    px(img, tx + 2, ty + 4, C_FRAME)
    px(img, tx + 3, ty + 4, C_BASE)
    px(img, tx + 4, ty + 4, C_HI)  # Elbow hinge pin

    # Forearm extending to rifle foregrip
    px(img, rx, ry + 2, C_LIGHT)
    px(img, rx + 1, ry + 3, C_BASE)
    px(img, rx + 2, ry + 3, C_FRAME)

    # Near hand holding rifle handguard
    px(img, rx - 1, ry + 1, C_BLACK)
    px(img, rx - 1, ry + 2, C_HI)
    px(img, rx, ry + 2, C_BASE)

def draw_arms_aim(img, tx, ty, recoil_x=0):
    """
    Rigid two-handed firing stance.
    Shoulders braced, rifle held to chest, left arm extended along barrel.
    recoil_x: pixel offset during fire/recovery kickback.
    """
    # Far arm (supporting rear stock)
    px(img, tx + 5, ty + 2, C_FAR_LIGHT)
    px(img, tx + 6, ty + 3, C_FAR_BASE)
    px(img, 15 + recoil_x, 14, C_FAR_LIGHT)  # Far hand on trigger

    # Near shoulder pauldron (reinforced)
    px(img, tx + 1, ty + 1, C_BLACK)
    px(img, tx + 2, ty + 1, C_HI)
    px(img, tx + 3, ty + 1, C_LIGHT)
    px(img, tx + 4, ty + 1, C_BLACK)

    px(img, tx, ty + 2, C_BLACK)
    px(img, tx + 1, ty + 2, C_HI)
    px(img, tx + 2, ty + 2, C_LIGHT)
    px(img, tx + 3, ty + 2, C_AMB_BASE)  # Orange unit marker
    px(img, tx + 4, ty + 2, C_BLACK)

    px(img, tx + 1, ty + 3, C_BLACK)
    px(img, tx + 2, ty + 3, C_BASE)
    px(img, tx + 3, ty + 3, C_FRAME)
    px(img, tx + 4, ty + 3, C_BLACK)

    # Forearm bracing underneath rifle handguard
    px(img, 10 + recoil_x, 15, C_BLACK)
    px(img, 11 + recoil_x, 15, C_HI)    # Left hand gripping shroud
    px(img, 12 + recoil_x, 15, C_LIGHT)
    px(img, 13 + recoil_x, 15, C_FRAME)

    # Elbow joint
    px(img, 12 + recoil_x, 16, C_HI)
    px(img, 13 + recoil_x, 16, C_BASE)

# ==============================================================================
# FRAME BUILDERS
# ==============================================================================

def build_patrol_frame(frame_index):
    """
    Builds one frame of the 8-frame locomotion cycle (0..7).
    Speed: 34 px/s. Full stride cycle in 8 frames.
    Contact, weight acceptance / cushion, passing, leg extension.
    """
    img = new_canvas()

    # Kinematics parameters per frame:
    # [head_oy, torso_ty, pelvis_py,
    #  near_hx, near_hy, near_kx, near_ky, near_fx, near_fy, near_heel, near_toe,
    #  far_hx, far_hy, far_kx, far_ky, far_fx, far_fy, far_heel, far_toe,
    #  torso_rot]
    cycles = [
        # Frame 0: Near Leg Strike (Contact 1), Far Leg Push-off
        # Near strikes at x=11, y=31; Far toes at x=21, y=31
        {"oy": 4, "ty": 11, "py": 18,
         "n_hx": 14, "n_hy": 20, "n_kx": 12, "n_ky": 25, "n_fx": 11, "n_fy": 30, "n_h": 0, "n_t": 1,
         "f_hx": 17, "f_hy": 20, "f_kx": 19, "f_ky": 25, "f_fx": 21, "f_fy": 30, "f_h": 1, "f_t": 0},

        # Frame 1: Weight Acceptance / Cushion (Near Knee flexes, body dips 1px)
        # Near foot plants flat at x=12, y=31; Far foot rolls to toe at x=22
        {"oy": 5, "ty": 12, "py": 19,
         "n_hx": 14, "n_hy": 21, "n_kx": 13, "n_ky": 26, "n_fx": 12, "n_fy": 30, "n_h": 0, "n_t": 0,
         "f_hx": 17, "f_hy": 21, "f_kx": 20, "f_ky": 26, "f_fx": 22, "f_fy": 30, "f_h": 2, "f_t": 0},

        # Frame 2: Passing Pose 1 (Near supports weight at x=14, Far swings forward with knee clearance)
        # Far foot at x=16, y=28 (lifted 3px off floor)
        {"oy": 4, "ty": 11, "py": 18,
         "n_hx": 14, "n_hy": 20, "n_kx": 14, "n_ky": 25, "n_fx": 14, "n_fy": 30, "n_h": 0, "n_t": 0,
         "f_hx": 17, "f_hy": 20, "f_kx": 16, "f_ky": 24, "f_fx": 16, "f_fy": 27, "f_h": 3, "f_t": 3},

        # Frame 3: Extension / High Point 1 (Near leg straight, Far reaches forward to strike)
        # Body rises 1px (high point: oy=3, ty=10, py=17). Far foot reaches x=11, y=30
        {"oy": 3, "ty": 10, "py": 17,
         "n_hx": 14, "n_hy": 19, "n_kx": 15, "n_ky": 24, "n_fx": 15, "n_fy": 30, "n_h": 1, "n_t": 0,
         "f_hx": 17, "f_hy": 19, "f_kx": 13, "f_ky": 24, "f_fx": 11, "f_fy": 29, "f_h": 0, "f_t": 2},

        # Frame 4: Far Leg Strike (Contact 2), Near Leg Push-off
        # Far strikes at x=11, y=31; Near toes at x=21, y=31
        {"oy": 4, "ty": 11, "py": 18,
         "n_hx": 14, "n_hy": 20, "n_kx": 19, "n_ky": 25, "n_fx": 21, "n_fy": 30, "n_h": 1, "n_t": 0,
         "f_hx": 17, "f_hy": 20, "f_kx": 12, "f_ky": 25, "f_fx": 11, "f_fy": 30, "f_h": 0, "f_t": 1},

        # Frame 5: Weight Acceptance / Cushion 2 (Far knee flexes, body dips 1px)
        # Far foot plants flat at x=12, y=31; Near foot rolls to toe at x=22
        {"oy": 5, "ty": 12, "py": 19,
         "n_hx": 14, "n_hy": 21, "n_kx": 20, "n_ky": 26, "n_fx": 22, "n_fy": 30, "n_h": 2, "n_t": 0,
         "f_hx": 17, "f_hy": 21, "f_kx": 13, "f_ky": 26, "f_fx": 12, "f_fy": 30, "f_h": 0, "f_t": 0},

        # Frame 6: Passing Pose 2 (Far supports weight at x=14, Near swings forward with knee clearance)
        # Near foot at x=16, y=28 (lifted 3px off floor)
        {"oy": 4, "ty": 11, "py": 18,
         "n_hx": 14, "n_hy": 20, "n_kx": 16, "n_ky": 24, "n_fx": 16, "n_fy": 27, "n_h": 3, "n_t": 3,
         "f_hx": 17, "f_hy": 20, "f_kx": 14, "f_ky": 25, "f_fx": 14, "f_fy": 30, "f_h": 0, "f_t": 0},

        # Frame 7: Extension / High Point 2 (Far leg straight, Near reaches forward to strike)
        # High point: oy=3, ty=10, py=17. Near foot reaches x=11, y=30
        {"oy": 3, "ty": 10, "py": 17,
         "n_hx": 14, "n_hy": 19, "n_kx": 13, "n_ky": 24, "n_fx": 11, "n_fy": 29, "n_h": 0, "n_t": 2,
         "f_hx": 17, "f_hy": 19, "f_kx": 15, "f_ky": 24, "f_fx": 15, "f_fy": 30, "f_h": 1, "f_t": 0},
    ]

    c = cycles[frame_index]
    hx = 13
    hy = c["oy"]
    tx = 13
    ty = c["ty"]
    px_pos = 13
    py_pos = c["py"]

    # 1. Far leg (rendered behind body)
    draw_leg(img, c["f_hx"], c["f_hy"], c["f_kx"], c["f_ky"], c["f_fx"], c["f_fy"],
             is_far=True, heel_lift=c["f_h"], toe_lift=c["f_t"])

    # 2. Pelvis & Torso
    draw_pelvis(img, px_pos, py_pos)
    draw_torso(img, tx, ty, core_state="normal")

    # 3. Head & sensor helmet
    draw_head(img, hx, hy, visor_state="normal")

    # 4. Near leg (rendered in front of pelvis)
    draw_leg(img, c["n_hx"], c["n_hy"], c["n_kx"], c["n_ky"], c["n_fx"], c["n_fy"],
             is_far=False, heel_lift=c["n_h"], toe_lift=c["n_t"])

    # 5. Pulse rifle (patrol carry across chest)
    # Weapon tracks torso vertical bob smoothly
    rx = 11
    ry = ty + 3
    draw_pulse_rifle_patrol(img, rx, ry)

    # 6. Near arms & shoulders holding the weapon
    draw_arms_patrol(img, tx, ty, rx, ry)

    return img

def build_aim_frame(frame_index):
    """
    Builds aim / warning frames (0..3). Duration: 0.90s.
    Progressive targeting lock telegraphed visually:
    0: Stance brace, optic acquisition.
    1: Tracking lock, rail diode active.
    2: Capacitor building energy.
    3: Full target lock peak before fire.
    """
    img = new_canvas()
    hy = 4
    ty = 11
    py_pos = 18

    draw_leg(img, 17, py_pos + 1, 19, 25, 20, 30, is_far=True, heel_lift=0, toe_lift=0)
    draw_pelvis(img, 13, py_pos)

    core_states = ["normal", "normal", "bright", "aim"]
    draw_torso(img, 13, ty, core_state=core_states[frame_index])

    visor_states = ["normal", "aim", "aim", "bright"]
    draw_head(img, 13, hy, visor_state=visor_states[frame_index])

    draw_leg(img, 14, py_pos + 1, 13, 25, 12, 30, is_far=False, heel_lift=0, toe_lift=0)

    aim_states = ["aim_0", "aim_1", "aim_2", "aim_3"]
    draw_pulse_rifle_aim(img, 10, 13, state=aim_states[frame_index])
    draw_arms_aim(img, 13, ty, recoil_x=0)

    return img

def build_fire_frame():
    """
    Builds fire frame (0). Instantaneous burst (1/120s).
    Muzzle plasma bloom at (6, 13), chamber illuminates, weapon kicks back 1px.
    """
    img = new_canvas()
    hy = 4
    ty = 11
    py_pos = 18

    # Braced combat stance
    draw_leg(img, 17, py_pos + 1, 19, 25, 20, 30, is_far=True, heel_lift=0, toe_lift=0)
    draw_pelvis(img, 13, py_pos)
    draw_torso(img, 13, ty, core_state="fire")
    draw_head(img, 13, hy, visor_state="fire")
    draw_leg(img, 14, py_pos + 1, 13, 25, 12, 30, is_far=False, heel_lift=0, toe_lift=0)

    # Fire discharge: muzzle bloom at (6, 13)
    draw_pulse_rifle_aim(img, 10, 13, state="fire")
    draw_arms_aim(img, 13, ty, recoil_x=1)

    return img

def build_recovery_frame(frame_index):
    """
    Builds recovery frames (0..3). Total duration: 1.25s (recoil 0.28s).
    Frame 0: Maximum recoil kickback (1px offset, heat vents hot).
    Frame 1: Counter-recoil stroke (recoil spring absorbing, thermal vent).
    Frame 2: Damper settling, cooling fins active.
    Frame 3: Restabilized combat posture, capacitors cycling.
    """
    img = new_canvas()
    hy = 4
    ty = 11
    py_pos = 18

    draw_leg(img, 17, py_pos + 1, 19, 25, 20, 30, is_far=True, heel_lift=0, toe_lift=0)
    draw_pelvis(img, 13, py_pos)

    core_states = ["bright", "normal", "normal", "dim"]
    draw_torso(img, 13, ty, core_state=core_states[frame_index])

    visor_states = ["bright", "normal", "normal", "normal"]
    draw_head(img, 13, hy, visor_state=visor_states[frame_index])

    draw_leg(img, 14, py_pos + 1, 13, 25, 12, 30, is_far=False, heel_lift=0, toe_lift=0)

    recoil_offsets = [1, 1, 0, 0]
    recovery_states = ["recovery_0", "recovery_1", "recovery_2", "recovery_3"]
    draw_pulse_rifle_aim(img, 10, 13, state=recovery_states[frame_index])
    draw_arms_aim(img, 13, ty, recoil_x=recoil_offsets[frame_index])

    return img

# ==============================================================================
# MAIN ASSET GENERATION & EXPORT
# ==============================================================================

def main():
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    out_dir = os.path.join(root, "assets", "images", "enemies")
    os.makedirs(out_dir, exist_ok=True)

    print("Generating articulated Patrol-Shooter enemy visual assets (32x32 RGBA)...")

    # 1. Generate 8 Locomotion Frames (Patrol)
    patrol_frames = []
    for i in range(8):
        f = build_patrol_frame(i)
        patrol_frames.append(f)
        # Dedicated patrol-shooter naming
        f.save(os.path.join(out_dir, f"enemypatrolshooter-patrol-{i:03d}.png"))
        # Compatible turret-patrol naming (as suggested in PASSAGEM_ATIRADOR_PARA_ANTIGRAVITY.md)
        f.save(os.path.join(out_dir, f"enemytorreta-patrol-{i:03d}.png"))
        print(f"  [PATROL] Frame {i:03d} -> enemypatrolshooter-patrol-{i:03d}.png & enemytorreta-patrol-{i:03d}.png")

    # 2. Generate 4 Aim / Warning Frames
    aim_frames = []
    for i in range(4):
        f = build_aim_frame(i)
        aim_frames.append(f)
        f.save(os.path.join(out_dir, f"enemypatrolshooter-aim-{i:03d}.png"))
        print(f"  [AIM] Frame {i:03d} -> enemypatrolshooter-aim-{i:03d}.png")

    # 3. Generate Fire Frame (Instantaneous shot)
    fire_frame = build_fire_frame()
    fire_frame.save(os.path.join(out_dir, "enemypatrolshooter-fire-000.png"))
    print("  [FIRE] Frame 000 -> enemypatrolshooter-fire-000.png")

    # 4. Generate 4 Recovery Frames
    recovery_frames = []
    for i in range(4):
        f = build_recovery_frame(i)
        recovery_frames.append(f)
        f.save(os.path.join(out_dir, f"enemypatrolshooter-recovery-{i:03d}.png"))
        print(f"  [RECOVERY] Frame {i:03d} -> enemypatrolshooter-recovery-{i:03d}.png")

    print("\nPatrol-Shooter visual assets successfully generated in assets/images/enemies/!")

if __name__ == "__main__":
    main()
