import { describe, expect, it } from 'vitest';
import fixtureJson from '../fixtures/model.sample.json';
import type { ModelJson } from '../../src/model/schema';

function loadFixture(): ModelJson {
  // Re-parse a fresh copy each call so tests can't leak mutations to each other.
  return JSON.parse(JSON.stringify(fixtureJson)) as ModelJson;
}

describe('model.sample.json fixture', () => {
  it('parses as valid JSON with the top-level ModelJson keys', () => {
    const model = loadFixture();
    expect(model).toHaveProperty('meta');
    expect(model).toHaveProperty('categories');
    expect(model).toHaveProperty('elements');
    expect(model).toHaveProperty('relationships');
    expect(model).toHaveProperty('flows');
    expect(model).toHaveProperty('hierarchy');
    expect(model).toHaveProperty('stats');
  });

  it('has the expected categories', () => {
    const model = loadFixture();
    const ids = model.categories.map((c) => c.id);
    expect(ids).toEqual(['STK', 'SYS', 'PT']);
  });

  it('has 3 blocks and 5 requirements across STK/SYS/PT', () => {
    const model = loadFixture();
    const blocks = model.elements.filter((e) => e.kind === 'Block');
    const requirements = model.elements.filter((e) => e.kind === 'Requirement');
    expect(blocks).toHaveLength(3);
    expect(blocks.map((b) => b.id).sort()).toEqual(['ENERGY', 'POWERTRAIN', 'VEH']);
    expect(requirements).toHaveLength(5);
    const categories = new Set(requirements.map((r) => r.category));
    expect(categories).toEqual(new Set(['STK', 'SYS', 'PT']));
  });

  it('includes Satisfy, Verify, and DeriveRequirement relationships', () => {
    const model = loadFixture();
    const types = new Set(model.relationships.map((r) => r.type));
    expect(types.has('Satisfy')).toBe(true);
    expect(types.has('Verify')).toBe(true);
    expect(types.has('DeriveRequirement')).toBe(true);
  });

  it('follows the source/target direction rule for Satisfy (source = satisfying block)', () => {
    const model = loadFixture();
    const satisfies = model.relationships.filter((r) => r.type === 'Satisfy');
    for (const rel of satisfies) {
      const sourceEl = model.elements.find((e) => e.id === rel.source);
      const targetEl = model.elements.find((e) => e.id === rel.target);
      expect(sourceEl?.kind).toBe('Block');
      expect(targetEl?.kind).toBe('Requirement');
    }
  });

  it('has exactly one flow, matching an ItemFlow relationship', () => {
    const model = loadFixture();
    expect(model.flows).toHaveLength(1);
    expect(model.stats.flows).toBe(1);
    const flow = model.flows[0]!;
    const itemFlowRel = model.relationships.find(
      (r) => r.type === 'ItemFlow' && r.source === flow.source && r.target === flow.target,
    );
    expect(itemFlowRel).toBeDefined();
  });

  it('has a hierarchy rooted at VEH', () => {
    const model = loadFixture();
    expect(model.hierarchy.VEH).toEqual(expect.arrayContaining(['POWERTRAIN', 'ENERGY']));
  });

  it('reports stats consistent with the element/relationship counts', () => {
    const model = loadFixture();
    const requirements = model.elements.filter((e) => e.kind === 'Requirement');
    const blocks = model.elements.filter((e) => e.kind === 'Block');
    expect(model.stats.requirements).toBe(requirements.length);
    expect(model.stats.blocks).toBe(blocks.length);
    expect(model.stats.allRelationships).toBe(model.relationships.length);
  });
});
