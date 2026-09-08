"""Preview render. Runs AFTER the glb export, so the camera and lights it adds
never reach the exported file.
"""

import os

import bpy
from mathutils import Vector

CAMERA_LOCATION = (4.6, -4.9, 2.4)
CAMERA_TARGET = (0.0, 0.0, 0.55)
CAMERA_LENS_MM = 40.0
SUN_STRENGTH = 3.0
SUN_DIRECTION = (-0.5, 0.6, -1.0)      # direction the sun points
WORLD_GREY = (0.55, 0.55, 0.58, 1.0)
RESOLUTION = (1280, 720)


def _engine_available(engine_id):
    scene = bpy.context.scene
    previous = scene.render.engine
    try:
        scene.render.engine = engine_id
    except (TypeError, ValueError):
        return False
    finally:
        try:
            if scene.render.engine != engine_id:
                scene.render.engine = previous
        except (TypeError, ValueError):
            pass
    return True


def _eevee_engine_id():
    """Blender 5.2 calls it BLENDER_EEVEE; some 4.x builds used BLENDER_EEVEE_NEXT.

    The engine enum is filtered at runtime, so probe by assignment rather than
    by reading ``enum_items``.
    """
    for candidate in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
        if _engine_available(candidate):
            return candidate
    return None


def set_engine(engine, samples=32):
    """``eevee`` | ``cycles`` | ``workbench`` | ``auto`` -> configured engine id."""
    scene = bpy.context.scene
    engine = (engine or "auto").lower()

    if engine in ("eevee", "auto"):
        eevee = _eevee_engine_id()
        if eevee is not None:
            scene.render.engine = eevee
            if hasattr(scene, "eevee"):
                if hasattr(scene.eevee, "taa_render_samples"):
                    scene.eevee.taa_render_samples = int(samples)
            return scene.render.engine
        if engine == "eevee":
            raise RuntimeError("no EEVEE engine in Blender %s" % bpy.app.version_string)
        print("NOTE: EEVEE unavailable, falling back to workbench")
        engine = "workbench"

    if engine == "cycles":
        if not _engine_available("CYCLES"):
            raise RuntimeError("CYCLES engine unavailable")
        scene.render.engine = "CYCLES"
        scene.cycles.device = "CPU"
        scene.cycles.samples = int(samples)
        scene.cycles.use_denoising = True
        return scene.render.engine

    if engine == "workbench":
        if not _engine_available("BLENDER_WORKBENCH"):
            raise RuntimeError("BLENDER_WORKBENCH engine unavailable")
        scene.render.engine = "BLENDER_WORKBENCH"
        shading = scene.display.shading
        shading.light = "STUDIO"
        shading.color_type = "MATERIAL"
        return scene.render.engine

    raise ValueError("unknown engine %r" % (engine,))


def _add_world():
    scene = bpy.context.scene
    world = scene.world
    if world is None:
        world = bpy.data.worlds.new("World")
        scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg is None:
        for node in world.node_tree.nodes:
            if node.type == "BACKGROUND":
                bg = node
                break
    if bg is not None:
        bg.inputs["Color"].default_value = WORLD_GREY
        bg.inputs["Strength"].default_value = 1.0
    world.color = WORLD_GREY[:3]
    return world


def _add_camera():
    scene = bpy.context.scene
    cam_data = bpy.data.cameras.new("PreviewCamera")
    cam_data.lens = CAMERA_LENS_MM
    cam = bpy.data.objects.new("PreviewCamera", cam_data)
    cam.location = CAMERA_LOCATION
    direction = Vector(CAMERA_TARGET) - Vector(CAMERA_LOCATION)
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    scene.collection.objects.link(cam)
    scene.camera = cam
    return cam


def _add_sun():
    scene = bpy.context.scene
    sun_data = bpy.data.lights.new("PreviewSun", type="SUN")
    sun_data.energy = SUN_STRENGTH
    sun = bpy.data.objects.new("PreviewSun", sun_data)
    sun.location = (3.0, -3.0, 6.0)
    sun.rotation_euler = Vector(SUN_DIRECTION).to_track_quat("-Z", "Y").to_euler()
    scene.collection.objects.link(sun)
    return sun


def render_preview(filepath, engine="auto", samples=32):
    """Add camera + sun + world, render a PNG. Returns the path."""
    filepath = os.path.abspath(filepath)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    scene = bpy.context.scene
    used = set_engine(engine, samples)
    _add_world()
    _add_camera()
    _add_sun()

    scene.render.resolution_x = RESOLUTION[0]
    scene.render.resolution_y = RESOLUTION[1]
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.filepath = filepath

    print("rendering %s with %s (%d samples)" % (filepath, used, samples))
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(filepath):
        raise RuntimeError("render produced no file at %s" % filepath)
    return filepath
