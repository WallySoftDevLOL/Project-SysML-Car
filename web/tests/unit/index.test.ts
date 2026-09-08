import { describe, expect, it } from 'vitest';
import { buildIndex } from '../../src/model/index';
import { buildFixtureModel, loadRealModel } from './fixtures';

describe('buildIndex (fixture)', () => {
  const idx = buildIndex(buildFixtureModel());

  it('byId / byKind index every element', () => {
    expect(idx.byId.get('REQ_PT_1')?.name).toBe('Part A Behavior');
    expect(idx.byId.get('nope')).toBeUndefined();
    expect(idx.byKind.get('Requirement')).toHaveLength(5);
    expect(idx.byKind.get('Block')).toHaveLength(5);
  });

  it('out/in and outBy/inBy split relationships by source and target', () => {
    expect(idx.out.get('PARTA')?.map((r) => r.id).sort()).toEqual(['FLOW_REL_1', 'SAT_PARTA'].sort());
    expect(idx.in.get('PARTA')?.map((r) => r.id).sort()).toEqual(['ALLOC_UC_1'].sort());
    expect(idx.in.get('REQ_PT_1')?.map((r) => r.id).sort()).toEqual(
      ['COPY_1', 'REF_CB_1', 'SAT_PARTA', 'TRACE_UC_1', 'VER_TC_1'].sort(),
    );
    expect(idx.outBy('PARTA', 'Satisfy').map((r) => r.target)).toEqual(['REQ_PT_1']);
    expect(idx.inBy('REQ_PT_1', 'Satisfy').map((r) => r.source)).toEqual(['PARTA']);
    expect(idx.outBy('PARTA', 'NoSuchType')).toEqual([]);
    expect(idx.inBy('nope', 'Satisfy')).toEqual([]);
  });

  it('blocks lists only meshed blocks, in hierarchy order (parent before children, grandchild right after its parent)', () => {
    expect(idx.blocks.map((b) => b.id)).toEqual(['ROOT', 'PARTA', 'PARTA_CHILD', 'PARTA_WIDGET', 'PARTB']);
  });

  it('systems / components / tierOf split blocks by tier', () => {
    expect(idx.systems.map((b) => b.id)).toEqual(['ROOT', 'PARTA', 'PARTA_CHILD', 'PARTB']);
    expect(idx.components.map((b) => b.id)).toEqual(['PARTA_WIDGET']);
    expect(idx.tierOf('ROOT')).toBe('system');
    expect(idx.tierOf('PARTA_WIDGET')).toBe('component');
    expect(idx.tierOf('nope')).toBeUndefined();
    expect(idx.tierOf('REQ_PT_1')).toBeUndefined(); // not a Block
  });

  it('categories / categoryOf', () => {
    expect(idx.categories.get('STK')?.level).toBe(0);
    expect(idx.categoryOf('REQ_PT_1')?.id).toBe('PT');
    expect(idx.categoryOf('ROOT')).toBeUndefined(); // blocks don't carry a matching category id
    expect(idx.categoryOf('nope')).toBeUndefined();
  });

  it('flows and hierarchy pass through the model', () => {
    expect(idx.flows).toHaveLength(1);
    expect(idx.flows[0]?.meshName).toBe('FLOW__PARTA__PARTB');
    expect(idx.hierarchy.ROOT).toEqual(['PARTA', 'PARTB']);
  });

  it('parentOf / childrenOf', () => {
    expect(idx.parentOf('PARTA')?.id).toBe('ROOT');
    expect(idx.parentOf('ROOT')).toBeUndefined();
    expect(idx.parentOf('PARTA_WIDGET')?.id).toBe('PARTA');
    expect(idx.childrenOf('ROOT').map((b) => b.id)).toEqual(['PARTA', 'PARTB']);
    expect(idx.childrenOf('PARTA').map((b) => b.id)).toEqual(['PARTA_CHILD', 'PARTA_WIDGET']);
    expect(idx.childrenOf('PARTA_CHILD')).toEqual([]);
    expect(idx.childrenOf('PARTA_WIDGET')).toEqual([]);
  });

  it('requirements(authoritativeOnly) defaults to excluding non-authoritative copies', () => {
    expect(idx.requirements().map((r) => r.id).sort()).toEqual(['REQ_PT_1', 'REQ_PT_2', 'REQ_STK_1', 'REQ_SYS_1']);
    expect(idx.requirements(false)).toHaveLength(5);
  });

  it('displayName: label for blocks, "displayId name" for requirements, name otherwise', () => {
    expect(idx.displayName('PARTA')).toBe('Part A');
    expect(idx.displayName('PARTA_WIDGET')).toBe('Widget'); // component: also uses `label`
    expect(idx.displayName('REQ_PT_1')).toBe('PT-1 Part A Behavior');
    expect(idx.displayName('TC_1')).toBe('Part A Test');
    expect(idx.displayName('nope')).toBe('nope');
  });
});

