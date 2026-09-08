"""POWERTRAIN (dual drive units) and INVERTER.

POWERTRAIN: a rear drive unit (motor + reduction gearbox + half-shafts) and a
smaller front drive unit (motor + half-shafts), reading as a dual-motor
electric powertrain. INVERTER: a finned can mounted on the rear motor.
"""

import math

import bmesh
from mathutils import Matrix

import common
import layout

#: cylinders build along local Z; motors and half-shafts run along X
AXIS_X = Matrix.Rotation(math.pi / 2.0, 4, "Y")

SEG_MOTOR = 14
SEG_SHAFT = 8


def _half_shaft(bm, y, z, x_range, radius, segments):
    x0, x1 = x_range
    length = x1 - x0
    center_pos = (x0 + x1) / 2.0
    center_neg = -center_pos
    common.add_cylinder(bm, radius=radius, depth=length, segments=segments,
                        matrix=common.trs((center_pos, y, z), AXIS_X))
    common.add_cylinder(bm, radius=radius, depth=length, segments=segments,
                        matrix=common.trs((center_neg, y, z), AXIS_X))


def build_powertrain(ctx):
    """POWERTRAIN: rear + front drive units, dual-motor layout."""
    spec = layout.BLOCKS["POWERTRAIN"]
    bm = bmesh.new()

    # rear drive unit: motor + reduction gearbox + half-shafts
    common.add_cylinder(
        bm, radius=spec["rear_motor_radius"], depth=spec["rear_motor_length"],
        segments=SEG_MOTOR, matrix=common.trs(spec["rear_motor_center"], AXIS_X),
    )
    common.add_box(bm, spec["rear_gearbox_size"], common.trs(spec["rear_gearbox_center"]))
    _half_shaft(bm, spec["rear_motor_center"][1], spec["rear_motor_center"][2],
                spec["rear_shaft_x_range"], spec["rear_shaft_radius"], SEG_SHAFT)

    # front drive unit: smaller motor + half-shafts, no gearbox can shown
    common.add_cylinder(
        bm, radius=spec["front_motor_radius"], depth=spec["front_motor_length"],
        segments=SEG_MOTOR, matrix=common.trs(spec["front_motor_center"], AXIS_X),
    )
    _half_shaft(bm, spec["front_motor_center"][1], spec["front_motor_center"][2],
                spec["front_shaft_x_range"], spec["front_shaft_radius"], SEG_SHAFT)

    return ctx.emit_block("POWERTRAIN", bm)


def build_inverter(ctx):
    """INVERTER: traction inverter can with cooling fins, on the rear motor."""
    spec = layout.BLOCKS["INVERTER"]
    bm = bmesh.new()
    common.add_box(bm, spec["size"], common.trs(spec["center"]))

    cx, cy, cz = spec["center"]
    fin_size = spec["fin_size"]
    top_z = cz + spec["size"][2] / 2.0 + fin_size[2] / 2.0
    for x_off in spec["fin_x_offsets"]:
        common.add_box(bm, fin_size, common.trs((cx + x_off, cy, top_z)))

    return ctx.emit_block("INVERTER", bm)
