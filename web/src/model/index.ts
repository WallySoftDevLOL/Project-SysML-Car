// Builds an in-memory index over a parsed ModelJson so the rest of the app
// (scene + ui, and model/trace.ts, model/highlight.ts, model/search.ts in
// this module) never has to linear-scan `elements`/`relationships` itself.
import type { Category, Element, Flow, ModelJson, Parametric, Relationship } from './schema';
import { behaviorIndex, type BehaviorIndex } from './behavior';

export interface ModelIndex {
  /** The underlying parsed model, for consumers that need raw arrays (e.g. search.ts). */
  model: ModelJson;

  /** Every element, keyed by id. */
  byId: Map<string, Element>;
  /** Every element, grouped by its `kind`. */
  byKind: Map<string, Element[]>;

  /** Relationships keyed by their `source` id (i.e. rel.source === id). */
  out: Map<string, Relationship[]>;
  /** Relationships keyed by their `target` id (i.e. rel.target === id). */
  in: Map<string, Relationship[]>;
  /** Relationships with `source === id` and `type === type`. */
  outBy(id: string, type: string): Relationship[];
  /** Relationships with `target === id` and `type === type`. */
  inBy(id: string, type: string): Relationship[];

  /**
   * All 23 real (meshed) blocks — the 13 systems and 10 components of
   * `data/blocks.json` (contract section 1) — in hierarchy order: VEH, then
   * each system followed immediately by its own components, in catalog
   * order. Derived straight from `model.hierarchy` (the converter emits
   * each parent's children in `data/blocks.json` order, contract section 2),
   * so no separate ordering table is needed here.
   */
  blocks: Element[];
  /** The 13 `tier: "system"` blocks (incl. VEH), in the same order as {@link blocks}. */
  systems: Element[];
  /** The 10 `tier: "component"` blocks, in the same order as {@link blocks}. */
  components: Element[];
  /** A block's `tier` ("system" | "component"), or `undefined` if `id` isn't a Block (or has no `tier`, e.g. pre-catalog data). */
  tierOf(id: string): string | undefined;

  /** Categories keyed by id (e.g. "STK", "SYS", "PT"). */
  categories: Map<string, Category>;
  /** The Category of a requirement (or any element with a matching `category` field), if any. */
  categoryOf(reqId: string): Category | undefined;

  /** The 9 block-to-block flows, pass-through from `model.flows`. */
  flows: Flow[];

  /** Block id -> direct child block ids, pass-through from `model.hierarchy`. */
  hierarchy: Record<string, string[]>;
  /** The parent Block element of a block, if any (undefined for the root, VEH). */
  parentOf(blockId: string): Element | undefined;
  /** The direct child Block elements of a block (empty if it has none). */
  childrenOf(blockId: string): Element[];

  /** All Requirement elements; `authoritativeOnly` (default true) excludes VER-category copies. */
  requirements(authoritativeOnly?: boolean): Element[];

  /**
   * Display label: a block's plain-language `label` (or, for a sub-part
   * block with no `label` — contract section 6 — its `role` humanised, e.g.
   * `tractionMotor` -> "Traction motor"), a requirement's
   * "SYS-002 Propulsion Delivery", else `name`.
   */
  displayName(id: string): string;

  /** Behavior queries (state machines, activities, interactions) over this model — see `model/behavior.ts`. */
  behavior: BehaviorIndex;
  /** `model.parametrics`, pass-through (`[]` if the converter hasn't emitted section 6 yet). */
  parametrics: Parametric[];
  /** `model.parametrics` keyed by id. */
  parametricById: Map<string, Parametric>;
}

