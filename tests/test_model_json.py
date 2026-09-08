"""Validates the committed data/model.json against the same invariants used
to check a freshly-generated model. Skips entirely if the file has not been
generated yet (e.g. on a clean checkout before running the converter).
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pytest

from _model_invariants import check_model_invariants

REPO_ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = REPO_ROOT / "data" / "model.json"
BLOCKS_PATH = REPO_ROOT / "data" / "blocks.json"
XLSX_PATH = REPO_ROOT / "data" / "source" / "Connected_EV_SysML_Requirements_and_Relationships_v7.xlsx"


def _load_model():
    if not MODEL_PATH.exists():
        pytest.skip(f"{MODEL_PATH} does not exist yet; run tools/xlsx_to_json.py first")
    return json.loads(MODEL_PATH.read_text(encoding="utf-8"))


def test_committed_model_invariants():
    model = _load_model()
    blocks_catalog = json.loads(BLOCKS_PATH.read_text(encoding="utf-8"))
    check_model_invariants(model, blocks_catalog)


def test_committed_model_is_well_formed_json_with_trailing_newline():
    if not MODEL_PATH.exists():
        pytest.skip(f"{MODEL_PATH} does not exist yet; run tools/xlsx_to_json.py first")
    raw = MODEL_PATH.read_bytes()
    assert raw.endswith(b"\n")
    assert b"\r\n" not in raw


def test_committed_model_source_hash_matches_workbook():
    """data/model.json's meta.sourceSha256 hashes its actual source (the
    groovy model script, since tools/model_script_to_json.py landed) --
    verified in test_model_script_to_json.py. Here we only check the
    companion `workbookSha256` traceability field against the committed
    workbook, which every converter generation (xlsx- or script-based) has
    carried in one meta field or another.
    """
    model = _load_model()
    if not XLSX_PATH.exists():
        pytest.skip("source workbook not present")
    expected_sha = hashlib.sha256(XLSX_PATH.read_bytes()).hexdigest()
    meta = model["meta"]
    actual_sha = meta.get("workbookSha256", meta.get("sourceSha256"))
    assert actual_sha == expected_sha
