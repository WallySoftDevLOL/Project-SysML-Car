// Minimal detail cards for TestCase and UseCase selections.
import { h } from './dom';
import { traceForTest, traceForUseCase } from '../model/trace';
import type { ModelIndex } from '../model/index';
import { label } from '../plain';
import type { Terms } from '../state/store';

export interface MiscDetailOptions {
  terms: Terms;
  onSelectRequirement(id: string): void;
  onSelectBlock(id: string): void;
}

export function renderTestDetail(idx: ModelIndex, id: string, opts: MiscDetailOptions): HTMLElement {
  const trace = traceForTest(idx, id);
  const header = h('h2', { class: 'detail-title', id: 'detail-title', 'data-testid': 'detail-title' }, trace.test.name);

  const reqsSection = h('section', { class: 'detail-section' }, h('h3', {}, label('Verify', opts.terms)));
  if (trace.reqs.length > 0) {
    reqsSection.append(
      h(
        'ul',
        { class: 'list' },
        ...trace.reqs.map((r) =>
          h(
            'li',
            { class: 'list-row', role: 'button', tabIndex: 0, on: { click: () => opts.onSelectRequirement(r.id) } },
            h('span', { class: 'chip id-chip' }, r.displayId ?? r.id),
            h('span', { class: 'row-label' }, r.name),
          ),
        ),
      ),
    );
  } else {
    reqsSection.append(h('p', { class: 'muted' }, 'No requirements recorded.'));
  }

  const blocksSection = h('section', { class: 'detail-section' }, h('h3', {}, 'Parts involved'));
  if (trace.blocks.length > 0) {
    blocksSection.append(
      h(
        'ul',
        { class: 'list' },
        ...trace.blocks.map((b) => h('li', { class: 'list-row', role: 'button', tabIndex: 0, on: { click: () => opts.onSelectBlock(b.id) } }, b.label ?? b.name)),
      ),
    );
  } else {
    blocksSection.append(h('p', { class: 'muted' }, 'No parts recorded.'));
  }

  return h('div', { class: 'card detail-card test-detail' }, header, reqsSection, blocksSection);
}

export function renderUseCaseDetail(idx: ModelIndex, id: string, opts: MiscDetailOptions): HTMLElement {
  const trace = traceForUseCase(idx, id);
  const header = h('h2', { class: 'detail-title', id: 'detail-title', 'data-testid': 'detail-title' }, trace.useCase.name);

  const actorsSection = h(
    'p',
    { class: 'muted' },
    trace.actors.length > 0 ? `Actors: ${trace.actors.map((a) => a.name).join(', ')}` : 'No actors recorded.',
  );

  const blocksSection = h('section', { class: 'detail-section' }, h('h3', {}, label('Allocate', opts.terms)));
  if (trace.blocks.length > 0) {
    blocksSection.append(
      h(
        'ul',
        { class: 'list' },
        ...trace.blocks.map((b) => h('li', { class: 'list-row', role: 'button', tabIndex: 0, on: { click: () => opts.onSelectBlock(b.id) } }, b.label ?? b.name)),
      ),
    );
  } else {
    blocksSection.append(h('p', { class: 'muted' }, 'No parts allocated yet.'));
  }

  const reqsSection = h('section', { class: 'detail-section' }, h('h3', {}, label('Trace', opts.terms)));
  if (trace.reqs.length > 0) {
    reqsSection.append(
      h(
        'ul',
        { class: 'list' },
        ...trace.reqs.map((r) =>
          h(
            'li',
            { class: 'list-row', role: 'button', tabIndex: 0, on: { click: () => opts.onSelectRequirement(r.id) } },
            h('span', { class: 'chip id-chip' }, r.displayId ?? r.id),
            h('span', { class: 'row-label' }, r.name),
          ),
        ),
      ),
    );
  } else {
    reqsSection.append(h('p', { class: 'muted' }, 'No related requirements.'));
  }

  if (trace.included.length > 0 || trace.extended.length > 0) {
    const relatedUc = h('section', { class: 'detail-section' }, h('h3', {}, 'Related scenarios'));
    const list = h('ul', { class: 'list' });
    for (const uc of trace.included) list.append(h('li', { class: 'list-row' }, `Includes ${uc.name}`));
    for (const uc of trace.extended) list.append(h('li', { class: 'list-row' }, `Extended by ${uc.name}`));
    relatedUc.append(list);
    return h('div', { class: 'card detail-card usecase-detail' }, header, actorsSection, blocksSection, reqsSection, relatedUc);
  }

  return h('div', { class: 'card detail-card usecase-detail' }, header, actorsSection, blocksSection, reqsSection);
}
