// Pointer -> block id. Pointer events only, so mouse / pen / touch all take
// the same path.
//
// Two behaviours worth knowing about:
//  * A pointerdown/pointerup pair only counts as a click if the pointer moved
//    less than 6 px and the press lasted under 300 ms -- otherwise it was an
//    orbit drag and OrbitControls owns it.
//  * Hover raycasts are throttled to one per animation frame, so dragging the
//    mouse across the canvas costs exactly one raycast per rendered frame.
import * as THREE from 'three';
import type { BlockId } from '../model/schema';
import { SHELL_BLOCK_ID } from './load-glb';

const CLICK_MOVE_PX = 6;
const CLICK_MS = 300;

export interface PickerOptions {
  container: HTMLElement;
  domElement: HTMLElement;
  camera: THREE.Camera;
  /** Block meshes only -- decor and flow tubes are never pickable. */
  meshes: () => THREE.Mesh[];
  meshToBlock: Map<THREE.Mesh, BlockId>;
  onPick: (id: BlockId | null) => void;
  onHover: (id: BlockId | null) => void;
}

export interface Picker {
  /** Current hovered id, kept in sync with the last hover raycast. */
  hovered(): BlockId | null;
  /** Force a re-raycast on the next frame (e.g. after explode/camera moves). */
  invalidate(): void;
  dispose(): void;
}

export function createPicker(opts: PickerOptions): Picker {
  const { container, domElement, camera, meshes, meshToBlock, onPick, onHover } = opts;

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  // Reused across frames so the hot path allocates nothing.
  const hits: THREE.Intersection[] = [];

  let hovered: BlockId | null = null;
  let pointerInside = false;
  let lastX = 0;
  let lastY = 0;
  let moveRaf = 0;
  let downX = 0;
  let downY = 0;
  let downT = 0;
  let downId = -1;

  function raycastAt(clientX: number, clientY: number): BlockId | null {
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    hits.length = 0;
    raycaster.intersectObjects(meshes(), false, hits);
    if (hits.length === 0) return null;
    // The VEH shell wraps everything, so a naive nearest-hit would make it the
    // only pickable block from most angles. Prefer the nearest real part and
    // fall back to the shell only when nothing solid is behind the cursor.
    let shell: BlockId | null = null;
    for (const hit of hits) {
      const id = meshToBlock.get(hit.object as THREE.Mesh);
      if (!id) continue;
      if (id === SHELL_BLOCK_ID) {
        shell ??= id;
        continue;
      }
      return id;
    }
    return shell;
  }

  function emitHover(id: BlockId | null) {
    if (id === hovered) return;
    hovered = id;
    domElement.style.cursor = id ? 'pointer' : '';
    onHover(id);
  }

  function runHover() {
    moveRaf = 0;
    if (!pointerInside) return;
    emitHover(raycastAt(lastX, lastY));
  }

  function scheduleHover() {
    if (moveRaf === 0) moveRaf = requestAnimationFrame(runHover);
  }

  function onPointerMove(e: PointerEvent) {
    pointerInside = true;
    lastX = e.clientX;
    lastY = e.clientY;
    // Touch drags are orbits, not hovers; skip the raycast entirely.
    if (e.pointerType === 'touch' && downId !== -1) return;
    scheduleHover();
  }

  function onPointerDown(e: PointerEvent) {
    downX = e.clientX;
    downY = e.clientY;
    downT = performance.now();
    downId = e.pointerId;
  }

  function onPointerUp(e: PointerEvent) {
    if (e.pointerId !== downId) return;
    downId = -1;
    const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
    const held = performance.now() - downT;
    if (moved > CLICK_MOVE_PX || held > CLICK_MS) return; // that was a drag
    onPick(raycastAt(e.clientX, e.clientY));
  }

  function onPointerLeave() {
    pointerInside = false;
    downId = -1;
    emitHover(null);
  }

  function onPointerCancel() {
    downId = -1;
  }

  domElement.addEventListener('pointermove', onPointerMove);
  domElement.addEventListener('pointerdown', onPointerDown);
  domElement.addEventListener('pointerup', onPointerUp);
  domElement.addEventListener('pointerleave', onPointerLeave);
  domElement.addEventListener('pointercancel', onPointerCancel);

  return {
    hovered: () => hovered,
    invalidate: () => {
      if (pointerInside) scheduleHover();
    },
    dispose() {
      if (moveRaf) cancelAnimationFrame(moveRaf);
      domElement.removeEventListener('pointermove', onPointerMove);
      domElement.removeEventListener('pointerdown', onPointerDown);
      domElement.removeEventListener('pointerup', onPointerUp);
      domElement.removeEventListener('pointerleave', onPointerLeave);
      domElement.removeEventListener('pointercancel', onPointerCancel);
      domElement.style.cursor = '';
    },
  };
}
