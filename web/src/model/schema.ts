// Types mirroring docs/model-contract.md section 2 (data/model.json) exactly.
// Keep this file in lockstep with the contract; every consumer (model/scene/ui
// agents) imports from here rather than re-declaring shapes.

/** A `data/model.json` category, from the `categories` array. */
export interface Category {
  id: string;
  name: string;
  plain: string;
  level: number;
  /** Present only on subsystem categories that map 1:1 to a Block (e.g. PT -> POWERTRAIN). */
  block?: string;
}

/**
 * The union of element kinds the contract names explicitly. `| string` keeps
 * every consumer tolerant of kinds the workbook adds later (contract section
 * 2, "Unknown kind or type values must be tolerated by every consumer").
 */
export type ElementKind =
  | 'Requirement'
  | 'Block'
  | 'TestCase'
  | 'UseCase'
  | 'Actor'
  | 'ConstraintBlock'
  | 'Operation'
  | 'Port'
  | 'Package'
  | 'BindingEndpoint'
  | (string & {});

/**
 * A `data/model.json` element, from the `elements` array. Fields vary by
 * `kind` (see contract section 2 examples); all are optional except the
 * identifying ones, so consumers must check for what they need.
 */
export interface Element {
  id: string;
  kind: ElementKind;
  name: string;

  // Requirement-specific
  displayId?: string;
  category?: string;
  text?: string;
  rationale?: string;
  acceptance?: string;
  authoritative?: boolean;
  owner?: string;

  // Block-specific
  label?: string;
  blurb?: string;
  mesh?: string;
  /** Containing block id, or `null` for the root (VEH) — the converter emits a literal `null`, not an omitted field. */
  parent?: string | null;
  color?: string;
  alpha?: number;
  explode?: [number, number, number];

  // Block extras (contract section 6, added 2026-09-08). Present on both the
  // 13 clickable (meshed) blocks and the new non-clickable composition
  // sub-parts (which have `parent` but no `mesh`/`color`).
  /** Part-property name this block plays in its owner, e.g. `tractionMotor`. */
  role?: string;
  /** Ids of this block's composition sub-parts (mirrors `ModelJson.composition[id]`). */
  subParts?: string[];
  operations?: BlockOperation[];
  receptions?: BlockReception[];
  values?: BlockValue[];
  ports?: BlockPort[];

  // Port-specific
  portKind?: string;

  // Allow forward-compatible extra fields without widening every access site.
  [extra: string]: unknown;
}

/**
 * The union of relationship types the contract names explicitly (contract
 * section 2). `| string` for forward compatibility, same rationale as
 * {@link ElementKind}.
 */
export type RelationshipType =
  | 'Satisfy'
  | 'Verify'
  | 'DeriveRequirement'
  | 'Refine'
  | 'Trace'
  | 'Copy'
  | 'ItemFlow'
  | 'Assembly'
  | 'Delegation'
  | 'Allocate'
  | 'Generalization'
  | 'Include'
  | 'Extend'
  | 'Association'
  | 'Dependency'
  | 'BindingConnector'
  | 'PackageImport'
  | (string & {});

/**
 * A `data/model.json` relationship, from the `relationships` array.
 *
 * Direction rule (contract section 2): `source` is the SysML *client*
 * (dependent end) — the satisfying block, the verifying test case, the
 * *derived* requirement, the refining element, the tracing use case, the
 * copy, the allocated use case, the specializing block, the sending block of
 * a flow. `target` is the supplier — the requirement, the parent
 * requirement, the receiving block.
 */
export interface Relationship {
  id: string;
  type: RelationshipType;
  source: string;
  target: string;
  /** Port-level Assembly/Delegation/ItemFlow rows carry their port ids here. */
  extra?: {
    sourcePort?: string;
    targetPort?: string;
    item?: string;
    connector?: string;
    [key: string]: unknown;
  };
}

/** A `data/model.json` flow, from the `flows` array (block-to-block connections). */
export interface Flow {
  id: string;
  source: string;
  target: string;
  item: string;
  label: string;
  meshName: string;
}

// ---------------------------------------------------------------------------
// Behavior/parametrics types (contract section 6, added 2026-09-08). All of
// `ModelJson.behavior` / `.parametrics` / `.signals` / `.composition` are
// optional so a `data/model.json` produced by the pre-section-6 converter
// still parses; every consumer must treat these as possibly absent.
// ---------------------------------------------------------------------------

/** A state's role in its state machine's region. */
export type StateKind = 'initial' | 'state' | 'final';

/** One vertex of a `StateMachine`. */
export interface State {
  id: string;
  name: string;
  kind: StateKind;
}

/** A transition's triggering event, e.g. a signal receipt. */
export interface TransitionTrigger {
  kind: 'signal' | (string & {});
  id: string;
  name: string;
}

/** One edge of a `StateMachine`, `source`/`target` are `State.id`s. */
export interface Transition {
  id: string;
  source: string;
  target: string;
  trigger?: TransitionTrigger;
}

/** A SysML state machine (`context` is the owning Block's id). */
export interface StateMachine {
  id: string;
  name: string;
  context: string;
  states: State[];
  transitions: Transition[];
}

/** An activity node's role. `call` nodes invoke another activity (`calls`). */
export type ActivityNodeKind = 'initial' | 'action' | 'call' | 'final';

