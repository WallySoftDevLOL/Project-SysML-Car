// App entry point. Wires the placeholder scene, the toolbar, and a minimal
// panel together against the state store. This is intentionally thin: the
// real panel (src/ui/*) and the real scene (src/scene/*, replacing
// placeholder.ts) plug into the same store/Viewer contracts without this
// file needing structural changes.
import './style.css';
import type { ModelJson } from './model/schema';
import { createPlaceholderViewer } from './scene/placeholder';
import type { Viewer } from './scene/viewer-api';
import { store } from './state/store';
import { initUrlSync } from './state/url';
import { onColor, paletteFromModel } from './palette';

const BASE = import.meta.env.BASE_URL;

async function fetchModel(): Promise<ModelJson | null> {
  try {
    const res = await fetch(`${BASE}data/model.json`);
    if (!res.ok) return null;
    return (await res.json()) as ModelJson;
  } catch {
    return null;
  }
}

async function glbExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

function setLoadingText(text: string) {
  const el = document.getElementById('loading-text');
  if (el) el.textContent = text;
}

function hideLoading() {
  const overlay = document.getElementById('loading');
  overlay?.setAttribute('hidden', '');
}

function applyTheme(theme: 'dark' | 'light') {
  document.documentElement.setAttribute('data-theme', theme);
}

// --- Minimal panel: shows the selected block's label + Satisfy count. ---
// The real panel (src/ui/*) replaces this with the full tabbed parts/reqs
// browser; this exists only so the page is useful before that lands.
function renderMinimalPanel(model: ModelJson | null) {
  const state = store.get();
  const titleEl = document.getElementById('detail-title');
  const contentEl = document.getElementById('detail-content');
  const countEl = document.getElementById('req-count');
  if (!titleEl || !contentEl || !countEl) return;

  if (!model || state.selection === null || state.selection.kind !== 'block') {
    titleEl.textContent = 'Select a part';
    contentEl.innerHTML = '<p class="muted">Click a part in the 3D view to see its requirements.</p>';
    countEl.textContent = '0 requirements';
    return;
  }

  const blockId = state.selection.id;
  const block = model.elements.find((e) => e.kind === 'Block' && e.id === blockId);
  const satisfyCount = model.relationships.filter((r) => r.type === 'Satisfy' && r.source === blockId).length;

  const palette = paletteFromModel(model);
  const color = palette.get(blockId) ?? '#94A3B8';
  const fg = onColor(color);

  titleEl.textContent = block?.label ?? block?.name ?? blockId;
  contentEl.innerHTML = `
    <p class="muted">${block?.blurb ?? ''}</p>
    <span class="chip" style="background:${color}; color:${fg}; border-color:${color}">${blockId}</span>
  `;
  countEl.textContent = `${satisfyCount} requirement${satisfyCount === 1 ? '' : 's'}`;
}

function wireToolbar(viewer: Viewer) {
  const xrayBtn = document.getElementById('xray') as HTMLButtonElement | null;
  const tourBtn = document.getElementById('tour') as HTMLButtonElement | null;
  const termsBtn = document.getElementById('terms') as HTMLButtonElement | null;
  const themeBtn = document.getElementById('theme') as HTMLButtonElement | null;
  const explodeInput = document.getElementById('explode') as HTMLInputElement | null;
  const searchInput = document.getElementById('search') as HTMLInputElement | null;
  const tabParts = document.getElementById('tab-parts') as HTMLButtonElement | null;
  const tabReqs = document.getElementById('tab-reqs') as HTMLButtonElement | null;

  xrayBtn?.addEventListener('click', () => store.set({ xray: !store.get().xray }));
  tourBtn?.addEventListener('click', () => store.set({ tour: !store.get().tour }));
  termsBtn?.addEventListener('click', () =>
    store.set({ terms: store.get().terms === 'plain' ? 'sysml' : 'plain' }),
  );
  themeBtn?.addEventListener('click', () =>
    store.set({ theme: store.get().theme === 'dark' ? 'light' : 'dark' }),
  );
  explodeInput?.addEventListener('input', () => store.set({ explode: Number(explodeInput.value) }));
  searchInput?.addEventListener('input', () => store.set({ query: searchInput.value }));
  tabParts?.addEventListener('click', () => store.set({ tab: 'parts' }));
  tabReqs?.addEventListener('click', () => store.set({ tab: 'reqs' }));

  store.subscribe((state) => {
    xrayBtn?.setAttribute('aria-pressed', String(state.xray));
    tourBtn?.setAttribute('aria-pressed', String(state.tour));
    termsBtn?.setAttribute('aria-pressed', String(state.terms === 'sysml'));
    themeBtn?.setAttribute('aria-pressed', String(state.theme === 'light'));
    tabParts?.classList.toggle('is-active', state.tab === 'parts');
    tabReqs?.classList.toggle('is-active', state.tab === 'reqs');

    viewer.setXray(state.xray);
    viewer.setExplode(state.explode);
    viewer.setAutoRotate(state.tour);
    viewer.setTheme(state.theme);
    applyTheme(state.theme);
  });
}

async function main() {
  setLoadingText('Loading model…');
  const model = await fetchModel();

  const viewport = document.getElementById('viewport');
  if (!viewport) throw new Error('#viewport not found');

  const viewer = createPlaceholderViewer(viewport);

  setLoadingText('Loading scene…');
  const glbUrl = `${BASE}car.glb`;
  const hasGlb = await glbExists(glbUrl);
  if (!hasGlb) {
    console.info('[main] car.glb not found at', glbUrl, '- using placeholder boxes.');
  }
  await viewer.load(glbUrl);

  viewer.on('pick', ({ id }) => {
    store.set({ selection: id ? { kind: 'block', id } : null });
  });
  viewer.on('hover', ({ id }) => {
    store.set({ hover: id });
    viewer.setHover(id);
  });

  wireToolbar(viewer);
  initUrlSync(store);

  store.subscribe(() => renderMinimalPanel(model));
  renderMinimalPanel(model);
  applyTheme(store.get().theme);

  hideLoading();
  document.body.setAttribute('data-ready', 'true');
}

main().catch((err) => {
  console.error('[main] failed to initialize app', err);
  setLoadingText('Failed to load. See console for details.');
});
