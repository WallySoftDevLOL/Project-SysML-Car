"""Wheel decor: DECOR_wheel_FL / FR / RL / RR.

Each wheel is one object with three material slots:

0. ``M_DECOR_tire``     - the tire ring (revolved cross-section with a sidewall
   bulge) plus a ring of shallow raised tread blocks.
1. ``M_DECOR_rim_dark`` - the dished rim face, recessed inside the shoulder.
2. ``M_DECOR_rim``      - the outer lip, ten spokes and the centre cap.

The tire is a *ring*, not a solid cylinder, and the rim only occupies the
outboard third of the barrel, so the brake disc at x = +/-0.72 stays visible
from inboard and reads between the spokes.

Every piece is modelled with local +Z pointing outboard, then rotated onto the
car's X axis, so the same numbers serve both sides of the car.
"""

import math

import bmesh
from mathutils import Matrix

import common
import layout

from . import decor_util

#: local +Z -> +X (car-left wheels) and local +Z -> -X (car-right wheels)
OUTBOARD_LEFT = Matrix.Rotation(math.pi / 2.0, 4, "Y")
OUTBOARD_RIGHT = Matrix.Rotation(-math.pi / 2.0, 4, "Y")


def tire_profile():
    """Closed ``(radius, axial)`` cross-section of the tire ring."""
    return [(float(r), float(a)) for (r, a) in layout.TIRE_PROFILE]


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


def _build_tire(bm):
    _spin_ring(bm, tire_profile(), layout.SEG_WHEEL)
    decor_util.ring_of_boxes(bm, layout.TREAD_BLOCK_COUNT,
                             layout.TREAD_BLOCK_RADIUS,
                             layout.TREAD_BLOCK_SIZE, 0.0)


def _build_rim_face(bm):
    """The dark inner barrel plus the hub flange the spokes land on.

    A revolved rectangle, not a capped cylinder: the wheel face stays open so
    the brake disc reads between the spokes.
    """
    _spin_ring(bm, layout.RIM_BARREL_PROFILE, layout.RIM_SEGMENTS)
    flange_in = float(layout.HUB_FLANGE_INNER_X)
    flange_out = float(layout.HUB_FLANGE_OUTER_X)
    _cone(bm, layout.HUB_FLANGE_RADIUS, layout.HUB_FLANGE_RADIUS,
          flange_out - flange_in, (flange_in + flange_out) / 2.0,
          layout.HUB_FLANGE_SEGMENTS)


def _build_rim_bright(bm):
    """Outer lip, spokes and centre cap."""
    _spin_ring(bm, layout.RIM_LIP_PROFILE, layout.RIM_SEGMENTS)

    hub_in = float(layout.HUB_INNER_X)
    hub_out = float(layout.HUB_OUTER_X)
    _cone(bm, layout.HUB_RADIUS, layout.HUB_RADIUS,
          hub_out - hub_in, (hub_in + hub_out) / 2.0, layout.HUB_SEGMENTS)

    r_in = float(layout.SPOKE_INNER_RADIUS)
    r_out = float(layout.SPOKE_OUTER_RADIUS)
    spoke_z = float(layout.SPOKE_X)
    size = (r_out - r_in, float(layout.SPOKE_WIDTH), float(layout.SPOKE_THICKNESS))
    count = int(layout.SPOKE_COUNT)
    for i in range(count):
        angle = 2.0 * math.pi * i / count
        matrix = (Matrix.Rotation(angle, 4, "Z")
                  @ Matrix.Translation(((r_in + r_out) / 2.0, 0.0, spoke_z)))
        common.add_box(bm, size, matrix)


def build_wheels(ctx):
    tire_mat = common.make_material("M_DECOR_tire", layout.COLOR_TIRE,
                                    alpha=1.0, roughness=0.85, metallic=0.0)
    dark_mat = common.make_material("M_DECOR_rim_dark", layout.COLOR_RIM_DARK,
                                    alpha=1.0, roughness=0.55, metallic=0.35)
    rim_mat = common.make_material("M_DECOR_rim", layout.COLOR_RIM,
                                   alpha=1.0, roughness=0.32, metallic=0.75)

    objs = []
    for name in sorted(layout.WHEELS):
        center = layout.WHEELS[name]
        outboard = OUTBOARD_LEFT if center[0] >= 0.0 else OUTBOARD_RIGHT
        placement = common.trs(center, outboard)

        parts = []
        for builder, material in ((_build_tire, tire_mat),
                                  (_build_rim_face, dark_mat),
                                  (_build_rim_bright, rim_mat)):
            bm = bmesh.new()
            builder(bm)
            bmesh.ops.transform(bm, matrix=placement, verts=bm.verts[:])
            parts.append((bm, material))

        objs.append(decor_util.emit_multi_decor(
            ctx, name, parts, sysml_name=name.replace("DECOR_", "")))
    return objs
