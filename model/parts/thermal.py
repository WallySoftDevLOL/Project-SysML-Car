"""THERMAL (front cooling pack + coolant hoses), PUMP and THERM_CTRL.

THERMAL: a radiator core with horizontal fin lines and a side tank at each end,
a fan shroud ring with a seven-blade fan, an expansion tank, and two hoses swept
back along the car's right side - one to the battery pack, one to the rear drive
unit. Everything stays behind y = -2.05 and under z = 0.78 at the nose.
PUMP: the small electric coolant pump, its own clickable block, wrapped around
the rear hose where that hose leaves the radiator.
THERM_CTRL: the pump / fan controller box with a connector, outboard of the
expansion tank.
"""

import math

import bmesh

import common
import layout

from . import _shapes


def build_thermal(ctx):
    """THERMAL: radiator, shrouded fan, expansion tank, pump and hoses."""
    spec = layout.BLOCKS["THERMAL"]
    _shapes.block_material(ctx, "THERMAL")
    bm = bmesh.new()

    # radiator core, fin lines on the nose-facing side, a tank at each end
    common.add_box(bm, spec["core_size"], common.trs(spec["core_center"]))
    _shapes.fin_stack(bm, spec["fin_center"], spec["fin_z_offsets"],
                      spec["fin_size"], along="Z")
    tank_size = spec["tank_size"]
    for center in spec["tank_centers"]:
        common.add_box(bm, tank_size, common.trs(center))

    # fan shroud: an open ring, so it reads as a duct rather than a plate
    _shapes.axis_cylinder(bm, spec["shroud_center"], spec["shroud_radius"],
                          spec["shroud_depth"], axis="Y",
                          segments=spec["shroud_segments"], cap_ends=False)
    _shapes.axis_cylinder(bm, spec["fan_hub_center"], spec["fan_hub_radius"],
                          spec["fan_hub_depth"], axis="Y",
                          segments=spec["fan_hub_segments"])
    _shapes.radial_boxes(bm, spec["fan_blade_count"], spec["fan_blade_radius"],
                         spec["fan_blade_size"], center=spec["fan_hub_center"],
                         axis="Y", phase=math.pi / 14.0)

    # expansion tank with its filler cap
    _shapes.axis_cylinder(bm, spec["expansion_center"], spec["expansion_radius"],
                          spec["expansion_depth"], axis="Z",
                          segments=spec["expansion_segments"])
    _shapes.axis_cylinder(bm, spec["expansion_cap_center"],
                          spec["expansion_cap_radius"],
                          spec["expansion_cap_depth"], axis="Z",
                          segments=spec["expansion_cap_segments"])

    # coolant hoses, swept along their polylines
    for points in spec["hoses"]:
        _shapes.poly_tube(bm, points, spec["hose_radius"],
                          sides=spec["hose_sides"])

    return ctx.emit_block("THERMAL", bm)


def build_pump(ctx):
    """PUMP: electric coolant pump, sitting inline on the rear coolant hose."""
    spec = layout.BLOCKS["PUMP"]
    _shapes.block_material(ctx, "PUMP")
    bm = bmesh.new()

    _shapes.axis_cylinder(bm, spec["pump_center"], spec["pump_radius"],
                          spec["pump_depth"], axis="Y",
                          segments=spec["pump_segments"])

    return ctx.emit_block("PUMP", bm)


def build_therm_ctrl(ctx):
    """THERM_CTRL: pump / fan controller box beside the radiator."""
    spec = layout.BLOCKS["THERM_CTRL"]
    _shapes.block_material(ctx, "THERM_CTRL")
    bm = bmesh.new()

    common.add_box(bm, spec["body_size"], common.trs(spec["body_center"]))
    _shapes.fin_stack(bm, spec["fin_center"], spec["fin_y_offsets"],
                      spec["fin_size"], along="Y")
    common.add_box(bm, spec["connector_size"], common.trs(spec["connector_center"]))

    return ctx.emit_block("THERM_CTRL", bm)
