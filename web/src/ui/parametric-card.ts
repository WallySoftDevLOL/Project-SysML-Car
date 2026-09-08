// "The math behind it": one SysML parametric analysis turned into a live
// calculator. The equation is typeset plainly (F = m × a), every input gets
// a slider paired with a number field, and the output is checked against the
// requirement threshold it has to clear — so a reader can move the mass and
// watch the margin disappear.
import { h } from './dom';
import type { ModelIndex } from '../model/index';
import { label } from '../plain';
import type { Terms } from '../state/store';
import { humanise } from './state-diagram';
import { evaluate, formatWithUnits, passes, thresholdsFor } from '../model/parametrics';
import type { EvalResult, Threshold } from '../model/parametrics';
import type { Parametric, ParametricParameter } from '../model/schema';

export interface ParametricCardOptions {
  terms: Terms;
  /**
   * The requirement whose card this is. When it has a threshold of its own
   * the pill cites that one, so the STK-002 card says "required by STK-002"
   * rather than naming the derived engineering requirement.
   */
  requirementId?: string;
}

/**
 * Notes that explain where a default came from. The power analysis starts
 * from the force analysis's own answer; saying so is honest, and cheaper
 * than wiring the two analyses together and having to explain the wiring.
 */
const INPUT_NOTES: Record<string, string> = {
  forceInput: 'from the tractive-force formula',
};

