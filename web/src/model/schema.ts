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
  };
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
