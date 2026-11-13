#!/usr/bin/env python3
"""
Artisan Pixel-Art Generator & Rig for Chaser Combat Droid (16x32 RGBA)
BoyPunk-Web
Specialized in Humanoid Robotics, Articulated Machinery & Biomechanics.
"""
from PIL import Image
import os
import shutil

# --- PALETTE DEFINITIONS (Strictly adhering to BoyPunk Cyberpunk Aesthetic) ---
C_TRANS = (0, 0, 0, 0)
C_BLACK = (0, 0, 0, 255)            # #000000 - Crisp silhouette outline & joint seams
C_RECESS = (10, 11, 16, 255)         # #0a0b10 - Deep recesses, joint shadow cutaways
C_DARK = (24, 28, 40, 255)           # #181c28 - Internal mechanical frame / chassis plate
C_BASE = (44, 50, 68, 255)           # #2c3244 - Primary dark metallic armor plate
C_LIGHT = (76, 86, 110, 255)         # #4c566e - Armor midtone / bevel highlight
C_HI = (120, 132, 160, 255)          # #7884a0 - Armor specular rim / plate chamfer

# Far limb depth shading (subdued rear silhouette)
C_FAR_RECESS = (8, 9, 14, 255)
C_FAR_DARK = (16, 18, 26, 255)
C_FAR_BASE = (28, 32, 44, 255)
C_FAR_LIGHT = (46, 52, 70, 255)

# Amber optics & high-frequency shock blade
C_AMB_DARK = (186, 75, 18, 255)      # #ba4b12 - Shadow / rim
C_AMB_BASE = (255, 122, 40, 255)     # #ff7a28 - Primary amber glow
C_AMB_BRIGHT = (255, 205, 80, 255)   # #ffcd50 - Intense plasma emission
C_AMB_HOT = (255, 245, 215, 255)     # #fff5d7 - Specular white-amber core

# Cyan plasma core & power conduit
C_CYN_DARK = (20, 108, 125, 255)     # #146c7d - Housing conduit recess
C_CYN_BASE = (55, 230, 238, 255)     # #37e6ee - Active plasma core
C_CYN_HOT = (200, 250, 255, 255)     # #c8faff - Specular energy bloom

def new_canvas():
    return Image.new("RGBA", (16, 32), C_TRANS)

def px(img, x, y, color):
    if 0 <= x < 16 and 0 <= y < 32 and color[3] > 0:
        img.putpixel((x, y), color)

def rect(img, x1, y1, x2, y2, color):
    for y in range(y1, y2 + 1):
        for x in range(x1, x2 + 1):
            px(img, x, y, color)

def draw_head(img, ox, oy, visor_state="normal", tilt=0):
    """
    Articulated combat helmet facing RIGHT.
    ox, oy: head anchor (top-left of helmet, normally x=2, y=1..2)
    """
    # Dome top crest (y=oy)
    px(img, ox + 3, oy, C_BLACK)
    for x in range(ox + 4, ox + 9):
        px(img, x, oy, C_HI)
    px(img, ox + 9, oy, C_BLACK)

    # Dome upper plate (y=oy+1)
    px(img, ox + 2, oy + 1, C_BLACK)
    px(img, ox + 3, oy + 1, C_HI)
    for x in range(ox + 4, ox + 9):
        px(img, x, oy + 1, C_LIGHT)
    px(img, ox + 9, oy + 1, C_HI)
    px(img, ox + 10, oy + 1, C_BLACK)

    # Skull armor plate (y=oy+2)
    px(img, ox + 1, oy + 2, C_BLACK)
    px(img, ox + 2, oy + 2, C_HI)
    px(img, ox + 3, oy + 2, C_LIGHT)
    for x in range(ox + 4, ox + 9):
        px(img, x, oy + 2, C_BASE)
    px(img, ox + 9, oy + 2, C_LIGHT)
    px(img, ox + 10, oy + 2, C_BASE)
    px(img, ox + 11, oy + 2, C_BLACK)

    # Forehead brow & visor cowl (y=oy+3)
    px(img, ox + 1, oy + 3, C_BLACK)
    px(img, ox + 2, oy + 3, C_LIGHT)
    px(img, ox + 3, oy + 3, C_BASE)
    px(img, ox + 4, oy + 3, C_DARK)
    for x in range(ox + 5, ox + 10):
        px(img, x, oy + 3, C_AMB_DARK if visor_state != "dead" else C_DARK)
    px(img, ox + 10, oy + 3, C_LIGHT)
    px(img, ox + 11, oy + 3, C_BLACK)

    # Visor row 1 (y=oy+4) - Facing forward to the right
    px(img, ox + 1, oy + 4, C_BLACK)
    px(img, ox + 2, oy + 4, C_LIGHT)
    px(img, ox + 3, oy + 4, C_BASE)
    px(img, ox + 4, oy + 4, C_RECESS)
    if visor_state == "normal":
        px(img, ox + 5, oy + 4, C_AMB_DARK)
        px(img, ox + 6, oy + 4, C_AMB_BASE)
        px(img, ox + 7, oy + 4, C_AMB_BRIGHT)
        px(img, ox + 8, oy + 4, C_AMB_BRIGHT)
        px(img, ox + 9, oy + 4, C_AMB_BASE)
    elif visor_state == "bright":
        px(img, ox + 5, oy + 4, C_AMB_BASE)
        px(img, ox + 6, oy + 4, C_AMB_BRIGHT)
        px(img, ox + 7, oy + 4, C_AMB_HOT)
        px(img, ox + 8, oy + 4, C_AMB_HOT)
        px(img, ox + 9, oy + 4, C_AMB_BRIGHT)
    elif visor_state == "dead":
        for x in range(ox + 5, ox + 10):
            px(img, x, oy + 4, C_RECESS)
    px(img, ox + 10, oy + 4, C_RECESS)
    px(img, ox + 11, oy + 4, C_BLACK)

    # Visor row 2 (y=oy+5)
    px(img, ox + 1, oy + 5, C_BLACK)
    px(img, ox + 2, oy + 5, C_BASE)
    px(img, ox + 3, oy + 5, C_DARK)
    px(img, ox + 4, oy + 5, C_RECESS)
    if visor_state == "normal":
        px(img, ox + 5, oy + 5, C_AMB_BASE)
        px(img, ox + 6, oy + 5, C_AMB_BRIGHT)
        px(img, ox + 7, oy + 5, C_AMB_HOT)
        px(img, ox + 8, oy + 5, C_AMB_BRIGHT)
        px(img, ox + 9, oy + 5, C_AMB_BASE)
    elif visor_state == "bright":
        px(img, ox + 5, oy + 5, C_AMB_BRIGHT)
        px(img, ox + 6, oy + 5, C_AMB_HOT)
        px(img, ox + 7, oy + 5, C_AMB_HOT)
        px(img, ox + 8, oy + 5, C_AMB_HOT)
        px(img, ox + 9, oy + 5, C_AMB_BRIGHT)
    elif visor_state == "dead":
        for x in range(ox + 5, ox + 10):
            px(img, x, oy + 5, C_RECESS)
    px(img, ox + 10, oy + 5, C_RECESS)
    px(img, ox + 11, oy + 5, C_BLACK)

    # Lower jaw plate & cheek armor (y=oy+6)
    px(img, ox + 2, oy + 6, C_BLACK)
    px(img, ox + 3, oy + 6, C_LIGHT)
    for x in range(ox + 4, ox + 9):
        px(img, x, oy + 6, C_BASE)
    px(img, ox + 9, oy + 6, C_LIGHT)
    px(img, ox + 10, oy + 6, C_BASE)
    px(img, ox + 11, oy + 6, C_BLACK)

    # Chin (y=oy+7)
    px(img, ox + 3, oy + 7, C_BLACK)
    for x in range(ox + 4, ox + 9):
        px(img, x, oy + 7, C_DARK)
    px(img, ox + 9, oy + 7, C_BASE)
    px(img, ox + 10, oy + 7, C_BLACK)

    # Neck collar pivot & mechanical joint (y=oy+8) - clear silhouette break
    px(img, ox + 4, oy + 8, C_BLACK)
    px(img, ox + 5, oy + 8, C_RECESS)
    px(img, ox + 6, oy + 8, C_DARK)
    px(img, ox + 7, oy + 8, C_RECESS)
    px(img, ox + 8, oy + 8, C_BLACK)

