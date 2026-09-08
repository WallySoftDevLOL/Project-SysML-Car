// The real glTF-driven viewer. Implements the Viewer contract from
// viewer-api.ts exactly, so main.ts can swap it in for placeholder.ts
// without any other change.
//
// This file is only composition + the render loop; the actual work lives in
// the modules it wires together:
//
//   load-glb.ts   fetch + parse car.glb, index blocks/flows/decor, clone
//                 materials, cache bounding boxes/spheres
//   lighting.ts   RoomEnvironment IBL, one key light, contact disc
//   picking.ts    pointer events -> block id (click vs. drag, throttled hover)
//   highlight.ts  the single owner of every material's emissive/opacity
//   explode.ts    block positions along their explode vectors
//   camera.ts     framing + tweening + projection
//   labels.ts     the CSS2D hover label
//
// Rendering is on demand: the loop only draws when something asked it to
// (controls moved, a tween or material lerp is running, auto-rotate is on,
// the container resized). Idle costs one empty rAF callback per frame.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { BlockId, HighlightState } from '../model/schema';
import { createCameraRig, DEFAULT_DURATION, MAX_DISTANCE, MIN_DISTANCE } from './camera';
import { createExploder } from './explode';
import { createHighlighter } from './highlight';
import { createLabels } from './labels';
import {
  deriveBlockDefs,
  disposeAssets,
  fetchGltf,
  indexScene,
  type SceneAssets,
  type ViewerBlockDef,
} from './load-glb';
import { setupLighting } from './lighting';
import { createPicker } from './picking';
import type {
  CameraPose,
  FocusOptions,
  Viewer,
  ViewerEvent,
  ViewerPickEvent,
  ViewerTheme,
} from './viewer-api';

export type { ViewerBlockDef } from './load-glb';

/** Options for {@link createViewer}. Every field is optional. */
export interface ViewerOptions {
  /**
   * The block catalog: the 13 rows of data/blocks.json (or the Block elements
   * of model.json). Ids must match the glTF node names. When omitted, the
   * viewer falls back to the `sysml_kind: "Block"` node extras in the glb,
   * which gives picking and highlighting but no explode directions.
   */
  blocks?: ViewerBlockDef[];
  /** Initial theme. Default "dark". */
  theme?: ViewerTheme;
  /** Initial x-ray state. Default true (the shell starts translucent). */
  xray?: boolean;
  /** Initial explode amount, 0..1. Default 0. */
  explode?: number;
  /** Show the CSS2D hover label. Default true. */
  labels?: boolean;
}

/**
 * Escape hatch for the dev harness and scene tests: the three.js objects
 * behind a Viewer, keyed by the Viewer itself. Deliberately *not* part of the
 * Viewer contract -- main.ts and src/ui/* must never reach through this.
 */
export const viewerInternals = new WeakMap<
  Viewer,
  { renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera }
>();

const THEME_FALLBACK_BG: Record<ViewerTheme, string> = {
  dark: '#0b1220',
  light: '#f1f5f9',
};

/**
 * How long after the last explode change the camera re-frames, and how long
 * that re-frame takes. Long enough that dragging the slider never triggers a
 * tween mid-drag; short enough that letting go feels immediate.
 */
const EXPLODE_FIT_DELAY = 160;
const EXPLODE_FIT_DURATION = 320;

/** Target pan/orbit centre: roughly the middle of the car's body. */
const HOME_TARGET = new THREE.Vector3(0, 0.6, 0);
/** Pan is allowed, but only inside this box, so the car can't be lost offscreen. */
/** Focus framing: minimum box extent (m), extra distance, and minimum view elevation (unit y). */
const FOCUS_MIN_EXTENT = 1.8;
const FOCUS_CONTEXT_SCALE = 1.0;
const FOCUS_MIN_ELEVATION = 0.42;

const PAN_LIMIT = new THREE.Box3(
  new THREE.Vector3(-2.5, -0.2, -3.5),
  new THREE.Vector3(2.5, 2.2, 3.5),
);

