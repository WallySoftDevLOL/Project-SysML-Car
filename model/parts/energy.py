"""ENERGY (battery pack slab) and BMS (battery management box).

STUB. Both are single boxes at their layout envelopes.
"""

import common


def build_energy(ctx):
    """ENERGY: skateboard battery slab under the floor."""
    return common.stub_box_block(ctx, "ENERGY")


def build_bms(ctx):
    """BMS: management electronics sitting on top of the pack."""
    return common.stub_box_block(ctx, "BMS")
