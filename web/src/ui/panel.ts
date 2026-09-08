// Panel orchestrator: tabs, search, legend, the parts/requirements lists,
// and routing between list and detail (with a Back button + history stack).
// Owns and fully re-renders the content of `root` (the #panel element);
// re-renders are scoped to the sub-parts whose relevant store fields changed.
import { h, clear } from './dom';
import type { ModelIndex } from '../model/index';
import type { AppState, Store } from '../state/store';
import type { Selection } from '../model/schema';
import { createLegend } from './legend';
import { createPartsList } from './parts-list';
import { createReqList } from './req-list';
import { renderBlockDetail } from './detail-block';
import { renderRequirementDetail } from './detail-req';
import { renderTestDetail, renderUseCaseDetail } from './detail-misc';

export interface PanelDeps {
  root: HTMLElement;
  store: Store;
  idx: ModelIndex;
  palette: Record<string, string>;
  onFocusBlock(id: string | null): void;
  onTourRequest?: (scenarioId: string) => void;
  scenarios?: Array<{ id: string; title: string }>;
}

export interface PanelHandle {
  destroy(): void;
}

const SHEET_HEIGHTS = ['25vh', '45vh', '85vh'];

export function mountPanel(deps: PanelDeps): PanelHandle {
  const { root, store, idx, palette } = deps;
  clear(root);

  let history: Selection[] = [];
  let suppressHistory = false;

  function select(sel: Selection) {
    const current = store.get().selection;
    if (!suppressHistory && current) history.push(current);
    store.set({ selection: sel });
  }
  function selectBlock(id: string) {
    select({ kind: 'block', id });
    deps.onFocusBlock(id);
  }
  function selectRequirement(id: string) {
    select({ kind: 'requirement', id });
  }
  function selectTest(id: string) {
    select({ kind: 'test', id });
  }
  function selectUseCase(id: string) {
    select({ kind: 'usecase', id });
  }
  function goBack() {
    const prevSel = history.pop() ?? null;
    suppressHistory = true;
    store.set({ selection: prevSel });
    suppressHistory = false;
    deps.onFocusBlock(prevSel?.kind === 'block' ? prevSel.id : null);
  }
  function clearSelection() {
    history = [];
    store.set({ selection: null });
    deps.onFocusBlock(null);
  }

  // --- shell ---
  const legend = createLegend(idx, palette, store, selectBlock);

  const tabParts = h('button', { type: 'button', id: 'tab-parts', 'data-testid': 'tab-parts', class: 'tab-btn' }, 'Parts') as HTMLButtonElement;
  const tabReqs = h('button', { type: 'button', id: 'tab-reqs', 'data-testid': 'tab-reqs', class: 'tab-btn' }, 'Requirements') as HTMLButtonElement;
  tabParts.addEventListener('click', () => store.set({ tab: 'parts', selection: null }));
  tabReqs.addEventListener('click', () => store.set({ tab: 'reqs', selection: null }));
  const tabs = h('div', { class: 'panel-tabs' }, tabParts, tabReqs);

  const searchInput = h('input', {
    type: 'search',
    id: 'search',
    'data-testid': 'search',
    class: 'search-input',
    placeholder: 'Search parts and requirements…',
    autocomplete: 'off',
  }) as HTMLInputElement;
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  searchInput.addEventListener('input', () => {
    const value = searchInput.value;
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      // Typing a query is a request to search requirements: bring that list forward.
      const patch: Partial<AppState> = { query: value };
      if (value.trim() && store.get().tab !== 'reqs') patch.tab = 'reqs';
      if (value.trim() && store.get().selection) patch.selection = null;
      store.set(patch);
    }, 120);
  });
  const searchRow = h('div', { class: 'panel-search' }, searchInput);

  const backBtn = h(
    'button',
    { type: 'button', id: 'panel-back', 'data-testid': 'panel-back', class: 'btn btn-back', hidden: true, on: { click: goBack } },
    '← Back',
  ) as HTMLButtonElement;

  const detailArea = h('div', { class: 'detail-area', id: 'detail-area' });
  const listArea = h('div', { class: 'list-area', id: 'list-area' });
  const panelBody = h('div', { class: 'panel-body' }, backBtn, detailArea, listArea);

  let sheetHeightIdx = 1;
  const sheetHandle = h('button', {
    type: 'button',
    class: 'sheet-handle',
    'data-testid': 'sheet-handle',
    'aria-label': 'Resize panel',
    on: {
      click: () => {
        sheetHeightIdx = (sheetHeightIdx + 1) % SHEET_HEIGHTS.length;
        document.documentElement.style.setProperty('--sheet-height', SHEET_HEIGHTS[sheetHeightIdx] as string);
      },
    },
  });

  root.append(sheetHandle, legend.el, tabs, searchRow, panelBody);

  const partsList = createPartsList(idx, palette, store, selectBlock);
  const reqList = createReqList(idx, palette, store, selectRequirement);
  listArea.append(partsList.el, reqList.el);

  function renderLanding(): HTMLElement {
    const title = h('h2', { class: 'detail-title', id: 'detail-title', 'data-testid': 'detail-title' }, 'Select a part');
    const reqCount = h('span', { id: 'req-count', class: 'chip req-count', 'data-testid': 'req-count' }, '0 requirements');
    const scenarios = deps.scenarios ?? [];
    const buttons = h(
      'div',
      { class: 'landing-buttons' },
      h(
        'button',
        { type: 'button', class: 'btn btn-landing', 'data-testid': 'landing-pick-part', on: { click: () => store.set({ tab: 'parts' }) } },
        'Pick a part',
      ),
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn-landing',
          'data-testid': 'landing-find-req',
          on: {
            click: () => {
              store.set({ tab: 'reqs' });
              queueMicrotask(() => searchInput.focus());
            },
          },
        },
        'Find a requirement',
      ),
      scenarios.length > 0
        ? h(
            'button',
            { type: 'button', class: 'btn btn-landing', 'data-testid': 'landing-tour', on: { click: () => deps.onTourRequest?.(scenarios[0]!.id) } },
            'Take the tour',
          )
        : null,
    );
    return h(
      'div',
      { class: 'landing', 'data-testid': 'landing' },
      title,
      reqCount,
      h('p', { class: 'muted' }, 'Click a part in the 3D view, or use the buttons below to get started.'),
      buttons,
    );
  }

  function renderDetail(state: AppState) {
    clear(detailArea);
    // A new selection should be read from the top of the card, not from
    // wherever the list happened to be scrolled.
    if (state.selection && prev?.selection !== state.selection) {
      const scroller = (root.closest('.panel') as HTMLElement | null) ?? root;
      scroller.scrollTop = 0;
      panelBody.scrollTop = 0;
    }
    backBtn.hidden = state.selection === null;
    const sel = state.selection;
    const el = sel ? idx.byId.get(sel.id) : undefined;
    if (!sel || !el) {
      // The landing card only earns its space when nothing else is going on.
      if (!state.query.trim() && state.tab === 'parts') detailArea.append(renderLanding());
      return;
    }
    if (sel.kind === 'block') {
      detailArea.append(
        renderBlockDetail(idx, sel.id, {
          palette,
          terms: state.terms,
          onSelectBlock: selectBlock,
          onSelectRequirement: selectRequirement,
          onHoverBlock: (id) => store.set({ hover: id }),
          onSelectTest: selectTest,
          onSelectUseCase: selectUseCase,
        }),
      );
    } else if (sel.kind === 'test') {
      detailArea.append(renderTestDetail(idx, sel.id, { terms: state.terms, onSelectRequirement: selectRequirement, onSelectBlock: selectBlock }));
    } else if (sel.kind === 'usecase') {
      detailArea.append(renderUseCaseDetail(idx, sel.id, { terms: state.terms, onSelectRequirement: selectRequirement, onSelectBlock: selectBlock }));
    } else {
      detailArea.append(
        renderRequirementDetail(idx, sel.id, {
          terms: state.terms,
          onSelectRequirement: selectRequirement,
          onSelectBlock: selectBlock,
          onHoverBlock: (id) => store.set({ hover: id }),
          onSelectTest: selectTest,
          onSelectUseCase: selectUseCase,
        }),
      );
    }
  }

  function renderLists(state: AppState) {
    partsList.el.hidden = state.tab !== 'parts';
    reqList.el.hidden = state.tab !== 'reqs';
    partsList.render(state);
    reqList.render(state);
  }

  function renderTabs(state: AppState) {
    tabParts.classList.toggle('is-active', state.tab === 'parts');
    tabReqs.classList.toggle('is-active', state.tab === 'reqs');
  }

  let prev: AppState | null = null;
  function onStateChange(state: AppState) {
    const changed = (key: keyof AppState) => !prev || prev[key] !== state[key];
    if (changed('selection') || changed('terms') || (!state.selection && (changed('query') || changed('tab')))) renderDetail(state);
    if (changed('tab') || changed('selection') || changed('hover') || changed('terms') || changed('query') || changed('categoryFilter') || changed('showCopies')) {
      renderLists(state);
    }
    if (changed('tab')) renderTabs(state);
    if (changed('selection') || changed('hover')) legend.render();
    if (changed('query') && document.activeElement !== searchInput) searchInput.value = state.query;
    prev = state;
  }

  const unsubscribe = store.subscribe(onStateChange);
  onStateChange(store.get());

  // Escape clears the selection from anywhere -- including the 3D view, which
  // is where you are when you want it. Listening on the document (rather than
  // on #panel) is what makes that work; panel keydowns still bubble up here.
  function onKeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    if (!store.get().selection) return;
    clearSelection();
  }
  document.addEventListener('keydown', onKeydown as EventListener);

  return {
    destroy() {
      unsubscribe();
      document.removeEventListener('keydown', onKeydown as EventListener);
      clear(root);
    },
  };
}
