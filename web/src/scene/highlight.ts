// Every material change in the scene funnels through here.
//
// Selection, hover, x-ray and explode all want a say in the same three
// numbers (emissive color, emissive intensity, opacity) on the same
// materials, so instead of four modules writing them we compute one target
// per material from all four inputs and lerp the live values towards it in
// the render loop. That means no ordering bugs, and every transition is
// automatically animated.
//
// Visual grammar:
//   primary    emissive = the block's own palette color at 0.55, fully opaque
//   secondary  same tint at 0.20, opacity 0.95
//   dimmed     (something is selected and this is neither) opacity 0.12
//   nothing selected -> everything back to the as-authored look
//   VEH shell  never dims -- its opacity is owned by x-ray + explode
//   flow tubes light up when either endpoint is primary
import * as THREE from 'three';
import type { BlockId, HighlightState } from '../model/schema';
import type { MaterialBase, SceneAssets } from './load-glb';
import { CANOPY_NAME, SHELL_BLOCK_ID } from './load-glb';

/** Emissive intensity / opacity constants, kept together so they read as a set. */
export const PRIMARY_EMISSIVE = 0.55;
export const SECONDARY_EMISSIVE = 0.2;
export const SECONDARY_OPACITY = 0.95;
export const DIM_OPACITY = 0.12;
/** A dimmed block still lifts a little under the pointer so hover reads. */
export const DIM_HOVER_OPACITY = 0.4;
export const HOVER_EMISSIVE = 0.12;
export const SHELL_PRIMARY_EMISSIVE = 0.15;
export const FLOW_HOT_EMISSIVE = 1.2;
export const FLOW_DIM_OPACITY = 0.25;

/** X-ray on / off opacities for the shell and the glass canopy. */
export const SHELL_OPACITY = { on: 0.35, off: 0.9 };
export const CANOPY_OPACITY = { on: 0.25, off: 0.6 };

/** Inverted-hull outline scale on primary blocks. */
const OUTLINE_SCALE = 1.03;
/** Exponential-smoothing time constant; ~95% of the way there in 250 ms. */
const LERP_TAU = 250 / 3;
const EPSILON = 0.0025;

/** Shared placeholder geometry for pooled outline meshes (never disposed). */
const EMPTY_GEOMETRY = new THREE.BufferGeometry();

interface MatState {
  mat: THREE.Material;
  std: THREE.MeshStandardMaterial | null;
  base: MaterialBase;
  curEmissive: THREE.Color;
  curIntensity: number;
  curOpacity: number;
  tgtEmissive: THREE.Color;
  tgtIntensity: number;
  tgtOpacity: number;
  tgtTransparent: boolean;
  tgtDepthWrite: boolean;
}

export interface Highlighter {
  setHighlight(h: HighlightState): void;
  setHover(id: BlockId | null): void;
  setXray(on: boolean): void;
  setExplode(t: number): void;
  /** Advance the lerp by `dtMs`. Returns true while values are still moving. */
  update(dtMs: number): boolean;
  dispose(): void;
}

function asStandard(m: THREE.Material): THREE.MeshStandardMaterial | null {
  return (m as THREE.MeshStandardMaterial).isMeshStandardMaterial
    ? (m as THREE.MeshStandardMaterial)
    : null;
}

