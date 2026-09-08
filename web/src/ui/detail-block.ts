// Block detail card: header, plain summary sentence, and five sections
// ("Responsible for", "Talks to", "Used in scenarios", "Proven by tests",
// "Contains / Part of").
import { h } from './dom';
import { traceForBlock, traceForRequirement } from '../model/trace';
import type { ModelIndex } from '../model/index';
import { colorChip } from './chips';
import { label } from '../plain';
import { renderLadder } from './ladder';
import type { Terms } from '../state/store';

export interface DetailBlockOptions {
  palette: Record<string, string>;
  terms: Terms;
  onSelectBlock(id: string): void;
  onSelectRequirement(id: string): void;
  onHoverBlock(id: string | null): void;
  onSelectTest?(id: string): void;
  onSelectUseCase?(id: string): void;
}

export function renderBlockDetail(idx: ModelIndex, blockId: string, opts: DetailBlockOptions): HTMLElement {
  const trace = traceForBlock(idx, blockId);
  const block = trace.block;
  const color = opts.palette[block.id] ?? (typeof block.color === 'string' ? block.color : '#94A3B8');
  const name = block.label ?? block.name;

  const header = h(
    'div',
    { class: 'detail-header' },
    colorChip(color, block.id),
    h(
      'div',
      { class: 'detail-header-text' },
      h('h2', { class: 'detail-title', id: 'detail-title', 'data-testid': 'detail-title' }, name),
      opts.terms === 'sysml' ? h('div', { class: 'muted detail-formal' }, block.name) : null,
    ),
  );

  const sentence = h(
    'p',
    { class: 'detail-sentence' },
    `The ${name} is responsible for ${trace.reqCount} requirement${trace.reqCount === 1 ? '' : 's'} and is proven by ${trace.testCount} test${trace.testCount === 1 ? '' : 's'}.`,
  );

  const reqCountChip = h(
    'span',
    { id: 'req-count', class: 'chip req-count', 'data-testid': 'req-count' },
    `${trace.reqCount} requirement${trace.reqCount === 1 ? '' : 's'}`,
  );

  const respSection = h('section', { class: 'detail-section' }, h('h3', {}, label('Satisfy', opts.terms, 'partCard')));
  if (trace.reqsByCategory.length === 0) {
    respSection.append(h('p', { class: 'muted' }, 'No requirements recorded.'));
  }
  for (const group of trace.reqsByCategory) {
    respSection.append(h('h4', { class: 'req-group-header' }, opts.terms === 'sysml' ? group.category.name : group.category.plain));
    const list = h('ul', { class: 'list' });
    for (const req of group.reqs) {
      const row = h('li', { class: 'list-row expandable-row', 'data-testid': 'expandable-req-row' });
      let ladderExpanded = false;
      const rowHead = h(
        'div',
        {
          class: 'row-main',
          role: 'button',
          tabIndex: 0,
          on: {
            click: () => toggle(),
            keydown: (e: Event) => {
              if ((e as KeyboardEvent).key === 'Enter') toggle();
            },
          },
        },
        h('span', { class: 'chip id-chip' }, req.displayId ?? req.id),
        h('span', { class: 'row-label' }, req.name),
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn-link',
            on: {
              click: (e: Event) => {
                e.stopPropagation();
                opts.onSelectRequirement(req.id);
              },
            },
          },
          'Open',
        ),
      );
      row.append(rowHead);

      function toggle() {
        ladderExpanded = !ladderExpanded;
        const existing = row.querySelector('.ladder');
        if (existing) existing.remove();
        if (ladderExpanded) {
          const t = traceForRequirement(idx, req.id);
          row.append(
            renderLadder(idx, t, {
              onSelectRequirement: opts.onSelectRequirement,
              onHoverBlock: opts.onHoverBlock,
              onSelectTest: opts.onSelectTest,
              terms: opts.terms,
            }),
          );
        }
      }

      list.append(row);
    }
    respSection.append(list);
  }

  const talksTo = h('section', { class: 'detail-section' }, h('h3', {}, 'Talks to'));
  const flowsList = h('ul', { class: 'list' });
  for (const flow of trace.flows.out) {
    const target = idx.byId.get(flow.target);
    flowsList.append(
      h(
        'li',
        { class: 'list-row flow-row' },
        h('span', { class: 'muted' }, `${label('ItemFlow', opts.terms, 'flowOut')} ${flow.label} → `),
        h('button', { type: 'button', class: 'btn btn-link', on: { click: () => opts.onSelectBlock(flow.target) } }, target?.label ?? target?.name ?? flow.target),
      ),
    );
  }
  for (const flow of trace.flows.in) {
    const source = idx.byId.get(flow.source);
    flowsList.append(
      h(
        'li',
        { class: 'list-row flow-row' },
        h('span', { class: 'muted' }, `${label('ItemFlow', opts.terms, 'flowIn')} ${flow.label} ← `),
        h('button', { type: 'button', class: 'btn btn-link', on: { click: () => opts.onSelectBlock(flow.source) } }, source?.label ?? source?.name ?? flow.source),
      ),
    );
  }
  if (trace.flows.out.length === 0 && trace.flows.in.length === 0) {
    flowsList.append(h('li', { class: 'muted' }, 'No connections recorded.'));
  }
  talksTo.append(flowsList);

  const scenarios = h('section', { class: 'detail-section' }, h('h3', {}, 'Used in scenarios'));
  if (trace.useCases.length > 0) {
    scenarios.append(
      h(
        'ul',
        { class: 'list' },
        ...trace.useCases.map((uc) =>
          h('li', { class: 'list-row', role: 'button', tabIndex: 0, on: { click: () => opts.onSelectUseCase?.(uc.id) } }, uc.name),
        ),
      ),
    );
  } else {
    scenarios.append(h('p', { class: 'muted' }, 'Not used in any scenario yet.'));
  }

  const testsSection = h('section', { class: 'detail-section' }, h('h3', {}, label('Verify', opts.terms)));
  if (trace.tests.length > 0) {
    testsSection.append(
      h(
        'ul',
        { class: 'list' },
        ...trace.tests.map((t) =>
          h('li', { class: 'list-row', role: 'button', tabIndex: 0, on: { click: () => opts.onSelectTest?.(t.id) } }, '✓ ', t.name),
        ),
      ),
    );
  } else {
    testsSection.append(h('p', { class: 'muted' }, 'No tests recorded.'));
  }

  const containment = h('section', { class: 'detail-section' }, h('h3', {}, 'Contains / Part of'));
  const containList = h('ul', { class: 'list' });
  if (trace.parent) {
    const parent = trace.parent;
    containList.append(
      h(
        'li',
        { class: 'list-row', role: 'button', tabIndex: 0, on: { click: () => opts.onSelectBlock(parent.id) } },
        `Part of ${parent.label ?? parent.name}`,
      ),
    );
  }
  for (const child of trace.children) {
    containList.append(
      h('li', { class: 'list-row', role: 'button', tabIndex: 0, on: { click: () => opts.onSelectBlock(child.id) } }, `Contains ${child.label ?? child.name}`),
    );
  }
  if (!trace.parent && trace.children.length === 0) {
    containList.append(h('li', { class: 'muted' }, 'Top-level part.'));
  }
  containment.append(containList);

  return h(
    'div',
    { class: 'card detail-card block-detail' },
    header,
    typeof block.blurb === 'string' ? h('p', { class: 'muted' }, block.blurb) : null,
    sentence,
    h('div', { class: 'panel-meta' }, reqCountChip),
    respSection,
    talksTo,
    scenarios,
    testsSection,
    containment,
  );
}
