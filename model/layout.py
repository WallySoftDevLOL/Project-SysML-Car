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
SEG_WHEEL = 32
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
    # x-ray shell: the side silhouette extruded across X, with the two wheel
    # arches cut straight into the profile (no booleans). ``center``/``size``
    # stay the bounding envelope the extrusion must live inside.
    "VEH": {
        "center": (0.00, 0.00, 0.64),
        "size": (1.80, 4.40, 0.68),
        # Closed YZ silhouette, nose -> tail along the roofline. The return run
        # along the underbody is generated from the arch keys below, so the
        # polygon closes back onto the first point.
        "profile_top": [
            (-2.20, 0.30),      # nose, at underbody height
            (-2.20, 0.80),      # nose upper: blunt, high EV face
            (-2.02, 0.90),      # hood front
            (-1.45, 0.960),     # hood crown, short flat hood
            (-1.05, 1.00),      # cowl, base of the windshield (cab forward)
            (1.30, 1.03),       # rear shoulder, base of the rear glass
            (1.95, 1.02),       # rear deck
            (2.16, 0.94),       # tail, Kammback cut
            (2.20, 0.78),
            (2.20, 0.30),       # tail, at underbody height
        ],
        "underbody_z": 0.30,
        # semicircular notches, traversed tail -> nose with the underbody run
        "arch_centers_y": (REAR_AXLE_Y, FRONT_AXLE_Y),
        "arch_z": 0.34,
        "arch_radius": 0.40,
        "arch_segments": 8,
        "width": WIDTH,
        # tumblehome: (z, x scale) breakpoints, clamped outside the range. The
        # shoulder pulls in above the belt line so the shell is not slab-sided
        # and steps down onto the 1.60-wide canopy.
        "width_taper": [(0.82, 1.00), (1.03, 0.93)],
        "bevel_width": 0.05,
        "bevel_segments": 2,
        "bevel_angle_deg": 40.0,
    },
    # skateboard battery slab under the floor
    "ENERGY": {
        "center": (0.00, 0.00, 0.29),
        "size": (1.24, 2.00, 0.14),
        "bevel_width": 0.015,
        "module_size": (0.42, 0.42, 0.025),
        # absolute (x, y, z) centers, raised cell-module boxes on the pack lid
        "module_centers": [
            (-0.30, -0.55, 0.3725), (0.00, -0.55, 0.3725), (0.30, -0.55, 0.3725),
            (-0.30, 0.00, 0.3725), (0.00, 0.00, 0.3725), (0.30, 0.00, 0.3725),
        ],
    },
    "BMS": {
        "center": (0.30, 0.70, 0.395),
        "size": (0.30, 0.24, 0.07),
        "ridge_size": (0.26, 0.04, 0.02),
        "ridge_center": (0.30, 0.57, 0.44),
    },
    # rear + front drive units (motor + reduction gear + half-shafts)
    "POWERTRAIN": {
        "center": (0.00, 1.35, 0.36),
        "size": (0.90, 0.44, 0.30),
        "rear_motor_radius": 0.13,
        "rear_motor_length": 0.44,
        "rear_motor_center": (0.00, 1.35, 0.36),
        "rear_gearbox_size": (0.24, 0.30, 0.26),
        "rear_gearbox_center": (0.30, 1.35, 0.36),
        "rear_shaft_radius": 0.025,
        "rear_shaft_x_range": (0.22, 0.66),
        "front_motor_radius": 0.11,
        "front_motor_length": 0.36,
        "front_motor_center": (0.00, -1.35, 0.36),
        "front_shaft_radius": 0.025,
        "front_shaft_x_range": (0.22, 0.66),
    },
    "INVERTER": {
        "center": (0.00, 1.35, 0.55),
        "size": (0.34, 0.28, 0.10),
        "fin_size": (0.02, 0.24, 0.03),
        "fin_x_offsets": [-0.12, -0.04, 0.04, 0.12],
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
        "caliper_size": (0.06, 0.10, 0.14),
        "caliper_y_offset": 0.10,
        "caliper_z": 0.44,
    },
    # front radiator
    "THERMAL": {
        "center": (0.00, -1.95, 0.55),
        "size": (0.90, 0.05, 0.40),
        "fin_size": (0.86, 0.012, 0.02),
        "fin_z_offsets": [-0.16, -0.096, -0.032, 0.032, 0.096, 0.16],
        "fan_radius": 0.18,
        "fan_depth": 0.04,
        "fan_center": (0.00, -1.88, 0.55),
        "pipe_radius": 0.02,
        "pipe_length": 0.15,
        # kept off the x=-0.16, z=FLOW_Z lane the SENSORS->VCONTROL harness runs
        # along, and off the ground plane, so the coolant stubs don't clip it
        "pipe_centers": [(-0.30, -1.855, 0.46), (0.30, -1.855, 0.46)],
    },
    "THERM_CTRL": {
        "center": (0.40, -1.80, 0.70),
        "size": (0.14, 0.10, 0.06),
    },
    "VCONTROL": {
        "center": (0.00, -0.60, 0.62),
        "size": (0.26, 0.20, 0.08),
        "bevel_width": 0.01,
        "connector_size": (0.06, 0.03, 0.03),
        "connector_center": (0.00, -0.715, 0.62),
    },
    "DIAG": {
        "center": (0.45, -0.75, 0.68),
        "size": (0.10, 0.06, 0.04),
        "trapezoid_top_scale": 0.7,
    },
    "HMI": {
        "center": (0.00, -0.80, 0.86),
        "size": (1.55, 0.45, 0.22),
        "binnacle_size": (0.30, 0.12, 0.10),
        "binnacle_center": (0.38, -0.62, 0.99),
        "screen_size": (0.35, 0.03, 0.20),
        "screen_center": (0.00, -0.62, 1.05),
        "wheel_major_radius": 0.18,
        "wheel_minor_radius": 0.025,
        "wheel_center": (0.38, -0.45, 1.02),
        "wheel_tilt_deg": 65,
        "column_radius": 0.02,
        "column_dash_point": (0.38, -0.68, 0.97),
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
        "camera_size": (0.08, 0.06, 0.04),
        "camera_center": (0.00, -0.20, 1.38),
    },
    # charge door on the car's left rear quarter, flush with the body side
    "CHARGE": {
        "center": (0.885, 1.90, 0.78),
        "size": (0.20, 0.20, 0.04),
        "socket_radius": 0.05,
        "socket_depth": 0.02,
        "socket_center": (0.91, 1.90, 0.78),
        "pin_radius": 0.008,
        "pin_depth": 0.012,
        "pin_centers": [
            (0.918, 1.900, 0.795),
            (0.918, 1.885, 0.765),
            (0.918, 1.915, 0.765),
        ],
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

#: greenhouse glass. Same technique as the shell: a closed YZ silhouette
#: extruded across X, inset 0.10 per side from the body. The bottom edge runs
#: back along the body roofline from the rear-glass base to the cowl.
CANOPY = {
    "profile": [
        (-1.05, 0.97),      # windshield base, sunk 0.03 into the cowl
        (-0.30, 1.40),      # windshield top
        (0.65, 1.45),       # roof, start of the fastback
        (1.30, 1.00),       # rear glass base, sunk 0.03 into the shoulder
    ],
    "width": 1.60,
    "bevel_width": 0.08,
    "bevel_segments": 3,
    "bevel_angle_deg": 30.0,
}

#: name -> wheel center. FL/FR are the front (nose, -Y) pair; +X is car-left.
WHEELS = {
    "DECOR_wheel_FL": (HALF_TRACK, FRONT_AXLE_Y, WHEEL_Z),
    "DECOR_wheel_FR": (-HALF_TRACK, FRONT_AXLE_Y, WHEEL_Z),
    "DECOR_wheel_RL": (HALF_TRACK, REAR_AXLE_Y, WHEEL_Z),
    "DECOR_wheel_RR": (-HALF_TRACK, REAR_AXLE_Y, WHEEL_Z),
}

# Wheel cross-section, revolved around the wheel axis. Radii are measured from
# the axis; the axial coordinate runs from the inboard face (negative) to the
# outboard face (positive), so the barrel stays open toward the brake disc at
# x = +/-0.72 and the discs read through the x-ray shell.
TIRE_INNER_RADIUS = 0.232
TIRE_SHOULDER_RADIUS = 0.055
TIRE_SHOULDER_SEGMENTS = 2

# Rim: a dished face recessed inside the outboard shoulder, a hub cap and a few
# raised spokes. Only one material per object is allowed, so the rim reads by
# shape and shading rather than by color.
RIM_DISH_INNER_RADIUS = 0.140
RIM_DISH_OUTER_RADIUS = 0.235
RIM_DISH_INNER_X = 0.010
RIM_DISH_OUTER_X = 0.095
RIM_SEGMENTS = 16
HUB_RADIUS = 0.075
HUB_INNER_X = 0.085
HUB_OUTER_X = 0.125
HUB_SEGMENTS = 10
SPOKE_COUNT = 5
SPOKE_INNER_RADIUS = 0.090
SPOKE_OUTER_RADIUS = 0.225
SPOKE_WIDTH = 0.055
SPOKE_THICKNESS = 0.020

#: Positive degrees lean a backrest toward the tail (+Y).
SEAT_BACK_TILT_DEG = 14.0
SEAT_BENCH_TILT_DEG = 18.0

#: name -> ordered list of ``(center, size, tilt_deg)`` boxes: cushion, then
#: backrest, then headrest. ``tilt_deg`` rotates the box about X about its own
#: center. Listed by the contract; the cabin floor sits at z = 0.40.
SEATS = {
    "DECOR_seat_L": [
        ((0.38, -0.18, 0.455), (0.46, 0.48, 0.11), 0.0),
        ((0.38, 0.10, 0.740), (0.44, 0.11, 0.52), SEAT_BACK_TILT_DEG),
        ((0.38, 0.185, 1.060), (0.28, 0.10, 0.15), SEAT_BACK_TILT_DEG),
    ],
    "DECOR_seat_R": [
        ((-0.38, -0.18, 0.455), (0.46, 0.48, 0.11), 0.0),
        ((-0.38, 0.10, 0.740), (0.44, 0.11, 0.52), SEAT_BACK_TILT_DEG),
        ((-0.38, 0.185, 1.060), (0.28, 0.10, 0.15), SEAT_BACK_TILT_DEG),
    ],
    "DECOR_seat_rear": [
        ((0.00, 0.82, 0.455), (1.30, 0.48, 0.11), 0.0),
        ((0.00, 1.10, 0.720), (1.28, 0.12, 0.48), SEAT_BENCH_TILT_DEG),
    ],
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
        # kept at x=0.08, left of the rear gearbox box (x in [0.18, 0.42]),
        # so the tube runs beside it instead of through it
        (0.00, 0.92, 0.34), (0.08, 1.06, FLOW_Z), (0.08, 1.24, FLOW_Z),
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