def draw_torso(img, ox, oy, core_state="normal"):
    """
    Articulated thorax with central cyan plasma reactor and mechanical waist cutaway.
    ox, oy: torso anchor (top-left of chest ~ x=2, y=10..11)
    """
    # Clavicle plate (y=oy)
    px(img, ox + 2, oy, C_BLACK)
    px(img, ox + 3, oy, C_HI)
    for x in range(ox + 4, ox + 9):
        px(img, x, oy, C_LIGHT)
    px(img, ox + 9, oy, C_HI)
    px(img, ox + 10, oy, C_BLACK)

    # Upper pectoral & reactor top (y=oy+1)
    px(img, ox + 1, oy + 1, C_BLACK)
    px(img, ox + 2, oy + 1, C_HI)
    px(img, ox + 3, oy + 1, C_LIGHT)
    px(img, ox + 4, oy + 1, C_BASE)
    px(img, ox + 5, oy + 1, C_CYN_DARK if core_state != "dead" else C_DARK)
    px(img, ox + 6, oy + 1, C_CYN_BASE if core_state != "dead" else C_RECESS)
    px(img, ox + 7, oy + 1, C_CYN_DARK if core_state != "dead" else C_DARK)
    px(img, ox + 8, oy + 1, C_BASE)
    px(img, ox + 9, oy + 1, C_LIGHT)
    px(img, ox + 10, oy + 1, C_BLACK)

    # Reactor center (y=oy+2)
    px(img, ox + 1, oy + 2, C_BLACK)
    px(img, ox + 2, oy + 2, C_LIGHT)
    px(img, ox + 3, oy + 2, C_BASE)
    px(img, ox + 4, oy + 2, C_CYN_DARK if core_state != "dead" else C_DARK)
    if core_state == "normal":
        px(img, ox + 5, oy + 2, C_CYN_BASE)
        px(img, ox + 6, oy + 2, C_CYN_HOT)
        px(img, ox + 7, oy + 2, C_CYN_BASE)
    elif core_state == "bright":
        px(img, ox + 5, oy + 2, C_CYN_HOT)
        px(img, ox + 6, oy + 2, C_CYN_HOT)
        px(img, ox + 7, oy + 2, C_CYN_HOT)
    elif core_state == "dead":
        px(img, ox + 5, oy + 2, C_RECESS)
        px(img, ox + 6, oy + 2, C_DARK)
        px(img, ox + 7, oy + 2, C_RECESS)
    px(img, ox + 8, oy + 2, C_CYN_DARK if core_state != "dead" else C_DARK)
    px(img, ox + 9, oy + 2, C_BASE)
    px(img, ox + 10, oy + 2, C_BLACK)

    # Lower ribcage (y=oy+3)
    px(img, ox + 1, oy + 3, C_BLACK)
    px(img, ox + 2, oy + 3, C_BASE)
    px(img, ox + 3, oy + 3, C_DARK)
    px(img, ox + 4, oy + 3, C_BASE)
    px(img, ox + 5, oy + 3, C_CYN_DARK if core_state != "dead" else C_DARK)
    px(img, ox + 6, oy + 3, C_CYN_BASE if core_state != "dead" else C_RECESS)
    px(img, ox + 7, oy + 3, C_CYN_DARK if core_state != "dead" else C_DARK)
    px(img, ox + 8, oy + 3, C_BASE)
    px(img, ox + 9, oy + 3, C_LIGHT)
    px(img, ox + 10, oy + 3, C_BLACK)

    # Articulated waist (y=oy+4) - narrow silhouette cutaway
    px(img, ox + 3, oy + 4, C_BLACK)
    px(img, ox + 4, oy + 4, C_DARK)
    px(img, ox + 5, oy + 4, C_RECESS)
    px(img, ox + 6, oy + 4, C_DARK)
    px(img, ox + 7, oy + 4, C_RECESS)
    px(img, ox + 8, oy + 4, C_DARK)
    px(img, ox + 9, oy + 4, C_BLACK)

    # Armored pelvis plate (y=oy+5)
    px(img, ox + 2, oy + 5, C_BLACK)
    px(img, ox + 3, oy + 5, C_LIGHT)
    for x in range(ox + 4, ox + 8):
        px(img, x, oy + 5, C_BASE)
    px(img, ox + 8, oy + 5, C_LIGHT)
    px(img, ox + 9, oy + 5, C_BLACK)

    # Hip socket rim (y=oy+6)
    px(img, ox + 2, oy + 6, C_BLACK)
    px(img, ox + 3, oy + 6, C_BASE)
    px(img, ox + 4, oy + 6, C_RECESS)  # rear hip socket
    px(img, ox + 5, oy + 6, C_DARK)
    px(img, ox + 6, oy + 6, C_BASE)
    px(img, ox + 7, oy + 6, C_RECESS)  # front hip socket
    px(img, ox + 8, oy + 6, C_BASE)
    px(img, ox + 9, oy + 6, C_BLACK)

