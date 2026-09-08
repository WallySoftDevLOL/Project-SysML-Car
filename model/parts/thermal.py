"""THERMAL (front radiator) and THERM_CTRL (thermal controller).

STUB. Boxes at their layout envelopes; the real version adds the fan and the
coolant loop.
"""

import common


def build_thermal(ctx):
    """THERMAL: front radiator slab."""
    return common.stub_box_block(ctx, "THERMAL")


def build_therm_ctrl(ctx):
    """THERM_CTRL: pump / fan controller beside the radiator."""
    return common.stub_box_block(ctx, "THERM_CTRL")
