#!/usr/bin/env python3
"""
Artisan Pixel-Art Generator & Rig for Nilo, the Android Healer (64x96 RGBA)
BoyPunk-Web — Character Art Direction & Technical Rig
Role: Android Healer (Atompunk machinery + Nanopunk repair technology)
Palette: Rounded warm-ivory armor, graphite mechanical frame, amber optics, mint/cyan reactor.

Strictly conforms to:
- 64x96 RGBA canvas, transparent background.
- Ground line at Y=63 (bottom pixel row); Y=64..95 strictly transparent.
- Body anchor at local X=16 (mirrored by renderer for facing < 0 with renderX = drawX - 32).
- Collider relative to canonical origin: (x=5, y=32, w=22, h=32).
- Weapon / nanorepair module muzzle alignment at local (33, 48).
- 21 animation frames across 7 states:
  idle (4), walk (4), jump (1), fall (1), attack1 (4), hurt (3), die (4).
"""
import os
import sys
from PIL import Image, ImageDraw

# ==============================================================================
# COLOR PALETTE SPECIFICATION
# ==============================================================================
C_TRANS = (0, 0, 0, 0)
C_BLACK = (0, 0, 0, 255)            # #000000 - 1px crisp outline & mechanical seams

# Rounded Warm-Ivory Armor (Atom-age lacquered ceramic/composite plates)
C_IVORY_HOT     = (255, 253, 248, 255)  # Specular crest & rounded highlight
C_IVORY_LIGHT   = (244, 238, 226, 255)  # Primary bright armor plate
C_IVORY_BASE    = (222, 214, 198, 255)  # Main warm ivory tone
C_IVORY_SHADOW  = (182, 172, 154, 255)  # Plate curvature shadow / chamfer
C_IVORY_DEEP    = (138, 128, 112, 255)  # Deep undercut plate shadow

# Graphite Mechanical Frame & Joint Armature
C_GRAPHITE_HI   = (126, 138, 158, 255)  # Specular edge, pivot bolts, hydraulic shafts
C_GRAPHITE_MID  = (80, 90, 108, 255)    # Mechanical frame midtone
C_GRAPHITE_BASE = (48, 54, 68, 255)     # Primary dark graphite chassis
C_GRAPHITE_DARK = (24, 28, 38, 255)     # Deep chassis recesses / interior cavities

# Amber Optics & Sensor Systems
C_AMBER_HOT     = (255, 248, 215, 255)  # Optic center reflection
C_AMBER_BRIGHT  = (255, 180, 40, 255)   # Active sensor visor glow
C_AMBER_BASE    = (235, 124, 18, 255)   # Sensor core & temple warning lamps
C_AMBER_DARK    = (158, 70, 10, 255)    # Sensor rim & shaded lens

# Mint / Cyan Nanorepair Energy (Restrained reactor & nanite conduits)
C_MINT_HOT      = (222, 255, 246, 255)  # Reactor core specular hot center
C_MINT_BRIGHT   = (46, 230, 168, 255)   # Signature support mint (#2ee6a8)
C_MINT_MID      = (24, 176, 124, 255)   # Nanite fluid midtone & conduits
C_MINT_DARK     = (12, 102, 72, 255)    # Containment vial housing rim & shaded fluid
C_MINT_DIM      = (10, 56, 42, 255)     # Low power / powered down reactor

# Brass / Bronze Atompunk Couplings & Pressure Fittings
C_BRASS_LIGHT   = (214, 182, 112, 255)  # Valve rim highlight
C_BRASS_BASE    = (170, 136, 72, 255)   # Joint collar & conduit fitting
C_BRASS_DARK    = (114, 86, 42, 255)    # Recessed fitting shadow

# ==============================================================================
# DRAWING UTILITIES
# ==============================================================================
def new_canvas(width=64, height=96):
    return Image.new("RGBA", (width, height), C_TRANS)

def px(img, x, y, color):
    if 0 <= x < img.width and 0 <= y < img.height and color[3] > 0:
        img.putpixel((x, y), color)

def rect(img, x1, y1, x2, y2, color):
    for y in range(y1, y2 + 1):
        for x in range(x1, x2 + 1):
            px(img, x, y, color)

def hline(img, x1, x2, y, color):
    for x in range(x1, x2 + 1):
        px(img, x, y, color)

def vline(img, x, y1, y2, color):
    for y in range(y1, y2 + 1):
        px(img, x, y, color)

# ==============================================================================
# RIG COMPONENTS: NILO ANDROID HEALER
# ==============================================================================

def draw_head(img, hx, hy, optic_mode="normal", tilt=0):
    """
    Renders Nilo's distinctive atompunk android head facing RIGHT.
    hx, hy: Anchor for top of the cranial dome (typically hx=11, hy=36).
    Dimensions: ~12px wide, ~10px tall.
    Features: Rounded warm-ivory dome, occiput cooling fin, horizontal amber optics,
    graphite chin/jaw cowl with sensor slits, brass ear pivot.
    """
    # Occiput cooling fin (atompunk rear crest at top-left of head)
    # y = hy to hy+3
    px(img, hx - 2, hy + 1, C_BLACK)
    px(img, hx - 1, hy + 1, C_BRASS_BASE)
    px(img, hx - 2, hy + 2, C_BLACK)
    px(img, hx - 1, hy + 2, C_GRAPHITE_MID)
    px(img, hx - 2, hy + 3, C_BLACK)
    px(img, hx - 1, hy + 3, C_GRAPHITE_BASE)

    # Cranial Dome - Top Crest (y = hy)
    rect(img, hx + 1, hy, hx + 7, hy, C_BLACK)
    rect(img, hx + 2, hy, hx + 6, hy, C_IVORY_HOT)

    # Cranial Dome - Upper Curved Shell (y = hy + 1)
    px(img, hx, hy + 1, C_BLACK)
    rect(img, hx + 1, hy + 1, hx + 7, hy + 1, C_IVORY_LIGHT)
    px(img, hx + 3, hy + 1, C_IVORY_HOT)
    px(img, hx + 4, hy + 1, C_IVORY_HOT)
    px(img, hx + 8, hy + 1, C_BLACK)

    # Cranial Dome - Mid Shell (y = hy + 2)
    px(img, hx - 1, hy + 2, C_BLACK)
    rect(img, hx, hy + 2, hx + 8, hy + 2, C_IVORY_BASE)
    rect(img, hx + 1, hy + 2, hx + 6, hy + 2, C_IVORY_LIGHT)
    px(img, hx + 9, hy + 2, C_BLACK)

    # Brow & Temple Band (y = hy + 3)
    px(img, hx - 1, hy + 3, C_BLACK)
    rect(img, hx, hy + 3, hx + 2, hy + 3, C_IVORY_SHADOW)
    rect(img, hx + 3, hy + 3, hx + 8, hy + 3, C_IVORY_BASE)
    px(img, hx + 7, hy + 3, C_IVORY_LIGHT)
    px(img, hx + 9, hy + 3, C_BLACK)
    px(img, hx + 10, hy + 3, C_BLACK)

    # Amber Optic Visor Row 1 & Ear Pivot (y = hy + 4)
    px(img, hx - 1, hy + 4, C_BLACK)
    px(img, hx, hy + 4, C_GRAPHITE_BASE)
    # Ear node (atompunk circular brass/graphite ear socket)
    px(img, hx + 1, hy + 4, C_BRASS_BASE)
    px(img, hx + 2, hy + 4, C_GRAPHITE_DARK)
    px(img, hx + 3, hy + 4, C_GRAPHITE_BASE)
    rect(img, hx + 4, hy + 4, hx + 9, hy + 4, C_BLACK)

    # Optic visor pixels (amber sensor band looking RIGHT)
    if optic_mode == "normal":
        px(img, hx + 5, hy + 4, C_AMBER_DARK)
        px(img, hx + 6, hy + 4, C_AMBER_BASE)
        px(img, hx + 7, hy + 4, C_AMBER_BRIGHT)
        px(img, hx + 8, hy + 4, C_AMBER_HOT)
        px(img, hx + 9, hy + 4, C_AMBER_BRIGHT)
    elif optic_mode == "bright":
        px(img, hx + 5, hy + 4, C_AMBER_BASE)
        rect(img, hx + 6, hy + 4, hx + 9, hy + 4, C_AMBER_HOT)
    elif optic_mode == "dim":
        rect(img, hx + 5, hy + 4, hx + 9, hy + 4, C_AMBER_DARK)
    elif optic_mode == "off":
        rect(img, hx + 5, hy + 4, hx + 9, hy + 4, C_GRAPHITE_DARK)
    px(img, hx + 10, hy + 4, C_BLACK)

    # Amber Optic Visor Row 2 & Lower Temple (y = hy + 5)
    px(img, hx - 1, hy + 5, C_BLACK)
    px(img, hx, hy + 5, C_GRAPHITE_DARK)
    px(img, hx + 1, hy + 5, C_BRASS_DARK)
    px(img, hx + 2, hy + 5, C_GRAPHITE_MID)
    px(img, hx + 3, hy + 5, C_GRAPHITE_BASE)
    rect(img, hx + 4, hy + 5, hx + 9, hy + 5, C_BLACK)
    if optic_mode == "normal":
        px(img, hx + 5, hy + 5, C_AMBER_DARK)
        px(img, hx + 6, hy + 5, C_AMBER_BASE)
        px(img, hx + 7, hy + 5, C_AMBER_BASE)
        px(img, hx + 8, hy + 5, C_AMBER_BRIGHT)
        px(img, hx + 9, hy + 5, C_AMBER_DARK)
    elif optic_mode == "bright":
        rect(img, hx + 5, hy + 5, hx + 9, hy + 5, C_AMBER_BRIGHT)
    elif optic_mode == "dim":
        rect(img, hx + 5, hy + 5, hx + 9, hy + 5, C_AMBER_DARK)
    elif optic_mode == "off":
        rect(img, hx + 5, hy + 5, hx + 9, hy + 5, C_GRAPHITE_DARK)
    px(img, hx + 10, hy + 5, C_BLACK)

    # Cheek & Mandible Shield Plate (y = hy + 6)
    px(img, hx, hy + 6, C_BLACK)
    rect(img, hx + 1, hy + 6, hx + 3, hy + 6, C_IVORY_SHADOW)
    rect(img, hx + 4, hy + 6, hx + 7, hy + 6, C_IVORY_BASE)
    px(img, hx + 8, hy + 6, C_IVORY_LIGHT)
    px(img, hx + 9, hy + 6, C_BLACK)

    # Chin & Vent Sensor Cowl (y = hy + 7)
    px(img, hx + 1, hy + 7, C_BLACK)
    px(img, hx + 2, hy + 7, C_GRAPHITE_DARK)
    px(img, hx + 3, hy + 7, C_GRAPHITE_MID)
    # Acoustic/vocal sensor slit
    px(img, hx + 4, hy + 7, C_BLACK)
    px(img, hx + 5, hy + 7, C_GRAPHITE_HI)
    px(img, hx + 6, hy + 7, C_BLACK)
    px(img, hx + 7, hy + 7, C_IVORY_SHADOW)
    px(img, hx + 8, hy + 7, C_BLACK)

    # Hydraulic Neck Pivot (y = hy + 8)
    px(img, hx + 3, hy + 8, C_BLACK)
    px(img, hx + 4, hy + 8, C_GRAPHITE_DARK)
    px(img, hx + 5, hy + 8, C_GRAPHITE_MID)
    px(img, hx + 6, hy + 8, C_BRASS_BASE)
    px(img, hx + 7, hy + 8, C_BLACK)


