"""Preview renders. Runs AFTER the glb export, so the cameras, lights and the
shadow-catcher ground it adds never reach the exported file.

Two views:

* the hero shot - three-quarter front-left, soft area key + fill + rim, 1600x900
* an optional side elevation (``--render-side``) - an orthographic-ish camera
  square on the flank, which is the quickest way to judge the silhouette
"""

import os

import bpy
from mathutils import Vector

# hero: three-quarter front-left (nose is -Y, +X is the car's left side)
CAMERA_LOCATION = (4.70, -6.10, 2.00)
CAMERA_TARGET = (0.00, 0.05, 0.70)
CAMERA_LENS_MM = 48.0
RESOLUTION = (1600, 900)

# side elevation, orthographic, looking along -X at the car's left flank
SIDE_LOCATION = (12.0, 0.0, 0.70)
SIDE_TARGET = (0.0, 0.0, 0.70)
SIDE_ORTHO_SCALE = 5.0
SIDE_RESOLUTION = (1600, 700)

WORLD_GREY = (0.62, 0.63, 0.66, 1.0)
GROUND_GREY = (0.52, 0.53, 0.56, 1.0)
GROUND_SIZE = 60.0
FILM_EXPOSURE = 0.35

#: (name, location, target, size, energy) - big soft area lamps
AREA_LIGHTS = [
    ("PreviewKey", (5.2, -6.0, 5.6), (0.0, -0.3, 0.7), 4.5, 2600.0),
    ("PreviewFill", (-6.0, -3.2, 2.6), (0.0, -0.2, 0.7), 5.0, 900.0),
    ("PreviewRim", (-2.2, 6.4, 3.4), (0.0, 0.6, 0.8), 4.0, 1800.0),
]


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


def _try_set(owner, attribute, value):
    """Set ``owner.attribute`` when this Blender build has it."""
    if owner is None or not hasattr(owner, attribute):
        return False
    try:
        setattr(owner, attribute, value)
    except (AttributeError, TypeError, ValueError):
        return False
    return True


def set_engine(engine, samples=32):
    """``eevee`` | ``cycles`` | ``workbench`` | ``auto`` -> configured engine id."""
    scene = bpy.context.scene
    engine = (engine or "auto").lower()

    if engine in ("eevee", "auto"):
        eevee = _eevee_engine_id()
        if eevee is not None:
            scene.render.engine = eevee
            eevee_settings = getattr(scene, "eevee", None)
            _try_set(eevee_settings, "taa_render_samples", int(samples))
            # soft shadows / raytraced contact shadows where the build has them
            _try_set(eevee_settings, "use_shadows", True)
            _try_set(eevee_settings, "use_shadow_jitter_viewport", True)
            _try_set(eevee_settings, "shadow_ray_count", 2)
            _try_set(eevee_settings, "shadow_step_count", 6)
            _try_set(eevee_settings, "use_raytracing", True)
            _try_set(eevee_settings, "use_soft_shadows", True)
            _try_set(eevee_settings, "use_gtao", True)
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


def _aimed(obj, location, target):
    obj.location = location
    direction = Vector(target) - Vector(location)
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    return obj


def _add_camera(name, location, target, lens_mm=None, ortho_scale=None):
    scene = bpy.context.scene
    existing = bpy.data.objects.get(name)
    if existing is not None:
        return existing
    cam_data = bpy.data.cameras.new(name)
    if ortho_scale is not None:
        cam_data.type = "ORTHO"
        cam_data.ortho_scale = float(ortho_scale)
    else:
        cam_data.lens = float(lens_mm)
    cam = bpy.data.objects.new(name, cam_data)
    _aimed(cam, location, target)
    scene.collection.objects.link(cam)
    return cam


def _add_lights():
    scene = bpy.context.scene
    lights = []
    for (name, location, target, size, energy) in AREA_LIGHTS:
        if bpy.data.objects.get(name) is not None:
            lights.append(bpy.data.objects[name])
            continue
        data = bpy.data.lights.new(name, type="AREA")
        data.energy = float(energy)
        data.size = float(size)
        _try_set(data, "shape", "SQUARE")
        _try_set(data, "use_shadow", True)
        obj = bpy.data.objects.new(name, data)
        _aimed(obj, location, target)
        scene.collection.objects.link(obj)
        lights.append(obj)
    return lights


def _add_ground():
    """Large matte plane so the soft shadows have something to land on."""
    name = "PreviewGround"
    if bpy.data.objects.get(name) is not None:
        return bpy.data.objects[name]

    mesh = bpy.data.meshes.new(name)
    half = GROUND_SIZE / 2.0
    mesh.from_pydata(
        [(-half, -half, 0.0), (half, -half, 0.0), (half, half, 0.0),
         (-half, half, 0.0)],
        [], [[0, 1, 2, 3]],
    )
    mesh.update()

    mat = bpy.data.materials.new("M_PREVIEW_ground")
    mat.use_nodes = True
    for node in mat.node_tree.nodes:
        if node.type == "BSDF_PRINCIPLED":
            node.inputs["Base Color"].default_value = GROUND_GREY
            node.inputs["Roughness"].default_value = 0.85
            if node.inputs.get("Metallic") is not None:
                node.inputs["Metallic"].default_value = 0.0
    mesh.materials.append(mat)

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def _grade():
    view = getattr(bpy.context.scene, "view_settings", None)
    _try_set(view, "exposure", FILM_EXPOSURE)
    for look in ("AgX - Punchy", "Punchy", "AgX - Medium High Contrast"):
        if _try_set(view, "look", look):
            break


def _render_to(filepath, camera, resolution):
    scene = bpy.context.scene
    filepath = os.path.abspath(filepath)
    directory = os.path.dirname(filepath)
    if directory:
        os.makedirs(directory, exist_ok=True)

    scene.camera = camera
    scene.render.resolution_x = int(resolution[0])
    scene.render.resolution_y = int(resolution[1])
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.filepath = filepath

    print("rendering %s with %s" % (filepath, scene.render.engine))
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(filepath):
        raise RuntimeError("render produced no file at %s" % filepath)
    return filepath


def render_preview(filepath, engine="auto", samples=32, side_filepath=None):
    """Add cameras + lights + ground, render the hero PNG (and optionally the
    side elevation). Returns the hero path, or ``None`` when only a side
    elevation was asked for."""
    set_engine(engine, samples)
    _add_world()
    _add_lights()
    _add_ground()
    _grade()

    hero = None
    if filepath:
        camera = _add_camera("PreviewCamera", CAMERA_LOCATION, CAMERA_TARGET,
                             lens_mm=CAMERA_LENS_MM)
        hero = _render_to(filepath, camera, RESOLUTION)

    if side_filepath:
        camera = _add_camera("PreviewSideCamera", SIDE_LOCATION, SIDE_TARGET,
                             ortho_scale=SIDE_ORTHO_SCALE)
        side = _render_to(side_filepath, camera, SIDE_RESOLUTION)
        print("side elevation %s" % side)

    return hero
