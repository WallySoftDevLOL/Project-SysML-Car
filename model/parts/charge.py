"""CHARGE: charge port on the car's left rear quarter.

A flush door panel with a hinge line down its forward edge, a CCS-style socket
carrying two large DC pins below a ring of seven small AC pins, and a status LED
ring around the socket (geometry only - the block keeps its own color).
"""

import bmesh

import common
import layout

from . import _shapes


def build_charge(ctx):
    spec = layout.BLOCKS["CHARGE"]
    _shapes.block_material(ctx, "CHARGE")
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

    return ctx.emit_block("CHARGE", bm)
