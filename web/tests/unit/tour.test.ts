// @vitest-environment happy-dom
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import scenariosFile from '../../src/tour/scenarios.json';
import type { ScenariosFile, TourStep } from '../../src/tour/player';
import { createTourPlayer, highlightForMessage } from '../../src/tour/player';
import { createTourOverlay } from '../../src/tour/overlay';
import { createStore } from '../../src/state/store';
import type { Viewer, CameraPose, FocusOptions } from '../../src/scene/viewer-api';
import type { HighlightState } from '../../src/model/schema';
import { buildIndex } from '../../src/model/index';
import { loadRealModel, buildBehaviorFixtureModel } from './fixtures';

const scenarios = (scenariosFile as ScenariosFile).scenarios;
const realModel = loadRealModel();
const realIds = new Set(realModel.elements.map((e) => e.id));
/** `undefined` until data/model.json carries contract section 6 `behavior` (see docs/model-contract.md section 6). */
const realInteractions = realModel.behavior?.interactions;

// ---------------------------------------------------------------------- //
// Data validation: every id scenarios.json references must be a real
// element in data/model.json, so a systems engineer editing the JSON can't
// silently reference something that doesn't exist.
// ---------------------------------------------------------------------- //

describe('scenarios.json data', () => {
  it('has at least 5 scenarios', () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(5);
  });

  it('every scenario has a non-empty id, title, blurb and at least one step', () => {
    for (const s of scenarios) {
      expect(s.id.length).toBeGreaterThan(0);
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.blurb.length).toBeGreaterThan(0);
      expect(s.steps.length).toBeGreaterThan(0);
    }
  });

  it('scenario ids are unique', () => {
    const ids = scenarios.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every step caption is non-empty and under 220 characters', () => {
    for (const s of scenarios) {
      for (const step of s.steps) {
        expect(step.caption.length, `${s.id}: empty caption`).toBeGreaterThan(0);
        expect(step.caption.length, `${s.id}: caption too long`).toBeLessThan(220);
      }
    }
  });

  it('every referenced selection id exists in the real model', () => {
    for (const s of scenarios) {
      for (const step of s.steps) {
        if (!step.selection) continue;
        expect(realIds.has(step.selection.id), `${s.id}: missing selection id ${step.selection.id}`).toBe(true);
      }
    }
  });

  it('every referenced focus block id exists in the real model (or is null)', () => {
    for (const s of scenarios) {
      for (const step of s.steps) {
        if (step.focus === undefined || step.focus === null) continue;
        expect(realIds.has(step.focus), `${s.id}: missing focus block ${step.focus}`).toBe(true);
      }
    }
  });

  it('selection kinds match the real element kind', () => {
    const kindMap: Record<string, string> = { block: 'Block', requirement: 'Requirement', test: 'TestCase', usecase: 'UseCase' };
    for (const s of scenarios) {
      for (const step of s.steps) {
        if (!step.selection) continue;
        const el = realModel.elements.find((e) => e.id === step.selection!.id);
        expect(el, `${s.id}: ${step.selection.id} not found`).toBeTruthy();
        expect(el?.kind, `${s.id}: ${step.selection.id} kind mismatch`).toBe(kindMap[step.selection.kind]);
      }
    }
  });

  it('explode is within 0..1 when present', () => {
    for (const s of scenarios) {
      for (const step of s.steps) {
        if (step.explode === undefined) continue;
        expect(step.explode).toBeGreaterThanOrEqual(0);
        expect(step.explode).toBeLessThanOrEqual(1);
      }
    }
  });

  it('camera position/target arrays are present, length 3, and finite', () => {
    for (const s of scenarios) {
      for (const step of s.steps) {
        if (!step.camera) continue;
        for (const tuple of [step.camera.position, step.camera.target]) {
          expect(tuple.length).toBe(3);
          for (const n of tuple) expect(Number.isFinite(n)).toBe(true);
        }
      }
    }
  });

  it('has at least one scenario using camera and one using xray/explode, so both schema paths are exercised', () => {
    expect(scenarios.some((s) => s.steps.some((st) => st.camera))).toBe(true);
    expect(scenarios.some((s) => s.steps.some((st) => st.xray !== undefined))).toBe(true);
    expect(scenarios.some((s) => s.steps.some((st) => st.explode !== undefined))).toBe(true);
  });

  // -------------------------------------------------------------------- //
  // "startup-sequence" scenario: sequence/stateMachine steps. `behavior` is
  // only present in data/model.json once the section-6 converter work lands
  // (docs/model-contract.md section 6); until then these checks skip rather
  // than fail, but the JSON's own shape (which step carries which field, in
  // what order) is always checked.
  // -------------------------------------------------------------------- //

  it('startup-sequence is first (the tour default) and uses both sequence and stateMachine steps', () => {
    const first = scenarios[0]!;
    expect(first.id).toBe('startup-sequence');
    const steps = first.steps;
    expect(steps.some((s) => s.sequence)).toBe(true);
    expect(steps.some((s) => s.stateMachine)).toBe(true);
    // Messages 1..4 of SEQ_START are each covered, once, in order.
    const messageOrders = steps.filter((s) => s.sequence).map((s) => s.sequence!.message);
    expect(messageOrders).toEqual([1, 2, 3, 4]);
    expect(steps.every((s) => !s.sequence || s.sequence.interaction === 'SEQ_START')).toBe(true);
  });

  it('every sequence step references an interaction/message that exists in the real model (skipped until behavior lands)', () => {
    for (const s of scenarios) {
      for (const step of s.steps) {
        if (!step.sequence) continue;
        if (!realInteractions) continue; // pre-section-6 data/model.json: nothing to check yet
        const interaction = realInteractions.find((it) => it.id === step.sequence!.interaction);
        expect(interaction, `${s.id}: unknown interaction ${step.sequence!.interaction}`).toBeTruthy();
        const message = interaction?.messages.find((m) => m.order === step.sequence!.message);
        expect(message, `${s.id}: interaction ${step.sequence!.interaction} has no message #${step.sequence!.message}`).toBeTruthy();
      }
    }
  });

  it('every stateMachine step references a state machine/state that exists in the real model (skipped until behavior lands)', () => {
    const realStateMachines = realModel.behavior?.stateMachines;
    for (const s of scenarios) {
      for (const step of s.steps) {
        if (!step.stateMachine) continue;
        if (!realStateMachines) continue; // pre-section-6 data/model.json: nothing to check yet
        const sm = realStateMachines.find((m) => m.id === step.stateMachine!.id);
        expect(sm, `${s.id}: unknown state machine ${step.stateMachine!.id}`).toBeTruthy();
        expect(
          sm?.states.some((st) => st.id === step.stateMachine!.state),
          `${s.id}: ${step.stateMachine!.id} has no state ${step.stateMachine!.state}`,
        ).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------- //
// Player state machine, against a stub Viewer.
// ---------------------------------------------------------------------- //

function stubViewer(): Viewer & {
  focusCalls: Array<string | null>;
  flyToCalls: CameraPose[];
  highlightCalls: HighlightState[];
} {
  const focusCalls: Array<string | null> = [];
  const flyToCalls: CameraPose[] = [];
  const highlightCalls: HighlightState[] = [];
  return {
    focusCalls,
    flyToCalls,
    highlightCalls,
    async load() {
      return { blocks: [], missing: [] };
    },
    setHighlight(h: HighlightState) {
      highlightCalls.push(h);
    },
    setHover() {},
    setXray() {},
    setExplode() {},
    focus(id: string | null, _opts?: FocusOptions) {
      focusCalls.push(id);
    },
    flyTo(pose: CameraPose) {
      flyToCalls.push(pose);
    },
    setAutoRotate() {},
    setTheme() {},
    projectBlock() {
      return null;
    },
    on() {
      return () => {};
    },
    dispose() {},
  };
}

function tinyScenarios(): ScenariosFile['scenarios'] {
  const stepA: TourStep = { caption: 'Step one.', selection: { kind: 'block', id: 'A' }, focus: 'A', xray: true, explode: 0.1 };
  const stepB: TourStep = { caption: 'Step two.', selection: { kind: 'block', id: 'B' }, focus: 'B', explode: 0.5 };
  const stepC: TourStep = {
    caption: 'Step three.',
    selection: { kind: 'requirement', id: 'REQ_1' },
    camera: { position: [1, 2, 3], target: [0, 0, 0] },
  };
  return [
    { id: 'demo', title: 'Demo', blurb: 'A tiny demo scenario.', steps: [stepA, stepB, stepC] },
    { id: 'other', title: 'Other', blurb: 'A second scenario.', steps: [{ caption: 'Only step.', selection: { kind: 'block', id: 'A' } }] },
  ];
}

describe('createTourPlayer', () => {
  let store: ReturnType<typeof createStore>;
  let viewer: ReturnType<typeof stubViewer>;

  beforeEach(() => {
    vi.useFakeTimers();
    store = createStore();
    viewer = stubViewer();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('current() is null before play()', () => {
    const player = createTourPlayer({ store, viewer, scenarios: tinyScenarios() });
    expect(player.current()).toBeNull();
  });

  it('play() applies step 0: sets selection/xray/explode/tour and focuses the block', () => {
    const player = createTourPlayer({ store, viewer, scenarios: tinyScenarios() });
    player.play('demo');

    expect(store.get().selection).toEqual({ kind: 'block', id: 'A' });
    expect(store.get().xray).toBe(true);
    expect(store.get().explode).toBe(0.1);
    expect(store.get().tour).toBe(true);
    expect(viewer.focusCalls).toEqual(['A']);

    const cur = player.current();
    expect(cur?.scenario.id).toBe('demo');
    expect(cur?.stepIndex).toBe(0);
    expect(cur?.stepCount).toBe(3);
  });

  it('play() with an unknown id is a no-op', () => {
    const player = createTourPlayer({ store, viewer, scenarios: tinyScenarios() });
    player.play('nope');
    expect(player.current()).toBeNull();
    expect(store.get().tour).toBe(false);
  });

  it('next() advances the step and applies it; stops at the last step', () => {
    const player = createTourPlayer({ store, viewer, scenarios: tinyScenarios() });
    player.play('demo');

    player.next();
    expect(player.current()?.stepIndex).toBe(1);
    expect(store.get().selection).toEqual({ kind: 'block', id: 'B' });
    expect(store.get().explode).toBe(0.5);

    player.next();
    expect(player.current()?.stepIndex).toBe(2);
    expect(store.get().selection).toEqual({ kind: 'requirement', id: 'REQ_1' });
    expect(viewer.flyToCalls).toEqual([{ position: { x: 1, y: 2, z: 3 }, target: { x: 0, y: 0, z: 0 } }]);

    player.next(); // already at the last step
    expect(player.current()?.stepIndex).toBe(2);
  });

  it('back() retreats the step and applies it; stops at step 0', () => {
    const player = createTourPlayer({ store, viewer, scenarios: tinyScenarios() });
    player.play('demo');
    player.next();
    player.next();

    player.back();
    expect(player.current()?.stepIndex).toBe(1);
    expect(store.get().selection).toEqual({ kind: 'block', id: 'B' });

    player.back();
    expect(player.current()?.stepIndex).toBe(0);
    player.back(); // already at step 0
    expect(player.current()?.stepIndex).toBe(0);
  });

  it('exit() resets store.tour to false, clears focus, and current() becomes null', () => {
    const onExit = vi.fn();
    const player = createTourPlayer({ store, viewer, scenarios: tinyScenarios(), onExit });
    player.play('demo');
    player.exit();

    expect(store.get().tour).toBe(false);
    expect(viewer.focusCalls.at(-1)).toBeNull();
    expect(player.current()).toBeNull();
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('exit() is a no-op when no tour is playing', () => {
    const onExit = vi.fn();
    const player = createTourPlayer({ store, viewer, scenarios: tinyScenarios(), onExit });
    player.exit();
    expect(onExit).not.toHaveBeenCalled();
  });

  it('a manual selection change while a tour plays exits the tour', () => {
    const player = createTourPlayer({ store, viewer, scenarios: tinyScenarios() });
    player.play('demo');

    // Simulate the user clicking a different part directly through the store,
    // exactly as src/ui/panel.ts's selectBlock() would.
    store.set({ selection: { kind: 'block', id: 'ZZZ' } });

    expect(player.current()).toBeNull();
    expect(store.get().tour).toBe(false);
  });

  it('clearing the selection manually (e.g. Escape in the panel) also exits the tour', () => {
    const player = createTourPlayer({ store, viewer, scenarios: tinyScenarios() });
    player.play('demo');
    store.set({ selection: null });
    expect(player.current()).toBeNull();
  });

  it('does not exit on unrelated store changes (hover, theme)', () => {
    const player = createTourPlayer({ store, viewer, scenarios: tinyScenarios() });
    player.play('demo');
    store.set({ hover: 'A' });
    store.set({ theme: 'light' });
    expect(player.current()).not.toBeNull();
  });

  it('auto-advances after the configured delay, and pause()/resume() control it', () => {
    const player = createTourPlayer({ store, viewer, scenarios: tinyScenarios(), autoAdvanceMs: 7000 });
    player.play('demo');

    vi.advanceTimersByTime(6999);
    expect(player.current()?.stepIndex).toBe(0);
    vi.advanceTimersByTime(1);
    expect(player.current()?.stepIndex).toBe(1);

    player.pause();
    vi.advanceTimersByTime(10000);
    expect(player.current()?.stepIndex).toBe(1); // paused: no advance

    player.resume();
    vi.advanceTimersByTime(7000);
    expect(player.current()?.stepIndex).toBe(2); // last step: no further auto-advance
    vi.advanceTimersByTime(20000);
    expect(player.current()?.stepIndex).toBe(2);
  });

  it('autoAdvanceMs: 0 disables auto-advance entirely', () => {
    const player = createTourPlayer({ store, viewer, scenarios: tinyScenarios(), autoAdvanceMs: 0 });
    player.play('demo');
    vi.advanceTimersByTime(60000);
    expect(player.current()?.stepIndex).toBe(0);
  });

  it('playing a new scenario resets to step 0 of the new one', () => {
    const player = createTourPlayer({ store, viewer, scenarios: tinyScenarios() });
    player.play('demo');
    player.next();
    player.play('other');
    expect(player.current()?.scenario.id).toBe('other');
    expect(player.current()?.stepIndex).toBe(0);
  });

  it('dispose() stops the store subscription: a manual selection change no longer exits the tour', () => {
    const player = createTourPlayer({ store, viewer, scenarios: tinyScenarios() });
    player.play('demo');
    player.dispose();
    expect(() => store.set({ selection: { kind: 'block', id: 'ZZZ' } })).not.toThrow();
    // The auto-exit listener was removed, so the (now-stale) player state is untouched.
    expect(player.current()?.scenario.id).toBe('demo');
    expect(player.current()?.stepIndex).toBe(0);
  });
});

// ---------------------------------------------------------------------- //
// `sequence`/`stateMachine` steps, against `src/model/behavior.ts`'s real
// `behaviorIndex()` over the `buildBehaviorFixtureModel()` fixture (SEQ_1:
// PARTA --kickoff()--> PARTB [SynchCall op], PARTB --ack--> PARTA
// [AsynchSignal]; SM_PARTA: ST_INIT -> ST_OFF -> ST_ON -> ST_FAULT/ST_DONE).
// ---------------------------------------------------------------------- //

function sequenceScenarios(): ScenariosFile['scenarios'] {
  const stepIntro: TourStep = { caption: 'Intro.', selection: { kind: 'block', id: 'PARTA' } };
  const stepMsg1: TourStep = {
    caption: 'Kickoff.',
    sequence: { interaction: 'SEQ_1', message: 1 },
    stateMachine: { id: 'SM_PARTA', state: 'ST_ON' },
  };
  const stepMsg2: TourStep = { caption: 'Ack.', sequence: { interaction: 'SEQ_1', message: 2 } };
  const stepUnknownMsg: TourStep = {
    caption: 'No such message.',
    selection: { kind: 'block', id: 'PARTB' },
    sequence: { interaction: 'SEQ_1', message: 99 },
  };
  return [{ id: 'seq-demo', title: 'Sequence demo', blurb: 'A tiny sequence demo.', steps: [stepIntro, stepMsg1, stepMsg2, stepUnknownMsg] }];
}

describe('createTourPlayer with behavior data (sequence/stateMachine steps)', () => {
  let store: ReturnType<typeof createStore>;
  let viewer: ReturnType<typeof stubViewer>;
  const idx = buildIndex(buildBehaviorFixtureModel());

  beforeEach(() => {
    store = createStore();
    viewer = stubViewer();
  });

  it('a resolved sequence step sets selection to the receiving block and message data for the overlay', () => {
    const player = createTourPlayer({ store, viewer, scenarios: sequenceScenarios(), idx, behavior: idx.behavior, autoAdvanceMs: 0 });
    player.play('seq-demo');
    player.next(); // step 1: message 1, PARTA -> PARTB

    expect(store.get().selection).toEqual({ kind: 'block', id: 'PARTB' });
    expect(player.current()?.message).toEqual({ fromLabel: 'partA', toLabel: 'partB', label: 'doThing()', sort: 'SynchCall' });
    expect(player.current()?.stateStrip?.currentId).toBe('ST_ON');
    expect(player.current()?.stateStrip?.states.map((s) => s.id)).toEqual(['ST_INIT', 'ST_OFF', 'ST_ON', 'ST_FAULT', 'ST_DONE']);
  });

  it('a signal message (no operation signature) renders its plain name, not name()', () => {
    const player = createTourPlayer({ store, viewer, scenarios: sequenceScenarios(), idx, behavior: idx.behavior, autoAdvanceMs: 0 });
    player.play('seq-demo');
    player.next();
    player.next(); // step 2: message 2, PARTB -> PARTA, signal "ack"

    expect(store.get().selection).toEqual({ kind: 'block', id: 'PARTA' });
    expect(player.current()?.message).toEqual({ fromLabel: 'partB', toLabel: 'partA', label: 'ack', sort: 'AsynchSignal' });
    // Step 2 carries no `stateMachine`, so the strip clears rather than carrying step 1's over.
    expect(player.current()?.stateStrip).toBeUndefined();
  });

  it('applies sender-secondary/receiver-primary highlight via highlightForMessage, using highlightFor as its base', () => {
    const player = createTourPlayer({ store, viewer, scenarios: sequenceScenarios(), idx, behavior: idx.behavior, autoAdvanceMs: 0 });
    player.play('seq-demo');
    viewer.highlightCalls.length = 0; // discard step 0's plain-selection highlight
    player.next(); // step 1: message 1, PARTA -> PARTB

    expect(viewer.highlightCalls).toHaveLength(1);
    const applied = viewer.highlightCalls[0]!;
    expect(applied).toEqual(highlightForMessage(idx, 'PARTA', 'PARTB'));
    expect(applied.primary.has('PARTB')).toBe(true);
    expect(applied.primary.has('PARTA')).toBe(false);
    expect(applied.secondary.has('PARTA')).toBe(true);
    expect(applied.secondary.has('PARTB')).toBe(false);
  });

  it('falls back to a plain primary/secondary highlight when idx is omitted', () => {
    const player = createTourPlayer({ store, viewer, scenarios: sequenceScenarios(), behavior: idx.behavior, autoAdvanceMs: 0 });
    player.play('seq-demo');
    viewer.highlightCalls.length = 0;
    player.next();

    expect(viewer.highlightCalls).toHaveLength(1);
    expect(viewer.highlightCalls[0]).toEqual({ primary: new Set(['PARTB']), secondary: new Set(['PARTA']) });
  });

  it('falls back to a normal step (own selection, no message/state data) when behavior is omitted entirely', () => {
    const player = createTourPlayer({ store, viewer, scenarios: sequenceScenarios(), idx, autoAdvanceMs: 0 });
    player.play('seq-demo');
    player.next();

    // No `selection` on the step itself, and no behavior to resolve `sequence` -> falls back to
    // "no selection field this step" rather than crashing or inventing one.
    expect(store.get().selection).toEqual({ kind: 'block', id: 'PARTA' }); // unchanged from step 0
    expect(player.current()?.message).toBeUndefined();
    expect(player.current()?.stateStrip).toBeUndefined();
  });

  it('an unresolvable message (bad order) falls back to the step\'s own selection, with no message data', () => {
    const player = createTourPlayer({ store, viewer, scenarios: sequenceScenarios(), idx, behavior: idx.behavior, autoAdvanceMs: 0 });
    player.play('seq-demo');
    player.next();
    player.next();
    player.next(); // step 3: sequence.message 99 doesn't exist on SEQ_1

    expect(store.get().selection).toEqual({ kind: 'block', id: 'PARTB' }); // the step's own `selection`
    expect(player.current()?.message).toBeUndefined();
  });
});

// ---------------------------------------------------------------------- //
// Overlay DOM smoke tests, against the real player + a stub viewer.
// ---------------------------------------------------------------------- //

describe('createTourOverlay', () => {
  let store: ReturnType<typeof createStore>;
  let viewer: ReturnType<typeof stubViewer>;
  let container: HTMLDivElement;

  beforeEach(() => {
    store = createStore();
    viewer = stubViewer();
    container = document.createElement('div');
    document.body.append(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('is hidden until a tour plays, then shows the caption and progress dots', () => {
    const player = createTourPlayer({ store, viewer, scenarios: tinyScenarios(), autoAdvanceMs: 0 });
    createTourOverlay(container, player);

    const overlay = container.querySelector('[data-testid="tour-overlay"]') as HTMLElement;
    expect(overlay.hidden).toBe(true);

    player.play('demo');
    expect(overlay.hidden).toBe(false);
    expect(container.querySelector('[data-testid="tour-caption"]')?.textContent).toBe('Step one.');
    expect(container.querySelectorAll('[data-testid="tour-dot"]').length).toBe(3);
    expect(container.querySelector('[data-testid="tour-back"]')).toBeInstanceOf(HTMLButtonElement);
    expect((container.querySelector('[data-testid="tour-back"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('Next/Back/Exit buttons drive the player', () => {
    const player = createTourPlayer({ store, viewer, scenarios: tinyScenarios(), autoAdvanceMs: 0 });
    createTourOverlay(container, player);
    player.play('demo');

    (container.querySelector('[data-testid="tour-next"]') as HTMLButtonElement).click();
    expect(container.querySelector('[data-testid="tour-caption"]')?.textContent).toBe('Step two.');

    (container.querySelector('[data-testid="tour-back"]') as HTMLButtonElement).click();
    expect(container.querySelector('[data-testid="tour-caption"]')?.textContent).toBe('Step one.');

    (container.querySelector('[data-testid="tour-exit"]') as HTMLButtonElement).click();
    expect(store.get().tour).toBe(false);
    expect((container.querySelector('[data-testid="tour-overlay"]') as HTMLElement).hidden).toBe(true);
  });

  it('ArrowRight/ArrowLeft/Escape drive the player while a tour plays', () => {
    const player = createTourPlayer({ store, viewer, scenarios: tinyScenarios(), autoAdvanceMs: 0 });
    createTourOverlay(container, player);
    player.play('demo');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(player.current()?.stepIndex).toBe(1);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(player.current()?.stepIndex).toBe(0);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(player.current()).toBeNull();
  });

  it('hovering the card pauses auto-advance; leaving resumes it', () => {
    const player = createTourPlayer({ store, viewer, scenarios: tinyScenarios(), autoAdvanceMs: 7000 });
    createTourOverlay(container, player);
    vi.useFakeTimers();
    player.play('demo');

    const overlay = container.querySelector('[data-testid="tour-overlay"]') as HTMLElement;
    overlay.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(20000);
    expect(player.current()?.stepIndex).toBe(0); // paused: no advance

    overlay.dispatchEvent(new Event('mouseleave'));
    vi.advanceTimersByTime(7000);
    expect(player.current()?.stepIndex).toBe(1);
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------- //
// Overlay rendering of the message strip (tour-msg) and state strip
// (tour-state-strip), against the same behavior fixture as the player tests.
// ---------------------------------------------------------------------- //

describe('createTourOverlay with behavior data (message/state strips)', () => {
  let store: ReturnType<typeof createStore>;
  let viewer: ReturnType<typeof stubViewer>;
  let container: HTMLDivElement;
  const idx = buildIndex(buildBehaviorFixtureModel());

  beforeEach(() => {
    store = createStore();
    viewer = stubViewer();
    container = document.createElement('div');
    document.body.append(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('tour-msg and tour-state-strip are hidden on a plain step, shown on a resolved sequence/stateMachine step', () => {
    const player = createTourPlayer({ store, viewer, scenarios: sequenceScenarios(), idx, behavior: idx.behavior, autoAdvanceMs: 0 });
    createTourOverlay(container, player);
    player.play('seq-demo');

    const msg = container.querySelector('[data-testid="tour-msg"]') as HTMLElement;
    const stateStrip = container.querySelector('[data-testid="tour-state-strip"]') as HTMLElement;
    expect(msg.hidden).toBe(true);
    expect(stateStrip.hidden).toBe(true);

    (container.querySelector('[data-testid="tour-next"]') as HTMLButtonElement).click(); // step 1: message 1 + SM_PARTA/ST_ON

    expect(msg.hidden).toBe(false);
    expect(msg.textContent).toBe('partA ── doThing() ──▶ partB');
    expect(msg.getAttribute('title')).toBe('SynchCall');

    expect(stateStrip.hidden).toBe(false);
    const stateEls = Array.from(container.querySelectorAll('[data-testid="tour-state"]'));
    expect(stateEls.map((el) => el.textContent)).toEqual(['Initial', 'Off', 'On', 'Fault', 'Done']);
    const current = stateEls.filter((el) => el.classList.contains('is-current'));
    expect(current).toHaveLength(1);
    expect(current[0]!.textContent).toBe('On');
  });

  it('a signal message renders its plain name (no parens), and the state strip clears when a later step omits stateMachine', () => {
    const player = createTourPlayer({ store, viewer, scenarios: sequenceScenarios(), idx, behavior: idx.behavior, autoAdvanceMs: 0 });
    createTourOverlay(container, player);
    player.play('seq-demo');

    const nextBtn = container.querySelector('[data-testid="tour-next"]') as HTMLButtonElement;
    nextBtn.click(); // step 1
    nextBtn.click(); // step 2: message 2, signal "ack", no stateMachine

    const msg = container.querySelector('[data-testid="tour-msg"]') as HTMLElement;
    const stateStrip = container.querySelector('[data-testid="tour-state-strip"]') as HTMLElement;
    expect(msg.hidden).toBe(false);
    expect(msg.textContent).toBe('partB ── ack ──▶ partA');
    expect(msg.getAttribute('title')).toBe('AsynchSignal');
    expect(stateStrip.hidden).toBe(true);
  });
});
