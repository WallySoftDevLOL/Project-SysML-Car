// Requirement/block/test/use-case traceability queries built on top of
// ModelIndex. DeriveRequirement direction (docs/model-contract.md section 2):
// `source` is the *derived* (child) requirement, `target` is its parent, so
// walking source->target climbs toward stakeholder-level requirements.
import type { Category, Element, Flow } from './schema';
import type { ModelIndex } from './index';

/** One hop up the DeriveRequirement chain: the requirement(s) `reqId` was derived from. */
export function parentsOf(idx: ModelIndex, reqId: string): Element[] {
  return idx
    .outBy(reqId, 'DeriveRequirement')
    .map((r) => idx.byId.get(r.target))
    .filter((e): e is Element => e !== undefined);
}

/** One hop down the DeriveRequirement chain: the requirement(s) derived from `reqId`. */
export function childrenOf(idx: ModelIndex, reqId: string): Element[] {
  return idx
    .inBy(reqId, 'DeriveRequirement')
    .map((r) => idx.byId.get(r.source))
    .filter((e): e is Element => e !== undefined);
}

export interface LeveledRef {
  id: string;
  depth: number;
}

/**
 * Every requirement `reqId` (transitively) derives from, via BFS up
 * {@link parentsOf}, nearest first. A `visited` set (seeded with `reqId`
 * itself) makes this terminate even if the Derive graph has a cycle —
 * malformed data should degrade to "stops", never hang.
 */
export function ancestors(idx: ModelIndex, reqId: string): LeveledRef[] {
  return bfs(reqId, (id) => parentsOf(idx, id));
}

/** Every requirement (transitively) derived from `reqId`, via BFS down {@link childrenOf}. Same cycle-safety as {@link ancestors}. */
export function descendants(idx: ModelIndex, reqId: string): LeveledRef[] {
  return bfs(reqId, (id) => childrenOf(idx, id));
}

function bfs(startId: string, neighbors: (id: string) => Element[]): LeveledRef[] {
  const result: LeveledRef[] = [];
  const visited = new Set<string>([startId]);
  let frontier = [startId];
  let depth = 0;
  while (frontier.length > 0) {
    depth += 1;
    const next: string[] = [];
    for (const cur of frontier) {
      for (const neighbor of neighbors(cur)) {
        if (visited.has(neighbor.id)) continue;
        visited.add(neighbor.id);
        result.push({ id: neighbor.id, depth });
        next.push(neighbor.id);
      }
    }
    frontier = next;
  }
  return result;
}

function byDisplayIdThenName(a: Element, b: Element): number {
  const ak = a.displayId ?? a.name;
  const bk = b.displayId ?? b.name;
  return ak.localeCompare(bk);
}

function dedupeById(elements: Element[]): Element[] {
  const seen = new Set<string>();
  const result: Element[] = [];
  for (const el of elements) {
    if (seen.has(el.id)) continue;
    seen.add(el.id);
    result.push(el);
  }
  return result;
}

/** Blocks that directly `Satisfy` a requirement. */
function directSatisfiers(idx: ModelIndex, reqId: string): Element[] {
  return idx
    .inBy(reqId, 'Satisfy')
    .map((r) => idx.byId.get(r.source))
    .filter((e): e is Element => e !== undefined && e.kind === 'Block');
}

/** TestCases that directly `Verify` a requirement. */
function directVerifiers(idx: ModelIndex, reqId: string): Element[] {
  return idx
    .inBy(reqId, 'Verify')
    .map((r) => idx.byId.get(r.source))
    .filter((e): e is Element => e !== undefined && e.kind === 'TestCase');
}

export interface UpstreamGroup {
  level: number;
  category: Category;
  reqs: Element[];
}

