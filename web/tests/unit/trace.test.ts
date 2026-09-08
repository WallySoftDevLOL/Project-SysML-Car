import { describe, expect, it } from 'vitest';
import { buildIndex } from '../../src/model/index';
import type { ModelIndex } from '../../src/model/index';
import {
  ancestors,
  childrenOf,
  descendants,
  parentsOf,
  traceForBlock,
  traceForRequirement,
  traceForTest,
  traceForUseCase,
} from '../../src/model/trace';
import { buildCyclicModel, buildFixtureModel, loadRealModel } from './fixtures';

describe('parentsOf / childrenOf / ancestors / descendants (fixture)', () => {
  const idx = buildIndex(buildFixtureModel());

  it('parentsOf walks source->target of DeriveRequirement (child -> parent)', () => {
    expect(parentsOf(idx, 'REQ_PT_1').map((r) => r.id)).toEqual(['REQ_SYS_1']);
    expect(parentsOf(idx, 'REQ_STK_1')).toEqual([]);
  });

  it('childrenOf is the inverse of parentsOf', () => {
    expect(childrenOf(idx, 'REQ_SYS_1').map((r) => r.id).sort()).toEqual(['REQ_PT_1', 'REQ_PT_2']);
    expect(childrenOf(idx, 'REQ_PT_1')).toEqual([]);
  });

  it('ancestors BFS returns the full chain with increasing depth, nearest first', () => {
    expect(ancestors(idx, 'REQ_PT_1')).toEqual([
      { id: 'REQ_SYS_1', depth: 1 },
      { id: 'REQ_STK_1', depth: 2 },
    ]);
  });

  it('descendants BFS returns every derived requirement', () => {
    const ids = descendants(idx, 'REQ_STK_1').map((r) => r.id).sort();
    expect(ids).toEqual(['REQ_PT_1', 'REQ_PT_2', 'REQ_SYS_1']);
  });
});

describe('ancestors / descendants terminate on a cyclic Derive graph', () => {
  const idx = buildIndex(buildCyclicModel());

  it('ancestors(REQ_A) does not loop forever and excludes REQ_A itself', () => {
    const result = ancestors(idx, 'REQ_A');
    const ids = result.map((r) => r.id).sort();
    expect(ids).toEqual(['REQ_B', 'REQ_C']);
    expect(result.every((r) => r.id !== 'REQ_A')).toBe(true);
  });

  it('descendants(REQ_A) does not loop forever and excludes REQ_A itself', () => {
    const result = descendants(idx, 'REQ_A');
    const ids = result.map((r) => r.id).sort();
    expect(ids).toEqual(['REQ_B', 'REQ_C']);
  });

  it('traceForRequirement completes without hanging on a cycle', () => {
    const trace = traceForRequirement(idx, 'REQ_A');
    expect(trace.self.id).toBe('REQ_A');
    // Every requirement here is level 0 (STK); REQ_A's ancestors (REQ_B, REQ_C)
    // are themselves level 0, so they count as stakeholder roots too.
    expect(trace.stakeholderRoots.map((r) => r.id).sort()).toEqual(['REQ_B', 'REQ_C']);
  });
});

describe('traceForRequirement (fixture)', () => {
  const idx = buildIndex(buildFixtureModel());

  it('groups upstream ancestors by category, level 0 first', () => {
    const trace = traceForRequirement(idx, 'REQ_PT_1');
    expect(trace.upstream.map((g) => g.category.id)).toEqual(['STK', 'SYS']);
    expect(trace.upstream[0]).toMatchObject({ level: 0, category: { id: 'STK' } });
    expect(trace.upstream[0]?.reqs.map((r) => r.id)).toEqual(['REQ_STK_1']);
    expect(trace.upstream[1]).toMatchObject({ level: 1, category: { id: 'SYS' } });
    expect(trace.upstream[1]?.reqs.map((r) => r.id)).toEqual(['REQ_SYS_1']);
  });

  it('a level-0 requirement has no upstream and no stakeholder roots', () => {
    const trace = traceForRequirement(idx, 'REQ_STK_1');
    expect(trace.upstream).toEqual([]);
    expect(trace.stakeholderRoots).toEqual([]);
  });

  it('derived lists every transitively-derived requirement', () => {
    const trace = traceForRequirement(idx, 'REQ_STK_1');
    expect(trace.derived.map((r) => r.id).sort()).toEqual(['REQ_PT_1', 'REQ_PT_2', 'REQ_SYS_1']);
  });

  it('blocks.direct / blocks.inherited split satisfiers by distance', () => {
    const sys = traceForRequirement(idx, 'REQ_SYS_1');
    expect(sys.blocks.direct).toEqual([]);
    expect(sys.blocks.inherited.map((b) => b.id).sort()).toEqual(['PARTA', 'PARTA_CHILD']);

    const pt1 = traceForRequirement(idx, 'REQ_PT_1');
    expect(pt1.blocks.direct.map((b) => b.id)).toEqual(['PARTA']);
    expect(pt1.blocks.inherited).toEqual([]);
  });

  it('tests.direct / tests.inherited mirror blocks', () => {
    const sys = traceForRequirement(idx, 'REQ_SYS_1');
    expect(sys.tests.direct).toEqual([]);
    expect(sys.tests.inherited.map((t) => t.id)).toEqual(['TC_1']);
  });

  it('useCases (Trace), refiners (Refine), copies (Copy) resolve for REQ_PT_1', () => {
    const trace = traceForRequirement(idx, 'REQ_PT_1');
    expect(trace.useCases.map((u) => u.id)).toEqual(['UC_1']);
    expect(trace.refiners.map((c) => c.id)).toEqual(['CB_1']);
    expect(trace.copies.map((c) => c.id)).toEqual(['REQ_COPY_1']);
  });

  it('stakeholderRoots finds the level-0 ancestor', () => {
    expect(traceForRequirement(idx, 'REQ_PT_1').stakeholderRoots.map((r) => r.id)).toEqual(['REQ_STK_1']);
  });

  it('throws a readable error for an unknown id', () => {
    expect(() => traceForRequirement(idx, 'nope')).toThrow(/nope/);
  });
});

