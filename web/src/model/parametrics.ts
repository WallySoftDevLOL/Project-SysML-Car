// A tiny, safe arithmetic expression parser/evaluator for SysML parametric
// constraints (contract section 6: "Expressions are simple infix arithmetic
// over parameter names ... the viewer evaluates them with its own tiny
// parser, never `eval`"). Also: unit-aware formatting, and a small
// requirement-text threshold parser so a computed value can be checked
// against the requirement a parametric `refines`.
import type { ModelIndex } from './index';
import type { Parametric } from './schema';

// ---------------------------------------------------------------------------
// Expression parsing (recursive descent, no eval/Function anywhere).
// ---------------------------------------------------------------------------

export type ExprNode =
  | { type: 'num'; value: number }
  | { type: 'ident'; name: string }
  | { type: 'unary'; op: '-'; expr: ExprNode }
  | { type: 'binary'; op: '+' | '-' | '*' | '/'; left: ExprNode; right: ExprNode };

export interface ParsedExpression {
  /** The parameter symbol on the left-hand side of `=`, e.g. `"F"`. */
  output: string;
  /** The parsed right-hand side. */
  rhs: ExprNode;
}

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'ident'; name: string }
  | { kind: 'op'; op: '+' | '-' | '*' | '/' | '=' | '(' | ')' };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i] as string;
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let j = i + 1;
      while (j < src.length && /[0-9.]/.test(src[j] as string)) j += 1;
      const text = src.slice(i, j);
      const value = Number(text);
      if (Number.isNaN(value)) throw new Error(`parseExpression: invalid number "${text}"`);
      tokens.push({ kind: 'num', value });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j] as string)) j += 1;
      tokens.push({ kind: 'ident', name: src.slice(i, j) });
      i = j;
      continue;
    }
    if ('+-*/=()'.includes(ch)) {
      tokens.push({ kind: 'op', op: ch as '+' | '-' | '*' | '/' | '=' | '(' | ')' });
      i += 1;
      continue;
    }
    throw new Error(`parseExpression: unexpected character "${ch}" in "${src}"`);
  }
  return tokens;
}

