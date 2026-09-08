"""Helpers shared by the exterior / structural decor builders.

Two things live here that ``common`` deliberately does not provide:

* ``emit_multi_decor`` - a decor object whose mesh carries more than one
  material slot (glass + opaque pillars, dark rim face + silver spokes). Blocks
  still get exactly one material; only ``DECOR_*`` objects use this.
* small geometry conveniences (a bar between two points, a helix, mirroring a
  ``+X`` authored box onto ``-X``) that several decor modules need.

Determinism: each part is canonicalised with ``common.bmesh_to_mesh`` (which
sorts verts and faces by geometry) before the parts are concatenated in the
order they were passed, so two builds produce identical meshes.
"""

from __future__ import annotations

import math

import bmesh
import bpy
from mathutils import Matrix, Vector

import common

_TMP_MESH = "TMP_decor_canonical"


# --------------------------------------------------------------------------
# multi-slot decor objects
# --------------------------------------------------------------------------
def _canonical(bm):
    """(verts, faces) for ``bm`` in ``common``'s canonical order. Frees ``bm``."""
    mesh = bpy.data.meshes.new(_TMP_MESH)
    try:
        common.bmesh_to_mesh(bm, mesh)
        verts = [tuple(v.co) for v in mesh.vertices]
        faces = [list(p.vertices) for p in mesh.polygons]
    finally:
        bm.free()
        bpy.data.meshes.remove(mesh)
    return verts, faces


def emit_multi_decor(ctx, name, parts, sysml_name=None, parent_id="VEH"):
    """Emit one ``DECOR_*`` object from ``[(bmesh, material), ...]``.

    Slot order follows ``parts``; slot 0 is the object's primary material (the
    one the contract's alpha rules look at). Every bmesh is freed.
    """
    verts = []
    faces = []
    slot_of = []
    materials = []
    for slot, (bm, material) in enumerate(parts):
        part_verts, part_faces = _canonical(bm)
        offset = len(verts)
        verts.extend(part_verts)
        faces.extend([i + offset for i in face] for face in part_faces)
        slot_of.extend([slot] * len(part_faces))
        materials.append(material)

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    for material in materials:
        mesh.materials.append(material)
    for polygon, slot in zip(mesh.polygons, slot_of):
        polygon.material_index = slot

    obj = bpy.data.objects.new(name, mesh)
    if obj.name != name:
        raise RuntimeError("duplicate object name %r (Blender renamed it to %r)"
                           % (name, obj.name))
    bpy.context.scene.collection.objects.link(obj)
    obj.parent = ctx.root
    obj.matrix_parent_inverse = ctx.root.matrix_world.inverted()
    common.set_extras(
        obj,
        sysml_id=name,
        sysml_kind="Decor",
        sysml_name=sysml_name or name.replace("DECOR_", ""),
        sysml_parent=parent_id,
    )
    ctx.objects.append(obj)
    ctx.kinds[obj.name] = "Decor"
    return obj


# --------------------------------------------------------------------------
# geometry conveniences
# --------------------------------------------------------------------------
def box(bm, center, size, rot_deg=(0.0, 0.0, 0.0)):
    """Axis-aligned box, optionally rotated about its own center (XYZ order)."""
    rot = None
    rx, ry, rz = (math.radians(float(a)) for a in rot_deg)
    if rx or ry or rz:
        rot = Matrix.Identity(4)
        if rz:
            rot = rot @ Matrix.Rotation(rz, 4, "Z")
        if ry:
            rot = rot @ Matrix.Rotation(ry, 4, "Y")
        if rx:
            rot = rot @ Matrix.Rotation(rx, 4, "X")
    return common.add_box(bm, size, common.trs(center, rot))


def boxes(bm, entries):
    """``[(center, size)]`` or ``[(center, size, rot_x_deg)]``."""
    for entry in entries:
        if len(entry) == 3:
            center, size, rot_x = entry
            box(bm, center, size, (rot_x, 0.0, 0.0))
        else:
            center, size = entry
            box(bm, center, size)


