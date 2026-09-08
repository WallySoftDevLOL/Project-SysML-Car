"""Wheel decor: DECOR_wheel_FL / FR / RL / RR.

Each wheel is one object: a tire revolved from a rounded-shoulder cross-section
plus a dished rim (face cone, hub cap, raised spokes). The tire is a *ring*, not
a solid cylinder, and the rim only occupies the outboard third of the barrel, so
the brake disc at x = +/-0.72 stays visible from inboard and through the shell.

Every piece is modelled with local +Z pointing outboard, then rotated onto the
car's X axis, so the same numbers serve both sides of the car.
"""

import math

import bmesh
from mathutils import Matrix

import common
import layout

#: local +Z -> +X (car-left wheels) and local +Z -> -X (car-right wheels)
OUTBOARD_LEFT = Matrix.Rotation(math.pi / 2.0, 4, "Y")
OUTBOARD_RIGHT = Matrix.Rotation(-math.pi / 2.0, 4, "Y")


def tire_profile():
    """Closed (radius, axial) cross-section of the tire ring.

    Inboard face -> rounded inboard shoulder -> tread -> rounded outboard
    shoulder -> outboard face -> back down the inner wall.
    """
    r_out = float(layout.WHEEL_RADIUS)
    r_in = float(layout.TIRE_INNER_RADIUS)
    half = float(layout.WHEEL_WIDTH) / 2.0
    sh = float(layout.TIRE_SHOULDER_RADIUS)
    segs = int(layout.TIRE_SHOULDER_SEGMENTS)

    points = [(r_in, -half), (r_out - sh, -half)]
    for i in range(1, segs + 1):                      # inboard shoulder
        a = -math.pi / 2.0 + (math.pi / 2.0) * i / segs
        points.append((r_out - sh + sh * math.cos(a), -half + sh + sh * math.sin(a)))
    points.append((r_out, half - sh))                 # tread
    for i in range(1, segs + 1):                      # outboard shoulder
        a = (math.pi / 2.0) * i / segs
        points.append((r_out - sh + sh * math.cos(a), half - sh + sh * math.sin(a)))
    points.append((r_in, half))
    return points


def _spin_ring(bm, profile_rz, segments):
    """Revolve a closed (radius, axial) profile around the local Z axis."""
    count = len(profile_rz)
    verts = [bm.verts.new((float(r), 0.0, float(z))) for (r, z) in profile_rz]
    bm.verts.ensure_lookup_table()
    edges = [bm.edges.new((verts[i], verts[(i + 1) % count])) for i in range(count)]

    segments = int(segments)
    step = 2.0 * math.pi / segments
    bmesh.ops.spin(
        bm, geom=list(verts) + list(edges), cent=(0.0, 0.0, 0.0),
        axis=(0.0, 0.0, 1.0), dvec=(0.0, 0.0, 0.0),
        angle=step * segments, steps=segments,
        use_duplicate=False, use_merge=False,
    )
    # the seam ring is duplicated by the full-turn spin; merge before anything
    # else joins this bmesh
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])


def _cone(bm, radius1, radius2, depth, z_center, segments):
    """Truncated cone along local Z; ``radius1`` is the inboard (-Z) end."""
    return bmesh.ops.create_cone(
        bm, cap_ends=True, cap_tris=False, segments=int(segments),
        radius1=float(radius1), radius2=float(radius2), depth=float(depth),
        matrix=common.trs((0.0, 0.0, float(z_center))), calc_uvs=False,
    )


def _add_rim(bm):
    """Dished face + hub cap + raised spokes, all outboard of the axle."""
    inner_x = float(layout.RIM_DISH_INNER_X)
    outer_x = float(layout.RIM_DISH_OUTER_X)
    _cone(bm, layout.RIM_DISH_INNER_RADIUS, layout.RIM_DISH_OUTER_RADIUS,
          outer_x - inner_x, (inner_x + outer_x) / 2.0, layout.RIM_SEGMENTS)

    hub_in = float(layout.HUB_INNER_X)
    hub_out = float(layout.HUB_OUTER_X)
    _cone(bm, layout.HUB_RADIUS, layout.HUB_RADIUS,
          hub_out - hub_in, (hub_in + hub_out) / 2.0, layout.HUB_SEGMENTS)

    r_in = float(layout.SPOKE_INNER_RADIUS)
    r_out = float(layout.SPOKE_OUTER_RADIUS)
    spoke_z = outer_x + float(layout.SPOKE_THICKNESS) / 2.0
    size = (r_out - r_in, float(layout.SPOKE_WIDTH), float(layout.SPOKE_THICKNESS))
    count = int(layout.SPOKE_COUNT)
    for i in range(count):
        angle = 2.0 * math.pi * i / count
        matrix = (Matrix.Rotation(angle, 4, "Z")
                  @ Matrix.Translation(((r_in + r_out) / 2.0, 0.0, spoke_z)))
        common.add_box(bm, size, matrix)


def build_wheels(ctx):
    mat = common.make_material("M_DECOR_tire", layout.COLOR_TIRE,
                               alpha=1.0, roughness=0.85, metallic=0.0)
    profile = tire_profile()
    objs = []
    for name in sorted(layout.WHEELS):
        center = layout.WHEELS[name]
        outboard = OUTBOARD_LEFT if center[0] >= 0.0 else OUTBOARD_RIGHT
        bm = bmesh.new()
        _spin_ring(bm, profile, layout.SEG_WHEEL)
        _add_rim(bm)
        bmesh.ops.transform(bm, matrix=common.trs(center, outboard),
                            verts=bm.verts[:])
        objs.append(ctx.emit_decor(name, bm, mat,
                                   sysml_name=name.replace("DECOR_", "")))
    return objs
