"""BRAKES (rotors), BRAKE_ACT (calipers) and BRAKE_CTRL (ABS/ESC module).

BRAKES: four vented rotors merged into ONE object. Each corner is a pair of
friction rings with an air gap, twelve radial cooling vanes bridging that gap,
and a hat and hub pulled inboard.
BRAKE_ACT: the four calipers, each bridging over the rotor edge with two pad
slots showing. Its own clickable block, so its own mesh and material. Nothing
reaches past |x| = 0.750 so the wheel rims clear the calipers.
BRAKE_CTRL: the ABS / ESC hydraulic modulator in the front bay on the car's
left, a small block with six brake-line stubs on top.
"""

import bmesh

import common
import layout

from . import _shapes


def _rotor(bm, spec, center):
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


def _caliper(bm, spec, center):
    """One caliper: two bridge blocks with the pad slot between them, a pad
    housing each side, and the pads showing through the slot."""
    cx, cy, cz = center

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
    """BRAKES: four vented rotors with their hats and hubs."""
    spec = layout.BLOCKS["BRAKES"]
    _shapes.block_material(ctx, "BRAKES")
    bm = bmesh.new()
    for center in spec["disc_centers"]:
        _rotor(bm, spec, center)
    return ctx.emit_block("BRAKES", bm)


def build_brake_act(ctx):
    """BRAKE_ACT: the four calipers straddling the rotors."""
    spec = layout.BLOCKS["BRAKE_ACT"]
    _shapes.block_material(ctx, "BRAKE_ACT")
    bm = bmesh.new()
    for center in spec["caliper_centers"]:
        _caliper(bm, spec, center)
    return ctx.emit_block("BRAKE_ACT", bm)


def build_brake_ctrl(ctx):
    """BRAKE_CTRL: ABS / ESC hydraulic modulator with brake-line stubs."""
    spec = layout.BLOCKS["BRAKE_CTRL"]
    _shapes.block_material(ctx, "BRAKE_CTRL")
    bm = bmesh.new()

    _shapes.bevel_box(bm, spec["body_size"], spec["body_center"],
                      spec["body_bevel"], segments=1)

    cx, cy, _cz = spec["body_center"]
    stub_z = spec["stub_z"]
    for (ox, oy) in spec["stub_offsets"]:
        _shapes.axis_cylinder(bm, (cx + ox, cy + oy, stub_z),
                              spec["stub_radius"], spec["stub_depth"],
                              axis="Z", segments=spec["stub_segments"])

    return ctx.emit_block("BRAKE_CTRL", bm)
