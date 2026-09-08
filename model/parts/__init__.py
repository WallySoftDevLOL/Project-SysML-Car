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
#: The 13 systems come first, then the 10 components; ``build_car.build`` walks
#: blocks.json order, which lists every component after its parent system.
BUILDERS = {
    # systems
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
    # components (tier "component" in blocks.json)
    "MOTOR": powertrain.build_motor,
    "BAT_MODULE": energy.build_bat_module,
    "CHARGE_PORT": charge.build_charge_port,
    "OBC": charge.build_obc,
    "BRAKE_CTRL": brakes.build_brake_ctrl,
    "BRAKE_ACT": brakes.build_brake_act,
    "PUMP": thermal.build_pump,
    "FUSION": sensors.build_fusion,
    "WHEEL_SENSOR": sensors.build_wheel_sensor,
    "DIAG_GATEWAY": control.build_diag_gateway,
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
