"""Every numeric placement in the car. No bpy imports, no geometry code.

Blender frame: Z up, ground at z = 0, nose toward -Y, +X is the car's left side.
Units are meters.

Part builders read from here and never hard-code a coordinate. When the real
geometry replaces a stub, the stub's ``center``/``size`` stays the bounding
envelope the real part must live inside.
"""

# --------------------------------------------------------------------------
# overall vehicle envelope
# --------------------------------------------------------------------------
LENGTH = 4.40           # y from -2.20 (nose) to +2.20 (tail)
WIDTH = 1.80            # x from -0.90 (right) to +0.90 (left)
HEIGHT = 1.45           # z from 0.00 (ground) to 1.45 (roof)
WHEELBASE = 2.70        # axle centers at y = -1.35 (front) and y = +1.35 (rear)
TRACK = 1.60            # wheel centers at x = -0.80 and x = +0.80
WHEEL_DIAMETER = 0.68
WHEEL_RADIUS = WHEEL_DIAMETER / 2.0     # 0.34
WHEEL_WIDTH = 0.235
WHEEL_Z = WHEEL_RADIUS                  # 0.34

NOSE_Y = -LENGTH / 2.0                  # -2.20
TAIL_Y = LENGTH / 2.0                   # +2.20
FRONT_AXLE_Y = -WHEELBASE / 2.0         # -1.35
REAR_AXLE_Y = WHEELBASE / 2.0           # +1.35
HALF_TRACK = TRACK / 2.0                # 0.80

#: harness tubes run along the floor at roughly this height
FLOW_Z = 0.40
FLOW_RADIUS = 0.012

#: cylinder segment counts (kept low: the whole glb must stay under 50k tris)
SEG_WHEEL = 24
SEG_DISC = 20
SEG_PUCK = 12
FLOW_BEVEL_RESOLUTION = 2

# --------------------------------------------------------------------------
# blocks: stub envelope per clickable SysML block
#   center = (x, y, z) of the box center
#   size   = (x, y, z) extents
# Blocks whose stub is not a single box carry extra keys, consumed only by the
# module that builds them.
# --------------------------------------------------------------------------
BLOCKS = {
    # x-ray shell. The real body agent replaces this box with a profile extrusion.
    "VEH": {
        "center": (0.00, 0.00, 0.65),
        "size": (1.80, 4.40, 0.70),
    },
    # skateboard battery slab under the floor
    "ENERGY": {
        "center": (0.00, 0.00, 0.29),
        "size": (1.24, 2.00, 0.14),
    },
    "BMS": {
        "center": (0.30, 0.70, 0.395),
        "size": (0.30, 0.24, 0.07),
    },
    # rear drive unit (motor + reduction gear), stubbed as one box
    "POWERTRAIN": {
        "center": (0.00, 1.35, 0.36),
        "size": (0.90, 0.44, 0.30),
    },
    "INVERTER": {
        "center": (0.00, 1.35, 0.55),
        "size": (0.34, 0.28, 0.10),
    },
    # four discs merged into one object
    "BRAKES": {
        "center": (0.00, 0.00, 0.34),
        "size": (1.47, 3.02, 0.32),
        "disc_radius": 0.16,
        "disc_depth": 0.03,
        "disc_centers": [
            (0.72, FRONT_AXLE_Y, WHEEL_Z),
            (-0.72, FRONT_AXLE_Y, WHEEL_Z),
            (0.72, REAR_AXLE_Y, WHEEL_Z),
            (-0.72, REAR_AXLE_Y, WHEEL_Z),
        ],
    },
    # front radiator
    "THERMAL": {
        "center": (0.00, -1.95, 0.55),
        "size": (0.90, 0.05, 0.40),
    },
    "THERM_CTRL": {
        "center": (0.40, -1.80, 0.70),
        "size": (0.14, 0.10, 0.06),
    },
    "VCONTROL": {
        "center": (0.00, -0.60, 0.62),
        "size": (0.26, 0.20, 0.08),
    },
    "DIAG": {
        "center": (0.45, -0.75, 0.68),
        "size": (0.10, 0.06, 0.04),
    },
    "HMI": {
        "center": (0.00, -0.80, 0.86),
        "size": (1.55, 0.45, 0.22),
    },
    # four wheel-speed pucks + one front radar, merged into one object
    "SENSORS": {
        "center": (0.00, -1.09, 0.45),
        "size": (1.35, 2.87, 0.30),
        "puck_radius": 0.03,
        "puck_depth": 0.03,
        "puck_centers": [
            (0.66, FRONT_AXLE_Y, 0.30),
            (-0.66, FRONT_AXLE_Y, 0.30),
            (0.66, REAR_AXLE_Y, 0.30),
            (-0.66, REAR_AXLE_Y, 0.30),
        ],
        "radar_center": (0.00, -2.17, 0.60),
        "radar_size": (0.16, 0.05, 0.10),
    },
    # charge door on the car's left rear quarter, flush with the body side
    "CHARGE": {
        "center": (0.885, 1.90, 0.78),
        "size": (0.20, 0.20, 0.04),
    },
}

