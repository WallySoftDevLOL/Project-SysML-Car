"""POWERTRAIN (rear drive unit) and INVERTER.

STUB. The drive unit is one box; the real version is motor + gearbox + half
shafts. The inverter is a box on top of it.
"""

import common


def build_powertrain(ctx):
    """POWERTRAIN: rear drive unit envelope."""
    return common.stub_box_block(ctx, "POWERTRAIN")


def build_inverter(ctx):
    """INVERTER: traction inverter can, mounted on the drive unit."""
    return common.stub_box_block(ctx, "INVERTER")
