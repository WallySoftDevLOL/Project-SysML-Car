"""Shared Blender / bmesh helpers for the SysML car build.

Coordinate frame (Blender): Z up, ground at z = 0, nose toward -Y, +X is car-left.
The glTF exporter's Y-up conversion turns that into the contract frame
(+Y up, nose +Z, +X car-left).

Nothing in this module contains numbers that describe the car; every placement
lives in ``layout.py``.
"""

from __future__ import annotations

import math
import re

import bmesh
import bpy
from mathutils import Matrix, Vector

SCHEMA_VERSION = 1

#: object names must never carry a Blender ".001" de-duplication suffix
DUP_SUFFIX_RE = re.compile(r"\.\d{3}$")


# --------------------------------------------------------------------------
# color
# --------------------------------------------------------------------------
def _srgb_channel_to_linear(c: float) -> float:
    if c <= 0.04045:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4


def hex_to_linear_rgba(hex_color, alpha=1.0):
    """"#22C55E" -> linear-space (r, g, b, alpha) tuple for Blender."""
    h = str(hex_color).strip().lstrip("#")
    if len(h) == 3:
        h = "".join(ch * 2 for ch in h)
    if len(h) != 6:
        raise ValueError("bad hex color: %r" % (hex_color,))
    r, g, b = (int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))
    return (
        _srgb_channel_to_linear(r),
        _srgb_channel_to_linear(g),
        _srgb_channel_to_linear(b),
        float(alpha),
    )


def _principled(mat):
    node = mat.node_tree.nodes.get("Principled BSDF")
    if node is None:
        for n in mat.node_tree.nodes:
            if n.type == "BSDF_PRINCIPLED":
                node = n
                break
    return node


def _set_socket(node, name, value):
    sock = node.inputs.get(name)
    if sock is None:
        return False
    sock.default_value = value
    return True


def make_material(name, hex_color, alpha=1.0, roughness=0.5, metallic=0.0,
                  emission_hex=None, emission_strength=0.0):
    """Create (or fetch) a Principled BSDF material.

    ``alpha`` < 1 lands on the Principled *Alpha* socket, which is what makes
    the glTF exporter emit ``alphaMode: BLEND``; the EEVEE preview additionally
    needs ``surface_render_method = 'BLENDED'``.
    """
    existing = bpy.data.materials.get(name)
    if existing is not None:
        return existing

    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = _principled(mat)
    rgba = hex_to_linear_rgba(hex_color, alpha)
    if bsdf is not None:
        _set_socket(bsdf, "Base Color", rgba)
        _set_socket(bsdf, "Metallic", float(metallic))
        _set_socket(bsdf, "Roughness", float(roughness))
        _set_socket(bsdf, "Alpha", float(alpha))
        if emission_hex:
            _set_socket(bsdf, "Emission Color", hex_to_linear_rgba(emission_hex, 1.0))
            _set_socket(bsdf, "Emission Strength", float(emission_strength))
    mat.diffuse_color = rgba
    if alpha < 1.0:
        # Blender 5.2: EEVEE transparency switch. Older builds used blend_method.
        try:
            mat.surface_render_method = "BLENDED"
        except (AttributeError, TypeError):
            try:
                mat.blend_method = "BLEND"
            except (AttributeError, TypeError):
                pass
    return mat


# --------------------------------------------------------------------------
# bmesh primitives
# --------------------------------------------------------------------------
def _as_matrix(matrix):
    return Matrix.Identity(4) if matrix is None else matrix


def trs(center=(0.0, 0.0, 0.0), rotation=None):
    """Translation (+ optional rotation) matrix helper."""
    m = Matrix.Translation(Vector(center))
    if rotation is not None:
        m = m @ rotation
    return m


def add_box(bm, size, matrix=None):
    """Axis-aligned box of ``size`` (x, y, z) placed by ``matrix``."""
    sx, sy, sz = (float(v) for v in size)
    m = _as_matrix(matrix) @ Matrix.Diagonal(Vector((sx, sy, sz, 1.0)))
    return bmesh.ops.create_cube(bm, size=1.0, matrix=m, calc_uvs=False)