def draw_far_leg(img, hip_x, hip_y, knee_x, knee_y, foot_x, foot_y, is_planted=False, heel_strike=False, toe_push=False):
    """Draws rear leg in deep shadow/depth coloring."""
    # Thigh
    for t in [0.2, 0.4, 0.6, 0.8, 1.0]:
        x = int(round(hip_x + (knee_x - hip_x) * t))
        y = int(round(hip_y + (knee_y - hip_y) * t))
        px(img, x - 1, y, C_FAR_DARK)
        px(img, x, y, C_FAR_BASE)

    # Knee cap (rear, no glowing dot)
    px(img, knee_x - 1, knee_y, C_FAR_DARK)
    px(img, knee_x, knee_y, C_FAR_LIGHT)
    px(img, knee_x + 1, knee_y, C_FAR_BASE)

    # Shin
    for t in [0.25, 0.5, 0.75]:
        x = int(round(knee_x + (foot_x - knee_x) * t))
        y = int(round(knee_y + (foot_y - knee_y) * t))
        px(img, x - 1, y, C_FAR_DARK)
        px(img, x, y, C_FAR_BASE)

    # Foot
    if heel_strike:
        px(img, foot_x - 1, 30, C_FAR_DARK)
        px(img, foot_x, 30, C_FAR_LIGHT)
        px(img, foot_x + 1, 30, C_BLACK)
        px(img, foot_x, 31, C_FAR_BASE)
        px(img, foot_x + 1, 31, C_BLACK)
    elif toe_push:
        px(img, foot_x - 1, foot_y - 1, C_FAR_DARK)
        px(img, foot_x, foot_y - 1, C_FAR_LIGHT)
        px(img, foot_x, 31, C_FAR_BASE)
        px(img, foot_x + 1, 31, C_BLACK)
    elif is_planted:
        px(img, foot_x - 1, 30, C_FAR_DARK)
        px(img, foot_x, 30, C_FAR_LIGHT)
        px(img, foot_x + 1, 30, C_FAR_BASE)
        px(img, foot_x + 2, 30, C_BLACK)
        px(img, foot_x - 1, 31, C_BLACK)
        px(img, foot_x, 31, C_FAR_DARK)
        px(img, foot_x + 1, 31, C_FAR_BASE)
        px(img, foot_x + 2, 31, C_BLACK)
    else:
        # Airborne
        px(img, foot_x - 1, foot_y - 1, C_FAR_DARK)
        px(img, foot_x, foot_y - 1, C_FAR_LIGHT)
        px(img, foot_x - 1, foot_y, C_BLACK)
        px(img, foot_x, foot_y, C_FAR_BASE)
        px(img, foot_x + 1, foot_y, C_BLACK)