/** Recursive-descent parser over a fixed token list, tracking a read cursor. */
class ExprParser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private next(): Token {
    const t = this.tokens[this.pos];
    if (!t) throw new Error('parseExpression: unexpected end of expression');
    this.pos += 1;
    return t;
  }

  /** additive := multiplicative (('+' | '-') multiplicative)* */
  parseAdditive(): ExprNode {
    let node = this.parseMultiplicative();
    for (;;) {
      const t = this.peek();
      if (t?.kind === 'op' && (t.op === '+' || t.op === '-')) {
        this.next();
        const right = this.parseMultiplicative();
        node = { type: 'binary', op: t.op, left: node, right };
      } else {
        break;
      }
    }
    return node;
  }

  /** multiplicative := unary (('*' | '/') unary)* */
  private parseMultiplicative(): ExprNode {
    let node = this.parseUnary();
    for (;;) {
      const t = this.peek();
      if (t?.kind === 'op' && (t.op === '*' || t.op === '/')) {
        this.next();
        const right = this.parseUnary();
        node = { type: 'binary', op: t.op, left: node, right };
      } else {
        break;
      }
    }
    return node;
  }

  /** unary := '-' unary | primary */
  private parseUnary(): ExprNode {
    const t = this.peek();
    if (t?.kind === 'op' && t.op === '-') {
      this.next();
      return { type: 'unary', op: '-', expr: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  /** primary := number | identifier | '(' additive ')' */
  private parsePrimary(): ExprNode {
    const t = this.next();
    if (t.kind === 'num') return { type: 'num', value: t.value };
    if (t.kind === 'ident') return { type: 'ident', name: t.name };
    if (t.kind === 'op' && t.op === '(') {
      const inner = this.parseAdditive();
      const close = this.next();
      if (close.kind !== 'op' || close.op !== ')') throw new Error('parseExpression: expected ")"');
      return inner;
    }
    throw new Error('parseExpression: expected a number, identifier, or "("');
  }

  atEnd(): boolean {
    return this.pos >= this.tokens.length;
  }
}

/**
 * Parses `"F = m * a"` style expressions into `{ output, rhs }`. Supports
 * numbers, identifiers, `+ - * /` with standard precedence, unary minus, and
 * parentheses. Never uses `eval`/`Function`.
 */
export function parseExpression(expression: string): ParsedExpression {
  const eqIndex = expression.indexOf('=');
  if (eqIndex === -1) {
    throw new Error(`parseExpression: expected "output = expression", got "${expression}"`);
  }
  const outputPart = expression.slice(0, eqIndex).trim();
  const rhsPart = expression.slice(eqIndex + 1);

  const outputTokens = tokenize(outputPart);
  if (outputTokens.length !== 1 || outputTokens[0]?.kind !== 'ident') {
    throw new Error(`parseExpression: left-hand side must be a single identifier, got "${outputPart}"`);
  }
  const output = outputTokens[0].name;

  const parser = new ExprParser(tokenize(rhsPart));
  const rhs = parser.parseAdditive();
  if (!parser.atEnd()) {
    throw new Error(`parseExpression: unexpected trailing input in "${expression}"`);
  }

  return { output, rhs };
}

function evalNode(node: ExprNode, env: Record<string, number>): number {
  switch (node.type) {
    case 'num':
      return node.value;
    case 'ident': {
      const v = env[node.name];
      if (v === undefined) throw new Error(`evaluate: unknown identifier "${node.name}"`);
      return v;
    }
    case 'unary':
      return -evalNode(node.expr, env);
    case 'binary': {
      const l = evalNode(node.left, env);
      const r = evalNode(node.right, env);
      switch (node.op) {
        case '+':
          return l + r;
        case '-':
          return l - r;
        case '*':
          return l * r;
        case '/':
          return l / r;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Evaluation.
// ---------------------------------------------------------------------------

export interface EvalResult {
  value: number;
  /** The resolved input values actually used (override, else `parameter.default`), keyed by expression symbol. */
  inputs: Record<string, number>;
  unit: string;
}

/**
 * Evaluates a `Parametric`'s expression. Each input parameter (every
 * parameter whose symbol is not the expression's `output`) resolves to
 * `overrides[symbol]` if given, else `parameter.default`; a parameter with
 * neither throws. `unit` is the output parameter's declared unit (`""` if
 * the output symbol has no matching parameter entry).
 */
export function evaluate(parametric: Parametric, overrides: Record<string, number> = {}): EvalResult {
  const { output, rhs } = parseExpression(parametric.expression);

  const inputs: Record<string, number> = {};
  for (const p of parametric.parameters) {
    if (p.parameter === output) continue;
    const value = overrides[p.parameter] ?? p.default ?? undefined;
    if (value === undefined || value === null) {
      throw new Error(
        `evaluate: parametric "${parametric.id}" has no value for parameter "${p.parameter}" (no override and no default)`,
      );
    }
    inputs[p.parameter] = value;
  }

  const value = evalNode(rhs, inputs);
  const outputParam = parametric.parameters.find((p) => p.parameter === output);
  return { value, inputs, unit: outputParam?.unit ?? '' };
}

// ---------------------------------------------------------------------------
// Unit-aware formatting.
// ---------------------------------------------------------------------------

/**
 * Formats a value with sensible rounding per unit: `N` and `km` to 0
 * decimal places; `W` renders as `kW` (1 decimal place) once the value
 * reaches 1000; `ratio` to 2 decimal places. Anything else falls back to a
 * general-purpose 2-significant-decimal rounding with the unit appended
 * verbatim.
 */
export function formatWithUnits(value: number, unit: string): string {
  switch (unit) {
    case 'N':
      return `${Math.round(value)} N`;
    case 'W':
      if (Math.abs(value) >= 1000) {
        return `${(value / 1000).toFixed(1)} kW`;
      }
      return `${Math.round(value)} W`;
    case 'km':
      return `${Math.round(value)} km`;
    case 'ratio':
      return value.toFixed(2);
    case '':
      return `${roundGeneral(value)}`;
    default:
      return `${roundGeneral(value)} ${unit}`;
  }
}

function roundGeneral(value: number): number {
  return Math.round(value * 100) / 100;
}

// ---------------------------------------------------------------------------
// Requirement-text threshold parsing.
// ---------------------------------------------------------------------------

export interface Threshold {
  requirementId: string;
  comparator: '>=' | '<=';
  value: number;
  unit?: string;
  /** The exact substring of the requirement text/acceptance the threshold was parsed from. */
  phrase: string;
}

function normalizeUnit(raw: string): string {
  return raw.replace(/\s*per\s*/i, '/').trim();
}

/** Comparator phrase patterns, tried in order, against a lowercased string. Capture groups: (value)(unit). */
const THRESHOLD_PATTERNS: Array<{ re: RegExp; comparator: '>=' | '<=' }> = [
  { re: />=\s*([\d.]+)\s*([a-z%/]*)/i, comparator: '>=' },
  { re: /<=\s*([\d.]+)\s*([a-z%/]*)/i, comparator: '<=' },
  { re: /at least\s+([\d.]+)\s*([a-z%]+(?:\s*per\s*[a-z]+)?)/i, comparator: '>=' },
  { re: /no less than\s+([\d.]+)\s*([a-z%]+(?:\s*per\s*[a-z]+)?)/i, comparator: '>=' },
  { re: /no more than\s+([\d.]+)\s*([a-z%]+(?:\s*per\s*[a-z]+)?)/i, comparator: '<=' },
  { re: /at most\s+([\d.]+)\s*([a-z%]+(?:\s*per\s*[a-z]+)?)/i, comparator: '<=' },
  { re: /([\d.]+)\s*([a-z%]+(?:\s*per\s*[a-z]+)?)\s*or less/i, comparator: '<=' },
  { re: /([\d.]+)\s*([a-z%]+(?:\s*per\s*[a-z]+)?)\s*or (?:more|greater)/i, comparator: '>=' },
];

/** Tries every pattern against `text`; returns the first match's {comparator, value, unit, phrase}, or `null`. */
function parseThresholdFromText(text: string): Omit<Threshold, 'requirementId'> | null {
  for (const { re, comparator } of THRESHOLD_PATTERNS) {
    const m = re.exec(text);
    if (m) {
      const value = Number(m[1]);
      const unit = m[2] ? normalizeUnit(m[2]) : undefined;
      return { comparator, value, unit, phrase: m[0].trim() };
    }
  }
  return null;
}

/**
 * Finds a numeric threshold for `parametric` by parsing the text of the
 * first requirement it `refines` that yields one. Prefers each candidate
 * requirement's `acceptance` field (the real data consistently phrases this
 * as e.g. `"... is >= 400 km."`) and falls back to `text` (which tends to
 * use prose like `"at least 400 km"` or `"no more than 0.20 kWh per km"`).
 * Returns `null` if `parametric.refines` is absent/empty or none parse.
 */
export function thresholdsFor(idx: ModelIndex, parametric: Parametric): Threshold | null {
  for (const reqId of parametric.refines ?? []) {
    const req = idx.byId.get(reqId);
    if (!req) continue;
    const acceptance = typeof req.acceptance === 'string' ? req.acceptance : undefined;
    const text = typeof req.text === 'string' ? req.text : undefined;
    const parsed = (acceptance && parseThresholdFromText(acceptance)) || (text && parseThresholdFromText(text));
    if (parsed) return { requirementId: reqId, ...parsed };
  }
  return null;
}

/** Canonical unit families for cross-unit comparison (e.g. W vs kW), value -> base unit. */
const UNIT_CONVERSION: Record<string, { base: string; factor: number }> = {
  W: { base: 'W', factor: 1 },
  kW: { base: 'W', factor: 1000 },
  N: { base: 'N', factor: 1 },
  km: { base: 'km', factor: 1 },
  m: { base: 'km', factor: 0.001 },
  kWh: { base: 'kWh', factor: 1 },
  'kWh/km': { base: 'kWh/km', factor: 1 },
  'km/h': { base: 'km/h', factor: 1 },
  'm/s': { base: 'km/h', factor: 3.6 },
  ratio: { base: 'ratio', factor: 1 },
  '%': { base: '%', factor: 1 },
  s: { base: 's', factor: 1 },
};

function toBase(value: number, unit: string | undefined): { value: number; base: string } {
  if (!unit) return { value, base: '' };
  const conv = UNIT_CONVERSION[unit];
  if (!conv) return { value, base: unit };
  return { value: value * conv.factor, base: conv.base };
}

/**
 * Whether `evalResult` satisfies `threshold`, converting units when both are
 * recognized (e.g. an evaluation in `W` against a `kW` threshold). If the
 * units are unrecognized or in different, unconvertible families, compares
 * the raw numeric values as a best effort.
 */
export function passes(evalResult: EvalResult, threshold: Threshold): boolean {
  const a = toBase(evalResult.value, evalResult.unit);
  const b = toBase(threshold.value, threshold.unit);
  const value = a.base && b.base && a.base === b.base ? a.value : evalResult.value;
  const target = a.base && b.base && a.base === b.base ? b.value : threshold.value;
  return threshold.comparator === '>=' ? value >= target : value <= target;
}
