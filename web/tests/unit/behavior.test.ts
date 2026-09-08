import { describe, expect, it } from 'vitest';
import { behaviorIndex, relatedRequirementsForBehavior } from '../../src/model/behavior';
import { buildIndex } from '../../src/model/index';
import { buildBehaviorFixtureModel, loadRealModel } from './fixtures';

describe('behaviorIndex (fixture)', () => {
  const model = buildBehaviorFixtureModel();
  const idx = buildIndex(model);
  const behavior = behaviorIndex(model);

  it('stateMachinesFor returns state machines whose context is the block', () => {
    expect(behavior.stateMachinesFor('PARTA').map((sm) => sm.id)).toEqual(['SM_PARTA']);
    expect(behavior.stateMachinesFor('PARTB')).toEqual([]);
    expect(behavior.stateMachinesFor('nope')).toEqual([]);
  });

  it('activities / activityById expose the full list', () => {
    expect(behavior.activities.map((a) => a.id)).toEqual(['ACT_1']);
    expect(behavior.activityById.get('ACT_1')?.name).toBe('Do The Thing');
    expect(behavior.activityById.get('nope')).toBeUndefined();
  });

  it('interactions / interactionsInvolving', () => {
    expect(behavior.interactions.map((i) => i.id)).toEqual(['SEQ_1']);
    expect(behavior.interactionsInvolving('PARTA').map((i) => i.id)).toEqual(['SEQ_1']);
    expect(behavior.interactionsInvolving('PARTB').map((i) => i.id)).toEqual(['SEQ_1']);
    expect(behavior.interactionsInvolving('ROOT')).toEqual([]);
  });

  it('signalsReceivedBy resolves receptions against the signals array', () => {
    const received = behavior.signalsReceivedBy('PARTA');
    expect(received).toHaveLength(1);
    expect(received[0]?.signal).toEqual({ id: 'SIG_START', name: 'StartCommand' });
    expect(received[0]?.reception).toEqual({ id: 'RCP_A', name: 'onStart', signal: 'SIG_START' });
    expect(behavior.signalsReceivedBy('PARTB')).toEqual([]);
  });

  it('signalsSentBy resolves the from-lifeline of signal messages to a block', () => {
    const sent = behavior.signalsSentBy('PARTB');
    expect(sent).toHaveLength(1);
    expect(sent[0]?.signal.id).toBe('SIG_START');
    expect(sent[0]?.interactionId).toBe('SEQ_1');
    expect(sent[0]?.message.id).toBe('M2');
    // PARTA's outgoing message (M1) is an operation call, not a signal, so it doesn't count.
    expect(behavior.signalsSentBy('PARTA')).toEqual([]);
  });

  it('subPartsOf tags each sub-part clickable iff it is a meshed block', () => {
    const subParts = behavior.subPartsOf('PARTA');
    expect(subParts.map((s) => s.element.id)).toEqual(['PARTA_CHILD', 'PARTA_SENSOR']);
    expect(subParts.find((s) => s.element.id === 'PARTA_CHILD')?.clickable).toBe(true);
    expect(subParts.find((s) => s.element.id === 'PARTA_SENSOR')?.clickable).toBe(false);
    expect(behavior.subPartsOf('PARTB')).toEqual([]);
  });

  it('portsOf / operationsOf / valuesOf read the block extras', () => {
    expect(behavior.portsOf('PARTA')).toEqual([
      { id: 'PORT_A', name: 'outPort', kind: 'ProxyPort', interface: { id: 'IF_A', name: 'WidgetInterface' } },
    ]);
    expect(behavior.operationsOf('PARTA')).toEqual([{ id: 'OP_A', name: 'doThing' }]);
    expect(behavior.valuesOf('PARTA').map((v) => v.name)).toEqual(['mass', 'acceleration', 'force']);
    expect(behavior.portsOf('PARTB')).toEqual([]);
    expect(behavior.operationsOf('nope')).toEqual([]);
  });

  it('messageSequence orders messages and resolves lifelines to leaf block ids', () => {
    const seq = behavior.messageSequence('SEQ_1');
    expect(seq).toEqual([
      { order: 1, name: 'kickoff', sort: 'SynchCall', fromBlock: 'PARTA', toBlock: 'PARTB', signature: { kind: 'operation', id: 'OP_A', name: 'doThing' } },
      { order: 2, name: 'ack', sort: 'AsynchSignal', fromBlock: 'PARTB', toBlock: 'PARTA', signature: { kind: 'signal', id: 'SIG_START', name: 'StartCommand' } },
    ]);
    expect(behavior.messageSequence('nope')).toEqual([]);
  });

  it('activityOutline follows ControlFlow from the initial node, visiting a branch and its merge exactly once', () => {
    const outline = behavior.activityOutline('ACT_1');
    expect(outline.map((n) => n.id)).toEqual(['N_INIT', 'N_A', 'N_B', 'N_C', 'N_FINAL']);
    expect(behavior.activityOutline('nope')).toEqual([]);
  });

  it('transitionsFrom finds outgoing transitions across all state machines', () => {
    expect(behavior.transitionsFrom('ST_ON').map((t) => t.id).sort()).toEqual(['T2', 'T3']);
    expect(behavior.transitionsFrom('ST_DONE')).toEqual([]);
    expect(behavior.transitionsFrom('nope')).toEqual([]);
  });

  it('relatedRequirementsForBehavior: activities return their declared refines', () => {
    expect(relatedRequirementsForBehavior(idx, 'ACT_1')).toEqual([{ id: 'REQ_PT_1', reason: 'refines' }]);
  });

  it('relatedRequirementsForBehavior: state machines use the context block + text-word heuristic', () => {
    const related = relatedRequirementsForBehavior(idx, 'SM_PARTA');
    // PARTA satisfies REQ_PT_1 ("do a thing"), REQ_PT_3 ("fault condition") —
    // only REQ_PT_3's text matches a heuristic word ("fault").
    expect(related).toHaveLength(1);
    expect(related[0]?.id).toBe('REQ_PT_3');
    expect(related[0]?.reason).toContain('fault');
  });

  it('relatedRequirementsForBehavior: unknown id returns []', () => {
    expect(relatedRequirementsForBehavior(idx, 'nope')).toEqual([]);
  });
});

