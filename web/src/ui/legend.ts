// The 13-chip color legend. Spec placement is "under the viewport (#legend
// inside #viewport) or just above the panel on mobile" — this task's file
// scope is limited to src/ui/, src/style.css and additive edits inside
// #panel/toolbar (not #viewport), so the legend renders at the top of the
// panel, which satisfies the mobile placement in both layouts.
import { h, clear } from './dom';
import type { ModelIndex } from '../model/index';
import type { Store } from '../state/store';

export interface LegendHandle {
  el: HTMLElement;
  render(): void;
}

export function createLegend(
  idx: ModelIndex,
  palette: Record<string, string>,
  store: Store,
  onSelectBlock: (id: string) => void,
): LegendHandle {
  const el = h('div', { class: 'legend', id: 'legend', 'data-testid': 'legend' });

  function render() {
    const state = store.get();
    clear(el);
    for (const block of idx.blocks) {
      const color = palette[block.id] ?? (typeof block.color === 'string' ? block.color : '#94A3B8');
      const isSelected = state.selection?.kind === 'block' && state.selection.id === block.id;
      const chip = h(
        'button',
        {
          type: 'button',
          class: `legend-chip${isSelected ? ' is-selected' : ''}`,
          'data-testid': 'legend-chip',
          'data-id': block.id,
          title: block.name,
          on: {
            click: () => onSelectBlock(block.id),
            mouseenter: () => store.set({ hover: block.id }),
            mouseleave: () => store.set({ hover: null }),
          },
        },
        h('span', { class: 'dot', style: { background: color } }),
        h('span', { class: 'legend-chip-label' }, block.label ?? block.name),
      );
      el.append(chip);
    }
  }

  render();
  return { el, render };
}