def draw_backpack_tank(img, bx, by, fluid_level="full"):
    """
    Atompunk nanite storage reservoir / canister mounted on dorsal chassis.
    bx, by: top-left anchor (typically bx=7, by=46).
    Dimensions: 4px wide, 7px high.
    Shows glass containment cylinder with glowing mint liquid.
    """
    # Top brass cap & pressure valve
    px(img, bx + 1, by, C_BLACK)
    px(img, bx + 2, by, C_BRASS_LIGHT)
    px(img, bx + 3, by, C_BLACK)

    # Upper flange
    px(img, bx, by + 1, C_BLACK)
    px(img, bx + 1, by + 1, C_BRASS_BASE)
    px(img, bx + 2, by + 1, C_BRASS_DARK)
    px(img, bx + 3, by + 1, C_BLACK)

    # Glass cylinder body (y = by+2 to by+5)
    for y in range(by + 2, by + 6):
        px(img, bx, y, C_BLACK)
        if fluid_level == "full":
            px(img, bx + 1, y, C_MINT_HOT if y == by + 2 else C_MINT_BRIGHT)
            px(img, bx + 2, y, C_MINT_MID)
        elif fluid_level == "mid":
            if y <= by + 3:
                px(img, bx + 1, y, C_GRAPHITE_DARK)
                px(img, bx + 2, y, C_GRAPHITE_MID)
            else:
                px(img, bx + 1, y, C_MINT_BRIGHT)
                px(img, bx + 2, y, C_MINT_MID)
        else: # low / off
            px(img, bx + 1, y, C_GRAPHITE_DARK)
            px(img, bx + 2, y, C_MINT_DIM)
        px(img, bx + 3, y, C_BLACK)

    # Bottom mounting bracket
    px(img, bx, by + 6, C_BLACK)
    px(img, bx + 1, by + 6, C_GRAPHITE_BASE)
    px(img, bx + 2, by + 6, C_BRASS_DARK)
    px(img, bx + 3, by + 6, C_BLACK)


def draw_torso_and_reactor(img, tx, ty, reactor_mode="normal"):
    """
    Rounded warm-ivory cuirass with central circular mint/cyan reactor.
    tx, ty: top-left anchor for chest armor (typically tx=11, ty=45).
    Dimensions: ~12px wide, ~8px tall.
    Features: Rounded ivory breastplate, circular atomic/nanite reactor core at center,
    exposed graphite frame along flank & mechanical waist.
    """
    # Clavicle & Collar Rim (y = ty)
    px(img, tx + 1, ty, C_BLACK)
    rect(img, tx + 2, ty, tx + 7, ty, C_IVORY_SHADOW)
    rect(img, tx + 5, ty, tx + 8, ty, C_IVORY_LIGHT)
    px(img, tx + 9, ty, C_BLACK)

    # Upper Cuirass & Reactor Top Arch (y = ty + 1)
    px(img, tx, ty + 1, C_BLACK)
    rect(img, tx + 1, ty + 1, tx + 3, ty + 1, C_IVORY_BASE)
    # Reactor top bezel
    px(img, tx + 4, ty + 1, C_GRAPHITE_DARK)
    px(img, tx + 5, ty + 1, C_GRAPHITE_HI)
    px(img, tx + 6, ty + 1, C_GRAPHITE_DARK)
    rect(img, tx + 7, ty + 1, tx + 9, ty + 1, C_IVORY_LIGHT)
    px(img, tx + 10, ty + 1, C_BLACK)

    # Mid Pectoral & Reactor Core Row 1 (y = ty + 2)
    px(img, tx, ty + 2, C_BLACK)
    px(img, tx + 1, ty + 2, C_IVORY_SHADOW)
    px(img, tx + 2, ty + 2, C_IVORY_BASE)
    px(img, tx + 3, ty + 2, C_GRAPHITE_BASE) # Reactor left rim
    # Reactor core:
    if reactor_mode == "normal":
        px(img, tx + 4, ty + 2, C_MINT_MID)
        px(img, tx + 5, ty + 2, C_MINT_HOT)
        px(img, tx + 6, ty + 2, C_MINT_BRIGHT)
    elif reactor_mode == "bright":
        px(img, tx + 4, ty + 2, C_MINT_BRIGHT)
        px(img, tx + 5, ty + 2, C_IVORY_HOT)
        px(img, tx + 6, ty + 2, C_MINT_HOT)
    elif reactor_mode == "dim":
        px(img, tx + 4, ty + 2, C_MINT_DARK)
        px(img, tx + 5, ty + 2, C_MINT_MID)
        px(img, tx + 6, ty + 2, C_MINT_DARK)
    elif reactor_mode == "off":
        rect(img, tx + 4, ty + 2, tx + 6, ty + 2, C_GRAPHITE_DARK)

    px(img, tx + 7, ty + 2, C_GRAPHITE_BASE) # Reactor right rim
    px(img, tx + 8, ty + 2, C_IVORY_LIGHT)
    px(img, tx + 9, ty + 2, C_IVORY_HOT)
    px(img, tx + 10, ty + 2, C_BLACK)

    # Mid Pectoral & Reactor Core Row 2 (y = ty + 3)
    px(img, tx, ty + 3, C_BLACK)
    px(img, tx + 1, ty + 3, C_IVORY_SHADOW)
    px(img, tx + 2, ty + 3, C_IVORY_BASE)
    px(img, tx + 3, ty + 3, C_GRAPHITE_DARK)
    if reactor_mode == "normal":
        px(img, tx + 4, ty + 3, C_MINT_DARK)
        px(img, tx + 5, ty + 3, C_MINT_BRIGHT)
        px(img, tx + 6, ty + 3, C_MINT_MID)
    elif reactor_mode == "bright":
        px(img, tx + 4, ty + 3, C_MINT_BRIGHT)
        px(img, tx + 5, ty + 3, C_MINT_HOT)
        px(img, tx + 6, ty + 3, C_MINT_BRIGHT)
    elif reactor_mode == "dim":
        px(img, tx + 4, ty + 3, C_MINT_DIM)
        px(img, tx + 5, ty + 3, C_MINT_DARK)
        px(img, tx + 6, ty + 3, C_MINT_DIM)
    elif reactor_mode == "off":
        rect(img, tx + 4, ty + 3, tx + 6, ty + 3, C_GRAPHITE_DARK)

    px(img, tx + 7, ty + 3, C_GRAPHITE_DARK)
    px(img, tx + 8, ty + 3, C_IVORY_BASE)
    px(img, tx + 9, ty + 3, C_IVORY_LIGHT)
    px(img, tx + 10, ty + 3, C_BLACK)

    # Lower Breastplate & Reactor Bottom Arch (y = ty + 4)
    px(img, tx, ty + 4, C_BLACK)
    rect(img, tx + 1, ty + 4, tx + 3, ty + 4, C_IVORY_SHADOW)
    # Reactor bottom bezel
    px(img, tx + 4, ty + 4, C_GRAPHITE_DARK)
    px(img, tx + 5, ty + 4, C_GRAPHITE_MID)
    px(img, tx + 6, ty + 4, C_GRAPHITE_DARK)
    rect(img, tx + 7, ty + 4, tx + 8, ty + 4, C_IVORY_BASE)
    px(img, tx + 9, ty + 4, C_IVORY_LIGHT)
    px(img, tx + 10, ty + 4, C_BLACK)

    # Mechanical Waist & Lumbar Spine (y = ty + 5)
    # Narrow waist silhouette showing graphite chassis & pistons
    px(img, tx + 1, ty + 5, C_BLACK)
    px(img, tx + 2, ty + 5, C_GRAPHITE_DARK)
    px(img, tx + 3, ty + 5, C_GRAPHITE_BASE)
    px(img, tx + 4, ty + 5, C_GRAPHITE_MID)
    px(img, tx + 5, ty + 5, C_BRASS_BASE) # Central spinal actuator
    px(img, tx + 6, ty + 5, C_GRAPHITE_MID)
    px(img, tx + 7, ty + 5, C_GRAPHITE_BASE)
    px(img, tx + 8, ty + 5, C_BLACK)

    # Lower Lumbar Joint & Actuator Pins (y = ty + 6)
    px(img, tx + 1, ty + 6, C_BLACK)
    px(img, tx + 2, ty + 6, C_GRAPHITE_DARK)
    px(img, tx + 3, ty + 6, C_GRAPHITE_HI)
    px(img, tx + 4, ty + 6, C_GRAPHITE_DARK)
    px(img, tx + 5, ty + 6, C_BRASS_DARK)
    px(img, tx + 6, ty + 6, C_GRAPHITE_DARK)
    px(img, tx + 7, ty + 6, C_GRAPHITE_HI)
    px(img, tx + 8, ty + 6, C_BLACK)


