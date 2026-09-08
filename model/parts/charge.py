"""CHARGE (mounting bezel), CHARGE_PORT (door + socket) and OBC.

CHARGE: the slim mounting bezel / back box let into the rear quarter panel,
just inboard of the charge door. Everything a driver actually touches lives in
CHARGE_PORT, so this is what is left of the system as its own clickable mesh.
CHARGE_PORT: a flush door panel with a hinge line down its forward edge, a
CCS-style socket carrying two large DC pins below a ring of seven small AC pins,
and a status LED ring around the socket (geometry only - the block keeps its own
color).
OBC: the onboard charger, an AC/DC box on the boot floor behind the pack with
two connector bosses on its forward face.
"""

import bmesh

import common
import layout

from . import _shapes


def build_charge(ctx):
    """CHARGE: the charge-port mounting bezel behind the door."""
    spec = layout.BLOCKS["CHARGE"]
    _shapes.block_material(ctx, "CHARGE")
    bm = bmesh.new()

    _shapes.bevel_box(bm, spec["bezel_size"], spec["bezel_center"],
                      spec["bezel_bevel"], segments=1)

    return ctx.emit_block("CHARGE", bm)


def build_charge_port(ctx):
    """CHARGE_PORT: door, hinge, CCS socket, pins and status LED ring."""
    spec = layout.BLOCKS["CHARGE_PORT"]
    _shapes.block_material(ctx, "CHARGE_PORT")
    bm = bmesh.new()

    # door panel + hinge line
    common.add_box(bm, spec["door_size"], common.trs(spec["door_center"]))
    _shapes.axis_cylinder(bm, spec["hinge_center"], spec["hinge_radius"],
                          spec["hinge_depth"], axis="Z",
                          segments=spec["hinge_segments"])

    # socket body and the status LED ring around it
    _shapes.axis_cylinder(bm, spec["socket_center"], spec["socket_radius"],
                          spec["socket_depth"], axis="X",
                          segments=spec["socket_segments"])
    _shapes.axis_cylinder(bm, spec["led_center"], spec["led_radius"],
                          spec["led_depth"], axis="X",
                          segments=spec["led_segments"], cap_ends=False)

    # CCS face: a ring of small AC pins over two large DC pins
    _shapes.radial_cylinders(bm, spec["ac_count"], spec["ac_ring_radius"],
                             spec["ac_pin_radius"], spec["ac_pin_depth"],
                             center=spec["ac_center"], axis="X",
                             segments=spec["ac_pin_segments"])
    for center in spec["dc_pin_centers"]:
        _shapes.axis_cylinder(bm, center, spec["dc_pin_radius"],
                              spec["dc_pin_depth"], axis="X",
                              segments=spec["dc_pin_segments"])

    return ctx.emit_block("CHARGE_PORT", bm)


def build_obc(ctx):
    """OBC: onboard charger box with two connector bosses, on the boot floor."""
    spec = layout.BLOCKS["OBC"]
    _shapes.block_material(ctx, "OBC")
    bm = bmesh.new()

    _shapes.bevel_box(bm, spec["body_size"], spec["body_center"],
                      spec["body_bevel"], segments=1)
    for center in spec["boss_centers"]:
        _shapes.axis_cylinder(bm, center, spec["boss_radius"],
                              spec["boss_depth"], axis="Y",
                              segments=spec["boss_segments"])

    return ctx.emit_block("OBC", bm)
