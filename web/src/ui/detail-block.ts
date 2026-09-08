// Block detail card. Two layouts, chosen by `traceForBlock`'s `isInherited`
// flag (docs/model-contract.md section 1: a `tier: "component"` block
// satisfies nothing directly, so its requirements/tests/flows are its parent
// system's):
//   - system: header, plain summary sentence, the five trace sections
//     ("Responsible for", "Talks to", "Used in scenarios", "Proven by
//     tests", "Contains / Part of"), then what the model says the part
//     actually *is* and *does* (state machine, sub-parts, ports, signals,
//     operations, tracked values).
//   - component: header + a "Part of {parent}" link, a sentence that reads
//     against the parent, "Inherited responsibilities" (the parent's own
//     requirements), "Talks to" via the parent (flows tagged `viaParent`),
//     then the component's own ports/signals/operations/values, and
//     "Siblings" (the parent's other components).
// Every section renders only when the data is there, so both cards are
// unchanged for a model.json without contract section 6.
import { h } from './dom';
import { traceForBlock, traceForRequirement } from '../model/trace';
import type { BlockTrace } from '../model/trace';
import type { ModelIndex } from '../model/index';
import type { Category, Element } from '../model/schema';
import { colorChip, textChip } from './chips';
import { label } from '../plain';
import { renderLadder } from './ladder';
import { renderStateDiagram, renderTransitionList, humanise } from './state-diagram';
import { behaviorIndex, type BehaviorIndex } from '../model/behavior';
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

/**
 * Section headings, in plain language. `plain.ts` owns the singular term
 * ("Connection", "Tracks"); these are the section wordings the panel shows,
 * with the formal SysML term moved into the tooltip. In 'sysml' mode the two
 * swap places.
 */
const SECTION_HEADINGS: Record<string, string> = {
  StateMachine: 'How it behaves',
  PartProperty: 'Contains',
  Port: 'Connections',
  Reception: 'Listens for / Sends',
  Operation: 'Can do',
  ValueProperty: 'Tracks',
};

function sectionHeading(term: string, terms: Terms): HTMLElement {
  const plainText = SECTION_HEADINGS[term] ?? label(term, 'plain');
  return h('h3', { title: terms === 'sysml' ? plainText : term }, terms === 'sysml' ? term : plainText);
}

/** A section wrapper that keeps the "only render when there is content" rule in one place. */
function section(testid: string, term: string, terms: Terms, body: HTMLElement[]): HTMLElement | null {
  if (body.length === 0) return null;
  return h('section', { class: 'detail-section', 'data-testid': testid }, sectionHeading(term, terms), ...body);
}

function colorOf(opts: DetailBlockOptions, block: Element): string {
  return opts.palette[block.id] ?? (typeof block.color === 'string' ? block.color : '#94A3B8');
}

function nameOf(block: Element): string {
  return block.label ?? block.name;
}

/**
 * A requirement list grouped by category, each row expandable into its trace
 * ladder — shared by a system's own "Responsible for" section and a
 * component's "Inherited responsibilities" section (which groups its
 * parent's requirements the same way).
 */
function renderReqGroups(
  idx: ModelIndex,
  groups: Array<{ category: Category; reqs: Element[] }>,
  opts: DetailBlockOptions,
): HTMLElement {
  const wrap = h('div', { class: 'req-groups' });
  if (groups.length === 0) {
    wrap.append(h('p', { class: 'muted' }, 'No requirements recorded.'));
    return wrap;
  }
  for (const group of groups) {
    wrap.append(h('h4', { class: 'req-group-header' }, opts.terms === 'sysml' ? group.category.name : group.category.plain));
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
    wrap.append(list);
  }
  return wrap;
}

/**
 * The "what this part is and does" sections (contract section 6): ports,
 * signals it listens for/sends, operations, tracked values. Identical
 * regardless of tier — a component queries these against its own id, same as
 * a system — so both `renderBlockDetail` branches share this.
 */
