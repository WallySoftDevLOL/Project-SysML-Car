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
        # Closed YZ silhouette. ``profile_top`` is the upper run nose -> tail;
        # ``profile_bottom`` is the return run tail -> nose and carries
        # ("arch", y) markers where a wheel-arch notch is spliced in.
        "profile_top": [
            (-2.20, 0.340),     # nose, lower lip of the front bumper
            (-2.20, 0.600),     # bumper face
            (-2.17, 0.740),     # upper bumper / fascia shut line
            (-2.08, 0.845),     # hood leading edge
            (-1.90, 0.895),
            (-1.62, 0.935),     # hood power dome crown
            (-1.34, 0.950),
            (-1.08, 0.972),     # cowl, base of the windshield (cab forward)
            (-0.60, 0.996),     # beltline
            (0.20, 1.012),
            (0.85, 1.028),      # rear haunch shoulder
            (1.30, 1.036),      # rear shoulder, base of the rear glass
            (1.66, 1.040),      # rear deck
            (1.94, 1.028),
            (2.04, 1.058),      # integrated spoiler lip
            (2.12, 1.048),
            (2.17, 0.955),      # tail, Kammback cut
            (2.20, 0.800),
            (2.20, 0.460),
        ],
        "profile_bottom": [
            (2.17, 0.320),      # rear bumper lower face
            (2.02, 0.245),      # rear valance / diffuser
            (1.84, 0.300),
            ("arch", REAR_AXLE_Y),
            (0.92, 0.300),
            (0.78, 0.215),      # rocker / side-skirt run
            (-0.64, 0.215),
            (-0.80, 0.300),
            ("arch", FRONT_AXLE_Y),
            (-1.88, 0.300),
            (-2.06, 0.245),     # front valance
            (-2.18, 0.290),
        ],
        "underbody_z": 0.30,
        # semicircular notches, spliced into ``profile_bottom`` tail -> nose
        "arch_centers_y": (REAR_AXLE_Y, FRONT_AXLE_Y),
        "arch_z": 0.34,
        "arch_radius": 0.40,
        "arch_segments": 9,
        "width": WIDTH,
        # tumblehome: (z, x scale) breakpoints, clamped outside the range. Two
        # segments above the belt line give the shoulder crease; the pull-in
        # below z = 0.30 is the side-skirt undercut.
        "width_taper": [
            (0.215, 0.880), (0.300, 0.962), (0.620, 1.000), (0.860, 1.000),
            (0.950, 0.980), (1.060, 0.900),
        ],
        # wheel-arch flare / rear haunch: (y_center, y_span, z_top, extra_x).
        # |x| grows by ``extra_x`` at y_center and cosine-fades to zero at
        # y_center +/- y_span and at z_top.
        "arch_flare": [
            (FRONT_AXLE_Y, 0.66, 0.900, 0.030),
            (REAR_AXLE_Y, 0.80, 0.980, 0.048),
        ],
        # one round of edge subdivision before the taper, so the flanks curve
        "side_subdivide_cuts": 1,
        "bevel_width": 0.035,
        "bevel_segments": 3,
        "bevel_angle_deg": 35.0,
        # glass-over-paint look in the viewer; alpha still comes from blocks.json
        "metallic": 0.60,
        "roughness": 0.30,
    },
    # skateboard battery pack: tray + lip, cooling plate, cross straps, HV
    # junction box and cable bosses at the rear. The 12 cell modules that used
    # to live here are their own clickable block (BAT_MODULE, below).
    # The whole pack lives in z 0.22 - 0.36 so it sits on the floor pan.
    "ENERGY": {
        "center": (0.00, 0.00, 0.29),
        "size": (1.24, 2.00, 0.14),
        "metallic": 0.20,
        "roughness": 0.60,
        "tray_center": (0.00, 0.00, 0.245),
        "tray_size": (1.24, 2.00, 0.050),
        "tray_bevel": 0.012,
        # perimeter lip, (center, size). The rear rail is split so the HV
        # junction box and its cable bosses face out through the gap.
        "lip_boxes": [
            ((0.0000, -0.9825, 0.315), (1.240, 0.035, 0.090)),
            ((0.4300, 0.9825, 0.315), (0.380, 0.035, 0.090)),
            ((-0.4300, 0.9825, 0.315), (0.380, 0.035, 0.090)),
            ((0.6025, -0.0175, 0.315), (0.035, 1.965, 0.090)),
            ((-0.6025, -0.0175, 0.315), (0.035, 1.965, 0.090)),
        ],
        # cooling plate line down the spine, between the two module rows
        "plate_center": (0.00, -0.11, 0.285),
        "plate_size": (0.090, 1.660, 0.030),
        # cross straps over the module tops
        "strap_size": (1.180, 0.040, 0.014),
        "strap_centers": [(0.00, -0.67, 0.352), (0.00, 0.17, 0.352)],
        "junction_center": (0.00, 0.86, 0.325),
        "junction_size": (0.440, 0.160, 0.070),
        # HV cable bosses; geometry only, the block keeps its own color
        "boss_radius": 0.024,
        "boss_depth": 0.060,
        "boss_segments": 10,
        "boss_centers": [(0.12, 0.965, 0.325), (-0.12, 0.965, 0.325)],
    },
    # the cell modules themselves: 12 boxes in two rows, 6 deep, with 0.02 gaps,
    # sitting in the ENERGY tray either side of its cooling plate.
    "BAT_MODULE": {
        "center": (0.00, -0.11, 0.3075),
        "size": (1.10, 1.66, 0.075),
        "metallic": 0.15,
        "roughness": 0.55,
        "module_size": (0.50, 0.26, 0.075),
        "module_row_x": (0.30, -0.30),
        "module_row_y": [-0.81, -0.53, -0.25, 0.03, 0.31, 0.59],
        "module_z": 0.3075,
    },
    "BMS": {
        "center": (0.30, 0.68, 0.385),
        "size": (0.30, 0.26, 0.09),
        "metallic": 0.35,
        "roughness": 0.45,
        "body_center": (0.30, 0.70, 0.372),
        "body_size": (0.280, 0.200, 0.050),
        "fin_size": (0.240, 0.014, 0.024),
        "fin_center": (0.30, 0.70, 0.409),
        "fin_y_offsets": [-0.075, -0.050, -0.025, 0.000, 0.025, 0.050, 0.075],
        "connector_size": (0.090, 0.045, 0.032),
        "connector_center": (0.30, 0.578, 0.372),
    },
    # rear + front drive units, minus the motor housings (those are their own
    # clickable block, MOTOR, below). Both share one description: a rounded
    # reduction-gearbox casing offset to the car's right (-X) with the
    # differential bulge inside it, and half-shafts with CV boots that stop at
    # |x| = 0.66, inside the wheel hubs.
    "POWERTRAIN": {
        "center": (0.00, 0.00, 0.36),
        "size": (1.32, 3.00, 0.26),
        "metallic": 0.70,
        "roughness": 0.35,
        "drive_units": [
            {
                "axle_y": REAR_AXLE_Y,
                "axis_z": 0.36,
                "gearbox_center": (-0.38, REAR_AXLE_Y, 0.36),
                "gearbox_size": (0.240, 0.300, 0.260),
                "gearbox_bevel": 0.030,
                "gearbox_bevel_segments": 2,
                "diff_center": (-0.38, REAR_AXLE_Y, 0.36),
                "diff_radius": 0.112,
                "diff_depth": 0.280,
                "diff_segments": 14,
                "shaft_radius": 0.028,
                "shaft_segments": 10,
                "shaft_x_ranges": [(0.240, 0.660), (-0.660, -0.500)],
                "boot_radius": 0.052,
                "boot_depth": 0.065,
                "boot_segments": 12,
                "boot_x": [0.285, 0.622, -0.622],
            },
            {
                "axle_y": FRONT_AXLE_Y,
                "axis_z": 0.36,
                "gearbox_center": (-0.34, FRONT_AXLE_Y, 0.36),
                "gearbox_size": (0.200, 0.260, 0.220),
                "gearbox_bevel": 0.026,
                "gearbox_bevel_segments": 2,
                "diff_center": (-0.34, FRONT_AXLE_Y, 0.36),
                "diff_radius": 0.092,
                "diff_depth": 0.240,
                "diff_segments": 12,
                "shaft_radius": 0.026,
                "shaft_segments": 10,
                "shaft_x_ranges": [(0.200, 0.660), (-0.660, -0.460)],
                "boot_radius": 0.046,
                "boot_depth": 0.058,
                "boot_segments": 10,
                "boot_x": [0.245, 0.630, -0.630],
            },
        ],
    },
    # the two traction motors: a ribbed housing on each axle line with an end
    # bell at either end. Sized to sit inside the POWERTRAIN gearcase / shaft
    # set, so the two blocks read as one drive unit until they are exploded.
    "MOTOR": {
        "center": (0.00, 0.00, 0.36),
        "size": (0.51, 3.00, 0.29),
        "metallic": 0.70,
        "roughness": 0.35,
        "housings": [
            {
                "axle_y": REAR_AXLE_Y,
                "axis_z": 0.36,
                "motor_radius": 0.130,
                "motor_length": 0.400,
                "motor_segments": 16,
                "rib_radius": 0.145,
                "rib_depth": 0.012,
                "rib_segments": 12,
                "rib_x_offsets": [-0.175, -0.125, -0.075, -0.025,
                                  0.025, 0.075, 0.125, 0.175],
                "bell_radius": 0.100,
                "bell_depth": 0.055,
                "bell_x": 0.2275,
                "bell_segments": 12,
            },
            {
                "axle_y": FRONT_AXLE_Y,
                "axis_z": 0.36,
                "motor_radius": 0.108,
                "motor_length": 0.320,
                "motor_segments": 14,
                "rib_radius": 0.120,
                "rib_depth": 0.011,
                "rib_segments": 12,
                "rib_x_offsets": [-0.140, -0.084, -0.028, 0.028, 0.084, 0.140],
                "bell_radius": 0.084,
                "bell_depth": 0.050,
                "bell_x": 0.1850,
                "bell_segments": 12,
            },
        ],
    },
    # traction inverter sitting on the rear motor's ribs
    "INVERTER": {
        "center": (0.00, 1.34, 0.575),
        "size": (0.34, 0.29, 0.13),
        "metallic": 0.60,
        "roughness": 0.40,
        "body_center": (0.00, 1.35, 0.560),
        "body_size": (0.320, 0.260, 0.100),
        "fin_size": (0.018, 0.220, 0.030),
        "fin_center": (0.00, 1.35, 0.625),
        "fin_x_offsets": [-0.126, -0.090, -0.054, -0.018,
                          0.018, 0.054, 0.090, 0.126],
        "hv_port_radius": 0.028,
        "hv_port_depth": 0.055,
        "hv_port_segments": 10,
        "hv_port_centers": [(0.09, 1.225, 0.545), (-0.09, 1.225, 0.545)],
        "lv_port_size": (0.070, 0.045, 0.035),
        "lv_port_center": (0.00, 1.222, 0.590),
    },
    # four vented rotors + hats/hubs, merged into one object. The calipers are
    # their own clickable block (BRAKE_ACT, below). Nothing reaches past
    # |x| = 0.750, so the wheel rims clear the calipers.
    "BRAKES": {
        "center": (0.00, 0.00, 0.345),
        "size": (1.50, 3.03, 0.34),
        "metallic": 0.80,
        "roughness": 0.45,
        "disc_centers": [
            (0.72, FRONT_AXLE_Y, WHEEL_Z),
            (-0.72, FRONT_AXLE_Y, WHEEL_Z),
            (0.72, REAR_AXLE_Y, WHEEL_Z),
            (-0.72, REAR_AXLE_Y, WHEEL_Z),
        ],
        # vented rotor: two friction rings with an air gap between them
        "disc_radius": 0.165,
        "disc_depth": 0.011,
        "disc_gap": 0.030,
        "disc_segments": 16,
        # radial cooling vanes bridging the gap
        "vane_count": 12,
        "vane_radius": 0.112,
        "vane_size": (0.030, 0.070, 0.010),
        # hat + hub, pulled inboard so the rotor face stays clear
        "hat_radius": 0.078,
        "hat_depth": 0.090,
        "hat_x_offset": -0.045,
        "hat_segments": 12,
        "hub_radius": 0.045,
        "hub_depth": 0.060,
        "hub_x_offset": -0.010,
        "hub_segments": 10,
    },
    # the four calipers, straddling the top of each rotor: two bridge blocks
    # with the pad slot between them, a pad housing each side, and the two pads
    # showing through the slot. Offsets are relative to the rotor centre, so
    # ``caliper_centers`` must stay in step with BRAKES ``disc_centers``.
    "BRAKE_ACT": {
        "center": (0.00, 0.00, 0.445),
        "size": (1.50, 2.85, 0.14),
        "metallic": 0.70,
        "roughness": 0.40,
        "caliper_centers": [
            (0.72, FRONT_AXLE_Y, WHEEL_Z),
            (-0.72, FRONT_AXLE_Y, WHEEL_Z),
            (0.72, REAR_AXLE_Y, WHEEL_Z),
            (-0.72, REAR_AXLE_Y, WHEEL_Z),
        ],
        "caliper_bridge_size": (0.058, 0.055, 0.050),
        "caliper_bridge_offsets": [(-0.045, 0.150), (0.045, 0.150)],
        "caliper_side_size": (0.014, 0.150, 0.130),
        "caliper_side_x": 0.022,
        "caliper_side_offset": (0.000, 0.100),
        "caliper_pad_size": (0.010, 0.048, 0.040),
        "caliper_pad_x": 0.014,
        "caliper_pad_offset": (0.000, 0.132),
    },
    # ABS / ESC hydraulic modulator: a small block with six brake-line stubs on
    # top, in the front bay on the car's left, just inboard of and behind the
    # strut tower (tower gusset ends at y = -1.515, expansion tank at y = -1.745)
    "BRAKE_CTRL": {
        "center": (0.55, -1.600, 0.645),
        "size": (0.16, 0.12, 0.17),
        "metallic": 0.35,
        "roughness": 0.45,
        "body_center": (0.55, -1.600, 0.620),
        "body_size": (0.160, 0.120, 0.120),
        "body_bevel": 0.010,
        "stub_radius": 0.009,
        "stub_depth": 0.050,
        "stub_segments": 8,
        "stub_z": 0.705,
        "stub_offsets": [
            (-0.055, -0.028), (0.000, -0.028), (0.055, -0.028),
            (-0.055, 0.028), (0.000, 0.028), (0.055, 0.028),
        ],
    },
    # front cooling pack: radiator core with side tanks, shrouded fan,
    # expansion tank and the two coolant hoses that run back along the car's
    # right (-X) side (the electric pump is its own block, PUMP, below).
    # Everything stays behind y = -2.05 and under z = 0.78 so the nose and the
    # front bumper stay clear.
    "THERMAL": {
        "center": (-0.05, -0.35, 0.49),
        "size": (1.34, 3.30, 0.54),
        "metallic": 0.65,
        "roughness": 0.40,
        "core_center": (0.00, -1.950, 0.550),
        "core_size": (0.800, 0.060, 0.360),
        "fin_center": (0.00, -1.987, 0.550),
        "fin_size": (0.780, 0.014, 0.016),
        "fin_z_offsets": [-0.150, -0.100, -0.050, 0.000, 0.050, 0.100, 0.150],
        "tank_size": (0.070, 0.090, 0.420),
        "tank_centers": [(0.435, -1.950, 0.550), (-0.435, -1.950, 0.550)],
        # fan shroud: an open ring, so it reads as a duct rather than a disc
        "shroud_center": (0.00, -1.880, 0.550),
        "shroud_radius": 0.200,
        "shroud_depth": 0.070,
        "shroud_segments": 16,
        "fan_hub_center": (0.00, -1.880, 0.550),
        "fan_hub_radius": 0.050,
        "fan_hub_depth": 0.050,
        "fan_hub_segments": 12,
        "fan_blade_count": 7,
        "fan_blade_radius": 0.120,
        "fan_blade_size": (0.130, 0.012, 0.048),
        "expansion_center": (0.56, -1.800, 0.615),
        "expansion_radius": 0.055,
        "expansion_depth": 0.170,
        "expansion_segments": 12,
        "expansion_cap_center": (0.56, -1.800, 0.715),
        "expansion_cap_radius": 0.030,
        "expansion_cap_depth": 0.030,
        "expansion_cap_segments": 8,
        "hose_radius": 0.021,
        "hose_sides": 8,
        # both hoses hug the right rocker, clear of the wheels (|x| <= 0.669
        # wherever a wheel is) and clear of the half-shafts
        "hoses": [
            # radiator right tank -> battery pack front right corner
            [(-0.435, -1.905, 0.480), (-0.520, -1.820, 0.420),
             (-0.550, -1.680, 0.360), (-0.575, -1.480, 0.290),
             (-0.585, -1.300, 0.275), (-0.600, -1.080, 0.285),
             (-0.618, -0.985, 0.300)],
            # radiator -> pump -> right rocker -> rear drive unit
            [(-0.400, -1.900, 0.430), (-0.500, -1.830, 0.380),
             (-0.560, -1.700, 0.330), (-0.640, -1.480, 0.265),
             (-0.648, -1.200, 0.255), (-0.680, -1.000, 0.250),
             (-0.690, 0.600, 0.250), (-0.648, 1.010, 0.280),
             (-0.620, 1.180, 0.350), (-0.530, 1.280, 0.420)],
        ],
    },
    # electric coolant pump, sitting inline on the rear coolant hose (the hose
    # itself stays in THERMAL and runs through the pump body)
    "PUMP": {
        "center": (-0.545, -1.720, 0.360),
        "size": (0.096, 0.110, 0.096),
        "metallic": 0.50,
        "roughness": 0.40,
        "pump_center": (-0.545, -1.720, 0.360),
        "pump_radius": 0.048,
        "pump_depth": 0.110,
        "pump_segments": 12,
    },
    # coolant / fan controller, tucked outboard of the expansion tank
    "THERM_CTRL": {
        "center": (0.30, -1.790, 0.703),
        "size": (0.16, 0.14, 0.09),
        "metallic": 0.00,
        "roughness": 0.50,
        "body_center": (0.30, -1.780, 0.695),
        "body_size": (0.140, 0.100, 0.060),
        "fin_center": (0.30, -1.780, 0.733),
        "fin_size": (0.120, 0.012, 0.016),
        "fin_y_offsets": [-0.030, 0.000, 0.030],
        "connector_size": (0.050, 0.030, 0.030),
        "connector_center": (0.30, -1.840, 0.685),
    },
    # vehicle controller on the tunnel: finned alloy lid, two connector banks
    "VCONTROL": {
        "center": (0.00, -0.615, 0.635),
        "size": (0.34, 0.24, 0.11),
        "metallic": 0.50,
        "roughness": 0.40,
        "body_center": (0.00, -0.600, 0.620),
        "body_size": (0.260, 0.200, 0.055),
        "body_bevel": 0.008,
        "lid_center": (0.00, -0.600, 0.6545),
        "lid_size": (0.240, 0.180, 0.014),
        "fin_center": (0.00, -0.600, 0.6735),
        "fin_size": (0.220, 0.014, 0.024),
        "fin_y_offsets": [-0.060, -0.040, -0.020, 0.000, 0.020, 0.040, 0.060],
        "connector_size": (0.090, 0.035, 0.032),
        "connector_centers": [(0.065, -0.7175, 0.620), (-0.065, -0.7175, 0.620)],
        "tab_size": (0.035, 0.045, 0.008),
        "tab_centers": [
            (0.148, -0.660, 0.598), (-0.148, -0.660, 0.598),
            (0.148, -0.540, 0.598), (-0.148, -0.540, 0.598),
        ],
    },
    # OBD-II service port under the dash, driver side, opening toward the cabin
    "DIAG": {
        "center": (0.45, -0.750, 0.680),
        "size": (0.11, 0.072, 0.050),
        "metallic": 0.00,
        "roughness": 0.50,
        "shell_center": (0.45, -0.750, 0.680),
        "shell_size": (0.100, 0.060, 0.038),
        "trapezoid_top_scale": 0.7,
        "pin_size": (0.009, 0.006, 0.008),
        "pin_y": -0.7185,
        "pin_x_offsets": [-0.030, -0.010, 0.010, 0.030],
        "pin_z_offsets": [-0.009, 0.007],
    },
    # secure diagnostic gateway, on the dash rail just inboard of the OBD port
    # (DIAG shell ends at y = -0.7155, so this starts at y = -0.705)
    "DIAG_GATEWAY": {
        "center": (0.55, -0.645, 0.660),
        "size": (0.12, 0.12, 0.03),
        "metallic": 0.10,
        "roughness": 0.50,
        "body_center": (0.55, -0.660, 0.660),
        "body_size": (0.120, 0.090, 0.030),
        "connector_center": (0.55, -0.600, 0.658),
        "connector_size": (0.034, 0.030, 0.016),
    },
    # cockpit: dashboard, binnacle, screen, vents, wheel, pedals, selector
    "HMI": {
        "center": (0.00, -0.695, 0.750),
        "size": (1.56, 0.98, 0.85),
        "metallic": 0.05,
        "roughness": 0.55,
        # sculpted dash section: a closed (y, z) silhouette extruded across X.
        # The run back along the inside makes it a shell open underneath, so
        # the cutaway shows a dash moulding rather than a solid log.
        "dash_profile": [
            # sits just behind the cowl (y >= -0.925) and under the windshield glass
            (-0.925, 0.740), (-0.925, 0.942), (-0.856, 0.992), (-0.719, 0.975),
            (-0.633, 0.950), (-0.581, 0.908), (-0.564, 0.841), (-0.577, 0.782),
            (-0.611, 0.753), (-0.637, 0.786), (-0.611, 0.845), (-0.628, 0.900),
            (-0.667, 0.921), (-0.736, 0.937), (-0.848, 0.946), (-0.878, 0.912),
            (-0.878, 0.740),
        ],
        "dash_width": 1.55,
        "binnacle_center": (0.38, -0.735, 0.995),
        "binnacle_size": (0.340, 0.170, 0.065),
        "screen_center": (0.00, -0.580, 0.960),
        "screen_size": (0.420, 0.018, 0.220),
        "screen_tilt_deg": -8.0,
        # two oval vents per side, squashed cylinders facing the cabin
        "vent_centers": [
            (0.66, -0.605, 0.90), (0.48, -0.605, 0.90),
            (-0.48, -0.605, 0.90), (-0.66, -0.605, 0.90),
        ],
        "vent_radius": 0.045,
        "vent_depth": 0.030,
        "vent_segments": 10,
        "vent_scale": (1.55, 0.70, 1.00),
        "wheel_center": (0.38, -0.44, 1.00),
        "wheel_tilt_deg": 62,
        "wheel_major_radius": 0.170,
        "wheel_minor_radius": 0.022,
        "wheel_major_segments": 18,
        "wheel_minor_segments": 6,
        "hub_radius": 0.050,
        "hub_depth": 0.050,
        "hub_segments": 12,
        "spoke_count": 3,
        "spoke_radius": 0.090,
        "spoke_size": (0.160, 0.024, 0.012),
        "column_radius": 0.022,
        "column_segments": 8,
        "column_dash_point": (0.38, -0.70, 0.90),
        "stalk_radius": 0.010,
        "stalk_depth": 0.130,
        "stalk_segments": 6,
        "stalk_centers": [(0.465, -0.530, 0.950), (0.295, -0.530, 0.950)],
        # driver footwell: accelerator + brake plates on stalks
        "pedal_tilt_deg": 20.0,
        "pedals": [
            ((0.320, -1.100, 0.360), (0.070, 0.160, 0.012)),
            ((0.450, -1.080, 0.380), (0.090, 0.140, 0.012)),
        ],
        "pedal_stalk_radius": 0.012,
        "pedal_stalk_depth": 0.150,
        "pedal_stalk_segments": 6,
        "pedal_stalk_centers": [(0.320, -1.135, 0.455), (0.450, -1.115, 0.475)],
        "console_center": (0.00, -0.340, 0.600),
        "console_size": (0.140, 0.260, 0.160),
        "selector_center": (0.00, -0.340, 0.705),
        "selector_size": (0.100, 0.160, 0.050),
        "knob_center": (0.00, -0.340, 0.765),
        "knob_radius": 0.028,
        "knob_depth": 0.070,
        "knob_segments": 10,
    },
    # radar, windshield camera, ultrasonics and the rear camera, merged into
    # one object. The four wheel-speed pucks are their own clickable block
    # (WHEEL_SENSOR, below).
    "SENSORS": {
        "center": (0.00, 0.00, 0.936),
        "size": (0.66, 4.40, 0.88),
        "metallic": 0.10,
        "roughness": 0.45,
        "radar_center": (0.00, -2.140, 0.580),
        "radar_size": (0.180, 0.050, 0.100),
        "radar_face_center": (0.00, -2.175, 0.580),
        "radar_face_size": (0.140, 0.020, 0.070),
        "camera_center": (0.00, -0.340, 1.350),
        "camera_size": (0.100, 0.100, 0.050),
        "camera_lens_center": (0.00, -0.400, 1.330),
        "camera_lens_radius": 0.018,
        "camera_lens_depth": 0.040,
        "camera_lens_segments": 8,
        # ultrasonic discs, two per bumper
        "ultrasonic_radius": 0.024,
        "ultrasonic_depth": 0.020,
        "ultrasonic_segments": 10,
        "ultrasonic_centers": [
            (0.30, -2.185, 0.520), (-0.30, -2.185, 0.520),
            (0.30, 2.185, 0.580), (-0.30, 2.185, 0.580),
        ],
        "rear_camera_center": (0.00, 2.175, 0.920),
        "rear_camera_radius": 0.030,
        "rear_camera_depth": 0.025,
        "rear_camera_segments": 10,
    },
    # wheel-speed sensors: a puck plus a short cable stub running inboard,
    # dropped to z = 0.26 so they clear the half-shaft CV boots
    "WHEEL_SENSOR": {
        "center": (0.00, 0.00, 0.260),
        "size": (1.35, 2.76, 0.056),
        "metallic": 0.10,
        "roughness": 0.45,
        "puck_radius": 0.028,
        "puck_depth": 0.030,
        "puck_segments": 10,
        "puck_centers": [
            (0.66, FRONT_AXLE_Y, 0.26),
            (-0.66, FRONT_AXLE_Y, 0.26),
            (0.66, REAR_AXLE_Y, 0.26),
            (-0.66, REAR_AXLE_Y, 0.26),
        ],
        "stub_radius": 0.008,
        "stub_depth": 0.070,
        "stub_segments": 6,
        "stub_x_offset": -0.045,
    },
    # sensor-fusion module: a flat box with one connector, on the tunnel next
    # to the vehicle controller. Offset to the passenger side (-X) because
    # VCONTROL already owns x -0.17 .. 0.17 at y = -0.615.
    "FUSION": {
        "center": (-0.30, -0.635, 0.660),
        "size": (0.20, 0.19, 0.04),
        "metallic": 0.30,
        "roughness": 0.45,
        "body_center": (-0.30, -0.620, 0.660),
        "body_size": (0.200, 0.160, 0.040),
        "body_bevel": 0.006,
        "connector_center": (-0.30, -0.715, 0.655),
        "connector_size": (0.050, 0.030, 0.025),
    },
    # what is left of the charging system once the socket and its door move to
    # CHARGE_PORT: the slim mounting bezel / back box let into the rear quarter
    # panel, just inboard of the door (door inner face is at x = 0.850).
    "CHARGE": {
        "center": (0.820, 1.900, 0.780),
        "size": (0.06, 0.22, 0.22),
        "metallic": 0.30,
        "roughness": 0.45,
        "bezel_center": (0.820, 1.900, 0.780),
        "bezel_size": (0.060, 0.220, 0.220),
        "bezel_bevel": 0.008,
    },
    # charge door on the car's left rear quarter, flush with the body side.
    # CCS-style face: two big DC pins under a ring of 7 small AC pins.
    "CHARGE_PORT": {
        "center": (0.881, 1.899, 0.78),
        "size": (0.062, 0.224, 0.20),
        "metallic": 0.30,
        "roughness": 0.45,
        "door_center": (0.858, 1.900, 0.780),
        "door_size": (0.016, 0.220, 0.200),
        "hinge_center": (0.862, 1.795, 0.780),
        "hinge_radius": 0.007,
        "hinge_depth": 0.200,
        "hinge_segments": 8,
        "socket_center": (0.884, 1.900, 0.790),
        "socket_radius": 0.062,
        "socket_depth": 0.036,
        "socket_segments": 16,
        # status LED ring: an open ring around the socket, geometry only
        "led_center": (0.898, 1.900, 0.790),
        "led_radius": 0.072,
        "led_depth": 0.014,
        "led_segments": 16,
        "ac_center": (0.898, 1.900, 0.815),
        "ac_count": 7,
        "ac_ring_radius": 0.030,
        "ac_pin_radius": 0.007,
        "ac_pin_depth": 0.016,
        "ac_pin_segments": 6,
        "dc_pin_radius": 0.017,
        "dc_pin_depth": 0.018,
        "dc_pin_segments": 8,
        "dc_pin_centers": [(0.898, 1.882, 0.752), (0.898, 1.918, 0.752)],
    },
    # onboard charger: an AC/DC box on the boot floor behind the battery pack,
    # on the charge-door side. Kept at x <= 0.40 to clear the left frame rail
    # (x 0.42 - 0.50, y 1.125 - 1.975) and at z >= 0.305 so it stays above the
    # rear subframe crossmember (z <= 0.2825) and inside the underbody line
    # (z ~ 0.30 at y = 1.85). Well clear of the rear drive unit at y <= 1.50.
    "OBC": {
        "center": (0.25, 1.830, 0.350),
        "size": (0.30, 0.26, 0.09),
        "metallic": 0.40,
        "roughness": 0.45,
        "body_center": (0.25, 1.850, 0.350),
        "body_size": (0.300, 0.220, 0.090),
        "body_bevel": 0.010,
        # two connector bosses on the forward face, pointing at the pack
        "boss_radius": 0.024,
        "boss_depth": 0.050,
        "boss_segments": 10,
        "boss_centers": [(0.18, 1.725, 0.350), (0.32, 1.725, 0.350)],
    },
}

