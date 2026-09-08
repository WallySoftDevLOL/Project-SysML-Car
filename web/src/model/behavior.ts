// Queries over the contract section 6 behavior data (state machines,
// activities, interactions) and composition/port/operation/value block
// extras. Everything here is a pure function of a parsed `ModelJson` (or a
// `ModelIndex` from `model/index.ts`), and every lookup degrades to an empty
// result rather than throwing when `model.behavior` etc. is absent, so this
// module works unchanged before and after the converter lands section 6.
import type {
  Activity,
  ActivityNode,
  BlockOperation,
  BlockPort,
  BlockReception,
  BlockValue,
  Element,
  Interaction,
  ModelJson,
  Signal,
  State,
  StateMachine,
  Transition,
} from './schema';
import type { ModelIndex } from './index';

/** A resolved (signal, reception) pair: `signalsReceivedBy` return shape. */
export interface ReceivedSignal {
  signal: Signal;
  reception: BlockReception;
}

/** A resolved (signal, message) pair: `signalsSentBy` return shape. */
export interface SentSignal {
  signal: Signal;
  interactionId: string;
  message: import('./schema').Message;
}

/** One resolved hop of a sequence diagram, block ids resolved to leaf blocks. */
export interface ResolvedMessage {
  order: number;
  name: string;
  sort: string;
  fromBlock: string;
  toBlock: string;
  signature: import('./schema').MessageSignature | undefined;
}

/** A composition sub-part, tagged with whether it is also one of the 13 clickable (meshed) blocks. */
export interface SubPart {
  element: Element;
  clickable: boolean;
}

export interface BehaviorIndex {
  /** State machines whose `context` is `blockId`. */
  stateMachinesFor(blockId: string): StateMachine[];
  /** Every activity in the model, pass-through from `model.behavior.activities`. */
  activities: Activity[];
  activityById: Map<string, Activity>;
  /** Every interaction in the model, pass-through from `model.behavior.interactions`. */
  interactions: Interaction[];
  /** Interactions with at least one lifeline whose `block` is `blockId`. */
  interactionsInvolving(blockId: string): Interaction[];
  /** Signals `blockId` can receive, resolved from its `receptions` against `model.signals`. */
  signalsReceivedBy(blockId: string): ReceivedSignal[];
  /** Signals `blockId` sends: messages whose from-lifeline resolves to `blockId` and whose signature is a signal. */
  signalsSentBy(blockId: string): SentSignal[];
  /** Composition sub-parts of `blockId` (from `model.composition`), each tagged `clickable`. */
  subPartsOf(blockId: string): SubPart[];
  portsOf(blockId: string): BlockPort[];
  operationsOf(blockId: string): BlockOperation[];
  valuesOf(blockId: string): BlockValue[];
  /** A sequence diagram's messages, ordered, with lifelines resolved to leaf block ids. */
  messageSequence(interactionId: string): ResolvedMessage[];
  /**
   * `activityId`'s nodes in traversal order, following `ControlFlow` edges
   * from the `initial` node. Branches are followed breadth-first (a node
   * with multiple outgoing edges contributes all of them); a `visited` guard
   * makes this terminate even on a malformed graph with a cycle back to an
   * already-visited node.
   */
  activityOutline(activityId: string): ActivityNode[];
  /** Transitions across every state machine whose `source` is `stateId`. */
  transitionsFrom(stateId: string): Transition[];
}

