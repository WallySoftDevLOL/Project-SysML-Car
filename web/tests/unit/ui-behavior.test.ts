// @vitest-environment happy-dom
//
// The contract section 6 UI: the state diagram, the block card's new
// structure sections, and the live parametric calculator.
import { describe, expect, it } from 'vitest';
import { renderStateDiagram, renderTransitionList, humanise } from '../../src/ui/state-diagram';
import { renderParametricCard } from '../../src/ui/parametric-card';
import { renderRequirementDetail } from '../../src/ui/detail-req';
import { mountUI } from '../../src/ui/index';
import { buildIndex } from '../../src/model/index';
import { createStore } from '../../src/state/store';
import { buildBehaviorFixtureModel, loadRealModel } from './fixtures';
import type { ModelJson, Parametric, StateMachine } from '../../src/model/schema';

/**
 * The vehicle machine's shape, verbatim from the model script: an initial
 * pseudostate, five ordinary states, a final state, and seven transitions
 * (two of which land on Fault, which is what pushes Fault onto a second row).
 */
function vehicleStateMachine(): StateMachine {
  return {
    id: 'SM_VEH',
    name: 'Vehicle Operating Modes',
    context: 'VEH',
    states: [
      { id: 'SV_INIT', name: 'Initial', kind: 'initial' },
      { id: 'SV_OFF', name: 'Off', kind: 'state' },
      { id: 'SV_START', name: 'Starting', kind: 'state' },
      { id: 'SV_READY', name: 'Ready', kind: 'state' },
      { id: 'SV_DRIVE', name: 'Driving', kind: 'state' },
      { id: 'SV_FAULT', name: 'Fault', kind: 'state' },
      { id: 'SV_COMPLETE', name: 'Complete', kind: 'final' },
    ],
    transitions: [
      { id: 'SV_T0', source: 'SV_INIT', target: 'SV_OFF' },
      { id: 'SV_T1', source: 'SV_OFF', target: 'SV_START', trigger: { kind: 'signal', id: 'SIG_START', name: 'StartCommand' } },
      { id: 'SV_T2', source: 'SV_START', target: 'SV_READY', trigger: { kind: 'signal', id: 'SIG_READY', name: 'VehicleReady' } },
      { id: 'SV_T3', source: 'SV_READY', target: 'SV_DRIVE', trigger: { kind: 'signal', id: 'SIG_TORQUE', name: 'TorqueCommand' } },
      { id: 'SV_T4', source: 'SV_DRIVE', target: 'SV_COMPLETE', trigger: { kind: 'signal', id: 'SIG_STOP', name: 'StopCommand' } },
      { id: 'SV_T5', source: 'SV_READY', target: 'SV_FAULT', trigger: { kind: 'signal', id: 'SIG_FAULT', name: 'FaultDetected' } },
      { id: 'SV_T6', source: 'SV_DRIVE', target: 'SV_FAULT', trigger: { kind: 'signal', id: 'SIG_FAULT', name: 'FaultDetected' } },
    ],
  };
}