# --------------------------------------------------------------------------
# decor (not clickable). Colors live here only, per contract section 4.
# --------------------------------------------------------------------------
COLOR_GLASS = "#BFE3F5"
ALPHA_GLASS = 0.25
COLOR_TIRE = "#2B2B2B"
COLOR_RIM = "#C8C8C8"
COLOR_RIM_DARK = "#2F3540"
COLOR_SEAT = "#4A4A4A"
COLOR_FLOW = "#FFA500"
FLOW_EMISSION_STRENGTH = 2.0

#: opaque exterior trim / pillar / grille, satin dark
COLOR_TRIM = "#1F2937"
#: lamps. Emissive strength exports as KHR_materials_emissive_strength.
COLOR_LIGHT_FRONT = "#E0F2FE"
COLOR_LIGHT_REAR = "#EF4444"
LIGHT_EMISSION_STRENGTH = 2.0
#: structural layer
COLOR_STEEL = "#4B5563"
COLOR_SPRING = "#9CA3AF"

#: greenhouse. Built as flat panels rather than one extrusion so the pillars
#: can carry their own (opaque) material slot. Every entry is
#: ``(center, size, rot_x_deg)``; ``rot_x_deg`` rakes a panel about its own X
#: axis, positive = top leans toward the tail.
CANOPY = {
    "glass": [
        ((0.00, -0.680, 1.175), (1.380, 0.918, 0.022), 29.34),   # windshield
        ((0.00, 0.165, 1.428), (1.340, 0.900, 0.020), 0.0),      # panoramic roof
        ((0.00, 0.950, 1.225), (1.340, 0.822, 0.022), -31.57),   # rear glass
        ((0.752, -0.065, 1.208), (0.018, 0.390, 0.415), 0.0),    # front door glass
        ((-0.752, -0.065, 1.208), (0.018, 0.390, 0.415), 0.0),
        ((0.752, 0.425, 1.208), (0.018, 0.470, 0.415), 0.0),     # rear door glass
        ((-0.752, 0.425, 1.208), (0.018, 0.470, 0.415), 0.0),
    ],
    "pillars": [
        ((0.716, -0.680, 1.175), (0.040, 0.918, 0.042), 29.34),  # A-pillar
        ((-0.716, -0.680, 1.175), (0.040, 0.918, 0.042), 29.34),
        ((0.748, 0.160, 1.200), (0.036, 0.052, 0.430), 0.0),     # B-pillar
        ((-0.748, 0.160, 1.200), (0.036, 0.052, 0.430), 0.0),
        ((0.702, 0.950, 1.225), (0.044, 0.822, 0.046), -31.57),  # C-pillar
        ((-0.702, 0.950, 1.225), (0.044, 0.822, 0.046), -31.57),
        ((0.00, -0.292, 1.412), (1.430, 0.044, 0.032), 0.0),     # front header
        ((0.00, 0.618, 1.422), (1.390, 0.044, 0.032), 0.0),      # rear header
    ],
    "glass_roughness": 0.05,
}

