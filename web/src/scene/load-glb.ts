// GLB loading + scene-graph indexing for the real viewer.
//
// Consumes dist/car.glb as described in docs/model-contract.md section 3:
//   * root empty named CAR
//   * one mesh per block, named exactly its id, flat children of CAR
//   * decor meshes named DECOR_*
//   * flow tubes named FLOW__<SOURCE>__<TARGET>
//   * VEH and DECOR_canopy export with alphaMode BLEND
//
// Everything downstream (picking/highlight/explode/camera) works off the
// SceneAssets index this module builds, so nothing else has to traverse the
// glTF graph or care about how it was authored.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { BlockId } from '../model/schema';

/** One block as handed in by the caller (from data/blocks.json or model.json). */
export interface ViewerBlockDef {
  /** SysML external id, also the glTF node name, e.g. "POWERTRAIN". */
  id: BlockId;
  /** Plain-language name shown in the hover label. Falls back to the id. */
  label?: string;
  /** Hex base color from the shared palette, e.g. "#F97316". */
  color: string;
  /** Material opacity at rest. VEH is 0.35; everything else 1. */
  alpha?: number;
  /** Explode direction in glTF space (+Y up, +Z nose, +X car-left). */
  explode: [number, number, number];
  /** Containing block id, or null for VEH. */
  parent?: BlockId | null;
}

/** Per-material snapshot of the as-authored look, used as the lerp floor. */
export interface MaterialBase {
  color: THREE.Color;
  emissive: THREE.Color;
  emissiveIntensity: number;
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
}

export interface BlockEntry {
  id: BlockId;
  def: ViewerBlockDef;
  /** The node under CAR that carries this block (a Mesh in today's glb). */
  root: THREE.Object3D;
  meshes: THREE.Mesh[];
  /** root.position at load time, before any explode offset. */
  rest: THREE.Vector3;
  /** World-space bounding sphere at explode = 0. */
  restSphere: THREE.Sphere;
  /** Live bounding sphere, restSphere shifted by the current explode offset. */
  sphere: THREE.Sphere;
  /**
   * World-space AABB at explode = 0. Camera framing uses the box, not the
   * sphere: a sphere around a long flat car is far larger than the car's
   * silhouette from any angle, which pushes the camera much too far back.
   */
  restBox: THREE.Box3;
  /** Live AABB, restBox shifted by the current explode offset. */
  box: THREE.Box3;
  /**
   * Highest vertex of the part's own geometry, world space at explode = 0.
   * Used as the label anchor when there is no pointer hit: unlike the
   * bounding-sphere top it always lies ON the part, which matters for parts
   * spread across the car (brakes at four wheels, sensors bumper to bumper).
   */
  restTop: THREE.Vector3;
}

/** World-space vertex with the greatest y across `meshes` (falls back to `fallback`). */
function highestVertex(meshes: THREE.Mesh[], fallback: THREE.Vector3): THREE.Vector3 {
  const best = fallback.clone();
  let bestY = -Infinity;
  const v = new THREE.Vector3();
  for (const mesh of meshes) {
    const pos = mesh.geometry.getAttribute('position');
    if (!pos) continue;
    mesh.updateWorldMatrix(true, false);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      if (v.y > bestY) {
        bestY = v.y;
        best.copy(v);
      }
    }
  }
  return best;
}

export interface FlowEntry {
  name: string;
  mesh: THREE.Mesh;
  source: BlockId;
  target: BlockId;
}

export interface SceneAssets {
  /** The CAR root node (or the gltf scene if the glb ever drops the empty). */
  root: THREE.Object3D;
  blocks: Map<BlockId, BlockEntry>;
  blockMeshes: Map<BlockId, THREE.Mesh[]>;
  meshToBlock: Map<THREE.Mesh, BlockId>;
  flows: Map<string, FlowEntry>;
  flowMeshes: Map<string, THREE.Mesh>;
  decor: Map<string, THREE.Mesh>;
  /** Every mesh the raycaster is allowed to hit (block meshes only). */
  pickMeshes: THREE.Mesh[];
  found: BlockId[];
  missing: BlockId[];
  /** Whole-car bounding sphere at explode = 0. */
  carSphere: THREE.Sphere;
  /** Whole-car AABB at explode = 0, used for the default framing. */
  carBox: THREE.Box3;
}

