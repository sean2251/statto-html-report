"""Field-dimension constants used when deriving distance/direction stats."""

# USAU regulation pitch: 70 x 40 yd playing field, 20 yd endzone at each end.
FIELD_WIDTH_YD = 40.0
FIELD_LENGTH_YD = 110.0  # 70 yd playing field + 20 yd endzone on each end
ENDZONE_FRACTION = 20.0 / FIELD_LENGTH_YD
BRICK_DISTANCE_YD = 20.0  # brick mark sits 20 yd in front of each goal line
HUCK_DISTANCE_YD = 27.0  # a throw counts as a "huck attempt" if it gains >= this many yards downfield
SWING_LR_THRESHOLD_YD = 12.0
# An "assist attempt" is any throw whose target location falls inside the attacking
# endzone (i.e. a throw that would score if caught) -- since Statto only flags the
# pass that actually became an assist, this is the best available proxy for throws
# that were attempting to score, whether or not they were completed.