#: name -> wheel center. FL/FR are the front (nose, -Y) pair; +X is car-left.
WHEELS = {
    "DECOR_wheel_FL": (HALF_TRACK, FRONT_AXLE_Y, WHEEL_Z),
    "DECOR_wheel_FR": (-HALF_TRACK, FRONT_AXLE_Y, WHEEL_Z),
    "DECOR_wheel_RL": (HALF_TRACK, REAR_AXLE_Y, WHEEL_Z),
    "DECOR_wheel_RR": (-HALF_TRACK, REAR_AXLE_Y, WHEEL_Z),
}

# Wheel cross-section, revolved around the wheel axis: ``(radius, axial)`` pairs
# measured from the axis, axial running inboard (negative) -> outboard. The
# barrel stays open toward the brake disc at x = +/-0.72 so the discs read
# through the x-ray shell and between the spokes.
TIRE_BEAD_RADIUS = 0.225
TIRE_PROFILE = [
    (0.225, -0.1105),
    (0.264, -0.1240),      # sidewall bulge
    (0.318, -0.1140),      # shoulder
    (0.338, -0.0990),
    (0.340, -0.0870),      # tread
    (0.340, 0.0870),
    (0.338, 0.0990),
    (0.318, 0.1140),
    (0.264, 0.1240),
    (0.225, 0.1105),
]

