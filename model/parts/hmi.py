"""HMI: dashboard, instrument binnacle, steering wheel and centre screen."""

import math

import bmesh
from mathutils import Matrix, Vector

import common
import layout

SEG_WHEEL_MAJOR = 20
SEG_WHEEL_MINOR = 6
SEG_COLUMN = 8


def build_hmi(ctx):
    spec = layout.BLOCKS["HMI"]
    bm = bmesh.new()

    common.add_box(bm, spec["size"], common.trs(spec["center"]))
    common.add_box(bm, spec["binnacle_size"], common.trs(spec["binnacle_center"]))
    common.add_box(bm, spec["screen_size"], common.trs(spec["screen_center"]))

    tilt = Matrix.Rotation(math.radians(spec["wheel_tilt_deg"]), 4, "X")
    common.add_torus_by_spin(
        bm,
        major_radius=spec["wheel_major_radius"],
        minor_radius=spec["wheel_minor_radius"],
        major_segments=SEG_WHEEL_MAJOR,
        minor_segments=SEG_WHEEL_MINOR,
        matrix=common.trs(spec["wheel_center"], tilt),
    )

    # steering column: a thin stub grounding the wheel to the dash so it
    # doesn't read as floating in space.
    start = Vector(spec["wheel_center"])
    end = Vector(spec["column_dash_point"])
    d = end - start
    length = d.length
    if length > 1e-6:
        mid = (start + end) / 2.0
        rot = d.to_track_quat("Z", "Y").to_matrix().to_4x4()
        common.add_cylinder(
            bm, radius=spec["column_radius"], depth=length, segments=SEG_COLUMN,
            matrix=Matrix.Translation(mid) @ rot,
        )

    return ctx.emit_block("HMI", bm)
