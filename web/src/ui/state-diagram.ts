// A hand-drawn (no library) SVG state diagram for one SysML state machine,
// plus an accessible text fallback listing every transition.
//
// Layout: breadth-first from the initial pseudostate gives each state a
// column; the first state to claim a column keeps the top row and later
// arrivals stack underneath it. For the vehicle machine that produces
// exactly the reading order the model intends —
//
//     ● -> Off -> Starting -> Ready -> Driving -> ◎ Complete
//                                        Fault
//
// with Fault on a second row because it shares Driving's column. Wide
// machines fold into bands of `maxPerRow` columns so the diagram still fits
// (and stays legible) inside the 420px panel and at mobile widths.
import { h } from './dom';
import type { State, StateMachine, Transition } from '../model/schema';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Geometry, in viewBox units. The SVG is scaled to the panel by `width: 100%`. */
const PAD = 10;
/** Extra room above the first row: trigger labels sit above their row, not on it. */
const PAD_TOP = 24;
const STATE_W = 82;
const STATE_H = 32;
const GAP_X = 30;
const GAP_Y = 28;
const INITIAL_W = 22;
const FINAL_W = 66;
/**
 * Columns per band before the diagram folds onto another row. Four keeps the
 * boxes near 1:1 inside the 420px panel; five would scale them down by a
 * quarter, which is where the labels stop being readable.
 */
const DEFAULT_MAX_PER_ROW = 4;

/** Bumped per diagram so several diagrams on one page never share a marker id. */
let markerSeq = 0;

export interface StateDiagramOptions {
  /** State id drawn in the accent colour, e.g. the mode a tour step is describing. */
  highlightState?: string;
  onStateClick?(stateId: string): void;
  /** Columns per band before the diagram folds onto another row. Defaults to 4. */
  maxPerRow?: number;
}

function svg(tag: string, attrs: Record<string, string | number | undefined> = {}, ...children: Node[]): SVGElement {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== undefined) el.setAttribute(k, String(v));
  }
  for (const child of children) el.append(child);
  return el;
}

/**
 * `StartCommand` -> `Start command`, `SOCLimit` -> `SOC limit`. Splits on
 * camel/Pascal boundaries, keeps runs of capitals (acronyms) together, and
 * sentence-cases the result.
 */
export function humanise(name: string): string {
  const words = name
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return name;
  return words
    .map((w, i) => {
      if (/^[A-Z]{2,}$/.test(w)) return w; // acronym: leave alone
      return i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w.toLowerCase();
    })
    .join(' ');
}

function isInitial(s: State): boolean {
  return s.kind === 'initial';
}
function isFinal(s: State): boolean {
  return s.kind === 'final';
}
function nodeWidth(s: State): number {
  if (isInitial(s)) return INITIAL_W;
  if (isFinal(s)) return FINAL_W;
  return STATE_W;
}

