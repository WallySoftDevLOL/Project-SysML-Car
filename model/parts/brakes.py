"""BRAKES: four vented rotors, hats and calipers, merged into ONE object.

Each corner is a pair of friction rings with an air gap, twelve radial cooling
vanes bridging that gap, a hat and hub pulled inboard, and a caliper that
bridges over the rotor edge with two pad slots showing. Nothing reaches past
|x| = 0.750 so the wheel rims clear the calipers.
"""

import bmesh

import common
import layout

from . import _shapes


def _corner(bm, spec, center):
    cx, cy, cz = center
    sign = 1.0 if cx >= 0.0 else -1.0
    half_gap = (spec["disc_gap"] + spec["disc_depth"]) / 2.0

    # vented rotor: two friction rings either side of the vane gap
    for side in (1.0, -1.0):
        _shapes.axis_cylinder(bm, (cx + side * half_gap, cy, cz),
                              spec["disc_radius"], spec["disc_depth"],
                              axis="X", segments=spec["disc_segments"])

    # radial cooling vanes inside the gap
    _shapes.radial_boxes(bm, spec["vane_count"], spec["vane_radius"],
                         spec["vane_size"], center=center, axis="X")

    # hat + hub, offset inboard so the outboard rotor face stays clean
    _shapes.axis_cylinder(bm, (cx + sign * spec["hat_x_offset"], cy, cz),
                          spec["hat_radius"], spec["hat_depth"],
                          axis="X", segments=spec["hat_segments"])
    _shapes.axis_cylinder(bm, (cx + sign * spec["hub_x_offset"], cy, cz),
                          spec["hub_radius"], spec["hub_depth"],
                          axis="X", segments=spec["hub_segments"])

    # caliper straddling the top of the rotor: two bridge blocks with the pad
    # slot between them, a pad housing each side, and the pads in the slot
    bridge_size = spec["caliper_bridge_size"]
    for (oy, oz) in spec["caliper_bridge_offsets"]:
        common.add_box(bm, bridge_size, common.trs((cx, cy + oy, cz + oz)))

    sy, sz = spec["caliper_side_offset"]
    for side in (1.0, -1.0):
        common.add_box(bm, spec["caliper_side_size"], common.trs(
            (cx + side * spec["caliper_side_x"], cy + sy, cz + sz)))

    py, pz = spec["caliper_pad_offset"]
    for side in (1.0, -1.0):
        common.add_box(bm, spec["caliper_pad_size"], common.trs(
            (cx + side * spec["caliper_pad_x"], cy + py, cz + pz)))


def build_brakes(ctx):
    spec = layout.BLOCKS["BRAKES"]
    _shapes.block_material(ctx, "BRAKES")
    bm = bmesh.new()
    for center in spec["disc_centers"]:
        _corner(bm, spec, center)
    return ctx.emit_block("BRAKES", bm)