/** Names whose material is an x-ray shell rather than a solid part. */
export const SHELL_BLOCK_ID = 'VEH';
export const CANOPY_NAME = 'DECOR_canopy';

/** Materials whose base color drifts from the palette by more than this get corrected. */
const COLOR_TOLERANCE = 0.02;

const _box = new THREE.Box3();

function isMesh(o: THREE.Object3D): o is THREE.Mesh {
  return (o as THREE.Mesh).isMesh === true;
}

function asStandard(m: THREE.Material): THREE.MeshStandardMaterial | null {
  return (m as THREE.MeshStandardMaterial).isMeshStandardMaterial ? (m as THREE.MeshStandardMaterial) : null;
}

/** Every material on a mesh, normalised to an array (glTF can hand back groups). */
function materialsOf(mesh: THREE.Mesh): THREE.Material[] {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

/**
 * Give the mesh its own material instances (glTF shares one material object
 * across every node that references it) and snapshot the as-authored values
 * into `userData.base` so highlight/x-ray/explode can always lerp back.
 */
function cloneMaterials(mesh: THREE.Mesh): THREE.Material[] {
  const cloned = materialsOf(mesh).map((m) => {
    const c = m.clone();
    // glTF doubleSided materials are drawn in two passes once they turn
    // transparent (three's default forceSinglePass = false), which doubled the
    // draw calls the moment a selection dimmed the rest of the car. The car's
    // parts are closed solids, so one pass is visually identical and keeps the
    // frame at one draw call per mesh.
    c.forceSinglePass = true;
    const std = asStandard(c);
    const base: MaterialBase = {
      color: (std?.color ?? new THREE.Color(0xffffff)).clone(),
      emissive: (std?.emissive ?? new THREE.Color(0x000000)).clone(),
      emissiveIntensity: std?.emissiveIntensity ?? 1,
      opacity: c.opacity,
      transparent: c.transparent,
      depthWrite: c.depthWrite,
    };
    c.userData.base = base;
    return c;
  });
  mesh.material = cloned.length === 1 ? cloned[0]! : cloned;
  return cloned;
}

/** Push the palette color onto a material (and its base) when the glb drifted. */
function reconcileColor(mat: THREE.Material, hex: string): void {
  const std = asStandard(mat);
  if (!std) return;
  const want = new THREE.Color(hex);
  const d =
    Math.abs(std.color.r - want.r) + Math.abs(std.color.g - want.g) + Math.abs(std.color.b - want.b);
  if (d <= COLOR_TOLERANCE) return;
  std.color.copy(want);
  const base = std.userData.base as MaterialBase | undefined;
  if (base) base.color.copy(want);
}

function worldSphere(object: THREE.Object3D): THREE.Sphere {
  object.updateWorldMatrix(true, true);
  _box.setFromObject(object, true);
  const sphere = new THREE.Sphere();
  if (_box.isEmpty()) {
    sphere.center.setFromMatrixPosition(object.matrixWorld);
    sphere.radius = 0.1;
    return sphere;
  }
  _box.getBoundingSphere(sphere);
  if (sphere.radius < 1e-4) sphere.radius = 0.1;
  return sphere;
}

/** Parse "FLOW__VCONTROL__POWERTRAIN" -> ["VCONTROL", "POWERTRAIN"]. */
export function parseFlowName(name: string): [BlockId, BlockId] | null {
  if (!name.startsWith('FLOW__')) return null;
  const parts = name.slice('FLOW__'.length).split('__');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return [parts[0], parts[1]];
}

/**
 * Fetch + parse the glb ourselves rather than handing the URL to GLTFLoader,
 * so a 404 (no Blender build yet) rejects with a message main.ts can show
 * before falling back to the placeholder scene, instead of a parse error.
 */
export async function fetchGltf(url: string): Promise<THREE.Group> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new Error(`Could not fetch model "${url}": ${(err as Error).message}`);
  }
  if (!res.ok) {
    throw new Error(`Model "${url}" not available (HTTP ${res.status} ${res.statusText}).`);
  }
  const buffer = await res.arrayBuffer();
  const loader = new GLTFLoader(); // no Draco/meshopt: the contract forbids compression
  return await new Promise<THREE.Group>((resolve, reject) => {
    loader.parse(
      buffer,
      '',
      (gltf) => resolve(gltf.scene),
      (err) => reject(new Error(`Model "${url}" failed to parse: ${String(err)}`)),
    );
  });
}

