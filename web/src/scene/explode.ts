// The explode slider: slides every block root out along its `explode` vector
// from data/blocks.json.
//
// Nested blocks (INVERTER in POWERTRAIN, BMS in ENERGY, THERM_CTRL in
// THERMAL) ride along with their parent's offset and then add half of their
// own, so a child never flies away from the part it belongs to.
//
// Opacity is not this module's job -- highlight.ts folds the explode amount
// into the VEH shell fade and the flow-tube fade so every material has a
// single owner.
import * as THREE from 'three';
import type { BlockId } from '../model/schema';
import type { SceneAssets } from './load-glb';
import { SHELL_BLOCK_ID } from './load-glb';

/** Metres a block travels at t = 1 along a unit explode vector. */
export const EXPLODE_DISTANCE = 1.6;
/** How much of its own vector a nested block adds on top of its parent's. */
const CHILD_SCALE = 0.5;

export interface Exploder {
  /** Move every block for t in [0,1]. Returns true if anything actually moved. */
  set(t: number): boolean;
  value(): number;
  /** Current world-space offset of a block, or null if unknown. */
  offsetOf(id: BlockId): THREE.Vector3 | null;
}

export function createExploder(assets: SceneAssets): Exploder {
  // Pre-normalised directions; nothing in the hot path allocates.
  const dirs = new Map<BlockId, THREE.Vector3>();
  for (const [id, entry] of assets.blocks) {
    const [x, y, z] = entry.def.explode ?? [0, 0, 0];
    const v = new THREE.Vector3(x, y, z);
    if (v.lengthSq() > 1e-8) v.normalize();
    else v.set(0, 0, 0);
    dirs.set(id, v);
  }

  const offsets = new Map<BlockId, THREE.Vector3>();
  for (const id of assets.blocks.keys()) offsets.set(id, new THREE.Vector3());

  let current = -1;

  function computeOffset(id: BlockId, t: number, seen: Set<BlockId>): THREE.Vector3 {
    const out = offsets.get(id)!;
    if (seen.has(id)) return out;
    seen.add(id);
    const entry = assets.blocks.get(id)!;
    const dir = dirs.get(id)!;
    const parentId = entry.def.parent ?? null;
    const nested = parentId !== null && parentId !== SHELL_BLOCK_ID && assets.blocks.has(parentId);
    if (nested) {
      out.copy(computeOffset(parentId, t, seen));
      out.addScaledVector(dir, t * EXPLODE_DISTANCE * CHILD_SCALE);
    } else {
      out.copy(dir).multiplyScalar(t * EXPLODE_DISTANCE);
    }
    return out;
  }

  function set(raw: number): boolean {
    const t = THREE.MathUtils.clamp(raw, 0, 1);
    if (Math.abs(t - current) < 1e-4) return false;
    current = t;
    const seen = new Set<BlockId>();
    for (const id of assets.blocks.keys()) computeOffset(id, t, seen);
    for (const [id, entry] of assets.blocks) {
      const off = offsets.get(id)!;
      entry.root.position.copy(entry.rest).add(off);
      // Keep the cached bounds in step so focus()/projectBlock() stay honest
      // without re-walking the geometry every frame. Blocks only translate,
      // so shifting the rest bounds by the same offset is exact.
      entry.sphere.center.copy(entry.restSphere.center).add(off);
      entry.sphere.radius = entry.restSphere.radius;
      entry.box.min.copy(entry.restBox.min).add(off);
      entry.box.max.copy(entry.restBox.max).add(off);
    }
    assets.root.updateMatrixWorld(true);
    return true;
  }

  set(0);

  return {
    set,
    value: () => current,
    offsetOf: (id) => offsets.get(id) ?? null,
  };
}