describe('buildIndex (real data/model.json)', () => {
  const idx = buildIndex(loadRealModel());

  it('indexes all 192 elements and 271 relationships', () => {
    // 168 pre-section-6 elements (unchanged, see tools/xlsx_to_json.py) plus
    // 24 section-6 additions: 10 catalog components (now full data/blocks.json
    // blocks with mesh/color/label -- see docs/model-contract.md section 1),
    // 9 DATA_* payload types, 2 FULL_*_TYPE boundary port types, 3 analysis
    // blocks.
    expect(idx.byId.size).toBe(192);
    let relCount = 0;
    for (const list of idx.out.values()) relCount += list.length;
    expect(relCount).toBe(271);
  });

  it('has exactly the 23 real (meshed) blocks -- 13 systems + 10 components -- in the documented hierarchy order', () => {
    expect(idx.blocks).toHaveLength(23);
    expect(idx.blocks.map((b) => b.id)).toEqual([
      'VEH',
      'POWERTRAIN',
      'INVERTER',
      'MOTOR',
      'ENERGY',
      'BMS',
      'BAT_MODULE',
      'VCONTROL',
      'BRAKES',
      'BRAKE_CTRL',
      'BRAKE_ACT',
      'THERMAL',
      'THERM_CTRL',
      'PUMP',
      'SENSORS',
      'FUSION',
      'WHEEL_SENSOR',
      'HMI',
      'CHARGE',
      'CHARGE_PORT',
      'OBC',
      'DIAG',
      'DIAG_GATEWAY',
    ]);
    // The abstract generalization target VEH_SUBSYSTEM is a Block-kind
    // element with no mesh/parent, and must not show up as a 24th block.
    expect(idx.byId.get('VEH_SUBSYSTEM')?.kind).toBe('Block');
    expect(idx.blocks.some((b) => b.id === 'VEH_SUBSYSTEM')).toBe(false);
  });

  it('systems / components / tierOf split the real 23 blocks 13/10', () => {
    expect(idx.systems).toHaveLength(13);
    expect(idx.components).toHaveLength(10);
    expect(idx.systems.map((b) => b.id)).toContain('VEH');
    expect(idx.components.map((b) => b.id).sort()).toEqual(
      [
        'BAT_MODULE',
        'BRAKE_ACT',
        'BRAKE_CTRL',
        'CHARGE_PORT',
        'DIAG_GATEWAY',
        'FUSION',
        'MOTOR',
        'OBC',
        'PUMP',
        'WHEEL_SENSOR',
      ].sort(),
    );
    expect(idx.tierOf('MOTOR')).toBe('component');
    expect(idx.tierOf('POWERTRAIN')).toBe('system');
    // MOTOR uses its own label (not a `role` fallback) since it's now a full catalog block.
    expect(idx.displayName('MOTOR')).toBe('Traction motor');
  });

  it('requirements(true) excludes the 8 VER copies, matching stats.requirements', () => {
    const model = loadRealModel();
    expect(idx.requirements(true)).toHaveLength(model.stats.requirements);
    expect(idx.requirements(false)).toHaveLength(model.stats.requirements + model.stats.copies);
  });

  it('categoryOf resolves a real requirement to its category', () => {
    expect(idx.categoryOf('REQ_SYS_002')?.id).toBe('SYS');
    expect(idx.categories.get('SYS')?.level).toBe(1);
  });

  it('childrenOf/parentOf match model.hierarchy for POWERTRAIN/INVERTER/MOTOR', () => {
    expect(idx.childrenOf('POWERTRAIN').map((b) => b.id)).toEqual(['INVERTER', 'MOTOR']);
    expect(idx.parentOf('INVERTER')?.id).toBe('POWERTRAIN');
    expect(idx.parentOf('MOTOR')?.id).toBe('POWERTRAIN');
    expect(idx.parentOf('VEH')).toBeUndefined();
  });
});
