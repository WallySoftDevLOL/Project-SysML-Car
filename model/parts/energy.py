"""ENERGY (battery pack slab) and BMS (battery management box).

ENERGY: a beveled skateboard slab with a handful of raised cell-module boxes
on the lid, so it reads as a battery pack rather than a plain box.
BMS: a small box on top of the pack with a thin connector ridge.
"""

import bmesh

import common
import layout


def _bevel_vertical_edges(bm, verts, width):
    """Bevel the vertical (Z-running) edges of an axis-aligned box lightly.

    Collected into a plain list (not a set): iterating a set of BMEdge
    objects orders by object id, which differs between process runs and
    would make the build non-deterministic.
    """
    edges = []
    for v in verts:
        for e in v.link_edges:
            other = e.other_vert(v)
            if abs(other.co.z - v.co.z) > 1e-6 and abs(other.co.x - v.co.x) < 1e-6 \
                    and abs(other.co.y - v.co.y) < 1e-6 and e not in edges:
                edges.append(e)
    if edges:
        bmesh.ops.bevel(bm, geom=edges, offset=width, segments=1,
                        affect="EDGES")


def build_energy(ctx):
    """ENERGY: skateboard battery slab under the floor."""
    spec = layout.BLOCKS["ENERGY"]
    bm = bmesh.new()

    ret = common.add_box(bm, spec["size"], common.trs(spec["center"]))
    slab_verts = [v for v in ret["verts"]]
    _bevel_vertical_edges(bm, slab_verts, spec.get("bevel_width", 0.0))

    module_size = spec["module_size"]
    for center in spec["module_centers"]:
        common.add_box(bm, module_size, common.trs(center))

    return ctx.emit_block("ENERGY", bm)


def build_bms(ctx):
    """BMS: management electronics sitting on top of the pack."""
    spec = layout.BLOCKS["BMS"]
    bm = bmesh.new()
    common.add_box(bm, spec["size"], common.trs(spec["center"]))
    common.add_box(bm, spec["ridge_size"], common.trs(spec["ridge_center"]))
    return ctx.emit_block("BMS", bm)