def draw_pelvis(img, px_val, py_val):
    """
    Articulated pelvis girder & rounded ivory hip guards.
    px_val, py_val: top-left anchor (typically px_val=11, py_val=52).
    Dimensions: ~10px wide, ~3px tall.
    """
    # Pelvis Top Bracket & Hip Casings (y = py_val)
    px(img, px_val, py_val, C_BLACK)
    rect(img, px_val + 1, py_val, px_val + 3, py_val, C_IVORY_SHADOW)
    rect(img, px_val + 4, py_val, px_val + 6, py_val, C_GRAPHITE_BASE)
    rect(img, px_val + 7, py_val, px_val + 9, py_val, C_IVORY_LIGHT)
    px(img, px_val + 10, py_val, C_BLACK)

    # Hip Ball Sockets & Pelvic Shield (y = py_val + 1)
    px(img, px_val, py_val + 1, C_BLACK)
    px(img, px_val + 1, py_val + 1, C_GRAPHITE_DARK) # far hip ball socket
    px(img, px_val + 2, py_val + 1, C_GRAPHITE_HI)
    px(img, px_val + 3, py_val + 1, C_IVORY_SHADOW)
    px(img, px_val + 4, py_val + 1, C_IVORY_BASE)
    px(img, px_val + 5, py_val + 1, C_IVORY_BASE)
    px(img, px_val + 6, py_val + 1, C_IVORY_LIGHT)
    px(img, px_val + 7, py_val + 1, C_GRAPHITE_DARK) # near hip ball socket
    px(img, px_val + 8, py_val + 1, C_GRAPHITE_HI)
    px(img, px_val + 9, py_val + 1, C_BLACK)

    # Pelvic Underside & Leg Attachments (y = py_val + 2)
    px(img, px_val + 1, py_val + 2, C_BLACK)
    px(img, px_val + 2, py_val + 2, C_GRAPHITE_BASE)
    px(img, px_val + 3, py_val + 2, C_BLACK)
    px(img, px_val + 4, py_val + 2, C_GRAPHITE_DARK)
    px(img, px_val + 5, py_val + 2, C_GRAPHITE_DARK)
    px(img, px_val + 6, py_val + 2, C_BLACK)
    px(img, px_val + 7, py_val + 2, C_GRAPHITE_BASE)
    px(img, px_val + 8, py_val + 2, C_BLACK)


def draw_leg_segment(img, hip_x, hip_y, knee_x, knee_y, foot_x, foot_y, is_near=True, foot_flat=True):
    """
    Renders an articulated robotic leg with ivory armor plate over graphite hydraulic strut.
    is_near: True for foreground leg (warm ivory lit), False for background leg (shadowed).
    """
    col_plate_hi = C_IVORY_LIGHT if is_near else C_IVORY_SHADOW
    col_plate_base = C_IVORY_BASE if is_near else C_IVORY_DEEP
    col_plate_sh = C_IVORY_SHADOW if is_near else C_GRAPHITE_DARK
    col_frame_hi = C_GRAPHITE_HI if is_near else C_GRAPHITE_MID
    col_frame_base = C_GRAPHITE_BASE if is_near else C_GRAPHITE_DARK

    # 1. Thigh / Femur (from hip to knee)
    # Typically 3 pixels long
    ty_start = hip_y + 1
    ty_end = knee_y - 1
    for y in range(ty_start, ty_end + 1):
        ratio = (y - ty_start) / max(1, ty_end - ty_start)
        x_c = int(hip_x + (knee_x - hip_x) * ratio)
        px(img, x_c - 1, y, C_BLACK)
        px(img, x_c, y, col_plate_base)
        px(img, x_c + 1, y, col_plate_hi)
        px(img, x_c + 2, y, C_BLACK)

    # 2. Articulated Knee Joint (circular hinge with pivot bolt)
    ky = knee_y
    kx = knee_x
    px(img, kx - 1, ky, C_BLACK)
    px(img, kx, ky, col_frame_hi) # Pivot bolt
    px(img, kx + 1, ky, col_frame_base)
    px(img, kx + 2, ky, C_BLACK)

    # 3. Lower Leg / Shin & Calf (from knee to ankle)
    sy_start = knee_y + 1
    sy_end = foot_y - 2
    for y in range(sy_start, sy_end + 1):
        ratio = (y - sy_start) / max(1, sy_end - sy_start)
        x_c = int(knee_x + (foot_x - knee_x) * ratio)
        px(img, x_c - 1, y, C_BLACK)
        px(img, x_c, y, col_plate_sh if y == sy_end else col_plate_base)
        px(img, x_c + 1, y, col_plate_hi)
        px(img, x_c + 2, y, C_BLACK)

    # 4. Ankle Mechanical Joint
    ay = foot_y - 1
    ax = foot_x
    px(img, ax - 1, ay, C_BLACK)
    px(img, ax, ay, col_frame_hi)
    px(img, ax + 1, ay, col_frame_base)
    px(img, ax + 2, ay, C_BLACK)

    # 5. Articulated Foot & Magnetic Sole
    fy = foot_y
    fx = foot_x
    if foot_flat:
        # Flat sole resting firmly on platform (3-4px wide)
        rect(img, fx - 1, fy, fx + 3, fy, C_BLACK)
        px(img, fx, fy, col_frame_hi)
        px(img, fx + 1, fy, col_plate_base)
        px(img, fx + 2, fy, col_plate_hi)
    else:
        # Angled/toe foot (during push-off or lift)
        px(img, fx, fy - 1, C_BLACK)
        px(img, fx + 1, fy - 1, col_plate_hi)
        px(img, fx + 2, fy - 1, C_BLACK)
        rect(img, fx + 1, fy, fx + 3, fy, C_BLACK)
        px(img, fx + 2, fy, col_frame_hi)