# --------------------------------------------------------------------------
# decor (not clickable). Colors live here only, per contract section 4.
# --------------------------------------------------------------------------
COLOR_GLASS = "#BFE3F5"
ALPHA_GLASS = 0.25
COLOR_TIRE = "#2B2B2B"
COLOR_RIM = "#C8C8C8"
COLOR_SEAT = "#4A4A4A"
COLOR_FLOW = "#FFA500"
FLOW_EMISSION_STRENGTH = 2.0

CANOPY = {
    "center": (0.00, 0.20, 1.20),
    "size": (1.60, 2.30, 0.50),
}

#: name -> wheel center. FL/FR are the front (nose, -Y) pair; +X is car-left.
WHEELS = {
    "DECOR_wheel_FL": (HALF_TRACK, FRONT_AXLE_Y, WHEEL_Z),
    "DECOR_wheel_FR": (-HALF_TRACK, FRONT_AXLE_Y, WHEEL_Z),
    "DECOR_wheel_RL": (HALF_TRACK, REAR_AXLE_Y, WHEEL_Z),
    "DECOR_wheel_RR": (-HALF_TRACK, REAR_AXLE_Y, WHEEL_Z),
}

#: name -> (center, size). Listed by the contract; stubbed as plain boxes.
SEATS = {
    "DECOR_seat_L": ((0.38, -0.15, 0.70), (0.48, 0.50, 0.60)),
    "DECOR_seat_R": ((-0.38, -0.15, 0.70), (0.48, 0.50, 0.60)),
    "DECOR_seat_rear": ((0.00, 0.60, 0.68), (1.30, 0.45, 0.56)),
}

# --------------------------------------------------------------------------
# flow routes
# Keyed by (source_block_id, target_block_id) -> 2..4 point polyline.
# Missing pairs fall back to a straight line between the two block centers and
# emit a warning, so a new connector in the workbook still builds.
# --------------------------------------------------------------------------
ROUTES = {
    ("VEH", "HMI"): [
        (0.00, -1.65, 1.05), (0.00, -1.15, 0.96), (0.00, -0.86, 0.90),
    ],
    ("VEH", "CHARGE"): [
        (1.02, 2.06, 0.98), (0.95, 1.98, 0.88), (0.90, 1.92, 0.80),
    ],
    ("VEH", "DIAG"): [
        (0.86, -0.98, 0.92), (0.66, -0.86, 0.78), (0.49, -0.78, 0.70),
    ],
    ("HMI", "VCONTROL"): [
        (0.00, -0.82, 0.78), (0.06, -0.74, 0.52), (0.04, -0.62, 0.60),
    ],
    ("SENSORS", "VCONTROL"): [
        (0.00, -2.12, 0.56), (-0.16, -1.80, FLOW_Z), (-0.16, -0.82, FLOW_Z),
        (-0.04, -0.63, 0.59),
    ],
    ("VCONTROL", "POWERTRAIN"): [
        (0.00, -0.58, 0.59), (0.12, -0.20, FLOW_Z), (0.12, 1.06, FLOW_Z),
        (0.00, 1.30, 0.40),
    ],
    ("VCONTROL", "BRAKES"): [
        (0.00, -0.62, 0.58), (-0.34, -0.70, FLOW_Z), (-0.60, -1.18, 0.38),
        (-0.72, -1.34, 0.35),
    ],
    ("DIAG", "VCONTROL"): [
        (0.44, -0.76, 0.66), (0.28, -0.70, 0.44), (0.10, -0.61, 0.60),
    ],
    ("ENERGY", "POWERTRAIN"): [
        (0.00, 0.92, 0.34), (0.22, 1.06, FLOW_Z), (0.22, 1.24, FLOW_Z),
        (0.00, 1.32, 0.40),
    ],
    ("ENERGY", "THERMAL"): [
        (-0.30, -0.90, 0.32), (-0.46, -1.30, FLOW_Z), (-0.46, -1.86, 0.46),
        (-0.20, -1.94, 0.52),
    ],
    ("CHARGE", "ENERGY"): [
        (0.86, 1.88, 0.74), (0.78, 1.58, 0.46), (0.52, 1.08, FLOW_Z),
        (0.28, 0.94, 0.34),
    ],
    ("POWERTRAIN", "INVERTER"): [
        (0.12, 1.30, 0.44), (0.12, 1.33, 0.53), (0.04, 1.35, 0.55),
    ],
    ("INVERTER", "POWERTRAIN"): [
        (-0.10, 1.35, 0.55), (-0.14, 1.33, 0.48), (-0.10, 1.32, 0.42),
    ],
    ("THERMAL", "THERM_CTRL"): [
        (0.20, -1.94, 0.58), (0.34, -1.86, 0.66), (0.40, -1.81, 0.70),
    ],
}


def block_center(block_id):
    """Fallback anchor for a flow endpoint."""
    spec = BLOCKS.get(block_id)
    if spec is None:
        return (0.0, 0.0, FLOW_Z)
    return tuple(spec["center"])


def route(source, target):
    """Polyline for a flow, or ``None`` when the pair has no authored route."""
    return ROUTES.get((source, target))


def fallback_route(source, target):
    """Straight line between the two block centers."""
    return [block_center(source), block_center(target)]
