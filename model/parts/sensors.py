"""SENSORS, WHEEL_SENSOR and FUSION.

SENSORS: the fixed sensing set merged into ONE object - a front radar module
behind the fascia, a windshield camera housing at the top of the glass, two
ultrasonic discs in each bumper, and a rear camera puck.
WHEEL_SENSOR: the four wheel-speed sensors with their short cable stubs, its own
clickable block.
FUSION: the sensor-fusion module, a flat box with one connector on the tunnel
beside the vehicle controller.
"""

import bmesh

import common
import layout

from . import _shapes


def build_sensors(ctx):
    spec = layout.BLOCKS["SENSORS"]
    _shapes.block_material(ctx, "SENSORS")
    bm = bmesh.new()

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


def build_wheel_sensor(ctx):
    """WHEEL_SENSOR: one puck plus an inboard cable stub at each wheel."""
    spec = layout.BLOCKS["WHEEL_SENSOR"]
    _shapes.block_material(ctx, "WHEEL_SENSOR")
    bm = bmesh.new()

    stub_dx = spec["stub_x_offset"]
    for (px, py, pz) in spec["puck_centers"]:
        sign = 1.0 if px >= 0.0 else -1.0
        _shapes.axis_cylinder(bm, (px, py, pz), spec["puck_radius"],
                              spec["puck_depth"], axis="X",
                              segments=spec["puck_segments"])
        _shapes.axis_cylinder(bm, (px + sign * stub_dx, py, pz),
                              spec["stub_radius"], spec["stub_depth"],
                              axis="X", segments=spec["stub_segments"])

    return ctx.emit_block("WHEEL_SENSOR", bm)


def build_fusion(ctx):
    """FUSION: flat sensor-fusion module with a connector, on the tunnel."""
    spec = layout.BLOCKS["FUSION"]
    _shapes.block_material(ctx, "FUSION")
    bm = bmesh.new()

    _shapes.bevel_box(bm, spec["body_size"], spec["body_center"],
                      spec["body_bevel"], segments=1)
    common.add_box(bm, spec["connector_size"],
                   common.trs(spec["connector_center"]))

    return ctx.emit_block("FUSION", bm)
