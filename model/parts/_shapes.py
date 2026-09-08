"""Detail primitives shared by the internal-subsystem part builders.

Everything here is pure geometry: not a single number that describes the car
lives in this module (those stay in ``layout.py``). Each helper appends to an
existing bmesh in a deterministic vertex order, so ``common.bmesh_to_mesh``
still produces byte-reproducible meshes.
"""

from __future__ import annotations

import math

import bmesh
from mathutils import Matrix, Vector

import common

#: cylinders are built along local Z; these reorient them onto the car axes
AXIS_X = Matrix.Rotation(math.pi / 2.0, 4, "Y")
AXIS_Y = Matrix.Rotation(-math.pi / 2.0, 4, "X")

#: local offset direction used when arraying geometry around an axis
_RADIAL_OFFSET = {
    "X": Vector((0.0, 1.0, 0.0)),
    "Y": Vector((1.0, 0.0, 0.0)),
    "Z": Vector((1.0, 0.0, 0.0)),
}


# --------------------------------------------------------------------------
# materials
# --------------------------------------------------------------------------
def block_material(ctx, block_id):
    """Pre-create ``M_<id>`` with the finish named in ``layout.BLOCKS``.

    ``ctx.block_material`` (used by ``emit_block``) fetches the material by
    name, and ``common.make_material`` returns an existing material unchanged,
    so creating it here first is how a block picks its own metallic/roughness
    without a second material or a change to the shared context. Base color and
    alpha still come from blocks.json, per the contract.
    """
    import layout

    blk = ctx.block(block_id)
    spec = layout.BLOCKS.get(block_id) or {}
    return common.make_material(
        "M_%s" % block_id,
        blk["color"],
        alpha=float(blk.get("alpha", 1.0)),
        roughness=float(spec.get("roughness", 0.45)),
        metallic=float(spec.get("metallic", 0.0)),
    )


# --------------------------------------------------------------------------
# boxes
# --------------------------------------------------------------------------
def boxes(bm, entries):
    """``[(center, size), ...]`` -> axis-aligned boxes."""
    for center, size in entries:
        common.add_box(bm, size, common.trs(center))


def bevel_box(bm, size, center, width, segments=2):
    """A box with every edge rounded off: reads as a cast alloy casing."""
    ret = common.add_box(bm, size, common.trs(center))
    edges = []
    for v in ret["verts"]:
        for e in v.link_edges:
            # a plain list, not a set: iterating a set of BMEdge objects orders
            # by object id, which differs between processes and would make the
            # build non-deterministic.
            if e not in edges:
                edges.append(e)
    if edges and width > 0.0:
        bmesh.ops.bevel(bm, geom=edges, offset=float(width),
                        segments=int(segments), affect="EDGES")
    return ret


def bevel_vertical_edges(bm, verts, width, segments=1):
    """Round only the Z-running edges of a box (a tray, a slab)."""
    edges = []
    for v in verts:
        for e in v.link_edges:
            other = e.other_vert(v)
            if abs(other.co.z - v.co.z) > 1e-6 \
                    and abs(other.co.x - v.co.x) < 1e-6 \
                    and abs(other.co.y - v.co.y) < 1e-6 and e not in edges:
                edges.append(e)
    if edges and width > 0.0:
        bmesh.ops.bevel(bm, geom=edges, offset=float(width),
                        segments=int(segments), affect="EDGES")


# --------------------------------------------------------------------------
# cylinders
# --------------------------------------------------------------------------
def axis_cylinder(bm, center, radius, depth, axis="X", segments=12,
                  cap_ends=True, scale=None):
    """Cylinder centred on ``center`` with its bore along a car axis."""
    rot = {"X": AXIS_X, "Y": AXIS_Y, "Z": None}[axis]
    m = common.trs(center, rot)
    if scale is not None:
        m = m @ Matrix.Diagonal(Vector((scale[0], scale[1], scale[2], 1.0)))
    return common.add_cylinder(bm, radius=radius, depth=depth,
                               segments=int(segments), matrix=m,
                               cap_ends=cap_ends)


def rib_stack(bm, center, offsets, radius, depth, axis="X", segments=12):
    """Thin discs threaded along an axis: motor cooling ribs."""
    cx, cy, cz = center
    step = {"X": (1.0, 0.0, 0.0), "Y": (0.0, 1.0, 0.0), "Z": (0.0, 0.0, 1.0)}[axis]
    for off in offsets:
        c = (cx + step[0] * off, cy + step[1] * off, cz + step[2] * off)
        axis_cylinder(bm, c, radius, depth, axis=axis, segments=segments)


def fin_stack(bm, center, offsets, size, along="Y"):
    """A row of thin slabs: heat-sink fins, radiator fin lines."""
    cx, cy, cz = center
    step = {"X": (1.0, 0.0, 0.0), "Y": (0.0, 1.0, 0.0), "Z": (0.0, 0.0, 1.0)}[along]
    for off in offsets:
        common.add_box(bm, size, common.trs(
            (cx + step[0] * off, cy + step[1] * off, cz + step[2] * off)))


# --------------------------------------------------------------------------
# radial arrays
# --------------------------------------------------------------------------
def _radial_matrix(base, axis, angle, radius):
    offset = _RADIAL_OFFSET[axis] * float(radius)
    return base @ Matrix.Rotation(angle, 4, axis) @ Matrix.Translation(offset)


