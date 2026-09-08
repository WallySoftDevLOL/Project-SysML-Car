"""Entry point for the scripted Blender build of the SysML x-ray car.

Run headless (never let a script error exit 0):

    blender --background --factory-startup --python-exit-code 1 \
        --python model/build_car.py -- \
        --data data/model.json --blocks data/blocks.json --out dist/car.glb \
        [--blend dist/car.blend] [--report dist/build-report.json] \
        [--render docs/preview.png --engine auto|eevee|cycles|workbench --samples 32]

``--data`` is optional: without it (or if the file does not exist yet) the car
is built from blocks.json alone and the flow tubes are skipped with a warning.

Everything is deterministic - no timestamps, no randomness - so two runs produce
byte-identical .glb files.
"""

import argparse
import json
import os
import sys

# make "import common, layout, parts" work regardless of the cwd Blender was
# launched from
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import common  # noqa: E402
import export as export_mod  # noqa: E402
import layout  # noqa: E402  (imported so a syntax error there fails fast)
import parts  # noqa: E402

ROOT_NAME = "CAR"
MAX_TRIANGLES = 50000


# --------------------------------------------------------------------------
# args
# --------------------------------------------------------------------------
def parse_args(argv):
    parser = argparse.ArgumentParser(
        prog="build_car.py",
        description="Build dist/car.glb from data/blocks.json (+ data/model.json).",
    )
    parser.add_argument("--data", default=None,
                        help="data/model.json; optional, flows are skipped without it")
    parser.add_argument("--blocks", required=True, help="data/blocks.json")
    parser.add_argument("--out", required=True, help="output .glb path")
    parser.add_argument("--blend", default=None, help="also save a .blend here")
    parser.add_argument("--report", default=None, help="write a build report JSON here")
    parser.add_argument("--render", default=None, help="render a preview PNG here")
    parser.add_argument("--engine", default="auto",
                        choices=["auto", "eevee", "cycles", "workbench"])
    parser.add_argument("--samples", type=int, default=32)
    return parser.parse_args(argv)


def script_argv():
    if "--" in sys.argv:
        return sys.argv[sys.argv.index("--") + 1:]
    return []


# --------------------------------------------------------------------------
# scene
# --------------------------------------------------------------------------
def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene["sysml_schema_version"] = common.SCHEMA_VERSION
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    return scene


def make_root():
    root = bpy.data.objects.new(ROOT_NAME, None)
    if root.name != ROOT_NAME:
        raise RuntimeError("root empty was renamed to %r" % (root.name,))
    root.empty_display_type = "PLAIN_AXES"
    root.empty_display_size = 0.5
    root.location = (0.0, 0.0, 0.0)
    bpy.context.scene.collection.objects.link(root)
    common.set_extras(root, sysml_id=ROOT_NAME, sysml_kind="Root",
                      sysml_name="Car", sysml_parent="")
    return root


# --------------------------------------------------------------------------
# data
# --------------------------------------------------------------------------
def load_blocks(path):
    with open(path, "r", encoding="utf-8") as fh:
        blocks = json.load(fh)
    if not isinstance(blocks, list) or not blocks:
        raise ValueError("%s does not contain a non-empty array" % path)
    return blocks


def load_model(path, warn):
    if not path:
        warn("no --data given: building from blocks.json only, flows skipped")
        return None
    if not os.path.exists(path):
        warn("--data %s does not exist yet: building from blocks.json only, "
             "flows skipped" % path)
        return None
    with open(path, "r", encoding="utf-8") as fh:
        model = json.load(fh)
    schema = (model.get("meta") or {}).get("schema")
    if schema is not None and int(schema) != common.SCHEMA_VERSION:
        warn("model.json schema %s != %s, continuing anyway"
             % (schema, common.SCHEMA_VERSION))
    return model


# --------------------------------------------------------------------------
# build
# --------------------------------------------------------------------------
def build(ctx):
    missing = [bid for bid in ctx.block_order if bid not in parts.BUILDERS]
    if missing:
        raise RuntimeError("no builder registered for block(s): %s"
                           % ", ".join(sorted(missing)))
    extra = [bid for bid in parts.BUILDERS if bid not in ctx.blocks]
    if extra:
        ctx.warn("BUILDERS has entries not in blocks.json: %s"
                 % ", ".join(sorted(extra)))

    for block_id in ctx.block_order:
        parts.BUILDERS[block_id](ctx)
    for builder in parts.DECOR_BUILDERS:
        builder(ctx)
    for builder in parts.FLOW_BUILDERS:
        builder(ctx)
    return ctx.objects


