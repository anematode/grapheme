import { RealInterval, roundDown, roundUp, wrapIntervalSetFunction, RealIntervalSet, getIntervals } from './interval'

const _Add = (int1, int2) => {
  return new RealInterval(roundDown(int1.min + int2.min), roundUp(int1.max + int2.max), int1.defMin && int2.defMin, int1.defMax && int2.defMax)
}

const _Subtract = (int1, int2) => {
  return new RealInterval(roundDown(int1.min - int2.max), roundUp(int1.max - int2.min), int1.defMin && int2.defMin, int1.defMax && int2.defMax)
}

const _Multiply = (i1, i2) => {
  let prod1 = i1.min * i2.min
  let prod2 = i1.min * i2.max
  let prod3 = i1.max * i2.min
  let prod4 = i1.max * i2.max

  return new RealInterval(roundDown(Math.min(prod1, prod2, prod3, prod4)),
    roundUp(Math.max(prod1, prod2, prod3, prod4)),
    i1.defMin && i2.defMin, i1.defMax && i2.defMax)
}

const _Reciprocal = (i1) => {
  let min = i1.min
  let max = i1.max

  let defMin = i1.defMin, defMax = i1.defMax

  if (0 < min || max < 0) {
    let valMin = 1 / min
    let valMax = 1 / max

    return new RealInterval(roundDown(Math.min(valMin, valMax)), roundUp(Math.max(valMin, valMax)), defMin, defMax)
  } else {
    // 0 contained in the interval

    let interval1 = new RealInterval(-Infinity, roundUp(1 / min), defMin, defMax)
    let interval2 = new RealInterval(roundDown(1 / max), Infinity, defMin, defMax)

    return new RealIntervalSet([interval1, interval2])
  }
}

const _Divide = (i1, i2) => {
  return Multiply(i1, _Reciprocal(i2))
}

const _Abs = (i1) => {
  let min = i1.min
  let max = i1.max

  let abs1 = Math.abs(min)
  let abs2 = Math.abs(max)

  let absMax = roundUp(Math.max(abs1, abs2))

  if (max < 0 || 0 < min) {
    // 0 not in range
    let absMin = roundDown(Math.min(abs1, abs2))

    return new RealInterval(absMin, absMax, i1.defMin, i1.defMax)
  } else {
    return new RealInterval(0, absMax, i1.defMin, i1.defMax)
  }
}

function int_pow(b, n) {
  let prod = 1
  for (let i = 0; i < n; ++i) {
    prod *= b
  }
  return prod
}

const _PowN = (i1, n) => {
  if (n === 0) {
    return new RealInterval(1, 1, i1.defMin, i1.defMax)
  } else if (n === 1) {
    // identity function
    return i1.clone()
  } else if (n === -1) {
    return _Reciprocal(i1)
  }

  if (n > 1) {
    // Positive integers
    // if even, then there is a turning point at x = 0. If odd, monotonically increasing
    // always continuous and well-defined

    let min = i1.min
    let max = i1.max

    let minPowed, maxPowed

    if (n === 2) {
      minPowed = min * min
      maxPowed = max * max
    } else if (n === 3) {
      minPowed = roundDown(min * min) * min
      maxPowed = roundUp(max * max) * max
    } else if (n < 60) {
      minPowed = int_pow(min, n)
      maxPowed = int_pow(max, n)
    } else {
      minPowed = Math.pow(min, n)
      maxPowed = Math.pow(max, n)
    }

    let defMin = i1.defMin
    let defMax = i1.defMax

    if (n % 2 === 0) {
      // if n is even

      let maxValue = roundUp(Math.max(minPowed, maxPowed))

      if (min <= 0 && 0 <= max) { // if 0 is included, then it's just [0, max(min^n, max^n)]
        return new RealInterval(0, maxValue, defMin, defMax)
      } else {
        // if 0 is not included, then it's [min(min^n, max^n), max(min^n, max^n)]
        let minValue = roundDown(Math.min(minPowed, maxPowed))

        return new RealInterval(minValue, maxValue, defMin, defMax)
      }
    } else {
      // Monotonically increasing, so it's [min^n, max^n]

      return new RealInterval(minPowed, maxPowed, defMin, defMax)
    }
  } else {
    // Negative integers, utilize reciprocal function
    return Reciprocal(_PowN(i1, -n))
  }
}