export interface RequirementTrace {
  self: Element;
  /** Ancestor requirements grouped by category, level 0 (stakeholder) first. A level only appears if an ancestor actually lands there. */
  upstream: UpstreamGroup[];
  /** Every requirement (transitively) derived from this one. */
  derived: Element[];
  blocks: { direct: Element[]; inherited: Element[] };
  tests: { direct: Element[]; inherited: Element[] };
  /** UseCases that directly Trace this requirement. */
  useCases: Element[];
  /** ConstraintBlocks/Operations that Refine this requirement. */
  refiners: Element[];
  /** Verification-view Requirement copies (Copy relationships targeting this requirement). */
  copies: Element[];
  /** Deduped level-0 ancestors; empty if this requirement has none (e.g. it IS level 0, or the chain is broken). */
  stakeholderRoots: Element[];
}

export function traceForRequirement(idx: ModelIndex, id: string): RequirementTrace {
  const self = idx.byId.get(id);
  if (!self) {
    throw new Error(`traceForRequirement: no such element "${id}"`);
  }

  const ancestorRefs = ancestors(idx, id);
  const descendantRefs = descendants(idx, id);

  const groups = new Map<string, UpstreamGroup>();
  for (const ref of ancestorRefs) {
    const category = idx.categoryOf(ref.id);
    const el = idx.byId.get(ref.id);
    if (!category || !el) continue;
    let group = groups.get(category.id);
    if (!group) {
      group = { level: category.level, category, reqs: [] };
      groups.set(category.id, group);
    }
    group.reqs.push(el);
  }
  const upstream = [...groups.values()]
    .map((g) => ({ ...g, reqs: [...g.reqs].sort(byDisplayIdThenName) }))
    .sort((a, b) => (a.level !== b.level ? a.level - b.level : a.category.id.localeCompare(b.category.id)));

  const derived = descendantRefs
    .map((ref) => idx.byId.get(ref.id))
    .filter((e): e is Element => e !== undefined)
    .sort(byDisplayIdThenName);

  const directBlocks = directSatisfiers(idx, id);
  const directBlockIds = new Set(directBlocks.map((b) => b.id));
  const inheritedBlocks = dedupeById(descendantRefs.flatMap((ref) => directSatisfiers(idx, ref.id))).filter(
    (b) => !directBlockIds.has(b.id),
  );

  const directTests = directVerifiers(idx, id);
  const directTestIds = new Set(directTests.map((t) => t.id));
  const inheritedTests = dedupeById(descendantRefs.flatMap((ref) => directVerifiers(idx, ref.id))).filter(
    (t) => !directTestIds.has(t.id),
  );

  const useCases = idx
    .inBy(id, 'Trace')
    .map((r) => idx.byId.get(r.source))
    .filter((e): e is Element => e !== undefined && e.kind === 'UseCase');

  const refiners = idx
    .inBy(id, 'Refine')
    .map((r) => idx.byId.get(r.source))
    .filter((e): e is Element => e !== undefined && (e.kind === 'ConstraintBlock' || e.kind === 'Operation'));

  const copies = idx
    .inBy(id, 'Copy')
    .map((r) => idx.byId.get(r.source))
    .filter((e): e is Element => e !== undefined);

  const stakeholderRoots = dedupeById(
    ancestorRefs
      .filter((ref) => idx.categoryOf(ref.id)?.level === 0)
      .map((ref) => idx.byId.get(ref.id))
      .filter((e): e is Element => e !== undefined),
  );

  return {
    self,
    upstream,
    derived,
    blocks: { direct: directBlocks, inherited: inheritedBlocks },
    tests: { direct: directTests, inherited: inheritedTests },
    useCases,
    refiners,
    copies,
    stakeholderRoots,
  };
}

/** A `Flow` traced onto a component's `BlockTrace`, borrowed from its parent system. */
export interface TracedFlow extends Flow {
  /** True when this flow belongs to the block's parent, not the block itself (contract: components aren't a flow endpoint). */
  viaParent?: boolean;
}

