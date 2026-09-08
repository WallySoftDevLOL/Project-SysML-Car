"""Part builder registry.

``BUILDERS`` maps a blocks.json block id to ``function(ctx) -> object``.
``DECOR_BUILDERS`` and ``FLOW_BUILDERS`` are ordered lists of
``function(ctx) -> [objects]``; they are not keyed by block id because a single
call can emit several (or zero) objects.

Build order is: blocks in blocks.json order, then DECOR_BUILDERS, then
FLOW_BUILDERS. Keep it deterministic - the glb must be byte-reproducible.
"""

from . import (
    body,
    brakes,
    charge,
    chassis,
    control,
    energy,
    exterior,
    flows,
    hmi,
    powertrain,
    sensors,
    thermal,
    wheels,
)

#: block id -> builder. Must cover every id in data/blocks.json, exactly once.
BUILDERS = {
    "VEH": body.build_veh,
    "POWERTRAIN": powertrain.build_powertrain,
    "INVERTER": powertrain.build_inverter,
    "ENERGY": energy.build_energy,
    "BMS": energy.build_bms,
    "VCONTROL": control.build_vcontrol,
    "BRAKES": brakes.build_brakes,
    "THERMAL": thermal.build_thermal,
    "THERM_CTRL": thermal.build_therm_ctrl,
    "SENSORS": sensors.build_sensors,
    "HMI": hmi.build_hmi,
    "CHARGE": charge.build_charge,
    "DIAG": control.build_diag,
}

#: non-clickable scenery, in build order
DECOR_BUILDERS = [
    wheels.build_wheels,
    body.build_canopy,
    body.build_seats,
    exterior.build_exterior,
    chassis.build_structure,
]

#: harness tubes, built last (they need model.json)
FLOW_BUILDERS = [
    flows.build_flows,
]

__all__ = ["BUILDERS", "DECOR_BUILDERS", "FLOW_BUILDERS"]