/**
 * Last-resort block catalog, read from the glTF node extras the contract
 * defines (`sysml_kind: "Block"`, `sysml_name`, `sysml_parent`). Used only
 * when the caller did not pass `opts.blocks`: picking and highlighting work,
 * but explode directions are unknown so blocks stay put.
 */
export function deriveBlockDefs(scene: THREE.Group): ViewerBlockDef[] {
  const defs: ViewerBlockDef[] = [];
  scene.traverse((node) => {
    const extras = node.userData as Record<string, unknown>;
    if (extras?.['sysml_kind'] !== 'Block') return;
    const id = (extras['sysml_id'] as string | undefined) ?? node.name;
    if (!id || defs.some((d) => d.id === id)) return;
    let color = '#94A3B8';
    if (isMesh(node)) {
      const std = asStandard(materialsOf(node)[0] ?? new THREE.MeshBasicMaterial());
      if (std) color = `#${std.color.getHexString(THREE.SRGBColorSpace)}`;
    }
    defs.push({
      id,
      label: (extras['sysml_name'] as string | undefined) ?? id,
      color,
      alpha: 1,
      explode: [0, 0, 0],
      parent: (extras['sysml_parent'] as string | undefined) ?? null,
    });
  });
  return defs;
}

/**
 * Index a loaded glTF scene into {@link SceneAssets}: block roots, per-block
 * mesh lists, the reverse mesh->block map, flow tubes, decor, cloned
 * materials with `userData.base`, render order, and cached bounding spheres.
 */
