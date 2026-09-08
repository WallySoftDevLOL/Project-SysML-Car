// Parts tab: a three-level tree — VEH, then each of the 13 systems, then (for
// the 7 systems that have one) that system's own tier: "component" blocks,
// further indented underneath it (docs/model-contract.md section 1: 13
// systems + 10 components, nested via `parentId`). Every row keeps
// `data-testid="part-row"`; `data-tier` says which kind it is.
import { h, clear } from './dom';
import { outlineChip } from './chips';
import type { ModelIndex } from '../model/index';
import type { Element } from '../model/schema';
import type { AppState, Store } from '../state/store';

export interface PartsListHandle {
  el: HTMLElement;
  render(state: AppState): void;
}

/**
 * Which systems the user has collapsed, remembered for the life of this
 * module (i.e. this browser session/tab) rather than per-render — a system
 * not in this set is expanded, so every system defaults to expanded the
 * first time it's seen.
 */
const collapsedSystems = new Set<string>();

function depthOf(idx: ModelIndex, blockId: string): number {
  let depth = 0;
  let parent = idx.parentOf(blockId);
  while (parent) {
    depth += 1;
    parent = idx.parentOf(parent.id);
  }
  return depth;
}

function satisfyCount(idx: ModelIndex, blockId: string): number {
  return idx.outBy(blockId, 'Satisfy').length;
}

/** This system's own components (tier: "component"), in catalog order. */
function componentsOf(idx: ModelIndex, systemId: string): Element[] {
  return idx.components.filter((c) => c.parent === systemId);
}

export function createPartsList(
  idx: ModelIndex,
  palette: Record<string, string>,
  store: Store,
  onSelect: (id: string) => void,
): PartsListHandle {
  const el = h('ul', { class: 'list parts-list', id: 'parts-list', 'data-testid': 'parts-list', 'aria-label': 'Parts' });

  let lastState: AppState | null = null;

  function toggleCollapse(systemId: string) {
    if (collapsedSystems.has(systemId)) collapsedSystems.delete(systemId);
    else collapsedSystems.add(systemId);
    if (lastState) render(lastState);
  }

  function colorOf(block: Element): string {
    return palette[block.id] ?? (typeof block.color === 'string' ? block.color : '#94A3B8');
  }

  function renderSystemRow(state: AppState, system: Element, components: Element[]) {
    const color = colorOf(system);
    const depth = depthOf(idx, system.id);
    const isSelected = state.selection?.kind === 'block' && state.selection.id === system.id;
    const isHover = state.hover === system.id;
    const count = satisfyCount(idx, system.id);
    const hasComponents = components.length > 0;
    const collapsed = collapsedSystems.has(system.id);
    const name = system.label ?? system.name;

    const caret = hasComponents
      ? h(
          'button',
          {
            type: 'button',
            class: 'caret-btn',
            'data-testid': 'part-caret',
            'aria-expanded': String(!collapsed),
            'aria-label': `${collapsed ? 'Expand' : 'Collapse'} ${name}`,
            on: {
              click: (e: Event) => {
                e.stopPropagation();
                toggleCollapse(system.id);
              },
              keydown: (e: Event) => {
                const ke = e as KeyboardEvent;
                if (ke.key === ' ' || ke.key === 'Spacebar' || ke.key === 'Enter') {
                  e.stopPropagation();
                  e.preventDefault();
                  toggleCollapse(system.id);
                }
              },
            },
          },
          collapsed ? '▸' : '▾',
        )
      : null;

    const row = h(
      'li',
      {
        class: `list-row parts-row${isSelected ? ' is-selected' : ''}${isHover ? ' is-hover' : ''}`,
        style: { paddingLeft: `${10 + depth * 16}px` },
        tabIndex: 0,
        role: 'button',
        'data-testid': 'part-row',
        'data-tier': 'system',
        'data-id': system.id,
        on: {
          click: () => onSelect(system.id),
          mouseenter: () => store.set({ hover: system.id }),
          mouseleave: () => store.set({ hover: null }),
          keydown: (e: Event) => {
            const ke = e as KeyboardEvent;
            if (ke.key === 'Enter') onSelect(system.id);
          },
        },
      },
      h(
        'span',
        { class: 'row-main' },
        caret,
        h('span', { class: 'dot', style: { background: color } }),
        h('span', { class: 'row-label' }, name),
        state.terms === 'sysml' ? h('span', { class: 'muted row-formal' }, system.name) : null,
      ),
      h('span', { class: 'chip req-badge', title: 'Requirements' }, String(count)),
    );
    el.append(row);
  }

  function renderComponentRow(state: AppState, system: Element, component: Element) {
    const color = colorOf(component);
    const depth = depthOf(idx, component.id);
    const isSelected = state.selection?.kind === 'block' && state.selection.id === component.id;
    const isHover = state.hover === component.id;
    const parentCount = satisfyCount(idx, system.id);
    const parentName = system.label ?? system.name;
    const name = component.label ?? component.name;

    const badge =
      parentCount > 0
        ? outlineChip(String(parentCount), { className: 'req-badge', title: `inherits from ${parentName}` })
        : null;

    const row = h(
      'li',
      {
        class: `list-row parts-row is-component${isSelected ? ' is-selected' : ''}${isHover ? ' is-hover' : ''}`,
        style: { paddingLeft: `${10 + depth * 16}px` },
        tabIndex: 0,
        role: 'button',
        'data-testid': 'part-row',
        'data-tier': 'component',
        'data-id': component.id,
        on: {
          click: () => onSelect(component.id),
          mouseenter: () => store.set({ hover: component.id }),
          mouseleave: () => store.set({ hover: null }),
          keydown: (e: Event) => {
            const ke = e as KeyboardEvent;
            if (ke.key === 'Enter') onSelect(component.id);
          },
        },
      },
      h(
        'span',
        { class: 'row-main' },
        h('span', { class: 'dot dot-sm', style: { background: color } }),
        h('span', { class: 'row-label' }, name),
        state.terms === 'sysml' ? h('span', { class: 'muted row-formal' }, component.name) : null,
      ),
      badge,
    );
    el.append(row);
  }

  function render(state: AppState) {
    lastState = state;
    clear(el);
    for (const system of idx.systems) {
      const components = componentsOf(idx, system.id);
      renderSystemRow(state, system, components);
      if (components.length > 0 && !collapsedSystems.has(system.id)) {
        for (const component of components) renderComponentRow(state, system, component);
      }
    }
  }

  return { el, render };
}
