"""POWERTRAIN (dual drive units) and INVERTER.

Each drive unit is built from the same description: a ribbed motor housing on
the axle line, an end bell at each end, a rounded reduction-gearbox casing
offset to the car's right with the differential bulge inside it, and half-shafts
carrying CV joint boots out to |x| = 0.66, just inside the wheel hubs. The front
unit is the same language at a smaller scale.

INVERTER: a finned traction inverter sitting on the rear motor's ribs, with two
HV connector ports and one low-voltage connector on its forward face.
"""

import bmesh

import common
import layout

from . import _shapes


def _drive_unit(bm, unit):
    """One motor + gearbox + shaft assembly, from a ``drive_units`` entry."""
    y = unit["axle_y"]
    z = unit["axis_z"]
    axle = (0.0, y, z)

    # motor housing with its stack of cooling ribs
    _shapes.axis_cylinder(bm, axle, unit["motor_radius"], unit["motor_length"],
                          axis="X", segments=unit["motor_segments"])
    _shapes.rib_stack(bm, axle, unit["rib_x_offsets"], unit["rib_radius"],
                      unit["rib_depth"], axis="X", segments=unit["rib_segments"])

    # end bells
    for sign in (1.0, -1.0):
        _shapes.axis_cylinder(bm, (sign * unit["bell_x"], y, z),
                              unit["bell_radius"], unit["bell_depth"],
                              axis="X", segments=unit["bell_segments"])

    # reduction gearbox casing (rounded) with the differential bulge inside it
    _shapes.bevel_box(bm, unit["gearbox_size"], unit["gearbox_center"],
                      unit["gearbox_bevel"], unit["gearbox_bevel_segments"])
    _shapes.axis_cylinder(bm, unit["diff_center"], unit["diff_radius"],
                          unit["diff_depth"], axis="X",
                          segments=unit["diff_segments"])

    # half-shafts
    for (x0, x1) in unit["shaft_x_ranges"]:
        _shapes.axis_cylinder(bm, ((x0 + x1) / 2.0, y, z), unit["shaft_radius"],
                              abs(x1 - x0), axis="X",
                              segments=unit["shaft_segments"])

    # CV joint boots: short wider cylinders at the shaft ends
    for x in unit["boot_x"]:
        _shapes.axis_cylinder(bm, (x, y, z), unit["boot_radius"],
                              unit["boot_depth"], axis="X",
                              segments=unit["boot_segments"])


def build_powertrain(ctx):
    """POWERTRAIN: rear + front drive units, dual-motor layout."""
    spec = layout.BLOCKS["POWERTRAIN"]
    _shapes.block_material(ctx, "POWERTRAIN")
    bm = bmesh.new()
    for unit in spec["drive_units"]:
        _drive_unit(bm, unit)
    return ctx.emit_block("POWERTRAIN", bm)


def build_inverter(ctx):
    """INVERTER: finned traction inverter with HV and LV connectors."""
    spec = layout.BLOCKS["INVERTER"]
    _shapes.block_material(ctx, "INVERTER")
    bm = bmesh.new()

    common.add_box(bm, spec["body_size"], common.trs(spec["body_center"]))
    _shapes.fin_stack(bm, spec["fin_center"], spec["fin_x_offsets"],
                      spec["fin_size"], along="X")

    for center in spec["hv_port_centers"]:
        _shapes.axis_cylinder(bm, center, spec["hv_port_radius"],
                              spec["hv_port_depth"], axis="Y",
                              segments=spec["hv_port_segments"])
    common.add_box(bm, spec["lv_port_size"], common.trs(spec["lv_port_center"]))

    return ctx.emit_block("INVERTER", bm)