def draw_near_arm_and_nanomodule(img, sh_x, sh_y, arm_mode="idle", extend_x=0):
    """
    Renders Nilo's right arm (near arm) equipped with the Forearm Nanorepair Module.
    sh_x, sh_y: Shoulder pivot (typically sh_x=18, sh_y=47).
    arm_mode: 'idle', 'walk_back', 'walk_forward', 'attack_charge', 'attack_fire',
              'attack_recoil', 'attack_recover', 'hurt', 'die'
    extend_x: horizontal extension offset for weapon muzzle alignment.
    """
    # 1. Rounded Warm-Ivory Shoulder Pauldron (Shoulder bell)
    # y = sh_y to sh_y+3
    px(img, sh_x, sh_y, C_BLACK)
    rect(img, sh_x + 1, sh_y, sh_x + 3, sh_y, C_IVORY_HOT)
    px(img, sh_x + 4, sh_y, C_BLACK)

    px(img, sh_x - 1, sh_y + 1, C_BLACK)
    rect(img, sh_x, sh_y + 1, sh_x + 3, sh_y + 1, C_IVORY_LIGHT)
    px(img, sh_x + 4, sh_y + 1, C_IVORY_HOT)
    px(img, sh_x + 5, sh_y + 1, C_BLACK)

    px(img, sh_x - 1, sh_y + 2, C_BLACK)
    rect(img, sh_x, sh_y + 2, sh_x + 3, sh_y + 2, C_IVORY_BASE)
    px(img, sh_x + 4, sh_y + 2, C_IVORY_LIGHT)
    px(img, sh_x + 5, sh_y + 2, C_BLACK)

    px(img, sh_x, sh_y + 3, C_BLACK)
    rect(img, sh_x + 1, sh_y + 3, sh_x + 3, sh_y + 3, C_IVORY_SHADOW)
    px(img, sh_x + 4, sh_y + 3, C_BLACK)

    # 2. Arm & Forearm Nanorepair Module based on arm_mode
    if arm_mode == "idle":
        # Upper arm hydraulic strut
        px(img, sh_x + 1, sh_y + 4, C_BLACK)
        px(img, sh_x + 2, sh_y + 4, C_GRAPHITE_HI)
        px(img, sh_x + 3, sh_y + 4, C_GRAPHITE_BASE)
        px(img, sh_x + 4, sh_y + 4, C_BLACK)

        # Elbow hinge & nanorepair module start
        ey = sh_y + 5
        ex = sh_x + 2
        px(img, ex, ey, C_BLACK)
        px(img, ex + 1, ey, C_GRAPHITE_HI)
        px(img, ex + 2, ey, C_BRASS_BASE)
        px(img, ex + 3, ey, C_BLACK)

        # Forearm Nanorepair Module Housing & Nanite Vial (x ~ 21..27, y ~ 52..54)
        # Row 1: Housing & Nanite Vial Top
        my = sh_y + 5
        mx = sh_x + 3
        px(img, mx, my, C_BLACK)
        px(img, mx + 1, my, C_IVORY_LIGHT)
        px(img, mx + 2, my, C_MINT_HOT) # Nanite fluid visible through sight-glass
        px(img, mx + 3, my, C_MINT_BRIGHT)
        px(img, mx + 4, my, C_GRAPHITE_HI) # Emitter barrel ring
        px(img, mx + 5, my, C_BLACK)

        # Row 2: Module Base & Emitter Nozzle Tip
        my2 = sh_y + 6
        px(img, mx, my2, C_BLACK)
        px(img, mx + 1, my2, C_IVORY_BASE)
        px(img, mx + 2, my2, C_MINT_MID)
        px(img, mx + 3, my2, C_GRAPHITE_BASE)
        px(img, mx + 4, my2, C_BRASS_BASE) # Atompunk brass nozzle collar
        px(img, mx + 5, my2, C_BLACK)

    elif arm_mode == "walk_back":
        # Near arm swings back
        px(img, sh_x - 1, sh_y + 4, C_BLACK)
        px(img, sh_x, sh_y + 4, C_GRAPHITE_HI)
        px(img, sh_x + 1, sh_y + 4, C_GRAPHITE_BASE)
        px(img, sh_x + 2, sh_y + 4, C_BLACK)

        my = sh_y + 5
        mx = sh_x - 3
        rect(img, mx, my, mx + 5, my, C_BLACK)
        px(img, mx + 1, my, C_IVORY_BASE)
        px(img, mx + 2, my, C_MINT_BRIGHT)
        px(img, mx + 3, my, C_GRAPHITE_HI)
        px(img, mx + 4, my, C_BRASS_BASE)

    elif arm_mode == "walk_forward":
        # Near arm swings forward with nanorepair module leading
        px(img, sh_x + 2, sh_y + 4, C_BLACK)
        px(img, sh_x + 3, sh_y + 4, C_GRAPHITE_HI)
        px(img, sh_x + 4, sh_y + 4, C_GRAPHITE_BASE)
        px(img, sh_x + 5, sh_y + 4, C_BLACK)

        my = sh_y + 4
        mx = sh_x + 4
        rect(img, mx, my, mx + 6, my, C_BLACK)
        px(img, mx + 1, my, C_IVORY_LIGHT)
        px(img, mx + 2, my, C_MINT_HOT)
        px(img, mx + 3, my, C_MINT_BRIGHT)
        px(img, mx + 4, my, C_GRAPHITE_HI)
        px(img, mx + 5, my, C_BRASS_BASE)

        my2 = sh_y + 5
        rect(img, mx, my2, mx + 5, my2, C_BLACK)
        px(img, mx + 1, my2, C_IVORY_BASE)
        px(img, mx + 2, my2, C_MINT_MID)
        px(img, mx + 3, my2, C_GRAPHITE_BASE)
        px(img, mx + 4, my2, C_BRASS_DARK)

    elif arm_mode == "attack_charge":
        # Windup: Blaster raised to chest level, aiming forward
        # Arm horizontal at y ~ sh_y+1 to sh_y+2
        ax = sh_x + 3
        ay = sh_y + 1
        rect(img, ax, ay, ax + 8, ay, C_BLACK)
        px(img, ax + 1, ay, C_GRAPHITE_HI)
        px(img, ax + 2, ay, C_IVORY_LIGHT)
        px(img, ax + 3, ay, C_MINT_HOT)
        px(img, ax + 4, ay, C_MINT_BRIGHT)
        px(img, ax + 5, ay, C_MINT_HOT) # Charge flare
        px(img, ax + 6, ay, C_GRAPHITE_HI)
        px(img, ax + 7, ay, C_BRASS_LIGHT)

        ay2 = sh_y + 2
        rect(img, ax, ay2, ax + 7, ay2, C_BLACK)
        px(img, ax + 1, ay2, C_GRAPHITE_BASE)
        px(img, ax + 2, ay2, C_IVORY_BASE)
        px(img, ax + 3, ay2, C_MINT_MID)
        px(img, ax + 4, ay2, C_MINT_MID)
        px(img, ax + 5, ay2, C_GRAPHITE_BASE)
        px(img, ax + 6, ay2, C_BRASS_BASE)

    elif arm_mode == "attack_fire":
        # Full Discharge Extension: Arm thrust forward!
        # Muzzle tip aligns cleanly with local (33, 48)!
        # sh_x ~ 18, sh_y ~ 47 -> local (33, 48) is sh_x + 15, sh_y + 1!
        ax = sh_x + 3
        ay = sh_y + 1
        # Upper arm strut
        rect(img, ax, ay, ax + 3, ay, C_BLACK)
        px(img, ax + 1, ay, C_GRAPHITE_HI)
        px(img, ax + 2, ay, C_GRAPHITE_BASE)

        # Extended Nanorepair Module Housing (x: sh_x+4 to sh_x+14)
        mx = sh_x + 4
        # Upper module row
        rect(img, mx, ay - 1, mx + 10, ay - 1, C_BLACK)
        px(img, mx + 1, ay - 1, C_IVORY_LIGHT)
        px(img, mx + 2, ay - 1, C_IVORY_LIGHT)
        px(img, mx + 3, ay - 1, C_MINT_HOT)
        px(img, mx + 4, ay - 1, C_MINT_HOT)
        px(img, mx + 5, ay - 1, C_MINT_BRIGHT)
        px(img, mx + 6, ay - 1, C_GRAPHITE_HI)
        px(img, mx + 7, ay - 1, C_BRASS_LIGHT)
        px(img, mx + 8, ay - 1, C_GRAPHITE_HI)
        px(img, mx + 9, ay - 1, C_BRASS_LIGHT)

        # Core barrel row (contains muzzle center at x=sh_x+15 = 33)
        rect(img, mx, ay, mx + 11, ay, C_BLACK)
        px(img, mx + 1, ay, C_IVORY_BASE)
        px(img, mx + 2, ay, C_IVORY_BASE)
        px(img, mx + 3, ay, C_MINT_HOT)
        px(img, mx + 4, ay, C_MINT_HOT)
        px(img, mx + 5, ay, C_MINT_BRIGHT)
        px(img, mx + 6, ay, C_GRAPHITE_HI)
        px(img, mx + 7, ay, C_BRASS_BASE)
        px(img, mx + 8, ay, C_GRAPHITE_HI)
        px(img, mx + 9, ay, C_BRASS_BASE)
        px(img, mx + 10, ay, C_MINT_HOT) # Nozzle aperture glow

        # Lower module housing row
        rect(img, mx, ay + 1, mx + 9, ay + 1, C_BLACK)
        px(img, mx + 1, ay + 1, C_IVORY_SHADOW)
        px(img, mx + 2, ay + 1, C_IVORY_SHADOW)
        px(img, mx + 3, ay + 1, C_MINT_MID)
        px(img, mx + 4, ay + 1, C_MINT_DARK)
        px(img, mx + 5, ay + 1, C_GRAPHITE_BASE)
        px(img, mx + 6, ay + 1, C_GRAPHITE_DARK)
        px(img, mx + 7, ay + 1, C_BRASS_DARK)
        px(img, mx + 8, ay + 1, C_GRAPHITE_BASE)

        # Muzzle discharge energy flare extending forward (local x: 33..37, y: 47..49)
        flare_x = mx + 11
        px(img, flare_x, ay - 1, C_MINT_MID)
        px(img, flare_x, ay, C_MINT_HOT)
        px(img, flare_x, ay + 1, C_MINT_MID)

        px(img, flare_x + 1, ay, C_AMBER_HOT)
        px(img, flare_x + 2, ay, C_AMBER_BRIGHT)
        px(img, flare_x + 3, ay, C_AMBER_BASE)
        px(img, flare_x + 1, ay - 1, C_MINT_BRIGHT)
        px(img, flare_x + 1, ay + 1, C_MINT_BRIGHT)

    elif arm_mode == "attack_recoil":
        # Mechanical Recoil: Module kicks back 2-3px
        ax = sh_x + 2
        ay = sh_y + 1
        mx = sh_x + 3
        rect(img, mx, ay - 1, mx + 8, ay - 1, C_BLACK)
        px(img, mx + 1, ay - 1, C_IVORY_LIGHT)
        px(img, mx + 2, ay - 1, C_MINT_BRIGHT)
        px(img, mx + 3, ay - 1, C_MINT_MID)
        px(img, mx + 4, ay - 1, C_GRAPHITE_HI)
        px(img, mx + 5, ay - 1, C_BRASS_LIGHT)
        px(img, mx + 6, ay - 1, C_GRAPHITE_HI)
        px(img, mx + 7, ay - 1, C_BRASS_BASE)

        rect(img, mx, ay, mx + 9, ay, C_BLACK)
        px(img, mx + 1, ay, C_IVORY_BASE)
        px(img, mx + 2, ay, C_MINT_HOT)
        px(img, mx + 3, ay, C_MINT_BRIGHT)
        px(img, mx + 4, ay, C_GRAPHITE_HI)
        px(img, mx + 5, ay, C_BRASS_BASE)
        px(img, mx + 6, ay, C_GRAPHITE_HI)
        px(img, mx + 7, ay, C_BRASS_BASE)
        px(img, mx + 8, ay, C_MINT_BRIGHT)

        rect(img, mx, ay + 1, mx + 7, ay + 1, C_BLACK)
        px(img, mx + 1, ay + 1, C_IVORY_SHADOW)
        px(img, mx + 2, ay + 1, C_MINT_MID)
        px(img, mx + 3, ay + 1, C_GRAPHITE_BASE)
        px(img, mx + 4, ay + 1, C_BRASS_DARK)
        px(img, mx + 5, ay + 1, C_GRAPHITE_DARK)
        px(img, mx + 6, ay + 1, C_BRASS_DARK)

        # Dissipation steam / heat vent lines above module
        px(img, mx + 4, ay - 3, C_IVORY_HOT)
        px(img, mx + 6, ay - 2, C_IVORY_HOT)

    elif arm_mode == "attack_recover":
        # Returning arm toward neutral
        px(img, sh_x + 1, sh_y + 4, C_BLACK)
        px(img, sh_x + 2, sh_y + 4, C_GRAPHITE_HI)
        px(img, sh_x + 3, sh_y + 4, C_GRAPHITE_BASE)
        px(img, sh_x + 4, sh_y + 4, C_BLACK)

        my = sh_y + 5
        mx = sh_x + 3
        rect(img, mx, my, mx + 6, my, C_BLACK)
        px(img, mx + 1, my, C_IVORY_LIGHT)
        px(img, mx + 2, my, C_MINT_BRIGHT)
        px(img, mx + 3, my, C_MINT_MID)
        px(img, mx + 4, my, C_GRAPHITE_HI)
        px(img, mx + 5, my, C_BRASS_BASE)


