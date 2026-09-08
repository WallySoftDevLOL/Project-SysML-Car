"""Shared invariant checks for data/model.json, used by both test_xlsx_to_json.py
(which builds a fresh model) and test_model_json.py (which checks the committed
file). Not a test module itself (no test_ prefix -> pytest ignores it).
"""

from __future__ import annotations

from collections import Counter, defaultdict

EXPECTED_STATS = {
    "requirements": 59,
    "copies": 8,
    "traceRelationships": 207,
    "allRelationships": 271,
    "blocks": 13,
    "flows": 9,
}

EXPECTED_SATISFY_COUNTS = {
    "VEH": 7,
    "POWERTRAIN": 11,
    "INVERTER": 1,
    "ENERGY": 9,
    "BMS": 2,
    "VCONTROL": 11,
    "BRAKES": 5,
    "THERMAL": 4,
    "THERM_CTRL": 1,
    "SENSORS": 4,
    "HMI": 5,
    "CHARGE": 4,
    "DIAG": 4,
}

EXPECTED_FLOW_PAIRS = {
    ("HMI", "VCONTROL"),
    ("SENSORS", "VCONTROL"),
    ("VCONTROL", "POWERTRAIN"),
    ("VCONTROL", "BRAKES"),
    ("ENERGY", "POWERTRAIN"),
    ("ENERGY", "THERMAL"),
    ("CHARGE", "ENERGY"),
    ("DIAG", "VCONTROL"),
    ("INVERTER", "POWERTRAIN"),
}


def assert_acyclic(edges):
    """edges: iterable of (source, target) meaning source -> target."""
    graph = defaultdict(list)
    nodes = set()
    for s, t in edges:
        graph[s].append(t)
        nodes.add(s)
        nodes.add(t)

    WHITE, GRAY, BLACK = 0, 1, 2
    color = {n: WHITE for n in nodes}

    def visit(start):
        stack = [(start, iter(graph[start]))]
        color[start] = GRAY
        while stack:
            node, it = stack[-1]
            advanced = False
            for nxt in it:
                if color[nxt] == GRAY:
                    raise AssertionError(f"DeriveRequirement graph has a cycle involving {node} -> {nxt}")
                if color[nxt] == WHITE:
                    color[nxt] = GRAY
                    stack.append((nxt, iter(graph[nxt])))
                    advanced = True
                    break
            if not advanced:
                color[node] = BLACK
                stack.pop()

    for n in nodes:
        if color[n] == WHITE:
            visit(n)


def check_model_invariants(model: dict, blocks_catalog: list) -> None:
    assert model["stats"] == EXPECTED_STATS, model["stats"]

    elements = model["elements"]
    element_ids = {e["id"] for e in elements}
    elements_by_id = {e["id"]: e for e in elements}

    assert len(element_ids) == len(elements), "element ids must be unique"

    for rel in model["relationships"]:
        assert rel["source"] in element_ids, f"relationship {rel['id']} source {rel['source']!r} missing from elements"
        assert rel["target"] in element_ids, f"relationship {rel['id']} target {rel['target']!r} missing from elements"

    for b in blocks_catalog:
        elem = elements_by_id.get(b["id"])
        assert elem is not None, f"blocks.json id {b['id']!r} missing from elements"
        assert elem["kind"] == "Block", f"{b['id']!r} element kind is {elem['kind']!r}, expected Block"
        assert elem.get("mesh") == b["meshName"], f"{b['id']!r} element missing/mismatched mesh"

    satisfy_counts = Counter(
        rel["source"] for rel in model["relationships"] if rel["type"] == "Satisfy"
    )
    assert dict(satisfy_counts) == EXPECTED_SATISFY_COUNTS

    derive_edges = [
        (rel["source"], rel["target"])
        for rel in model["relationships"]
        if rel["type"] == "DeriveRequirement"
    ]
    assert_acyclic(derive_edges)

    flow_pairs = {(f["source"], f["target"]) for f in model["flows"]}
    assert flow_pairs == EXPECTED_FLOW_PAIRS
    assert len(model["flows"]) == len(EXPECTED_FLOW_PAIRS)
