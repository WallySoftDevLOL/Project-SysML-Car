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

// MOTOR is a tier: "component" block, parented under POWERTRAIN (which has
// 11 direct Satisfy requirements — same fixture as the test above). A
// component satisfies nothing directly (docs/model-contract.md section 1),
// so its card reads against its parent instead: traceForBlock's
// `isInherited`/`inherited` (web/src/model/trace.ts) carry the parent's own
// requirements/tests/flows.
describe('component detail (MOTOR under POWERTRAIN)', () => {
  function setup() {
    const model = loadRealModel();
    const idx = buildIndex(model);
    const store = createStore();
    const root = document.createElement('div');
    const toolbar = document.createElement('div');
    document.body.append(root, toolbar);
    const focused: Array<string | null> = [];
    mountUI({ root, toolbar, store, idx, palette: {}, onFocusBlock: (id) => focused.push(id) });
    store.set({ selection: { kind: 'block', id: 'MOTOR' } });
    return { root, store, idx, focused };
  }

  it('shows the "Part of Powertrain" link and the inherited req-count of 11', () => {
    const { root } = setup();

    const title = root.querySelector('[data-testid="detail-title"]');
    expect(title!.textContent).toMatch(/Motor/i);

    const partOfLink = root.querySelector('[data-testid="part-of-link"]');
    expect(partOfLink).toBeTruthy();
    expect(partOfLink!.textContent).toContain('Part of Powertrain');

    const reqCount = root.querySelector('[data-testid="req-count"]');
    expect(reqCount!.textContent).toContain('11');

    const sentence = root.querySelector('.detail-sentence');
    expect(sentence!.textContent).toContain('part of the Powertrain');
    expect(sentence!.textContent).toContain('11 requirements');

    const inherited = root.querySelector('[data-testid="inherited-responsibilities"]');
    expect(inherited).toBeTruthy();
    expect(inherited!.querySelectorAll('[data-testid="expandable-req-row"]').length).toBe(11);
  });

  it('clicking the parent link selects POWERTRAIN and re-renders its (system) card', () => {
    const { root, store, focused } = setup();

    const partOfLink = root.querySelector('[data-testid="part-of-link"]') as HTMLButtonElement;
    partOfLink.click();

    expect(store.get().selection).toEqual({ kind: 'block', id: 'POWERTRAIN' });
    expect(focused).toContain('POWERTRAIN');

    const title = root.querySelector('[data-testid="detail-title"]');
    expect(title!.textContent).toMatch(/Powertrain/i);
    // Back to the system layout: no "Part of" link on POWERTRAIN's own card.
    expect(root.querySelector('[data-testid="part-of-link"]')).toBeNull();
  });

  it("POWERTRAIN's Contains section shows MOTOR as a clickable (not muted) chip", () => {
    const { root, store, focused } = setup();
    store.set({ selection: { kind: 'block', id: 'POWERTRAIN' } });

    const subparts = root.querySelector('[data-testid="subparts"]');
    expect(subparts).toBeTruthy();
    const motorChip = Array.from(subparts!.querySelectorAll('.subpart-chip')).find((el) => /motor/i.test(el.textContent ?? ''));
    expect(motorChip).toBeTruthy();
    expect(motorChip!.classList.contains('is-clickable')).toBe(true);
    expect(motorChip!.classList.contains('is-muted')).toBe(false);

    (motorChip as HTMLElement).click();
    expect(store.get().selection).toEqual({ kind: 'block', id: 'MOTOR' });
    expect(focused).toContain('MOTOR');
  });
});
