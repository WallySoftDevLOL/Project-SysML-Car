"""Flow tubes: FLOW__<SOURCE>__<TARGET>.

Routes come from ``layout.ROUTES``; the connector list comes from
``data/model.json`` ``flows[]``. Tubes are built as poly curves with a bevel and
immediately converted to mesh so the glb stays mesh-only.
"""

import bpy

import common
import layout


def _tube_mesh_object(name, points, material, parent):
    """Poly curve -> beveled -> evaluated mesh -> plain mesh object."""
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = layout.FLOW_RADIUS
    curve.bevel_resolution = layout.FLOW_BEVEL_RESOLUTION
    curve.use_fill_caps = True

    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for i, (x, y, z) in enumerate(points):
        spline.points[i].co = (float(x), float(y), float(z), 1.0)

    tmp = bpy.data.objects.new(name + "__curve", curve)
    bpy.context.scene.collection.objects.link(tmp)
    bpy.context.view_layer.update()

    depsgraph = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(tmp.evaluated_get(depsgraph),
                                           depsgraph=depsgraph)
    mesh.name = name

    bpy.data.objects.remove(tmp, do_unlink=True)
    bpy.data.curves.remove(curve)

    obj = bpy.data.objects.new(name, mesh)
    if obj.name != name:
        raise RuntimeError("duplicate flow object name %r" % (name,))
    mesh.materials.clear()
    mesh.materials.append(material)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent = parent
    obj.matrix_parent_inverse = parent.matrix_world.inverted()
    return obj


def build_flows(ctx):
    """Build one tube per ``model.json`` flow. No model.json -> no flows."""
    objs = []
    model = ctx.model
    if not model:
        ctx.warn("no model.json data: skipping flow tubes")
        return objs

    flows = model.get("flows") or []
    if not flows:
        ctx.warn("model.json has no flows[]: skipping flow tubes")
        return objs

    material = common.make_material(
        "M_FLOW", layout.COLOR_FLOW, alpha=1.0, roughness=0.35, metallic=0.0,
        emission_hex=layout.COLOR_FLOW,
        emission_strength=layout.FLOW_EMISSION_STRENGTH,
    )

    def sort_key(flow):
        return (str(flow.get("meshName") or ""), str(flow.get("id") or ""))

    seen = set()
    for flow in sorted(flows, key=sort_key):
        source = flow.get("source")
        target = flow.get("target")
        name = flow.get("meshName") or "FLOW__%s__%s" % (source, target)

        if source not in ctx.blocks or target not in ctx.blocks:
            ctx.warn("flow %s: endpoint not in blocks.json, skipped" % name)
            continue
        if name in seen:
            ctx.warn("flow %s: duplicate meshName, skipped" % name)
            continue
        seen.add(name)

        points = layout.route(source, target)
        if points is None:
            ctx.warn("no ROUTE for (%s, %s); using a straight line between block "
                     "centers" % (source, target))
            points = layout.fallback_route(source, target)

        obj = _tube_mesh_object(name, points, material, ctx.root)
        ctx.emit_flow(obj, source, target, flow.get("item"), flow.get("label"))
        objs.append(obj)

    return objs
