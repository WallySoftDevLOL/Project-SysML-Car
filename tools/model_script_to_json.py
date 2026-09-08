"""Convert the SysML EV Cameo model script into data/model.json.

Reads `data/source/Connected_EV_COMPLETE_SYSML_ALL_9_FAMILIES_v7_IMPORT_SAFE.groovy`
(a `modelScript('''<JSON>''')` wrapper around one JSON document of
`{ source_namespace, operations[], diagrams[] }`) plus the hand-authored
`data/blocks.json` catalog, and emits a single deterministic `data/model.json`
following docs/model-contract.md sections 2 and 6.

This replaces tools/xlsx_to_json.py as the producer of data/model.json. Every
key documented in contract section 2 (categories/elements/relationships/
flows/hierarchy/stats, minus meta) is reproduced byte-identical to what
tools/xlsx_to_json.py derives from the companion workbook -- see
tests/test_model_script_to_json.py's cross-check test. Contract section 6
adds behavior/parametrics/signals/composition and a handful of optional
Block extras on top.

Usage:
    python tools/model_script_to_json.py <groovy> <blocks.json> <xlsx> <out.json>
    python tools/model_script_to_json.py --inspect <groovy>
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

MODEL_SCRIPT_RE = re.compile(r"modelScript\('''(.*)'''\)", re.S)

# ---------------------------------------------------------------------------
# Tables shared with tools/xlsx_to_json.py (kept independent/duplicated on
# purpose: this converter must derive data/model.json from the script alone,
# without importing the xlsx converter, so the cross-check test is a real
# check of two independent implementations agreeing).
# ---------------------------------------------------------------------------
CATEGORY_DEFS = [
    {"id": "STK", "name": "Stakeholder / Mission", "plain": "What customers and the mission need", "level": 0},
    {"id": "SYS", "name": "System", "plain": "What the car must do", "level": 1},
    {"id": "PERF", "name": "Performance", "plain": "How well it must do it", "level": 1},
    {"id": "IF", "name": "Interface", "plain": "How parts talk to each other", "level": 1},
    {"id": "PT", "name": "Subsystem - Powertrain", "plain": "What the powertrain must do", "level": 2, "block": "POWERTRAIN"},
    {"id": "BAT", "name": "Subsystem - Energy Storage", "plain": "What the battery pack must do", "level": 2, "block": "ENERGY"},
    {"id": "CTRL", "name": "Subsystem - Vehicle Control", "plain": "What the vehicle controller must do", "level": 2, "block": "VCONTROL"},
    {"id": "BRK", "name": "Subsystem - Brake System", "plain": "What the brakes must do", "level": 2, "block": "BRAKES"},
    {"id": "THM", "name": "Subsystem - Thermal Management", "plain": "What the cooling system must do", "level": 2, "block": "THERMAL"},
    {"id": "SNS", "name": "Subsystem - Vehicle Sensors", "plain": "What the sensors must do", "level": 2, "block": "SENSORS"},
    {"id": "HMI", "name": "Subsystem - Driver Interface", "plain": "What the driver interface must do", "level": 2, "block": "HMI"},
    {"id": "CHG", "name": "Subsystem - Charging", "plain": "What the charging system must do", "level": 2, "block": "CHARGE"},
    {"id": "SRV", "name": "Subsystem - Service / Diagnostics", "plain": "What service and diagnostics must do", "level": 2, "block": "DIAG"},
    {"id": "VER", "name": "Verification View Copy", "plain": "Copies kept for the verification view", "level": 3},
]
CATEGORY_IDS = {c["id"] for c in CATEGORY_DEFS}

KNOWN_ABSTRACT_BLOCKS = {"VEH_SUBSYSTEM"}

# Relationship kinds that land in stats.traceRelationships (mirrors the
# workbook's Requirement_Relationships sheet, a subset of All_Relationships).
TRACE_RELATIONSHIP_TYPES = {"Satisfy", "Verify", "DeriveRequirement", "Copy", "Refine", "Trace"}

# Relationship kinds whose Source/Target are port ids that must be lifted to
# their owning block id for the top-level source/target fields.
PORT_LEVEL_KINDS = {"Assembly", "Delegation", "ItemFlow"}

# Root-level blocks (and everything they own) excluded from the output
# entirely per contract section 6.
EXCLUDED_ROOT_BLOCKS = {"FLEET"}

# Units are not present in the script; keyed by ValueProperty name (contract section 6).
UNIT_HINTS = {
    "mass": "kg",
    "acceleration": "m/s^2",
    "tractiveForce": "N",
    "forceInput": "N",
    "targetSpeed": "m/s",
    "conversionEfficiency": "ratio",
    "electricalPower": "W",
    "usableEnergy": "kWh",
    "energyConsumption": "kWh/km",
    "estimatedRange": "km",
    "stateOfChargePercent": "%",
    "vehicleSpeedKph": "km/h",
}

_WORD_RE = re.compile(r"[A-Z][a-z0-9]*|[a-z0-9]+")


def camel_words(text: str) -> list[str]:
    return _WORD_RE.findall(text or "")


def item_label(item_type: str) -> str:
    """'TorqueCommandData' -> 'Torque command' (drop trailing 'Data' word)."""
    words = camel_words(item_type)
    if words and words[-1] == "Data":
        words = words[:-1]
    if not words:
        return item_type
    return " ".join([words[0]] + [w.lower() for w in words[1:]])


def title_case_camel(text: str) -> str:
    """'startVehicle' -> 'Start Vehicle'."""
    words = camel_words(text)
    return " ".join(w[:1].upper() + w[1:] for w in words)


def strip_handle(ref):
    if ref is None:
        return None
    if isinstance(ref, str) and ref.startswith("handle:"):
        return ref[len("handle:") :]
    return ref


def parse_number(raw):
    """'1800' -> 1800, '4.0' -> 4.0, 'false' / None -> None (not numeric)."""
    if raw is None:
        return None
    text = str(raw).strip()
    if re.fullmatch(r"-?\d+", text):
        return int(text)
    try:
        return float(text)
    except ValueError:
        return None


_DOC_RE = re.compile(r"^Rationale:\s*(.*?)\s*Acceptance:\s*(.*)$", re.S)


def parse_rationale_acceptance(documentation):
    """'Rationale: X. Acceptance: Y.' -> (X., Y.); anything else -> (None, None)."""
    if not documentation:
        return None, None
    match = _DOC_RE.match(documentation.strip())
    if not match:
        return None, None
    return match.group(1).strip(), match.group(2).strip()


def extract_script_json(groovy_path: Path) -> dict:
    text = groovy_path.read_text(encoding="utf-8")
    match = MODEL_SCRIPT_RE.search(text)
    if not match:
        raise SystemExit(f"Could not find a modelScript('''...''') block in {groovy_path}")
    return json.loads(match.group(1))


# ---------------------------------------------------------------------------
# Conversion
# ---------------------------------------------------------------------------


def convert(groovy_path: Path, blocks_path: Path, xlsx_path: Path, out_path: Path) -> dict:
    script = extract_script_json(groovy_path)
    ops = script["operations"]

    blocks_catalog = json.loads(blocks_path.read_text(encoding="utf-8"))
    blocks_by_id = {b["id"]: b for b in blocks_catalog}

    by_op: dict[str, list[dict]] = defaultdict(list)
    for op in ops:
        by_op[op["op"]].append(op)

    element_ops = {op["external_id"]: op for op in by_op["element"]}

    def kind_of(eid):
        op = element_ops.get(eid)
        if op is None:
            raise SystemExit(f"Reference to unknown element id {eid!r}")
        return op["kind"]

    def name_of(eid):
        op = element_ops.get(eid)
        if op is None:
            raise SystemExit(f"Reference to unknown element id {eid!r}")
        return op["name"]

    def owner_of(eid):
        return strip_handle(element_ops[eid].get("owner"))

    def type_ref_of(eid):
        return strip_handle(element_ops[eid].get("type_ref"))

    # ----------------------------------------------------------- Requirements
    requirements_by_id: dict[str, dict] = {}
    for op in by_op["element"]:
        if op["kind"] != "Requirement":
            continue
        display_id = op["requirement_id"]
        category_id = display_id.split("-", 1)[0]
        if category_id not in CATEGORY_IDS:
            raise SystemExit(
                f"Requirement {op['external_id']!r} has displayId {display_id!r} whose prefix "
                f"{category_id!r} is not a known category id; update CATEGORY_DEFS."
            )
        rationale, acceptance = parse_rationale_acceptance(op.get("documentation"))
        rid = op["external_id"]
        requirements_by_id[rid] = {
            "id": rid,
            "kind": "Requirement",
            "displayId": display_id,
            "category": category_id,
            "name": op["name"],
            "text": op["requirement_text"],
            "rationale": rationale,
            "acceptance": acceptance,
            "authoritative": category_id != "VER",
            "owner": strip_handle(op["owner"]),
        }

    for op in by_op["relationship"]:
        if op["kind"] != "Copy":
            continue
        copy_id, master_id = strip_handle(op["source"]), strip_handle(op["target"])
        if copy_id not in requirements_by_id:
            raise SystemExit(f"Copy relationship {op['external_id']!r} source {copy_id!r} is not a Requirement")
        requirements_by_id[copy_id]["copyOf"] = master_id

    # PartProperty-derived composition (contract section 6), used both for
    # `composition`/subParts and to lift a port's owner up to the nearest
    # data/blocks.json block (matching tools/xlsx_to_json.py's
    # PORT_OWNER_PREFIX behaviour, e.g. MOTOR_POWER -> POWERTRAIN, since
    # MOTOR is a new sub-part block the workbook never had a slot for).
    composition: dict[str, list[str]] = defaultdict(list)
    role_of: dict[str, str] = {}
    parent_of_subpart: dict[str, str] = {}
    for op in by_op["element"]:
        if op["kind"] != "PartProperty":
            continue
        owner = owner_of(op["external_id"])
        if owner in EXCLUDED_ROOT_BLOCKS:
            continue
        type_id = type_ref_of(op["external_id"])
        composition[owner].append(type_id)
        role_of[type_id] = op["name"]
        parent_of_subpart[type_id] = owner
    for children in composition.values():
        children.sort()

    def lift_to_catalog_block(raw_owner: str) -> str:
        """Nearest data/blocks.json ancestor of `raw_owner`, climbing the
        PartProperty composition chain (raw_owner itself if already a
        catalog block)."""
        seen = set()
        current = raw_owner
        while current not in blocks_by_id:
            if current in seen:
                raise SystemExit(f"Cycle lifting {raw_owner!r} to a catalog block")
            seen.add(current)
            nxt = parent_of_subpart.get(current)
            if nxt is None:
                raise SystemExit(f"Cannot lift {raw_owner!r} (via {current!r}) to a data/blocks.json block")
            current = nxt
        return current

    # -------------------------------------------------- Relationships/flows
    relationships: list[dict] = []
    flows_by_connector: dict[str, dict] = {}

    # connector external_id -> its own kind (Assembly/Delegation), needed to
    # decide which ItemFlow rows become a block-to-block `flows` entry.
    connector_kind = {op["external_id"]: op["kind"] for op in by_op["connector"]}

    def lift_path(path: list[str]) -> str:
        """Owning (catalog) block of a port/part-property path: the raw
        `owner` of the last id in the path, lifted to the nearest
        data/blocks.json block (e.g. ["PT_INV", "INV_MOTOR"]'s owner MOTOR
        lifts to POWERTRAIN), mirroring tools/xlsx_to_json.py's
        PORT_OWNER_PREFIX lift for the pre-section-6 relationship shape."""
        return lift_to_catalog_block(owner_of(path[-1]))

    for op in by_op["relationship"]:
        entry = {"id": op["external_id"], "type": op["kind"], "source": strip_handle(op["source"]), "target": strip_handle(op["target"])}
        relationships.append(entry)

    for op in by_op["connector"]:
        source_block = lift_path(op["source_path"])
        target_block = lift_path(op["target_path"])
        relationships.append(
            {
                "id": op["external_id"],
                "type": op["kind"],
                "source": source_block,
                "target": target_block,
                "extra": {"sourcePort": op["source_path"][-1], "targetPort": op["target_path"][-1]},
            }
        )

    for op in by_op["item_flow"]:
        source_block = lift_path(op["source_path"])
        target_block = lift_path(op["target_path"])
        item_ref = strip_handle(op["conveyed_items"][0])
        item = name_of(item_ref)
        connector_id = strip_handle(op["connector"])
        entry = {
            "id": op["external_id"],
            "type": "ItemFlow",
            "source": source_block,
            "target": target_block,
            "extra": {
                "sourcePort": op["source_path"][-1],
                "targetPort": op["target_path"][-1],
                "item": item,
                "connector": connector_id,
            },
        }
        relationships.append(entry)
        if connector_kind.get(connector_id) == "Assembly":
            flows_by_connector[connector_id] = {
                "id": connector_id,
                "source": source_block,
                "target": target_block,
                "item": item,
                "label": item_label(item),
                "meshName": f"FLOW__{source_block}__{target_block}",
            }

    for op in by_op["binding"]:
        source_role = strip_handle(op["source"]["role"])
        target_role = strip_handle(op["target"]["role"])
        target_param = strip_handle(op["target"]["parameter"])
        relationships.append(
            {
                "id": op["external_id"],
                "type": "BindingConnector",
                "source": source_role,
                "target": f"{target_role} / {target_param}",
            }
        )

    relationships_sorted = sorted(relationships, key=lambda r: r["id"])
    flows = sorted(flows_by_connector.values(), key=lambda f: f["id"])

    # ---------------------------------------------------- Generic harvesting
    # Every id referenced as a relationship/connector/item_flow/binding
    # endpoint becomes a candidate element (mirrors tools/xlsx_to_json.py's
    # source/target harvesting from the All_Relationships sheet).
    harvest: dict[str, tuple[str, str]] = {}

    def note(eid, raw_kind, name):
        if eid in harvest and harvest[eid] != (raw_kind, name):
            raise SystemExit(f"Id {eid!r} harvested with two different (kind, name) pairs: {harvest[eid]!r} vs {(raw_kind, name)!r}")
        harvest[eid] = (raw_kind, name)

    for op in by_op["relationship"]:
        for ref in (op["source"], op["target"]):
            eid = strip_handle(ref)
            if eid == "$root":
                continue
            note(eid, kind_of(eid), name_of(eid))

    for op in by_op["connector"]:
        for path in (op["source_path"], op["target_path"]):
            port_id = path[-1]
            note(port_id, kind_of(port_id), name_of(port_id))

    for op in by_op["item_flow"]:
        for path in (op["source_path"], op["target_path"]):
            port_id = path[-1]
            note(port_id, kind_of(port_id), name_of(port_id))

    for op in by_op["binding"]:
        source_role = strip_handle(op["source"]["role"])
        note(source_role, "Binding Endpoint", name_of(source_role))
        target_role = strip_handle(op["target"]["role"])
        target_param = strip_handle(op["target"]["parameter"])
        compound_id = f"{target_role} / {target_param}"
        compound_name = f"{name_of(target_role)} / {name_of(target_param)}"
        harvest[compound_id] = ("Binding Endpoint", compound_name)

    old_elements: dict[str, dict] = dict(requirements_by_id)
    for eid, (raw_kind, name) in harvest.items():
        if eid in requirements_by_id:
            continue  # Requirements are built with full fidelity above; don't clobber with the generic branch.
        if raw_kind == "Block":
            if eid in blocks_by_id:
                b = blocks_by_id[eid]
                old_elements[eid] = {
                    "id": eid,
                    "kind": "Block",
                    "name": b["name"],
                    "label": b["label"],
                    "blurb": b["blurb"],
                    "category": b["category"],
                    "mesh": b["meshName"],
                    "parent": b["parentId"],
                    "color": b["color"],
                    "alpha": b["alpha"],
                    "explode": b["explode"],
                }
            elif eid in KNOWN_ABSTRACT_BLOCKS:
                old_elements[eid] = {"id": eid, "kind": "Block", "name": name, "abstract": True}
            else:
                raise SystemExit(
                    f"Block {eid!r} is referenced by a relationship but is missing from data/blocks.json "
                    "(and is not a known abstract block)."
                )
        elif raw_kind in ("ProxyPort", "FullPort"):
            owner_block = lift_to_catalog_block(owner_of(eid))
            old_elements[eid] = {"id": eid, "kind": "Port", "name": name, "owner": owner_block, "portKind": raw_kind}
        elif raw_kind == "Binding Endpoint":
            old_elements[eid] = {"id": eid, "kind": "BindingEndpoint", "name": name}
        elif raw_kind == "ModelLibrary":
            old_elements[eid] = {"id": eid, "kind": "Package", "name": name}
        else:
            old_elements[eid] = {"id": eid, "kind": raw_kind, "name": name}

    missing_catalog_blocks = set(blocks_by_id) - {
        eid for eid, el in old_elements.items() if el.get("kind") == "Block" and el.get("mesh")
    }
    if missing_catalog_blocks:
        raise SystemExit(f"blocks.json id(s) never appear in the script: {sorted(missing_catalog_blocks)}")

    # ------------------------------------------------- New section-6 blocks
    new_block_ids: set[str] = set()
    all_block_ids = {op["external_id"] for op in by_op["element"] if op["kind"] == "Block"}
    subpart_only_ids = {tid for lst in composition.values() for tid in lst if tid not in blocks_by_id}
    for tid in sorted(subpart_only_ids):
        op = element_ops[tid]
        old_elements[tid] = {
            "id": tid,
            "kind": "Block",
            "name": op["name"],
            "parent": parent_of_subpart[tid],
            "role": role_of[tid],
        }
        new_block_ids.add(tid)

    def block_category_flag(eid: str) -> str:
        if eid.startswith("DATA_"):
            return "Data"
        if eid.startswith("FULL_") and eid.endswith("_TYPE"):
            return "PortType"
        return "Analysis"

    non_composition_new_ids = sorted(
        all_block_ids
        - set(blocks_by_id)
        - subpart_only_ids
        - KNOWN_ABSTRACT_BLOCKS
        - EXCLUDED_ROOT_BLOCKS
    )
    for eid in non_composition_new_ids:
        op = element_ops[eid]
        old_elements[eid] = {
            "id": eid,
            "kind": "Block",
            "name": op["name"],
            "abstract": False,
            "category": block_category_flag(eid),
        }
        new_block_ids.add(eid)

    # ---------------------------------------------- Block extras (section 6)
    extras_eligible = set(blocks_by_id) | subpart_only_ids

    operations_by_owner: dict[str, list[dict]] = defaultdict(list)
    for op in by_op["element"]:
        if op["kind"] != "Operation":
            continue
        owner = owner_of(op["external_id"])
        operations_by_owner[owner].append({"id": op["external_id"], "name": op["name"]})

    receptions_by_owner: dict[str, list[dict]] = defaultdict(list)
    for op in by_op["element"]:
        if op["kind"] != "Reception":
            continue
        owner = owner_of(op["external_id"])
        receptions_by_owner[owner].append(
            {"id": op["external_id"], "name": op["name"], "signal": type_ref_of(op["external_id"])}
        )

    values_by_owner: dict[str, list[dict]] = defaultdict(list)
    for op in by_op["element"]:
        if op["kind"] != "ValueProperty":
            continue
        owner = owner_of(op["external_id"])
        type_name = name_of(type_ref_of(op["external_id"]))
        values_by_owner[owner].append(
            {
                "id": op["external_id"],
                "name": op["name"],
                "default": parse_number(op.get("default_value")),
                "type": type_name,
            }
        )

    ports_by_owner: dict[str, list[dict]] = defaultdict(list)
    for op in by_op["element"]:
        if op["kind"] not in ("ProxyPort", "FullPort"):
            continue
        owner = owner_of(op["external_id"])
        iface_id = type_ref_of(op["external_id"])
        ports_by_owner[owner].append(
            {
                "id": op["external_id"],
                "name": op["name"],
                "kind": op["kind"],
                "interface": {"id": iface_id, "name": name_of(iface_id)},
            }
        )

    for block_id in extras_eligible:
        elem = old_elements.get(block_id)
        if elem is None:
            continue  # shouldn't happen: every catalog/sub-part block is in old_elements
        role = role_of.get(block_id)
        if role is not None and "role" not in elem:
            elem["role"] = role
        sub_ids = composition.get(block_id)
        if sub_ids:
            elem["subParts"] = sorted(sub_ids)
        ops_list = sorted(operations_by_owner.get(block_id, []), key=lambda o: o["id"])
        if ops_list:
            elem["operations"] = ops_list
        rec_list = sorted(receptions_by_owner.get(block_id, []), key=lambda r: r["id"])
        if rec_list:
            elem["receptions"] = rec_list
        val_list = sorted(values_by_owner.get(block_id, []), key=lambda v: v["id"])
        if val_list:
            elem["values"] = val_list
        port_list = sorted(ports_by_owner.get(block_id, []), key=lambda p: p["id"])
        if port_list:
            elem["ports"] = port_list

    elements = sorted(old_elements.values(), key=lambda e: e["id"])

    # ------------------------------------------------------------ Categories
    categories = sorted(CATEGORY_DEFS, key=lambda c: (c["level"], c["id"]))

    hierarchy: dict[str, list[str]] = {}
    for b in blocks_catalog:
        if b["parentId"] is not None:
            hierarchy.setdefault(b["parentId"], []).append(b["id"])

    # --------------------------------------------------------------- Signals
    signals = sorted(
        [{"id": op["external_id"], "name": op["name"]} for op in by_op["element"] if op["kind"] == "Signal"],
        key=lambda s: s["id"],
    )

    # ------------------------------------------------------------ Behavior
    def derive_type_ref(eid):
        return type_ref_of(eid)

    # -- state machines
    vertices_by_region: dict[str, list[dict]] = defaultdict(list)
    for op in by_op["vertex"]:
        vertices_by_region[strip_handle(op["region"])].append(op)
    transitions_by_region: dict[str, list[dict]] = defaultdict(list)
    for op in by_op["transition"]:
        transitions_by_region[strip_handle(op["region"])].append(op)

    VERTEX_KIND_MAP = {"pseudostate": "initial", "state": "state", "final_state": "final"}

    state_machines = []
    for sm_op in by_op["state_machine"]:
        sm_id = sm_op["external_id"]
        region_op = next(r for r in by_op["region"] if strip_handle(r["state_machine"]) == sm_id)
        region_id = region_op["external_id"]
        states = []
        for v in vertices_by_region.get(region_id, []):
            vkind = v["vertex"]["kind"]
            states.append({"id": v["external_id"], "name": v["name"], "kind": VERTEX_KIND_MAP[vkind]})
        states.sort(key=lambda s: s["id"])
        transitions = []
        for t in transitions_by_region.get(region_id, []):
            entry = {"id": t["external_id"], "source": strip_handle(t["source"]), "target": strip_handle(t["target"])}
            trigger = t.get("trigger")
            if trigger and trigger.get("kind") == "signal":
                sig_id = strip_handle(trigger["signal"])
                entry["trigger"] = {"kind": "signal", "id": sig_id, "name": name_of(sig_id)}
            transitions.append(entry)
        transitions.sort(key=lambda t: t["id"])
        state_machines.append(
            {
                "id": sm_id,
                "name": sm_op["name"],
                "context": strip_handle(sm_op["context"]),
                "states": states,
                "transitions": transitions,
            }
        )
    state_machines.sort(key=lambda sm: sm["id"])

    # -- activities
    ACT_NODE_KIND_MAP = {"initial": "initial", "opaque_action": "action", "call_behavior": "call", "activity_final": "final"}

    nodes_by_activity: dict[str, list[dict]] = defaultdict(list)
    for op in by_op["activity_node"]:
        nodes_by_activity[strip_handle(op["activity"])].append(op)
    edges_by_activity: dict[str, list[dict]] = defaultdict(list)
    for op in by_op["activity_edge"]:
        edges_by_activity[strip_handle(op["activity"])].append(op)

    # Requirement ids refined by an Operation, keyed by that Operation's name
    # title-cased (contract section 6: "if derivable via Refine relationships
    # whose source is an Operation with matching name, else []").
    op_title_to_reqs: dict[str, list[str]] = defaultdict(list)
    for op in by_op["relationship"]:
        if op["kind"] != "Refine":
            continue
        source_id = strip_handle(op["source"])
        if kind_of(source_id) != "Operation":
            continue
        title = title_case_camel(name_of(source_id))
        op_title_to_reqs[title].append(strip_handle(op["target"]))
    for reqs in op_title_to_reqs.values():
        reqs.sort()

    activities = []
    for act_op in by_op["activity"]:
        act_id = act_op["external_id"]
        nodes = []
        for n in nodes_by_activity.get(act_id, []):
            nkind = ACT_NODE_KIND_MAP[n["node"]["kind"]]
            entry = {"id": n["external_id"], "name": n["name"], "kind": nkind}
            if nkind == "action":
                entry["body"] = n["node"].get("body", "")
            if nkind == "call":
                entry["calls"] = strip_handle(n["node"]["activity"])
            nodes.append(entry)
        nodes.sort(key=lambda n: n["id"])
        edges = [
            {"id": e["external_id"], "source": strip_handle(e["source"]), "target": strip_handle(e["target"]), "kind": e["kind"]}
            for e in edges_by_activity.get(act_id, [])
        ]
        edges.sort(key=lambda e: e["id"])
        activities.append(
            {
                "id": act_id,
                "name": act_op["name"],
                "refines": op_title_to_reqs.get(act_op["name"], []),
                "nodes": nodes,
                "edges": edges,
            }
        )
    activities.sort(key=lambda a: a["id"])

    # -- interactions
    def resolve_lifeline_block(represented_path: list[str]) -> str:
        last = strip_handle(represented_path[-1])
        return type_ref_of(last)

    occurrence_ops = {op["external_id"]: op for op in by_op["occurrence"]}

    interactions = []
    for it_op in by_op["interaction"]:
        it_id = it_op["external_id"]
        lifeline_ops = [ll for ll in by_op["lifeline"] if strip_handle(ll["interaction"]) == it_id]
        lifelines = [
            {"id": ll["external_id"], "name": ll["name"], "block": resolve_lifeline_block(ll["represented_path"])}
            for ll in lifeline_ops
        ]
        lifelines.sort(key=lambda ll: ll["id"])

        message_ops = [m for m in by_op["message"] if strip_handle(m["interaction"]) == it_id]

        def send_order(m):
            occ = occurrence_ops[strip_handle(m["send"])]
            return occ["order"]

        message_ops_sorted = sorted(message_ops, key=send_order)
        messages = []
        for rank, m in enumerate(message_ops_sorted, start=1):
            send_occ = occurrence_ops[strip_handle(m["send"])]
            recv_occ = occurrence_ops[strip_handle(m["receive"])]
            sig = m.get("signature") or {}
            signature = None
            if sig.get("kind") == "operation":
                op_id = strip_handle(sig["operation"])
                signature = {"kind": "operation", "id": op_id, "name": name_of(op_id)}
            elif sig.get("kind") == "signal":
                sig_id = strip_handle(sig["signal"])
                signature = {"kind": "signal", "id": sig_id, "name": name_of(sig_id)}
            entry = {
                "id": m["external_id"],
                "order": rank,
                "name": m["name"],
                "sort": m["sort"],
                "from": strip_handle(send_occ["lifeline"]),
                "to": strip_handle(recv_occ["lifeline"]),
            }
            if signature:
                entry["signature"] = signature
            messages.append(entry)

        invariant_ops = [inv for inv in by_op["state_invariant"] if strip_handle(inv["interaction"]) == it_id]
        invariants = [
            {"lifeline": strip_handle(inv["lifeline"]), "order": inv["order"], "constraint": inv["constraint"]}
            for inv in invariant_ops
        ]
        invariants.sort(key=lambda inv: inv["order"])

        interaction_entry = {
            "id": it_id,
            "name": it_op["name"],
            "context": strip_handle(it_op["context"]),
            "lifelines": lifelines,
            "messages": messages,
        }
        if invariants:
            interaction_entry["invariants"] = invariants
        interactions.append(interaction_entry)
    interactions.sort(key=lambda it: it["id"])

    # --------------------------------------------------------- Parametrics
    parametric_metadata = {strip_handle(op["element"]): op["constraint_expression"] for op in by_op["parametric_metadata"]}

    derive_parent = {
        strip_handle(op["source"]): strip_handle(op["target"]) for op in by_op["relationship"] if op["kind"] == "DeriveRequirement"
    }

    def root_ancestor(req_id: str) -> str:
        seen = set()
        current = req_id
        while current in derive_parent and current not in seen:
            seen.add(current)
            current = derive_parent[current]
        return current

    refine_target_of = {
        strip_handle(op["source"]): strip_handle(op["target"])
        for op in by_op["relationship"]
        if op["kind"] == "Refine" and kind_of(strip_handle(op["source"])) == "ConstraintBlock"
    }

    bindings_by_owner: dict[str, list[dict]] = defaultdict(list)
    for op in by_op["binding"]:
        bindings_by_owner[strip_handle(op["owner"])].append(op)

    analysis_block_ids = sorted(bindings_by_owner.keys())
    parametrics = []
    for block_id in analysis_block_ids:
        cprop = next(
            e
            for e in by_op["element"]
            if e["kind"] == "ConstraintProperty" and owner_of(e["external_id"]) == block_id
        )
        cb_id = type_ref_of(cprop["external_id"])
        expression = parametric_metadata[cb_id]
        rhs = expression.split("=", 1)[1]
        rhs_symbols = re.findall(r"[A-Za-z_][A-Za-z0-9_]*", rhs)

        param_by_symbol: dict[str, dict] = {}
        output_symbol = None
        for b in bindings_by_owner[block_id]:
            role_id = strip_handle(b["source"]["role"])
            cparam_id = strip_handle(b["target"]["parameter"])
            symbol = name_of(cparam_id)
            vp_name = name_of(role_id)
            default_val = parse_number(element_ops[role_id].get("default_value"))
            unit = UNIT_HINTS.get(vp_name, "")
            param_by_symbol[symbol] = {
                "parameter": symbol,
                "value": role_id,
                "name": vp_name,
                "default": default_val,
                "unit": unit,
            }
            if default_val is None:
                output_symbol = symbol

        ordered_symbols = [s for s in rhs_symbols if s in param_by_symbol and s != output_symbol]
        # de-dupe while preserving first-appearance order
        seen_syms = set()
        dedup_ordered = []
        for s in ordered_symbols:
            if s not in seen_syms:
                seen_syms.add(s)
                dedup_ordered.append(s)
        if output_symbol:
            dedup_ordered.append(output_symbol)
        parameters = [param_by_symbol[s] for s in dedup_ordered]

        direct_target = refine_target_of.get(cb_id)
        refines = [root_ancestor(direct_target)] if direct_target else []

        parametrics.append(
            {
                "id": block_id,
                "name": name_of(block_id),
                "constraint": cb_id,
                "expression": expression,
                "output": output_symbol,
                "refines": refines,
                "parameters": parameters,
            }
        )
    parametrics.sort(key=lambda p: p["id"])

    # --------------------------------------------------------------- Stats
    trace_relationship_count = sum(1 for op in by_op["relationship"] if op["kind"] in TRACE_RELATIONSHIP_TYPES)
    stats = {
        "requirements": sum(1 for r in requirements_by_id.values() if "copyOf" not in r),
        "copies": sum(1 for r in requirements_by_id.values() if "copyOf" in r),
        "traceRelationships": trace_relationship_count,
        "allRelationships": len(relationships_sorted),
        "blocks": len(blocks_catalog),
        "flows": len(flows),
        "stateMachines": len(state_machines),
        "activities": len(activities),
        "interactions": len(interactions),
        "parametrics": len(parametrics),
        "signals": len(signals),
        "subParts": len(subpart_only_ids),
    }

    composition_out = {k: sorted(v) for k, v in sorted(composition.items())}

    groovy_bytes = groovy_path.read_bytes()
    xlsx_bytes = xlsx_path.read_bytes()

    model = {
        "meta": {
            "schema": 1,
            "sourceFile": _repo_relative(groovy_path),
            "sourceSha256": hashlib.sha256(groovy_bytes).hexdigest(),
            "converter": "tools/model_script_to_json.py",
            "workbookSha256": hashlib.sha256(xlsx_bytes).hexdigest(),
        },
        "categories": categories,
        "elements": elements,
        "relationships": relationships_sorted,
        "flows": flows,
        "hierarchy": hierarchy,
        "stats": stats,
        "behavior": {
            "stateMachines": state_machines,
            "activities": activities,
            "interactions": interactions,
        },
        "parametrics": parametrics,
        "signals": signals,
        "composition": composition_out,
    }
    return model


def write_model(model: dict, out_path: Path) -> None:
    text = json.dumps(model, indent=2, ensure_ascii=False, sort_keys=False) + "\n"
    out_path.write_text(text, encoding="utf-8", newline="\n")


def _repo_relative(path) -> str:
    repo_root = Path(__file__).resolve().parent.parent
    p = Path(path).resolve()
    try:
        return p.relative_to(repo_root).as_posix()
    except ValueError:
        return f"data/source/{p.name}"


def inspect_script(groovy_path: Path) -> None:
    script = extract_script_json(groovy_path)
    ops = script["operations"]
    print(f"source_namespace: {script.get('source_namespace')}")
    print(f"operations: {len(ops)}")
    op_counts = Counter(o["op"] for o in ops)
    for op_name, count in sorted(op_counts.items()):
        print(f"  {op_name}: {count}")
    elem_counts = Counter(o["kind"] for o in ops if o["op"] == "element")
    print("element kinds:")
    for kind, count in sorted(elem_counts.items(), key=lambda kv: -kv[1]):
        print(f"  {kind}: {count}")
    rel_counts = Counter(o["kind"] for o in ops if o["op"] == "relationship")
    print("relationship kinds:")
    for kind, count in sorted(rel_counts.items(), key=lambda kv: -kv[1]):
        print(f"  {kind}: {count}")
    print(f"diagrams: {len(script.get('diagrams', []))}")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inspect", metavar="GROOVY", help="print op/kind counts and exit")
    parser.add_argument("groovy", nargs="?", help="input modelScript(...) groovy path")
    parser.add_argument("blocks", nargs="?", help="data/blocks.json path")
    parser.add_argument("xlsx", nargs="?", help="companion workbook path (for meta.workbookSha256)")
    parser.add_argument("out", nargs="?", help="output model.json path")
    args = parser.parse_args(argv)

    if args.inspect:
        inspect_script(Path(args.inspect))
        return 0

    if not (args.groovy and args.blocks and args.xlsx and args.out):
        parser.error("groovy, blocks, xlsx and out are required unless --inspect is given")

    model = convert(Path(args.groovy), Path(args.blocks), Path(args.xlsx), Path(args.out))
    write_model(model, Path(args.out))
    print(f"Wrote {args.out}: {model['stats']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
