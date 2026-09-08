import { describe, expect, it } from 'vitest';
import { evaluate, formatWithUnits, parseExpression, passes, thresholdsFor } from '../../src/model/parametrics';
import { buildIndex } from '../../src/model/index';
import { buildBehaviorFixtureModel, loadRealModel } from './fixtures';

describe('parseExpression', () => {
  it('parses a simple product', () => {
    expect(parseExpression('F = m * a')).toEqual({
      output: 'F',
      rhs: { type: 'binary', op: '*', left: { type: 'ident', name: 'm' }, right: { type: 'ident', name: 'a' } },
    });
  });

  it('respects * / over + - precedence', () => {
    const { rhs } = parseExpression('y = a + b * c');
    expect(rhs).toEqual({
      type: 'binary',
      op: '+',
      left: { type: 'ident', name: 'a' },
      right: { type: 'binary', op: '*', left: { type: 'ident', name: 'b' }, right: { type: 'ident', name: 'c' } },
    });
  });

  it('parentheses override precedence', () => {
    const { rhs } = parseExpression('y = (a + b) * c');
    expect(rhs).toEqual({
      type: 'binary',
      op: '*',
      left: { type: 'binary', op: '+', left: { type: 'ident', name: 'a' }, right: { type: 'ident', name: 'b' } },
      right: { type: 'ident', name: 'c' },
    });
  });

  it('supports division and unary minus', () => {
    expect(evalExprString('y = -a / b', { a: 10, b: 4 })).toBe(-2.5);
    expect(evalExprString('y = -(a + b)', { a: 3, b: 4 })).toBe(-7);
  });

  it('throws on a malformed expression', () => {
    expect(() => parseExpression('no equals here')).toThrow();
    expect(() => parseExpression('y = a +')).toThrow();
    expect(() => parseExpression('y = ')).toThrow();
    expect(() => parseExpression('y = (a + b')).toThrow();
  });

  function evalExprString(expr: string, env: Record<string, number>): number {
    // Exercises the parser + evaluator together via a throwaway Parametric,
    // since evalNode() itself isn't exported (it's an internal detail).
    const { output } = parseExpression(expr);
    return evaluate({
      id: 'X',
      name: 'X',
      constraint: 'X',
      expression: expr,
      output,
      parameters: Object.entries(env).map(([k, v]) => ({ parameter: k, value: k, name: k, default: v, unit: '' })),
    }).value;
  }
});

describe('evaluate', () => {
  const model = buildBehaviorFixtureModel();
  const param1 = model.parametrics!.find((p) => p.id === 'PARAM_1')!;
  const param2 = model.parametrics!.find((p) => p.id === 'PARAM_2')!;

  it('evaluates using parameter defaults', () => {
    const result = evaluate(param1);
    expect(result.value).toBe(7200);
    expect(result.inputs).toEqual({ m: 1800, a: 4 });
    expect(result.unit).toBe('N');
  });

  it('overrides take precedence over defaults', () => {
    const result = evaluate(param1, { m: 1000 });
    expect(result.value).toBe(4000);
    expect(result.inputs).toEqual({ m: 1000, a: 4 });
  });

  it('evaluates division', () => {
    const result = evaluate(param2);
    expect(result.value).toBeCloseTo(0.2);
    expect(result.unit).toBe('kWh/km');
  });

  it('throws when a parameter has neither an override nor a default', () => {
    const broken = { ...param1, parameters: [{ parameter: 'm', value: 'v', name: 'mass', default: null, unit: 'kg' }] };
    expect(() => evaluate(broken)).toThrow(/no value/);
  });

  it('throws on an identifier the expression uses but no parameter declares', () => {
    const broken = { ...param1, expression: 'F = m * z', parameters: [{ parameter: 'm', value: 'v', name: 'mass', default: 1, unit: 'kg' }] };
    expect(() => evaluate(broken)).toThrow(/unknown identifier/i);
  });
});