export function buildIndex(model: ModelJson): ModelIndex {
  const byId = new Map<string, Element>();
  const byKind = new Map<string, Element[]>();
  for (const el of model.elements) {
    byId.set(el.id, el);
    const list = byKind.get(el.kind);
    if (list) list.push(el);
    else byKind.set(el.kind, [el]);
  }

  const out = new Map<string, Relationship[]>();
  const inMap = new Map<string, Relationship[]>();
  for (const rel of model.relationships) {
    const outList = out.get(rel.source);
    if (outList) outList.push(rel);
    else out.set(rel.source, [rel]);

    const inList = inMap.get(rel.target);
    if (inList) inList.push(rel);
    else inMap.set(rel.target, [rel]);
  }

  function outBy(id: string, type: string): Relationship[] {
    return (out.get(id) ?? []).filter((r) => r.type === type);
  }
  function inBy(id: string, type: string): Relationship[] {
    return (inMap.get(id) ?? []).filter((r) => r.type === type);
  }

  const categories = new Map<string, Category>();
  for (const c of model.categories) categories.set(c.id, c);

  function categoryOf(reqId: string): Category | undefined {
    const el = byId.get(reqId);
    const catId = el?.category;
    if (typeof catId !== 'string') return undefined;
    return categories.get(catId);
  }

  // `model.hierarchy` lists each parent's children in `data/blocks.json`
  // catalog order (contract section 2: the converter builds it straight off
  // the hand-authored blocks.json, not sorted). That's exactly the display
  // order the UI wants, so `blocks`/`childrenOf` use it directly rather than
  // re-deriving/overriding order with a separate table.
  function childIdsOf(blockId: string): string[] {
    return model.hierarchy[blockId] ?? [];
  }

  function parentOf(blockId: string): Element | undefined {
    const el = byId.get(blockId);
    const parentId = el?.parent;
    return typeof parentId === 'string' ? byId.get(parentId) : undefined;
  }

  function childrenOf(blockId: string): Element[] {
    const result: Element[] = [];
    for (const id of childIdsOf(blockId)) {
      const el = byId.get(id);
      if (el) result.push(el);
    }
    return result;
  }

  // The 23 real, clickable blocks are the ones carrying a `mesh` (the
  // abstract SysML block VEH_SUBSYSTEM, generalized-to by every subsystem,
  // has neither a mesh nor a parent and is excluded).
  const meshedBlocks = model.elements.filter((e) => e.kind === 'Block' && typeof e.mesh === 'string');
  const meshedIds = new Set(meshedBlocks.map((b) => b.id));
  const roots = meshedBlocks.filter((b) => typeof b.parent !== 'string' || !meshedIds.has(b.parent)).map((b) => b.id);

  const blocks: Element[] = [];
  const visited = new Set<string>();
  function visit(id: string): void {
    if (visited.has(id)) return; // guards against a malformed cyclic hierarchy
    visited.add(id);
    const el = byId.get(id);
    if (el) blocks.push(el);
    for (const childId of childIdsOf(id)) {
      if (meshedIds.has(childId)) visit(childId);
    }
  }
  for (const rootId of roots) visit(rootId);

  const systems = blocks.filter((b) => b.tier === 'system');
  const components = blocks.filter((b) => b.tier === 'component');

  function tierOf(id: string): string | undefined {
    const tier = byId.get(id)?.tier;
    return typeof tier === 'string' ? tier : undefined;
  }

  function requirements(authoritativeOnly = true): Element[] {
    const reqs = byKind.get('Requirement') ?? [];
    return authoritativeOnly ? reqs.filter((r) => r.authoritative !== false) : reqs;
  }

  /** `tractionMotor` -> "Traction motor" (contract section 6 `role`, used as a display fallback for label-less sub-part blocks). */
  function humanizeRole(role: string): string {
    const spaced = role.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  }

  function displayName(id: string): string {
    const el = byId.get(id);
    if (!el) return id;
    if (el.kind === 'Block') {
      if (typeof el.label === 'string') return el.label;
      if (typeof el.role === 'string') return humanizeRole(el.role);
      return el.name;
    }
    if (el.kind === 'Requirement') return el.displayId ? `${el.displayId} ${el.name}` : el.name;
    return el.name;
  }

  const parametrics = model.parametrics ?? [];
  const parametricById = new Map<string, Parametric>();
  for (const p of parametrics) parametricById.set(p.id, p);

  return {
    model,
    byId,
    byKind,
    out,
    in: inMap,
    outBy,
    inBy,
    blocks,
    systems,
    components,
    tierOf,
    categories,
    categoryOf,
    flows: model.flows,
    hierarchy: model.hierarchy,
    parentOf,
    childrenOf,
    requirements,
    displayName,
    behavior: behaviorIndex(model),
    parametrics,
    parametricById,
  };
}