def add_cylinder(bm, radius, depth, segments=24, matrix=None, cap_ends=True):
    """Cylinder along local Z (use ``matrix`` to reorient) via ``create_cone``."""
    kwargs = dict(
        cap_ends=bool(cap_ends),
        cap_tris=False,
        segments=int(segments),
        radius1=float(radius),
        radius2=float(radius),
        depth=float(depth),
        matrix=_as_matrix(matrix),
        calc_uvs=False,
    )
    try:
        return bmesh.ops.create_cone(bm, **kwargs)
    except TypeError:
        # very old signature used diameter1/diameter2
        kwargs.pop("radius1")
        kwargs.pop("radius2")
        kwargs["diameter1"] = float(radius)
        kwargs["diameter2"] = float(radius)
        return bmesh.ops.create_cone(bm, **kwargs)


def add_torus_by_spin(bm, major_radius, minor_radius, major_segments=24,
                      minor_segments=8, matrix=None):
    """Torus around local Z built by spinning a small circle profile."""
    major_radius = float(major_radius)
    minor_radius = float(minor_radius)
    major_segments = int(major_segments)
    minor_segments = int(minor_segments)

    profile = []
    for i in range(minor_segments):
        a = 2.0 * math.pi * i / minor_segments
        profile.append(bm.verts.new((
            major_radius + minor_radius * math.cos(a),
            0.0,
            minor_radius * math.sin(a),
        )))
    bm.verts.ensure_lookup_table()
    edges = []
    for i in range(minor_segments):
        edges.append(bm.edges.new((profile[i], profile[(i + 1) % minor_segments])))

    geom = list(profile) + list(edges)
    step_angle = 2.0 * math.pi / major_segments
    ret = bmesh.ops.spin(
        bm, geom=geom, cent=(0.0, 0.0, 0.0), axis=(0.0, 0.0, 1.0),
        dvec=(0.0, 0.0, 0.0), angle=step_angle * major_segments,
        steps=major_segments, use_duplicate=False, use_merge=False,
    )
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])

    m = _as_matrix(matrix)
    if m != Matrix.Identity(4):
        bmesh.ops.transform(bm, matrix=m, verts=bm.verts[:])
    return ret


def profile_extrude(bm, profile_yz_points, width_x, matrix=None):
    """Extrude a YZ polygon along X.

    ``profile_yz_points`` is an ordered list of ``(y, z)`` pairs describing a
    simple (possibly concave) polygon. The two caps are triangulated so concave
    profiles export cleanly.
    """
    half = float(width_x) / 2.0
    verts = [bm.verts.new((-half, float(y), float(z))) for (y, z) in profile_yz_points]
    bm.verts.ensure_lookup_table()
    start_face = bm.faces.new(verts)

    ret = bmesh.ops.extrude_face_region(bm, geom=[start_face])
    new_verts = [e for e in ret["geom"] if isinstance(e, bmesh.types.BMVert)]
    new_faces = [e for e in ret["geom"] if isinstance(e, bmesh.types.BMFace)]
    bmesh.ops.translate(bm, verts=new_verts, vec=(float(width_x), 0.0, 0.0))

    caps = [f for f in ([start_face] + new_faces) if f.is_valid and len(f.verts) > 3]
    if caps:
        bmesh.ops.triangulate(bm, faces=caps, quad_method="BEAUTY", ngon_method="BEAUTY")
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])

    m = _as_matrix(matrix)
    if m != Matrix.Identity(4):
        bmesh.ops.transform(bm, matrix=m, verts=bm.verts[:])
    return ret


