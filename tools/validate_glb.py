#!/usr/bin/env python3
"""
GLB validator for the SysML Car model.
Validates against the model contract defined in docs/model-contract.md section 3.
"""

import json
import struct
import sys
import re
from pathlib import Path
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class ValidationError:
    """Represents a single validation failure."""
    check_num: int
    message: str


@dataclass
class NodeInfo:
    """Information about a node in the glTF scene."""
    name: str
    kind: str  # Block, Flow, Decor, or other
    mesh_index: Optional[int]
    material_index: Optional[int]
    alpha_mode: Optional[str]
    triangle_count: int = 0
    translation: Optional[List[float]] = None
    scale: Optional[List[float]] = None


def parse_glb(glb_path: Path) -> Tuple[Dict[str, Any], bytes]:
    """
    Parse a GLB file and return (json_data, bin_chunk).
    """
    with open(glb_path, "rb") as f:
        data = f.read()

    if len(data) < 12:
        raise ValueError("GLB file too small")

    # Parse header (12 bytes)
    magic, version, length = struct.unpack("<4sII", data[:12])

    if magic != b"glTF":
        raise ValueError(f"Invalid magic: {magic}")
    if version != 2:
        raise ValueError(f"Invalid version: {version}")

    # Parse chunks
    json_data = None
    bin_chunk = b""
    offset = 12

    while offset < len(data):
        if offset + 8 > len(data):
            break

        chunk_length, chunk_type = struct.unpack("<II", data[offset : offset + 8])
        offset += 8

        chunk_data = data[offset : offset + chunk_length]
        offset += chunk_length

        if chunk_type == 0x4E4F534A:  # JSON
            json_data = json.loads(chunk_data.decode("utf-8"))
        elif chunk_type == 0x004E4942:  # BIN
            bin_chunk = chunk_data

    if json_data is None:
        raise ValueError("No JSON chunk found in GLB")

    return json_data, bin_chunk


def load_blocks_json(blocks_path: Path) -> Dict[str, Any]:
    """Load the blocks.json file."""
    with open(blocks_path, "r") as f:
        blocks_list = json.load(f)
    # Convert to dict by id for easy lookup
    return {block["id"]: block for block in blocks_list}


def load_model_json(model_path: Optional[Path]) -> Optional[Dict[str, Any]]:
    """Load model.json if it exists, return None otherwise."""
    if model_path is None or not model_path.exists():
        return None
    with open(model_path, "r") as f:
        return json.load(f)


def get_node_meshes_and_materials(
    gltf: Dict[str, Any], node_index: int
) -> List[Tuple[int, Optional[int]]]:
    """
    Get (mesh_index, material_index) pairs for a node.
    Returns list of tuples from the node's mesh primitives.
    """
    nodes = gltf.get("nodes", [])
    meshes = gltf.get("meshes", [])

    if node_index >= len(nodes):
        return []

    node = nodes[node_index]
    mesh_index = node.get("mesh")

    if mesh_index is None or mesh_index >= len(meshes):
        return []

    mesh = meshes[mesh_index]
    primitives = mesh.get("primitives", [])

    results = []
    for prim in primitives:
        mat_idx = prim.get("material")
        results.append((mesh_index, mat_idx))

    return results


def count_triangles_in_mesh(gltf: Dict[str, Any], mesh_index: int) -> int:
    """Count triangles in a mesh (sum of all primitives)."""
    meshes = gltf.get("meshes", [])
    if mesh_index >= len(meshes):
        return 0

    mesh = meshes[mesh_index]
    primitives = mesh.get("primitives", [])
    accessors = gltf.get("accessors", [])

    total_tris = 0
    for prim in primitives:
        indices_idx = prim.get("indices")
        mode = prim.get("mode", 4)  # Default to TRIANGLES (4)

        if mode != 4:
            continue  # Only count triangle mode

        if indices_idx is not None:
            if indices_idx < len(accessors):
                accessor = accessors[indices_idx]
                count = accessor.get("count", 0)
                total_tris += count // 3
        else:
            # No indices, use POSITION accessor count
            pos_idx = prim.get("attributes", {}).get("POSITION")
            if pos_idx is not None and pos_idx < len(accessors):
                accessor = accessors[pos_idx]
                count = accessor.get("count", 0)
                total_tris += count // 3

    return total_tris