#: shallow raised tread blocks, an inset ring on the tread face
TREAD_BLOCK_COUNT = 12
TREAD_BLOCK_RADIUS = 0.3385
TREAD_BLOCK_SIZE = (0.055, 0.150, 0.012)    # tangential, axial, radial

# Rim: an open ten-spoke face. Nothing closes the barrel, so the brake disc at
# x = +/-0.72 reads through the spoke gaps. Both rings are ``(radius, axial)``
# rectangles revolved around the wheel axis, so neither one caps the wheel off.
RIM_SEGMENTS = 12
#: silver outer lip, at the tire bead
RIM_LIP_PROFILE = [(0.208, 0.076), (0.222, 0.076),
                   (0.222, 0.112), (0.208, 0.112)]
#: dark inner barrel, visible between the spokes
RIM_BARREL_PROFILE = [(0.196, -0.035), (0.214, -0.035),
                      (0.214, 0.076), (0.196, 0.076)]
HUB_RADIUS = 0.072
HUB_INNER_X = 0.072
HUB_OUTER_X = 0.116
HUB_SEGMENTS = 12
HUB_FLANGE_RADIUS = 0.100
HUB_FLANGE_INNER_X = 0.056
HUB_FLANGE_OUTER_X = 0.076
HUB_FLANGE_SEGMENTS = 10
SPOKE_COUNT = 10
SPOKE_INNER_RADIUS = 0.085
SPOKE_OUTER_RADIUS = 0.216
SPOKE_WIDTH = 0.034
SPOKE_THICKNESS = 0.022
SPOKE_X = 0.096