def validate_scene(ctx):
    scene_objects = [o for o in bpy.context.scene.objects if o.name != ROOT_NAME]
    common.assert_clean_names(bpy.context.scene.objects)

    names = [o.name for o in scene_objects]
    dupes = sorted({n for n in names if names.count(n) > 1})
    if dupes:
        raise RuntimeError("duplicate object names: %s" % ", ".join(dupes))

    for block_id in ctx.block_order:
        matches = [n for n in names if n == block_id]
        if len(matches) != 1:
            raise RuntimeError("block %r has %d objects, expected exactly 1"
                               % (block_id, len(matches)))

    for obj in scene_objects:
        if obj.parent is not ctx.root:
            raise RuntimeError("%s is not a direct child of %s" % (obj.name, ROOT_NAME))
        if obj.type != "MESH":
            raise RuntimeError("%s is a %s, expected MESH" % (obj.name, obj.type))
        if len(obj.data.materials) != 1:
            raise RuntimeError("%s has %d materials, expected exactly 1"
                               % (obj.name, len(obj.data.materials)))
    print("validated %d objects under %s" % (len(scene_objects), ROOT_NAME))
    return scene_objects


# --------------------------------------------------------------------------
# report
# --------------------------------------------------------------------------
def _triangle_count(obj, depsgraph):
    eval_obj = obj.evaluated_get(depsgraph)
    mesh = eval_obj.to_mesh()
    if mesh is None:
        return 0
    try:
        try:
            mesh.calc_loop_triangles()
        except AttributeError:
            pass
        count = len(mesh.loop_triangles)
        if count == 0 and len(mesh.polygons):
            count = sum(len(p.vertices) - 2 for p in mesh.polygons)
    finally:
        eval_obj.to_mesh_clear()
    return count


def _bbox(obj):
    corners = [obj.matrix_world @ Vector(c[:]) for c in obj.bound_box]
    lo = [min(c[i] for c in corners) for i in range(3)]
    hi = [max(c[i] for c in corners) for i in range(3)]
    return [round(v, 4) for v in lo], [round(v, 4) for v in hi]


def build_report(ctx, objects, out_path, glb_path):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    entries = []
    for obj in sorted(objects, key=lambda o: o.name):
        lo, hi = _bbox(obj)
        entries.append({
            "name": obj.name,
            "kind": ctx.kinds.get(obj.name, "Unknown"),
            "triangles": _triangle_count(obj, depsgraph),
            "material": obj.data.materials[0].name if obj.data.materials else None,
            "bbox_min": lo,
            "bbox_max": hi,
        })

    total = sum(e["triangles"] for e in entries)
    if total >= MAX_TRIANGLES:
        raise RuntimeError("%d triangles exceeds the %d budget"
                           % (total, MAX_TRIANGLES))

    counts = {}
    for entry in entries:
        counts[entry["kind"]] = counts.get(entry["kind"], 0) + 1

    report = {
        "schema": common.SCHEMA_VERSION,
        "glb": os.path.basename(glb_path),
        "totals": {
            "objects": len(entries),
            "triangles": total,
            "materials": len(sorted({e["material"] for e in entries if e["material"]})),
            "blocks": counts.get("Block", 0),
            "decor": counts.get("Decor", 0),
            "flows": counts.get("Flow", 0),
        },
        "warnings": list(ctx.warnings),
        "objects": entries,
    }

    if out_path:
        out_path = os.path.abspath(out_path)
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        with open(out_path, "w", encoding="utf-8", newline="\n") as fh:
            json.dump(report, fh, indent=2, ensure_ascii=False)
            fh.write("\n")
        print("wrote %s" % out_path)
    return report


# --------------------------------------------------------------------------
# main
# --------------------------------------------------------------------------
def main():
    args = parse_args(script_argv())

    reset_scene()
    root = make_root()

    blocks = load_blocks(args.blocks)
    ctx = common.BuildContext(root, blocks, None)
    ctx.model = load_model(args.data, ctx.warn)

    build(ctx)
    objects = validate_scene(ctx)

    # export BEFORE any camera or light exists
    glb_path = export_mod.export_glb(args.out)

    report = build_report(ctx, objects, args.report, glb_path)
    print("objects=%d triangles=%d blocks=%d decor=%d flows=%d"
          % (report["totals"]["objects"], report["totals"]["triangles"],
             report["totals"]["blocks"], report["totals"]["decor"],
             report["totals"]["flows"]))

    if args.blend:
        blend_path = os.path.abspath(args.blend)
        os.makedirs(os.path.dirname(blend_path), exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=blend_path, compress=False,
                                    copy=False, relative_remap=False)
        print("saved %s" % blend_path)

    if args.render:
        import render as render_mod
        png = render_mod.render_preview(args.render, args.engine, args.samples)
        print("preview %s" % png)

    if ctx.warnings:
        print("%d warning(s):" % len(ctx.warnings))
        for message in ctx.warnings:
            print("  - %s" % message)
    print("build ok")


if __name__ == "__main__":
    main()
