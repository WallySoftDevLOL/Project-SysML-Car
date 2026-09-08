"""ENERGY (battery pack) and BMS (battery management box).

ENERGY: a skateboard pack that reads as a pack rather than a slab - a tray with
a perimeter lip, twelve cell modules in two rows either side of a cooling plate
line, cross straps over the module tops, and an HV junction box with two cable
bosses at the rear end. The whole thing stays inside x +/- 0.62, y +/- 1.00,
z 0.22 - 0.36 so it sits on the floor pan.
BMS: a controller with a ribbed heatsink lid and a connector block, on the pack.
"""

import bmesh

import common
import layout

from . import _shapes


def build_energy(ctx):
    """ENERGY: skateboard battery pack under the floor."""
    spec = layout.BLOCKS["ENERGY"]
    _shapes.block_material(ctx, "ENERGY")
    bm = bmesh.new()

    # tray floor, with the vertical corners knocked off
    ret = common.add_box(bm, spec["tray_size"], common.trs(spec["tray_center"]))
    _shapes.bevel_vertical_edges(bm, list(ret["verts"]), spec["tray_bevel"])

    # perimeter lip; the rear rail is split for the junction box
    _shapes.boxes(bm, spec["lip_boxes"])

    # 12 cell modules, two rows with a small gap between every module
    module_size = spec["module_size"]
    module_z = spec["module_z"]
    for row_x in spec["module_row_x"]:
        for y in spec["module_row_y"]:
            common.add_box(bm, module_size, common.trs((row_x, y, module_z)))

    # cooling plate line down the spine, between the rows
    common.add_box(bm, spec["plate_size"], common.trs(spec["plate_center"]))

    # cross straps clamping the modules down
    strap_size = spec["strap_size"]
    for center in spec["strap_centers"]:
        common.add_box(bm, strap_size, common.trs(center))

    # HV junction box at the rear end, with two cable bosses facing out
    common.add_box(bm, spec["junction_size"], common.trs(spec["junction_center"]))
    for center in spec["boss_centers"]:
        _shapes.axis_cylinder(bm, center, spec["boss_radius"], spec["boss_depth"],
                              axis="Y", segments=spec["boss_segments"])

    return ctx.emit_block("ENERGY", bm)


def build_bms(ctx):
    """BMS: management electronics with a finned lid, sitting on the pack."""
    spec = layout.BLOCKS["BMS"]
    _shapes.block_material(ctx, "BMS")
    bm = bmesh.new()

    common.add_box(bm, spec["body_size"], common.trs(spec["body_center"]))
    _shapes.fin_stack(bm, spec["fin_center"], spec["fin_y_offsets"],
                      spec["fin_size"], along="Y")
    common.add_box(bm, spec["connector_size"], common.trs(spec["connector_center"]))

    return ctx.emit_block("BMS", bm)
