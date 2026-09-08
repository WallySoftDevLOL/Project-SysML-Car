"""VCONTROL, DIAG (service diagnostics port) and DIAG_GATEWAY.

VCONTROL: a rounded ECU case on the tunnel with a finned aluminium lid, two
connector banks on its forward face and four mounting tabs.
DIAG: the OBD-II trapezoid connector under the dash on the driver's side, its
opening facing the cabin, with a suggestion of the pin field inside.
DIAG_GATEWAY: the secure gateway module on the dash rail just inboard of that
connector, a small box with one connector on its cabin-facing side.
"""

import bmesh

import common
import layout

from . import _shapes


def build_vcontrol(ctx):
    """VCONTROL: central controller ECU on the tunnel."""
    spec = layout.BLOCKS["VCONTROL"]
    _shapes.block_material(ctx, "VCONTROL")
    bm = bmesh.new()

    _shapes.bevel_box(bm, spec["body_size"], spec["body_center"],
                      spec["body_bevel"], segments=1)
    common.add_box(bm, spec["lid_size"], common.trs(spec["lid_center"]))
    _shapes.fin_stack(bm, spec["fin_center"], spec["fin_y_offsets"],
                      spec["fin_size"], along="Y")

    connector_size = spec["connector_size"]
    for center in spec["connector_centers"]:
        common.add_box(bm, connector_size, common.trs(center))

    tab_size = spec["tab_size"]
    for center in spec["tab_centers"]:
        common.add_box(bm, tab_size, common.trs(center))

    return ctx.emit_block("VCONTROL", bm)


def build_diag(ctx):
    """DIAG: OBD-II service connector, trapezoid shell plus a pin field."""
    spec = layout.BLOCKS["DIAG"]
    _shapes.block_material(ctx, "DIAG")
    bm = bmesh.new()

    sx, sy, sz = spec["shell_size"]
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
    # profile_extrude transforms the whole bmesh, so it has to come first
    common.profile_extrude(bm, profile, sx, common.trs(spec["shell_center"]))

    cx, _cy, cz = spec["shell_center"]
    pin_size = spec["pin_size"]
    pin_y = spec["pin_y"]
    for z_off in spec["pin_z_offsets"]:
        for x_off in spec["pin_x_offsets"]:
            common.add_box(bm, pin_size,
                           common.trs((cx + x_off, pin_y, cz + z_off)))

    return ctx.emit_block("DIAG", bm)


def build_diag_gateway(ctx):
    """DIAG_GATEWAY: secure gateway module next to the OBD-II port."""
    spec = layout.BLOCKS["DIAG_GATEWAY"]
    _shapes.block_material(ctx, "DIAG_GATEWAY")
    bm = bmesh.new()

    common.add_box(bm, spec["body_size"], common.trs(spec["body_center"]))
    common.add_box(bm, spec["connector_size"],
                   common.trs(spec["connector_center"]))

    return ctx.emit_block("DIAG_GATEWAY", bm)
