// The tour state machine: which scenario is playing, which step it's on, and
// how each step gets applied to the shared store + the 3D viewer. Owns no
// DOM — src/tour/overlay.ts renders whatever this exposes via onChange().
//
// `store.tour` (src/state/store.ts) means "a tour is playing"; the scenario
// id and step index live only here, not in AppState, so main.ts/ui/* never
// need to know about tour internals.
import type { Store, AppState } from '../state/store';
import type { Viewer } from '../scene/viewer-api';
import type { BlockId, HighlightState, MessageSignature, Selection, State as ModelState } from '../model/schema';
import type { ModelIndex } from '../model/index';
import { highlightFor } from '../model/highlight';
import type { BehaviorIndex } from '../model/behavior';

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
  /**
   * Ties this step to one message of a `behavior.interactions` sequence
   * diagram (docs/model-contract.md section 6). `message` is the message's
   * 1-based `order` within that interaction, not an array index. When this
   * is set (and a `behavior` accessor was supplied to `createTourPlayer`),
   * the player overrides `selection`/highlight to reflect the sender ->
   * receiver of that message, and the overlay shows the message strip.
   * If no `behavior` was supplied, or the interaction/message can't be
   * resolved, the step falls back to acting on its own `selection`/`focus`
   * fields as usual.
   */
  sequence?: { interaction: string; message: number };
  /**
   * Ties this step to one state of a `behavior.stateMachines` state machine.
   * Purely a display hint for the overlay's state strip (it does not affect
   * `selection`/highlight); ignored if `behavior` wasn't supplied or the
   * state machine id is unknown.
   */
  stateMachine?: { id: string; state: string };
}

// ---------------------------------------------------------------------- //
// Behavior lookups. `BehaviorIndex` (src/model/behavior.ts) is the
// data-layer's query surface over `data/model.json`'s `behavior` key
// (docs/model-contract.md section 6); it degrades to empty results rather
// than throwing when that key is absent (pre-section-6 data), which is
// exactly the "falls back to a normal step" behaviour this file wants.
// ---------------------------------------------------------------------- //

/** What the overlay renders for a `sequence` step (`tour-msg`). */
export interface TourResolvedMessage {
  fromLabel: string;
  toLabel: string;
  /** `"startVehicle()"` for operations, `"PowerEnable"` for signals. */
  label: string;
  /** UML message sort (e.g. "SynchCall", "AsynchSignal"), shown as a tooltip. */
  sort: string;
}

/** What the overlay renders for a `stateMachine` step (`tour-state-strip`). */
export interface TourResolvedStateMachine {
  states: ModelState[];
  currentId: string;
}

interface ResolvedSequenceStep {
  fromBlock: BlockId;
  toBlock: BlockId;
  message: TourResolvedMessage;
}

/** `name()` for an operation call, plain `name` for a signal (or anything unsignatured). */
function messageLabel(name: string, signature: MessageSignature | undefined): string {
  return signature?.kind === 'operation' ? `${signature.name}()` : name;
}

/**
 * Resolves a `TourStep.sequence` reference against `behavior`: the message's
 * leaf sender/receiver blocks (via `messageSequence`, contract section 6)
 * plus the lifeline display names for the overlay's message strip. Returns
 * `undefined` if the interaction, or that message order within it, isn't
 * found — the caller then falls back to treating this as a normal step.
 */
function resolveSequenceStep(
  behavior: BehaviorIndex,
  seq: NonNullable<TourStep['sequence']>,
): ResolvedSequenceStep | undefined {
  const resolved = behavior.messageSequence(seq.interaction).find((m) => m.order === seq.message);
  if (!resolved) return undefined;

  const interaction = behavior.interactions.find((it) => it.id === seq.interaction);
  const raw = interaction?.messages.find((m) => m.order === seq.message);
  const fromLifeline = interaction?.lifelines.find((ll) => ll.id === raw?.from);
  const toLifeline = interaction?.lifelines.find((ll) => ll.id === raw?.to);

  return {
    fromBlock: resolved.fromBlock,
    toBlock: resolved.toBlock,
    message: {
      fromLabel: fromLifeline?.name ?? resolved.fromBlock,
      toLabel: toLifeline?.name ?? resolved.toBlock,
      label: messageLabel(resolved.name, resolved.signature),
      sort: resolved.sort,
    },
  };
}

/**
 * Resolves a `TourStep.stateMachine` reference: the named state machine's
 * ordered states, for the overlay's state strip. `BehaviorIndex` only
 * exposes state machines filtered by owning block (`stateMachinesFor`), so
 * this reads the raw list off `idx.model.behavior` directly instead — hence
 * this needs `idx`, not just `behavior`. Returns `undefined` if `idx` wasn't
 * supplied or the state machine id is unknown.
 */