function renderBehaviorDataSections(
  behavior: BehaviorIndex,
  targetId: string,
  opts: DetailBlockOptions,
): { portsSection: HTMLElement | null; signalsSection: HTMLElement | null; operationsSection: HTMLElement | null; valuesSection: HTMLElement | null } {
  const ports = behavior.portsOf(targetId);
  const portsSection = section(
    'connections',
    'Port',
    opts.terms,
    ports.length > 0
      ? [
          h(
            'ul',
            { class: 'list' },
            ...ports.map((port) =>
              h(
                'li',
                { class: 'list-row flow-row', title: port.kind ? `SysML ${port.kind}` : undefined },
                h('span', { class: 'row-label' }, port.name),
                h('span', { class: 'muted' }, port.interface ? `→ ${humanise(port.interface.name)}` : ''),
              ),
            ),
          ),
        ]
      : [],
  );

  // signalsSentBy walks the sequence diagrams, so the same signal can come
  // back once per message; the chips are a set, not a tally.
  const received = behavior.signalsReceivedBy(targetId).map((r) => r.signal);
  const sent = dedupeById(behavior.signalsSentBy(targetId).map((s) => s.signal));
  const signalBody: HTMLElement[] = [];
  if (received.length > 0) {
    signalBody.push(h('h4', { class: 'req-group-header' }, label('Reception', opts.terms)));
    signalBody.push(h('div', { class: 'chip-row' }, ...received.map((s) => textChip(humanise(s.name), { title: s.name }))));
  }
  if (sent.length > 0) {
    signalBody.push(h('h4', { class: 'req-group-header' }, opts.terms === 'sysml' ? 'Signal' : 'Sends'));
    signalBody.push(h('div', { class: 'chip-row' }, ...sent.map((s) => textChip(humanise(s.name), { title: s.name }))));
  }
  const signalsSection = section('signals', 'Reception', opts.terms, signalBody);

  const operations = behavior.operationsOf(targetId);
  const operationsSection = section(
    'operations',
    'Operation',
    opts.terms,
    operations.length > 0
      ? [h('ul', { class: 'list' }, ...operations.map((op) => h('li', { class: 'list-row flow-row', title: op.name }, humanise(op.name))))]
      : [],
  );

  const values = behavior.valuesOf(targetId);
  const valuesSection = section(
    'values',
    'ValueProperty',
    opts.terms,
    values.length > 0
      ? [
          h(
            'ul',
            { class: 'list' },
            ...values.map((v) => {
              const unit = UNIT_HINTS[v.name] ?? '';
              return h(
                'li',
                { class: 'list-row flow-row', title: v.name },
                h('span', { class: 'row-label' }, valueLabel(v.name, unit)),
                h('span', { class: 'muted' }, `${v.default ?? '—'}${unit ? ` ${unit}` : ''}`),
              );
            }),
          ),
        ]
      : [],
  );

  return { portsSection, signalsSection, operationsSection, valuesSection };
}

export function renderBlockDetail(idx: ModelIndex, blockId: string, opts: DetailBlockOptions): HTMLElement {
  const trace = traceForBlock(idx, blockId);
  const block = trace.block;
  const behavior = behaviorIndex(idx.model);

  if (trace.isInherited && trace.inherited) {
    return renderComponentDetail(idx, trace, behavior, opts);
  }
  return renderSystemDetail(idx, trace, behavior, opts);
}

