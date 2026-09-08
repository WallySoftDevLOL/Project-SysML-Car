"""VEH shell and the non-clickable body decor (canopy, seats, console).

The shell is a single YZ silhouette extruded across X
(``common.profile_extrude``) and then sculpted in place:

* ``_width_taper``  - piecewise-linear x scale by z: side-skirt undercut low
  down, full width through the flanks, a two-segment shoulder taper above the
  belt line (the tumblehome).
* ``_arch_flare``   - a cosine bulge in |x| around each axle, so the wheel
  arches flare and the rear quarter reads as a haunch.

The wheel arches are still semicircular notches cut straight into the
silhouette, so no boolean ever runs and the triangle count stays predictable.

``side_x`` exposes the same two functions to the exterior-trim builder, which
is how the crease, rocker and door-seam strips end up hugging the flank.
"""

import math

import bmesh
from mathutils import Matrix

import common
import layout

from . import decor_util


def _bevel(obj, width, segments, angle_deg):
    """Angle-limited bevel. ``export_apply`` bakes it into the glb."""
    mod = obj.modifiers.new(name="Bevel", type="BEVEL")
    mod.width = float(width)
    mod.segments = int(segments)
    mod.limit_method = "ANGLE"
    mod.angle_limit = math.radians(float(angle_deg))
    return mod


def _principled(mat):
    for node in mat.node_tree.nodes:
        if node.type == "BSDF_PRINCIPLED":
            return node
    return None


# --------------------------------------------------------------------------
# silhouette
# --------------------------------------------------------------------------
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
    for entry in spec["profile_bottom"]:
        if entry[0] == "arch":
            points.extend(_arch_arc(float(entry[1]), spec["arch_z"],
                                    spec["arch_radius"], spec["underbody_z"],
                                    spec["arch_segments"]))
        else:
            points.append((float(entry[0]), float(entry[1])))
    return points


def width_scale_at(z, breakpoints=None):
    """Piecewise-linear x scale at height ``z``, clamped outside the range."""
    if breakpoints is None:
        breakpoints = layout.BLOCKS["VEH"].get("width_taper") or []
    points = sorted((float(bz), float(s)) for (bz, s) in breakpoints)
    if not points:
        return 1.0
    if z <= points[0][0]:
        return points[0][1]
    for (z0, s0), (z1, s1) in zip(points, points[1:]):
        if z <= z1:
            return s0 + (s1 - s0) * (z - z0) / (z1 - z0)
    return points[-1][1]


def flare_at(y, z, flares=None):
    """Extra |x| from the wheel-arch flare / rear haunch at ``(y, z)``."""
    if flares is None:
        flares = layout.BLOCKS["VEH"].get("arch_flare") or []
    total = 0.0
    for (y_center, y_span, z_top, extra) in flares:
        dy = abs(float(y) - float(y_center)) / float(y_span)
        if dy >= 1.0:
            continue
        window_y = 0.5 * (1.0 + math.cos(math.pi * dy))
        if z >= float(z_top):
            continue
        fade = 0.18
        if z > float(z_top) - fade:
            window_z = (float(z_top) - float(z)) / fade
        else:
            window_z = 1.0
        total += float(extra) * window_y * window_z
    return total


def side_x(y, z, proud=0.0):
    """|x| of the shell's flank at ``(y, z)``, plus ``proud`` metres outward."""
    spec = layout.BLOCKS["VEH"]
    half = float(spec["width"]) / 2.0
    return half * width_scale_at(z) + flare_at(y, z) + float(proud)


def _width_taper(bm, breakpoints):
    if not breakpoints:
        return
    for vert in bm.verts:
        vert.co.x *= width_scale_at(vert.co.z, breakpoints)


def _arch_flare(bm, flares):
    if not flares:
        return
    for vert in bm.verts:
        extra = flare_at(vert.co.y, vert.co.z, flares)
        if extra:
            vert.co.x += math.copysign(extra, vert.co.x)


# --------------------------------------------------------------------------
# builders
# --------------------------------------------------------------------------
def _subdivide(bm, cuts):
    """Extra resolution on the flanks so the taper reads as a curved surface.

    ``profile_extrude`` puts vertices only on the outline, so a z-driven taper
    applied to that alone would fold the flat side panel about a few long
    triangles. One round of subdivision gives the tumblehome something to bend.
    """
    cuts = int(cuts)
    if cuts > 0:
        bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=cuts,
                                  use_grid_fill=False)


def build_veh(ctx):
    """VEH: translucent x-ray shell (alpha 0.35 comes from blocks.json)."""
    spec = layout.BLOCKS["VEH"]
    bm = bmesh.new()
    common.profile_extrude(bm, body_profile(spec), spec["width"])
    _subdivide(bm, spec.get("side_subdivide_cuts") or 0)
    _width_taper(bm, spec.get("width_taper") or [])
    _arch_flare(bm, spec.get("arch_flare") or [])
    obj = ctx.emit_block("VEH", bm)

    # glass-over-paint: the viewer honours metallic / roughness from the glb
    bsdf = _principled(obj.data.materials[0])
    if bsdf is not None:
        if "metallic" in spec and bsdf.inputs.get("Metallic") is not None:
            bsdf.inputs["Metallic"].default_value = float(spec["metallic"])
        if "roughness" in spec and bsdf.inputs.get("Roughness") is not None:
            bsdf.inputs["Roughness"].default_value = float(spec["roughness"])

    _bevel(obj, spec["bevel_width"], spec["bevel_segments"],
           spec["bevel_angle_deg"])
    return obj


def build_canopy(ctx):
    """DECOR_canopy: glass panels (slot 0) plus opaque pillars (slot 1)."""
    spec = layout.CANOPY
    glass_mat = common.make_material(
        "M_DECOR_glass", layout.COLOR_GLASS, alpha=layout.ALPHA_GLASS,
        roughness=float(spec.get("glass_roughness", 0.05)), metallic=0.0,
    )
    pillar_mat = common.make_material(
        "M_DECOR_pillar", layout.COLOR_TRIM, alpha=1.0,
        roughness=0.35, metallic=0.2,
    )

    glass = bmesh.new()
    decor_util.boxes(glass, spec["glass"])
    pillars = bmesh.new()
    decor_util.boxes(pillars, spec["pillars"])

    return [decor_util.emit_multi_decor(
        ctx, "DECOR_canopy", [(glass, glass_mat), (pillars, pillar_mat)],
        sysml_name="Canopy")]


def build_seats(ctx):
    """DECOR_console / DECOR_seat_L / _R / _rear: bolstered cushions + backs."""
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