// r is a real number
function _PowR(i1, r) {
  let min = i1.min
  let max = i1.max

  if (max < 0) {
    // Function is totally undefined
    return new RealInterval(NaN, NaN, false, false)
  } else if (min < 0) {
    // 0 included in range, so the function is partially undefined
    let defMin = false
    let defMax = i1.defMax

    let bound = Math.pow(max, r)

    if (r < 0) {
      // Monotonically decreasing, infinite maximum, max^r minimum

      return new RealInterval(roundDown(bound), Infinity, defMin, defMax)
    } else {
      // Monotonically increasing, 0 minimum, max^r maximum

      return new RealInterval(0, roundUp(bound), defMin, defMax)
    }
  } else {
    // function is totally defined and continuous

    let minPowed = Math.pow(min, r)
    let maxPowed = Math.pow(max, r)

    let minValue = Math.min(minPowed, maxPowed)
    let maxValue = Math.max(minPowed, maxPowed)

    return new RealInterval(roundDown(minValue), roundUp(maxValue), i1.defMin, i1.defMax)
  }
}

function _Sqrt(i1) {
  return _PowR(i1, 1/2)
}

function _Cbrt(i1) {
  return _PowRational(i1, 1, 3)
}

function _PowRational(i1, p, q) {
  // Assuming p and q are reduced

  if (p === 0) {
    return _PowN(i1, 0)
  }

  let r = p / q

  if (q % 2 === 0) {
    // If the denominator is even then we can treat it like a real number
    return _PowR(i1, r)
  }

  let min = i1.min, max = i1.max

  let absMinPowed = Math.pow(Math.abs(min), r)
  let absMaxPowed = Math.pow(Math.abs(max), r)

  // continuous and well-defined everywhere

  let defMin = i1.defMin
  let defMax = i1.defMax

  let minAttained = Math.min(absMinPowed, absMaxPowed)
  let maxAttained = Math.max(absMinPowed, absMaxPowed)

  if (!(p & 1) && min < 0) {
    minAttained *= -1
  }

  minAttained = roundDown(minAttained)
  maxAttained = roundUp(maxAttained)

  if (p % 2 === 0) {
    if (p > 0) {
      // p / q with even, positive p and odd q
      // Continuous

      if (min < 0 && 0 < max) {
        // if 0 contained, then the minimum attained value is 0

        return new RealInterval(0, maxAttained, defMin, defMax)
      } else {
        return new RealInterval(minAttained, maxAttained, defMin, defMax)
      }

    } else {
      // p / q with even, negative p and odd q
      // Discontinuous at x = 0

      if (min < 0 && 0 < max) {
        // if 0 contained, then the maximum attained value is Infinity and the function is discontinuous

        return new RealInterval(minAttained, Infinity, defMin, defMax)
      } else {
        // Totally continuous and monotonic
        return new RealInterval(minAttained, maxAttained, defMin, defMax)
      }
    }
  } else {
    if (p > 0) {
      // p / q with odd, positive p and odd q
      // Continuous, monotonically increasing everywhere

      return new RealInterval(minAttained, maxAttained, defMin, defMax)
    } else {
      // p / q with odd, negative p and odd q
      // Always decreasing, discontinuous at x = 0

      if (min < 0 && 0 < max) {
        let interval1 = new Interval(-Infinity, roundUp(minAttained), defMin, defMax)
        let interval2 = new Interval(roundDown(maxAttained), Infinity, defMin, defMax)

        return new RealIntervalSet([interval1, interval2])
      }
    }
  }
}

