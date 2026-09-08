"""VCONTROL (vehicle controller) and DIAG (service diagnostics port).

STUB. Boxes at their layout envelopes.
"""

import common


def build_vcontrol(ctx):
    """VCONTROL: central controller ECU under the dash."""
    return common.stub_box_block(ctx, "VCONTROL")


def build_diag(ctx):
    """DIAG: service connector on the driver's side."""
    return common.stub_box_block(ctx, "DIAG")