#: Positive degrees lean a backrest toward the tail (+Y).
SEAT_BACK_TILT_DEG = 14.0
SEAT_BENCH_TILT_DEG = 18.0

#: name -> ordered list of ``(center, size, tilt_deg)`` boxes. ``tilt_deg``
#: rotates the box about X about its own center. The cabin floor sits at
#: z = 0.40; front seats are bolstered (cushion base + pad + two side bolsters,
#: backrest + two bolsters + headrest).
SEATS = {
    "DECOR_console": [
        ((0.00, -0.100, 0.500), (0.26, 0.62, 0.20), 0.0),
        ((0.00, 0.030, 0.622), (0.24, 0.34, 0.05), 0.0),
        ((0.00, -0.300, 0.578), (0.22, 0.18, 0.03), 0.0),
    ],
    "DECOR_seat_L": [
        ((0.380, -0.180, 0.445), (0.48, 0.50, 0.09), 0.0),
        ((0.380, -0.190, 0.508), (0.40, 0.46, 0.05), 0.0),
        ((0.175, -0.180, 0.505), (0.06, 0.46, 0.07), 0.0),
        ((0.585, -0.180, 0.505), (0.06, 0.46, 0.07), 0.0),
        ((0.380, 0.105, 0.700), (0.40, 0.12, 0.44), SEAT_BACK_TILT_DEG),
        ((0.185, 0.070, 0.700), (0.05, 0.16, 0.42), SEAT_BACK_TILT_DEG),
        ((0.575, 0.070, 0.700), (0.05, 0.16, 0.42), SEAT_BACK_TILT_DEG),
        ((0.380, 0.190, 1.010), (0.26, 0.10, 0.17), SEAT_BACK_TILT_DEG),
    ],
    "DECOR_seat_R": [
        ((-0.380, -0.180, 0.445), (0.48, 0.50, 0.09), 0.0),
        ((-0.380, -0.190, 0.508), (0.40, 0.46, 0.05), 0.0),
        ((-0.175, -0.180, 0.505), (0.06, 0.46, 0.07), 0.0),
        ((-0.585, -0.180, 0.505), (0.06, 0.46, 0.07), 0.0),
        ((-0.380, 0.105, 0.700), (0.40, 0.12, 0.44), SEAT_BACK_TILT_DEG),
        ((-0.185, 0.070, 0.700), (0.05, 0.16, 0.42), SEAT_BACK_TILT_DEG),
        ((-0.575, 0.070, 0.700), (0.05, 0.16, 0.42), SEAT_BACK_TILT_DEG),
        ((-0.380, 0.190, 1.010), (0.26, 0.10, 0.17), SEAT_BACK_TILT_DEG),
    ],
    "DECOR_seat_rear": [
        ((0.00, 0.820, 0.445), (1.32, 0.50, 0.09), 0.0),
        ((0.00, 0.810, 0.508), (1.24, 0.46, 0.05), 0.0),
        ((0.00, 1.100, 0.720), (1.28, 0.12, 0.48), SEAT_BENCH_TILT_DEG),
        ((0.36, 1.180, 1.020), (0.26, 0.10, 0.15), SEAT_BENCH_TILT_DEG),
        ((-0.36, 1.180, 1.020), (0.26, 0.10, 0.15), SEAT_BENCH_TILT_DEG),
    ],
}

