import { describe, expect, it } from 'vitest';
import { buildIndex } from '../../src/model/index';
import { search } from '../../src/model/search';
import { buildFixtureModel, loadRealModel } from './fixtures';

describe('search (fixture)', () => {
  const idx = buildIndex(buildFixtureModel());

  it('empty query returns nothing', () => {
    expect(search(idx, '')).toEqual([]);
    expect(search(idx, '   ')).toEqual([]);
  });

  it('matches on displayId (prefix ranks first)', () => {
    const results = search(idx, 'PT-1');
    expect(results[0]?.id).toBe('REQ_PT_1');
  });

  it('matches on name text', () => {
    const results = search(idx, 'efficient');
    expect(results.map((r) => r.id)).toContain('REQ_PT_2');
  });

  it('requires every token to match', () => {
    expect(search(idx, 'part a efficient').map((r) => r.id)).toEqual(['REQ_PT_2']);
    expect(search(idx, 'zzz nomatch')).toEqual([]);
  });

  it('excludes non-authoritative copies unless includeCopies is set', () => {
    expect(search(idx, 'verification copy').map((r) => r.id)).toEqual([]);
    expect(search(idx, 'verification copy', { includeCopies: true }).map((r) => r.id)).toEqual(['REQ_COPY_1']);
  });

  it('respects the category filter', () => {
    expect(search(idx, 'behavior', { category: 'PT' }).map((r) => r.id)).toEqual(['REQ_PT_1']);
    expect(search(idx, 'behavior', { category: 'SYS' }).map((r) => r.id)).toEqual(['REQ_SYS_1']);
  });

  it('also finds blocks and test cases by name', () => {
    expect(search(idx, 'part a system').map((r) => r.id)).toContain('PARTA');
    expect(search(idx, 'part a test').map((r) => r.id)).toContain('TC_1');
  });
});

describe('search (real data/model.json)', () => {
  const idx = buildIndex(loadRealModel());

  it('"range" returns REQ_STK_002 first or near first', () => {
    const results = search(idx, 'range');
    const position = results.findIndex((r) => r.id === 'REQ_STK_002');
    expect(position).toBeGreaterThanOrEqual(0);
    expect(position).toBeLessThan(3);
  });

  it('"SYS-0" ranks SYS requirements first (displayId prefix match)', () => {
    const results = search(idx, 'SYS-0');
    expect(results.length).toBeGreaterThan(0);
    const firstNonSys = results.findIndex((r) => r.category !== 'SYS' && !r.id.startsWith('SYS'));
    const lastSys = results.map((r) => r.category).lastIndexOf('SYS');
    // Every SYS match should be ranked ahead of the first non-SYS match (or there is no non-SYS match at all).
    if (firstNonSys !== -1) {
      expect(lastSys).toBeLessThan(firstNonSys);
    }
    expect(results[0]?.category).toBe('SYS');
  });

  it('is stable and deterministic across repeated calls', () => {
    const a = search(idx, 'battery').map((r) => r.id);
    const b = search(idx, 'battery').map((r) => r.id);
    expect(a).toEqual(b);
  });
});
