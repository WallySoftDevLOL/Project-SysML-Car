import { describe, expect, it } from 'vitest';
import { buildIndex } from '../../src/model/index';
import { flowsToLight, highlightFor } from '../../src/model/highlight';
import { buildFixtureModel, loadRealModel } from './fixtures';

describe('highlightFor (fixture)', () => {
  const idx = buildIndex(buildFixtureModel());

  it('selection null -> empty sets', () => {
    const h = highlightFor(idx, null);
    expect(h.primary.size).toBe(0);
    expect(h.secondary.size).toBe(0);
  });

  it('block selection: primary is the block plus its descendants (incl. its component); secondary is flow neighbours + parent', () => {
    const h = highlightFor(idx, { kind: 'block', id: 'PARTA' });
    expect([...h.primary].sort()).toEqual(['PARTA', 'PARTA_CHILD', 'PARTA_WIDGET']);
    expect([...h.secondary].sort()).toEqual(['PARTB', 'ROOT']);
  });

  it('block selection: secondary never overlaps primary', () => {
    const h = highlightFor(idx, { kind: 'block', id: 'ROOT' });
    expect([...h.primary].sort()).toEqual(['PARTA', 'PARTA_CHILD', 'PARTA_WIDGET', 'PARTB', 'ROOT']);
    for (const id of h.secondary) expect(h.primary.has(id)).toBe(false);
  });

  it('component selection: primary is the component alone; secondary is its parent system plus the parent\'s flow neighbours', () => {
    const h = highlightFor(idx, { kind: 'block', id: 'PARTA_WIDGET' });
    expect([...h.primary]).toEqual(['PARTA_WIDGET']);
    // PARTA_WIDGET has no flows of its own; PARTA (its parent) flows to PARTB.
    expect([...h.secondary].sort()).toEqual(['PARTA', 'PARTB']);
  });

  it("requirement selection: primary is direct satisfiers, secondary is descendants' satisfiers", () => {
    const h = highlightFor(idx, { kind: 'requirement', id: 'REQ_SYS_1' });
    expect([...h.primary]).toEqual([]);
    expect([...h.secondary].sort()).toEqual(['PARTA', 'PARTA_CHILD']);
  });

  it('requirement selection with a direct satisfier: primary set, secondary excludes it', () => {
    const h = highlightFor(idx, { kind: 'requirement', id: 'REQ_PT_1' });
    expect([...h.primary]).toEqual(['PARTA']);
    expect([...h.secondary]).toEqual([]);
  });

  it('test selection: primary is blocks satisfying verified reqs; no secondary', () => {
    const h = highlightFor(idx, { kind: 'test', id: 'TC_1' });
    expect([...h.primary]).toEqual(['PARTA']);
    expect(h.secondary.size).toBe(0);
  });

  it("usecase selection: primary is Allocate targets, secondary is Traced reqs' satisfiers minus primary", () => {
    const h = highlightFor(idx, { kind: 'usecase', id: 'UC_1' });
    expect([...h.primary]).toEqual(['PARTA']);
    expect(h.secondary.size).toBe(0); // REQ_PT_1's satisfier (PARTA) is already primary
  });

  it('flowsToLight returns mesh names touching primary', () => {
    const h = highlightFor(idx, { kind: 'block', id: 'PARTA' });
    expect([...flowsToLight(idx, h)]).toEqual(['FLOW__PARTA__PARTB']);
  });
});

describe('highlightFor / flowsToLight (real data/model.json)', () => {
  const idx = buildIndex(loadRealModel());

  it('REQ_STK_003: primary contains VEH, secondary contains POWERTRAIN (via derived SYS-002)', () => {
    const h = highlightFor(idx, { kind: 'requirement', id: 'REQ_STK_003' });
    expect(h.primary.has('VEH')).toBe(true);
    expect(h.secondary.has('POWERTRAIN')).toBe(true);
    expect(h.secondary.has('VEH')).toBe(false); // never overlaps primary
  });

  it('VEH is excluded from secondary for an ordinary block selection', () => {
    const h = highlightFor(idx, { kind: 'block', id: 'POWERTRAIN' });
    expect(h.secondary.has('VEH')).toBe(false);
    expect(h.primary.has('POWERTRAIN')).toBe(true);
    expect(h.primary.has('INVERTER')).toBe(true); // recursive child
  });

  it('flowsToLight for VCONTROL includes both an outgoing and an incoming flow', () => {
    const h = highlightFor(idx, { kind: 'block', id: 'VCONTROL' });
    const lit = flowsToLight(idx, h);
    expect(lit.has('FLOW__VCONTROL__POWERTRAIN')).toBe(true);
    expect(lit.has('FLOW__HMI__VCONTROL')).toBe(true);
  });

  it('MOTOR (component) selection: primary is MOTOR alone; secondary is POWERTRAIN plus POWERTRAIN\'s flow neighbours', () => {
    const h = highlightFor(idx, { kind: 'block', id: 'MOTOR' });
    expect([...h.primary]).toEqual(['MOTOR']);
    // POWERTRAIN itself has no flows of its own in the fixture-free real data;
    // ENERGY, INVERTER and VCONTROL each flow into it.
    expect([...h.secondary].sort()).toEqual(['ENERGY', 'INVERTER', 'POWERTRAIN', 'VCONTROL']);
  });

  it('a system selection includes its own components in primary (recursive childrenOf)', () => {
    const h = highlightFor(idx, { kind: 'block', id: 'POWERTRAIN' });
    expect(h.primary.has('INVERTER')).toBe(true);
    expect(h.primary.has('MOTOR')).toBe(true);
  });
});