// Note that the base comes AFTER the interval!
function _PowB(i1, b) {
  if (i1.isExact()) {
    let ret = Math.pow(b, i1.min)

    return new RealInterval(roundDown(ret), roundUp(ret), i1.defMin, i1.defMax)
  }

  if (b < 0) {
    // TODO add strange branching
    return new RealInterval(NaN, NaN, false, false)
  } else if (b === 0) {
    return new RealInterval(0, 0, i1.defMin, i1.defMax)
  } else if (b === 1) {
    return new RealInterval(1, 1, i1.defMin, i1.defMax)
  } else {
    // continuous, monotonic, always defined
    let minPowed = Math.pow(b, i1.min)
    let maxPowed = Math.pow(b, i1.max)

    let minValue = Math.min(minPowed, maxPowed)
    let maxValue = Math.max(minPowed, maxPowed)

    return new RealInterval(roundDown(minValue), roundUp(maxValue), i1.defMin, i1.defMax)
  }
}

function cmpZero(min, max) {
  if (min >= 0) {
    return 1
  } else if (max > 0) {
    return 0
  } else {
    return -1
  }
}

function ignoreNaNMin(...args) {
  let min = Infinity
  for (let i = 0; i < args.length; ++i) {
    let val = args[i]

    if (val < min) {
      min = val
    }
  }

  return min
}

function ignoreNaNMax(...args) {
  let max = -Infinity
  for (let i = 0; i < args.length; ++i) {
    let val = args[i]

    if (val > max) {
      max = val
    }
  }

  return max
}

function _Pow(i1, i2) {
  if (i2.isExact()) {
    if (Number.isInteger(i2.min)) {
      return _PowN(i1, i2.min)
    } else {
      return _PowR(i1, i2.min)
    }
  }

  if (i1.isExact()) {
    return _PowB(i2, i1.min)
  }

  let i1min = i1.min, i1max = i1.max, i2min = i2.min, i2max = i2.max

  // This is a rather complex algorithm, so I must document it!!
  // We wish to find the intervals of the set [i1min, i1max] ^ [i2min, i2max].
  // We should treat the exponent as a real number, not as a rational number (since that case is
  // the dominion of POW_RATIONAL). That means that there are two branches for negative base.
  // We split up the cases depending on the position of i1, i2 relative to 0.

  let i1Pos = cmpZero(i1min, i1max)
  let i2Pos = cmpZero(i2min, i2max)

  let powMinMin = Math.pow(i1min, i2min)
  let powMinMax = Math.pow(i1min, i2max)
  let powMaxMin = Math.pow(i1max, i2min)
  let powMaxMax = Math.pow(i1max, i2max)

  let defMin = i1.defMin && i2.defMin
  let defMax = i1.defMax && i2.defMax

  let endpointMinAttained = roundDown(ignoreNaNMin(powMinMin, powMinMax, powMaxMin, powMaxMax))
  let endpointMaxAttained = roundUp(ignoreNaNMax(powMinMin, powMinMax, powMaxMin, powMaxMax))

  // Nine cases
  if (i1Pos === 1) {
    // In these three cases, everything is continuous and monotonic and thus defined by the endpoints

    return new RealInterval(endpointMinAttained, endpointMaxAttained, defMin, defMax)
  } else if (i1Pos === 0) {
    // Discontinuities due to branching involved
    // Recurse into two subcases

    let int1 = _Pow(new RealInterval(0, i1max, i1.defMin, i1.defMax), i2)
    let int2 = _Pow(new RealInterval(i1min, 0, i1.defMin, i1.defMax), i2)

    return new RealIntervalSet([int1, ...getIntervals(int2)])
  } else if (i1Pos === -1) {
    let powMinMin = Math.pow(Math.abs(i1min), i2min)
    let powMinMax = Math.pow(Math.abs(i1min), i2max)
    let powMaxMin = Math.pow(Math.abs(i1max), i2min)
    let powMaxMax = Math.pow(Math.abs(i1max), i2max)

    let minAttained = roundDown(Math.min(powMinMin, powMinMax, powMaxMin, powMaxMax))
    let maxAttained = roundUp(Math.max(powMinMin, powMinMax, powMaxMin, powMaxMax))

    // Not continuous over any interval
    let int1 = new RealInterval(-maxAttained, -minAttained, false, defMax)
    let int2 = new RealInterval(minAttained, maxAttained, false, defMax)

    return new RealIntervalSet([int1, int2])
  }
}

