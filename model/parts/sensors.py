"""SENSORS: the whole sensing set merged into ONE object.

Four wheel-speed sensors with short cable stubs, a front radar module behind the
fascia, a windshield camera housing at the top of the glass, two ultrasonic
discs in each bumper, and a rear camera puck.
"""

import bmesh

import common
import layout

from . import _shapes


def build_sensors(ctx):
    spec = layout.BLOCKS["SENSORS"]
    _shapes.block_material(ctx, "SENSORS")
    bm = bmesh.new()

    # wheel-speed sensors: puck + a cable stub running inboard
    stub_dx = spec["stub_x_offset"]
    for (px, py, pz) in spec["puck_centers"]:
        sign = 1.0 if px >= 0.0 else -1.0
        _shapes.axis_cylinder(bm, (px, py, pz), spec["puck_radius"],
                              spec["puck_depth"], axis="X",
                              segments=spec["puck_segments"])
        _shapes.axis_cylinder(bm, (px + sign * stub_dx, py, pz),
                              spec["stub_radius"], spec["stub_depth"],
                              axis="X", segments=spec["stub_segments"])

    # front radar behind the fascia
    common.add_box(bm, spec["radar_size"], common.trs(spec["radar_center"]))
    common.add_box(bm, spec["radar_face_size"],
                   common.trs(spec["radar_face_center"]))

    # windshield camera housing at the top of the glass
    common.add_box(bm, spec["camera_size"], common.trs(spec["camera_center"]))
    _shapes.axis_cylinder(bm, spec["camera_lens_center"],
                          spec["camera_lens_radius"], spec["camera_lens_depth"],
                          axis="Y", segments=spec["camera_lens_segments"])

    # ultrasonic discs, two per bumper
    for center in spec["ultrasonic_centers"]:
        _shapes.axis_cylinder(bm, center, spec["ultrasonic_radius"],
                              spec["ultrasonic_depth"], axis="Y",
                              segments=spec["ultrasonic_segments"])

    # rear camera puck
    _shapes.axis_cylinder(bm, spec["rear_camera_center"],
                          spec["rear_camera_radius"],
                          spec["rear_camera_depth"], axis="Y",
                          segments=spec["rear_camera_segments"])

    return ctx.emit_block("SENSORS", bm)