export function behaviorIndex(model: ModelJson): BehaviorIndex {
  const stateMachines = model.behavior?.stateMachines ?? [];
  const activities = model.behavior?.activities ?? [];
  const interactions = model.behavior?.interactions ?? [];
  const signals = model.signals ?? [];
  const composition = model.composition ?? {};

  const activityById = new Map<string, Activity>();
  for (const a of activities) activityById.set(a.id, a);

  const signalById = new Map<string, Signal>();
  for (const s of signals) signalById.set(s.id, s);

  const elementById = new Map<string, Element>();
  for (const el of model.elements) elementById.set(el.id, el);

  function stateMachinesFor(blockId: string): StateMachine[] {
    return stateMachines.filter((sm) => sm.context === blockId);
  }

  function interactionsInvolving(blockId: string): Interaction[] {
    return interactions.filter((it) => it.lifelines.some((ll) => ll.block === blockId));
  }

  function signalsReceivedBy(blockId: string): ReceivedSignal[] {
    const el = elementById.get(blockId);
    const receptions = el?.receptions ?? [];
    const result: ReceivedSignal[] = [];
    for (const reception of receptions) {
      const signal = signalById.get(reception.signal);
      if (signal) result.push({ signal, reception });
    }
    return result;
  }

  function signalsSentBy(blockId: string): SentSignal[] {
    const result: SentSignal[] = [];
    for (const interaction of interactions) {
      const lifelineById = new Map(interaction.lifelines.map((ll) => [ll.id, ll]));
      for (const message of interaction.messages) {
        if (message.signature?.kind !== 'signal') continue;
        const fromLifeline = lifelineById.get(message.from);
        if (fromLifeline?.block !== blockId) continue;
        const signal = signalById.get(message.signature.id);
        if (signal) result.push({ signal, interactionId: interaction.id, message });
      }
    }
    return result;
  }

  function subPartsOf(blockId: string): SubPart[] {
    const ids = composition[blockId] ?? [];
    const result: SubPart[] = [];
    for (const id of ids) {
      const element = elementById.get(id);
      if (!element) continue;
      // Contract section 6: sub-part blocks have no `mesh`; the 13
      // clickable blocks (e.g. INVERTER under POWERTRAIN) always do.
      result.push({ element, clickable: typeof element.mesh === 'string' });
    }
    return result;
  }

  function portsOf(blockId: string): BlockPort[] {
    return elementById.get(blockId)?.ports ?? [];
  }

  function operationsOf(blockId: string): BlockOperation[] {
    return elementById.get(blockId)?.operations ?? [];
  }

  function valuesOf(blockId: string): BlockValue[] {
    return elementById.get(blockId)?.values ?? [];
  }

  function messageSequence(interactionId: string): ResolvedMessage[] {
    const interaction = interactions.find((it) => it.id === interactionId);
    if (!interaction) return [];
    const lifelineById = new Map(interaction.lifelines.map((ll) => [ll.id, ll]));
    return [...interaction.messages]
      .sort((a, b) => a.order - b.order)
      .map((m) => ({
        order: m.order,
        name: m.name,
        sort: m.sort,
        fromBlock: lifelineById.get(m.from)?.block ?? m.from,
        toBlock: lifelineById.get(m.to)?.block ?? m.to,
        signature: m.signature,
      }));
  }

  function activityOutline(activityId: string): ActivityNode[] {
    const activity = activityById.get(activityId);
    if (!activity) return [];

    const nodeById = new Map(activity.nodes.map((n) => [n.id, n]));
    const outgoing = new Map<string, string[]>();
    for (const edge of activity.edges) {
      if (edge.kind !== 'ControlFlow') continue;
      const list = outgoing.get(edge.source);
      if (list) list.push(edge.target);
      else outgoing.set(edge.source, [edge.target]);
    }

    const start = activity.nodes.find((n) => n.kind === 'initial');
    if (!start) return [];

    const result: ActivityNode[] = [];
    const visited = new Set<string>();
    const queue: string[] = [start.id];
    while (queue.length > 0) {
      const id = queue.shift() as string;
      if (visited.has(id)) continue;
      visited.add(id);
      const node = nodeById.get(id);
      if (node) result.push(node);
      for (const next of outgoing.get(id) ?? []) {
        if (!visited.has(next)) queue.push(next);
      }
    }
    return result;
  }

  function transitionsFrom(stateId: string): Transition[] {
    const result: Transition[] = [];
    for (const sm of stateMachines) {
      for (const t of sm.transitions) {
        if (t.source === stateId) result.push(t);
      }
    }
    return result;
  }

  return {
    stateMachinesFor,
    activities,
    activityById,
    interactions,
    interactionsInvolving,
    signalsReceivedBy,
    signalsSentBy,
    subPartsOf,
    portsOf,
    operationsOf,
    valuesOf,
    messageSequence,
    activityOutline,
    transitionsFrom,
  };
}

/** A requirement related to a behavior element, plus why it's related. */
export interface RelatedRequirement {
  id: string;
  reason: string;
}

/**
 * Simple heuristic word list used to relate a state machine to requirements:
 * a requirement satisfied by the state machine's context block is "related"
 * if its text mentions one of these words. This is intentionally crude (no
 * NLP, no semantic matching) — it exists to surface plausible candidates in
 * the UI, not to be authoritative traceability.
 */
const STATE_HEURISTIC_WORDS = ['fault', 'start', 'charg', 'drive'];

/**
 * Requirements related to a behavior element (an `Activity` or a
 * `StateMachine`, looked up by id across both).
 *
 * - For an `Activity`: its declared `refines` requirement ids, reason `"refines"`.
 * - For a `StateMachine`: requirements `Satisfy`d by its context block whose
 *   `text` mentions one of {@link STATE_HEURISTIC_WORDS} (heuristic, see
 *   above) — reason names the matched word.
 *
 * Returns `[]` if `id` matches neither an activity nor a state machine.
 */
export function relatedRequirementsForBehavior(idx: ModelIndex, id: string): RelatedRequirement[] {
  const behavior = behaviorIndex(idx.model);

  const activity = behavior.activityById.get(id);
  if (activity) {
    return (activity.refines ?? []).map((reqId) => ({ id: reqId, reason: 'refines' }));
  }

  const stateMachine = (idx.model.behavior?.stateMachines ?? []).find((sm) => sm.id === id);
  if (stateMachine) {
    const result: RelatedRequirement[] = [];
    for (const rel of idx.outBy(stateMachine.context, 'Satisfy')) {
      const req = idx.byId.get(rel.target);
      const text = req?.text;
      if (!req || typeof text !== 'string') continue;
      const lower = text.toLowerCase();
      const match = STATE_HEURISTIC_WORDS.find((word) => lower.includes(word));
      if (match) {
        result.push({
          id: req.id,
          reason: `heuristic: context block's requirement text mentions "${match}"`,
        });
      }
    }
    return result;
  }

  return [];
}