describe('traceForBlock (fixture)', () => {
  const idx = buildIndex(buildFixtureModel());

  it('PARTA: reqCount, testCount, flows, hierarchy', () => {
    const trace = traceForBlock(idx, 'PARTA');
    expect(trace.allReqs.map((r) => r.id)).toEqual(['REQ_PT_1']);
    expect(trace.reqCount).toBe(1);
    expect(trace.testCount).toBe(1);
    expect(trace.tests.map((t) => t.id)).toEqual(['TC_1']);
    expect(trace.useCases.map((u) => u.id)).toEqual(['UC_1']);
    expect(trace.stakeholderRoots.map((r) => r.id)).toEqual(['REQ_STK_1']);
    expect(trace.flows.out.map((f) => f.meshName)).toEqual(['FLOW__PARTA__PARTB']);
    expect(trace.flows.in).toEqual([]);
    expect(trace.parent?.id).toBe('ROOT');
    expect(trace.children.map((c) => c.id)).toEqual(['PARTA_CHILD']);
  });

  it('ROOT: satisfies only the stakeholder requirement directly', () => {
    const trace = traceForBlock(idx, 'ROOT');
    expect(trace.reqCount).toBe(1);
    expect(trace.allReqs[0]?.id).toBe('REQ_STK_1');
    expect(trace.parent).toBeUndefined();
    expect(trace.children.map((c) => c.id)).toEqual(['PARTA', 'PARTB']);
  });

  it('throws a readable error for an unknown id', () => {
    expect(() => traceForBlock(idx, 'nope')).toThrow(/nope/);
  });
});

describe('traceForTest / traceForUseCase (fixture)', () => {
  const idx = buildIndex(buildFixtureModel());

  it('traceForTest resolves verified reqs and their satisfying blocks', () => {
    const trace = traceForTest(idx, 'TC_1');
    expect(trace.reqs.map((r) => r.id)).toEqual(['REQ_PT_1']);
    expect(trace.blocks.map((b) => b.id)).toEqual(['PARTA']);
  });

  it('traceForUseCase resolves allocated blocks, traced reqs, and actors', () => {
    const trace = traceForUseCase(idx, 'UC_1');
    expect(trace.blocks.map((b) => b.id)).toEqual(['PARTA']);
    expect(trace.reqs.map((r) => r.id)).toEqual(['REQ_PT_1']);
    expect(trace.included).toEqual([]);
    expect(trace.extended).toEqual([]);
    expect(trace.actors.map((a) => a.id)).toEqual(['ACTOR_1']);
  });
});

describe('real data/model.json', () => {
  const idx = buildIndex(loadRealModel());

  it('traceForBlock reqCount matches direct Satisfy counts for POWERTRAIN/ENERGY/VEH', () => {
    expect(traceForBlock(idx, 'POWERTRAIN').reqCount).toBe(11);
    expect(traceForBlock(idx, 'ENERGY').reqCount).toBe(9);
    expect(traceForBlock(idx, 'VEH').reqCount).toBe(7);
  });

  it('the DeriveRequirement graph is acyclic', () => {
    const reqs = idx.requirements(false);
    for (const req of reqs) {
      const chain = ancestors(idx, req.id).map((a) => a.id);
      expect(chain.includes(req.id)).toBe(false);
    }
  });

  it('at least 95% of non-level-0 authoritative requirements reach a level-0 (stakeholder) ancestor', () => {
    const nonLevel0 = idx.requirements(true).filter((r) => idx.categoryOf(r.id)?.level !== 0);
    const offenders = nonLevel0.filter((r) => traceForRequirement(idx, r.id).stakeholderRoots.length === 0);
    if (offenders.length > 0) {
      // eslint-disable-next-line no-console
      console.log(
        'Requirements with no stakeholder-level ancestor:',
        offenders.map((r) => r.displayId ?? r.id),
      );
    }
    const ratio = (nonLevel0.length - offenders.length) / nonLevel0.length;
    expect(ratio).toBeGreaterThanOrEqual(0.95);
  });

  it('highlight-relevant trace: STK-003 is satisfied by VEH, and its derived SYS-002 by POWERTRAIN', () => {
    const trace = traceForRequirement(idx, 'REQ_STK_003');
    expect(trace.blocks.direct.map((b) => b.id)).toEqual(['VEH']);
    expect(trace.derived.some((r) => r.id === 'REQ_SYS_002')).toBe(true);
    expect(trace.blocks.inherited.map((b) => b.id)).toContain('POWERTRAIN');
  });
});
