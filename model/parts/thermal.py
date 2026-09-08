"""THERMAL (front radiator + fan + pipe stubs) and THERM_CTRL (small box)."""

import math

import bmesh
from mathutils import Matrix

import common
import layout

#: cylinders build along local Z; the fan spins about the car's Y axis
AXIS_Y = Matrix.Rotation(-math.pi / 2.0, 4, "X")
SEG_FAN = 16
SEG_PIPE = 8


def build_thermal(ctx):
    """THERMAL: radiator slab with fin lines, a fan, and two coolant stubs."""
    spec = layout.BLOCKS["THERMAL"]
    bm = bmesh.new()
    common.add_box(bm, spec["size"], common.trs(spec["center"]))

    cx, cy, cz = spec["center"]
    fin_size = spec["fin_size"]
    fin_x = cx
    # fins sit on the -Y (nose-facing, outward) side so they read as a grille
    # from outside the car; the fan and pipes live on the +Y (cabin) side.
    fin_y = cy - spec["size"][1] / 2.0 - fin_size[1] / 2.0
    for z_off in spec["fin_z_offsets"]:
        common.add_box(bm, fin_size, common.trs((fin_x, fin_y, cz + z_off)))

    common.add_cylinder(
        bm, radius=spec["fan_radius"], depth=spec["fan_depth"], segments=SEG_FAN,
        matrix=common.trs(spec["fan_center"], AXIS_Y),
    )

    pipe_len = spec["pipe_length"]
    for (px, py, pz) in spec["pipe_centers"]:
        common.add_cylinder(
            bm, radius=spec["pipe_radius"], depth=pipe_len, segments=SEG_PIPE,
            matrix=common.trs((px, py, pz), AXIS_Y),
        )

    return ctx.emit_block("THERMAL", bm)


def build_therm_ctrl(ctx):
    """THERM_CTRL: pump / fan controller box beside the radiator."""
    return common.stub_box_block(ctx, "THERM_CTRL")
