// Pure-math coverage for the scene layer: the explode offsets and the flow
// node-name parser. Both run headless -- no WebGL, no DOM -- because
// explode.ts and the parser in load-glb.ts only touch three.js math objects.
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createExploder, EXPLODE_DISTANCE } from '../../src/scene/explode';
import { parseFlowName, type BlockEntry, type SceneAssets, type ViewerBlockDef } from '../../src/scene/load-glb';

const DEFS: ViewerBlockDef[] = [
  { id: 'VEH', color: '#94A3B8', alpha: 0.35, explode: [0, 0, 0], parent: null },
  { id: 'ENERGY', color: '#22C55E', alpha: 1, explode: [0, -1, 0], parent: 'VEH' },
  // Nested: rides ENERGY's offset plus half of its own.
  { id: 'BMS', color: '#86EFAC', alpha: 1, explode: [0, 0, 1], parent: 'ENERGY' },
];

/** Minimal SceneAssets: createExploder only reads `blocks` and `root`. */
function makeAssets(): SceneAssets {
  const root = new THREE.Object3D();
  const blocks = new Map<string, BlockEntry>();
  for (const def of DEFS) {
    const node = new THREE.Object3D();
    node.name = def.id;
    root.add(node);
    const restSphere = new THREE.Sphere(new THREE.Vector3(0, 0.5, 0), 1);
    const restBox = new THREE.Box3().setFromCenterAndSize(
      restSphere.center,
      new THREE.Vector3(1, 1, 1),
    );
    blocks.set(def.id, {
      id: def.id,
      def,
      root: node,
      meshes: [],
      rest: node.position.clone(),
      restSphere,
      sphere: restSphere.clone(),
      restBox,
      box: restBox.clone(),
    });
  }
  return {
    root,
    blocks,
    blockMeshes: new Map(),
    meshToBlock: new Map(),
    flows: new Map(),
    flowMeshes: new Map(),
    decor: new Map(),
    pickMeshes: [],
    found: DEFS.map((d) => d.id),
    missing: [],
    carSphere: new THREE.Sphere(new THREE.Vector3(), 3),
    carBox: new THREE.Box3(new THREE.Vector3(-1, 0, -2), new THREE.Vector3(1, 1.5, 2)),
  };
}

describe('createExploder', () => {
  it('leaves every block at rest when t = 0', () => {
    const assets = makeAssets();
    createExploder(assets).set(0);
    for (const entry of assets.blocks.values()) {
      expect(entry.root.position.length()).toBeCloseTo(0, 6);
    }
  });

  it('moves a top-level block a full EXPLODE_DISTANCE along its unit vector at t = 1', () => {
    const assets = makeAssets();
    createExploder(assets).set(1);
    const energy = assets.blocks.get('ENERGY')!;
    expect(energy.root.position.toArray()).toEqual([0, -EXPLODE_DISTANCE, 0]);
  });

  it('gives a nested block its parent offset plus half of its own', () => {
    const assets = makeAssets();
    createExploder(assets).set(1);
    const bms = assets.blocks.get('BMS')!;
    // parent (0,-1.6,0) + own (0,0,1) * 1.6 * 0.5
    expect(bms.root.position.x).toBeCloseTo(0, 6);
    expect(bms.root.position.y).toBeCloseTo(-EXPLODE_DISTANCE, 6);
    expect(bms.root.position.z).toBeCloseTo(EXPLODE_DISTANCE * 0.5, 6);
  });

  it('keeps VEH (zero explode vector) put at every t', () => {
    const assets = makeAssets();
    const exploder = createExploder(assets);
    for (const t of [0, 0.25, 0.5, 1]) {
      exploder.set(t);
      expect(assets.blocks.get('VEH')!.root.position.length()).toBeCloseTo(0, 6);
    }
  });

  it('shifts the cached bounding sphere by the same offset, for focus/projectBlock', () => {
    const assets = makeAssets();
    createExploder(assets).set(1);
    const energy = assets.blocks.get('ENERGY')!;
    expect(energy.sphere.center.y).toBeCloseTo(energy.restSphere.center.y - EXPLODE_DISTANCE, 6);
    expect(energy.sphere.radius).toBe(energy.restSphere.radius);
    expect(energy.box.min.y).toBeCloseTo(energy.restBox.min.y - EXPLODE_DISTANCE, 6);
    expect(energy.box.max.y).toBeCloseTo(energy.restBox.max.y - EXPLODE_DISTANCE, 6);
  });

  it('clamps t to 0..1', () => {
    const assets = makeAssets();
    const exploder = createExploder(assets);
    exploder.set(5);
    expect(exploder.value()).toBe(1);
    exploder.set(-3);
    expect(exploder.value()).toBe(0);
  });
});

describe('parseFlowName', () => {
  it('splits FLOW__<SOURCE>__<TARGET> on the double underscore', () => {
    expect(parseFlowName('FLOW__VCONTROL__POWERTRAIN')).toEqual(['VCONTROL', 'POWERTRAIN']);
  });

  it('keeps single underscores inside ids intact', () => {
    expect(parseFlowName('FLOW__THERM_CTRL__ENERGY')).toEqual(['THERM_CTRL', 'ENERGY']);
  });

  it('returns null for non-flow and malformed names', () => {
    expect(parseFlowName('POWERTRAIN')).toBeNull();
    expect(parseFlowName('DECOR_canopy')).toBeNull();
    expect(parseFlowName('FLOW__ONLYONE')).toBeNull();
    expect(parseFlowName('FLOW____EMPTY')).toBeNull();
  });
});