# --------------------------------------------------------------------------
# object plumbing
# --------------------------------------------------------------------------
def new_mesh_object(name, bm, material=None, parent=None):
    """Turn a bmesh into a scene object named exactly ``name``.

    The bmesh is freed. Raises if Blender had to rename the object (which would
    mean a duplicate name and a ``.001`` suffix in the glb).
    """
    mesh = bpy.data.meshes.new(name)
    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    if obj.name != name:
        raise RuntimeError("duplicate object name %r (Blender renamed it to %r)"
                           % (name, obj.name))
    if material is not None:
        mesh.materials.append(material)
    bpy.context.scene.collection.objects.link(obj)
    if parent is not None:
        obj.parent = parent
        obj.matrix_parent_inverse = parent.matrix_world.inverted()
    return obj


def set_extras(obj, **props):
    """Write custom properties; the glTF exporter turns these into node extras."""
    for key in sorted(props):
        value = props[key]
        obj[key] = "" if value is None else value
    return obj


def stub_box_block(ctx, block_id):
    """Placeholder geometry: the block's layout envelope as a single box.

    Part modules use this until real geometry lands; the envelope it draws is
    the volume the real part is expected to occupy.
    """
    import layout

    spec = layout.BLOCKS[block_id]
    bm = bmesh.new()
    add_box(bm, spec["size"], trs(spec["center"]))
    return ctx.emit_block(block_id, bm)


def assert_clean_names(objects):
    bad = sorted(o.name for o in objects if DUP_SUFFIX_RE.search(o.name))
    if bad:
        raise RuntimeError("objects carry a Blender .NNN suffix: %s" % (", ".join(bad),))


# --------------------------------------------------------------------------
# build context handed to every part builder
# --------------------------------------------------------------------------
class BuildContext:
    """Everything a part builder needs: catalog, root empty, materials, warnings."""

    def __init__(self, root, blocks, model=None):
        self.root = root
        self.blocks = {b["id"]: b for b in blocks}
        self.block_order = [b["id"] for b in blocks]
        self.model = model
        self.warnings = []
        self.objects = []          # in creation order
        self.kinds = {}            # object name -> Block | Decor | Flow

    # -- diagnostics -------------------------------------------------------
    def warn(self, message):
        self.warnings.append(message)
        print("WARNING: %s" % message)

    # -- catalog -----------------------------------------------------------
    def block(self, block_id):
        try:
            return self.blocks[block_id]
        except KeyError:
            raise KeyError("block %r is not in blocks.json" % (block_id,))

    def block_material(self, block_id):
        """The single ``M_<id>`` material for a block, from blocks.json."""
        blk = self.block(block_id)
        return make_material(
            "M_%s" % block_id,
            blk["color"],
            alpha=float(blk.get("alpha", 1.0)),
            roughness=0.45,
            metallic=0.0,
        )

    # -- emitters ----------------------------------------------------------
    def _register(self, obj, kind):
        self.objects.append(obj)
        self.kinds[obj.name] = kind
        return obj

    def emit_block(self, block_id, bm):
        blk = self.block(block_id)
        obj = new_mesh_object(block_id, bm, self.block_material(block_id), self.root)
        set_extras(
            obj,
            sysml_id=block_id,
            sysml_kind="Block",
            sysml_name=blk.get("name", block_id),
            sysml_parent=blk.get("parentId") or "",
        )
        return self._register(obj, "Block")

    def emit_decor(self, name, bm, material, sysml_name=None, parent_id="VEH"):
        obj = new_mesh_object(name, bm, material, self.root)
        set_extras(
            obj,
            sysml_id=name,
            sysml_kind="Decor",
            sysml_name=sysml_name or name,
            sysml_parent=parent_id,
        )
        return self._register(obj, "Decor")

    def emit_flow(self, obj, source, target, item, label=None):
        set_extras(
            obj,
            sysml_id=obj.name,
            sysml_kind="Flow",
            sysml_name=label or obj.name,
            sysml_parent="VEH",
            sysml_source=source,
            sysml_target=target,
            sysml_item=item or "",
        )
        return self._register(obj, "Flow")