def draw_far_arm(img, sh_x, sh_y, arm_mode="idle"):
    """
    Renders background arm (far arm) behind torso in deeper shadow tones.
    """
    # Small ivory pauldron in shadow
    px(img, sh_x, sh_y, C_BLACK)
    px(img, sh_x + 1, sh_y, C_IVORY_SHADOW)
    px(img, sh_x + 2, sh_y, C_BLACK)

    px(img, sh_x - 1, sh_y + 1, C_BLACK)
    px(img, sh_x, sh_y + 1, C_IVORY_SHADOW)
    px(img, sh_x + 1, sh_y + 1, C_IVORY_DEEP)
    px(img, sh_x + 2, sh_y + 1, C_BLACK)

    # Upper arm & forearm behind body
    if arm_mode in ("idle", "attack_charge", "attack_fire", "attack_recoil", "attack_recover"):
        px(img, sh_x, sh_y + 2, C_BLACK)
        px(img, sh_x + 1, sh_y + 2, C_GRAPHITE_DARK)
        px(img, sh_x + 2, sh_y + 2, C_BLACK)

        px(img, sh_x, sh_y + 3, C_BLACK)
        px(img, sh_x + 1, sh_y + 3, C_GRAPHITE_BASE)
        px(img, sh_x + 2, sh_y + 3, C_BLACK)

        # Hand / fist resting at flank
        px(img, sh_x + 1, sh_y + 4, C_BLACK)
        px(img, sh_x + 2, sh_y + 4, C_GRAPHITE_DARK)
        px(img, sh_x + 3, sh_y + 4, C_BLACK)

    elif arm_mode == "walk_forward":
        # Far arm swings forward
        px(img, sh_x + 1, sh_y + 2, C_BLACK)
        px(img, sh_x + 2, sh_y + 2, C_GRAPHITE_BASE)
        px(img, sh_x + 3, sh_y + 2, C_BLACK)

        px(img, sh_x + 2, sh_y + 3, C_BLACK)
        px(img, sh_x + 3, sh_y + 3, C_GRAPHITE_MID)
        px(img, sh_x + 4, sh_y + 3, C_BLACK)

        px(img, sh_x + 3, sh_y + 4, C_BLACK)
        px(img, sh_x + 4, sh_y + 4, C_GRAPHITE_BASE)
        px(img, sh_x + 5, sh_y + 4, C_BLACK)

    elif arm_mode == "walk_back":
        # Far arm swings back
        px(img, sh_x - 1, sh_y + 2, C_BLACK)
        px(img, sh_x, sh_y + 2, C_GRAPHITE_DARK)
        px(img, sh_x + 1, sh_y + 2, C_BLACK)

        px(img, sh_x - 2, sh_y + 3, C_BLACK)
        px(img, sh_x - 1, sh_y + 3, C_GRAPHITE_DARK)
        px(img, sh_x, sh_y + 3, C_BLACK)


# ==============================================================================
# STATE GENERATOR FUNCTIONS (21 FRAMES)
# ==============================================================================

def generate_idle(frame_index):
    """
    Idle cycle (4 frames, 5 fps):
    Subtle mechanical breathing & reactor pulsing.
    Body anchor: X=16. Ground line: Y=63.
    """
    img = new_canvas()
    # Vertical compression on frames 1 and 3 (dips by 1px)
    dip = 1 if frame_index in (1, 3) else 0

    head_x = 11
    head_y = 36 + dip
    torso_x = 11
    torso_y = 45 + dip
    tank_x = 7
    tank_y = 46 + dip
    pelvis_x = 11
    pelvis_y = 52 # hips stay anchored

    # Reactor pulse modulation
    reactor_mode = "bright" if frame_index == 2 else ("normal" if frame_index in (0, 3) else "dim")

    # Layer 1: Far Arm (behind body)
    draw_far_arm(img, sh_x=9, sh_y=47 + dip, arm_mode="idle")

    # Layer 2: Backpack Nanite Tank
    draw_backpack_tank(img, tank_x, tank_y, fluid_level="full")

    # Layer 3: Far Leg (left leg)
    # Hip at 13, knee at 12, foot at 11..14 resting on Y=63
    draw_leg_segment(img, hip_x=13, hip_y=pelvis_y + 1, knee_x=12, knee_y=57, foot_x=11, foot_y=63, is_near=False)

    # Layer 4: Pelvis
    draw_pelvis(img, pelvis_x, pelvis_y)

    # Layer 5: Near Leg (right leg)
    # Hip at 18, knee at 18, foot at 18..21 resting on Y=63
    draw_leg_segment(img, hip_x=18, hip_y=pelvis_y + 1, knee_x=18, knee_y=57, foot_x=18, foot_y=63, is_near=True)

    # Layer 6: Torso & Reactor
    draw_torso_and_reactor(img, torso_x, torso_y, reactor_mode=reactor_mode)

    # Layer 7: Head & Optics
    draw_head(img, head_x, head_y, optic_mode="normal")

    # Layer 8: Near Arm with Forearm Nanorepair Module
    draw_near_arm_and_nanomodule(img, sh_x=18, sh_y=47 + dip, arm_mode="idle")

    return img