function renderSystemDetail(idx: ModelIndex, trace: BlockTrace, behavior: BehaviorIndex, opts: DetailBlockOptions): HTMLElement {
  const block = trace.block;
  const color = colorOf(opts, block);
  const name = nameOf(block);

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

  const respSection = h(
    'section',
    { class: 'detail-section' },
    h('h3', {}, label('Satisfy', opts.terms, 'partCard')),
    renderReqGroups(idx, trace.reqsByCategory, opts),
  );

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

  // Sibling systems (INVERTER under POWERTRAIN, etc.) live in this section;
  // this block's *components* (tier: "component") get their own clickable
  // chips below in "Contains" (subPartsSection) instead, so they aren't
  // listed twice.
  const containment = h('section', { class: 'detail-section' }, h('h3', {}, 'Contains / Part of'));
  const containList = h('ul', { class: 'list' });
  if (trace.parent) {
    const parent = trace.parent;
    containList.append(
      h(
        'li',
        { class: 'list-row', role: 'button', tabIndex: 0, on: { click: () => opts.onSelectBlock(parent.id) } },
        `Part of ${nameOf(parent)}`,
      ),
    );
  }
  const childSystems = trace.children.filter((c) => c.tier !== 'component');
  for (const child of childSystems) {
    containList.append(
      h('li', { class: 'list-row', role: 'button', tabIndex: 0, on: { click: () => opts.onSelectBlock(child.id) } }, `Contains ${nameOf(child)}`),
    );
  }
  if (!trace.parent && childSystems.length === 0) {
    containList.append(h('li', { class: 'muted' }, 'Top-level part.'));
  }
  containment.append(containList);

  // --- contract section 6: what this part is and does ------------------
  const behaviorBody: HTMLElement[] = [];
  for (const sm of behavior.stateMachinesFor(block.id)) {
    behaviorBody.push(h('h4', { class: 'req-group-header' }, sm.name));
    behaviorBody.push(h('div', { class: 'state-diagram-wrap' }, renderStateDiagram(sm)));
    behaviorBody.push(renderTransitionList(sm));
  }
  const behaviorSection = section('section-behavior', 'StateMachine', opts.terms, behaviorBody);

  const subParts = behavior.subPartsOf(block.id);
  const subPartRow = h('div', { class: 'chip-row subpart-row' });
  for (const part of subParts) {
    const child = part.element;
    const name = nameOf(child);
    const description = typeof child.blurb === 'string' ? child.blurb : '';
    const role = typeof child.role === 'string' ? child.role : child.name;
    const roleLine = `${role}${description ? ` — ${description}` : ''}`;
    if (part.clickable) {
      const color = colorOf(opts, child);
      const chip = colorChip(color, name, { title: roleLine, className: 'subpart-chip is-clickable' });
      chip.setAttribute('role', 'button');
      chip.setAttribute('tabindex', '0');
      chip.addEventListener('click', () => opts.onSelectBlock(child.id));
      chip.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter') opts.onSelectBlock(child.id);
      });
      chip.addEventListener('mouseenter', () => opts.onHoverBlock(child.id));
      chip.addEventListener('mouseleave', () => opts.onHoverBlock(null));
      subPartRow.append(chip);
    } else {
      // No mesh of its own, so nothing to select in the 3D view: the chip
      // stays muted and explains itself on hover instead of pretending.
      subPartRow.append(textChip(name, { className: 'subpart-chip is-muted', title: roleLine }));
    }
  }
  const subPartsSection = section('subparts', 'PartProperty', opts.terms, subParts.length > 0 ? [subPartRow] : []);

  const { portsSection, signalsSection, operationsSection, valuesSection } = renderBehaviorDataSections(behavior, block.id, opts);

  return h(
    'div',
    { class: 'card detail-card block-detail', 'data-tier': 'system' },
    header,
    typeof block.blurb === 'string' ? h('p', { class: 'muted' }, block.blurb) : null,
    sentence,
    h('div', { class: 'panel-meta' }, reqCountChip),
    respSection,
    talksTo,
    scenarios,
    testsSection,
    containment,
    behaviorSection,
    subPartsSection,
    portsSection,
    signalsSection,
    operationsSection,
    valuesSection,
  );
}

