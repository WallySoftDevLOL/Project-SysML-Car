// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { mountUI } from '../../src/ui/index';
import { buildIndex } from '../../src/model/index';
import { createStore, defaultState } from '../../src/state/store';
import { loadRealModel } from './fixtures';

function setup() {
  const model = loadRealModel();
  const idx = buildIndex(model);
  const store = createStore({ ...defaultState(), tab: 'reqs' });
  const root = document.createElement('div');
  const toolbar = document.createElement('div');
  document.body.append(root, toolbar);
  mountUI({ root, toolbar, store, idx, palette: {}, onFocusBlock: () => {} });
  return { model, idx, store, root };
}

describe('requirements tab', () => {
  it('lists a row for every authoritative requirement by default (query empty)', () => {
    const { root, idx } = setup();
    const rows = root.querySelectorAll('[data-testid="req-item"]');
    expect(rows.length).toBe(idx.requirements(true).length);
    expect(rows.length).toBeGreaterThan(0);
  });

  it('filters the requirement list when store.query is set', () => {
    const { root, idx, store } = setup();
    const allCount = root.querySelectorAll('[data-testid="req-item"]').length;

    const target = idx.requirements(true)[0]!;
    store.set({ query: target.name });

    const rows = root.querySelectorAll('[data-testid="req-item"]');
    const ids = Array.from(rows).map((r) => r.getAttribute('data-id'));
    expect(ids).toContain(target.id);
    expect(rows.length).toBeLessThanOrEqual(allCount);
    expect(rows.length).toBeGreaterThan(0);

    // A query that matches nothing collapses the list to zero rows.
    store.set({ query: 'zzz_no_such_requirement_zzz' });
    expect(root.querySelectorAll('[data-testid="req-item"]').length).toBe(0);
  });

  it('clicking a requirement row selects it', () => {
    const { root, store } = setup();
    const row = root.querySelector('[data-testid="req-item"]') as HTMLElement;
    expect(row).toBeTruthy();
    const id = row.getAttribute('data-id');
    row.click();
    expect(store.get().selection).toEqual({ kind: 'requirement', id });
  });
});