def draw_near_leg(img, hip_x, hip_y, knee_x, knee_y, foot_x, foot_y, is_planted=False, heel_strike=False, toe_push=False):
    """
    Draws near (front) leg with full armor plate, highlights, mechanical knee guard, and boot.
    Joints are suggested through plate chamfers and dark hinge gaps, NOT glowing dots!
    """
    # Thigh
    for t in [0.2, 0.4, 0.6, 0.8, 1.0]:
        x = int(round(hip_x + (knee_x - hip_x) * t))
        y = int(round(hip_y + (knee_y - hip_y) * t))
        px(img, x - 1, y, C_BLACK)
        px(img, x, y, C_LIGHT)
        px(img, x + 1, y, C_BASE)
        px(img, x + 2, y, C_BLACK)

    # Mechanical Knee Guard (Armored box with top chamfer and dark hinge seam)
    px(img, knee_x - 1, knee_y, C_BLACK)
    px(img, knee_x, knee_y, C_HI)
    px(img, knee_x + 1, knee_y, C_LIGHT)
    px(img, knee_x + 2, knee_y, C_RECESS)  # dark joint seam
    px(img, knee_x + 3, knee_y, C_BLACK)

    # Shin
    for t in [0.25, 0.5, 0.75]:
        x = int(round(knee_x + (foot_x - knee_x) * t))
        y = int(round(knee_y + (foot_y - knee_y) * t))
        px(img, x - 1, y, C_BLACK)
        px(img, x, y, C_LIGHT)
        px(img, x + 1, y, C_BASE)
        px(img, x + 2, y, C_BLACK)

    # Foot / Boot
    if heel_strike:
        # Contact: heel strikes y=31, toe angled up at y=30
        px(img, foot_x - 1, 30, C_BLACK)
        px(img, foot_x, 30, C_HI)
        px(img, foot_x + 1, 30, C_LIGHT)
        px(img, foot_x + 2, 30, C_BLACK)

        px(img, foot_x - 1, 31, C_BLACK)
        px(img, foot_x, 31, C_BASE)
        px(img, foot_x + 1, 31, C_BLACK)
    elif toe_push:
        # Push-off: toe at y=31, heel raised at y=29..30
        px(img, foot_x - 1, foot_y - 1, C_BLACK)
        px(img, foot_x, foot_y - 1, C_LIGHT)
        px(img, foot_x + 1, foot_y - 1, C_BLACK)

        px(img, foot_x, 31, C_BLACK)
        px(img, foot_x + 1, 31, C_BASE)
        px(img, foot_x + 2, 31, C_BLACK)
    elif is_planted:
        # Solid ground plant at y=31
        px(img, foot_x - 1, 30, C_BLACK)
        px(img, foot_x, 30, C_HI)
        px(img, foot_x + 1, 30, C_LIGHT)
        px(img, foot_x + 2, 30, C_BASE)
        px(img, foot_x + 3, 30, C_BLACK)

        px(img, foot_x - 1, 31, C_BLACK)
        px(img, foot_x, 31, C_DARK)
        px(img, foot_x + 1, 31, C_BASE)
        px(img, foot_x + 2, 31, C_BASE)
        px(img, foot_x + 3, 31, C_BLACK)
    else:
        # Airborne / passing foot
        px(img, foot_x - 1, foot_y - 1, C_BLACK)
        px(img, foot_x, foot_y - 1, C_HI)
        px(img, foot_x + 1, foot_y - 1, C_LIGHT)
        px(img, foot_x + 2, foot_y - 1, C_BLACK)

        px(img, foot_x - 1, foot_y, C_BLACK)
        px(img, foot_x, foot_y, C_BASE)
        px(img, foot_x + 1, foot_y, C_BLACK)

def draw_far_arm(img, sh_x, sh_y, el_x, el_y, hand_x, hand_y):
    px(img, sh_x, sh_y, C_FAR_DARK)
    px(img, el_x, el_y, C_FAR_BASE)
    px(img, hand_x, hand_y, C_FAR_LIGHT)
    px(img, hand_x, hand_y + 1, C_FAR_DARK)

def draw_near_arm(img, sh_x, sh_y, el_x, el_y, hand_x, hand_y, blade_extended=False):
    # Shoulder pauldron
    px(img, sh_x - 1, sh_y - 1, C_BLACK)
    px(img, sh_x, sh_y - 1, C_HI)
    px(img, sh_x + 1, sh_y - 1, C_LIGHT)
    px(img, sh_x + 2, sh_y - 1, C_BLACK)

    px(img, sh_x - 1, sh_y, C_BLACK)
    px(img, sh_x, sh_y, C_LIGHT)
    px(img, sh_x + 1, sh_y, C_BASE)
    px(img, sh_x + 2, sh_y, C_BLACK)

    # Bicep & elbow
    px(img, el_x, el_y - 1, C_BASE)
    px(img, el_x - 1, el_y, C_BLACK)
    px(img, el_x, el_y, C_RECESS)  # dark elbow hinge seam
    px(img, el_x + 1, el_y, C_BLACK)

    # Forearm
    mid_x = (el_x + hand_x) // 2
    mid_y = (el_y + hand_y) // 2
    px(img, mid_x, mid_y, C_LIGHT)
    px(img, hand_x, hand_y, C_BASE)
    px(img, hand_x, hand_y + 1, C_BLACK)

    # Shock blade
    if blade_extended:
        # Full plasma blade thrust forward (reaches up to x=15)
        for i in range(1, 6):
            bx = hand_x + i
            by = hand_y
            if bx < 16:
                px(img, bx, by, C_AMB_HOT if i < 3 else C_AMB_BRIGHT)
                px(img, bx, by - 1, C_AMB_BRIGHT if i < 4 else C_AMB_BASE)
                px(img, bx, by + 1, C_AMB_BASE if i < 4 else C_AMB_DARK)
        # Kinetic spark at tip
        if hand_x + 4 < 16:
            px(img, hand_x + 4, hand_y - 2, C_AMB_HOT)
            px(img, hand_x + 4, hand_y + 2, C_AMB_HOT)
    else:
        # Standby retracted blade on underside of forearm
        px(img, hand_x, hand_y - 1, C_AMB_BASE)
        px(img, mid_x, mid_y - 1, C_AMB_DARK)

