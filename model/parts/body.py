"""VEH shell and the non-clickable body decor (canopy, seats).

The shell and the canopy are both a single YZ silhouette extruded across X
(``common.profile_extrude``) plus an angle-limited bevel modifier. The wheel
arches are semicircular notches cut straight into the shell silhouette, so no
boolean ever runs and the triangle count stays predictable.
"""

import math

import bmesh
from mathutils import Matrix

import common
import layout


def _bevel(obj, width, segments, angle_deg):
    """Angle-limited bevel. ``export_apply`` bakes it into the glb."""
    mod = obj.modifiers.new(name="Bevel", type="BEVEL")
    mod.width = float(width)
    mod.segments = int(segments)
    mod.limit_method = "ANGLE"
    mod.angle_limit = math.radians(float(angle_deg))
    return mod


def _arch_arc(center_y, arch_z, radius, underbody_z, segments):
    """Upper arc of a wheel-arch circle, from its +Y lip round to its -Y lip.

    Both ends land exactly on the underbody line, so the arc drops into the
    silhouette as a notch without leaving a step.
    """
    start = math.asin((underbody_z - arch_z) / radius)
    span = (math.pi - start) - start
    points = []
    for i in range(segments + 1):
        angle = start + span * i / segments
        points.append((center_y + radius * math.cos(angle),
                       arch_z + radius * math.sin(angle)))
    return points


def body_profile(spec):
    """Closed YZ silhouette: roofline nose -> tail, then the notched underbody."""
    points = [(float(y), float(z)) for (y, z) in spec["profile_top"]]
    for center_y in spec["arch_centers_y"]:
        points.extend(_arch_arc(center_y, spec["arch_z"], spec["arch_radius"],
                                spec["underbody_z"], spec["arch_segments"]))
    return points


def _width_taper(bm, breakpoints):
    """Scale x by a piecewise-linear function of z, clamped outside the range.

    Cheap tumblehome: the extrusion keeps its silhouette but loses the
    slab-sided look. Side faces stay planar because the scaling is symmetric
    about x = 0, and the caps are already triangulated.
    """
    points = sorted((float(z), float(s)) for (z, s) in breakpoints)
    if not points:
        return

    def scale_at(z):
        if z <= points[0][0]:
            return points[0][1]
        for (z0, s0), (z1, s1) in zip(points, points[1:]):
            if z <= z1:
                return s0 + (s1 - s0) * (z - z0) / (z1 - z0)
        return points[-1][1]

    for vert in bm.verts:
        vert.co.x *= scale_at(vert.co.z)


def build_veh(ctx):
    """VEH: translucent x-ray shell (alpha 0.35 comes from blocks.json)."""
    spec = layout.BLOCKS["VEH"]
    bm = bmesh.new()
    common.profile_extrude(bm, body_profile(spec), spec["width"])
    _width_taper(bm, spec.get("width_taper") or [])
    obj = ctx.emit_block("VEH", bm)
    _bevel(obj, spec["bevel_width"], spec["bevel_segments"],
           spec["bevel_angle_deg"])
    return obj


def build_canopy(ctx):
    """DECOR_canopy: greenhouse glass volume sitting on the roofline."""
    mat = common.make_material(
        "M_DECOR_glass", layout.COLOR_GLASS, alpha=layout.ALPHA_GLASS,
        roughness=0.1, metallic=0.0,
    )
    spec = layout.CANOPY
    bm = bmesh.new()
    common.profile_extrude(bm, [(float(y), float(z)) for (y, z) in spec["profile"]],
                           spec["width"])
    obj = ctx.emit_decor("DECOR_canopy", bm, mat, sysml_name="Canopy")
    _bevel(obj, spec["bevel_width"], spec["bevel_segments"],
           spec["bevel_angle_deg"])
    return [obj]


def build_seats(ctx):
    """DECOR_seat_L / _R / _rear: cushion + tilted backrest (+ headrest)."""
    mat = common.make_material("M_DECOR_seat", layout.COLOR_SEAT,
                               alpha=1.0, roughness=0.8, metallic=0.0)
    objs = []
    for name in sorted(layout.SEATS):
        bm = bmesh.new()
        for center, size, tilt_deg in layout.SEATS[name]:
            rotation = None
            if tilt_deg:
                # negative about X leans the top of the box toward the tail
                rotation = Matrix.Rotation(-math.radians(float(tilt_deg)), 4, "X")
            common.add_box(bm, size, common.trs(center, rotation))
        objs.append(ctx.emit_decor(name, bm, mat,
                                   sysml_name=name.replace("DECOR_", "")))
    return objs