# --------------------------------------------------------------------------
# exterior decor: lamps, mirrors, grille, handles, trim.
# Boxes are ``(center, size)``; entries under a ``*_pair`` key are authored for
# the car-left (+X) side and mirrored onto -X by the builder.
# --------------------------------------------------------------------------
EXTERIOR = {
    "headlights": [
        ((0.00, -2.190, 0.706), (1.66, 0.026, 0.020)),          # full-width DRL
    ],
    "headlights_pair": [
        ((0.545, -2.188, 0.700), (0.50, 0.032, 0.062)),         # main lamp bar
        ((0.822, -2.198, 0.520), (0.038, 0.030, 0.160)),        # vertical blade
    ],
    "taillights": [
        ((0.00, 2.196, 0.862), (1.72, 0.032, 0.062)),           # full-width bar
        ((0.00, 2.186, 0.940), (0.86, 0.028, 0.018)),           # high-mount strip
    ],
    "taillights_pair": [
        ((0.852, 2.150, 0.862), (0.042, 0.110, 0.062)),         # wrap-around cap
    ],
    "mirrors_pair": [
        ((0.895, -0.930, 0.995), (0.090, 0.060, 0.035)),        # stalk
        ((0.975, -0.965, 1.020), (0.095, 0.190, 0.085)),        # housing
    ],
    "grille": [
        ((0.00, -2.202, 0.600), (1.14, 0.024, 0.062)),          # closed fascia band
        ((0.00, -2.188, 0.600), (1.00, 0.022, 0.034)),          # recessed centre
        ((0.00, -2.208, 0.410), (1.48, 0.026, 0.072)),          # lower intake
        ((0.00, -2.196, 0.410), (1.30, 0.022, 0.034)),          # intake mesh line
    ],
    "grille_pair": [
        ((0.706, -2.186, 0.420), (0.100, 0.050, 0.130)),        # air curtain
    ],
    "plates": [
        ((0.00, -2.208, 0.320), (0.50, 0.018, 0.110)),
        ((0.00, 2.208, 0.560), (0.50, 0.018, 0.110)),
    ],
    "trim": [
        ((0.00, 0.700, 1.452), (0.036, 0.240, 0.036)),          # roof shark fin (slim antenna)
        ((0.00, 2.030, 1.078), (1.36, 0.120, 0.022)),           # spoiler lip cap
        ((0.00, 2.040, 0.262), (1.10, 0.140, 0.030)),           # rear diffuser
        ((0.00, -1.085, 0.974), (1.55, 0.016, 0.014)),          # cowl shut line
        ((0.00, -1.995, 0.870), (1.62, 0.016, 0.014)),          # hood shut line
    ],
    "diffuser_fin_x": [-0.42, -0.14, 0.14, 0.42],
    "diffuser_fin_size": (0.030, 0.160, 0.075),
    "diffuser_fin_center": (2.030, 0.252),                      # (y, z)
}