def generate_walk(frame_index):
    """
    Locomotion cycle (4 frames, 12 fps):
    Articulated bipedal walk cycle with alternating support, knee clearance,
    weight transfer, and counter-swinging arms!
    Ground line strictly at Y=63.
    """
    img = new_canvas()

    if frame_index == 0:
        # Near leg forward contact (heel-strike at x=22, y=63)
        # Far leg back extension (push-off toe at x=9, y=63)
        head_x, head_y = 11, 37
        torso_x, torso_y = 11, 46
        tank_x, tank_y = 7, 47
        pelvis_x, pelvis_y = 11, 53

        # Far arm swings forward
        draw_far_arm(img, sh_x=9, sh_y=48, arm_mode="walk_forward")
        draw_backpack_tank(img, tank_x, tank_y, fluid_level="full")

        # Far leg: trailing push-off
        draw_leg_segment(img, hip_x=12, hip_y=pelvis_y + 1, knee_x=10, knee_y=57, foot_x=8, foot_y=63, is_near=False, foot_flat=False)

        draw_pelvis(img, pelvis_x, pelvis_y)

        # Near leg: leading contact
        draw_leg_segment(img, hip_x=18, hip_y=pelvis_y + 1, knee_x=20, knee_y=58, foot_x=22, foot_y=63, is_near=True, foot_flat=True)

        draw_torso_and_reactor(img, torso_x, torso_y, reactor_mode="normal")
        draw_head(img, head_x, head_y, optic_mode="normal")

        # Near arm swings back
        draw_near_arm_and_nanomodule(img, sh_x=18, sh_y=48, arm_mode="walk_back")

    elif frame_index == 1:
        # Passing Position 1: Near leg supporting full weight, far leg lifted & passing through
        head_x, head_y = 11, 36
        torso_x, torso_y = 11, 45
        tank_x, tank_y = 7, 46
        pelvis_x, pelvis_y = 11, 52

        draw_far_arm(img, sh_x=9, sh_y=47, arm_mode="idle")
        draw_backpack_tank(img, tank_x, tank_y, fluid_level="full")

        # Far leg: lifted off ground with clear clearance! (foot at y=60)
        draw_leg_segment(img, hip_x=12, hip_y=pelvis_y + 1, knee_x=13, knee_y=56, foot_x=13, foot_y=60, is_near=False, foot_flat=False)

        draw_pelvis(img, pelvis_x, pelvis_y)

        # Near leg: supporting weight straight under body at Y=63
        draw_leg_segment(img, hip_x=18, hip_y=pelvis_y + 1, knee_x=17, knee_y=57, foot_x=16, foot_y=63, is_near=True, foot_flat=True)

        draw_torso_and_reactor(img, torso_x, torso_y, reactor_mode="bright")
        draw_head(img, head_x, head_y, optic_mode="normal")

        draw_near_arm_and_nanomodule(img, sh_x=18, sh_y=47, arm_mode="idle")

    elif frame_index == 2:
        # Far leg forward contact (heel-strike at x=21, y=63)
        # Near leg back extension (push-off toe at x=9, y=63)
        head_x, head_y = 11, 37
        torso_x, torso_y = 11, 46
        tank_x, tank_y = 7, 47
        pelvis_x, pelvis_y = 11, 53

        draw_far_arm(img, sh_x=9, sh_y=48, arm_mode="walk_back")
        draw_backpack_tank(img, tank_x, tank_y, fluid_level="full")

        # Far leg: forward step contact
        draw_leg_segment(img, hip_x=12, hip_y=pelvis_y + 1, knee_x=18, knee_y=58, foot_x=21, foot_y=63, is_near=False, foot_flat=True)

        draw_pelvis(img, pelvis_x, pelvis_y)

        # Near leg: trailing push-off
        draw_leg_segment(img, hip_x=18, hip_y=pelvis_y + 1, knee_x=12, knee_y=57, foot_x=9, foot_y=63, is_near=True, foot_flat=False)

        draw_torso_and_reactor(img, torso_x, torso_y, reactor_mode="normal")
        draw_head(img, head_x, head_y, optic_mode="normal")

        # Near arm swings forward
        draw_near_arm_and_nanomodule(img, sh_x=18, sh_y=48, arm_mode="walk_forward")

    elif frame_index == 3:
        # Passing Position 2: Far leg supporting full weight, near leg lifted & passing through
        head_x, head_y = 11, 36
        torso_x, torso_y = 11, 45
        tank_x, tank_y = 7, 46
        pelvis_x, pelvis_y = 11, 52

        draw_far_arm(img, sh_x=9, sh_y=47, arm_mode="idle")
        draw_backpack_tank(img, tank_x, tank_y, fluid_level="full")

        # Far leg: supporting weight straight under body at Y=63
        draw_leg_segment(img, hip_x=12, hip_y=pelvis_y + 1, knee_x=13, knee_y=57, foot_x=14, foot_y=63, is_near=False, foot_flat=True)

        draw_pelvis(img, pelvis_x, pelvis_y)

        # Near leg: lifted off ground with clear knee clearance! (knee at 56, foot at 60)
        draw_leg_segment(img, hip_x=18, hip_y=pelvis_y + 1, knee_x=19, knee_y=56, foot_x=18, foot_y=60, is_near=True, foot_flat=False)

        draw_torso_and_reactor(img, torso_x, torso_y, reactor_mode="bright")
        draw_head(img, head_x, head_y, optic_mode="normal")

        draw_near_arm_and_nanomodule(img, sh_x=18, sh_y=47, arm_mode="idle")

    return img


def generate_jump():
    """
    Jump pose (vy < 0):
    Aerodynamic ascent, knees flexed upward absorbing launch, feet at Y=61..62.
    """
    img = new_canvas()
    head_x, head_y = 11, 35
    torso_x, torso_y = 11, 44
    tank_x, tank_y = 7, 45
    pelvis_x, pelvis_y = 11, 51

    draw_far_arm(img, sh_x=9, sh_y=46, arm_mode="idle")
    draw_backpack_tank(img, tank_x, tank_y, fluid_level="full")

    # Far leg tucked up
    draw_leg_segment(img, hip_x=13, hip_y=pelvis_y + 1, knee_x=12, knee_y=55, foot_x=11, foot_y=61, is_near=False, foot_flat=False)

    draw_pelvis(img, pelvis_x, pelvis_y)

    # Near leg flexed up
    draw_leg_segment(img, hip_x=18, hip_y=pelvis_y + 1, knee_x=19, knee_y=55, foot_x=17, foot_y=61, is_near=True, foot_flat=False)

    draw_torso_and_reactor(img, torso_x, torso_y, reactor_mode="bright")
    draw_head(img, head_x, head_y, optic_mode="bright")

    draw_near_arm_and_nanomodule(img, sh_x=18, sh_y=46, arm_mode="idle")
    return img


def generate_fall():
    """
    Fall pose (vy > 0):
    Aerodynamic descent, legs extended downward braced for impact, feet reaching Y=62..63.
    """
    img = new_canvas()
    head_x, head_y = 11, 36
    torso_x, torso_y = 11, 45
    tank_x, tank_y = 7, 46
    pelvis_x, pelvis_y = 11, 52

    draw_far_arm(img, sh_x=9, sh_y=47, arm_mode="idle")
    draw_backpack_tank(img, tank_x, tank_y, fluid_level="full")

    # Far leg reaching down
    draw_leg_segment(img, hip_x=13, hip_y=pelvis_y + 1, knee_x=11, knee_y=57, foot_x=10, foot_y=63, is_near=False, foot_flat=False)

    draw_pelvis(img, pelvis_x, pelvis_y)

    # Near leg reaching down
    draw_leg_segment(img, hip_x=18, hip_y=pelvis_y + 1, knee_x=19, knee_y=57, foot_x=20, foot_y=63, is_near=True, foot_flat=False)

    draw_torso_and_reactor(img, torso_x, torso_y, reactor_mode="normal")
    draw_head(img, head_x, head_y, optic_mode="normal")

    draw_near_arm_and_nanomodule(img, sh_x=18, sh_y=47, arm_mode="idle")
    return img


