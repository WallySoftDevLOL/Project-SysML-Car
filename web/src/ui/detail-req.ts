// Requirement detail card: id chip + name, always-visible requirement text,
// collapsible rationale ("Why this matters") and acceptance ("How we accept
// it"), the trace ladder, and a Related section (refiners, scenarios, copies).
import { h } from './dom';
import { traceForRequirement } from '../model/trace';
import type { ModelIndex } from '../model/index';
import { idChip } from './chips';
import { label } from '../plain';
import { renderLadder } from './ladder';
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

  return h('div', { class: 'card detail-card req-detail' }, header, text, rationale, acceptance, ladder, related);
}