interface Placed {
  state: State;
  /** Global column index from the BFS. */
  col: number;
  /** Sub-row within the band: 0 is the main chain. */
  sub: number;
  band: number;
  colInBand: number;
  /** Resolved geometry (box for states, glyph centre for initial/final). */
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Column per state (BFS depth from the initial pseudostate) and sub-row
 * (0 unless the column is already taken). States unreachable from the
 * initial pseudostate are appended after the last column so malformed data
 * still draws something.
 */
function layout(sm: StateMachine, maxPerRow: number): { placed: Placed[]; width: number; height: number } {
  const byId = new Map(sm.states.map((s) => [s.id, s]));
  const outgoing = new Map<string, Transition[]>();
  for (const t of sm.transitions) {
    const list = outgoing.get(t.source);
    if (list) list.push(t);
    else outgoing.set(t.source, [t]);
  }

  const start = sm.states.find(isInitial) ?? sm.states[0];
  const col = new Map<string, number>();
  if (start) col.set(start.id, 0);
  let frontier = start ? [start.id] : [];
  const order: string[] = start ? [start.id] : [];
  let depth = 0;
  while (frontier.length > 0) {
    depth += 1;
    const next: string[] = [];
    for (const id of frontier) {
      for (const t of outgoing.get(id) ?? []) {
        if (col.has(t.target) || !byId.has(t.target)) continue;
        col.set(t.target, depth);
        order.push(t.target);
        next.push(t.target);
      }
    }
    frontier = next;
  }
  let orphanCol = depth;
  for (const s of sm.states) {
    if (col.has(s.id)) continue;
    col.set(s.id, (orphanCol += 1));
    order.push(s.id);
  }

  // First arrival keeps the top row of its column; the rest stack underneath.
  const taken = new Map<number, number>();
  const placed: Placed[] = [];
  for (const id of order) {
    const state = byId.get(id);
    if (!state) continue;
    const c = col.get(id) ?? 0;
    const sub = taken.get(c) ?? 0;
    taken.set(c, sub + 1);
    placed.push({
      state,
      col: c,
      sub,
      band: Math.floor(c / maxPerRow),
      colInBand: c % maxPerRow,
      x: 0,
      y: 0,
      w: nodeWidth(state),
      h: STATE_H,
    });
  }

  // Column widths and band heights, then absolute positions.
  const bandCount = placed.reduce((m, p) => Math.max(m, p.band), 0) + 1;
  const colWidth: number[][] = [];
  const bandRows: number[] = [];
  for (let b = 0; b < bandCount; b += 1) {
    const inBand = placed.filter((p) => p.band === b);
    const widths: number[] = [];
    for (const p of inBand) widths[p.colInBand] = Math.max(widths[p.colInBand] ?? 0, p.w);
    colWidth[b] = widths;
    bandRows[b] = inBand.reduce((m, p) => Math.max(m, p.sub), 0) + 1;
  }

  const bandY: number[] = [];
  let rowCursor = 0;
  for (let b = 0; b < bandCount; b += 1) {
    bandY[b] = rowCursor;
    rowCursor += bandRows[b] ?? 1;
  }

  let width = 0;
  for (let b = 0; b < bandCount; b += 1) {
    const widths = colWidth[b] ?? [];
    const xs: number[] = [];
    let cursor = PAD;
    for (let c = 0; c < widths.length; c += 1) {
      xs[c] = cursor;
      cursor += (widths[c] ?? 0) + GAP_X;
    }
    width = Math.max(width, cursor - GAP_X + PAD);
    for (const p of placed) {
      if (p.band !== b) continue;
      const cellX = xs[p.colInBand] ?? PAD;
      const cellW = widths[p.colInBand] ?? p.w;
      p.x = cellX + (cellW - p.w) / 2;
      p.y = PAD_TOP + ((bandY[b] ?? 0) + p.sub) * (STATE_H + GAP_Y);
    }
  }

  const height = PAD_TOP + rowCursor * (STATE_H + GAP_Y) - GAP_Y + PAD;
  return { placed, width, height };
}

interface Point {
  x: number;
  y: number;
}

/**
 * The path from one placed state to another. Straight when they are simply
 * side by side or stacked, an elbow when the diagram folds, a shallow curve
 * otherwise — so no edge reads as a line straight through the states between
 * its ends.
 */
function edgePath(a: Placed, b: Placed): string {
  const ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
  const bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  const dx = bc.x - ac.x;
  const dy = bc.y - ac.y;

  // A folded band puts the next state below and to the left. Drawing that as
  // a direct line would cut straight back across the states in between, so it
  // takes the elbow route every serpentine diagram uses: down, back along the
  // empty gap above the target row, then down into it.
  if (b.y > a.y + a.h && bc.x < ac.x) {
    const lane = b.y - GAP_Y / 2;
    const d = [
      `M ${round(ac.x)} ${round(a.y + a.h)}`,
      `L ${round(ac.x)} ${round(lane)}`,
      `L ${round(bc.x)} ${round(lane)}`,
      `L ${round(bc.x)} ${round(b.y)}`,
    ].join(' ');
    return d;
  }

  const horizontal = Math.abs(dx) >= Math.abs(dy);

  let from: Point;
  let to: Point;
  if (horizontal) {
    from = { x: dx >= 0 ? a.x + a.w : a.x, y: ac.y };
    to = { x: dx >= 0 ? b.x : b.x + b.w, y: bc.y };
  } else {
    from = { x: ac.x, y: dy >= 0 ? a.y + a.h : a.y };
    to = { x: bc.x, y: dy >= 0 ? b.y : b.y + b.h };
  }

  const straight = (horizontal && Math.abs(from.y - to.y) < 0.5) || (!horizontal && Math.abs(from.x - to.x) < 0.5);
  if (straight) {
    return `M ${round(from.x)} ${round(from.y)} L ${round(to.x)} ${round(to.y)}`;
  }

  const cx = (from.x + to.x) / 2 + (horizontal ? 0 : 18);
  const cy = (from.y + to.y) / 2 + (horizontal ? -14 : 0);
  return `M ${round(from.x)} ${round(from.y)} Q ${round(cx)} ${round(cy)} ${round(to.x)} ${round(to.y)}`;
}

/**
 * Where a transition's trigger name goes: centred just above the state it
 * leads *into*. A trigger name is wider than the gap between two boxes, so
 * sitting it on the arrow would put it on top of one of them; above the
 * target it reads as "this is how you get here", and two transitions into
 * the same state on the same signal collapse onto one label.
 */
function labelPoint(b: Placed): Point {
  return { x: b.x + b.w / 2, y: b.y - 6 };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

/** The human-readable trigger on a transition, e.g. `Start command`. */
export function triggerLabel(t: Transition): string {
  return t.trigger?.name ? humanise(t.trigger.name) : '';
}

/**
 * Render one state machine as an inline SVG. The SVG carries no colours of
 * its own: every stroke and fill comes from `.state-diagram` rules in
 * style.css, which read the theme tokens, so it follows dark/light with the
 * rest of the panel.
 */
export function renderStateDiagram(sm: StateMachine, opts: StateDiagramOptions = {}): SVGElement {
  const maxPerRow = Math.max(2, opts.maxPerRow ?? DEFAULT_MAX_PER_ROW);
  const { placed, width, height } = layout(sm, maxPerRow);
  const byId = new Map(placed.map((p) => [p.state.id, p]));
  const markerId = `sd-arrow-${(markerSeq += 1)}`;

  const root = svg('svg', {
    class: 'state-diagram',
    'data-testid': 'state-diagram',
    'data-state-machine': sm.id,
    viewBox: `0 0 ${round(width)} ${round(height)}`,
    role: 'img',
    'aria-label': `${sm.name}: ${placed.length} modes, ${sm.transitions.length} changes`,
    preserveAspectRatio: 'xMidYMin meet',
  });

  root.append(
    svg(
      'defs',
      {},
      svg(
        'marker',
        { id: markerId, markerWidth: 8, markerHeight: 8, refX: 7, refY: 3, orient: 'auto', markerUnits: 'userSpaceOnUse' },
        svg('path', { class: 'sd-arrowhead', d: 'M 0 0 L 7 3 L 0 6 z' }),
      ),
    ),
  );

  // Transitions first so the state boxes paint over the line ends.
  const edges = svg('g', { class: 'sd-edges' });
  const drawnLabels = new Set<string>();
  for (const t of sm.transitions) {
    const a = byId.get(t.source);
    const b = byId.get(t.target);
    if (!a || !b) continue;
    const group = svg('g', { class: 'sd-edge', 'data-transition-id': t.id });
    group.append(svg('path', { class: 'sd-edge-line', d: edgePath(a, b), 'marker-end': `url(#${markerId})`, fill: 'none' }));
    const text = triggerLabel(t);
    const label = labelPoint(b);
    const key = `${text}@${round(label.x)},${round(label.y)}`;
    if (text && !drawnLabels.has(key)) {
      drawnLabels.add(key);
      group.append(
        svg('text', { class: 'sd-edge-label', x: round(label.x), y: round(label.y), 'text-anchor': 'middle' }, document.createTextNode(text)),
      );
    }
    edges.append(group);
  }
  root.append(edges);

  const nodes = svg('g', { class: 'sd-states' });
  for (const p of placed) {
    const highlighted = opts.highlightState === p.state.id;
    const clickable = !!opts.onStateClick;
    const group = svg('g', {
      class: `sd-state${highlighted ? ' is-highlight' : ''}${clickable ? ' is-clickable' : ''}`,
      'data-state-id': p.state.id,
      'data-state-kind': p.state.kind,
      role: clickable ? 'button' : undefined,
      tabindex: clickable ? 0 : undefined,
    });
    group.append(svg('title', {}, document.createTextNode(p.state.name)));

    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    if (isInitial(p.state)) {
      group.append(svg('circle', { class: 'sd-initial', cx: round(cx), cy: round(cy), r: 7 }));
    } else if (isFinal(p.state)) {
      group.append(svg('circle', { class: 'sd-final-outer', cx: round(cx), cy: round(cy) - 4, r: 10 }));
      group.append(svg('circle', { class: 'sd-final-inner', cx: round(cx), cy: round(cy) - 4, r: 5 }));
      group.append(
        svg(
          'text',
          { class: 'sd-state-label', x: round(cx), y: round(p.y + p.h) + 10, 'text-anchor': 'middle' },
          document.createTextNode(p.state.name),
        ),
      );
    } else {
      group.append(
        svg('rect', { class: 'sd-state-box', x: round(p.x), y: round(p.y), width: round(p.w), height: round(p.h), rx: 8, ry: 8 }),
      );
      group.append(
        svg(
          'text',
          { class: 'sd-state-label', x: round(cx), y: round(cy) + 4, 'text-anchor': 'middle' },
          document.createTextNode(p.state.name),
        ),
      );
    }

    if (clickable) {
      group.addEventListener('click', () => opts.onStateClick?.(p.state.id));
      group.addEventListener('keydown', (e) => {
        const key = (e as KeyboardEvent).key;
        if (key === 'Enter' || key === ' ') {
          e.preventDefault();
          opts.onStateClick?.(p.state.id);
        }
      });
    }
    nodes.append(group);
  }
  root.append(nodes);

  return root;
}

/**
 * The text equivalent of the diagram, collapsed by default: every transition
 * as "Off → Starting when Start command". Screen readers and anyone who
 * would rather read a list get the same information the picture carries.
 */
export function renderTransitionList(sm: StateMachine): HTMLElement {
  const names = new Map(sm.states.map((s) => [s.id, s.name]));
  const list = h('ol', { class: 'list sd-transition-list' });
  for (const t of sm.transitions) {
    const from = names.get(t.source) ?? t.source;
    const to = names.get(t.target) ?? t.target;
    const trigger = triggerLabel(t);
    list.append(
      h(
        'li',
        { class: 'list-row sd-transition-row', 'data-transition-id': t.id },
        h('span', { class: 'ladder-text' }, `${from} → ${to}`),
        trigger ? h('span', { class: 'muted' }, `when ${trigger}`) : null,
      ),
    );
  }

  const details = h('details', { class: 'sd-transitions', 'data-testid': 'transition-list' });
  details.append(h('summary', {}, `All ${sm.transitions.length} changes, as text`), list);
  return details;
}
