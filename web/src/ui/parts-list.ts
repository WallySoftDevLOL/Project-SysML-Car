// Parts tab: a tree of the 13 blocks in hierarchy order, VEH first, children
// indented under their parent.
import { h, clear } from './dom';
import type { ModelIndex } from '../model/index';
import type { AppState, Store } from '../state/store';

export interface PartsListHandle {
  el: HTMLElement;
  render(state: AppState): void;
}

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

export function createPartsList(
  idx: ModelIndex,
  palette: Record<string, string>,
  store: Store,
  onSelect: (id: string) => void,
): PartsListHandle {
  const el = h('ul', { class: 'list parts-list', id: 'parts-list', 'data-testid': 'parts-list', 'aria-label': 'Parts' });

  function render(state: AppState) {
    clear(el);
    for (const block of idx.blocks) {
      const color = palette[block.id] ?? (typeof block.color === 'string' ? block.color : '#94A3B8');
      const depth = depthOf(idx, block.id);
      const isSelected = state.selection?.kind === 'block' && state.selection.id === block.id;
      const isHover = state.hover === block.id;
      const count = satisfyCount(idx, block.id);

      const row = h(
        'li',
        {
          class: `list-row parts-row${isSelected ? ' is-selected' : ''}${isHover ? ' is-hover' : ''}`,
          style: { paddingLeft: `${10 + depth * 16}px` },
          tabIndex: 0,
          role: 'button',
          'data-testid': 'part-row',
          'data-id': block.id,
          on: {
            click: () => onSelect(block.id),
            mouseenter: () => store.set({ hover: block.id }),
            mouseleave: () => store.set({ hover: null }),
            keydown: (e: Event) => {
              const ke = e as KeyboardEvent;
              if (ke.key === 'Enter') onSelect(block.id);
            },
          },
        },
        h(
          'span',
          { class: 'row-main' },
          h('span', { class: 'dot', style: { background: color } }),
          h('span', { class: 'row-label' }, block.label ?? block.name),
          state.terms === 'sysml' ? h('span', { class: 'muted row-formal' }, block.name) : null,
        ),
        h('span', { class: 'chip req-badge', title: 'Requirements' }, String(count)),
      );
      el.append(row);
    }
  }

  return { el, render };
}
