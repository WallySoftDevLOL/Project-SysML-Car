"""SENSORS: four wheel-speed pucks plus a front radar, merged into ONE object.

STUB. The real version adds the camera behind the windscreen.
"""

import math

import bmesh
from mathutils import Matrix

import common
import layout

AXIS_X = Matrix.Rotation(math.pi / 2.0, 4, "Y")


def build_sensors(ctx):
    spec = layout.BLOCKS["SENSORS"]
    bm = bmesh.new()
    for center in spec["puck_centers"]:
        common.add_cylinder(
            bm,
            radius=spec["puck_radius"],
            depth=spec["puck_depth"],
            segments=layout.SEG_PUCK,
            matrix=common.trs(center, AXIS_X),
        )
    common.add_box(bm, spec["radar_size"], common.trs(spec["radar_center"]))
    return ctx.emit_block("SENSORS", bm)
