"""Exterior decor: lamps, mirrors, grille, door handles and trim.

Everything here is opaque and sits on (or just proud of) the x-ray shell, which
is what gives the translucent body an edge to read against. Six objects:

* ``DECOR_headlights``  - full-width DRL bar + two main lamp bars, emissive
* ``DECOR_taillights``  - full-width rear light bar + wrap-around caps, emissive
* ``DECOR_mirrors``     - two door mirrors on stalks
* ``DECOR_grille``      - closed EV fascia: raised surround, recessed panel,
  lower intake and two air curtains
* ``DECOR_doorhandles`` - four flush handles
* ``DECOR_trim``        - shoulder crease, window surround, rocker trim, door
  shut lines, roof fin, spoiler cap, diffuser and number plates

Side-mounted strips take their x from ``body.side_x``, so the crease, rocker and
shut lines follow the shell's tumblehome and arch flare instead of cutting
through it.
"""

import bmesh

import common
import layout

from . import body, decor_util


def _trim_material():
    return common.make_material("M_DECOR_trim", layout.COLOR_TRIM,
                                alpha=1.0, roughness=0.35, metallic=0.30)


def _side_strip(bm, y_center, y_len, z_center, z_len, thickness, proud,
                segments=1):
    """A strip on both flanks, split into ``segments`` so it hugs the taper."""
    segments = max(1, int(segments))
    for step in range(segments):
        span = float(z_len) / segments
        z = float(z_center) - float(z_len) / 2.0 + span * (step + 0.5)
        x = body.side_x(y_center, z, proud)
        common.add_box(bm, (float(thickness), float(y_len), span),
                       common.trs((x, float(y_center), z)))
        common.add_box(bm, (float(thickness), float(y_len), span),
                       common.trs((-x, float(y_center), z)))


def build_headlights(ctx):
    mat = common.make_material(
        "M_DECOR_light_front", layout.COLOR_LIGHT_FRONT, alpha=1.0,
        roughness=0.20, metallic=0.0, emission_hex=layout.COLOR_LIGHT_FRONT,
        emission_strength=layout.LIGHT_EMISSION_STRENGTH,
    )
    bm = bmesh.new()
    decor_util.boxes(bm, layout.EXTERIOR["headlights"])
    decor_util.boxes(bm, decor_util.mirrored(layout.EXTERIOR["headlights_pair"]))
    return [ctx.emit_decor("DECOR_headlights", bm, mat, sysml_name="Headlights")]


def build_taillights(ctx):
    mat = common.make_material(
        "M_DECOR_light_rear", layout.COLOR_LIGHT_REAR, alpha=1.0,
        roughness=0.20, metallic=0.0, emission_hex=layout.COLOR_LIGHT_REAR,
        emission_strength=layout.LIGHT_EMISSION_STRENGTH,
    )
    bm = bmesh.new()
    decor_util.boxes(bm, layout.EXTERIOR["taillights"])
    decor_util.boxes(bm, decor_util.mirrored(layout.EXTERIOR["taillights_pair"]))
    return [ctx.emit_decor("DECOR_taillights", bm, mat, sysml_name="Taillights")]


def build_mirrors(ctx):
    bm = bmesh.new()
    decor_util.boxes(bm, decor_util.mirrored(layout.EXTERIOR["mirrors_pair"]))
    return [ctx.emit_decor("DECOR_mirrors", bm, _trim_material(),
                           sysml_name="Mirrors")]


def build_grille(ctx):
    bm = bmesh.new()
    decor_util.boxes(bm, layout.EXTERIOR["grille"])
    decor_util.boxes(bm, decor_util.mirrored(layout.EXTERIOR["grille_pair"]))
    return [ctx.emit_decor("DECOR_grille", bm, _trim_material(),
                           sysml_name="Grille")]


def build_doorhandles(ctx):
    thickness, y_len, z_len = layout.EXTERIOR_HANDLE_SIZE
    bm = bmesh.new()
    for (y, z) in layout.EXTERIOR_HANDLES:
        _side_strip(bm, y, y_len, z, z_len, thickness,
                    layout.EXTERIOR_HANDLE_PROUD)
    return [ctx.emit_decor("DECOR_doorhandles", bm, _trim_material(),
                           sysml_name="Door handles")]


def build_trim(ctx):
    bm = bmesh.new()
    for (y_center, y_len, z_center, z_len, thickness, proud) in \
            layout.EXTERIOR_SIDE_STRIPS:
        _side_strip(bm, y_center, y_len, z_center, z_len, thickness, proud)

    seam_thickness, seam_width = layout.EXTERIOR_SEAM_SIZE
    for (y, z_lo, z_hi) in layout.EXTERIOR_DOOR_SEAMS:
        _side_strip(bm, y, seam_width, (z_lo + z_hi) / 2.0, z_hi - z_lo,
                    seam_thickness, layout.EXTERIOR_SEAM_PROUD,
                    segments=layout.EXTERIOR_SEAM_SEGMENTS)

    decor_util.boxes(bm, layout.EXTERIOR["trim"])
    decor_util.boxes(bm, layout.EXTERIOR["plates"])

    fin_y, fin_z = layout.EXTERIOR["diffuser_fin_center"]
    for x in layout.EXTERIOR["diffuser_fin_x"]:
        common.add_box(bm, layout.EXTERIOR["diffuser_fin_size"],
                       common.trs((float(x), float(fin_y), float(fin_z))))

    return [ctx.emit_decor("DECOR_trim", bm, _trim_material(),
                           sysml_name="Exterior trim")]


def build_exterior(ctx):
    """Every exterior decor object, in a fixed order."""
    objs = []
    for builder in (build_grille, build_headlights, build_taillights,
                    build_mirrors, build_doorhandles, build_trim):
        objs.extend(builder(ctx))
    return objs
