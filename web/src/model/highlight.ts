// Scene highlight state (src/model/schema.ts HighlightState) for whatever is
// currently selected in the UI. Pure function of (ModelIndex, Selection) so
// the scene/ui agents can call it from anywhere without re-deriving the
// traversal rules themselves.
import type { BlockId, HighlightState, Selection } from './schema';
import type { ModelIndex } from './index';
import { descendants as descendantReqs } from './trace';

function emptyHighlight(): HighlightState {
  return { primary: new Set(), secondary: new Set() };
}

function subtract(set: Set<BlockId>, remove: Set<BlockId>): Set<BlockId> {
  const result = new Set<BlockId>();
  for (const id of set) if (!remove.has(id)) result.add(id);
  return result;
}

/** `blockId` plus every block beneath it in the containment hierarchy (recursive). */
function withDescendantBlocks(idx: ModelIndex, blockId: BlockId): Set<BlockId> {
  const result = new Set<BlockId>([blockId]);
  const stack = [blockId];
  while (stack.length > 0) {
    const cur = stack.pop() as BlockId;
    for (const child of idx.childrenOf(cur)) {
      if (!result.has(child.id)) {
        result.add(child.id);
        stack.push(child.id);
      }
    }
  }
  return result;
}

/** Blocks that directly `Satisfy` a requirement. */
function satisfiersOf(idx: ModelIndex, reqId: string): Set<BlockId> {
  const result = new Set<BlockId>();
  for (const rel of idx.inBy(reqId, 'Satisfy')) {
    const el = idx.byId.get(rel.source);
    if (el?.kind === 'Block') result.add(el.id);
  }
  return result;
}

function highlightForBlock(idx: ModelIndex, blockId: BlockId): HighlightState {
  const primary = withDescendantBlocks(idx, blockId);

  const secondary = new Set<BlockId>();
  for (const flow of idx.flows) {
    if (flow.source === blockId) secondary.add(flow.target);
    else if (flow.target === blockId) secondary.add(flow.source);
  }
  const parent = idx.parentOf(blockId);
  if (parent) secondary.add(parent.id);
  // VEH (the x-ray shell) is everyone's ultimate parent; surfacing it as a
  // "related part" for nearly every selection is just noise, so it's
  // excluded from secondary unless VEH is itself the selection (in which
  // case it's already in `primary`, not `secondary`, so this is a no-op).
  if (blockId !== 'VEH') secondary.delete('VEH');

  return { primary, secondary: subtract(secondary, primary) };
}

function highlightForRequirement(idx: ModelIndex, reqId: string): HighlightState {
  const primary = satisfiersOf(idx, reqId);

  const secondary = new Set<BlockId>();
  for (const ref of descendantReqs(idx, reqId)) {
    for (const blockId of satisfiersOf(idx, ref.id)) secondary.add(blockId);
  }

  return { primary, secondary: subtract(secondary, primary) };
}

function highlightForTest(idx: ModelIndex, testId: string): HighlightState {
  const primary = new Set<BlockId>();
  for (const rel of idx.outBy(testId, 'Verify')) {
    for (const blockId of satisfiersOf(idx, rel.target)) primary.add(blockId);
  }
  return { primary, secondary: new Set() };
}

function highlightForUseCase(idx: ModelIndex, useCaseId: string): HighlightState {
  const primary = new Set<BlockId>();
  for (const rel of idx.outBy(useCaseId, 'Allocate')) {
    const el = idx.byId.get(rel.target);
    if (el?.kind === 'Block') primary.add(el.id);
  }

  const secondary = new Set<BlockId>();
  for (const rel of idx.outBy(useCaseId, 'Trace')) {
    for (const blockId of satisfiersOf(idx, rel.target)) secondary.add(blockId);
  }

  return { primary, secondary: subtract(secondary, primary) };
}

/** Computes what should be lit up in the 3D scene for the current selection. */
export function highlightFor(idx: ModelIndex, selection: Selection): HighlightState {
  if (!selection) return emptyHighlight();

  switch (selection.kind) {
    case 'block':
      return highlightForBlock(idx, selection.id);
    case 'requirement':
      return highlightForRequirement(idx, selection.id);
    case 'test':
      return highlightForTest(idx, selection.id);
    case 'usecase':
      return highlightForUseCase(idx, selection.id);
    default:
      return emptyHighlight();
  }
}

/** Flow tube mesh names (docs/model-contract.md section 3) whose source or target block is in `h.primary`. */
export function flowsToLight(idx: ModelIndex, h: HighlightState): Set<string> {
  const result = new Set<string>();
  for (const flow of idx.flows) {
    if (h.primary.has(flow.source) || h.primary.has(flow.target)) {
      result.add(flow.meshName);
    }
  }
  return result;
}