def get_bounding_box(gltf: Dict[str, Any]) -> Tuple[List[float], List[float]]:
    """
    Get scene bounding box from POSITION accessor min/max across all primitives.
    Returns (min_point, max_point) where each is [x, y, z].
    """
    meshes = gltf.get("meshes", [])
    accessors = gltf.get("accessors", [])

    min_point = [float("inf"), float("inf"), float("inf")]
    max_point = [float("-inf"), float("-inf"), float("-inf")]

    for mesh in meshes:
        primitives = mesh.get("primitives", [])
        for prim in primitives:
            pos_idx = prim.get("attributes", {}).get("POSITION")
            if pos_idx is not None and pos_idx < len(accessors):
                accessor = accessors[pos_idx]
                acc_min = accessor.get("min", [0, 0, 0])
                acc_max = accessor.get("max", [0, 0, 0])

                for i in range(3):
                    min_point[i] = min(min_point[i], acc_min[i] if i < len(acc_min) else 0)
                    max_point[i] = max(max_point[i], acc_max[i] if i < len(acc_max) else 0)

    # Handle case where no accessors found
    if min_point[0] == float("inf"):
        min_point = [0, 0, 0]
        max_point = [0, 0, 0]

    return min_point, max_point


def validate_glb(
    glb_path: Path,
    blocks_path: Path,
    model_path: Optional[Path],
    max_tris: int = 50000,
) -> Tuple[List[ValidationError], List[NodeInfo]]:
    """
    Validate GLB file against the model contract.
    Returns (errors, node_info_list).
    """
    errors = []
    node_infos = []

    try:
        gltf, bin_chunk = parse_glb(glb_path)
    except Exception as e:
        errors.append(ValidationError(0, f"Failed to parse GLB: {e}"))
        return errors, []

    blocks = load_blocks_json(blocks_path)
    model = load_model_json(model_path)
    block_ids = set(blocks.keys())

    # ========== CHECK 1: Scene structure ==========
    scenes = gltf.get("scenes", [])
    nodes = gltf.get("nodes", [])

    if len(scenes) != 1:
        errors.append(ValidationError(1, f"Expected exactly 1 scene, found {len(scenes)}"))
    else:
        scene = scenes[0]
        root_nodes = scene.get("nodes", [])

        car_node_idx = None
        for idx in root_nodes:
            if idx < len(nodes) and nodes[idx].get("name") == "CAR":
                car_node_idx = idx
                break

        if car_node_idx is None:
            errors.append(ValidationError(1, "Root scene must contain a node named 'CAR'"))
        else:
            # Check that block nodes are direct children of CAR
            car_children_indices = nodes[car_node_idx].get("children", [])
            car_children = {nodes[i].get("name"): i for i in car_children_indices if i < len(nodes)}

            for block_id in block_ids:
                if block_id not in car_children:
                    errors.append(
                        ValidationError(1, f"Block '{block_id}' must be a direct child of 'CAR'")
                    )

    # ========== CHECK 2: Node names ==========
    all_node_names = [nodes[i].get("name") for i in range(len(nodes)) if i < len(nodes)]
    seen_names = {}

    for node_idx, node in enumerate(nodes):
        name = node.get("name")
        if not name:
            continue

        # Check for .NNN suffix
        if re.search(r"\.\d{3}$", name):
            errors.append(ValidationError(2, f"Node '{name}' has Blender suffix '.NNN'"))

        # Check for duplicates
        if name in seen_names:
            errors.append(ValidationError(2, f"Duplicate node name: '{name}'"))
        seen_names[name] = node_idx

    # Check that every block_id has exactly one node with that name and a mesh
    for block_id in block_ids:
        matching_nodes = [n for n in nodes if n.get("name") == block_id]
        if len(matching_nodes) == 0:
            errors.append(ValidationError(2, f"No node found for block '{block_id}'"))
        elif len(matching_nodes) > 1:
            errors.append(ValidationError(2, f"Multiple nodes found for block '{block_id}'"))
        else:
            if matching_nodes[0].get("mesh") is None:
                errors.append(ValidationError(2, f"Block node '{block_id}' has no mesh"))

    # ========== CHECK 3: Extras ==========
    for node_idx, node in enumerate(nodes):
        name = node.get("name", "")
        extras = node.get("extras", {})

        if name in block_ids:
            # Block node
            sysml_id = extras.get("sysml_id")
            sysml_kind = extras.get("sysml_kind")

            if sysml_id != name:
                errors.append(
                    ValidationError(3, f"Block '{name}' extras.sysml_id != name")
                )
            if sysml_kind != "Block":
                errors.append(
                    ValidationError(3, f"Block '{name}' extras.sysml_kind != 'Block'")
                )

        if name.startswith("FLOW__"):
            # Flow node
            sysml_kind = extras.get("sysml_kind")
            sysml_source = extras.get("sysml_source")
            sysml_target = extras.get("sysml_target")

            if sysml_kind != "Flow":
                errors.append(
                    ValidationError(3, f"Flow node '{name}' extras.sysml_kind != 'Flow'")
                )
            if sysml_source not in block_ids:
                errors.append(
                    ValidationError(3, f"Flow node '{name}' has invalid sysml_source")
                )
            if sysml_target not in block_ids:
                errors.append(
                    ValidationError(3, f"Flow node '{name}' has invalid sysml_target")
                )

    # Check flow names vs model.json if present
    if model is not None:
        flow_nodes = {n.get("name") for n in nodes if n.get("name", "").startswith("FLOW__")}
        model_flow_names = {f.get("meshName") for f in model.get("flows", [])}

        if flow_nodes != model_flow_names:
            errors.append(
                ValidationError(3, f"Flow node names don't match model.json flows")
            )

    # ========== CHECK 4: Materials ==========
    materials = gltf.get("materials", [])
    meshes = gltf.get("meshes", [])

    for node_idx, node in enumerate(nodes):
        name = node.get("name", "")
        mesh_idx = node.get("mesh")

        if mesh_idx is None:
            continue

        # Get material(s) used by this mesh
        if mesh_idx >= len(meshes):
            continue

        mesh = meshes[mesh_idx]
        primitives = mesh.get("primitives", [])

        # Check that mesh uses exactly one material
        material_indices = set()
        for prim in primitives:
            mat_idx = prim.get("material")
            if mat_idx is not None:
                material_indices.add(mat_idx)

        if len(material_indices) > 1:
            errors.append(ValidationError(4, f"Block '{name}' uses multiple materials"))

        mat_idx = next(iter(material_indices), None)

        if mat_idx is not None and mat_idx < len(materials):
            material = materials[mat_idx]
            alpha_mode = material.get("alphaMode", "OPAQUE")
            pbr = material.get("pbrMetallicRoughness", {})
            base_color = pbr.get("baseColorFactor", [1, 1, 1, 1])
            alpha = base_color[3] if len(base_color) > 3 else 1.0

            # VEH and DECOR_canopy must be BLEND with alpha < 1
            if name == "VEH":
                if alpha_mode != "BLEND":
                    errors.append(
                        ValidationError(4, f"VEH material must have alphaMode BLEND, got {alpha_mode}")
                    )
                if alpha >= 1.0:
                    errors.append(
                        ValidationError(4, f"VEH material alpha must be < 1, got {alpha}")
                    )

            if name == "DECOR_canopy":
                if alpha_mode != "BLEND":
                    errors.append(
                        ValidationError(
                            4, f"DECOR_canopy material must have alphaMode BLEND, got {alpha_mode}"
                        )
                    )
                if alpha >= 1.0:
                    errors.append(
                        ValidationError(4, f"DECOR_canopy material alpha must be < 1, got {alpha}")
                    )

            # All other blocks must be OPAQUE
            if name in block_ids and name not in ("VEH", "DECOR_canopy"):
                if alpha_mode != "OPAQUE" and alpha_mode is not None:
                    errors.append(
                        ValidationError(
                            4, f"Block '{name}' material must be OPAQUE, got {alpha_mode}"
                        )
                    )

    # ========== CHECK 5: Geometry ==========
    total_triangles = 0
    min_point, max_point = get_bounding_box(gltf)

    for mesh_idx, mesh in enumerate(meshes):
        tris = count_triangles_in_mesh(gltf, mesh_idx)
        total_triangles += tris

    if total_triangles > max_tris:
        errors.append(
            ValidationError(
                5, f"Total triangles {total_triangles} exceeds max {max_tris}"
            )
        )

    # Check bounding box
    x_min, y_min, z_min = min_point
    x_max, y_max, z_max = max_point

    if x_min < -1.5 or x_max > 1.5:
        errors.append(
            ValidationError(5, f"X bounds [{x_min}, {x_max}] exceed [-1.5, 1.5]")
        )
    if y_min < -0.1 or y_max > 2.0:
        errors.append(
            ValidationError(5, f"Y bounds [{y_min}, {y_max}] exceed [-0.1, 2.0]")
        )
    if z_min < -3.0 or z_max > 3.0:
        errors.append(
            ValidationError(5, f"Z bounds [{z_min}, {z_max}] exceed [-3.0, 3.0]")
        )

    z_extent = z_max - z_min
    if z_extent < 3.0:
        errors.append(
            ValidationError(5, f"WARNING: Z extent {z_extent:.2f}m < 3.0m (possible scale error)")
        )

    # ========== Build node info for output ==========
    for node_idx, node in enumerate(nodes):
        name = node.get("name", "")
        mesh_idx = node.get("mesh")

        if name in block_ids or name.startswith("FLOW__") or name.startswith("DECOR_"):
            # Determine kind
            if name in block_ids:
                kind = "Block"
            elif name.startswith("FLOW__"):
                kind = "Flow"
            else:
                kind = "Decor"

            # Get triangle count and material info
            tri_count = 0
            mat_idx = None
            alpha_mode = None

            if mesh_idx is not None and mesh_idx < len(meshes):
                tri_count = count_triangles_in_mesh(gltf, mesh_idx)
                mesh = meshes[mesh_idx]
                primitives = mesh.get("primitives", [])
                if primitives:
                    mat_idx = primitives[0].get("material")

            material_name = None
            if mat_idx is not None and mat_idx < len(materials):
                material_name = materials[mat_idx].get("name", f"M_{mat_idx}")
                alpha_mode = materials[mat_idx].get("alphaMode", "OPAQUE")

            # Check for block meshes with 0 triangles
            if kind == "Block" and tri_count == 0:
                errors.append(ValidationError(5, f"Block '{name}' has 0 triangles"))

            node_info = NodeInfo(
                name=name,
                kind=kind,
                mesh_index=mesh_idx,
                material_index=mat_idx,
                alpha_mode=alpha_mode if alpha_mode and alpha_mode != "OPAQUE" else "OPAQUE",
                triangle_count=tri_count,
            )
            node_infos.append(node_info)

    # Sort by name
    node_infos.sort(key=lambda x: x.name)

    return errors, node_infos


