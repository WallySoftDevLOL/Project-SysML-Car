"""HMI: dashboard / driver interface.

STUB. One box across the cabin; the real version adds the screen, wheel and
pedals.
"""

import common


def build_hmi(ctx):
    return common.stub_box_block(ctx, "HMI")