describe('behaviorIndex degrades gracefully when section 6 keys are absent', () => {
  it('every query returns an empty result rather than throwing', () => {
    const idx = buildIndex(loadRealModel());
    const behavior = idx.behavior;
    expect(behavior.stateMachinesFor('VEH')).toEqual([]);
    expect(behavior.activities).toEqual([]);
    expect(behavior.interactions).toEqual([]);
    expect(behavior.interactionsInvolving('VEH')).toEqual([]);
    expect(behavior.signalsReceivedBy('VEH')).toEqual([]);
    expect(behavior.signalsSentBy('VEH')).toEqual([]);
    expect(behavior.subPartsOf('POWERTRAIN')).toEqual([]);
    expect(behavior.portsOf('POWERTRAIN')).toEqual([]);
    expect(behavior.messageSequence('nope')).toEqual([]);
    expect(behavior.activityOutline('nope')).toEqual([]);
    expect(behavior.transitionsFrom('nope')).toEqual([]);
    expect(idx.parametrics).toEqual([]);
    expect(relatedRequirementsForBehavior(idx, 'nope')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Real-data assertions. These only run once the converter has landed
// contract section 6 in data/model.json (checked at collection time below);
// until then they're skipped rather than failing on absent data.
// ---------------------------------------------------------------------------
const realModel = loadRealModel();
const hasBehaviorData = realModel.behavior !== undefined;

describe.skipIf(!hasBehaviorData)('behaviorIndex (real data/model.json)', () => {
  const idx = buildIndex(loadRealModel());
  const behavior = idx.behavior;

  it('SM_VEH has 7 states', () => {
    const sm = behavior.stateMachinesFor('VEH').find((s) => s.id === 'SM_VEH');
    expect(sm?.states).toHaveLength(7);
  });

  it('SEQ_START has 4 messages in HMI -> VCONTROL -> ENERGY -> INVERTER order', () => {
    const seq = behavior.messageSequence('SEQ_START');
    expect(seq).toHaveLength(4);
    expect(seq.map((m) => m.fromBlock)).toEqual(['HMI', 'VCONTROL', 'ENERGY', 'INVERTER']);
  });
});