describe('state diagram', () => {
  it('renders every state and every transition, with arrowheads', () => {
    const sm = vehicleStateMachine();
    const svg = renderStateDiagram(sm);

    expect(svg.querySelectorAll('[data-state-id]')).toHaveLength(7);

    const edges = svg.querySelectorAll('[data-transition-id]');
    expect(edges).toHaveLength(7);
    for (const edge of Array.from(edges)) {
      const line = edge.querySelector('.sd-edge-line');
      expect(line?.getAttribute('marker-end')).toMatch(/^url\(#sd-arrow-\d+\)$/);
      expect(line?.getAttribute('d')).toBeTruthy();
    }
  });

  it('lays the main chain out left to right and drops Fault onto its own row', () => {
    // Six columns at four per row: Off -> Starting -> Ready fills the first
    // band, Driving -> Complete folds onto the next, and Fault — which shares
    // Driving's column — stacks under it.
    const svg = renderStateDiagram(vehicleStateMachine());
    const boxOf = (id: string) => svg.querySelector(`[data-state-id="${id}"] .sd-state-box`)!;
    const x = (id: string) => Number(boxOf(id).getAttribute('x'));
    const y = (id: string) => Number(boxOf(id).getAttribute('y'));

    expect(x('SV_OFF')).toBeLessThan(x('SV_START'));
    expect(x('SV_START')).toBeLessThan(x('SV_READY'));
    expect(y('SV_OFF')).toBe(y('SV_START'));
    expect(y('SV_START')).toBe(y('SV_READY'));

    expect(y('SV_DRIVE')).toBeGreaterThan(y('SV_READY'));
    expect(y('SV_FAULT')).toBeGreaterThan(y('SV_DRIVE'));
    expect(x('SV_FAULT')).toBe(x('SV_DRIVE'));
  });

  it('keeps the chain on one row when it is given the room', () => {
    const svg = renderStateDiagram(vehicleStateMachine(), { maxPerRow: 6 });
    const y = (id: string) => Number(svg.querySelector(`[data-state-id="${id}"] .sd-state-box`)!.getAttribute('y'));
    for (const id of ['SV_START', 'SV_READY', 'SV_DRIVE']) expect(y(id)).toBe(y('SV_OFF'));
    expect(y('SV_FAULT')).toBeGreaterThan(y('SV_DRIVE'));
  });

  it('humanises signal names on the transition labels', () => {
    const svg = renderStateDiagram(vehicleStateMachine());
    const labels = Array.from(svg.querySelectorAll('.sd-edge-label')).map((n) => n.textContent);
    expect(labels).toContain('Start command');
    expect(labels).toContain('Fault detected');
    expect(humanise('StartCommand')).toBe('Start command');
  });

  it('marks the highlighted state and calls back when one is clicked', () => {
    const clicked: string[] = [];
    const svg = renderStateDiagram(vehicleStateMachine(), {
      highlightState: 'SV_DRIVE',
      onStateClick: (id) => clicked.push(id),
    });

    const driving = svg.querySelector('[data-state-id="SV_DRIVE"]')!;
    expect(driving.getAttribute('class')).toContain('is-highlight');
    expect(svg.querySelectorAll('.is-highlight')).toHaveLength(1);

    (driving as SVGElement & { dispatchEvent(e: Event): boolean }).dispatchEvent(new Event('click'));
    expect(clicked).toEqual(['SV_DRIVE']);
  });

  it('offers a collapsed text fallback listing every transition', () => {
    const list = renderTransitionList(vehicleStateMachine());
    expect(list.tagName).toBe('DETAILS');
    expect((list as HTMLDetailsElement).open).toBe(false);
    expect(list.querySelectorAll('[data-transition-id]')).toHaveLength(7);
    expect(list.textContent).toContain('Off → Starting');
    expect(list.textContent).toContain('when Start command');
  });
});

describe('block card structure sections', () => {
  function mount(model: ModelJson) {
    const idx = buildIndex(model);
    const store = createStore();
    const root = document.createElement('div');
    const toolbar = document.createElement('div');
    document.body.append(root, toolbar);
    mountUI({ root, toolbar, store, idx, palette: {}, onFocusBlock: () => {} });
    return { root, store };
  }

  it('shows "Contains" chips for composition sub-parts, muted when not clickable', () => {
    const { root, store } = mount(buildBehaviorFixtureModel());
    store.set({ selection: { kind: 'block', id: 'PARTA' } });

    const subparts = root.querySelector('[data-testid="subparts"]')!;
    expect(subparts).toBeTruthy();
    expect(subparts.querySelector('h3')!.textContent).toBe('Contains');

    const chips = Array.from(subparts.querySelectorAll('.subpart-chip'));
    expect(chips.map((c) => c.textContent)).toEqual(['Part A child', 'FaultSensorPart']);

    // PARTA_CHILD is one of the meshed blocks, so it selects; the sensor has
    // no mesh and explains its role on hover instead.
    expect(chips[0]!.getAttribute('class')).toContain('is-clickable');
    expect(chips[0]!.getAttribute('role')).toBe('button');
    expect(chips[1]!.getAttribute('class')).toContain('is-muted');
    expect(chips[1]!.getAttribute('title')).toContain('faultSensor');
  });

  it('renders the state diagram, ports, signals, operations and values', () => {
    const { root, store } = mount(buildBehaviorFixtureModel());
    store.set({ selection: { kind: 'block', id: 'PARTA' } });

    expect(root.querySelector('[data-testid="state-diagram"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="connections"]')!.textContent).toContain('Widget interface');
    expect(root.querySelector('[data-testid="signals"]')!.textContent).toContain('Start command');
    expect(root.querySelector('[data-testid="operations"]')!.textContent).toContain('Do thing');
    expect(root.querySelector('[data-testid="values"]')!.textContent).toContain('1800');

    // The pre-existing hooks other specs rely on are untouched.
    expect(root.querySelector('[data-testid="req-count"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="detail-title"]')!.textContent).toBe('Part A');
  });

  it('renders none of the new sections for a block the behaviour data never mentions', () => {
    const { root, store } = mount(buildBehaviorFixtureModel());
    // ROOT has no state machine, composition, ports, operations or values,
    // and appears on no lifeline — so every one of these sections stays away
    // rather than rendering an empty shell.
    store.set({ selection: { kind: 'block', id: 'ROOT' } });

    for (const testid of ['state-diagram', 'subparts', 'connections', 'signals', 'operations', 'values']) {
      expect(root.querySelector(`[data-testid="${testid}"]`)).toBeNull();
    }
  });
});

describe('parametric card', () => {
  /** `R = E / c`: 82 kWh over 0.18 kWh/km, against STK-002's 400 km. */
  function rangeModel(): ModelJson {
    const model = buildBehaviorFixtureModel();
    model.elements.push({
      id: 'REQ_STK_RANGE',
      kind: 'Requirement',
      displayId: 'STK-002',
      category: 'STK',
      name: 'Nominal Driving Range',
      text: 'The electric vehicle shall provide at least 400 km of nominal driving range.',
      acceptance: 'Calculated or measured nominal range is >= 400 km.',
      authoritative: true,
    });
    (model.parametrics ??= []).push(rangeParametric());
    return model;
  }

  function rangeParametric(): Parametric {
    return {
      id: 'RANGE_ANALYSIS',
      name: 'DrivingRangeAnalysis',
      constraint: 'CB_RANGE',
      expression: 'R = E / c',
      output: 'R',
      refines: ['REQ_STK_RANGE'],
      parameters: [
        { parameter: 'E', value: 'A_RANGE_E', name: 'usableEnergy', default: 82, unit: 'kWh' },
        { parameter: 'c', value: 'A_RANGE_C', name: 'energyConsumption', default: 0.18, unit: 'kWh/km' },
        { parameter: 'R', value: 'A_RANGE_OUT', name: 'estimatedRange', default: null, unit: 'km' },
      ],
    };
  }

  it('computes 7200 N from the tractive-force analysis defaults', () => {
    const model = buildBehaviorFixtureModel();
    const idx = buildIndex(model);
    const parametric = model.parametrics!.find((p) => p.id === 'PARAM_1')!;

    const card = renderParametricCard(idx, parametric, { terms: 'plain' });

    expect(card.querySelector('[data-testid="param-equation"]')!.textContent).toBe('F = m × a');
    expect(card.querySelector('[data-testid="param-output"]')!.textContent).toBe('7200 N');
    // One row per input; the output parameter is not an input.
    expect(card.querySelectorAll('[data-testid="param-row"]')).toHaveLength(2);
  });

  it('flips the pass pill when an input drops the output below the threshold', () => {
    const model = rangeModel();
    const idx = buildIndex(model);
    const card = renderParametricCard(idx, rangeParametric(), { terms: 'plain', requirementId: 'REQ_STK_RANGE' });

    const pill = card.querySelector('[data-testid="param-pill"]')!;
    expect(pill.getAttribute('data-pass')).toBe('true');
    expect(pill.getAttribute('class')).toContain('pill-pass');
    expect(pill.textContent).toContain('456 km ≥ 400 km required by STK-002 ✓');

    const energy = card.querySelector('[data-parameter="E"] .param-slider') as HTMLInputElement;
    energy.value = '60';
    energy.dispatchEvent(new Event('input'));

    // 60 kWh / 0.18 kWh/km = 333 km, short of the 400 km the need asks for.
    expect(card.querySelector('[data-testid="param-output"]')!.textContent).toBe('333 km');
    expect(pill.getAttribute('data-pass')).toBe('false');
    expect(pill.getAttribute('class')).toContain('pill-fail');
    expect(pill.textContent).toContain('333 km < 400 km required by STK-002 ✗');
  });

  it('restores the defaults when Reset is pressed', () => {
    const model = rangeModel();
    const card = renderParametricCard(buildIndex(model), rangeParametric(), { terms: 'plain' });

    const energy = card.querySelector('[data-parameter="E"] .param-slider') as HTMLInputElement;
    energy.value = '60';
    energy.dispatchEvent(new Event('input'));
    expect(card.querySelector('[data-testid="param-output"]')!.textContent).toBe('333 km');

    (card.querySelector('[data-testid="param-reset"]') as HTMLButtonElement).click();
    expect(energy.value).toBe('82');
    expect(card.querySelector('[data-testid="param-output"]')!.textContent).toBe('456 km');
  });
});

describe('requirement card', () => {
  const noop = () => {};
  const opts = {
    terms: 'plain' as const,
    onSelectRequirement: noop,
    onSelectBlock: noop,
    onHoverBlock: noop,
  };

  it('puts the parametric card between the requirement text and the ladder', () => {
    const idx = buildIndex(buildBehaviorFixtureModel());
    const card = renderRequirementDetail(idx, 'REQ_PT_1', opts);

    const children = Array.from(card.children);
    const textAt = children.findIndex((c) => c.classList.contains('req-text'));
    const paramAt = children.findIndex((c) => c.getAttribute('data-testid') === 'param-card');
    const ladderAt = children.findIndex((c) => c.classList.contains('ladder'));

    expect(paramAt).toBeGreaterThan(textAt);
    expect(paramAt).toBeLessThan(ladderAt);
  });

  it('lists the procedures and message sequences that carry the requirement out', () => {
    const idx = buildIndex(buildBehaviorFixtureModel());
    const card = renderRequirementDetail(idx, 'REQ_PT_1', opts);

    const procedures = card.querySelector('[data-testid="procedures"]')!;
    expect(procedures.querySelector('h3')!.textContent).toBe('Procedures');
    expect(procedures.textContent).toContain('Step A');
    // The initial/final markers are structure, not steps a reader follows.
    expect(procedures.textContent).not.toContain('Start');

    const sequences = card.querySelector('[data-testid="sequences"]')!;
    expect(sequences.textContent).toContain('Start Sequence');
    expect(sequences.textContent).toContain('Part A → Part B');
  });

  it('renders no parametric card for a requirement no analysis reaches', () => {
    const idx = buildIndex(buildBehaviorFixtureModel());
    const card = renderRequirementDetail(idx, 'REQ_PT_3', opts);
    expect(card.querySelector('[data-testid="param-card"]')).toBeNull();
  });

  // The converter records each analysis against the stakeholder need it
  // serves, while the requirement that states its number sits two Derive hops
  // below. These check both ends of that chain against the real data.
  describe('against data/model.json', () => {
    const idx = buildIndex(loadRealModel());

    it('carries the range calculator on the customer need it is recorded against', () => {
      const card = renderRequirementDetail(idx, 'REQ_STK_002', opts);
      expect(card.querySelector('[data-testid="param-pill"]')!.textContent).toContain(
        '456 km ≥ 400 km required by STK-002',
      );
    });

    it('carries the force calculator down to the requirement that states the number', () => {
      const card = renderRequirementDetail(idx, 'REQ_PERF_001', opts);
      expect(card.querySelector('[data-testid="param-output"]')!.textContent).toBe('7200 N');
      expect(card.querySelector('[data-testid="param-pill"]')!.textContent).toContain(
        '7200 N ≥ 4500 N required by PERF-001',
      );
    });

    it('carries the power calculator to PERF-002, converting kW to W', () => {
      const card = renderRequirementDetail(idx, 'REQ_PERF_002', opts);
      expect(card.querySelector('[data-testid="param-pill"]')!.textContent).toContain('required by PERF-002 ✓');
    });

    it('keeps calculators off a sibling requirement that states no comparable number', () => {
      // CTRL-001 shares STK-003 with the force and power analyses but talks
      // about validating a drive request, not about newtons or watts.
      const card = renderRequirementDetail(idx, 'REQ_CTRL_001', opts);
      expect(card.querySelector('[data-testid="param-card"]')).toBeNull();
    });
  });
});