export function createViewer(container: HTMLElement, opts: ViewerOptions = {}): Viewer {
  const blockDefs = opts.blocks ?? [];
  const showLabels = opts.labels !== false;

  const reduceMotionQuery =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
  const reducedMotion = () => reduceMotionQuery?.matches === true;

  // --- renderer / scene / camera ----------------------------------------
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  camera.position.set(4.2, 2.6, 5.6);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.touchAction = 'none'; // pointer events, not scroll

  // The CSS2D label layer is absolutely positioned inside the container.
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.target.copy(HOME_TARGET);
  controls.minDistance = MIN_DISTANCE;
  controls.maxDistance = MAX_DISTANCE;
  controls.maxPolarAngle = THREE.MathUtils.degToRad(85); // never from below
  controls.enablePan = true;
  controls.panSpeed = 0.6;
  controls.autoRotateSpeed = 0.6;
  controls.zoomSpeed = 0.8;

  const lighting = setupLighting(scene, renderer, 3);
  const labels = createLabels(container, scene);

  let needsRender = true;
  const requestRender = () => {
    needsRender = true;
  };

  const rig = createCameraRig(camera, controls, container, requestRender, reducedMotion);

  function onControlsChange() {
    // Keep the orbit centre inside PAN_LIMIT so panning cannot fling the car
    // out of frame; clamping the target is enough because distance is clamped
    // too.
    PAN_LIMIT.clampPoint(controls.target, controls.target);
    requestRender();
  }
  controls.addEventListener('change', onControlsChange);

  // --- state ------------------------------------------------------------
  let assets: SceneAssets | null = null;
  let exploder: ReturnType<typeof createExploder> | null = null;
  let highlighter: ReturnType<typeof createHighlighter> | null = null;
  let picker: ReturnType<typeof createPicker> | null = null;

  const labelText = new Map<BlockId, string>();
  // Held so a setHighlight()/setHover() that lands before (or during) load()
  // is not silently dropped -- main.ts restores selection from the URL hash
  // and may well beat the glb.
  let lastHighlight: HighlightState = { primary: new Set(), secondary: new Set() };
  let theme: ViewerTheme = opts.theme ?? 'dark';
  let xray = opts.xray ?? true;
  let explodeT = THREE.MathUtils.clamp(opts.explode ?? 0, 0, 1);
  let hoveredId: BlockId | null = null;
  let disposed = false;

  const listeners: Record<ViewerEvent, Set<(e: ViewerPickEvent) => void>> = {
    pick: new Set(),
    hover: new Set(),
  };
  const emit = (event: ViewerEvent, id: BlockId | null) => {
    for (const cb of listeners[event]) cb({ id });
  };

  // --- theme ------------------------------------------------------------
  function readBackground(next: ViewerTheme): THREE.Color {
    // Follow the app's CSS token when there is one so the canvas and the
    // surrounding chrome never disagree; --bg first, then the token this app
    // actually ships (--color-bg), then a hard-coded fallback for the
    // standalone dev harness.
    const style = getComputedStyle(container);
    const raw = (style.getPropertyValue('--bg') || style.getPropertyValue('--color-bg')).trim();
    const color = new THREE.Color();
    if (raw) {
      try {
        color.setStyle(raw);
        return color;
      } catch {
        /* fall through to the hard-coded value */
      }
    }
    return color.setStyle(THEME_FALLBACK_BG[next]);
  }

  function applyTheme(next: ViewerTheme) {
    theme = next;
    scene.background = readBackground(next);
    lighting.setTheme(next);
    requestRender();
  }
  applyTheme(theme);

  // --- explode re-framing -------------------------------------------------
  // Exploded parts travel outside the default framing, so once the slider
  // settles we re-fit the camera to where the parts actually are. Only when
  // nothing is focused: a selection's own framing always wins, and any
  // focus()/flyTo() cancels a pending fit so a tour step is never overridden.
  const _explodedBox = new THREE.Box3();
  const _focusBox = new THREE.Box3();
  const _focusSize = new THREE.Vector3();
  const _focusPad = new THREE.Vector3();
  let explodeFitTimer: ReturnType<typeof setTimeout> | undefined;

  function cancelExplodeFit() {
    if (explodeFitTimer === undefined) return;
    clearTimeout(explodeFitTimer);
    explodeFitTimer = undefined;
  }

  function explodedBounds(): THREE.Box3 | null {
    if (!assets) return null;
    _explodedBox.makeEmpty();
    for (const entry of assets.blocks.values()) _explodedBox.union(entry.box);
    if (_explodedBox.isEmpty()) _explodedBox.copy(assets.carBox);
    return _explodedBox;
  }

  function scheduleExplodeFit() {
    cancelExplodeFit();
    explodeFitTimer = setTimeout(() => {
      explodeFitTimer = undefined;
      if (disposed || !assets) return;
      if (lastHighlight.primary.size > 0) return; // a focused part owns the framing
      const box = explodedBounds();
      if (box) rig.frameBox(box, reducedMotion() ? 0 : EXPLODE_FIT_DURATION);
    }, EXPLODE_FIT_DELAY);
  }

  // --- resize -----------------------------------------------------------
  // True once the car has been framed at a real (non-zero) aspect ratio.
  let framedAtRealSize = false;

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    // A hidden tab or a not-yet-laid-out container reports 0x0. Keep the last
    // good size instead of collapsing to 1x1 with a square aspect, which would
    // otherwise leave the camera framed for a viewport that never existed.
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    labels.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (assets && !framedAtRealSize) {
      framedAtRealSize = true;
      rig.frameDefault(assets.carBox, 0);
    }
    requestRender();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  // --- render loop ------------------------------------------------------
  let raf = 0;
  let lastFrame = performance.now();
  function tick(now: number) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(64, now - lastFrame);
    lastFrame = now;

    const tweening = rig.update(now);
    const animating = highlighter?.update(dt) ?? false;
    const rotating = controls.autoRotate;

    const shouldRender = needsRender || tweening || animating || rotating;
    needsRender = false;
    if (!shouldRender) return;

    // controls.update() re-fires "change" while damping settles, which sets
    // needsRender for the next frame -- that is what keeps the loop alive
    // exactly as long as motion lasts.
    controls.update();
    renderer.render(scene, camera);
    if (showLabels) labels.render(scene, camera);
  }
  raf = requestAnimationFrame(tick);

  // --- hover plumbing ---------------------------------------------------
  const hoverAnchor = new THREE.Vector3();
  let hoverHasAnchor = false;
  function applyHover(id: BlockId | null, point: THREE.Vector3 | null = null) {
    const sameId = id === hoveredId;
    hoveredId = id;
    if (!sameId) highlighter?.setHover(id);
    hoverHasAnchor = !!(id && point);
    if (point) hoverAnchor.copy(point);
    if (showLabels) {
      const entry = id ? assets?.blocks.get(id) : null;
      if (entry && !hoverHasAnchor) {
        // No pointer hit (hover came from a list row or legend chip): sit the
        // label on the part's highest point, shifted by the live explode offset.
        hoverAnchor.copy(entry.restTop).add(entry.sphere.center).sub(entry.restSphere.center);
      }
      labels.show(
        entry ? (labelText.get(entry.id) ?? entry.id) : null,
        entry?.sphere ?? null,
        entry ? hoverAnchor : null,
      );
    }
    requestRender();
  }

  const viewer: Viewer = {
    async load(url: string) {
      const gltfScene = await fetchGltf(url);
      const defs = blockDefs.length > 0 ? blockDefs : deriveBlockDefs(gltfScene);
      if (disposed) return { blocks: [], missing: defs.map((d) => d.id) };

      if (assets) {
        picker?.dispose();
        highlighter?.dispose();
        disposeAssets(assets);
      }

      labelText.clear();
      for (const def of defs) labelText.set(def.id, def.label ?? def.id);

      assets = indexScene(gltfScene, defs);
      scene.add(assets.root);

      exploder = createExploder(assets);
      highlighter = createHighlighter(assets, reducedMotion);
      highlighter.setXray(xray);
      lighting.setExplode(explodeT);
      exploder.set(explodeT);
      highlighter.setExplode(explodeT);
      highlighter.setHighlight(lastHighlight);
      highlighter.setHover(hoveredId);

      picker = createPicker({
        container,
        domElement: renderer.domElement,
        camera,
        meshes: () => assets?.pickMeshes ?? [],
        meshToBlock: assets.meshToBlock,
        onPick: (id) => emit('pick', id),
        onHover: (id, point) => {
          const changed = id !== hoveredId;
          applyHover(id, point);
          if (changed) emit('hover', id);
        },
      });

      rig.frameDefault(assets.carBox, 0);
      framedAtRealSize = container.clientWidth > 0 && container.clientHeight > 0;
      requestRender();
      return { blocks: assets.found, missing: assets.missing };
    },

    setHighlight(highlight: HighlightState) {
      lastHighlight = highlight;
      highlighter?.setHighlight(highlight);
      requestRender();
    },

    setHover(id: BlockId | null) {
      if (id === hoveredId) return;
      applyHover(id);
    },

    setXray(on: boolean) {
      xray = on;
      highlighter?.setXray(on);
      requestRender();
    },

    setExplode(t: number) {
      const next = THREE.MathUtils.clamp(t, 0, 1);
      const changed = Math.abs(next - explodeT) > 1e-4;
      explodeT = next;
      exploder?.set(explodeT);
      highlighter?.setExplode(explodeT);
      lighting.setExplode(explodeT);
      // Blocks moved, so the label anchor and the hovered id may be stale.
      if (hoveredId && showLabels) {
        const entry = assets?.blocks.get(hoveredId);
        if (entry) hoverAnchor.copy(entry.restTop).add(entry.sphere.center).sub(entry.restSphere.center);
        hoverHasAnchor = false;
        labels.show(entry ? (labelText.get(hoveredId) ?? hoveredId) : null, entry?.sphere ?? null, entry ? hoverAnchor : null);
      }
      picker?.invalidate();
      if (changed) scheduleExplodeFit();
      requestRender();
    },

    focus(blockId: BlockId | null, focusOpts?: FocusOptions) {
      cancelExplodeFit();
      const duration = focusOpts?.duration ?? DEFAULT_DURATION;
      const scale = focusOpts?.distance ?? 1;
      if (!assets) return;
      if (blockId === null) {
        // Frame whatever is actually on screen: at explode > 0 the rest-pose
        // carBox is too small and would clip the parts that have moved out.
        rig.frameDefault(explodedBounds() ?? assets.carBox, duration, scale);
        return;
      }
      const entry = assets.blocks.get(blockId);
      if (!entry) return;
      // An exact fit on a small part (an ECU, a charge port) loses all sense of
      // where it sits in the car. Pad the box to a minimum extent so the
      // surrounding structure stays in frame, and look slightly down at it.
      _focusBox.copy(entry.box);
      _focusBox.getSize(_focusSize);
      _focusPad.set(
        Math.max(0, (FOCUS_MIN_EXTENT - _focusSize.x) / 2),
        Math.max(0, (FOCUS_MIN_EXTENT * 0.6 - _focusSize.y) / 2),
        Math.max(0, (FOCUS_MIN_EXTENT - _focusSize.z) / 2),
      );
      _focusBox.expandByVector(_focusPad);
      rig.frameBox(_focusBox, duration, scale * FOCUS_CONTEXT_SCALE, FOCUS_MIN_ELEVATION);
    },

    flyTo(pose: CameraPose, duration = DEFAULT_DURATION) {
      cancelExplodeFit();
      rig.flyTo(pose, duration);
    },

    setAutoRotate(on: boolean) {
      controls.autoRotate = on;
      requestRender();
    },

    setTheme(next: ViewerTheme) {
      applyTheme(next);
    },

    projectBlock(id: BlockId) {
      const entry = assets?.blocks.get(id);
      if (!entry) return null;
      return rig.project(entry.sphere.center);
    },

    on(event: ViewerEvent, cb: (e: ViewerPickEvent) => void) {
      listeners[event].add(cb);
      return () => {
        listeners[event].delete(cb);
      };
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      cancelExplodeFit();
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      controls.removeEventListener('change', onControlsChange);
      picker?.dispose();
      highlighter?.dispose();
      if (assets) disposeAssets(assets);
      labels.dispose();
      lighting.dispose();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      listeners.pick.clear();
      listeners.hover.clear();
    },
  };

  viewerInternals.set(viewer, { renderer, scene, camera });
  return viewer;
}
