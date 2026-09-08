// Requirements tab: category filter chips, a "show verification copies"
// checkbox, and a grouped, sticky-header list of requirements. The actual
// <input type="search"> lives in the shared toolbar-adjacent search box
// (panel.ts wires it, debounced 120ms into store.query); this module renders
// everything below it.
import { h, clear } from './dom';
import { search } from '../model/search';
import type { ModelIndex } from '../model/index';
import type { Element as ModelElement } from '../model/schema';
import type { AppState, Store } from '../state/store';
import { idChip, dot } from './chips';
import { label } from '../plain';

export interface ReqListHandle {
  el: HTMLElement;
  render(state: AppState): void;
}

function satisfyingBlocks(idx: ModelIndex, reqId: string): ModelElement[] {
  return idx
    .inBy(reqId, 'Satisfy')
    .map((r) => idx.byId.get(r.source))
    .filter((e): e is ModelElement => !!e);
}

/** Level 0/1/2 categories only (VER, the level-3 "verification copy" bucket, is
 * covered by the "Show verification copies" checkbox instead of a filter chip). */
function filterableCategories(idx: ModelIndex) {
  return Array.from(idx.categories.values())
    .filter((c) => c.level <= 2)
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

/**
 * `search()` from ../model/search only matches on a non-empty, tokenized
 * query (and returns Blocks/TestCases too); the default "show everything"
 * listing (no query typed yet) bypasses it in favor of `idx.requirements()`
 * filtered by category/copies directly.
 */
function requirementsFor(idx: ModelIndex, state: AppState): ModelElement[] {
  const category = state.categoryFilter ?? undefined;
  if (!state.query.trim()) {
    let reqs = idx.requirements(!state.showCopies);
    if (category) reqs = reqs.filter((r) => r.category === category);
    return reqs;
  }
  return search(idx, state.query, { category, includeCopies: state.showCopies }).filter((el) => el.kind === 'Requirement');
}

export function createReqList(
  idx: ModelIndex,
  palette: Record<string, string>,
  store: Store,
  onSelect: (id: string) => void,
): ReqListHandle {
  const filterRow = h('div', { class: 'chip-row category-filters', id: 'category-filters', 'data-testid': 'category-filters' });
  const copiesRow = h('label', { class: 'control copies-toggle' });
  const copiesCheckbox = h('input', {
    type: 'checkbox',
    id: 'show-copies',
    'data-testid': 'show-copies',
    on: { change: () => store.set({ showCopies: (copiesCheckbox as HTMLInputElement).checked }) },
  }) as HTMLInputElement;
  copiesRow.append(copiesCheckbox, ' Show verification copies');

  const listEl = h('ul', { class: 'list req-list', id: 'req-list', 'data-testid': 'req-list', 'aria-label': 'Requirements' });

  const el = h('div', { class: 'req-list-panel' }, filterRow, copiesRow, listEl);

  function renderFilters(state: AppState) {
    clear(filterRow);
    const cats = filterableCategories(idx);
    const allChip = h(
      'button',
      {
        type: 'button',
        class: `chip filter-chip${state.categoryFilter === null ? ' is-active' : ''}`,
        on: { click: () => store.set({ categoryFilter: null }) },
      },
      'All',
    );
    filterRow.append(allChip);
    for (const cat of cats) {
      const active = state.categoryFilter === cat.id;
      const text = state.terms === 'sysml' ? cat.name : cat.plain;
      const chipEl = h(
        'button',
        {
          type: 'button',
          class: `chip filter-chip${active ? ' is-active' : ''}`,
          title: state.terms === 'sysml' ? cat.plain : cat.name,
          on: { click: () => store.set({ categoryFilter: active ? null : cat.id }) },
        },
        text,
      );
      filterRow.append(chipEl);
    }
    copiesCheckbox.checked = state.showCopies;
  }

  function renderList(state: AppState) {
    clear(listEl);
    const results = requirementsFor(idx, state);

    const cats = Array.from(idx.categories.values()).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
    for (const cat of cats) {
      const reqsInCat = results.filter((r) => r.category === cat.id);
      if (reqsInCat.length === 0) continue;
      const header = h(
        'li',
        { class: 'req-group-header' },
        state.terms === 'sysml' ? cat.name : cat.plain,
      );
      listEl.append(header);
      for (const req of reqsInCat) {
        const isSelected = state.selection?.kind === 'requirement' && state.selection.id === req.id;
        const blocks = satisfyingBlocks(idx, req.id);
        const dots = h(
          'span',
          { class: 'req-dots' },
          ...blocks.map((b) => dot(palette[b.id] ?? (typeof b.color === 'string' ? b.color : '#94A3B8'), b.label ?? b.name)),
        );
        const row = h(
          'li',
          {
            class: `list-row req-row${isSelected ? ' is-selected' : ''}`,
            tabIndex: 0,
            role: 'button',
            'data-testid': 'req-item',
            'data-id': req.id,
            title: req.authoritative === false ? label('Copy', state.terms) : undefined,
            on: {
              click: () => onSelect(req.id),
              keydown: (e: Event) => {
                const ke = e as KeyboardEvent;
                if (ke.key === 'Enter') onSelect(req.id);
              },
            },
          },
          h('span', { class: 'row-main' }, idChip(req.displayId ?? req.id), h('span', { class: 'row-label' }, req.name)),
          dots,
        );
        listEl.append(row);
      }
    }
    if (listEl.children.length === 0) {
      listEl.append(h('li', { class: 'muted req-empty' }, 'No requirements match.'));
    }
  }

  function render(state: AppState) {
    renderFilters(state);
    renderList(state);
  }

  return { el, render };
}