/** A component's inherited direct requirements/tests (contract: components satisfy nothing directly). */
export interface InheritedTrace {
  from: Element;
  reqs: Element[];
  tests: Element[];
}

export interface BlockTrace {
  block: Element;
  /** Directly satisfied requirements, grouped by category. Empty for a component (it satisfies nothing directly) — see `inherited`. */
  reqsByCategory: Array<{ category: Category; reqs: Element[] }>;
  /** The same requirements, flat. Empty for a component — see `inherited`. */
  allReqs: Element[];
  /** Deduped level-0 ancestors of every requirement this block satisfies. */
  stakeholderRoots: Element[];
  /** TestCases verifying any requirement this block satisfies. Empty for a component — see `inherited`. */
  tests: Element[];
  /** UseCases allocated to this block, plus UseCases tracing any of its requirements. */
  useCases: Element[];
  /** This block's own flows, or — for a component — its parent's flows, each tagged `viaParent: true`. */
  flows: { out: TracedFlow[]; in: TracedFlow[] };
  parent: Element | undefined;
  children: Element[];
  /** `inherited.tests.length` when `isInherited`, else `tests.length`. */
  testCount: number;
  /** `inherited.reqs.length` when `isInherited`, else `allReqs.length`. */
  reqCount: number;
  /** True for a `tier: "component"` block with a parent: `reqCount`/`testCount` report `inherited`'s counts, not this block's own (empty) direct Satisfy/Verify edges. */
  isInherited: boolean;
  /** Present only when `isInherited`: the parent system's own direct requirements/tests. */
  inherited?: InheritedTrace;
}

export function traceForBlock(idx: ModelIndex, blockId: string): BlockTrace {
  const block = idx.byId.get(blockId);
  if (!block) {
    throw new Error(`traceForBlock: no such element "${blockId}"`);
  }

  const allReqs = dedupeById(
    idx
      .outBy(blockId, 'Satisfy')
      .map((r) => idx.byId.get(r.target))
      .filter((e): e is Element => e !== undefined),
  ).sort(byDisplayIdThenName);

  const byCategory = new Map<string, { category: Category; reqs: Element[] }>();
  for (const req of allReqs) {
    const category = idx.categoryOf(req.id);
    if (!category) continue;
    let group = byCategory.get(category.id);
    if (!group) {
      group = { category, reqs: [] };
      byCategory.set(category.id, group);
    }
    group.reqs.push(req);
  }
  const reqsByCategory = [...byCategory.values()].sort((a, b) =>
    a.category.level !== b.category.level ? a.category.level - b.category.level : a.category.id.localeCompare(b.category.id),
  );

  const stakeholderRoots = dedupeById(
    allReqs.flatMap((req) => ancestors(idx, req.id).filter((ref) => idx.categoryOf(ref.id)?.level === 0))
      .map((ref) => idx.byId.get(ref.id))
      .filter((e): e is Element => e !== undefined),
  );

  const tests = dedupeById(allReqs.flatMap((req) => directVerifiers(idx, req.id)));

  const allocatedUseCases = idx
    .inBy(blockId, 'Allocate')
    .map((r) => idx.byId.get(r.source))
    .filter((e): e is Element => e !== undefined && e.kind === 'UseCase');
  const tracedUseCases = allReqs.flatMap((req) =>
    idx
      .inBy(req.id, 'Trace')
      .map((r) => idx.byId.get(r.source))
      .filter((e): e is Element => e !== undefined && e.kind === 'UseCase'),
  );
  const useCases = dedupeById([...allocatedUseCases, ...tracedUseCases]);

  const parent = idx.parentOf(blockId);

  // Components satisfy nothing directly and aren't a flow endpoint (contract
  // section 1: Satisfy/flows stay at system granularity) -- so a component's
  // own reqCount/testCount/flows would otherwise always read as zero. Fall
  // back to the parent system's direct requirements/tests/flows instead,
  // tagging the flows `viaParent: true` so callers can tell them apart.
  const isInherited = block.tier === 'component' && parent !== undefined;

  let flowsOut: TracedFlow[] = idx.flows.filter((f) => f.source === blockId);
  let flowsIn: TracedFlow[] = idx.flows.filter((f) => f.target === blockId);
  let inherited: InheritedTrace | undefined;
  let reqCount = allReqs.length;
  let testCount = tests.length;

  if (isInherited && parent) {
    const parentReqs = dedupeById(
      idx
        .outBy(parent.id, 'Satisfy')
        .map((r) => idx.byId.get(r.target))
        .filter((e): e is Element => e !== undefined),
    ).sort(byDisplayIdThenName);
    const parentTests = dedupeById(parentReqs.flatMap((req) => directVerifiers(idx, req.id)));

    inherited = { from: parent, reqs: parentReqs, tests: parentTests };
    reqCount = parentReqs.length;
    testCount = parentTests.length;
    flowsOut = idx.flows.filter((f) => f.source === parent.id).map((f) => ({ ...f, viaParent: true }));
    flowsIn = idx.flows.filter((f) => f.target === parent.id).map((f) => ({ ...f, viaParent: true }));
  }

  return {
    block,
    reqsByCategory,
    allReqs,
    stakeholderRoots,
    tests,
    useCases,
    flows: { out: flowsOut, in: flowsIn },
    parent,
    children: idx.childrenOf(blockId),
    testCount,
    reqCount,
    isInherited,
    inherited,
  };
}

