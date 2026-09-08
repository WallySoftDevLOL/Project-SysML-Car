// The vertical trace ladder shown on a requirement's detail card: customer
// need -> system/perf/interface -> subsystem -> parts built into -> tests
// that prove it. A left rail connects the rungs; the selected requirement's
// own rung is bold/colored, and rungs reached only via a derived requirement
// are muted with a "via derived requirement" tooltip.
import { h } from './dom';
import type { ModelIndex } from '../model/index';
import type { RequirementTrace } from '../model/trace';
import type { Element } from '../model/schema';
import { idChip } from './chips';
import { label } from '../plain';
import type { Terms } from '../state/store';

export interface LadderOptions {
  onSelectRequirement(id: string): void;
  onHoverBlock(id: string | null): void;
  onSelectTest?(id: string): void;
  terms: Terms;
}

function reqRung(idx: ModelIndex, req: Element, opts: LadderOptions, isSelf: boolean, muted: boolean) {
  return h(
    'div',
    {
      class: `ladder-rung req-rung${isSelf ? ' is-active' : ''}${muted ? ' is-muted' : ''}`,
      title: muted ? 'via derived requirement' : undefined,
      tabIndex: 0,
      role: 'button',
      on: {
        click: () => opts.onSelectRequirement(req.id),
        keydown: (e: Event) => {
          const ke = e as KeyboardEvent;
          if (ke.key === 'Enter') opts.onSelectRequirement(req.id);
        },
      },
    },
    h('span', { class: 'ladder-marker', 'aria-hidden': 'true' }, '●'),
    idChip(req.displayId ?? req.id),
    h('span', { class: 'ladder-text' }, req.name),
  );
}

export function renderLadder(idx: ModelIndex, trace: RequirementTrace, opts: LadderOptions): HTMLElement {
  const rows: HTMLElement[] = [];

  if (trace.stakeholderRoots.length === 0) {
    rows.push(h('div', { class: 'ladder-rung is-muted' }, 'No customer need linked'));
  } else {
    for (const root of trace.stakeholderRoots) {
      rows.push(reqRung(idx, root, opts, root.id === trace.self.id, false));
    }
  }

  for (const group of trace.upstream) {
    if (group.level === 0) continue; // already rendered as stakeholder roots above
    for (const req of group.reqs) {
      rows.push(reqRung(idx, req, opts, req.id === trace.self.id, false));
    }
  }

  // The selected requirement itself, if it wasn't already covered above
  // (e.g. it has no upstream at all, or it *is* the stakeholder root).
  const alreadyShown = trace.stakeholderRoots.some((r) => r.id === trace.self.id) || trace.upstream.some((g) => g.reqs.some((r) => r.id === trace.self.id));
  if (!alreadyShown) {
    rows.push(reqRung(idx, trace.self, opts, true, false));
  }

  // Derived (downstream) requirements, muted, with a "via derived requirement" hint.
  for (const d of trace.derived) {
    rows.push(reqRung(idx, d, opts, false, true));
  }

  const builtLabel = label('Satisfy', opts.terms, 'partCard');
  const allBlocks = [
    ...trace.blocks.direct.map((b) => ({ block: b, muted: false })),
    ...trace.blocks.inherited.map((b) => ({ block: b, muted: true })),
  ];
  if (allBlocks.length > 0) {
    rows.push(h('div', { class: 'ladder-section-label' }, builtLabel));
    for (const { block, muted } of allBlocks) {
      rows.push(
        h(
          'div',
          {
            class: `ladder-rung part-rung${muted ? ' is-muted' : ''}`,
            title: muted ? 'via derived requirement' : undefined,
            on: {
              mouseenter: () => opts.onHoverBlock(block.id),
              mouseleave: () => opts.onHoverBlock(null),
            },
          },
          h('span', { class: 'ladder-marker', 'aria-hidden': 'true' }, '■'),
          h('span', { class: 'ladder-text' }, block.label ?? block.name),
        ),
      );
    }
  }

  const provenLabel = label('Verify', opts.terms);
  const allTests = [
    ...trace.tests.direct.map((t) => ({ test: t, muted: false })),
    ...trace.tests.inherited.map((t) => ({ test: t, muted: true })),
  ];
  if (allTests.length > 0) {
    rows.push(h('div', { class: 'ladder-section-label' }, provenLabel));
    for (const { test, muted } of allTests) {
      const clickable = !!opts.onSelectTest;
      rows.push(
        h(
          'div',
          {
            class: `ladder-rung test-rung${muted ? ' is-muted' : ''}`,
            title: muted ? 'via derived requirement' : undefined,
            tabIndex: clickable ? 0 : undefined,
            role: clickable ? 'button' : undefined,
            on: clickable
              ? {
                  click: () => opts.onSelectTest?.(test.id),
                  keydown: (e: Event) => {
                    if ((e as KeyboardEvent).key === 'Enter') opts.onSelectTest?.(test.id);
                  },
                }
              : undefined,
          },
          h('span', { class: 'ladder-marker', 'aria-hidden': 'true' }, '✓'),
          h('span', { class: 'ladder-text' }, test.name),
        ),
      );
    }
  }

  return h('div', { class: 'ladder', 'data-testid': 'ladder' }, ...rows);
}