#: side-mounted strips. ``(y_center, y_len, z_center, z_len, thickness, proud)``
#: mirrored to both sides; x is taken from the body surface at (y, z) so the
#: strip follows the tumblehome and the arch flare.
EXTERIOR_SIDE_STRIPS = [
    (0.120, 2.320, 0.868, 0.012, 0.012, 0.002),     # shoulder crease (hairline)
    (0.120, 2.320, 0.980, 0.018, 0.016, 0.003),     # window surround / belt trim
    (0.000, 1.920, 0.248, 0.062, 0.026, 0.003),     # rocker trim / side skirt
]

#: flush door handles: ``(y_center, z_center)`` per side
EXTERIOR_HANDLES = [(-0.320, 0.930), (0.620, 0.930)]
EXTERIOR_HANDLE_SIZE = (0.022, 0.165, 0.032)        # thickness, y, z
EXTERIOR_HANDLE_PROUD = 0.004

#: door shut lines: ``(y, z_lo, z_hi)``. Each is built as several short strips
#: so it hugs the tapered flank instead of cutting through it.
EXTERIOR_DOOR_SEAMS = [(-1.020, 0.330, 0.985), (0.055, 0.330, 0.985),
                       (0.775, 0.330, 0.985)]
EXTERIOR_SEAM_SEGMENTS = 4
EXTERIOR_SEAM_SIZE = (0.010, 0.010)                 # thickness, y width
EXTERIOR_SEAM_PROUD = 0.0015

# --------------------------------------------------------------------------
# structural layer: floor pan, frame rails, subframes, strut towers, steering,
# and a coil-over / control-arm / knuckle set per corner.
# Everything here is authored to clear BRAKES (discs at x = +/-0.72, y = +/-1.35,
# r 0.16), POWERTRAIN (drive units at y = +/-1.35, z 0.23..0.49) and ENERGY
# (slab x +/-0.62, y +/-1.00, z 0.22..0.36).
# ``*_pair`` boxes are authored for +X and mirrored onto -X.
# --------------------------------------------------------------------------
CHASSIS = {
    "floor_pan": ((0.00, 0.00, 0.200), (1.34, 2.640, 0.022)),
    # longitudinal rails: wide amidships (outboard of the battery), kicked in at
    # both ends so they miss the brake discs and meet the subframes
    "rails_pair": [
        ((0.700, 0.000, 0.265), (0.085, 2.100, 0.130)),
        ((0.460, -1.530, 0.262), (0.080, 0.850, 0.110)),
        ((0.460, 1.550, 0.262), (0.080, 0.850, 0.110)),
        ((0.580, -1.075, 0.265), (0.240, 0.090, 0.120)),        # front kick-in
        ((0.580, 1.075, 0.265), (0.240, 0.090, 0.120)),         # rear kick-in
    ],
    # rectangular tube loop around each drive unit
    "subframes": [
        ((0.00, -1.600, 0.245), (0.980, 0.075, 0.075)),
        ((0.00, -1.140, 0.245), (0.980, 0.075, 0.075)),
        ((0.00, 1.120, 0.245), (1.020, 0.075, 0.075)),
        ((0.00, 1.620, 0.245), (1.020, 0.075, 0.075)),
    ],
    "subframes_pair": [
        ((0.455, -1.370, 0.245), (0.075, 0.535, 0.075)),
        ((0.475, 1.370, 0.245), (0.075, 0.575, 0.075)),
    ],
    # front strut towers: a top plate on two gussets, clear of the disc at x 0.72
    "towers_pair": [
        ((0.545, -1.350, 0.720), (0.300, 0.300, 0.040)),        # top plate
        ((0.545, -1.500, 0.590), (0.240, 0.030, 0.240)),        # gusset
        ((0.545, -1.200, 0.590), (0.240, 0.030, 0.240)),
        ((0.560, 1.350, 0.670), (0.240, 0.220, 0.045)),         # rear upper mount
    ],
    # rear multilink: upper camber link and lower toe link
    "rear_links_pair": [
        ((0.600, 1.520, 0.470), (0.170, 0.055, 0.045)),
        ((0.600, 1.180, 0.300), (0.170, 0.050, 0.045)),
    ],
    "steering_rack": ((0.00, -1.050, 0.300), 0.032, 1.100),     # center, r, length
    "steering_rack_segments": 12,
    #: tie rods, authored +X and mirrored: (inboard point, outboard point)
    "tie_rods_pair": [((0.545, -1.050, 0.300), (0.700, -1.160, 0.300))],
    "tie_rod_size": (0.028, 0.028),
}

