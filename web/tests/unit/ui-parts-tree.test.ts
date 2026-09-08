// @vitest-environment happy-dom
//
// The three-level parts tree (docs/model-contract.md section 1: 13 systems +
// 10 components) and the systems-only legend, against the real
// data/model.json via tests/unit/fixtures.ts's loadRealModel (shared with the
// model/* unit tests), through the real src/model/index.ts buildIndex.
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

describe('parts tree', () => {
  it('nests MOTOR under POWERTRAIN with the right tier/depth', () => {
    const { root } = setup();
    const rows = Array.from(root.querySelectorAll('[data-testid="part-row"]'));
    const powertrainIdx = rows.findIndex((r) => r.getAttribute('data-id') === 'POWERTRAIN');
    const motorIdx = rows.findIndex((r) => r.getAttribute('data-id') === 'MOTOR');
    expect(powertrainIdx).toBeGreaterThanOrEqual(0);
    // MOTOR renders immediately under its system, before any other system row.
    expect(motorIdx).toBe(powertrainIdx + 1);
    expect(rows[motorIdx]?.getAttribute('data-tier')).toBe('component');

    const motorRow = rows[motorIdx] as HTMLElement;
    const powertrainRow = rows[powertrainIdx] as HTMLElement;
    const motorIndent = parseInt(motorRow.style.paddingLeft, 10);
    const powertrainIndent = parseInt(powertrainRow.style.paddingLeft, 10);
    expect(motorIndent).toBeGreaterThan(powertrainIndent);
  });

  it('shows an outlined requirement badge on MOTOR, titled "inherits from Powertrain"', () => {
    const { root } = setup();
    const motorRow = root.querySelector('[data-testid="part-row"][data-id="MOTOR"]') as HTMLElement;
    const badge = motorRow.querySelector('.chip.is-outline');
    expect(badge).toBeTruthy();
    expect(badge!.textContent).toBe('11');
    expect(badge!.getAttribute('title')).toBe('inherits from Powertrain');
  });

  // `collapsedSystems` in src/ui/parts-list.ts is a module-level Set (by
  // design: it remembers collapse state across re-renders for the life of
  // the session), so it's shared by every test in this file too. Each
  // render rebuilds the row from scratch (`clear(el)`), so the caret element
  // itself is replaced on every click -- this test re-queries it after each
  // click rather than reusing a now-detached reference, and restores the
  // default (expanded) state in a `finally` so a failed assertion here can't
  // leave later tests looking at a collapsed POWERTRAIN.
  it('the caret on POWERTRAIN collapses and re-expands its components', () => {
    const { root } = setup();
    const queryCaret = () =>
      root.querySelector('[data-testid="part-row"][data-id="POWERTRAIN"] [data-testid="part-caret"]') as HTMLButtonElement | null;
    const hasMotorRow = () => root.querySelector('[data-testid="part-row"][data-id="MOTOR"]') !== null;

    try {
      expect(queryCaret()).toBeTruthy();
      // Default: expanded, MOTOR visible.
      expect(hasMotorRow()).toBe(true);

      queryCaret()!.click();
      expect(hasMotorRow()).toBe(false);
      expect(queryCaret()!.getAttribute('aria-expanded')).toBe('false');

      queryCaret()!.click();
      expect(hasMotorRow()).toBe(true);
      expect(queryCaret()!.getAttribute('aria-expanded')).toBe('true');
    } finally {
      if (!hasMotorRow()) queryCaret()?.click();
    }
  });

  it('a caret click does not also select the system row', () => {
    const { root, store } = setup();
    const queryCaret = () =>
      root.querySelector('[data-testid="part-row"][data-id="POWERTRAIN"] [data-testid="part-caret"]') as HTMLButtonElement | null;
    try {
      queryCaret()!.click();
      expect(store.get().selection).toBeNull();
    } finally {
      // Toggling twice (collapse, then expand) is idempotent regardless of
      // whichever state this test started in, so it always ends expanded.
      queryCaret()?.click();
    }
  });

  it('clicking the MOTOR row selects it and calls onFocusBlock, same as a system row', () => {
    const { root, store, focused } = setup();
    const motorRow = root.querySelector('[data-testid="part-row"][data-id="MOTOR"]') as HTMLElement;
    motorRow.click();
    expect(store.get().selection).toEqual({ kind: 'block', id: 'MOTOR' });
    expect(focused).toContain('MOTOR');
  });
});

describe('legend', () => {
  it('shows exactly the 13 systems, not the 10 components', () => {
    const { root, idx } = setup();
    const chips = root.querySelectorAll('[data-testid="legend-chip"]');
    expect(chips.length).toBe(13);
    const ids = Array.from(chips).map((c) => c.getAttribute('data-id'));
    expect(ids).toContain('POWERTRAIN');
    expect(ids).not.toContain('MOTOR');
    expect(idx.systems.length).toBe(13);
  });

  it('selecting MOTOR (a component) highlights its parent POWERTRAIN chip', () => {
    const { root, store } = setup();
    store.set({ selection: { kind: 'block', id: 'MOTOR' } });
    const powertrainChip = root.querySelector('[data-testid="legend-chip"][data-id="POWERTRAIN"]');
    expect(powertrainChip!.classList.contains('is-selected')).toBe(true);
  });

  it('hovering MOTOR highlights its parent POWERTRAIN chip', () => {
    const { root, store } = setup();
    store.set({ hover: 'MOTOR' });
    const powertrainChip = root.querySelector('[data-testid="legend-chip"][data-id="POWERTRAIN"]');
    expect(powertrainChip!.classList.contains('is-hover')).toBe(true);
  });
});
