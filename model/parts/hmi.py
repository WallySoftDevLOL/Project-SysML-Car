"""HMI: the driver's cockpit, merged into ONE object.

A sculpted dashboard section extruded across the car, an instrument binnacle
hood, a tilted landscape touchscreen, four oval air vents, a three-spoke
steering wheel on a column with two stalks, the accelerator and brake pedals in
the driver's footwell, and the gear selector on the console.
"""

import math

import bmesh
from mathutils import Matrix, Vector

import common
import layout

from . import _shapes


def build_hmi(ctx):
    spec = layout.BLOCKS["HMI"]
    _shapes.block_material(ctx, "HMI")
    bm = bmesh.new()

    # sculpted dash. profile_extrude transforms the whole bmesh, so it comes
    # first and its profile carries absolute (y, z) coordinates.
    common.profile_extrude(bm, spec["dash_profile"], spec["dash_width"])

    common.add_box(bm, spec["binnacle_size"], common.trs(spec["binnacle_center"]))

    screen_tilt = Matrix.Rotation(math.radians(spec["screen_tilt_deg"]), 4, "X")
    common.add_box(bm, spec["screen_size"],
                   common.trs(spec["screen_center"], screen_tilt))

    # oval air vents: cylinders squashed by a non-uniform scale
    for center in spec["vent_centers"]:
        _shapes.axis_cylinder(bm, center, spec["vent_radius"],
                              spec["vent_depth"], axis="Y",
                              segments=spec["vent_segments"],
                              scale=spec["vent_scale"])

    # steering wheel: rim, hub, three spokes, all on the tilted wheel plane
    tilt = Matrix.Rotation(math.radians(spec["wheel_tilt_deg"]), 4, "X")
    wheel_base = common.trs(spec["wheel_center"], tilt)
    _shapes.torus(
        bm,
        major_radius=spec["wheel_major_radius"],
        minor_radius=spec["wheel_minor_radius"],
        major_segments=spec["wheel_major_segments"],
        minor_segments=spec["wheel_minor_segments"],
        matrix=wheel_base,
    )
    common.add_cylinder(bm, radius=spec["hub_radius"], depth=spec["hub_depth"],
                        segments=spec["hub_segments"], matrix=wheel_base)
    _shapes.radial_boxes(bm, spec["spoke_count"], spec["spoke_radius"],
                         spec["spoke_size"], axis="Z", base=wheel_base,
                         phase=math.pi / 2.0)

    # steering column from the wheel back into the dash
    start = Vector(spec["wheel_center"])
    end = Vector(spec["column_dash_point"])
    d = end - start
    if d.length > 1e-6:
        rot = d.to_track_quat("Z", "Y").to_matrix().to_4x4()
        common.add_cylinder(
            bm, radius=spec["column_radius"], depth=d.length,
            segments=spec["column_segments"],
            matrix=Matrix.Translation((start + end) / 2.0) @ rot,
        )
    for center in spec["stalk_centers"]:
        _shapes.axis_cylinder(bm, center, spec["stalk_radius"],
                              spec["stalk_depth"], axis="X",
                              segments=spec["stalk_segments"])

    # pedals: thin plates on stalks in the driver's footwell
    pedal_tilt = Matrix.Rotation(math.radians(spec["pedal_tilt_deg"]), 4, "X")
    for center, size in spec["pedals"]:
        common.add_box(bm, size, common.trs(center, pedal_tilt))
    for center in spec["pedal_stalk_centers"]:
        common.add_cylinder(
            bm, radius=spec["pedal_stalk_radius"],
            depth=spec["pedal_stalk_depth"],
            segments=spec["pedal_stalk_segments"],
            matrix=common.trs(center, pedal_tilt),
        )

    # console plinth, selector base and knob
    common.add_box(bm, spec["console_size"], common.trs(spec["console_center"]))
    common.add_box(bm, spec["selector_size"], common.trs(spec["selector_center"]))
    _shapes.axis_cylinder(bm, spec["knob_center"], spec["knob_radius"],
                          spec["knob_depth"], axis="Z",
                          segments=spec["knob_segments"])

    return ctx.emit_block("HMI", bm)