#: one coil-over / arm / knuckle set per corner. Front and rear differ only in
#: where the top of the strut is anchored.
SUSPENSION = {
    "arm_inner_x": 0.420,
    "arm_outer_x": 0.685,
    "arm_z_inner": 0.222,
    "arm_z_outer": 0.232,
    "arm_size": (0.062, 0.045),                  # width, height
    "knuckle_center_x": 0.790,
    "knuckle_size": (0.045, 0.130, 0.230),
    "strut_bottom": (0.530, 0.275),              # (x, z)
    "strut_top_front": (0.545, 0.690),           # (x, z)
    "strut_top_rear": (0.545, 0.640),
    "damper_radius": 0.030,
    "damper_segments": 10,
    "damper_fraction": 0.62,                     # lower part of the axis
    "rod_radius": 0.014,
    "rod_segments": 8,
    "spring_radius": 0.066,
    "wire_radius": 0.011,
    "spring_turns": 10,
    "spring_steps_per_turn": 6,
    "spring_profile_segments": 5,
    "spring_span": (0.10, 0.94),                 # fraction of the strut axis
    "seat_size": (0.180, 0.180, 0.022),
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
    # -- low-voltage harnesses: down the tunnel centerline at z = 0.420 ------
    ("HMI", "VCONTROL"): [
        (0.000, -0.880, 0.760), (0.010, -0.800, 0.700),
        (-0.020, -0.750, 0.650), (-0.050, -0.737, 0.620),
    ],
    ("SENSORS", "VCONTROL"): [
        # dives under the radiator core, arches over the front motor ribs,
        # then runs the tunnel back to the ECU's right connector bank
        (0.000, -2.140, 0.560), (-0.100, -2.100, 0.420),
        (-0.130, -2.040, 0.320), (-0.140, -1.870, 0.300),
        (-0.140, -1.620, 0.330), (-0.110, -1.440, 0.490),
        (-0.100, -1.350, 0.510), (-0.090, -1.260, 0.500),
        (-0.070, -1.000, 0.420), (-0.060, -0.820, 0.420),
        (-0.065, -0.745, 0.560), (-0.065, -0.735, 0.605),
    ],
    ("VCONTROL", "POWERTRAIN"): [
        (0.000, -0.500, 0.610), (0.040, -0.440, 0.450),
        (0.050, -0.300, 0.420), (0.050, 0.900, 0.420),
        (0.050, 1.100, 0.430), (0.020, 1.180, 0.540),
        (0.000, 1.198, 0.590),
    ],
    ("VCONTROL", "BRAKES"): [
        # ends on top of the front-right caliper, reaching it through the
        # open rim barrel
        (-0.060, -0.600, 0.600), (-0.130, -0.620, 0.470),
        (-0.200, -0.680, 0.420), (-0.380, -0.820, 0.400),
        (-0.560, -1.020, 0.395), (-0.660, -1.180, 0.420),
        (-0.710, -1.260, 0.470), (-0.720, -1.310, 0.500),
    ],
    ("DIAG", "VCONTROL"): [
        (0.450, -0.720, 0.680), (0.300, -0.720, 0.640),
        (0.150, -0.730, 0.622), (0.075, -0.733, 0.620),
    ],
    # -- high voltage: out of the pack's junction box, up the left rocker ---
    ("ENERGY", "POWERTRAIN"): [
        # leaves the left HV boss, passes outboard of the motor end bell and
        # lands on the inverter's left flank
        (0.140, 0.985, 0.328), (0.280, 1.080, 0.330),
        (0.320, 1.200, 0.400), (0.240, 1.300, 0.500),
        (0.175, 1.330, 0.545),
    ],
    ("CHARGE", "ENERGY"): [
        # charge port -> left rocker lane at x = 0.66 (inboard of the rear
        # wheel, outboard of the pack) -> HV junction box. It drops almost
        # straight down first so it passes under the CHARGE mounting bezel
        # (x 0.79 - 0.85, z 0.67 - 0.89) instead of through it.
        (0.870, 1.900, 0.762), (0.862, 1.880, 0.640), (0.800, 1.820, 0.560),
        (0.680, 1.720, 0.400), (0.660, 1.560, 0.300),
        (0.660, 1.100, 0.300), (0.400, 1.020, 0.315),
        (0.140, 0.985, 0.325),
    ],
    ("POWERTRAIN", "INVERTER"): [
        (0.090, 1.250, 0.450), (0.095, 1.210, 0.500), (0.090, 1.196, 0.545),
    ],
    ("INVERTER", "POWERTRAIN"): [
        (-0.090, 1.196, 0.545), (-0.095, 1.210, 0.500), (-0.090, 1.250, 0.450),
    ],
    # -- coolant: pack to radiator down the car's right side ----------------
    ("ENERGY", "THERMAL"): [
        # runs above the pack lid and above the front half-shaft, parallel to
        # (but clear of) the two physical hoses inside the THERMAL mesh
        (-0.400, -0.975, 0.350), (-0.520, -1.080, 0.400),
        (-0.560, -1.300, 0.430), (-0.545, -1.500, 0.430),
        (-0.480, -1.760, 0.450), (-0.430, -1.880, 0.490),
    ],
    ("THERMAL", "THERM_CTRL"): [
        (0.250, -1.930, 0.690), (0.280, -1.870, 0.700), (0.300, -1.835, 0.700),
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
