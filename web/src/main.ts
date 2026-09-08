// App entry point: loads model.json, builds the index, mounts the glTF viewer
// (falling back to placeholder boxes if car.glb is missing) and the panel UI,
// and keeps scene <-> store <-> panel in sync.
import './style.css';
import type { ModelJson } from './model/schema';
import { loadModel } from './model/load';
import { buildIndex, type ModelIndex } from './model/index';
import { highlightFor } from './model/highlight';
import { createViewer, type ViewerBlockDef } from './scene/viewer';
import { createPlaceholderViewer } from './scene/placeholder';
import type { Viewer } from './scene/viewer-api';
import { store } from './state/store';
import { initUrlSync } from './state/url';
import { paletteFromModel } from './palette';
import { mountUI } from './ui';
import scenariosFile from './tour/scenarios.json';
import { createTourPlayer } from './tour/player';
import { createTourOverlay } from './tour/overlay';
import type { ScenariosFile } from './tour/player';

const scenarios = (scenariosFile as ScenariosFile).scenarios;

const BASE = import.meta.env.BASE_URL;

function setLoadingText(text: string) {
  const el = document.getElementById('loading-text');
  if (el) el.textContent = text;
}

function hideLoading() {
  document.getElementById('loading')?.setAttribute('hidden', '');
}

function applyTheme(theme: 'dark' | 'light') {
  document.documentElement.setAttribute('data-theme', theme);
}

function blockDefs(model: ModelJson): ViewerBlockDef[] {
  const defs: ViewerBlockDef[] = [];
  for (const el of model.elements) {
    if (el.kind !== 'Block' || typeof el.mesh !== 'string') continue;
    const explode = Array.isArray(el.explode) && el.explode.length === 3
      ? (el.explode as [number, number, number])
      : ([0, 0, 0] as [number, number, number]);
    defs.push({
      id: el.id,
      label: el.label ?? el.name,
      color: el.color ?? '#94A3B8',
      alpha: typeof el.alpha === 'number' ? el.alpha : 1,
      explode,
      parent: el.parent ?? null,
    });
  }
  return defs;
}

async function glbExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

/** Scene <-> store glue: selection drives highlight/focus, toggles drive the viewer. */
function bindViewerToStore(viewer: Viewer, idx: ModelIndex) {
  let lastSelectionKey = '';
  let lastHover: string | null = null;
  let lastXray: boolean | null = null;
  let lastExplode = -1;
  let lastTheme: string | null = null;

  const apply = () => {
    const s = store.get();
    const selKey = s.selection ? `${s.selection.kind}:${s.selection.id}` : '';
    if (selKey !== lastSelectionKey) {
      lastSelectionKey = selKey;
      viewer.setHighlight(highlightFor(idx, s.selection));
      viewer.setAutoRotate(false);
    }
    if (s.hover !== lastHover) {
      lastHover = s.hover;
      viewer.setHover(s.hover);
    }
    if (s.xray !== lastXray) {
      lastXray = s.xray;
      viewer.setXray(s.xray);
    }
    if (s.explode !== lastExplode) {
      lastExplode = s.explode;
      viewer.setExplode(s.explode);
    }
    if (s.theme !== lastTheme) {
      lastTheme = s.theme;
      viewer.setTheme(s.theme);
      applyTheme(s.theme);
    }
  };
  store.subscribe(apply);
  apply();

  viewer.on('pick', ({ id }) => {
    const current = store.get().selection;
    if (id === null) {
      if (current) store.set({ selection: null });
      return;
    }
    const same = current?.kind === 'block' && current.id === id;
    store.set({ selection: same ? null : { kind: 'block', id } });
  });
  viewer.on('hover', ({ id }) => {
    if (store.get().hover !== id) store.set({ hover: id });
  });
}

async function main() {
  const viewport = document.getElementById('viewport');
  const panelRoot = document.getElementById('panel');
  const toolbar = document.getElementById('toolbar');
  if (!viewport || !panelRoot || !toolbar) throw new Error('required layout elements missing');

  setLoadingText('Loading requirements…');
  const model = await loadModel(`${BASE}data/model.json`);
  const idx = buildIndex(model);
  const palette = Object.fromEntries(paletteFromModel(model));

  // X-ray on is the point of the demo; the URL hash may still override it.
  store.set({ xray: true });

  setLoadingText('Loading car…');
  const glbUrl = `${BASE}car.glb`;
  let viewer: Viewer;
  if (await glbExists(glbUrl)) {
    viewer = createViewer(viewport, {
      blocks: blockDefs(model),
      theme: store.get().theme,
      xray: true,
    });
    const { missing } = await viewer.load(glbUrl);
    const realMissing = missing.filter((id) => idx.blocks.some((b) => b.id === id));
    if (realMissing.length) console.warn('[main] blocks without glb nodes:', realMissing);
  } else {
    console.info('[main] car.glb not found at', glbUrl, '- using placeholder boxes.');
    viewer = createPlaceholderViewer(viewport);
    await viewer.load(glbUrl);
  }

  bindViewerToStore(viewer, idx);

  const tourPlayer = createTourPlayer({ store, viewer, scenarios });
  createTourOverlay(viewport, tourPlayer);

  mountUI({
    root: panelRoot,
    toolbar,
    store,
    idx,
    palette,
    onFocusBlock: (id) => viewer.focus(id),
    scenarios: scenarios.map((s) => ({ id: s.id, title: s.title })),
    onTourRequest: (id) => tourPlayer.play(id),
  });

  initUrlSync(store);

  // Landing state: gentle idle rotation until the first interaction.
  if (!store.get().selection) viewer.setAutoRotate(true);
  const stopIdle = () => {
    viewer.setAutoRotate(false);
    viewport.removeEventListener('pointerdown', stopIdle);
  };
  viewport.addEventListener('pointerdown', stopIdle, { once: true });

  hideLoading();
  document.body.setAttribute('data-ready', 'true');
}

main().catch((err) => {
  console.error('[main] failed to initialize app', err);
  setLoadingText('Failed to load. See console for details.');
});