def generate_walk_frame(frame_idx):
    img = new_canvas()
    ox = 2  # centered anchor

    # Biomechanical 8-Frame Walk Cycle
    if frame_idx == 0:
        # Right Heel Strike
        head_oy = 1
        torso_oy = 10
        draw_far_arm(img, ox + 4, torso_oy + 2, ox + 6, torso_oy + 4, ox + 9, torso_oy + 6)
        draw_far_leg(img, ox + 3, torso_oy + 6, ox + 2, 23, ox + 1, 31, toe_push=True)
        draw_torso(img, ox, torso_oy)
        draw_head(img, ox, head_oy)
        draw_near_leg(img, ox + 6, torso_oy + 6, ox + 8, 23, ox + 10, 31, heel_strike=True)
        draw_near_arm(img, ox + 6, torso_oy + 2, ox + 4, torso_oy + 4, ox + 2, torso_oy + 6)

    elif frame_idx == 1:
        # Right Weight Acceptance (Absorption dip)
        head_oy = 2
        torso_oy = 11
        draw_far_arm(img, ox + 4, torso_oy + 2, ox + 5, torso_oy + 4, ox + 7, torso_oy + 6)
        draw_far_leg(img, ox + 3, torso_oy + 6, ox + 3, 23, ox + 2, 29)  # foot lifted
        draw_torso(img, ox, torso_oy)
        draw_head(img, ox, head_oy)
        draw_near_leg(img, ox + 6, torso_oy + 6, ox + 8, 24, ox + 9, 31, is_planted=True)
        draw_near_arm(img, ox + 6, torso_oy + 2, ox + 5, torso_oy + 5, ox + 4, torso_oy + 6)

    elif frame_idx == 2:
        # Right Mid-Stance / Left Passing (Apex)
        head_oy = 1
        torso_oy = 10
        draw_far_arm(img, ox + 4, torso_oy + 2, ox + 3, torso_oy + 4, ox + 2, torso_oy + 6)
        draw_far_leg(img, ox + 3, torso_oy + 6, ox + 6, 21, ox + 5, 26)  # passing leg knee bent, foot high
        draw_torso(img, ox, torso_oy)
        draw_head(img, ox, head_oy)
        draw_near_leg(img, ox + 6, torso_oy + 6, ox + 6, 23, ox + 6, 31, is_planted=True)  # support pillar
        draw_near_arm(img, ox + 6, torso_oy + 2, ox + 7, torso_oy + 4, ox + 9, torso_oy + 6)

    elif frame_idx == 3:
        # Right Push-Off & Left Reach (Preparation)
        head_oy = 1
        torso_oy = 10
        draw_far_arm(img, ox + 4, torso_oy + 2, ox + 2, torso_oy + 4, ox + 1, torso_oy + 6)
        draw_far_leg(img, ox + 3, torso_oy + 6, ox + 8, 23, ox + 9, 30)  # reaching forward
        draw_torso(img, ox, torso_oy)
        draw_head(img, ox, head_oy)
        draw_near_leg(img, ox + 6, torso_oy + 6, ox + 5, 23, ox + 4, 31, toe_push=True)
        draw_near_arm(img, ox + 6, torso_oy + 2, ox + 8, torso_oy + 4, ox + 10, torso_oy + 6)

    elif frame_idx == 4:
        # Left Heel Strike
        head_oy = 1
        torso_oy = 10
        draw_far_arm(img, ox + 4, torso_oy + 2, ox + 4, torso_oy + 4, ox + 2, torso_oy + 6)
        draw_far_leg(img, ox + 3, torso_oy + 6, ox + 7, 23, ox + 10, 31, heel_strike=True)
        draw_torso(img, ox, torso_oy)
        draw_head(img, ox, head_oy)
        draw_near_leg(img, ox + 6, torso_oy + 6, ox + 4, 23, ox + 2, 31, toe_push=True)
        draw_near_arm(img, ox + 6, torso_oy + 2, ox + 8, torso_oy + 4, ox + 10, torso_oy + 6)

    elif frame_idx == 5:
        # Left Weight Acceptance (Opposite absorption dip)
        head_oy = 2
        torso_oy = 11
        draw_far_arm(img, ox + 4, torso_oy + 2, ox + 5, torso_oy + 4, ox + 4, torso_oy + 6)
        draw_far_leg(img, ox + 3, torso_oy + 6, ox + 7, 24, ox + 9, 31, is_planted=True)
        draw_torso(img, ox, torso_oy)
        draw_head(img, ox, head_oy)
        draw_near_leg(img, ox + 6, torso_oy + 6, ox + 4, 23, ox + 3, 29)  # foot lifted
        draw_near_arm(img, ox + 6, torso_oy + 2, ox + 7, torso_oy + 5, ox + 8, torso_oy + 6)

    elif frame_idx == 6:
        # Left Mid-Stance / Right Passing (Apex)
        head_oy = 1
        torso_oy = 10
        draw_far_arm(img, ox + 4, torso_oy + 2, ox + 6, torso_oy + 4, ox + 8, torso_oy + 6)
        draw_far_leg(img, ox + 3, torso_oy + 6, ox + 5, 23, ox + 6, 31, is_planted=True)
        draw_torso(img, ox, torso_oy)
        draw_head(img, ox, head_oy)
        draw_near_leg(img, ox + 6, torso_oy + 6, ox + 8, 21, ox + 6, 26)  # near leg passing, knee bent, foot high
        draw_near_arm(img, ox + 6, torso_oy + 2, ox + 5, torso_oy + 4, ox + 3, torso_oy + 6)

    elif frame_idx == 7:
        # Left Push-Off & Right Reach (Preparation)
        head_oy = 1
        torso_oy = 10
        draw_far_arm(img, ox + 4, torso_oy + 2, ox + 7, torso_oy + 4, ox + 9, torso_oy + 6)
        draw_far_leg(img, ox + 3, torso_oy + 6, ox + 4, 23, ox + 3, 31, toe_push=True)
        draw_torso(img, ox, torso_oy)
        draw_head(img, ox, head_oy)
        draw_near_leg(img, ox + 6, torso_oy + 6, ox + 8, 23, ox + 10, 30)  # reaching forward
        draw_near_arm(img, ox + 6, torso_oy + 2, ox + 4, torso_oy + 4, ox + 2, torso_oy + 6)

    return img

def generate_idle_frame(frame_idx):
    img = new_canvas()
    ox = 2
    head_oy = 1 if frame_idx == 0 else 2
    torso_oy = 10 if frame_idx == 0 else 11
    core = "normal" if frame_idx == 0 else "bright"
    visor = "normal" if frame_idx == 0 else "bright"

    draw_far_arm(img, ox + 4, torso_oy + 2, ox + 3, torso_oy + 4, ox + 2, torso_oy + 6)
    draw_far_leg(img, ox + 3, torso_oy + 6, ox + 3, 24, ox + 3, 31, is_planted=True)
    draw_torso(img, ox, torso_oy, core_state=core)
    draw_head(img, ox, head_oy, visor_state=visor)
    draw_near_leg(img, ox + 6, torso_oy + 6, ox + 8, 24, ox + 8, 31, is_planted=True)
    draw_near_arm(img, ox + 6, torso_oy + 2, ox + 7, torso_oy + 4, ox + 8, torso_oy + 6)
    return img

