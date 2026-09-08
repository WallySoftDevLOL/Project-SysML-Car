"""BRAKES: four discs merged into ONE object named BRAKES.

STUB. Discs only; the real version adds calipers.
"""

import math

import bmesh
from mathutils import Matrix

import common
import layout

AXIS_X = Matrix.Rotation(math.pi / 2.0, 4, "Y")


def build_brakes(ctx):
    spec = layout.BLOCKS["BRAKES"]
    bm = bmesh.new()
    for center in spec["disc_centers"]:
        common.add_cylinder(
            bm,
            radius=spec["disc_radius"],
            depth=spec["disc_depth"],
            segments=layout.SEG_DISC,
            matrix=common.trs(center, AXIS_X),
        )
    return ctx.emit_block("BRAKES", bm)
