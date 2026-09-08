// The plain-language layer (docs/model-contract.md section 5): translates
// formal SysML relationship types and element kinds into the wording shown
// to non-engineers by default, with the raw term used in "SysML" mode.
export type PlainMode = 'plain' | 'sysml';

/**
 * Some formal terms read differently depending on where they appear.
 * - 'partCard': Satisfy shown on a part's own card ("Responsible for") vs.
 *   everywhere else ("Built into").
 * - 'derivedUp' / 'derivedDown': DeriveRequirement viewed from the derived
 *   (child) requirement looking at its parent ("Comes from") vs. from the
 *   parent looking down at what it derived ("Leads to").
 * - 'flowOut' / 'flowIn': ItemFlow from the sending block's side ("Sends")
 *   vs. the receiving block's side ("Receives").
 */
export type LabelContext = 'default' | 'partCard' | 'derivedUp' | 'derivedDown' | 'flowOut' | 'flowIn';

const RELATIONSHIP_PLAIN: Record<string, string> = {
  Satisfy: 'Built into',
  Verify: 'Proven by test',
  DeriveRequirement: 'Comes from',
  Refine: 'Spelled out by',
  Trace: 'Related scenario',
  Copy: 'Copy for the test team',
  ItemFlow: 'Sends',
  Allocate: 'Used in',
};

const RELATIONSHIP_PLAIN_VARIANTS: Partial<Record<string, Partial<Record<LabelContext, string>>>> = {
  Satisfy: { partCard: 'Responsible for' },
  DeriveRequirement: { derivedUp: 'Comes from', derivedDown: 'Leads to' },
  ItemFlow: { flowOut: 'Sends', flowIn: 'Receives' },
};

const KIND_PLAIN: Record<string, string> = {
  Block: 'Part',
  Requirement: 'Requirement',
  TestCase: 'Test',
  UseCase: 'Scenario',

  // Behaviour and structure (docs/model-contract.md section 6). These read as
  // what the thing *does* for the reader rather than what SysML calls it:
  // a StateMachine is "how it behaves", a ValueProperty is what a part
  // "tracks". 'sysml' mode still returns the formal term unchanged.
  StateMachine: 'How it behaves',
  State: 'Mode',
  Transition: 'Changes to',
  Signal: 'Signal',
  Reception: 'Listens for',
  Operation: 'Can do',
  ValueProperty: 'Tracks',
  PartProperty: 'Contains',
  Port: 'Connection',
  InterfaceBlock: 'Connection type',
  ConstraintBlock: 'Formula',
  Interaction: 'Sequence',
  Activity: 'Procedure',
};

/**
 * Look up the display label for a formal SysML term (a relationship `type`
 * like "Satisfy", or an element `kind` like "Block"). In 'sysml' mode the
 * term is returned unchanged; unknown terms fall back to themselves in
 * either mode (contract: unknown kind/type values must be tolerated).
 */
export function label(term: string, mode: PlainMode, context: LabelContext = 'default'): string {
  if (mode === 'sysml') return term;

  if (term in KIND_PLAIN) return KIND_PLAIN[term]!;

  const variant = RELATIONSHIP_PLAIN_VARIANTS[term]?.[context];
  if (variant) return variant;

  return RELATIONSHIP_PLAIN[term] ?? term;
}
