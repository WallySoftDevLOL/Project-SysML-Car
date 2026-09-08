// Standalone manual test page for src/scene/viewer.ts. NOT imported by
// main.ts and not part of the app bundle -- it exists so the scene can be
// driven and eyeballed on its own, without the toolbar, panel or store.
//
// Served by vite at /scene-harness.html (see web/scene-harness.html).
//
// Keyboard:
//   1-9   select that block (primary), its parent/children become secondary
//   0     clear the selection
//   x     toggle x-ray
//   e / E explode -/+ 0.1
//   f     focus the selected block (or re-frame the car when nothing is picked)
//   r     toggle auto-rotate
//   t     toggle dark/light theme
import type { BlockId, ModelJson } from '../model/schema';
import { createViewer, viewerInternals, type ViewerBlockDef } from './viewer';
import type { ViewerTheme } from './viewer-api';

const BASE = import.meta.env.BASE_URL;

function log(msg: string) {
  const el = document.getElementById('harness-log');
  if (el) el.textContent = msg;
  console.log('[scene-harness]', msg);
}

/** Block catalog from model.json, so the harness never duplicates blocks.json. */
async function loadBlockDefs(): Promise<{ defs: ViewerBlockDef[]; model: ModelJson | null }> {
  try {
    const res = await fetch(`${BASE}data/model.json`);
    if (!res.ok) return { defs: [], model: null };
    const model = (await res.json()) as ModelJson;
    const defs = model.elements
      .filter((e) => e.kind === 'Block')
      .map((e) => ({
        id: e.id,
        label: e.label ?? e.name,
        color: e.color ?? '#94A3B8',
        alpha: e.alpha ?? 1,
        explode: (e.explode ?? [0, 0, 0]) as [number, number, number],
        parent: e.parent ?? null,
      }));
    return { defs, model };
  } catch {
    return { defs: [], model: null };
  }
}

async function main() {
  const container = document.getElementById('harness-viewport');
  if (!container) throw new Error('#harness-viewport missing');

  const { defs, model } = await loadBlockDefs();
  log(`block catalog: ${defs.length} blocks`);

  const viewer = createViewer(container, { blocks: defs, theme: 'dark', xray: true });
  // Handy from the devtools console: window.viewer.setExplode(0.5), and
  // window.scene / window.renderer for poking at materials and draw calls.
  const dbg = window as unknown as Record<string, unknown>;
  dbg.viewer = viewer;
  const internals = viewerInternals.get(viewer);
  dbg.scene = internals?.scene;
  dbg.renderer = internals?.renderer;
  dbg.camera = internals?.camera;

  viewer.on('pick', (e) => log(`pick: ${e.id ?? '(empty space)'}`));
  viewer.on('hover', (e) => {
    if (e.id) console.log('[scene-harness] hover:', e.id);
  });

  try {
    const result = await viewer.load(`${BASE}car.glb`);
    log(`loaded ${result.blocks.length} blocks; missing: ${result.missing.join(', ') || 'none'}`);
    console.log('[scene-harness] blocks', result.blocks, 'missing', result.missing);
    // Draw-call budget check (target: well under 60).
    requestAnimationFrame(() => {
      const info = viewerInternals.get(viewer)?.renderer.info.render;
      console.log('[scene-harness] draw calls', info?.calls, 'triangles', info?.triangles);
    });
  } catch (err) {
    log(`load failed: ${(err as Error).message}`);
    return;
  }

  const ids: BlockId[] = keyOrder(defs);
  let selected: BlockId | null = null;
  let xray = true;
  let explode = 0;
  let autoRotate = false;
  let theme: ViewerTheme = 'dark';

  const childrenOf = (id: BlockId) => defs.filter((d) => d.parent === id).map((d) => d.id);
  const parentOf = (id: BlockId) => defs.find((d) => d.id === id)?.parent ?? null;
  // One-hop flow partners, so the secondary tint has something realistic to show.
  const flowPartners = (id: BlockId) =>
    (model?.flows ?? [])
      .filter((f) => f.source === id || f.target === id)
      .map((f) => (f.source === id ? f.target : f.source));

  function select(id: BlockId | null) {
    selected = id;
    if (!id) {
      viewer.setHighlight({ primary: new Set(), secondary: new Set() });
      log('selection cleared');
      return;
    }
    const secondary = new Set<BlockId>([...childrenOf(id), ...flowPartners(id)]);
    const parent = parentOf(id);
    if (parent) secondary.add(parent);
    secondary.delete(id);
    viewer.setHighlight({ primary: new Set([id]), secondary });
    log(`selected ${id} (secondary: ${[...secondary].join(', ') || 'none'})`);
  }

  viewer.on('pick', (e) => select(e.id));

  window.addEventListener('keydown', (ev) => {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const key = ev.key;
    if (key >= '1' && key <= '9') {
      const id = ids[Number(key) - 1];
      if (id) select(id);
      return;
    }
    switch (key) {
      case '0':
        select(null);
        break;
      case 'x':
      case 'X':
        xray = !xray;
        viewer.setXray(xray);
        log(`x-ray ${xray ? 'on' : 'off'}`);
        break;
      case 'e':
      case 'E': {
        // Shift-E explodes, plain e collapses. Read shiftKey rather than the
        // case of ev.key so remapped/synthetic keyboards behave the same.
        const step = ev.shiftKey ? 0.1 : -0.1;
        explode = Math.min(1, Math.max(0, Math.round((explode + step) * 100) / 100));
        viewer.setExplode(explode);
        log(`explode ${explode.toFixed(2)}`);
        break;
      }
      case 'f':
      case 'F':
        viewer.focus(selected);
        log(`focus ${selected ?? '(whole car)'}`);
        break;
      case 'r':
      case 'R':
        autoRotate = !autoRotate;
        viewer.setAutoRotate(autoRotate);
        log(`auto-rotate ${autoRotate ? 'on' : 'off'}`);
        break;
      case 't':
      case 'T':
        theme = theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        viewer.setTheme(theme);
        log(`theme ${theme}`);
        break;
      default:
        break;
    }
  });
}

/** Stable 1-9 key order: VEH first, then the rest as authored. */
function keyOrder(defs: ViewerBlockDef[]): BlockId[] {
  const veh = defs.filter((d) => d.id === 'VEH').map((d) => d.id);
  const rest = defs.filter((d) => d.id !== 'VEH').map((d) => d.id);
  return [...veh, ...rest];
}

void main();