function materialsOf(mesh: THREE.Mesh): THREE.Material[] {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function makeState(mat: THREE.Material): MatState {
  const base = (mat.userData.base ?? {
    color: new THREE.Color(0xffffff),
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 1,
    opacity: mat.opacity,
    transparent: mat.transparent,
    depthWrite: mat.depthWrite,
  }) as MaterialBase;
  return {
    mat,
    std: asStandard(mat),
    base,
    curEmissive: base.emissive.clone(),
    curIntensity: base.emissiveIntensity,
    curOpacity: base.opacity,
    tgtEmissive: base.emissive.clone(),
    tgtIntensity: base.emissiveIntensity,
    tgtOpacity: base.opacity,
    tgtTransparent: base.transparent,
    tgtDepthWrite: base.depthWrite,
  };
}

export function createHighlighter(
  assets: SceneAssets,
  reducedMotion: () => boolean,
): Highlighter {
  // --- material state, grouped by what drives it -------------------------
  const blockStates = new Map<BlockId, MatState[]>();
  const blockColors = new Map<BlockId, THREE.Color>();
  for (const [id, entry] of assets.blocks) {
    const states: MatState[] = [];
    for (const mesh of entry.meshes) for (const m of materialsOf(mesh)) states.push(makeState(m));
    blockStates.set(id, states);
    blockColors.set(id, new THREE.Color(entry.def.color));
  }

  const flowStates = new Map<string, MatState[]>();
  for (const [name, flow] of assets.flows) {
    flowStates.set(
      name,
      materialsOf(flow.mesh).map(makeState),
    );
  }

  const canopyMesh = assets.decor.get(CANOPY_NAME);
  const canopyStates = canopyMesh ? materialsOf(canopyMesh).map(makeState) : [];

  const allStates: MatState[] = [
    ...[...blockStates.values()].flat(),
    ...[...flowStates.values()].flat(),
    ...canopyStates,
  ];

  // --- inverted-hull outlines, pooled ------------------------------------
  const outlinePool: THREE.Mesh[] = [];
  const activeOutlines: THREE.Mesh[] = [];

  function acquireOutline(): THREE.Mesh {
    const pooled = outlinePool.pop();
    if (pooled) return pooled;
    const mat = new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      toneMapped: false,
      fog: false,
    });
    // EMPTY_GEOMETRY is a shared placeholder: every outline gets the source
    // mesh's real geometry assigned the moment it is acquired, and outlines
    // must never own (or dispose) geometry they borrow.
    const mesh = new THREE.Mesh(EMPTY_GEOMETRY, mat);
    mesh.name = 'OUTLINE';
    mesh.userData.isOutline = true;
    mesh.matrixAutoUpdate = true;
    return mesh;
  }

  const _center = new THREE.Vector3();

  function refreshOutlines(primary: Set<BlockId>) {
    for (const outline of activeOutlines) {
      outline.removeFromParent();
      outlinePool.push(outline);
    }
    activeOutlines.length = 0;

    for (const id of primary) {
      // The shell would fill its own silhouette with a flat backface hull, so
      // it advertises selection with the emissive bump instead (see below).
      if (id === SHELL_BLOCK_ID) continue;
      const entry = assets.blocks.get(id);
      if (!entry) continue;
      const color = blockColors.get(id)!;
      for (const mesh of entry.meshes) {
        const outline = acquireOutline();
        outline.geometry = mesh.geometry;
        (outline.material as THREE.MeshBasicMaterial).color.copy(color);
        // Scale about the geometry's own centre, not the node origin, so the
        // rim stays even on meshes whose origin sits off to one side.
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        mesh.geometry.boundingBox!.getCenter(_center);
        outline.scale.setScalar(OUTLINE_SCALE);
        outline.position.copy(_center).multiplyScalar(1 - OUTLINE_SCALE);
        outline.renderOrder = mesh.renderOrder;
        mesh.add(outline);
        activeOutlines.push(outline);
      }
    }
  }

  // --- inputs ------------------------------------------------------------
  let primary = new Set<BlockId>();
  let secondary = new Set<BlockId>();
  let hovered: BlockId | null = null;
  let xray = true;
  let explode = 0;
  let dirty = true;

  function setBlockTarget(
    states: MatState[],
    emissive: THREE.Color | null,
    intensity: number,
    opacity: number,
  ) {
    for (const s of states) {
      if (emissive) s.tgtEmissive.copy(emissive);
      else s.tgtEmissive.copy(s.base.emissive);
      s.tgtIntensity = intensity;
      s.tgtOpacity = opacity;
      s.tgtTransparent = s.base.transparent || opacity < 0.999;
      s.tgtDepthWrite = s.base.depthWrite && opacity > 0.999;
    }
  }

  function recomputeTargets() {
    const hasSelection = primary.size > 0 || secondary.size > 0;

    for (const [id, states] of blockStates) {
      const color = blockColors.get(id)!;
      const isPrimary = primary.has(id);
      const isHovered = hovered === id;

      if (id === SHELL_BLOCK_ID) {
        // The shell is a window, not a part: x-ray owns its opacity, explode
        // fades it out of the way, and selection only tints it.
        const opacity = (xray ? SHELL_OPACITY.on : SHELL_OPACITY.off) * (1 - 0.8 * explode);
        const intensity = isPrimary ? SHELL_PRIMARY_EMISSIVE : isHovered ? HOVER_EMISSIVE : 0;
        for (const s of states) {
          s.tgtEmissive.copy(intensity > 0 ? color : s.base.emissive);
          s.tgtIntensity = intensity;
          s.tgtOpacity = opacity;
          s.tgtTransparent = true;
          // With x-ray off (and not exploded) the shell writes depth so it
          // genuinely hides the internals instead of merely looking solid.
          s.tgtDepthWrite = !xray && explode < 0.01;
        }
        continue;
      }

      if (isPrimary) {
        setBlockTarget(states, color, PRIMARY_EMISSIVE, 1);
      } else if (secondary.has(id)) {
        setBlockTarget(states, color, SECONDARY_EMISSIVE, SECONDARY_OPACITY);
      } else if (hasSelection) {
        setBlockTarget(
          states,
          isHovered ? color : null,
          isHovered ? HOVER_EMISSIVE : 0,
          isHovered ? DIM_HOVER_OPACITY : DIM_OPACITY,
        );
      } else if (isHovered) {
        setBlockTarget(states, color, HOVER_EMISSIVE, states[0]?.base.opacity ?? 1);
      } else {
        setBlockTarget(states, null, states[0]?.base.emissiveIntensity ?? 0, states[0]?.base.opacity ?? 1);
      }
    }

    for (const [name, states] of flowStates) {
      const flow = assets.flows.get(name)!;
      const hot = primary.has(flow.source) || primary.has(flow.target);
      const fade = 1 - explode; // harness tubes make no sense once parts fly apart
      for (const s of states) {
        s.tgtEmissive.copy(s.base.emissive);
        if (hot) {
          s.tgtIntensity = FLOW_HOT_EMISSIVE;
          s.tgtOpacity = 1 * fade;
        } else if (hasSelection) {
          s.tgtIntensity = s.base.emissiveIntensity;
          s.tgtOpacity = FLOW_DIM_OPACITY * fade;
        } else {
          s.tgtIntensity = s.base.emissiveIntensity;
          s.tgtOpacity = s.base.opacity * fade;
        }
        s.tgtTransparent = s.tgtOpacity < 0.999;
        s.tgtDepthWrite = s.tgtOpacity > 0.999 && s.base.depthWrite;
      }
    }

    const canopyOpacity = (xray ? CANOPY_OPACITY.on : CANOPY_OPACITY.off) * (1 - 0.8 * explode);
    for (const s of canopyStates) {
      s.tgtEmissive.copy(s.base.emissive);
      s.tgtIntensity = s.base.emissiveIntensity;
      s.tgtOpacity = canopyOpacity;
      s.tgtTransparent = true;
      s.tgtDepthWrite = false;
    }

    refreshOutlines(primary);
    dirty = true;
  }

  function apply(s: MatState) {
    s.mat.opacity = s.curOpacity;
    // `transparent` is part of three's program cache key, so flipping it needs
    // a recompile flag; opacity/emissive are plain uniforms and do not.
    if (s.mat.transparent !== s.tgtTransparent) {
      s.mat.transparent = s.tgtTransparent;
      s.mat.needsUpdate = true;
    }
    s.mat.depthWrite = s.tgtDepthWrite;
    s.mat.visible = s.curOpacity > 0.005;
    if (s.std) {
      s.std.emissive.copy(s.curEmissive);
      s.std.emissiveIntensity = s.curIntensity;
    }
  }

  function snap() {
    for (const s of allStates) {
      s.curEmissive.copy(s.tgtEmissive);
      s.curIntensity = s.tgtIntensity;
      s.curOpacity = s.tgtOpacity;
      apply(s);
    }
    dirty = false;
  }

  recomputeTargets();
  snap();

  return {
    setHighlight(h) {
      primary = h.primary instanceof Set ? h.primary : new Set(h.primary);
      secondary = h.secondary instanceof Set ? h.secondary : new Set(h.secondary);
      recomputeTargets();
    },
    setHover(id) {
      if (id === hovered) return;
      hovered = id;
      recomputeTargets();
    },
    setXray(on) {
      if (on === xray) return;
      xray = on;
      recomputeTargets();
    },
    setExplode(t) {
      const clamped = THREE.MathUtils.clamp(t, 0, 1);
      if (Math.abs(clamped - explode) < 1e-4) return;
      explode = clamped;
      recomputeTargets();
    },
    update(dtMs) {
      if (!dirty) return false;
      if (reducedMotion()) {
        snap();
        return false;
      }
      const k = 1 - Math.exp(-Math.max(0, dtMs) / LERP_TAU);
      let moving = false;
      for (const s of allStates) {
        const dOpacity = s.tgtOpacity - s.curOpacity;
        const dIntensity = s.tgtIntensity - s.curIntensity;
        const dColor =
          Math.abs(s.tgtEmissive.r - s.curEmissive.r) +
          Math.abs(s.tgtEmissive.g - s.curEmissive.g) +
          Math.abs(s.tgtEmissive.b - s.curEmissive.b);
        if (Math.abs(dOpacity) < EPSILON && Math.abs(dIntensity) < EPSILON && dColor < EPSILON) {
          s.curOpacity = s.tgtOpacity;
          s.curIntensity = s.tgtIntensity;
          s.curEmissive.copy(s.tgtEmissive);
        } else {
          s.curOpacity += dOpacity * k;
          s.curIntensity += dIntensity * k;
          s.curEmissive.lerp(s.tgtEmissive, k);
          moving = true;
        }
        apply(s);
      }
      dirty = moving;
      return moving;
    },
    dispose() {
      for (const outline of [...activeOutlines, ...outlinePool]) {
        outline.removeFromParent();
        (outline.material as THREE.Material).dispose();
      }
      activeOutlines.length = 0;
      outlinePool.length = 0;
    },
  };
}