def radial_boxes(bm, count, radius, size, center=None, axis="X", phase=0.0,
                 base=None):
    """``count`` boxes evenly spaced around ``axis``: rotor vanes, fan blades,
    steering-wheel spokes. ``base`` overrides ``center`` when the whole array
    needs an extra rotation (a tilted steering wheel)."""
    if base is None:
        base = Matrix.Translation(Vector(center or (0.0, 0.0, 0.0)))
    for i in range(int(count)):
        angle = float(phase) + 2.0 * math.pi * i / float(count)
        common.add_box(bm, size, _radial_matrix(base, axis, angle, radius))


def radial_cylinders(bm, count, radius, cyl_radius, depth, center=None,
                     axis="X", phase=0.0, segments=6, base=None):
    """``count`` cylinders ringed around ``axis``, bores parallel to it."""
    if base is None:
        base = Matrix.Translation(Vector(center or (0.0, 0.0, 0.0)))
    bore = {"X": AXIS_X, "Y": AXIS_Y, "Z": Matrix.Identity(4)}[axis]
    for i in range(int(count)):
        angle = float(phase) + 2.0 * math.pi * i / float(count)
        m = _radial_matrix(base, axis, angle, radius) @ bore
        common.add_cylinder(bm, radius=cyl_radius, depth=depth,
                            segments=int(segments), matrix=m)


# --------------------------------------------------------------------------
# torus
# --------------------------------------------------------------------------
def torus(bm, major_radius, minor_radius, major_segments=18, minor_segments=6,
          matrix=None):
    """A parametric torus around local Z.

    ``common.add_torus_by_spin`` builds the same shape with ``bmesh.ops.spin``
    plus ``remove_doubles`` and then picks its own geometry back out with a
    ``bm.verts[n0:]`` slice; that slice stops matching once the bmesh already
    holds cylinder geometry, and the wrong verts get transformed. Writing the
    ring out directly avoids the slice entirely and is deterministic by
    construction.
    """
    major_radius = float(major_radius)
    minor_radius = float(minor_radius)
    major_segments = int(major_segments)
    minor_segments = int(minor_segments)

    rings = []
    for i in range(major_segments):
        theta = 2.0 * math.pi * i / major_segments
        ct, st = math.cos(theta), math.sin(theta)
        ring = []
        for j in range(minor_segments):
            phi = 2.0 * math.pi * j / minor_segments
            r = major_radius + minor_radius * math.cos(phi)
            ring.append(bm.verts.new((r * ct, r * st,
                                      minor_radius * math.sin(phi))))
        rings.append(ring)
    bm.verts.ensure_lookup_table()

    new_verts = [v for ring in rings for v in ring]
    new_faces = []
    for i in range(major_segments):
        r0 = rings[i]
        r1 = rings[(i + 1) % major_segments]
        for j in range(minor_segments):
            k = (j + 1) % minor_segments
            new_faces.append(bm.faces.new((r0[j], r0[k], r1[k], r1[j])))
    bmesh.ops.recalc_face_normals(bm, faces=new_faces)

    if matrix is not None and matrix != Matrix.Identity(4):
        bmesh.ops.transform(bm, matrix=matrix, verts=new_verts)
    return rings


# --------------------------------------------------------------------------
# swept tube
# --------------------------------------------------------------------------
def poly_tube(bm, points, radius, sides=6, caps=True):
    """Sweep an n-gon along a polyline: coolant hoses, cable runs.

    Built vert-by-vert in path order so the result is deterministic; unlike the
    flow tubes this lands directly in the block's own bmesh, which is what keeps
    a block one mesh with one material.
    """
    pts = [Vector((float(p[0]), float(p[1]), float(p[2]))) for p in points]
    if len(pts) < 2:
        raise ValueError("poly_tube needs at least two points")

    sides = int(sides)
    radius = float(radius)
    rings = []
    last = len(pts) - 1
    for i, p in enumerate(pts):
        if i == 0:
            tangent = pts[1] - pts[0]
        elif i == last:
            tangent = pts[last] - pts[last - 1]
        else:
            a = pts[i] - pts[i - 1]
            b = pts[i + 1] - pts[i]
            tangent = (a.normalized() if a.length > 1e-9 else b) \
                + (b.normalized() if b.length > 1e-9 else a)
        if tangent.length < 1e-9:
            tangent = Vector((0.0, 0.0, 1.0))
        rot = tangent.normalized().to_track_quat("Z", "Y").to_matrix().to_4x4()
        ring = []
        for j in range(sides):
            a = 2.0 * math.pi * j / sides
            local = Vector((radius * math.cos(a), radius * math.sin(a), 0.0))
            ring.append(bm.verts.new(p + (rot @ local)))
        rings.append(ring)

    bm.verts.ensure_lookup_table()
    new_faces = []
    for i in range(last):
        r0, r1 = rings[i], rings[i + 1]
        for j in range(sides):
            k = (j + 1) % sides
            new_faces.append(bm.faces.new((r0[j], r0[k], r1[k], r1[j])))
    if caps:
        new_faces.append(bm.faces.new(tuple(reversed(rings[0]))))
        new_faces.append(bm.faces.new(tuple(rings[last])))
    bmesh.ops.recalc_face_normals(bm, faces=new_faces)
    return rings
