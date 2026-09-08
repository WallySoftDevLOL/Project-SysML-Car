"""Runs tools/xlsx_to_json.py on the real workbook and checks the result."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from tools.xlsx_to_json import convert, write_model  # noqa: E402

from _model_invariants import check_model_invariants  # noqa: E402

XLSX_PATH = REPO_ROOT / "data" / "source" / "Connected_EV_SysML_Requirements_and_Relationships_v7.xlsx"
BLOCKS_PATH = REPO_ROOT / "data" / "blocks.json"


def _blocks_catalog():
    return json.loads(BLOCKS_PATH.read_text(encoding="utf-8"))


def test_converter_produces_expected_model(tmp_path):
    out_path = tmp_path / "model.json"
    model = convert(XLSX_PATH, BLOCKS_PATH, out_path)
    write_model(model, out_path)

    assert out_path.exists()
    on_disk = json.loads(out_path.read_text(encoding="utf-8"))
    assert on_disk == model

    check_model_invariants(model, _blocks_catalog())


def test_converter_is_deterministic(tmp_path):
    out1 = tmp_path / "model1.json"
    out2 = tmp_path / "model2.json"

    model1 = convert(XLSX_PATH, BLOCKS_PATH, out1)
    write_model(model1, out1)
    model2 = convert(XLSX_PATH, BLOCKS_PATH, out2)
    write_model(model2, out2)

    assert out1.read_bytes() == out2.read_bytes()


def test_meta_source_hash_matches_workbook(tmp_path):
    out_path = tmp_path / "model.json"
    model = convert(XLSX_PATH, BLOCKS_PATH, out_path)

    expected_sha = hashlib.sha256(XLSX_PATH.read_bytes()).hexdigest()
    assert model["meta"]["sourceSha256"] == expected_sha
    assert model["meta"]["schema"] == 1
    assert model["meta"]["converter"] == "tools/xlsx_to_json.py"


def test_output_file_ends_with_newline(tmp_path):
    out_path = tmp_path / "model.json"
    model = convert(XLSX_PATH, BLOCKS_PATH, out_path)
    write_model(model, out_path)

    raw = out_path.read_bytes()
    assert raw.endswith(b"\n")
    assert b"\r\n" not in raw
