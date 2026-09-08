"""glTF export.

Kwargs are filtered against the operator's actual RNA properties so that a
Blender version that renames or drops an option degrades gracefully (with a log
line) instead of raising.
"""

import os

import bpy

#: contract settings. Mesh-only, extras on, no compression, no cameras/lights.
EXPORT_KWARGS = {
    "export_format": "GLB",
    "export_yup": True,
    "export_apply": True,
    "export_extras": True,
    "export_materials": "EXPORT",
    "export_normals": True,
    "export_texcoords": False,
    "export_cameras": False,
    "export_lights": False,
    "export_animations": False,
    "export_skins": False,
    "export_morph": False,
    "export_draco_mesh_compression_enable": False,
    "use_selection": False,
    "use_visible": True,
}


def supported_kwargs(kwargs):
    """Split ``kwargs`` into (supported, dropped) for this Blender version."""
    rna = bpy.ops.export_scene.gltf.get_rna_type().properties
    valid = {p.identifier for p in rna}
    supported = {k: v for k, v in kwargs.items() if k in valid}
    dropped = sorted(k for k in kwargs if k not in valid)
    return supported, dropped


def export_glb(filepath, extra_kwargs=None):
    """Write the whole scene to ``filepath`` as a .glb. Returns the path."""
    filepath = os.path.abspath(filepath)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    kwargs = dict(EXPORT_KWARGS)
    if extra_kwargs:
        kwargs.update(extra_kwargs)
    kwargs, dropped = supported_kwargs(kwargs)
    if dropped:
        print("NOTE: glTF exporter in Blender %s does not support: %s"
              % (bpy.app.version_string, ", ".join(dropped)))

    result = bpy.ops.export_scene.gltf(filepath=filepath, **kwargs)
    if "FINISHED" not in result:
        raise RuntimeError("glTF export did not finish: %r" % (result,))
    if not os.path.exists(filepath):
        raise RuntimeError("glTF export produced no file at %s" % filepath)
    print("exported %s (%d bytes)" % (filepath, os.path.getsize(filepath)))
    return filepath
