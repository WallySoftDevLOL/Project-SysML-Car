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
