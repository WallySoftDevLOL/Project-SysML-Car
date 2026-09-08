// Small reusable chip/badge/dot elements shared across the panel modules.
import { h } from './dom';
import { onColor } from '../palette';

/** A colored pill chip, e.g. a block's color + label. */
export function colorChip(color: string, text: string, opts: { title?: string; className?: string } = {}): HTMLElement {
  const fg = onColor(color);
  return h(
    'span',
    {
      class: `chip color-chip ${opts.className ?? ''}`.trim(),
      style: { background: color, color: fg, borderColor: color },
      title: opts.title,
    },
    text,
  );
}

/** A small colored dot, used in legend rows and requirement "satisfied by" indicators. */
export function dot(color: string, title?: string): HTMLElement {
  return h('span', { class: 'dot', style: { background: color }, title });
}

/** A monospace requirement displayId chip, e.g. "SYS-002". */
export function idChip(displayId: string): HTMLElement {
  return h('span', { class: 'chip id-chip' }, displayId);
}

/** A plain neutral chip for counts/badges/labels. */
export function textChip(text: string, opts: { className?: string; title?: string } = {}): HTMLElement {
  return h('span', { class: `chip ${opts.className ?? ''}`.trim(), title: opts.title }, text);
}

/**
 * A hollow/outlined chip — e.g. a component part-list row's requirement
 * count, which is its parent system's count, not its own (components satisfy
 * nothing directly; contract section 1).
 */
export function outlineChip(text: string, opts: { className?: string; title?: string } = {}): HTMLElement {
  return h('span', { class: `chip is-outline ${opts.className ?? ''}`.trim(), title: opts.title }, text);
}