def generate_jump_frame(frame_idx=0):
    img = new_canvas()
    ox = 2

    if frame_idx == 0:
        # Frame 0: Ascending / Tuck pose
        head_oy = 1
        torso_oy = 9  # elevated in jump
        draw_far_arm(img, ox + 4, torso_oy + 2, ox + 2, torso_oy + 4, ox + 1, torso_oy + 5)
        # Both legs tucked up with forward flexed knees
        draw_far_leg(img, ox + 3, torso_oy + 6, ox + 5, 20, ox + 3, 24)
        draw_torso(img, ox, torso_oy, core_state="bright")
        draw_head(img, ox, head_oy, visor_state="bright")
        draw_near_leg(img, ox + 6, torso_oy + 6, ox + 8, 20, ox + 6, 24)
        draw_near_arm(img, ox + 6, torso_oy + 2, ox + 8, torso_oy + 4, ox + 9, torso_oy + 5)
    else:
        # Frame 1: Apex & Descent / Airborne fall pose
        head_oy = 2
        torso_oy = 10
        # Arms angled outward for aerodynamic stability
        draw_far_arm(img, ox + 4, torso_oy + 2, ox + 2, torso_oy + 4, ox + 0, torso_oy + 6)
        # Legs extending downward preparing for impact/landing
        draw_far_leg(img, ox + 3, torso_oy + 6, ox + 4, 22, ox + 3, 28)
        draw_torso(img, ox, torso_oy, core_state="bright")
        draw_head(img, ox, head_oy, visor_state="bright")
        draw_near_leg(img, ox + 6, torso_oy + 6, ox + 7, 22, ox + 8, 28)
        draw_near_arm(img, ox + 6, torso_oy + 2, ox + 8, torso_oy + 4, ox + 9, torso_oy + 7)

    return img

