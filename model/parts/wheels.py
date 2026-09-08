"""Wheel decor: DECOR_wheel_FL / FR / RL / RR.

STUB. One capped cylinder per wheel, axis along X. The real implementation adds
a rim and a tire shoulder.
"""

import math

import bmesh
from mathutils import Matrix

import common
import layout

#: cylinders are built along local Z; the wheel axis is X
AXIS_X = Matrix.Rotation(math.pi / 2.0, 4, "Y")


def build_wheels(ctx):
    mat = common.make_material("M_DECOR_tire", layout.COLOR_TIRE,
                               alpha=1.0, roughness=0.85, metallic=0.0)
    objs = []
    for name in sorted(layout.WHEELS):
        center = layout.WHEELS[name]
        bm = bmesh.new()
        common.add_cylinder(
            bm,
            radius=layout.WHEEL_RADIUS,
            depth=layout.WHEEL_WIDTH,
            segments=layout.SEG_WHEEL,
            matrix=common.trs(center, AXIS_X),
        )
        objs.append(ctx.emit_decor(name, bm, mat, sysml_name=name.replace("DECOR_", "")))
    return objs
