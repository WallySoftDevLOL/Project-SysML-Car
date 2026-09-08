// The tour state machine: which scenario is playing, which step it's on, and
// how each step gets applied to the shared store + the 3D viewer. Owns no
// DOM — src/tour/overlay.ts renders whatever this exposes via onChange().
//
// `store.tour` (src/state/store.ts) means "a tour is playing"; the scenario
// id and step index live only here, not in AppState, so main.ts/ui/* never
// need to know about tour internals.
import type { Store, AppState } from '../state/store';
import type { Viewer } from '../scene/viewer-api';
import type { Selection } from '../model/schema';

/** A single beat of a scripted tour. Mirrors `src/tour/scenarios.json`. */
export interface TourStep {
  caption: string;
  selection?: { kind: 'block' | 'requirement' | 'test' | 'usecase'; id: string };
  /** Block to frame the camera on (`null` resets to the default whole-car framing). Ignored if `camera` is set. */
  focus?: string | null;
  xray?: boolean;
  /** 0..1 */
  explode?: number;
  /** An explicit camera pose, applied via `viewer.flyTo` instead of `focus`. */
  camera?: { position: [number, number, number]; target: [number, number, number] };
}

export interface TourScenario {
  id: string;
  title: string;
  blurb: string;
  steps: TourStep[];
}

/** The shape of `scenarios.json`. */
export interface ScenariosFile {
  scenarios: TourScenario[];
}

/** What's currently playing, for the overlay to render. */
export interface TourPlayerState {
  scenario: TourScenario;
  stepIndex: number;
  stepCount: number;
}

export type TourPlayerListener = (state: TourPlayerState | null) => void;

export interface TourPlayer {
  /** Start (or restart) a scenario by id. No-op if the id isn't found. */
  play(scenarioId: string): void;
  /** Advance one step. No-op at the last step. */
  next(): void;
  /** Go back one step. No-op at the first step. */
  back(): void;
  /** Stop the tour: resets `store.tour` and the camera, and notifies listeners with `null`. */
  exit(): void;
  /** The current scenario/step, or `null` if no tour is playing. */
  current(): TourPlayerState | null;
  /** Pause the auto-advance timer (e.g. while the overlay is hovered). */
  pause(): void;
  /** Resume the auto-advance timer, rescheduling from now. */
  resume(): void;
  /** Subscribe to state changes (play/next/back/exit). Returns an unsubscribe function. */
  onChange(fn: TourPlayerListener): () => void;
  /** Tear down the store subscription and any pending timer. */
  dispose(): void;
}

export interface CreateTourPlayerOptions {
  store: Store;
  viewer: Viewer;
  scenarios: TourScenario[];
  onExit?: () => void;
  /** Auto-advance delay in ms. Default 7000. Set to 0 to disable auto-advance entirely. */
  autoAdvanceMs?: number;
}

function selectionKey(sel: Selection | TourStep['selection'] | null | undefined): string {
  return sel ? `${sel.kind}:${sel.id}` : '';
}

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  } catch {
    return false;
  }
}

export function createTourPlayer(opts: CreateTourPlayerOptions): TourPlayer {
  const { store, viewer, scenarios, onExit } = opts;
  const autoAdvanceMs = opts.autoAdvanceMs ?? 7000;

  let scenario: TourScenario | null = null;
  let stepIndex = 0;
  /** True while applyStep() is writing to the store, so the store subscriber below doesn't treat our own write as a "manual" selection change. */
  let applyingStep = false;
  /** The selection the current step put in the store (or the last one it set, if a later step omits `selection`). Used to detect a manual override. */
  let expectedSelectionKey = '';
  let paused = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<TourPlayerListener>();

  function current(): TourPlayerState | null {
    if (!scenario) return null;
    return { scenario, stepIndex, stepCount: scenario.steps.length };
  }

  function notify() {
    const state = current();
    listeners.forEach((fn) => fn(state));
  }

  function clearTimer() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function scheduleAutoAdvance() {
    clearTimer();
    if (paused || autoAdvanceMs <= 0 || prefersReducedMotion()) return;
    if (!scenario || stepIndex >= scenario.steps.length - 1) return;
    timer = setTimeout(() => next(), autoAdvanceMs);
  }

  function applyStep() {
    if (!scenario) return;
    const step = scenario.steps[stepIndex];
    if (!step) return;

    const patch: Partial<AppState> = { tour: true };
    if (step.selection !== undefined) {
      patch.selection = step.selection;
      expectedSelectionKey = selectionKey(step.selection);
    }
    if (step.xray !== undefined) patch.xray = step.xray;
    if (step.explode !== undefined) patch.explode = step.explode;

    applyingStep = true;
    store.set(patch);
    applyingStep = false;

    if (step.camera) {
      viewer.flyTo({
        position: { x: step.camera.position[0], y: step.camera.position[1], z: step.camera.position[2] },
        target: { x: step.camera.target[0], y: step.camera.target[1], z: step.camera.target[2] },
      });
    } else if (step.focus !== undefined) {
      viewer.focus(step.focus);
    }

    scheduleAutoAdvance();
    notify();
  }

  function play(scenarioId: string) {
    const found = scenarios.find((s) => s.id === scenarioId);
    if (!found || found.steps.length === 0) return;
    scenario = found;
    stepIndex = 0;
    paused = false;
    applyStep();
  }

  function next() {
    if (!scenario) return;
    if (stepIndex >= scenario.steps.length - 1) return;
    stepIndex += 1;
    applyStep();
  }

  function back() {
    if (!scenario) return;
    if (stepIndex <= 0) return;
    stepIndex -= 1;
    applyStep();
  }

  function exit() {
    if (!scenario) return;
    clearTimer();
    scenario = null;
    stepIndex = 0;
    expectedSelectionKey = '';
    paused = false;
    applyingStep = true;
    store.set({ tour: false });
    applyingStep = false;
    viewer.focus(null);
    notify();
    onExit?.();
  }

  function pause() {
    paused = true;
    clearTimer();
  }

  function resume() {
    if (!paused) return;
    paused = false;
    scheduleAutoAdvance();
  }

  // Any store change while a tour plays is either ours (guarded by
  // `applyingStep`) or a manual pick made through the normal UI (clicking a
  // part, searching a requirement, etc.) — the latter always exits the tour.
  const unsubscribeStore = store.subscribe((state) => {
    if (!scenario || applyingStep) return;
    if (selectionKey(state.selection) !== expectedSelectionKey) {
      exit();
    }
  });

  return {
    play,
    next,
    back,
    exit,
    current,
    pause,
    resume,
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    dispose() {
      clearTimer();
      unsubscribeStore();
      listeners.clear();
    },
  };
}