/** `*` and `/` read as arithmetic, not as code, once they are real symbols. */
function typesetExpression(expression: string): string {
  return expression.replace(/\*/g, '×').replace(/\//g, '÷');
}

/** Mass-like inputs are never usefully zero, so their slider starts at a quarter of nominal. */
function isMassLike(p: ParametricParameter): boolean {
  return p.unit === 'kg' || /mass|weight/i.test(p.name);
}

function niceStep(span: number): number {
  if (!(span > 0)) return 1;
  const target = span / 100;
  const magnitude = 10 ** Math.floor(Math.log10(target));
  for (const mult of [1, 2, 5, 10]) {
    if (mult * magnitude >= target) return mult * magnitude;
  }
  return magnitude * 10;
}

interface Range {
  min: number;
  max: number;
  step: number;
}

function rangeFor(p: ParametricParameter): Range {
  const base = typeof p.default === 'number' && p.default !== 0 ? p.default : 1;
  const min = isMassLike(p) ? base * 0.25 : 0;
  const max = base * 2;
  const step = niceStep(max - min);
  return { min: roundTo(min, step), max: roundTo(max, step), step };
}

function roundTo(value: number, step: number): number {
  const snapped = Math.round(value / step) * step;
  // Kill the float dust a division/multiplication pair leaves behind.
  return Number(snapped.toPrecision(12));
}

/**
 * The symbol between the computed value and the threshold — the requirement's
 * own comparator when it is met, its negation when it is not, so the pill
 * always states a true relation.
 */
function comparator(op: Threshold['comparator'], ok: boolean): string {
  if (op === '>=') return ok ? '≥' : '<';
  return ok ? '≤' : '>';
}

/**
 * The threshold to cite. `thresholdsFor` only reads the requirements the
 * parametric itself refines, so on a card one Derive hop up (STK-002, whose
 * chain reaches the range analysis) we first ask the same parser about *this*
 * requirement's own wording, and fall back to the refined one.
 */
function chooseThreshold(idx: ModelIndex, parametric: Parametric, requirementId?: string): Threshold | null {
  if (requirementId && idx.byId.has(requirementId)) {
    const own = thresholdsFor(idx, { ...parametric, refines: [requirementId] });
    if (own) return own;
  }
  return thresholdsFor(idx, parametric);
}

/** A requirement's `displayId` ("STK-002"), falling back to its raw id. */
function displayIdOf(idx: ModelIndex, reqId: string): string {
  const req = idx.byId.get(reqId);
  return (typeof req?.displayId === 'string' ? req.displayId : undefined) ?? reqId;
}

export function renderParametricCard(idx: ModelIndex, parametric: Parametric, opts: ParametricCardOptions): HTMLElement {
  const outputParam = parametric.parameters.find((p) => p.parameter === parametric.output);
  const inputs = parametric.parameters.filter((p) => p.parameter !== parametric.output && typeof p.default === 'number');
  const threshold = chooseThreshold(idx, parametric, opts.requirementId);

  const values: Record<string, number> = {};
  for (const p of inputs) values[p.parameter] = p.default as number;

  const outputValue = h('div', { class: 'param-output-value', 'data-testid': 'param-output' }, '—');
  const outputName = h(
    'div',
    { class: 'muted param-output-name' },
    outputParam ? humanise(outputParam.name) : parametric.output,
  );
  const pill = h('span', { class: 'chip pill-pass', 'data-testid': 'param-pill', hidden: !threshold });

  function recompute() {
    let result: EvalResult | null = null;
    try {
      result = evaluate(parametric, values);
    } catch {
      // A parameter with neither an override nor a default: say so rather
      // than printing a wrong number.
      result = null;
    }
    outputValue.textContent = result ? formatWithUnits(result.value, result.unit) : '—';
    if (!threshold) return;
    const ok = result !== null && passes(result, threshold);
    pill.className = `chip ${ok ? 'pill-pass' : 'pill-fail'}`;
    pill.setAttribute('data-pass', String(ok));
    const thresholdText = formatWithUnits(threshold.value, threshold.unit ?? '');
    pill.textContent = result
      ? `${formatWithUnits(result.value, result.unit)} ${comparator(threshold.comparator, ok)} ${thresholdText} required by ${displayIdOf(
          idx,
          threshold.requirementId,
        )} ${ok ? '✓' : '✗'}`
      : `Needs ${thresholdText} (${displayIdOf(idx, threshold.requirementId)})`;
    pill.title = `${displayIdOf(idx, threshold.requirementId)}: "${threshold.phrase}"`;
  }

  const rows = inputs.map((p) => renderRow(p, values, recompute));

  const reset = h(
    'button',
    {
      type: 'button',
      class: 'btn btn-link param-reset',
      'data-testid': 'param-reset',
      on: {
        click: () => {
          for (const row of rows) row.reset();
          recompute();
        },
      },
    },
    'Reset',
  );

  recompute();

  const heading = opts.terms === 'sysml' ? label('ConstraintBlock', 'sysml') : 'The math behind it';
  const headingTip = opts.terms === 'sysml' ? 'The math behind it' : `SysML ConstraintBlock: ${parametric.name}`;

  return h(
    'section',
    { class: 'detail-section param-card', 'data-testid': 'param-card', 'data-parametric': parametric.id },
    h('h3', { title: headingTip }, heading),
    h('div', { class: 'param-equation', 'data-testid': 'param-equation' }, typesetExpression(parametric.expression)),
    ...rows.map((r) => r.el),
    h(
      'div',
      { class: 'param-output' },
      outputValue,
      outputName,
      pill,
    ),
    h('div', { class: 'param-actions' }, reset),
  );
}

interface Row {
  el: HTMLElement;
  reset(): void;
}

function renderRow(p: ParametricParameter, values: Record<string, number>, onChange: () => void): Row {
  const { min, max, step } = rangeFor(p);
  const initial = p.default as number;
  const inputId = `param-${p.value}`;

  const slider = h('input', {
    type: 'range',
    class: 'param-slider',
    id: inputId,
    min,
    max,
    step,
    value: String(initial),
    'aria-label': `${humanise(p.name)}${p.unit ? ` in ${p.unit}` : ''}`,
  }) as HTMLInputElement;

  const number = h('input', {
    type: 'number',
    class: 'param-number',
    min,
    max,
    step,
    value: String(initial),
    'aria-label': `${humanise(p.name)} exact value`,
  }) as HTMLInputElement;

  function apply(raw: string, from: 'slider' | 'number') {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    values[p.parameter] = parsed;
    if (from === 'slider') number.value = String(parsed);
    else slider.value = String(parsed);
    onChange();
  }

  slider.addEventListener('input', () => apply(slider.value, 'slider'));
  number.addEventListener('input', () => apply(number.value, 'number'));

  const note = INPUT_NOTES[p.name];
  const el = h(
    'div',
    { class: 'param-row', 'data-testid': 'param-row', 'data-parameter': p.parameter },
    h(
      'label',
      { class: 'param-label', for: inputId },
      h('span', { class: 'param-name' }, humanise(p.name)),
      h('span', { class: 'muted param-symbol' }, p.parameter),
      note ? h('span', { class: 'muted param-note' }, note) : null,
    ),
    h('div', { class: 'param-controls' }, slider, number, p.unit ? h('span', { class: 'muted param-unit' }, p.unit) : null),
  );

  return {
    el,
    reset() {
      values[p.parameter] = initial;
      slider.value = String(initial);
      number.value = String(initial);
    },
  };
}