def generate_attack_frame(frame_idx):
    img = new_canvas()

    if frame_idx == 0:
        # Anticipation: coiled back
        ox = 3  # leaning back
        head_oy = 1
        torso_oy = 10
        draw_far_arm(img, ox + 4, torso_oy + 2, ox + 5, torso_oy + 4, ox + 6, torso_oy + 6)
        draw_far_leg(img, ox + 3, torso_oy + 6, ox + 2, 24, ox + 2, 31, is_planted=True)
        draw_torso(img, ox, torso_oy, core_state="bright")
        draw_head(img, ox, head_oy, visor_state="bright")
        draw_near_leg(img, ox + 6, torso_oy + 6, ox + 7, 24, ox + 7, 31, is_planted=True)
        draw_near_arm(img, ox + 6, torso_oy + 2, ox + 4, torso_oy + 4, ox + 2, torso_oy + 5, blade_extended=False)

    elif frame_idx == 1:
        # Strike / Explosive forward lunge with plasma shock blade!
        ox = 1  # driving forward
        head_oy = 2
        torso_oy = 11
        draw_far_arm(img, ox + 4, torso_oy + 2, ox + 3, torso_oy + 4, ox + 1, torso_oy + 6)
        draw_far_leg(img, ox + 3, torso_oy + 6, ox + 2, 23, ox + 0, 31, toe_push=True)
        draw_torso(img, ox, torso_oy, core_state="bright")
        draw_head(img, ox, head_oy, visor_state="bright")
        draw_near_leg(img, ox + 6, torso_oy + 6, ox + 8, 24, ox + 9, 31, is_planted=True)
        # Forearm thrust forward with blade extending to edge (wrist at x=9)
        draw_near_arm(img, ox + 6, torso_oy + 2, ox + 8, torso_oy + 3, ox + 8, torso_oy + 4, blade_extended=True)

    elif frame_idx == 2:
        # Full Extension & Impact Trail: Articulated shoulders, locked elbow, counter-arm whip, flexed knee
        ox = 1
        head_oy = 2
        torso_oy = 11

        # Far arm: snapped backward and upward in counter-balance to the thrust
        px(img, 5, 13, C_FAR_DARK)
        px(img, 4, 13, C_FAR_DARK)
        px(img, 3, 12, C_FAR_DARK)
        px(img, 2, 12, C_FAR_BASE)
        px(img, 1, 13, C_FAR_LIGHT)
        px(img, 0, 13, C_FAR_BASE)
        px(img, 0, 14, C_FAR_DARK)

        # Far leg: stretched anchor leg, knee at (2, 23), toe at (0, 31)
        draw_far_leg(img, ox + 3, torso_oy + 6, ox + 1, 23, ox - 1, 31, toe_push=True)

        # Torso: Angled forward into strike
        # Clavicle plate (y=11)
        px(img, ox + 3, 11, C_BLACK)
        px(img, ox + 4, 11, C_HI)
        for x in range(ox + 5, ox + 10):
            px(img, x, 11, C_LIGHT)
        px(img, ox + 10, 11, C_HI)
        px(img, ox + 11, 11, C_BLACK)

        # Upper pectoral & reactor top (y=12)
        px(img, ox + 2, 12, C_BLACK)
        px(img, ox + 3, 12, C_HI)
        px(img, ox + 4, 12, C_LIGHT)
        px(img, ox + 5, 12, C_BASE)
        px(img, ox + 6, 12, C_CYN_DARK)
        px(img, ox + 7, 12, C_CYN_HOT)
        px(img, ox + 8, 12, C_CYN_DARK)
        px(img, ox + 9, 12, C_BASE)
        px(img, ox + 10, 12, C_LIGHT)
        px(img, ox + 11, 12, C_BLACK)

        # Reactor center (y=13) - Full plasma burst
        px(img, ox + 2, 13, C_BLACK)
        px(img, ox + 3, 13, C_LIGHT)
        px(img, ox + 4, 13, C_BASE)
        px(img, ox + 5, 13, C_CYN_DARK)
        px(img, ox + 6, 13, C_CYN_HOT)
        px(img, ox + 7, 13, C_CYN_HOT)
        px(img, ox + 8, 13, C_CYN_HOT)
        px(img, ox + 9, 13, C_CYN_DARK)
        px(img, ox + 10, 13, C_BASE)
        px(img, ox + 11, 13, C_BLACK)

        # Lower ribcage (y=14) - transitional
        px(img, ox + 1, 14, C_BLACK)
        px(img, ox + 2, 14, C_BASE)
        px(img, ox + 3, 14, C_DARK)
        px(img, ox + 4, 14, C_BASE)
        px(img, ox + 5, 14, C_CYN_DARK)
        px(img, ox + 6, 14, C_CYN_BASE)
        px(img, ox + 7, 14, C_CYN_DARK)
        px(img, ox + 8, 14, C_BASE)
        px(img, ox + 9, 14, C_LIGHT)
        px(img, ox + 10, 14, C_BLACK)

        # Waist (y=15) - narrow cutaway
        px(img, ox + 3, 15, C_BLACK)
        px(img, ox + 4, 15, C_DARK)
        px(img, ox + 5, 15, C_RECESS)
        px(img, ox + 6, 15, C_DARK)
        px(img, ox + 7, 15, C_RECESS)
        px(img, ox + 8, 15, C_DARK)
        px(img, ox + 9, 15, C_BLACK)

        # Armored pelvis plate (y=16)
        px(img, ox + 2, 16, C_BLACK)
        px(img, ox + 3, 16, C_LIGHT)
        for x in range(ox + 4, ox + 8):
            px(img, x, 16, C_BASE)
        px(img, ox + 8, 16, C_LIGHT)
        px(img, ox + 9, 16, C_BLACK)

        # Hip socket rim (y=17)
        px(img, ox + 2, 17, C_BLACK)
        px(img, ox + 3, 17, C_BASE)
        px(img, ox + 4, 17, C_RECESS)  # rear hip socket
        px(img, ox + 5, 17, C_DARK)
        px(img, ox + 6, 17, C_BASE)
        px(img, ox + 7, 17, C_RECESS)  # front hip socket
        px(img, ox + 8, 17, C_BASE)
        px(img, ox + 9, 17, C_BLACK)

        # Head: Head at ox=1, head_oy=2
        draw_head(img, ox, head_oy, visor_state="bright")

        # Near leg: Front knee driving forward and flexed over planted boot
        draw_near_leg(img, ox + 6, torso_oy + 6, ox + 9, 24, ox + 9, 31, is_planted=True)

        # Near arm: Full horizontal thrust!
        sh_x, sh_y = ox + 7, torso_oy + 2
        el_x, el_y = ox + 9, torso_oy + 2
        hand_x, hand_y = ox + 10, torso_oy + 3

        # Shoulder pauldron
        px(img, sh_x - 1, sh_y - 1, C_BLACK)
        px(img, sh_x, sh_y - 1, C_HI)
        px(img, sh_x + 1, sh_y - 1, C_LIGHT)
        px(img, sh_x + 2, sh_y - 1, C_BLACK)

        px(img, sh_x - 1, sh_y, C_BLACK)
        px(img, sh_x, sh_y, C_LIGHT)
        px(img, sh_x + 1, sh_y, C_BASE)
        px(img, sh_x + 2, sh_y, C_BLACK)

        # Arm bicep & locked elbow joint
        px(img, el_x - 1, el_y, C_BASE)
        px(img, el_x, el_y - 1, C_BLACK)
        px(img, el_x, el_y, C_RECESS)
        px(img, el_x, el_y + 1, C_BLACK)

        # Forearm
        px(img, hand_x - 1, hand_y, C_LIGHT)
        px(img, hand_x, hand_y, C_BASE)
        px(img, hand_x, hand_y + 1, C_BLACK)

        # Shock blade at full penetration impact (hand at 11, reaches to 15)
        for bx in range(hand_x + 1, 16):
            px(img, bx, hand_y, C_AMB_HOT if bx < 15 else C_AMB_BRIGHT)
            px(img, bx, hand_y - 1, C_AMB_BRIGHT if bx < 15 else C_AMB_BASE)
            px(img, bx, hand_y + 1, C_AMB_BASE if bx < 15 else C_AMB_DARK)

        # Kinetic impact discharge / sparks at impact plane (x=14..15)
        px(img, 15, hand_y - 2, C_AMB_HOT)
        px(img, 14, hand_y - 2, C_AMB_BRIGHT)
        px(img, 15, hand_y + 2, C_AMB_HOT)
        px(img, 14, hand_y + 2, C_AMB_BASE)
        px(img, 15, hand_y - 3, C_AMB_BASE)
        px(img, 15, hand_y + 3, C_AMB_DARK)

    elif frame_idx == 3:
        # Recovery
        ox = 2
        head_oy = 1
        torso_oy = 10
        draw_far_arm(img, ox + 4, torso_oy + 2, ox + 4, torso_oy + 4, ox + 4, torso_oy + 6)
        draw_far_leg(img, ox + 3, torso_oy + 6, ox + 3, 24, ox + 3, 31, is_planted=True)
        draw_torso(img, ox, torso_oy, core_state="normal")
        draw_head(img, ox, head_oy, visor_state="normal")
        draw_near_leg(img, ox + 6, torso_oy + 6, ox + 8, 24, ox + 8, 31, is_planted=True)
        draw_near_arm(img, ox + 6, torso_oy + 2, ox + 6, torso_oy + 4, ox + 7, torso_oy + 6, blade_extended=False)

    return img