def generate_attack1(frame_index):
    """
    Attack cycle (4 frames, 22 fps):
    Frame 0: Windup / Aim alignment.
    Frame 1: Full discharge extension, muzzle aligned with (33, 48).
    Frame 2: Mechanical recoil & heat dissipation.
    Frame 3: Recovery.
    """
    img = new_canvas()

    if frame_index == 0:
        # Windup: Torso back 1px, aiming forward
        head_x, head_y = 10, 36
        torso_x, torso_y = 10, 45
        tank_x, tank_y = 6, 46
        pelvis_x, pelvis_y = 10, 52

        draw_far_arm(img, sh_x=8, sh_y=47, arm_mode="attack_charge")
        draw_backpack_tank(img, tank_x, tank_y, fluid_level="full")
        draw_leg_segment(img, hip_x=12, hip_y=pelvis_y + 1, knee_x=10, knee_y=57, foot_x=9, foot_y=63, is_near=False)
        draw_pelvis(img, pelvis_x, pelvis_y)
        draw_leg_segment(img, hip_x=17, hip_y=pelvis_y + 1, knee_x=18, knee_y=57, foot_x=19, foot_y=63, is_near=True)
        draw_torso_and_reactor(img, torso_x, torso_y, reactor_mode="bright")
        draw_head(img, head_x, head_y, optic_mode="bright")
        draw_near_arm_and_nanomodule(img, sh_x=17, sh_y=47, arm_mode="attack_charge")

    elif frame_index == 1:
        # Discharge: Thrust forward, blaster extends to x=33..37, y=48!
        head_x, head_y = 12, 36
        torso_x, torso_y = 12, 45
        tank_x, tank_y = 8, 46
        pelvis_x, pelvis_y = 11, 52

        draw_far_arm(img, sh_x=10, sh_y=47, arm_mode="attack_fire")
        draw_backpack_tank(img, tank_x, tank_y, fluid_level="full")
        draw_leg_segment(img, hip_x=12, hip_y=pelvis_y + 1, knee_x=9, knee_y=57, foot_x=7, foot_y=63, is_near=False)
        draw_pelvis(img, pelvis_x, pelvis_y)
        draw_leg_segment(img, hip_x=18, hip_y=pelvis_y + 1, knee_x=20, knee_y=57, foot_x=22, foot_y=63, is_near=True)
        draw_torso_and_reactor(img, torso_x, torso_y, reactor_mode="bright")
        draw_head(img, head_x, head_y, optic_mode="bright")
        # Near arm snaps forward: nozzle aligns with local (33, 48)
        draw_near_arm_and_nanomodule(img, sh_x=18, sh_y=47, arm_mode="attack_fire")

    elif frame_index == 2:
        # Mechanical Recoil: Blaster kicks back 3px, heat dissipation
        head_x, head_y = 11, 36
        torso_x, torso_y = 11, 45
        tank_x, tank_y = 7, 46
        pelvis_x, pelvis_y = 11, 52

        draw_far_arm(img, sh_x=9, sh_y=47, arm_mode="attack_recoil")
        draw_backpack_tank(img, tank_x, tank_y, fluid_level="full")
        draw_leg_segment(img, hip_x=12, hip_y=pelvis_y + 1, knee_x=10, knee_y=57, foot_x=9, foot_y=63, is_near=False)
        draw_pelvis(img, pelvis_x, pelvis_y)
        draw_leg_segment(img, hip_x=18, hip_y=pelvis_y + 1, knee_x=19, knee_y=57, foot_x=20, foot_y=63, is_near=True)
        draw_torso_and_reactor(img, torso_x, torso_y, reactor_mode="bright")
        draw_head(img, head_x, head_y, optic_mode="normal")
        draw_near_arm_and_nanomodule(img, sh_x=18, sh_y=47, arm_mode="attack_recoil")

    elif frame_index == 3:
        # Recovery: Blaster lowering back toward ready stance
        head_x, head_y = 11, 36
        torso_x, torso_y = 11, 45
        tank_x, tank_y = 7, 46
        pelvis_x, pelvis_y = 11, 52

        draw_far_arm(img, sh_x=9, sh_y=47, arm_mode="attack_recover")
        draw_backpack_tank(img, tank_x, tank_y, fluid_level="full")
        draw_leg_segment(img, hip_x=13, hip_y=pelvis_y + 1, knee_x=11, knee_y=57, foot_x=11, foot_y=63, is_near=False)
        draw_pelvis(img, pelvis_x, pelvis_y)
        draw_leg_segment(img, hip_x=18, hip_y=pelvis_y + 1, knee_x=18, knee_y=57, foot_x=18, foot_y=63, is_near=True)
        draw_torso_and_reactor(img, torso_x, torso_y, reactor_mode="normal")
        draw_head(img, head_x, head_y, optic_mode="normal")
        draw_near_arm_and_nanomodule(img, sh_x=18, sh_y=47, arm_mode="attack_recover")

    return img


def generate_hurt(frame_index):
    """
    Hurt cycle (3 frames, 12 fps):
    Frame 0: Kinetic recoil back, armor stress.
    Frame 1: Electrical / shield flash (high-energy silhouette flash).
    Frame 2: Balance recovery & visor relight.
    """
    img = new_canvas()

    if frame_index == 0:
        # Impact recoil: Torso jarred back 2px
        head_x, head_y = 9, 36
        torso_x, torso_y = 9, 45
        tank_x, tank_y = 5, 46
        pelvis_x, pelvis_y = 10, 52

        draw_far_arm(img, sh_x=7, sh_y=47, arm_mode="idle")
        draw_backpack_tank(img, tank_x, tank_y, fluid_level="mid")
        draw_leg_segment(img, hip_x=11, hip_y=pelvis_y + 1, knee_x=9, knee_y=57, foot_x=8, foot_y=63, is_near=False)
        draw_pelvis(img, pelvis_x, pelvis_y)
        draw_leg_segment(img, hip_x=16, hip_y=pelvis_y + 1, knee_x=17, knee_y=57, foot_x=18, foot_y=63, is_near=True)
        draw_torso_and_reactor(img, torso_x, torso_y, reactor_mode="dim")
        draw_head(img, head_x, head_y, optic_mode="dim")
        draw_near_arm_and_nanomodule(img, sh_x=16, sh_y=47, arm_mode="idle")

    elif frame_index == 1:
        # Electric shield flash: High energy silhouette with energized mint circuitry
        # We render normal frame 0, then transform it into a luminous damage flash!
        base = generate_hurt(0)
        for y in range(base.height):
            for x in range(base.width):
                r, g, b, a = base.getpixel((x, y))
                if a > 0:
                    if (r, g, b) == (0, 0, 0):
                        px(img, x, y, C_BLACK)
                    elif (r, g, b) in ((C_MINT_BRIGHT[0], C_MINT_BRIGHT[1], C_MINT_BRIGHT[2]),
                                       (C_MINT_HOT[0], C_MINT_HOT[1], C_MINT_HOT[2])):
                        px(img, x, y, (255, 255, 255, 255))
                    else:
                        # Bright luminous ivory flash
                        px(img, x, y, (245, 252, 255, 255))

    elif frame_index == 2:
        # Stabilization / recovery
        head_x, head_y = 10, 36
        torso_x, torso_y = 10, 45
        tank_x, tank_y = 6, 46
        pelvis_x, pelvis_y = 11, 52

        draw_far_arm(img, sh_x=8, sh_y=47, arm_mode="idle")
        draw_backpack_tank(img, tank_x, tank_y, fluid_level="full")
        draw_leg_segment(img, hip_x=12, hip_y=pelvis_y + 1, knee_x=11, knee_y=57, foot_x=10, foot_y=63, is_near=False)
        draw_pelvis(img, pelvis_x, pelvis_y)
        draw_leg_segment(img, hip_x=17, hip_y=pelvis_y + 1, knee_x=18, knee_y=57, foot_x=18, foot_y=63, is_near=True)
        draw_torso_and_reactor(img, torso_x, torso_y, reactor_mode="normal")
        draw_head(img, head_x, head_y, optic_mode="bright")
        draw_near_arm_and_nanomodule(img, sh_x=17, sh_y=47, arm_mode="idle")

    return img


