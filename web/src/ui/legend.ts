// The 13-chip color legend — systems only (docs/model-contract.md section 1:
// the 10 tier: "component" blocks live in the parts tree, not the legend).
// Spec placement is "under the viewport (#viewport) or just above the panel
// on mobile" — this task's file scope is limited to src/ui/, src/style.css
// and additive edits inside #panel/toolbar (not #viewport), so the legend
// renders at the top of the panel, which satisfies the mobile placement in
// both layouts.
import { h, clear } from './dom';
import type { ModelIndex } from '../model/index';
import type { Store } from '../state/store';

export interface LegendHandle {
  el: HTMLElement;
  render(): void;
}

/** A component's parent system id (unchanged for a system id, or one with no resolvable parent). */
function systemIdFor(idx: ModelIndex, id: string | null): string | null {
  if (!id) return null;
  if (idx.tierOf(id) === 'component') {
    const parent = idx.parentOf(id);
    if (parent) return parent.id;
  }
  return id;
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
    // A selected/hovered component highlights its parent system's chip
    // instead of (or in addition to) its own -- the legend has no chip of
    // its own for a component.
    const selectedSystemId = state.selection?.kind === 'block' ? systemIdFor(idx, state.selection.id) : null;
    const hoverSystemId = systemIdFor(idx, state.hover);
    clear(el);
    for (const block of idx.systems) {
      const color = palette[block.id] ?? (typeof block.color === 'string' ? block.color : '#94A3B8');
      const isSelected = selectedSystemId === block.id;
      const isHover = hoverSystemId === block.id;
      const chip = h(
        'button',
        {
          type: 'button',
          class: `legend-chip${isSelected ? ' is-selected' : ''}${isHover ? ' is-hover' : ''}`,
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