function renderComponentDetail(idx: ModelIndex, trace: BlockTrace, behavior: BehaviorIndex, opts: DetailBlockOptions): HTMLElement {
  const block = trace.block;
  const parent = trace.inherited!.from;
  const color = colorOf(opts, block);
  const name = nameOf(block);
  const parentName = nameOf(parent);

  const header = h(
    'div',
    { class: 'detail-header' },
    colorChip(color, block.id),
    h(
      'div',
      { class: 'detail-header-text' },
      h('h2', { class: 'detail-title', id: 'detail-title', 'data-testid': 'detail-title' }, name),
      opts.terms === 'sysml' ? h('div', { class: 'muted detail-formal' }, block.name) : null,
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn-link detail-part-of',
          'data-testid': 'part-of-link',
          on: { click: () => opts.onSelectBlock(parent.id) },
        },
        `Part of ${parentName}`,
      ),
    ),
  );

  const sentence = h(
    'p',
    { class: 'detail-sentence' },
    `The ${name} is part of the ${parentName}, which is responsible for ${trace.reqCount} requirement${trace.reqCount === 1 ? '' : 's'} and is proven by ${trace.testCount} test${trace.testCount === 1 ? '' : 's'}.`,
  );

  const reqCountChip = h(
    'span',
    { id: 'req-count', class: 'chip req-count', 'data-testid': 'req-count' },
    `${trace.reqCount} requirement${trace.reqCount === 1 ? '' : 's'}`,
  );

  // The parent is a system, so its own traceForBlock groups its requirements
  // by category the same way a system's "Responsible for" section does —
  // reused rather than re-deriving the grouping here.
  const parentTrace = traceForBlock(idx, parent.id);
  const inheritedSection = h(
    'section',
    { class: 'detail-section', 'data-testid': 'inherited-responsibilities' },
    h('h3', {}, 'Inherited responsibilities'),
    h('p', { class: 'muted' }, `Requirements are written against the ${parentName}; this component is how it meets them.`),
    renderReqGroups(idx, parentTrace.reqsByCategory, opts),
  );

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
        textChip(`via ${parentName}`, { className: 'via-parent-tag' }),
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
        textChip(`via ${parentName}`, { className: 'via-parent-tag' }),
      ),
    );
  }
  if (trace.flows.out.length === 0 && trace.flows.in.length === 0) {
    flowsList.append(h('li', { class: 'muted' }, 'No connections recorded.'));
  }
  talksTo.append(flowsList);

  const { portsSection, signalsSection, operationsSection, valuesSection } = renderBehaviorDataSections(behavior, block.id, opts);

  const siblings = idx.components.filter((c) => c.id !== block.id && c.parent === parent.id);
  let siblingsSection: HTMLElement | null = null;
  if (siblings.length > 0) {
    const chipRow = h('div', { class: 'chip-row' });
    for (const sibling of siblings) {
      const sibColor = colorOf(opts, sibling);
      const chip = colorChip(sibColor, nameOf(sibling), { className: 'subpart-chip is-clickable' });
      chip.setAttribute('role', 'button');
      chip.setAttribute('tabindex', '0');
      chip.addEventListener('click', () => opts.onSelectBlock(sibling.id));
      chip.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter') opts.onSelectBlock(sibling.id);
      });
      chip.addEventListener('mouseenter', () => opts.onHoverBlock(sibling.id));
      chip.addEventListener('mouseleave', () => opts.onHoverBlock(null));
      chipRow.append(chip);
    }
    siblingsSection = h('section', { class: 'detail-section', 'data-testid': 'siblings' }, h('h3', {}, 'Siblings'), chipRow);
  }

  return h(
    'div',
    { class: 'card detail-card block-detail is-component', 'data-tier': 'component' },
    header,
    typeof block.blurb === 'string' ? h('p', { class: 'muted' }, block.blurb) : null,
    sentence,
    h('div', { class: 'panel-meta' }, reqCountChip),
    inheritedSection,
    talksTo,
    signalsSection,
    portsSection,
    operationsSection,
    valuesSection,
    siblingsSection,
  );
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
}

/**
 * Units for block value properties. The contract gives the converter a
 * `UNIT_HINTS` table but `BlockValue` carries no `unit` field, so the panel
 * keeps its own copy of the same hints rather than printing a bare `80`.
 * Drop this the day `BlockValue` gains a `unit`.
 */
const UNIT_HINTS: Record<string, string> = {
  stateOfChargePercent: '%',
  vehicleSpeedKph: 'km/h',
  mass: 'kg',
  usableEnergy: 'kWh',
  energyConsumption: 'kWh/km',
  estimatedRange: 'km',
  electricalPower: 'W',
  tractiveForce: 'N',
};

/**
 * `stateOfChargePercent` + `%` -> `State of charge`: the unit already says
 * "percent", so repeating it in the label is noise.
 */
function valueLabel(name: string, unit?: string | null): string {
  const text = humanise(name);
  if (unit === '%') return text.replace(/\s+percent$/i, '');
  if (unit === 'km/h') return text.replace(/\s+kph$/i, '');
  return text;
}
