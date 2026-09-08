# SysML Car viewer

Vanilla TypeScript + Vite + three.js. No framework. Renders `car.glb` (or
placeholder boxes if it's not built yet) with a side panel that shows a
clicked part's SysML requirements, and highlights parts when a requirement
is selected.

See `../docs/model-contract.md` for the shared data/glTF conventions this
project consumes.

## Commands

```powershell
npm install
npm run dev          # http://localhost:5173, copies assets first
npm run build        # copies assets, then vite build -> dist/
npm run preview      # serve the production build, http://localhost:4173
npm run typecheck    # tsc --noEmit
npm run test:unit    # vitest run
npx playwright install chromium   # once, before running e2e
npm run test:e2e     # playwright test (builds/serves via `preview` automatically)
```

`npm run dev` / `npm run build` first run `scripts/copy-assets.mjs`, which
copies `../dist/car.glb` -> `public/car.glb` and `../data/model.json` ->
`public/data/model.json`. If either source doesn't exist yet (e.g. the
Blender build or the xlsx converter hasn't run), it falls back gracefully:
the model falls back to `tests/fixtures/model.sample.json` so dev never
404s, and the scene falls back to placeholder boxes.

## Folder map

```
web/
  index.html            entry HTML: toolbar / viewport / panel grid, data-testid hooks
  src/
    main.ts             wires scene + toolbar + a minimal panel to the store
    style.css           theme tokens (dark/light) + shared component classes
    palette.ts          block color lookup + WCAG contrast helper
    plain.ts            plain-language <-> SysML term labels
    model/
      schema.ts          types mirroring docs/model-contract.md section 2
      load.ts            fetch + validate data/model.json (loadModel/parseModel)
      index.ts           buildIndex(model) -> ModelIndex lookup structures
      trace.ts           traceForRequirement/Block/Test/UseCase + ancestor/descendant BFS
      highlight.ts       highlightFor(selection) -> HighlightState, flowsToLight
      search.ts          search(idx, query, opts) over requirements/blocks/tests
    scene/
      viewer-api.ts       the Viewer interface every scene implementation must satisfy
      placeholder.ts      13-box stand-in scene (today's working implementation)
      (real viewer goes here, implementing Viewer against car.glb)
    state/
      store.ts            tiny typed pub/sub store (AppState)
      url.ts               syncs selection/xray/explode to location.hash
    ui/                   (not yet built) the real tabbed parts/requirements panel
  scripts/
    copy-assets.mjs        dev/build prestep, see above
  tests/
    fixtures/model.sample.json   hand-written fixture matching the schema
    unit/                        vitest specs
    e2e/                         playwright specs
```

## The Viewer contract

Everything in `src/scene/*` must implement `Viewer` from
`src/scene/viewer-api.ts`:

```ts
interface Viewer {
  load(url: string): Promise<{ blocks: string[]; missing: string[] }>;
  setHighlight(h: HighlightState): void;
  setHover(id: string | null): void;
  setXray(on: boolean): void;
  setExplode(t: number): void; // 0..1
  focus(blockId: string | null, opts?: FocusOptions): void;
  flyTo(pose: CameraPose, duration?: number): void;
  setAutoRotate(on: boolean): void;
  setTheme(theme: 'dark' | 'light'): void;
  projectBlock(id: string): { x: number; y: number } | null;
  on(event: 'pick' | 'hover', cb: (e: { id: string | null }) => void): () => void;
  dispose(): void;
}
```

`src/scene/placeholder.ts` implements this today with 13 labeled colored
boxes so the app is interactive before the real glTF viewer exists. The real
viewer replaces `placeholder.ts` (or sits alongside it and gets swapped in by
`main.ts`) without `main.ts` or `src/ui/*` needing structural changes, as
long as it satisfies the same interface.

## Shared state

`src/state/store.ts` exports a single `store: Store` with `AppState`:
`selection`, `hover`, `tab`, `query`, `categoryFilter`, `showCopies`,
`terms`, `theme`, `xray`, `explode`, `tour`. Read with `store.get()`, write
with `store.set(patch)`, react with `store.subscribe(fn)`. `src/state/url.ts`
keeps `selection` / `xray` / `explode` mirrored to `location.hash` for deep
links.

## Data layer API

`src/model/` turns `data/model.json` into typed, query-able structures. Every
consumer (`src/scene/*`, `src/ui/*`, `main.ts`) should go through this layer
rather than scanning `model.elements` / `model.relationships` by hand.

- **`model/schema.ts`** — types mirroring the contract, plus `Selection`
  (`block` | `requirement` | `test` | `usecase`, or `null`) and
  `HighlightState` (`{ primary, secondary }`, both `Set<BlockId>`).
- **`model/load.ts`** — `loadModel(url): Promise<ModelJson>` fetches and
  validates; `parseModel(json)` is the pure validator (used directly in
  tests). Both throw a single `Error` listing every missing/malformed
  top-level key by name, rather than failing on the first one.
- **`model/index.ts`** — `buildIndex(model): ModelIndex` builds one-time
  lookup structures: `byId`, `byKind`, `out`/`in` (relationships keyed by
  `source`/`target`) with `outBy(id, type)`/`inBy(id, type)` filters,
  `categories`/`categoryOf(reqId)`, `flows`, `hierarchy`, `parentOf`/
  `childrenOf` (direct only), `requirements(authoritativeOnly = true)` (drops
  the 8 non-authoritative VER copies by default), `displayName(id)`, and
  `blocks` — the 13 real (meshed) Block elements in the original
  `data/blocks.json` catalog order (VEH, then each child in that order, each
  child's own children immediately after it). `model.hierarchy`'s child
  lists are alphabetically sorted by the converter, so `index.ts` restores
  the authored order via a small hardcoded id table; an id outside that
  table just sorts after the known ones. `displayName(id)` falls back to a
  humanised `role` (contract section 6, e.g. `tractionMotor` -> "Traction
  motor") for a Block with no `label` — i.e. a composition sub-part — before
  falling back to `name`. `idx.behavior` is `behaviorIndex(model)` (see
  `model/behavior.ts` below) and `idx.parametrics`/`idx.parametricById` are a
  pass-through/map of `model.parametrics` (`[]`/empty map if absent).
- **`model/trace.ts`** — traceability queries on top of `ModelIndex`:
  `parentsOf`/`childrenOf` (one DeriveRequirement hop), `ancestors`/
  `descendants` (BFS, cycle-safe), and the four "give me everything about
  this thing" queries: `traceForRequirement`, `traceForBlock`,
  `traceForTest`, `traceForUseCase`. See the JSDoc on each returned
  interface (`RequirementTrace`, `BlockTrace`, `TestTrace`, `UseCaseTrace`)
  for the exact shape.
- **`model/highlight.ts`** — `highlightFor(idx, selection): HighlightState`
  computes what the 3D scene should light up for the current `Selection`;
  `flowsToLight(idx, highlight): Set<string>` returns the flow-tube mesh
  names (`FLOW__SRC__TGT`) touching `primary`.
- **`model/search.ts`** — `search(idx, query, { category?, includeCopies? })`
  is a simple all-tokens-must-match substring search over requirements,
  blocks, and test cases, ranked displayId-prefix match > name match > other.
- **`model/behavior.ts`** — queries over contract section 6's behavior data
  (state machines, activities, interactions) and the Block extras
  (`role`/`subParts`/`operations`/`receptions`/`values`/`ports`).
  `behaviorIndex(model): BehaviorIndex` exposes `stateMachinesFor(blockId)`,
  `activities`/`activityById`, `interactions`/`interactionsInvolving(blockId)`,
  `signalsReceivedBy(blockId)`/`signalsSentBy(blockId)`, `subPartsOf(blockId)`
  (each tagged `{ element, clickable }` — `clickable` iff the sub-part is one
  of the 13 meshed blocks), `portsOf`/`operationsOf`/`valuesOf(blockId)`,
  `messageSequence(interactionId)` (ordered, lifelines resolved to leaf block
  ids), `activityOutline(activityId)` (nodes in `ControlFlow` traversal order
  from the `initial` node; cycle-safe), and `transitionsFrom(stateId)`.
  `relatedRequirementsForBehavior(idx, id)` takes either an activity or a
  state machine id: for an activity it returns its declared `refines`
  (`reason: 'refines'`); for a state machine it returns requirements the
  context block `Satisfy`s whose text matches a small hardcoded word list
  (`fault`/`start`/`charg`/`drive`) — a heuristic, not authoritative
  traceability. All of this is a no-op-safe pass-through of `[]`/`undefined`
  when `model.behavior`/`.signals`/`.composition` are absent (i.e. before the
  converter emits contract section 6), so it's safe to call unconditionally.
- **`model/parametrics.ts`** — a tiny recursive-descent arithmetic parser and
  evaluator for SysML parametrics, deliberately not `eval`/`Function`.
  `parseExpression("F = m * a")` → `{ output, rhs }` (numbers, identifiers,
  `+ - * /` with standard precedence, unary minus, parentheses).
  `evaluate(parametric, overrides?)` → `{ value, inputs, unit }`, resolving
  each non-output parameter from `overrides[symbol] ?? parameter.default`
  (throws if neither is present, or if the expression references an
  undeclared identifier). `formatWithUnits(value, unit)` rounds `N`/`km` to 0
  decimal places, renders `W` as `kW` (1 decimal place) once the value
  reaches 1000, `ratio` to 2 decimal places, and falls back to a generic
  2-decimal rounding otherwise. `thresholdsFor(idx, parametric)` parses a
  `{ requirementId, comparator: '>='|'<=', value, unit?, phrase }` threshold
  out of the first `parametric.refines` requirement whose `acceptance` (tried
  first) or `text` contains a recognizable comparator phrase (`">= N unit"`,
  `"at least N unit"`, `"no more than N unit"`, `"N unit or less"`, etc.), or
  `null` if none parse. `passes(evalResult, threshold)` compares them,
  converting between known-equivalent units (e.g. `W` vs `kW`) first.

```ts
import { loadModel } from './model/load';
import { buildIndex } from './model/index';
import { traceForBlock } from './model/trace';
import { highlightFor, flowsToLight } from './model/highlight';

const model = await loadModel('/data/model.json');
const idx = buildIndex(model);
const trace = traceForBlock(idx, 'POWERTRAIN'); // { reqCount: 11, ... }
const h = highlightFor(idx, { kind: 'block', id: 'POWERTRAIN' });
const litFlows = flowsToLight(idx, h);
```

## How to add a UI module

1. Put new files under `src/ui/`. Read state via `store.get()` /
   `store.subscribe()`; write state via `store.set()`. Don't reach into the
   scene directly except through the `Viewer` interface passed in from
   `main.ts`.
2. Use the existing CSS building blocks from `src/style.css` (`.chip`,
   `.card`, `.list`, `.list-row`, `.ladder`, `.btn`, `.tab-btn`) rather than
   inventing new patterns, so the panel stays visually consistent.
3. For relationship/kind labels, call `label(term, store.get().terms)` from
   `src/plain.ts` rather than hard-coding plain-language strings.
4. For block colors, call `paletteFromModel(model)` / `onColor(hex)` from
   `src/palette.ts` rather than re-reading `data/blocks.json`.
5. Add `data-testid` attributes for anything a Playwright spec should find,
   matching the hooks already present in `index.html`.
6. Add a vitest spec under `tests/unit/` for pure logic, and extend
   `tests/e2e/smoke.spec.ts` (or add a new e2e spec) for interactive
   behavior.
