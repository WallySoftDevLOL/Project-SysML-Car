"""VCONTROL (vehicle controller) and DIAG (service diagnostics port)."""

import bmesh

import common
import layout


def _bevel_all_edges(bm, verts, width):
    # a plain list, not a set: iterating a set of BMEdge objects orders by
    # object id, which differs between process runs and would make the
    # build non-deterministic.
    edges = []
    for v in verts:
        for e in v.link_edges:
            if e not in edges:
                edges.append(e)
    if edges and width > 0:
        bmesh.ops.bevel(bm, geom=edges, offset=width, segments=1,
                        affect="EDGES")


def build_vcontrol(ctx):
    """VCONTROL: central controller ECU under the dash, with a connector block."""
    spec = layout.BLOCKS["VCONTROL"]
    bm = bmesh.new()
    ret = common.add_box(bm, spec["size"], common.trs(spec["center"]))
    _bevel_all_edges(bm, ret["verts"], spec.get("bevel_width", 0.0))
    common.add_box(bm, spec["connector_size"], common.trs(spec["connector_center"]))
    return ctx.emit_block("VCONTROL", bm)


def build_diag(ctx):
    """DIAG: service connector on the driver's side, a cheap trapezoid prism."""
    spec = layout.BLOCKS["DIAG"]
    bm = bmesh.new()

    sx, sy, sz = spec["size"]
    top_scale = spec.get("trapezoid_top_scale", 1.0)
    half_y_bottom = sy / 2.0
    half_z_bottom = sz / 2.0
    half_y_top = half_y_bottom * top_scale
    profile = [
        (-half_y_bottom, -half_z_bottom),
        (half_y_bottom, -half_z_bottom),
        (half_y_top, half_z_bottom),
        (-half_y_top, half_z_bottom),
    ]
    common.profile_extrude(bm, profile, sx, common.trs(spec["center"]))
    return ctx.emit_block("DIAG", bm)
