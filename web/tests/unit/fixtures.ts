// Hand-written ModelJson fixtures shared by the model/* unit tests. Kept
// deliberately small and richer than tests/fixtures/model.sample.json (which
// schema.test.ts owns) so every relationship type the model/ layer cares
// about — DeriveRequirement, Satisfy, Verify, Trace, Refine, Copy, Allocate,
// Association, ItemFlow — has at least one example, plus a hierarchy with a
// grandchild block.
import type { ModelJson } from '../../src/model/schema';
// The real, generated data file (168 elements, 271 relationships, 9 flows).
// Statically imported (resolveJsonModule) rather than read via node:fs so
// this stays typecheckable without @types/node, which this browser-only
// project doesn't otherwise need.
import realModelJson from '../../../data/model.json';

/** The real data/model.json. Re-parsed fresh each call so tests can't leak mutations to each other. */
export function loadRealModel(): ModelJson {
  return JSON.parse(JSON.stringify(realModelJson)) as ModelJson;
}

function meta(): ModelJson['meta'] {
  return { schema: 1, sourceFile: 'fixture', sourceSha256: '0'.repeat(64), converter: 'fixture' };
}

/**
 * A small, acyclic model:
 *
 * Requirements: REQ_STK_1 (STK, level 0)
 *            <- REQ_SYS_1 (SYS, level 1)
 *            <- REQ_PT_1, REQ_PT_2 (PT, level 2, siblings)
 *   REQ_COPY_1 (VER, non-authoritative) Copies REQ_PT_1.
 *
 * Blocks: ROOT -> PARTA -> PARTA_CHILD, ROOT -> PARTB. A flow runs
 * PARTA -> PARTB.
 *
 * ROOT Satisfies REQ_STK_1; PARTA Satisfies REQ_PT_1; PARTA_CHILD Satisfies
 * REQ_PT_2. TC_1 Verifies REQ_PT_1. UC_1 Traces REQ_PT_1 and is Allocated to
 * PARTA. CB_1 Refines REQ_PT_1. ACTOR_1 is Associated with UC_1.
 */