describe('formatWithUnits', () => {
  it('rounds N and km to 0 decimal places', () => {
    expect(formatWithUnits(7200, 'N')).toBe('7200 N');
    expect(formatWithUnits(455.6, 'km')).toBe('456 km');
  });

  it('derives kW from W once the value reaches 1000', () => {
    expect(formatWithUnits(151578.9, 'W')).toBe('151.6 kW');
    expect(formatWithUnits(500, 'W')).toBe('500 W');
    expect(formatWithUnits(1000, 'W')).toBe('1.0 kW');
  });

  it('rounds ratio to 2 decimal places', () => {
    expect(formatWithUnits(0.86667, 'ratio')).toBe('0.87');
  });

  it('falls back to a generic rounding for other units', () => {
    expect(formatWithUnits(0.19999, 'kWh/km')).toBe('0.2 kWh/km');
  });
});

describe('thresholdsFor', () => {
  const model = buildBehaviorFixtureModel();
  const idx = buildIndex(model);
  const param1 = idx.parametricById.get('PARAM_1')!;
  const param2 = idx.parametricById.get('PARAM_2')!;

  it('parses a ">=" threshold from the refined requirement acceptance text', () => {
    const threshold = thresholdsFor(idx, param1);
    expect(threshold).toEqual({ requirementId: 'REQ_PT_1', comparator: '>=', value: 7000, unit: 'N', phrase: '>= 7000 N' });
  });

  it('parses a "no more than ... per ..." threshold, normalizing the unit', () => {
    const threshold = thresholdsFor(idx, param2);
    expect(threshold?.comparator).toBe('<=');
    expect(threshold?.value).toBe(0.2);
    expect(threshold?.unit).toBe('kWh/km');
  });

  it('returns null when refines is absent or nothing parses', () => {
    expect(thresholdsFor(idx, { ...param1, refines: undefined })).toBeNull();
    expect(thresholdsFor(idx, { ...param1, refines: ['nope'] })).toBeNull();
  });

  it('passes() checks the computed value against the threshold, with unit conversion', () => {
    expect(passes(evaluate(param1), thresholdsFor(idx, param1)!)).toBe(true);
    expect(passes(evaluate(param1, { m: 100 }), thresholdsFor(idx, param1)!)).toBe(false);
    expect(passes(evaluate(param2), thresholdsFor(idx, param2)!)).toBe(true);
  });

  it('passes() converts W against a kW threshold', () => {
    const powerThreshold = { requirementId: 'X', comparator: '>=' as const, value: 135, unit: 'kW', phrase: '' };
    expect(passes({ value: 151578.9, inputs: {}, unit: 'W' }, powerThreshold)).toBe(true);
    expect(passes({ value: 100000, inputs: {}, unit: 'W' }, powerThreshold)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Real-data assertions, skipped until the converter lands contract section 6.
// ---------------------------------------------------------------------------
const realModel = loadRealModel();
const hasParametricsData = Array.isArray(realModel.parametrics) && realModel.parametrics.length > 0;

describe.skipIf(!hasParametricsData)('parametrics (real data/model.json)', () => {
  const idx = buildIndex(loadRealModel());

  it('FORCE_ANALYSIS evaluates to 7200', () => {
    const p = idx.parametricById.get('FORCE_ANALYSIS')!;
    expect(evaluate(p).value).toBe(7200);
  });

  it('POWER_ANALYSIS evaluates to ~151578.9 W, formatted as "151.6 kW"', () => {
    const p = idx.parametricById.get('POWER_ANALYSIS')!;
    const result = evaluate(p);
    expect(result.value).toBeCloseTo(151578.9, 1);
    expect(formatWithUnits(result.value, result.unit)).toBe('151.6 kW');
  });

  it('RANGE_ANALYSIS evaluates to ~455.6 km and passes STK-002', () => {
    const p = idx.parametricById.get('RANGE_ANALYSIS')!;
    const result = evaluate(p);
    expect(result.value).toBeCloseTo(455.6, 1);
    const threshold = thresholdsFor(idx, p);
    expect(threshold?.requirementId).toBe('REQ_STK_002');
    expect(passes(result, threshold!)).toBe(true);
  });
});