def mirrored(entries):
    """``+X`` authored boxes, followed by their ``-X`` mirror images."""
    out = []
    for entry in entries:
        center, size = entry[0], entry[1]
        rest = tuple(entry[2:])
        out.append((tuple(center), tuple(size)) + rest)
        out.append(((-center[0], center[1], center[2]), tuple(size)) + rest)
    return out


def bar_between(bm, p0, p1, width, height):
    """Box whose long axis runs from ``p0`` to ``p1``."""
    p0 = Vector(p0)
    p1 = Vector(p1)
    direction = p1 - p0
    length = direction.length
    if length <= 1e-9:
        return None
    rot = direction.to_track_quat("Y", "Z").to_matrix().to_4x4()
    matrix = Matrix.Translation((p0 + p1) / 2.0) @ rot
    return common.add_box(bm, (float(width), length, float(height)), matrix)


def tube_between(bm, p0, p1, radius, segments):
    """Cylinder whose axis runs from ``p0`` to ``p1``."""
    p0 = Vector(p0)
    p1 = Vector(p1)
    direction = p1 - p0
    length = direction.length
    if length <= 1e-9:
        return None
    rot = direction.to_track_quat("Z", "Y").to_matrix().to_4x4()
    matrix = Matrix.Translation((p0 + p1) / 2.0) @ rot
    return common.add_cylinder(bm, radius, length, segments=segments, matrix=matrix)


def helix(bm, p0, p1, coil_radius, wire_radius, turns, steps_per_turn,
          profile_segments):
    """Coil spring: a small polygon swept along a helix from ``p0`` to ``p1``.

    Built along local +Z then rotated onto the ``p0 -> p1`` axis, so the same
    numbers serve an upright rear spring and a raked front strut.
    """
    p0 = Vector(p0)
    p1 = Vector(p1)
    axis = p1 - p0
    height = axis.length
    if height <= 1e-9:
        return

    turns = int(turns)
    steps = int(turns) * int(steps_per_turn)
    profile_segments = int(profile_segments)

    def ring(step):
        angle = 2.0 * math.pi * step / float(steps_per_turn)
        z = height * step / float(steps)
        cx = coil_radius * math.cos(angle)
        cy = coil_radius * math.sin(angle)
        # the wire cross-section lies in the plane spanned by the radial
        # direction and Z; that keeps the coil from self-intersecting
        rx, ry = math.cos(angle), math.sin(angle)
        verts = []
        for i in range(profile_segments):
            a = 2.0 * math.pi * i / profile_segments
            wr = wire_radius * math.cos(a)
            wz = wire_radius * math.sin(a)
            verts.append(bm.verts.new((cx + rx * wr, cy + ry * wr, z + wz)))
        return verts

    rings = [ring(s) for s in range(steps + 1)]
    bm.verts.ensure_lookup_table()
    new_verts = [v for r in rings for v in r]
    for a, b in zip(rings, rings[1:]):
        for i in range(profile_segments):
            j = (i + 1) % profile_segments
            bm.faces.new((a[i], a[j], b[j], b[i]))
    # caps
    bm.faces.new(tuple(reversed(rings[0])))
    bm.faces.new(tuple(rings[-1]))

    rot = axis.to_track_quat("Z", "Y").to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=Matrix.Translation(p0) @ rot, verts=new_verts)
    owned = set(new_verts)
    faces = [f for f in bm.faces if owned.issuperset(f.verts)]
    bmesh.ops.recalc_face_normals(bm, faces=faces)


def ring_of_boxes(bm, count, radius, size, axis_offset, matrix=None):
    """``count`` boxes evenly spaced around local Z at ``radius``.

    ``size`` is ``(tangential, axial, radial)``; the boxes are oriented so their
    radial axis points outward, which is what a tread block wants.
    """
    count = int(count)
    tangential, axial, radial = (float(v) for v in size)
    for i in range(count):
        angle = 2.0 * math.pi * i / count
        placement = (Matrix.Rotation(angle, 4, "Z")
                     @ Matrix.Translation((float(radius), 0.0, float(axis_offset))))
        if matrix is not None:
            placement = matrix @ placement
        common.add_box(bm, (radial, tangential, axial), placement)