def generate_die(frame_index):
    """
    Defeat cycle (4 frames, 10 fps, loop: false):
    Communicates mechanical power depletion & structural shutdown.
    Frame 0: Critical power overload, knees buckle, reactor dims.
    Frame 1: Mechanical collapse backward/downward.
    Frame 2: Floor impact at Y=63.
    Frame 3: Inert mechanical rest on platform, visor & reactor dark.
    """
    img = new_canvas()

    if frame_index == 0:
        # Knees buckle, reactor dims, head slumps forward
        head_x, head_y = 11, 38
        torso_x, torso_y = 10, 47
        tank_x, tank_y = 6, 48
        pelvis_x, pelvis_y = 10, 54

        draw_far_arm(img, sh_x=8, sh_y=49, arm_mode="idle")
        draw_backpack_tank(img, tank_x, tank_y, fluid_level="low")
        draw_leg_segment(img, hip_x=11, hip_y=pelvis_y + 1, knee_x=8, knee_y=58, foot_x=7, foot_y=63, is_near=False, foot_flat=True)
        draw_pelvis(img, pelvis_x, pelvis_y)
        draw_leg_segment(img, hip_x=16, hip_y=pelvis_y + 1, knee_x=15, knee_y=58, foot_x=16, foot_y=63, is_near=True, foot_flat=True)
        draw_torso_and_reactor(img, torso_x, torso_y, reactor_mode="dim")
        draw_head(img, head_x, head_y, optic_mode="dim")
        draw_near_arm_and_nanomodule(img, sh_x=16, sh_y=49, arm_mode="idle")

    elif frame_index == 1:
        # Collapse backward: Hips sinking, legs folding at hinges
        head_x, head_y = 9, 43
        torso_x, torso_y = 9, 50
        tank_x, tank_y = 5, 51
        pelvis_x, pelvis_y = 11, 56

        draw_backpack_tank(img, tank_x, tank_y, fluid_level="low")
        # Folded legs
        draw_leg_segment(img, hip_x=12, hip_y=pelvis_y + 1, knee_x=16, knee_y=60, foot_x=18, foot_y=63, is_near=False, foot_flat=True)
        draw_pelvis(img, pelvis_x, pelvis_y)
        draw_leg_segment(img, hip_x=15, hip_y=pelvis_y + 1, knee_x=20, knee_y=60, foot_x=23, foot_y=63, is_near=True, foot_flat=True)
        draw_torso_and_reactor(img, torso_x, torso_y, reactor_mode="off")
        draw_head(img, head_x, head_y, optic_mode="off")
        draw_near_arm_and_nanomodule(img, sh_x=14, sh_y=52, arm_mode="idle")

    elif frame_index == 2:
        # Impact with platform: Body settling onto Y=63
        # Head resting at y=52..60, torso at y=54..61, legs sprawling along y=59..63
        hy = 52
        hx = 9
        # Head resting tilted
        draw_head(img, hx, hy, optic_mode="off")
        # Torso resting flat
        tx = 18
        ty = 54
        draw_torso_and_reactor(img, tx, ty, reactor_mode="off")
        # Pelvis & sprawling legs along floor at Y=63
        rect(img, 28, 59, 36, 59, C_BLACK)
        rect(img, 29, 60, 38, 60, C_IVORY_SHADOW)
        rect(img, 28, 61, 42, 61, C_GRAPHITE_BASE)
        rect(img, 27, 62, 44, 62, C_IVORY_BASE)
        rect(img, 26, 63, 45, 63, C_BLACK)
        # Nanorepair module resting on floor
        rect(img, 14, 60, 22, 60, C_BLACK)
        rect(img, 15, 61, 23, 61, C_IVORY_SHADOW)
        rect(img, 14, 62, 24, 62, C_GRAPHITE_BASE)
        rect(img, 13, 63, 25, 63, C_BLACK)

    elif frame_index == 3:
        # Stable inert rest on platform: Completely dormant mechanical chassis
        # Resting horizontally flat, strictly touching Y=63
        # Head at x=8..18, y=53..61
        draw_head(img, 8, 53, optic_mode="off")

        # Inert torso & dark reactor at x=18..28, y=54..61
        draw_torso_and_reactor(img, 17, 54, reactor_mode="off")

        # Dorsal tank resting flat
        px(img, 12, 60, C_BLACK)
        px(img, 13, 60, C_GRAPHITE_DARK)
        px(img, 14, 60, C_MINT_DIM)
        px(img, 15, 60, C_BLACK)

        # Sprawled legs & hip joints (resting on floor at Y=63)
        rect(img, 27, 58, 38, 58, C_BLACK)
        rect(img, 28, 59, 40, 59, C_IVORY_SHADOW)
        rect(img, 27, 60, 42, 60, C_GRAPHITE_BASE)
        rect(img, 26, 61, 45, 61, C_IVORY_BASE)
        rect(img, 25, 62, 46, 62, C_GRAPHITE_HI)
        rect(img, 24, 63, 47, 63, C_BLACK)

        # Nanorepair blaster lying cold on platform
        rect(img, 15, 61, 24, 61, C_BLACK)
        rect(img, 16, 62, 25, 62, C_GRAPHITE_MID)
        rect(img, 15, 63, 26, 63, C_BLACK)

    return img


def generate_portrait():
    """
    Selection portrait: 32x32 RGBA.
    Origin top-left, transparent background.
    Features: Rounded warm-ivory helmet, amber optics, graphite neck, circular mint reactor.
    """
    img = Image.new("RGBA", (32, 32), C_TRANS)

    # Frame & background circle / hexagon plate
    # Draw centered Nilo bust:
    hx = 8
    hy = 3
    # Use draw_head directly at top of 32x32!
    draw_head(img, hx, hy, optic_mode="bright")

    # Upper torso & reactor at bottom of portrait
    tx = 8
    ty = 12
    draw_torso_and_reactor(img, tx, ty, reactor_mode="bright")

    # Backpack tank upper valve visible behind
    draw_backpack_tank(img, 4, 13, fluid_level="full")

    # Pauldron highlights
    rect(img, 17, 13, 21, 15, C_IVORY_LIGHT)
    rect(img, 16, 13, 22, 16, C_BLACK)

    return img


def generate_heal_vfx(frame_index):
    """
    Dedicated nanorepair heal VFX (4 frames, 32x32 RGBA):
    Expanding atompunk nanite pulse with concentric mint rings and micro-spark particles.
    """
    img = Image.new("RGBA", (32, 32), C_TRANS)
    cx, cy = 16, 16

    if frame_index == 0:
        # Small core spark
        px(img, cx, cy, C_MINT_HOT)
        px(img, cx - 1, cy, C_MINT_BRIGHT)
        px(img, cx + 1, cy, C_MINT_BRIGHT)
        px(img, cx, cy - 1, C_MINT_BRIGHT)
        px(img, cx, cy + 1, C_MINT_BRIGHT)
    elif frame_index == 1:
        # Expanding 5x5 nanite diamond
        for dx, dy in [(-2, 0), (2, 0), (0, -2), (0, 2), (-1, -1), (1, -1), (-1, 1), (1, 1)]:
            px(img, cx + dx, cy + dy, C_MINT_BRIGHT)
        px(img, cx, cy, C_MINT_HOT)
        px(img, cx + 1, cy, C_MINT_HOT)
        px(img, cx, cy + 1, C_MINT_HOT)
    elif frame_index == 2:
        # Expanding 9x9 circle ring with orbiting repair sparks
        for dx, dy in [(-4, 0), (4, 0), (0, -4), (0, 4),
                       (-3, -2), (-2, -3), (2, -3), (3, -2),
                       (-3, 2), (-2, 3), (2, 3), (3, 2)]:
            px(img, cx + dx, cy + dy, C_MINT_BRIGHT)
        # Inner fading core
        px(img, cx - 1, cy, C_MINT_MID)
        px(img, cx + 1, cy, C_MINT_MID)
        px(img, cx, cy - 1, C_MINT_MID)
        px(img, cx, cy + 1, C_MINT_MID)
    elif frame_index == 3:
        # Dissipating nanite particles
        for dx, dy in [(-6, -3), (6, -2), (-2, 6), (5, 5), (-5, -5), (3, -6)]:
            px(img, cx + dx, cy + dy, C_MINT_MID)
            px(img, cx + dx + 1, cy + dy, C_MINT_HOT)

    return img


# ==============================================================================
# MAIN EXPORT & BUILD PIPELINE
# ==============================================================================

def build_all_nilo_assets(output_dir="assets/images/characters/nilo"):
    os.makedirs(output_dir, exist_ok=True)
    frames_dict = {}

    # 1. Idle (4 frames)
    for i in range(4):
        key = f"nilo.idle.{i}"
        filename = f"nilo-idle-{i:03d}.png"
        img = generate_idle(i)
        img.save(os.path.join(output_dir, filename))
        frames_dict[key] = img

    # 2. Walk (4 frames)
    for i in range(4):
        key = f"nilo.walk.{i}"
        filename = f"nilo-walk-{i:03d}.png"
        img = generate_walk(i)
        img.save(os.path.join(output_dir, filename))
        frames_dict[key] = img

    # 3. Jump (1 frame)
    img_jump = generate_jump()
    img_jump.save(os.path.join(output_dir, "nilo-jump-000.png"))
    frames_dict["nilo.jump.0"] = img_jump

    # 4. Fall (1 frame)
    img_fall = generate_fall()
    img_fall.save(os.path.join(output_dir, "nilo-fall-000.png"))
    frames_dict["nilo.fall.0"] = img_fall

    # 5. Attack1 (4 frames)
    for i in range(4):
        key = f"nilo.attack1.{i}"
        filename = f"nilo-attack1-{i:03d}.png"
        img = generate_attack1(i)
        img.save(os.path.join(output_dir, filename))
        frames_dict[key] = img

    # 6. Hurt (3 frames)
    for i in range(3):
        key = f"nilo.hurt.{i}"
        filename = f"nilo-hurt-{i:03d}.png"
        img = generate_hurt(i)
        img.save(os.path.join(output_dir, filename))
        frames_dict[key] = img

    # 7. Die (4 frames)
    for i in range(4):
        key = f"nilo.die.{i}"
        filename = f"nilo-die-{i:03d}.png"
        img = generate_die(i)
        img.save(os.path.join(output_dir, filename))
        frames_dict[key] = img

    # 8. Portrait (32x32)
    img_portrait = generate_portrait()
    img_portrait.save(os.path.join(output_dir, "nilo-portrait-000.png"))
    frames_dict["nilo.portrait.0"] = img_portrait

    # 9. Heal VFX (4 frames, 32x32)
    for i in range(4):
        key = f"nilo.heal.{i}"
        filename = f"nilo-heal-{i:03d}.png"
        img = generate_heal_vfx(i)
        img.save(os.path.join(output_dir, filename))
        frames_dict[key] = img

    print(f"Successfully generated {len(frames_dict)} assets in {output_dir}")
    return frames_dict


if __name__ == "__main__":
    build_all_nilo_assets()