export interface TestTrace {
  test: Element;
  /** Requirements this test verifies. */
  reqs: Element[];
  /** Blocks that directly satisfy any of those requirements. */
  blocks: Element[];
}

export function traceForTest(idx: ModelIndex, id: string): TestTrace {
  const test = idx.byId.get(id);
  if (!test) {
    throw new Error(`traceForTest: no such element "${id}"`);
  }

  const reqs = idx
    .outBy(id, 'Verify')
    .map((r) => idx.byId.get(r.target))
    .filter((e): e is Element => e !== undefined)
    .sort(byDisplayIdThenName);

  const blocks = dedupeById(reqs.flatMap((req) => directSatisfiers(idx, req.id)));

  return { test, reqs, blocks };
}

export interface UseCaseTrace {
  useCase: Element;
  /** Blocks this use case is Allocated to. */
  blocks: Element[];
  /** Requirements this use case Traces. */
  reqs: Element[];
  /** UseCases this use case Includes. */
  included: Element[];
  /** UseCases that Extend this use case. */
  extended: Element[];
  /** Actors associated with this use case (Association targeting it). */
  actors: Element[];
}

export function traceForUseCase(idx: ModelIndex, id: string): UseCaseTrace {
  const useCase = idx.byId.get(id);
  if (!useCase) {
    throw new Error(`traceForUseCase: no such element "${id}"`);
  }

  const blocks = idx
    .outBy(id, 'Allocate')
    .map((r) => idx.byId.get(r.target))
    .filter((e): e is Element => e !== undefined && e.kind === 'Block');

  const reqs = idx
    .outBy(id, 'Trace')
    .map((r) => idx.byId.get(r.target))
    .filter((e): e is Element => e !== undefined)
    .sort(byDisplayIdThenName);

  const included = idx
    .outBy(id, 'Include')
    .map((r) => idx.byId.get(r.target))
    .filter((e): e is Element => e !== undefined);

  const extended = idx
    .inBy(id, 'Extend')
    .map((r) => idx.byId.get(r.source))
    .filter((e): e is Element => e !== undefined);

  const actors = idx
    .inBy(id, 'Association')
    .map((r) => idx.byId.get(r.source))
    .filter((e): e is Element => e !== undefined && e.kind === 'Actor');

  return { useCase, blocks, reqs, included, extended, actors };
}
