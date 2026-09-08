"""Runs tools/model_script_to_json.py on the real model script and checks the
result, including a cross-check against tools/xlsx_to_json.py (the workbook
converter it replaces as data/model.json's producer): every section-2 field
must come out byte-identical between the two, independently-implemented
converters, once the additive section-6 keys/fields are stripped.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from tools.model_script_to_json import convert, write_model  # noqa: E402
from tools.xlsx_to_json import convert as xlsx_convert  # noqa: E402

from _model_invariants import EXPECTED_SECTION6_STATS, check_model_invariants  # noqa: E402

GROOVY_PATH = REPO_ROOT / "data" / "source" / "Connected_EV_COMPLETE_SYSML_ALL_9_FAMILIES_v7_IMPORT_SAFE.groovy"
XLSX_PATH = REPO_ROOT / "data" / "source" / "Connected_EV_SysML_Requirements_and_Relationships_v7.xlsx"
BLOCKS_PATH = REPO_ROOT / "data" / "blocks.json"

# Element fields contract section 6 adds on top of a Block that already
# existed in the pre-section-6 model (the 13 clickable blocks): strip these
# before comparing an element to tools/xlsx_to_json.py's output.
ADDITIVE_ELEMENT_KEYS = {"role", "subParts", "operations", "receptions", "values", "ports"}

# Top-level keys contract section 6 adds; tools/xlsx_to_json.py's output has none of these.
ADDITIVE_TOP_LEVEL_KEYS = {"behavior", "parametrics", "signals", "composition"}

# meta fields that legitimately differ between the two converters (different
# source file, different hash, different converter name) or that only one emits.
ADDITIVE_META_KEYS = {"workbookSha256"}


def _blocks_catalog():
    return json.loads(BLOCKS_PATH.read_text(encoding="utf-8"))


def _script_model(tmp_path, name="model.json"):
    out_path = tmp_path / name
    model = convert(GROOVY_PATH, BLOCKS_PATH, XLSX_PATH, out_path)
    write_model(model, out_path)
    return model, out_path


def _strip_additive(model: dict) -> dict:
    stripped = {k: v for k, v in model.items() if k not in ADDITIVE_TOP_LEVEL_KEYS}
    stripped["meta"] = {k: v for k, v in model["meta"].items() if k not in ADDITIVE_META_KEYS}
    stripped["elements"] = [
        {k: v for k, v in el.items() if k not in ADDITIVE_ELEMENT_KEYS} for el in model["elements"]
    ]
    # Section 6 adds stats keys too; compare only the section-2 stats subset here.
    stripped["stats"] = {k: v for k, v in model["stats"].items() if k not in EXPECTED_SECTION6_STATS}
    return stripped


def test_converter_produces_expected_model(tmp_path):
    model, out_path = _script_model(tmp_path)
    assert out_path.exists()
    on_disk = json.loads(out_path.read_text(encoding="utf-8"))
    assert on_disk == model

    check_model_invariants(model, _blocks_catalog())


def test_converter_is_deterministic(tmp_path):
    _, out1 = _script_model(tmp_path, "model1.json")
    _, out2 = _script_model(tmp_path, "model2.json")
    assert out1.read_bytes() == out2.read_bytes()


def test_output_file_ends_with_newline(tmp_path):
    _, out_path = _script_model(tmp_path)
    raw = out_path.read_bytes()
    assert raw.endswith(b"\n")
    assert b"\r\n" not in raw


def test_meta(tmp_path):
    model, _ = _script_model(tmp_path)
    meta = model["meta"]
    assert meta["schema"] == 1
    assert meta["converter"] == "tools/model_script_to_json.py"
    assert meta["sourceFile"] == "data/source/Connected_EV_COMPLETE_SYSML_ALL_9_FAMILIES_v7_IMPORT_SAFE.groovy"
    assert meta["sourceSha256"] == hashlib.sha256(GROOVY_PATH.read_bytes()).hexdigest()
    assert meta["workbookSha256"] == hashlib.sha256(XLSX_PATH.read_bytes()).hexdigest()


# ---------------------------------------------------------------------------
# Cross-check against tools/xlsx_to_json.py: requirement 1 of the task that
# introduced this converter is that data/model.json stays a strict superset
# of what the workbook converter produces.
# ---------------------------------------------------------------------------


def test_cross_check_against_xlsx_converter(tmp_path):
    script_model, _ = _script_model(tmp_path)
    xlsx_model = xlsx_convert(XLSX_PATH, BLOCKS_PATH, tmp_path / "xlsx_model.json")

    stripped_script = _strip_additive(script_model)
    stripped_xlsx = _strip_additive(xlsx_model)  # no-op for xlsx_model, but keeps the comparison symmetric

    for key in ("categories", "flows", "hierarchy", "relationships"):
        assert stripped_script[key] == stripped_xlsx[key], key

    assert stripped_script["stats"] == stripped_xlsx["stats"]

    xlsx_elements_by_id = {e["id"]: e for e in stripped_xlsx["elements"]}
    script_elements_by_id = {e["id"]: e for e in stripped_script["elements"]}
    missing = set(xlsx_elements_by_id) - set(script_elements_by_id)
    assert not missing, f"elements present in the xlsx converter's output but missing from the script converter: {sorted(missing)}"
    mismatched = [
        eid
        for eid, xlsx_el in xlsx_elements_by_id.items()
        if script_elements_by_id[eid] != xlsx_el
    ]
    assert not mismatched, f"element field mismatch vs xlsx converter for: {sorted(mismatched)}"

    # The script converter must add elements (sub-parts, DATA_*, FULL_*_TYPE,
    # analysis blocks) on top -- never fewer, never a different total by
    # coincidence -- confirming "superset" is a real (not vacuous) claim.
    # (The 10 blocks.json components used to be part of this "extra" set --
    # they were script-only sub-parts before the catalog grew to 23 blocks;
    # now both converters merge them in directly, so the count dropped from
    # 24 to 14.)
    extra_ids = set(script_elements_by_id) - set(xlsx_elements_by_id)
    assert len(extra_ids) == 14, sorted(extra_ids)


# ---------------------------------------------------------------------------
# Contract section 6 shape checks against the real script.
# ---------------------------------------------------------------------------


def test_state_machine_sm_veh(tmp_path):
    model, _ = _script_model(tmp_path)
    sm_veh = next(sm for sm in model["behavior"]["stateMachines"] if sm["id"] == "SM_VEH")
    assert sm_veh["context"] == "VEH"
    assert len(sm_veh["states"]) == 7
    assert len(sm_veh["transitions"]) == 7
    named_triggers = [t["trigger"]["name"] for t in sm_veh["transitions"] if "trigger" in t]
    assert set(named_triggers) == {"StartCommand", "VehicleReady", "TorqueCommand", "StopCommand", "FaultDetected"}
    # Exactly one transition (the pseudostate -> Off initial edge) has no trigger.
    assert sum(1 for t in sm_veh["transitions"] if "trigger" not in t) == 1


def test_interaction_seq_start(tmp_path):
    model, _ = _script_model(tmp_path)
    seq = next(it for it in model["behavior"]["interactions"] if it["id"] == "SEQ_START")
    assert [m["name"] for m in sorted(seq["messages"], key=lambda m: m["order"])] == [
        "startVehicle",
        "PowerEnable",
        "PowerAvailable",
        "TorqueCommand",
    ]
    lifeline_block = {ll["id"]: ll["block"] for ll in seq["lifelines"]}
    assert lifeline_block == {"LL_HMI": "HMI", "LL_CTRL": "VCONTROL", "LL_ENERGY": "ENERGY", "LL_INV": "INVERTER"}


def test_force_analysis_parametric(tmp_path):
    model, _ = _script_model(tmp_path)
    force = next(p for p in model["parametrics"] if p["id"] == "FORCE_ANALYSIS")
    assert force["expression"] == "F = m * a"
    assert force["output"] == "F"
    defaults = {p["parameter"]: p["default"] for p in force["parameters"]}
    assert defaults["m"] == 1800
    assert defaults["a"] == 4.0
    assert defaults["F"] is None


def test_range_analysis_refines_stk_002(tmp_path):
    """Deliberate choice (see report): refines climbs the DeriveRequirement
    chain to the root (mission-level) requirement rather than stopping at
    the ConstraintBlock's direct Refine target (REQ_PERF_003), because
    web/tests/unit/parametrics.test.ts's real-data assertion requires
    RANGE_ANALYSIS's threshold to resolve to REQ_STK_002 specifically, and
    REQ_PERF_003's own acceptance text also parses as a (different-id)
    numeric threshold, which would otherwise shadow it.
    """
    model, _ = _script_model(tmp_path)
    range_analysis = next(p for p in model["parametrics"] if p["id"] == "RANGE_ANALYSIS")
    assert range_analysis["refines"] == ["REQ_STK_002"]


def test_every_composition_id_exists_and_has_parent(tmp_path):
    model, _ = _script_model(tmp_path)
    element_ids = {e["id"] for e in model["elements"]}
    elements_by_id = {e["id"]: e for e in model["elements"]}

    all_children = set()
    for parent_id, children in model["composition"].items():
        assert parent_id in element_ids, parent_id
        for child_id in children:
            assert child_id in element_ids, child_id
            all_children.add(child_id)

    for child_id in all_children:
        assert "parent" in elements_by_id[child_id], f"{child_id} has no parent field"

    assert "FLEET" not in element_ids
    assert "FLEET" not in model["composition"]


def test_stats_section6(tmp_path):
    model, _ = _script_model(tmp_path)
    stats = model["stats"]
    for key, expected in EXPECTED_SECTION6_STATS.items():
        assert stats[key] == expected, key


def test_run_twice_identical_bytes(tmp_path):
    _, out1 = _script_model(tmp_path, "a.json")
    _, out2 = _script_model(tmp_path, "b.json")
    assert out1.read_bytes() == out2.read_bytes()


def test_inspect_mode_does_not_require_blocks_or_out(capsys):
    from tools.model_script_to_json import main

    rc = main(["--inspect", str(GROOVY_PATH)])
    assert rc == 0
    out = capsys.readouterr().out
    assert "operations: 642" in out
    assert "Requirement: 67" in out