def generate_dead_frame(frame_idx=0):
    img = new_canvas()
    if frame_idx == 0:
        # Kinetic Breach & Core Rupture: chassis snaps back, reactor flares, optic glitches
        ox = 1
        head_oy = 1
        torso_oy = 9
        draw_far_arm(img, ox + 3, torso_oy + 2, ox + 1, torso_oy + 4, ox, torso_oy + 6)
        draw_far_leg(img, ox + 3, torso_oy + 6, ox + 2, 23, ox + 1, 31, is_planted=True)
        draw_torso(img, ox, torso_oy, core_state="bright")
        # Overload flare on breached reactor
        px(img, ox + 5, torso_oy + 1, C_CYN_HOT)
        px(img, ox + 6, torso_oy + 1, C_CYN_HOT)
        px(img, ox + 7, torso_oy + 1, C_CYN_HOT)
        px(img, ox + 6, torso_oy + 2, C_CYN_HOT)
        px(img, ox + 4, torso_oy + 2, C_CYN_BASE)
        px(img, ox + 8, torso_oy + 2, C_CYN_BASE)
        # Head with glitching optic
        draw_head(img, ox, head_oy, visor_state="bright")
        px(img, ox + 6, head_oy + 4, C_RECESS)
        px(img, ox + 8, head_oy + 5, C_RECESS)
        # Near leg flexing under shock
        draw_near_leg(img, ox + 6, torso_oy + 6, ox + 8, 23, ox + 9, 31, is_planted=True)
        # Near arm thrown back in spasm with crackling blade
        draw_near_arm(img, ox + 6, torso_oy + 2, ox + 4, torso_oy + 4, ox + 2, torso_oy + 6, blade_extended=True)
        px(img, ox + 1, torso_oy + 6, C_AMB_HOT)
        px(img, ox, torso_oy + 5, C_AMB_BRIGHT)

    elif frame_idx == 1:
        # Hydraulic Decompression & Knee Collapse: weight drops forward, front knee buckles
        ox = 2
        head_oy = 6
        torso_oy = 14
        draw_far_leg(img, ox + 3, torso_oy + 5, ox + 2, 23, ox + 1, 31, is_planted=True)
        draw_torso(img, ox, torso_oy, core_state="dead")
        px(img, ox + 6, torso_oy + 2, C_CYN_DARK) # dying cold core ember
        draw_head(img, ox + 1, head_oy, visor_state="dead")
        px(img, ox + 7, head_oy + 4, C_AMB_DARK) # 1 residual amber trace
        draw_near_leg(img, ox + 6, torso_oy + 5, ox + 8, 24, ox + 9, 31, is_planted=True)
        sh_x, sh_y = ox + 6, torso_oy + 2
        el_x, el_y = ox + 6, torso_oy + 4
        hand_x, hand_y = ox + 7, 28
        draw_near_arm(img, sh_x, sh_y, el_x, el_y, hand_x, hand_y, blade_extended=False)
        # Unpowered blade tip touching ground
        px(img, hand_x + 1, 30, C_BASE)
        px(img, hand_x + 1, 31, C_BLACK)
        # Neck exhaust venting steam
        px(img, ox + 4, torso_oy - 1, C_DARK)
        px(img, ox + 5, torso_oy - 2, C_RECESS)

    elif frame_idx == 2:
        # Deck Impact & Rebound: torso strikes deck, sparks scatter, rear leg rebounds
        ox = 2
        draw_head(img, ox + 2, 17, visor_state="dead")
        rect(img, ox + 1, 23, ox + 9, 28, C_DARK)
        px(img, ox + 2, 23, C_LIGHT)
        px(img, ox + 3, 23, C_BASE)
        px(img, ox + 5, 24, C_CYN_DARK)
        px(img, ox + 8, 24, C_LIGHT)
        # Rebound rear leg suspended at y=27..28
        px(img, 1, 27, C_FAR_DARK)
        px(img, 2, 27, C_FAR_BASE)
        px(img, 1, 28, C_FAR_LIGHT)
        px(img, 2, 28, C_BLACK)
        # Near leg sprawled on deck
        rect(img, ox + 2, 29, ox + 7, 31, C_BASE)
        rect(img, ox + 1, 30, ox + 8, 31, C_DARK)
        # Impact spark scatter
        px(img, 14, 30, C_AMB_BASE)
        px(img, 15, 29, C_AMB_DARK)
        px(img, 13, 28, C_AMB_BRIGHT)
        px(img, 0, 30, C_RECESS)
        for x in range(1, 15):
            px(img, x, 31, C_BLACK)

    else:
        # Frame 3: Settled inert wreckage on deck (100% consistent with established silhouette)
        ox = 2
        draw_head(img, ox + 1, 23, visor_state="dead")
        px(img, ox + 3, 22, C_RECESS)
        px(img, ox + 7, 23, C_RECESS)
        rect(img, ox + 1, 29, ox + 9, 31, C_DARK)
        px(img, ox + 2, 29, C_LIGHT)
        px(img, ox + 3, 29, C_BASE)
        px(img, ox + 5, 29, C_CYN_DARK)  # dead reactor
        px(img, ox + 7, 29, C_BASE)
        for x in range(ox, ox + 11):
            px(img, x, 31, C_BLACK)

    return img

if __name__ == "__main__":
    out_dir = "assets/images/enemies"
    print("Generating refined artisan chaser frames...")

    for i in range(8):
        f = generate_walk_frame(i)
        p = os.path.join(out_dir, f"enemycaveira-walk-{i:03d}.png")
        f.save(p)

    for i in range(2):
        f = generate_idle_frame(i)
        p = os.path.join(out_dir, f"enemycaveira-iddle-{i:03d}.png")
        f.save(p)

    for i in range(2):
        f_jump = generate_jump_frame(i)
        p_jump = os.path.join(out_dir, f"enemycaveira-jump-{i:03d}.png")
        f_jump.save(p_jump)

    for i in range(4):
        f = generate_attack_frame(i)
        p = os.path.join(out_dir, f"enemycaveira-attack-{i:03d}.png")
        f.save(p)

    for i in range(4):
        f_dead = generate_dead_frame(i)
        p_dead = os.path.join(out_dir, f"enemycaveira-dead-{i:03d}.png")
        f_dead.save(p_dead)

    print("All frames successfully generated.")

