// @vitest-environment happy-dom
//
// Exercises src/ui/index.ts (mountUI) end-to-end against the real
// data/model.json (via tests/unit/fixtures.ts's loadRealModel, shared with
// the model/* unit tests) through the real src/model/index.ts buildIndex.
import { describe, expect, it } from 'vitest';
import { mountUI } from '../../src/ui/index';
import { buildIndex } from '../../src/model/index';
import { createStore } from '../../src/state/store';
import { loadRealModel } from './fixtures';

function setup() {
  const model = loadRealModel();
  const idx = buildIndex(model);
  const store = createStore();
  const root = document.createElement('div');
  const toolbar = document.createElement('div');
  document.body.append(root, toolbar);
  const focused: Array<string | null> = [];
  const handle = mountUI({
    root,
    toolbar,
    store,
    idx,
    palette: {},
    onFocusBlock: (id) => focused.push(id),
  });
  return { model, idx, store, root, toolbar, focused, handle };
}

describe('mountUI', () => {
  it('renders 13 part rows from the real model.json', () => {
    const { root, idx } = setup();
    expect(idx.blocks.length).toBe(13);

    const rows = root.querySelectorAll('[data-testid="part-row"]');
    expect(rows.length).toBe(13);
    const ids = Array.from(rows).map((r) => r.getAttribute('data-id'));
    expect(new Set(ids).size).toBe(13);
    expect(ids).toContain('POWERTRAIN');
  });

  it('renders the toolbar controls with their documented data-testids', () => {
    const { toolbar } = setup();
    for (const testid of ['xray', 'tour', 'terms', 'theme', 'explode']) {
      expect(toolbar.querySelector(`[data-testid="${testid}"]`), `missing ${testid}`).toBeTruthy();
    }
  });

  it('clicking a part row sets store.selection and calls onFocusBlock', () => {
    const { root, store, focused } = setup();
    const firstRow = root.querySelector('[data-testid="part-row"]') as HTMLElement;
    expect(firstRow).toBeTruthy();
    const id = firstRow.getAttribute('data-id');
    firstRow.click();

    expect(store.get().selection).toEqual({ kind: 'block', id });
    expect(focused).toContain(id);
  });

  it('Escape clears the current selection', () => {
    const { root, store } = setup();
    const firstRow = root.querySelector('[data-testid="part-row"]') as HTMLElement;
    firstRow.click();
    expect(store.get().selection).not.toBeNull();

    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(store.get().selection).toBeNull();
  });
});