export function indexScene(scene: THREE.Group, defs: ViewerBlockDef[]): SceneAssets {
  const carRoot = scene.getObjectByName('CAR') ?? scene;
  const defById = new Map<BlockId, ViewerBlockDef>(defs.map((d) => [d.id, d]));

  const blocks = new Map<BlockId, BlockEntry>();
  const blockMeshes = new Map<BlockId, THREE.Mesh[]>();
  const meshToBlock = new Map<THREE.Mesh, BlockId>();
  const flows = new Map<string, FlowEntry>();
  const flowMeshes = new Map<string, THREE.Mesh>();
  const decor = new Map<string, THREE.Mesh>();
  const pickMeshes: THREE.Mesh[] = [];

  // Blocks: every direct child of CAR whose name is in the caller's set.
  // (Traverse rather than iterate children so a future nested export, e.g.
  // a block split into an empty + sub-meshes, keeps working.)
  const claimed = new Set<THREE.Object3D>();
  carRoot.traverse((node) => {
    const def = defById.get(node.name);
    if (!def || blocks.has(def.id)) return;
    // Skip nodes already owned by an outer block root.
    for (let p = node.parent; p; p = p.parent) if (claimed.has(p)) return;
    claimed.add(node);

    const meshes: THREE.Mesh[] = [];
    node.traverse((child) => {
      if (!isMesh(child)) return;
      meshes.push(child);
      meshToBlock.set(child, def.id);
      const mats = cloneMaterials(child);
      for (const m of mats) reconcileColor(m, def.color);
      child.renderOrder = 0;
    });
    if (meshes.length === 0) return;

    blockMeshes.set(def.id, meshes);
    pickMeshes.push(...meshes);
    const restSphere = worldSphere(node);
    const restBox = new THREE.Box3().setFromObject(node, true);
    if (restBox.isEmpty()) {
      restBox.setFromCenterAndSize(restSphere.center, new THREE.Vector3(0.2, 0.2, 0.2));
    }
    blocks.set(def.id, {
      id: def.id,
      def,
      root: node,
      meshes,
      rest: node.position.clone(),
      restSphere,
      sphere: restSphere.clone(),
      restBox,
      box: restBox.clone(),
      restTop: highestVertex(meshes, restSphere.center),
    });
  });

  // Flows and decor: everything else that is a mesh with a known prefix.
  carRoot.traverse((node) => {
    if (!isMesh(node) || meshToBlock.has(node)) return;
    const mats = cloneMaterials(node);
    const endpoints = parseFlowName(node.name);
    if (endpoints) {
      node.renderOrder = 1;
      flowMeshes.set(node.name, node);
      flows.set(node.name, {
        name: node.name,
        mesh: node,
        source: endpoints[0],
        target: endpoints[1],
      });
      return;
    }
    if (node.name.startsWith('DECOR_')) {
      decor.set(node.name, node);
    }
    node.renderOrder = 0;
    void mats;
  });

  // The x-ray shell and the glass canopy always draw first with depthWrite
  // off, so everything inside them is composited on top no matter the camera
  // angle (contract section 3: both export with alphaMode BLEND).
  const shellMeshes: THREE.Mesh[] = [
    ...(blockMeshes.get(SHELL_BLOCK_ID) ?? []),
    ...(decor.has(CANOPY_NAME) ? [decor.get(CANOPY_NAME)!] : []),
  ];
  for (const mesh of shellMeshes) {
    mesh.renderOrder = -1;
    for (const m of materialsOf(mesh)) {
      m.transparent = true;
      m.depthWrite = false;
      const base = m.userData.base as MaterialBase | undefined;
      if (base) {
        base.transparent = true;
        base.depthWrite = false;
      }
    }
  }

  const found = [...blocks.keys()];
  const missing = defs.map((d) => d.id).filter((id) => !blocks.has(id));

  // Whole-car bounds, ignoring the flow tubes so the default framing is not
  // pushed out by a harness that loops wide.
  const carBox = new THREE.Box3();
  carRoot.updateWorldMatrix(true, true);
  for (const entry of blocks.values()) carBox.union(entry.restBox);
  for (const mesh of decor.values()) carBox.union(new THREE.Box3().setFromObject(mesh, true));
  if (carBox.isEmpty()) {
    carBox.setFromCenterAndSize(new THREE.Vector3(0, 0.6, 0), new THREE.Vector3(2, 1.5, 4.5));
  }
  const carSphere = carBox.getBoundingSphere(new THREE.Sphere());

  return {
    root: carRoot,
    blocks,
    blockMeshes,
    meshToBlock,
    flows,
    flowMeshes,
    decor,
    pickMeshes,
    found,
    missing,
    carSphere,
    carBox,
  };
}

/** Free every geometry/material/texture the glb brought in. */
export function disposeAssets(assets: SceneAssets): void {
  const seenGeo = new Set<THREE.BufferGeometry>();
  const seenMat = new Set<THREE.Material>();
  assets.root.traverse((node) => {
    if (!isMesh(node)) return;
    if (!seenGeo.has(node.geometry)) {
      seenGeo.add(node.geometry);
      node.geometry.dispose();
    }
    for (const m of materialsOf(node)) {
      if (seenMat.has(m)) continue;
      seenMat.add(m);
      const std = asStandard(m);
      std?.map?.dispose();
      std?.normalMap?.dispose();
      m.dispose();
    }
  });
  assets.root.removeFromParent();
}
