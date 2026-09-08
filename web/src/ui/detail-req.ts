// Requirement detail card: id chip + name, always-visible requirement text,
// collapsible rationale ("Why this matters") and acceptance ("How we accept
// it"), the trace ladder, and a Related section (refiners, scenarios, copies).
import { h } from './dom';
import { traceForRequirement } from '../model/trace';
import type { ModelIndex } from '../model/index';
import { idChip } from './chips';
import { label } from '../plain';
import { renderLadder } from './ladder';
import { renderParametricCard } from './parametric-card';
import { humanise } from './state-diagram';
import { behaviorIndex } from '../model/behavior';
import { thresholdsFor } from '../model/parametrics';
import { ancestors, descendants } from '../model/trace';
import type { Parametric } from '../model/schema';
import type { Terms } from '../state/store';

export interface DetailReqOptions {
  terms: Terms;
  onSelectRequirement(id: string): void;
  onSelectBlock(id: string): void;
  onHoverBlock(id: string | null): void;
  onSelectTest?(id: string): void;
  onSelectUseCase?(id: string): void;
}

function collapsible(title: string, content: string | null | undefined): HTMLElement {
  const wrap = h('div', { class: 'collapsible' });
  let open = false;
  const body = h('div', { class: 'collapsible-body', hidden: true }, content ?? 'Not recorded.');
  const btn = h(
    'button',
    {
      type: 'button',
      class: 'btn btn-link collapsible-toggle',
      'aria-expanded': 'false',
      on: {
        click: () => {
          open = !open;
          btn.setAttribute('aria-expanded', String(open));
          body.hidden = !open;
        },
      },
    },
    title,
  );
  wrap.append(btn, body);
  return wrap;
}

export function renderRequirementDetail(idx: ModelIndex, reqId: string, opts: DetailReqOptions): HTMLElement {
  const trace = traceForRequirement(idx, reqId);
  const req = trace.self;

  const header = h(
    'div',
    { class: 'detail-header' },
    idChip(req.displayId ?? req.id),
    h('h2', { class: 'detail-title', id: 'detail-title', 'data-testid': 'detail-title' }, req.name),
  );

  const text = h('p', { class: 'detail-sentence req-text' }, req.text ?? '');

  const rationale = collapsible('Why this matters', typeof req.rationale === 'string' ? req.rationale : null);
  const acceptance = collapsible('How we accept it', typeof req.acceptance === 'string' ? req.acceptance : null);

  const ladder = renderLadder(idx, trace, {
    onSelectRequirement: opts.onSelectRequirement,
    onHoverBlock: opts.onHoverBlock,
    onSelectTest: opts.onSelectTest,
    terms: opts.terms,
  });

  const related = h('section', { class: 'detail-section' }, h('h3', {}, 'Related'));
  if (trace.refiners.length > 0) {
    related.append(h('h4', { class: 'req-group-header' }, label('Refine', opts.terms)));
    related.append(h('ul', { class: 'list' }, ...trace.refiners.map((r) => h('li', { class: 'list-row' }, r.name))));
  }
  if (trace.useCases.length > 0) {
    related.append(h('h4', { class: 'req-group-header' }, label('Trace', opts.terms)));
    related.append(
      h(
        'ul',
        { class: 'list' },
        ...trace.useCases.map((uc) =>
          h('li', { class: 'list-row', role: 'button', tabIndex: 0, on: { click: () => opts.onSelectUseCase?.(uc.id) } }, uc.name),
        ),
      ),
    );
  }
  if (trace.copies.length > 0) {
    related.append(
      h(
        'p',
        { class: 'muted footnote' },
        `${trace.copies.length} ${label('Copy', opts.terms)}${trace.copies.length === 1 ? '' : ' copies'} kept for the verification view.`,
      ),
    );
  }
  if (trace.refiners.length === 0 && trace.useCases.length === 0 && trace.copies.length === 0) {
    related.append(h('p', { class: 'muted' }, 'Nothing else linked yet.'));
  }

  // --- contract section 6 -----------------------------------------------
  // The analyses that put a number on this requirement, then the procedures
  // and message sequences that carry it out. All three are silent when the
  // model has nothing to say.
  const parametricCards = parametricsForRequirement(idx, reqId).map((p) =>
    renderParametricCard(idx, p, { terms: opts.terms, requirementId: reqId }),
  );

  const behavior = behaviorIndex(idx.model);

  const activities = behavior.activities.filter((a) => (a.refines ?? []).includes(reqId));
  const procedures = h('section', { class: 'detail-section', 'data-testid': 'procedures' }, h('h3', { title: 'Activity' }, opts.terms === 'sysml' ? 'Activity' : 'Procedures'));
  for (const activity of activities) {
    // activityOutline walks every node; the initial and final markers carry
    // no instruction for a reader, so only the real steps get numbered.
    const steps = behavior.activityOutline(activity.id).filter((n) => n.kind !== 'initial' && n.kind !== 'final');
    if (steps.length === 0) continue;
    procedures.append(h('h4', { class: 'req-group-header' }, activity.name));
    procedures.append(
      h(
        'ol',
        { class: 'list step-list' },
        ...steps.map((step) => h('li', { class: 'list-row step-row', title: step.body ?? undefined }, step.name)),
      ),
    );
  }
  const hasProcedures = procedures.querySelector('.step-list') !== null;

  // Sequences reach this requirement through the blocks that satisfy it —
  // one cheap hop through the block ids the trace already computed.
  const sequences = h('section', { class: 'detail-section', 'data-testid': 'sequences' }, h('h3', { title: 'Interaction' }, opts.terms === 'sysml' ? 'Interaction' : 'Sequence'));
  const seenInteractions = new Set<string>();
  for (const block of trace.blocks.direct) {
    for (const interaction of behavior.interactionsInvolving(block.id)) {
      if (seenInteractions.has(interaction.id)) continue;
      seenInteractions.add(interaction.id);
      sequences.append(h('h4', { class: 'req-group-header' }, interaction.name));
      sequences.append(
        h(
          'ol',
          { class: 'list step-list' },
          ...behavior.messageSequence(interaction.id).map((m) =>
            h(
              'li',
              { class: 'list-row step-row' },
              h('span', { class: 'row-label' }, humanise(m.name)),
              h('span', { class: 'muted' }, `${idx.displayName(m.fromBlock)} → ${idx.displayName(m.toBlock)}`),
            ),
          ),
        ),
      );
    }
  }

  return h(
    'div',
    { class: 'card detail-card req-detail' },
    header,
    text,
    ...parametricCards,
    rationale,
    acceptance,
    ladder,
    hasProcedures ? procedures : null,
    seenInteractions.size > 0 ? sequences : null,
    related,
  );
}