export function buildFixtureModel(): ModelJson {
  return {
    meta: meta(),
    categories: [
      { id: 'STK', name: 'Stakeholder', plain: 'Stakeholder', level: 0 },
      { id: 'SYS', name: 'System', plain: 'System', level: 1 },
      { id: 'PT', name: 'Subsystem - Part A', plain: 'Part A', level: 2, block: 'PARTA' },
      { id: 'VER', name: 'Verification View Copy', plain: 'Copies', level: 3 },
    ],
    elements: [
      {
        id: 'REQ_STK_1',
        kind: 'Requirement',
        displayId: 'STK-1',
        category: 'STK',
        name: 'Top Level Need',
        text: 'The vehicle shall exist.',
        authoritative: true,
      },
      {
        id: 'REQ_SYS_1',
        kind: 'Requirement',
        displayId: 'SYS-1',
        category: 'SYS',
        name: 'System Behavior',
        text: 'The system shall behave.',
        authoritative: true,
      },
      {
        id: 'REQ_PT_1',
        kind: 'Requirement',
        displayId: 'PT-1',
        category: 'PT',
        name: 'Part A Behavior',
        text: 'Part A shall do a thing.',
        authoritative: true,
      },
      {
        id: 'REQ_PT_2',
        kind: 'Requirement',
        displayId: 'PT-2',
        category: 'PT',
        name: 'Part A Efficiency',
        text: 'Part A shall be efficient.',
        authoritative: true,
      },
      {
        id: 'REQ_COPY_1',
        kind: 'Requirement',
        displayId: 'VER-PT-1',
        category: 'VER',
        name: 'Verification Copy — Part A Behavior',
        text: 'Copy of PT-1.',
        authoritative: false,
        copyOf: 'REQ_PT_1',
      },
      {
        id: 'ROOT',
        kind: 'Block',
        name: 'RootVehicle',
        label: 'Whole thing',
        blurb: 'The root block.',
        mesh: 'ROOT',
        parent: null,
        color: '#000000',
        alpha: 0.35,
        explode: [0, 0, 0],
      },
      {
        id: 'PARTA',
        kind: 'Block',
        name: 'PartASystem',
        label: 'Part A',
        blurb: 'A subsystem.',
        mesh: 'PARTA',
        parent: 'ROOT',
        color: '#111111',
        alpha: 1,
        explode: [1, 0, 0],
      },
      {
        id: 'PARTA_CHILD',
        kind: 'Block',
        name: 'PartAChild',
        label: 'Part A child',
        blurb: 'A sub-subsystem.',
        mesh: 'PARTA_CHILD',
        parent: 'PARTA',
        color: '#222222',
        alpha: 1,
        explode: [1, 1, 0],
      },
      {
        id: 'PARTB',
        kind: 'Block',
        name: 'PartBSystem',
        label: 'Part B',
        blurb: 'Another subsystem.',
        mesh: 'PARTB',
        parent: 'ROOT',
        color: '#333333',
        alpha: 1,
        explode: [-1, 0, 0],
      },
      { id: 'TC_1', kind: 'TestCase', name: 'Part A Test' },
      { id: 'UC_1', kind: 'UseCase', name: 'Use Part A' },
      { id: 'ACTOR_1', kind: 'Actor', name: 'Operator' },
      { id: 'CB_1', kind: 'ConstraintBlock', name: 'PartAEquation' },
    ],
    relationships: [
      { id: 'SAT_ROOT', type: 'Satisfy', source: 'ROOT', target: 'REQ_STK_1' },
      { id: 'SAT_PARTA', type: 'Satisfy', source: 'PARTA', target: 'REQ_PT_1' },
      { id: 'SAT_PARTA_CHILD', type: 'Satisfy', source: 'PARTA_CHILD', target: 'REQ_PT_2' },
      { id: 'VER_TC_1', type: 'Verify', source: 'TC_1', target: 'REQ_PT_1' },
      { id: 'DER_SYS_1', type: 'DeriveRequirement', source: 'REQ_SYS_1', target: 'REQ_STK_1' },
      { id: 'DER_PT_1', type: 'DeriveRequirement', source: 'REQ_PT_1', target: 'REQ_SYS_1' },
      { id: 'DER_PT_2', type: 'DeriveRequirement', source: 'REQ_PT_2', target: 'REQ_SYS_1' },
      { id: 'TRACE_UC_1', type: 'Trace', source: 'UC_1', target: 'REQ_PT_1' },
      { id: 'REF_CB_1', type: 'Refine', source: 'CB_1', target: 'REQ_PT_1' },
      { id: 'COPY_1', type: 'Copy', source: 'REQ_COPY_1', target: 'REQ_PT_1' },
      { id: 'ALLOC_UC_1', type: 'Allocate', source: 'UC_1', target: 'PARTA' },
      { id: 'ASSOC_1', type: 'Association', source: 'ACTOR_1', target: 'UC_1' },
      {
        id: 'FLOW_REL_1',
        type: 'ItemFlow',
        source: 'PARTA',
        target: 'PARTB',
        extra: { item: 'Widget', connector: 'CONN_A_B' },
      },
    ],
    flows: [
      { id: 'CONN_A_B', source: 'PARTA', target: 'PARTB', item: 'Widget', label: 'Widget flow', meshName: 'FLOW__PARTA__PARTB' },
    ],
    hierarchy: {
      ROOT: ['PARTA', 'PARTB'],
      PARTA: ['PARTA_CHILD'],
    },
    stats: {
      requirements: 4,
      copies: 1,
      traceRelationships: 9,
      allRelationships: 13,
      blocks: 4,
      flows: 1,
    },
  };
}

/**
 * A minimal model whose DeriveRequirement edges form a 3-cycle:
 * REQ_A -> REQ_B -> REQ_C -> REQ_A (source = derived/child, target = parent,
 * so this reads as "A derived from B derived from C derived from A").
 * Exists purely to prove ancestors()/descendants()/traceForRequirement()
 * terminate instead of looping forever on malformed data.
 */
export function buildCyclicModel(): ModelJson {
  return {
    meta: meta(),
    categories: [{ id: 'STK', name: 'Stakeholder', plain: 'Stakeholder', level: 0 }],
    elements: [
      { id: 'REQ_A', kind: 'Requirement', displayId: 'STK-A', category: 'STK', name: 'Req A', authoritative: true },
      { id: 'REQ_B', kind: 'Requirement', displayId: 'STK-B', category: 'STK', name: 'Req B', authoritative: true },
      { id: 'REQ_C', kind: 'Requirement', displayId: 'STK-C', category: 'STK', name: 'Req C', authoritative: true },
    ],
    relationships: [
      { id: 'DER_A_B', type: 'DeriveRequirement', source: 'REQ_A', target: 'REQ_B' },
      { id: 'DER_B_C', type: 'DeriveRequirement', source: 'REQ_B', target: 'REQ_C' },
      { id: 'DER_C_A', type: 'DeriveRequirement', source: 'REQ_C', target: 'REQ_A' },
    ],
    flows: [],
    hierarchy: {},
    stats: { requirements: 3, copies: 0, traceRelationships: 3, allRelationships: 3, blocks: 0, flows: 0 },
  };
}
