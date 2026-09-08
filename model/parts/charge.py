"""CHARGE: charge door / socket on the car's left rear quarter."""

import math

import bmesh
from mathutils import Matrix

import common
import layout

#: cylinders build along local Z; the socket bore points out along X
AXIS_X = Matrix.Rotation(math.pi / 2.0, 4, "Y")
SEG_SOCKET = 16
SEG_PIN = 8


def build_charge(ctx):
    spec = layout.BLOCKS["CHARGE"]
    bm = bmesh.new()

    common.add_box(bm, spec["size"], common.trs(spec["center"]))
    common.add_cylinder(
        bm, radius=spec["socket_radius"], depth=spec["socket_depth"],
        segments=SEG_SOCKET, matrix=common.trs(spec["socket_center"], AXIS_X),
    )
    for center in spec["pin_centers"]:
        common.add_cylinder(
            bm, radius=spec["pin_radius"], depth=spec["pin_depth"],
            segments=SEG_PIN, matrix=common.trs(center, AXIS_X),
        )

    return ctx.emit_block("CHARGE", bm)