def format_table(node_infos: List[NodeInfo], total_triangles: int) -> str:
    """Format node info as ASCII table."""
    lines = []
    lines.append("Node Name          Kind   Triangles  Material       AlphaMode")
    lines.append("-" * 70)

    for info in node_infos:
        mat_name = f"M_{info.material_index}" if info.material_index is not None else "N/A"
        line = f"{info.name:<18} {info.kind:<6} {info.triangle_count:>9}  {mat_name:<14} {info.alpha_mode}"
        lines.append(line)

    lines.append("-" * 70)
    lines.append(f"{'TOTAL':<18} {'':6} {total_triangles:>9}")

    return "\n".join(lines)


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Validate GLB file against SysML Car model contract"
    )
    parser.add_argument("glb", help="Path to GLB file")
    parser.add_argument("model_json", help="Path to model.json (may not exist)")
    parser.add_argument("blocks_json", help="Path to blocks.json")
    parser.add_argument(
        "--max-tris", type=int, default=50000, help="Maximum triangle count (default 50000)"
    )

    args = parser.parse_args()

    glb_path = Path(args.glb)
    model_path = Path(args.model_json)
    blocks_path = Path(args.blocks_json)

    if not glb_path.exists():
        print(f"Error: GLB file not found: {glb_path}")
        sys.exit(1)

    if not blocks_path.exists():
        print(f"Error: blocks.json not found: {blocks_path}")
        sys.exit(1)

    # model.json may not exist
    if not model_path.exists():
        print(f"Warning: model.json not found, skipping flow validation")
        model_path = None

    errors, node_infos = validate_glb(glb_path, blocks_path, model_path, args.max_tris)

    # Calculate total triangles
    total_triangles = sum(info.triangle_count for info in node_infos)

    # Print table
    print(format_table(node_infos, total_triangles))
    print()

    # Print result
    if errors:
        print("FAIL: Validation errors found:")
        for error in errors:
            print(f"  Check {error.check_num}: {error.message}")
        sys.exit(1)
    else:
        print("PASS: All validation checks passed")
        sys.exit(0)


if __name__ == "__main__":
    main()
