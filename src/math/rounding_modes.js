
// Define general types of rounding modes for various mathematical operations over the reals

export const ROUNDING_MODE = Object.freeze({
  NEAREST: 0,     // nearest neighbor, ties to even
  UP: 1,          // always round positively
  DOWN: 2,
  TOWARD_INF: 3,  // towards the extremes
  TOWARD_ZERO: 4, // towards zero
  TIES_AWAY: 5,   // tie away from zero
  WHATEVER: 6,    // do whatever's easiest
  TIES_EVEN: 0    // equivalent to NEAREST
})

export function roundingModeToString (mode) {
  switch (mode) {
    case ROUNDING_MODE.NEAREST:
    case ROUNDING_MODE.TIES_EVEN:
      return "NEAREST"
    case ROUNDING_MODE.UP:
      return "UP"
    case ROUNDING_MODE.DOWN:
      return "DOWN"
    case ROUNDING_MODE.TOWARD_INF:
      return "TOWARD_INF"
    case ROUNDING_MODE.TOWARD_ZERO:
      return "TOWARD_ZERO"
    case ROUNDING_MODE.TIES_AWAY:
      return "TIES_AWAY"
    case ROUNDING_MODE.WHATEVER:
      return "WHATEVER"
  }
}