export interface ActivityNode {
  id: string;
  name: string;
  kind: ActivityNodeKind;
  body?: string;
  /** Present on `kind: 'call'` nodes: the id of the invoked `Activity`. */
  calls?: string;
}

/** An activity edge; `kind` is almost always `ControlFlow`. */
export interface ActivityEdge {
  id: string;
  source: string;
  target: string;
  kind: 'ControlFlow' | (string & {});
}

/** A SysML activity diagram. `refines` names requirement ids it elaborates. */
export interface Activity {
  id: string;
  name: string;
  refines?: string[];
  nodes: ActivityNode[];
  edges: ActivityEdge[];
}

/** One participant of an `Interaction`. `block` is the resolved leaf Block id. */
export interface Lifeline {
  id: string;
  name: string;
  block: string;
}

/** A message's operation-call or signal-send signature. */
export interface MessageSignature {
  kind: 'operation' | 'signal' | (string & {});
  id: string;
  name: string;
}

/** One message of a sequence `Interaction`. `from`/`to` are `Lifeline.id`s. */
export interface Message {
  id: string;
  order: number;
  name: string;
  sort: 'SynchCall' | 'AsynchCall' | 'AsynchSignal' | (string & {});
  from: string;
  to: string;
  signature?: MessageSignature;
}

/** A state invariant annotation on a sequence diagram lifeline. */
export interface InteractionInvariant {
  lifeline: string;
  order: number;
  constraint: string;
}

/** A SysML sequence diagram (`context` is the owning Block's id). */
export interface Interaction {
  id: string;
  name: string;
  context: string;
  lifelines: Lifeline[];
  messages: Message[];
  invariants?: InteractionInvariant[];
}

/** One parameter binding of a `Parametric` constraint evaluation. */
export interface ParametricParameter {
  /** The symbol used in `Parametric.expression`, e.g. `"m"`. */
  parameter: string;
  /** The bound SysML value-property id, e.g. `"A_FORCE_MASS"`. */
  value: string;
  name: string;
  default: number | null;
  unit: string;
}

/** A SysML parametric (constraint block evaluation). */
export interface Parametric {
  id: string;
  name: string;
  constraint: string;
  /** Simple infix arithmetic, e.g. `"F = m * a"`. Parsed by `model/parametrics.ts`, never `eval`. */
  expression: string;
  /** The parameter symbol on the left-hand side of `expression`. */
  output: string;
  refines?: string[];
  parameters: ParametricParameter[];
}

/** A SysML signal (asynchronous event), e.g. `StartCommand`. */
export interface Signal {
  id: string;
  name: string;
}

/** `ModelJson.behavior`: the three behavior-diagram families the converter emits. */
export interface BehaviorModel {
  stateMachines: StateMachine[];
  activities: Activity[];
  interactions: Interaction[];
}

/** A Block's `operations` entry. */
export interface BlockOperation {
  id: string;
  name: string;
}

/** A Block's `receptions` entry: a signal it can receive. */
export interface BlockReception {
  id: string;
  name: string;
  signal: string;
}

/** A Block's `values` entry: a value property with a default. */
export interface BlockValue {
  id: string;
  name: string;
  default: number | null;
  type: string;
}

/** A Block's `ports` entry. */
export interface BlockPort {
  id: string;
  name: string;
  kind: string;
  interface: { id: string; name: string };
}

/** Root shape of `data/model.json`. */
export interface ModelJson {
  meta: {
    schema: number;
    sourceFile: string;
    sourceSha256: string;
    converter: string;
  };
  categories: Category[];
  elements: Element[];
  relationships: Relationship[];
  flows: Flow[];
  /** Block id -> direct child block ids. */
  hierarchy: Record<string, string[]>;
  stats: {
    requirements: number;
    copies: number;
    traceRelationships: number;
    allRelationships: number;
    blocks: number;
    flows: number;
    stateMachines?: number;
    activities?: number;
    interactions?: number;
    parametrics?: number;
    signals?: number;
    subParts?: number;
  };
  /** State machines, activities, and interactions (contract section 6). Absent in pre-section-6 data files. */
  behavior?: BehaviorModel;
  parametrics?: Parametric[];
  signals?: Signal[];
  /** Block id -> ids of its composition sub-parts (contract section 6). */
  composition?: Record<string, string[]>;
}

/** A Block element's id, e.g. `"POWERTRAIN"`. Kept as a distinct alias for readability at call sites. */
export type BlockId = string;

/**
 * What is currently picked in the UI: a block (car part), a requirement, a
 * test case, or a use case. Extended additively (beyond block/requirement)
 * so `model/highlight.ts` can compute highlight state for every selectable
 * kind; existing `selection.kind === 'block' | 'requirement'` checks are
 * unaffected.
 */
export type Selection =
  | { kind: 'block'; id: BlockId }
  | { kind: 'requirement'; id: string }
  | { kind: 'test'; id: string }
  | { kind: 'usecase'; id: string }
  | null;

/**
 * Scene highlight state. `primary` is the direct selection (e.g. the clicked
 * block, or the block(s) that satisfy a selected requirement); `secondary`
 * is everything connected to it one hop out (e.g. related requirements'
 * owning blocks, or flow partners) so the scene can dim vs. tint vs. leave
 * neutral.
 */
export interface HighlightState {
  primary: Set<BlockId>;
  secondary: Set<BlockId>;
}
