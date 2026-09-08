// @vitest-environment happy-dom
//
// data/model.json has 11 Satisfy relationships with POWERTRAIN as the
// source (verified directly against data/model.json), so selecting the
// Powertrain block should show "11 requirements" via traceForBlock's
// reqCount.
import { describe, expect, it } from 'vitest';
import { mountUI } from '../../src/ui/index';
import { buildIndex } from '../../src/model/index';
import { createStore } from '../../src/state/store';
import { loadRealModel } from './fixtures';

describe('block detail', () => {
  it('shows req-count 11 for POWERTRAIN', () => {
    const model = loadRealModel();
    const idx = buildIndex(model);
    const store = createStore();
    const root = document.createElement('div');
    const toolbar = document.createElement('div');
    document.body.append(root, toolbar);
    mountUI({ root, toolbar, store, idx, palette: {}, onFocusBlock: () => {} });

    store.set({ selection: { kind: 'block', id: 'POWERTRAIN' } });

    const reqCount = root.querySelector('[data-testid="req-count"]');
    expect(reqCount).toBeTruthy();
    expect(reqCount!.textContent).toContain('11');

    const title = root.querySelector('[data-testid="detail-title"]');
    expect(title!.textContent).toMatch(/Powertrain/i);
  });
});