/**
 * How far along the DeriveRequirement chain a parametric card still earns its
 * place. The range analysis is recorded against the STK-002 customer need,
 * but the requirement that actually states its number — PERF-003 — sits two
 * Derive hops below it, so the reach has to be two in either direction.
 */
const MAX_DERIVE_HOPS = 2;

/**
 * Every parametric worth showing on a requirement's card: the ones recorded
 * against it, then the ones recorded against a requirement it derives from
 * (or that derives from it) *and* whose answer this requirement actually
 * states a threshold for. That second test is what keeps the tractive-force
 * calculator off "Drive Request Validation", which shares an ancestor with
 * it but says nothing about newtons.
 */
function parametricsForRequirement(idx: ModelIndex, reqId: string): Parametric[] {
  const direct: Parametric[] = [];
  const related: Parametric[] = [];
  for (const p of idx.model.parametrics ?? []) {
    if ((p.refines ?? []).includes(reqId)) {
      direct.push(p);
    } else if (withinDeriveReach(idx, p, reqId) && statesAThresholdFor(idx, p, reqId)) {
      related.push(p);
    }
  }
  return [...direct, ...related];
}

/** Is `reqId` within {@link MAX_DERIVE_HOPS} of anything `p` is recorded against, up or down? */
function withinDeriveReach(idx: ModelIndex, p: Parametric, reqId: string): boolean {
  return (p.refines ?? []).some(
    (r) =>
      ancestors(idx, r).some((a) => a.id === reqId && a.depth <= MAX_DERIVE_HOPS) ||
      descendants(idx, r).some((d) => d.id === reqId && d.depth <= MAX_DERIVE_HOPS),
  );
}

/** Does `reqId`'s own wording give a threshold in the unit `p` computes in? */
function statesAThresholdFor(idx: ModelIndex, p: Parametric, reqId: string): boolean {
  const threshold = thresholdsFor(idx, { ...p, refines: [reqId] });
  if (!threshold) return false;
  const outputUnit = p.parameters.find((q) => q.parameter === p.output)?.unit ?? '';
  return sameUnitFamily(threshold.unit ?? '', outputUnit);
}

/**
 * `kW` and `W` measure the same thing; `kWh` and `km` do not. Dropping a
 * leading SI prefix is enough to tell those apart for the units this model
 * uses, and needs no second copy of the data layer's conversion table.
 */
function sameUnitFamily(a: string, b: string): boolean {
  const base = (unit: string) => unit.replace(/^[kM]/, '').toLowerCase();
  return a !== '' && b !== '' && base(a) === base(b);
}