export function Min(i1, i2, ...args) {
  if (args.length > 0) {
    return Min(i1, Min(i2, ...args))
  }

  let min = Math.min(i1.min, i2.min)
  let max = Math.min(i1.max, i2.max)
  let defMin = i1.defMin && i2.defMin
  let defMax = i1.defMax && i2.defMax

  return new RealInterval(min, max, defMin, defMax)
}

export function Max(i1, i2, ...args) {
  if (args.length > 0) {
    return Max(i1, Max(i2, ...args))
  }

  let min = Math.max(i1.min, i2.min)
  let max = Math.max(i1.max, i2.max)
  let defMin = i1.defMin && i2.defMin
  let defMax = i1.defMax && i2.defMax

  return new RealInterval(min, max, defMin, defMax)
}

function LessThan(i1, i2) {
  let ret

  if (i1.max < i2.min) {
    ret = RealInterval.Yes
  } else if (i2.max < i1.min) {
    ret = RealInterval.No
  } else {
    ret = RealInterval.Yesnt
  }

  ret.defMin = i1.defMin && i2.defMin
  ret.defMax = i1.defMax && i2.defMax

  return ret
}

function GreaterThan(i1, i2) {
  return LessThan(i2, i1)
}

function LessEqualThan(i1, i2) {
  let ret

  if (i1.max <= i2.min) {
    ret = RealInterval.Yes
  } else if (i2.max < i1.min) {
    ret = RealInterval.No
  } else {
    ret = RealInterval.Yesnt
  }

  ret.defMin = i1.defMin && i2.defMin
  ret.defMax = i1.defMax && i2.defMax

  return ret
}

function GreaterEqualThan(i1, i2) {
  return LessEqualThan(i2, i1)
}

function Equal(i1, i2) {
  let ret

  if (i1.isExact() && i2.isExact()) {
    if (i1.min === i2.min)
      ret = RealInterval.Yes
    else
      ret = RealInterval.No
  } else if (i1.intersects(i2)) {
    ret = RealInterval.Yesnt
  } else {
    ret = RealInterval.No
  }

  ret.defMin = i1.defMin && i2.defMin
  ret.defMax = i1.defMax && i2.defMax

  return ret
}

function invertBooleanInterval(i) {
  if (i.min === 0 && i.max === 0) {
    return new RealInterval(1, 1, i.defMin, i.defMax)
  } else if (i.max === 1 && i.max === 1) {
    return new RealInterval(0, 0, i.defMin, i.defMax)
  } else {
    return new RealInterval(0, 1, i.defMin, i.defMax)
  }
}

function NotEqual(i1, i2) {
  return invertBooleanInterval(Equal(i1, i2))
}

export function Re(i1) {
  return i1
}

export const Cmp = {LessThan, LessEqualThan, GreaterThan, GreaterEqualThan, Equal, NotEqual}

export const Add = wrapIntervalSetFunction(_Add)
export const Subtract = wrapIntervalSetFunction(_Subtract)
export const Multiply = wrapIntervalSetFunction(_Multiply)
export const Divide = wrapIntervalSetFunction(_Divide)
export const Reciprocal = wrapIntervalSetFunction(_Reciprocal)
export const Abs = wrapIntervalSetFunction(_Abs)
export const PowN = wrapIntervalSetFunction(_PowN, 1)
export const PowR = wrapIntervalSetFunction(_PowN, 1)
export const PowRational = wrapIntervalSetFunction(_PowRational, 1)
export const PowB = wrapIntervalSetFunction(_PowB, 1)
export const Pow = wrapIntervalSetFunction(_Pow)
export const Sqrt = wrapIntervalSetFunction(_Sqrt)
export const Cbrt = wrapIntervalSetFunction(_Cbrt)