function resolveStateMachine(
  idx: ModelIndex | undefined,
  ref: NonNullable<TourStep['stateMachine']>,
): TourResolvedStateMachine | undefined {
  const sm = idx?.model.behavior?.stateMachines?.find((s) => s.id === ref.id);
  return sm ? { states: sm.states, currentId: ref.state } : undefined;
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
  /** Set when the current step has a resolved `sequence` (behavior supplied and message found). */
  message?: TourResolvedMessage;
  /** Set when the current step has a resolved `stateMachine` (behavior supplied and SM found). */
  stateStrip?: TourResolvedStateMachine;
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
  /**
   * The model index, needed to compute sender/receiver highlight for a
   * `sequence` step via `highlightFor` (docs/model-contract.md section 3).
   * If omitted, `sequence` steps still set selection/message data but fall
   * back to a plain primary/secondary highlight instead of the full
   * `highlightFor`-derived one.
   */
  idx?: ModelIndex;
  /** `behaviorIndex(model)` (src/model/behavior.ts). Omit to disable `sequence`/`stateMachine` steps entirely — those steps then act as normal steps. */
  behavior?: BehaviorIndex;
}

function selectionKey(sel: Selection | TourStep['selection'] | null | undefined): string {
  return sel ? `${sel.kind}:${sel.id}` : '';
}

/**
 * Highlight for a sequence-diagram message: the receiving block primary, the
 * sending block secondary. Starts from `highlightFor`'s block-selection
 * result (so the viewer's flow-tube lighting between primary and its
 * neighbours still works) and overrides the two sets so sender/receiver read
 * correctly even when they aren't directly connected by a modeled flow.
 */
export function highlightForMessage(idx: ModelIndex, fromBlock: BlockId, toBlock: BlockId): HighlightState {
  const base = highlightFor(idx, { kind: 'block', id: toBlock });
  const primary = new Set(base.primary);
  primary.add(toBlock);
  primary.delete(fromBlock);
  const secondary = new Set(base.secondary);
  secondary.add(fromBlock);
  secondary.delete(toBlock);
  return { primary, secondary };
}

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  } catch {
    return false;
  }
}

export function createTourPlayer(opts: CreateTourPlayerOptions): TourPlayer {
  const { store, viewer, scenarios, onExit, idx, behavior } = opts;
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
  let currentMessage: TourResolvedMessage | undefined;
  let currentStateStrip: TourResolvedStateMachine | undefined;

  function current(): TourPlayerState | null {
    if (!scenario) return null;
    return { scenario, stepIndex, stepCount: scenario.steps.length, message: currentMessage, stateStrip: currentStateStrip };
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

    // Resolve the sequence-diagram message this step points at, if any. Only
    // used when a `behavior` accessor was supplied *and* the interaction/
    // message actually resolves — otherwise this step falls back to acting
    // on its own `selection`/`focus` fields, same as any other step.
    const resolvedMsg = step.sequence && behavior ? resolveSequenceStep(behavior, step.sequence) : undefined;

    const patch: Partial<AppState> = { tour: true };
    if (resolvedMsg) {
      patch.selection = { kind: 'block', id: resolvedMsg.toBlock };
      expectedSelectionKey = selectionKey(patch.selection);
    } else if (step.selection !== undefined) {
      patch.selection = step.selection;
      expectedSelectionKey = selectionKey(step.selection);
    }
    if (step.xray !== undefined) patch.xray = step.xray;
    if (step.explode !== undefined) patch.explode = step.explode;

    applyingStep = true;
    store.set(patch);
    applyingStep = false;

    // Override whatever highlight the store's own selection-driven subscriber
    // just applied: for a resolved message, the sender is secondary and the
    // receiver primary, not just "the receiver and its descendants/flows".
    if (resolvedMsg) {
      viewer.setHighlight(
        idx
          ? highlightForMessage(idx, resolvedMsg.fromBlock, resolvedMsg.toBlock)
          : { primary: new Set([resolvedMsg.toBlock]), secondary: new Set([resolvedMsg.fromBlock]) },
      );
    }

    if (step.camera) {
      viewer.flyTo({
        position: { x: step.camera.position[0], y: step.camera.position[1], z: step.camera.position[2] },
        target: { x: step.camera.target[0], y: step.camera.target[1], z: step.camera.target[2] },
      });
    } else if (step.focus !== undefined) {
      viewer.focus(step.focus);
    }

    currentMessage = resolvedMsg?.message;
    currentStateStrip = step.stateMachine && behavior ? resolveStateMachine(idx, step.stateMachine) : undefined;

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
    currentMessage = undefined;
    currentStateStrip = undefined;
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
