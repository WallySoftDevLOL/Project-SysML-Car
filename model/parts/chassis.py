"""Structural layer: the "realistic layers" under the x-ray skin.

Two objects, both dark steel except for the springs:

* ``DECOR_chassis``    - floor pan, longitudinal frame rails, front and rear
  subframe loops around the drive units, front strut towers, rear multilink
  arms, the steering rack tube and its tie rods.
* ``DECOR_suspension`` - per corner: a lower control arm, a coil-over (helix
  spring around a damper tube, with spring seats) and a steering knuckle / hub
  block.

Everything is authored in ``layout.CHASSIS`` / ``layout.SUSPENSION`` to clear
the block geometry it shares the volume with: BRAKES discs at x = +/-0.72
(x 0.705..0.735), POWERTRAIN drive units at y = +/-1.35 (z 0.23..0.49) and the
ENERGY slab (x +/-0.62, y +/-1.00, z 0.22..0.36).
"""

import bmesh

import common
import layout

from . import decor_util


def _steel():
    return common.make_material("M_DECOR_steel", layout.COLOR_STEEL,
                                alpha=1.0, roughness=0.45, metallic=0.8)


def _spring_material():
    return common.make_material("M_DECOR_spring", layout.COLOR_SPRING,
                                alpha=1.0, roughness=0.35, metallic=0.9)


# --------------------------------------------------------------------------
# DECOR_chassis
# --------------------------------------------------------------------------
def build_chassis(ctx):
    spec = layout.CHASSIS
    bm = bmesh.new()

    center, size = spec["floor_pan"]
    common.add_box(bm, size, common.trs(center))

    for key in ("rails_pair", "subframes_pair", "towers_pair",
                "rear_links_pair"):
        decor_util.boxes(bm, decor_util.mirrored(spec[key]))
    decor_util.boxes(bm, spec["subframes"])

    rack_center, rack_radius, rack_length = spec["steering_rack"]
    decor_util.tube_between(
        bm,
        (rack_center[0] - rack_length / 2.0, rack_center[1], rack_center[2]),
        (rack_center[0] + rack_length / 2.0, rack_center[1], rack_center[2]),
        rack_radius, spec["steering_rack_segments"],
    )

    rod_w, rod_h = spec["tie_rod_size"]
    for (inner, outer) in spec["tie_rods_pair"]:
        decor_util.bar_between(bm, inner, outer, rod_w, rod_h)
        decor_util.bar_between(bm, (-inner[0], inner[1], inner[2]),
                               (-outer[0], outer[1], outer[2]), rod_w, rod_h)

    return [ctx.emit_decor("DECOR_chassis", bm, _steel(), sysml_name="Chassis")]


# --------------------------------------------------------------------------
# DECOR_suspension
# --------------------------------------------------------------------------
def _corner(steel_bm, spring_bm, sign_x, axle_y, is_front):
    spec = layout.SUSPENSION
    arm_w, arm_h = spec["arm_size"]

    inner = (sign_x * spec["arm_inner_x"], axle_y, spec["arm_z_inner"])
    outer = (sign_x * spec["arm_outer_x"], axle_y, spec["arm_z_outer"])
    decor_util.bar_between(steel_bm, inner, outer, arm_w, arm_h)

    knuckle_x = sign_x * spec["knuckle_center_x"]
    common.add_box(steel_bm, spec["knuckle_size"],
                   common.trs((knuckle_x, axle_y, layout.WHEEL_Z + 0.005)))

    bottom_x, bottom_z = spec["strut_bottom"]
    top_x, top_z = spec["strut_top_front"] if is_front else spec["strut_top_rear"]
    p_low = (sign_x * bottom_x, axle_y, bottom_z)
    p_high = (sign_x * top_x, axle_y, top_z)

    damper_high = tuple(
        p_low[i] + (p_high[i] - p_low[i]) * spec["damper_fraction"]
        for i in range(3)
    )
    decor_util.tube_between(steel_bm, p_low, damper_high,
                            spec["damper_radius"], spec["damper_segments"])
    decor_util.tube_between(steel_bm, damper_high, p_high,
                            spec["rod_radius"], spec["rod_segments"])

    lo, hi = spec["spring_span"]
    seat_lo = tuple(p_low[i] + (p_high[i] - p_low[i]) * lo for i in range(3))
    seat_hi = tuple(p_low[i] + (p_high[i] - p_low[i]) * hi for i in range(3))
    for seat in (seat_lo, seat_hi):
        common.add_box(steel_bm, spec["seat_size"], common.trs(seat))

    decor_util.helix(spring_bm, seat_lo, seat_hi, spec["spring_radius"],
                     spec["wire_radius"], spec["spring_turns"],
                     spec["spring_steps_per_turn"],
                     spec["spring_profile_segments"])


def build_suspension(ctx):
    steel_bm = bmesh.new()
    spring_bm = bmesh.new()
    for axle_y, is_front in ((layout.FRONT_AXLE_Y, True),
                             (layout.REAR_AXLE_Y, False)):
        for sign_x in (-1.0, 1.0):
            _corner(steel_bm, spring_bm, sign_x, axle_y, is_front)

    obj = decor_util.emit_multi_decor(
        ctx, "DECOR_suspension",
        [(steel_bm, _steel()), (spring_bm, _spring_material())],
        sysml_name="Suspension",
    )
    return [obj]


def build_structure(ctx):
    """Both structural objects, in a fixed order."""
    return build_chassis(ctx) + build_suspension(ctx)
