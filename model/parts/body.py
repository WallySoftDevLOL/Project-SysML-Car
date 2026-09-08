"""VEH shell and the non-clickable body decor (canopy, seats).

STUB. The VEH shell is a plain box with the translucent VEH material; the real
implementation is a ``common.profile_extrude`` of the side silhouette.
"""

import bmesh

import common
import layout


def build_veh(ctx):
    """VEH: translucent x-ray shell (alpha 0.35 comes from blocks.json)."""
    return common.stub_box_block(ctx, "VEH")


def build_canopy(ctx):
    """DECOR_canopy: greenhouse glass volume."""
    mat = common.make_material(
        "M_DECOR_glass", layout.COLOR_GLASS, alpha=layout.ALPHA_GLASS,
        roughness=0.1, metallic=0.0,
    )
    bm = bmesh.new()
    common.add_box(bm, layout.CANOPY["size"], common.trs(layout.CANOPY["center"]))
    return [ctx.emit_decor("DECOR_canopy", bm, mat, sysml_name="Canopy")]


def build_seats(ctx):
    """DECOR_seat_L / _R / _rear: cabin seating blocks."""
    mat = common.make_material("M_DECOR_seat", layout.COLOR_SEAT,
                               alpha=1.0, roughness=0.8, metallic=0.0)
    objs = []
    for name in sorted(layout.SEATS):
        center, size = layout.SEATS[name]
        bm = bmesh.new()
        common.add_box(bm, size, common.trs(center))
        objs.append(ctx.emit_decor(name, bm, mat, sysml_name=name.replace("DECOR_", "")))
    return objs
