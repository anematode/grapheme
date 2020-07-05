// An interval is defined as a series of six values, namely two floating point values, two booleans for domain tracking, and two booleans for continuity tracking.
// See more information at this (very readable) paper by Jeff Tupper:


import { digamma, trigamma } from './gamma_function'
import * as utils from "../core/utils"

class Interval {
  constructor(min, max, defMin=true, defMax=true, contMin=true, contMax=true) {
    this.min = min
    this.max = max
    this.defMin = defMin
    this.defMax = defMax
    this.contMin = contMin
    this.contMax = contMax
  }

  isExact() {
    return this.min === this.max
  }

  isSet() {
    return false
  }

  pretty() {
    return `(${this.min}, ${this.max}), <${this.defMin}, ${this.defMax}>, <${this.contMin}, ${this.contMax}>`
  }

  clone() {
    return new Interval(this.min, this.max, this.defMin, this.defMax, this.contMin, this.contMax)
  }

  contains(x) {
    return this.min <= x && x <= this.max
  }

  containsNeighborhoodOf(x) {
    return this.min < x && x < this.max
  }

  intersects(i) {
    if (i.isSet()) {
      return getIntervals(i).some(interval => this.intersects(interval))
    } else {
      return (i.contains(this.min) || i.contains(this.max) || this.contains(i.min))
    }
  }
}

class IntervalSet {
  constructor(intervals=[]) {
    this.intervals = intervals
  }

  get min() {
    return Math.min.apply(null, this.intervals.map(interval => interval.min))
  }

  get max() {
    return Math.max.apply(null, this.intervals.map(interval => interval.max))
  }

  get defMin() {
    return !!Math.min.apply(null, this.intervals.map(interval => interval.defMin))
  }

  get defMax() {
    return !!Math.max.apply(null, this.intervals.map(interval => interval.defMax))
  }

  get contMin() {
    return !!Math.min.apply(null, this.intervals.map(interval => interval.contMin))
  }

  get contMax() {
    return !!Math.max.apply(null, this.intervals.map(interval => interval.contMax))
  }

  mergeIntervals() {

  }

  isSet() {
    return true
  }

  isExact() {
    return this.min === this.max
  }

  contains(x) {
    return this.intervals.some(i => i.contains(x))
  }

  containsNeighborhoodOf(x) {
    return this.intervals.some(i => i.containsNeighborhoodOf(x))
  }

  intersects(i) {
    return this.intervals.some(interval => interval.intersects(i))
  }
}

function getIntervals(i) {
  if (i.isSet()) {
    return i.intervals
  } else {
    return [i]
  }
}

function ADD(i1, i2) {
  let isSet1 = i1.isSet()
  let isSet2 = i2.isSet()

  if (isSet1 || isSet2) {
    let left = getIntervals(i1)
    let right = getIntervals(i2)

    let intervals = []

    left.forEach(i => {
      right.forEach(j => {
        intervals.push(ADD(i, j))
      })
    })

    return new IntervalSet(intervals)
  } else {
    return new Interval(i1.min + i2.min, i1.max + i2.max,
      i1.defMin && i2.defMin, i1.defMax && i2.defMax,
      i1.contMin && i2.contMin, i1.contMax && i2.contMax)
  }
}

function MULTIPLY(i1, i2) {
  let isSet1 = i1.isSet()
  let isSet2 = i2.isSet()

  if (isSet1 || isSet2) {
    let left = getIntervals(i1)
    let right = getIntervals(i2)

    let intervals = []

    left.forEach(i => {
      right.forEach(j => {
        intervals.push(MULTIPLY(i, j))
      })
    })

    return new IntervalSet(intervals)
  } else {
    let prod1 = i1.min * i2.min
    let prod2 = i1.min * i2.max
    let prod3 = i1.max * i2.min
    let prod4 = i1.max * i2.max

    return new Interval(Math.min(prod1, prod2, prod3, prod4),
      Math.max(prod1, prod2, prod3, prod4),
      i1.defMin && i2.defMin, i1.defMax && i2.defMax,
      i1.contMin && i2.contMin, i1.contMax && i2.contMax)
  }
}

function SUBTRACT(i1, i2) {
  let isSet1 = i1.isSet()
  let isSet2 = i2.isSet()

  if (isSet1 || isSet2) {
    let left = getIntervals(i1)
    let right = getIntervals(i2)

    let intervals = []

    left.forEach(i => {
      right.forEach(j => {
        intervals.push(SUBTRACT(i, j))
      })
    })

    return new IntervalSet(intervals)
  } else {
    return new Interval(i1.min - i2.max, i1.max - i2.min,
      i1.defMin && i2.defMin, i1.defMax && i2.defMax,
      i1.contMin && i2.contMin, i1.contMax && i2.contMax)
  }
}

function DIVIDE(i1, i2) {
  let isSet1 = i1.isSet()
  let isSet2 = i2.isSet()

  if (isSet1 || isSet2) {
    let left = getIntervals(i1)
    let right = getIntervals(i2)

    let intervals = []

    left.forEach(i => {
      right.forEach(j => {
        getIntervals(DIVIDE(i, j)).forEach(k => intervals.push(k))
      })
    })

    return new IntervalSet(intervals)
  } else {
    return MULTIPLY(i1, RECIPROCAL(i2))
  }
}

function RECIPROCAL(i1) {
  let isSet = i1.isSet()

  if (isSet) {
    let intervals = []

    i1.intervals.forEach(interval => getIntervals(RECIPROCAL(interval)).forEach(i => intervals.push(i)))

    return new IntervalSet(intervals)
  } else {
    let min = i1.min
    let max = i1.max

    let defMin = i1.defMin, defMax = i1.defMax, contMin = i1.contMin, contMax = i1.contMax

    if (0 < min || max < 0) {
      let valMin = 1 / min
      let valMax = 1 / max

      return new Interval(Math.min(valMin, valMax), Math.max(valMin, valMax), defMin, defMax, contMin, contMax)
    } else if (max === 0) {
      return new Interval(-Infinity, 1 / min, defMin, defMax, contMin, contMax)
    } else if (min === 0) {
      return new Interval(1 / max, Infinity, defMin, defMax, contMin, contMax)
    } else {
      // 0 contained in the interval

      let interval1 = new Interval(-Infinity, 1 / min, defMin, defMax, contMin, contMax)
      let interval2 = new Interval(1 / max, Infinity, defMin, defMax, contMin, contMax)

      return new IntervalSet([interval1, interval2])
    }
  }
}

function CONST(a) {
  return new Interval(a, a)
}

function ABS(i1) {
  let isSet = i1.isSet()

  if (isSet) {
    let intervals = []

    i1.intervals.forEach(interval => getIntervals(ABS(interval)).forEach(i => intervals.push(i)))

    return new IntervalSet(intervals)
  } else {
    let min = i1.min
    let max = i1.max

    if (max < 0 || 0 < min) {
      // 0 not in range
      let abs1 = Math.abs(min)
      let abs2 = Math.abs(max)

      let absMin = Math.min(abs1, abs2)
      let absMax = Math.max(abs1, abs2)

      return new Interval(absMin, absMax, i1.defMin, i1.defMax, i1.contMin, i1.contMax)
    }
  }
}

function int_pow(b, n) {
  let prod = 1
  for (let i = 0; i < n; ++i) {
    prod *= b
  }
  return prod
}

// N is an integer
function POW_N(i1, n) {
  let isSet = i1.isSet()

  if (isSet) {
    let intervals = []

    i1.intervals.forEach(interval => getIntervals(POW_N(interval, n)).forEach(i => intervals.push(i)))

    return new IntervalSet(intervals)
  } else {
    // x^0 = 1
    if (n === 0) {
      return new Interval(1, 1, i1.defMin, i1.defMax, true, true)
    } else if (n === 1) {
      // identity function
      return i1.clone()
    } else if (n === -1) {
      return RECIPROCAL(i1)
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
        minPowed = min * min * min
        maxPowed = max * max * max
      } else {
        minPowed = int_pow(min, n)
        maxPowed = int_pow(max, n)
      }

      let defMin = i1.defMin
      let defMax = i1.defMax
      let contMin = i1.contMin
      let contMax = i1.contMax

      if (!(n & 1)) {
        let maxValue = Math.max(minPowed, maxPowed)
        if (min <= 0 && 0 <= max) { // if 0 is included, then it's just [0, max(min^n, max^n)]
          return new Interval(0, maxValue, defMin, defMax, contMin, contMax)
        } else {
          // if 0 is not included, then it's [min(min^n, max^n), max(min^n, max^n)]
          let minValue = Math.min(minPowed, maxPowed)

          return new Interval(minValue, maxValue, defMin, defMax, contMin, contMax)
        }
      } else {
        // Monotonically increasing, so it's [min^n, max^n]

        return new Interval(minPowed, maxPowed, defMin, defMax, contMin, contMax)
      }
    } else {
      // Negative integers, utilize reciprocal function
      return RECIPROCAL(POW_N(i1, -n))
    }
  }
}

// r is a real number
function POW_R(i1, r) {
  let min = i1.min
  let max = i1.max

  if (max < 0) {
    // UserDefinedFunction is totally undefined
    return new Interval(0, 0, false, false, i1.contMin, i1.contMax)
  } else if (min < 0) {
    // 0 included in range, so the function is partially undefined
    let defMin = false
    let defMax = i1.defMax
    let contMin = i1.contMin
    let contMax = i1.contMax

    let bound = Math.pow(max, r)

    if (r < 0) {
      // Monotonically decreasing, infinite maximum, max^r minimum

      return new Interval(bound, Infinity, defMin, defMax, contMin, contMax)
    } else {
      // Monotonically increasing, 0 minimum, max^r maximum

      return new Interval(0, bound, defMin, defMax, contMin, contMax)
    }
  } else {
    // function is totally defined and continuous

    let minPowed = Math.pow(min, r)
    let maxPowed = Math.pow(max, r)

    let minValue = Math.min(minPowed, maxPowed)
    let maxValue = Math.max(minPowed, maxPowed)

    return new Interval(minValue, maxValue, i1.defMin, i1.defMax, i1.contMin, i1.contMax)
  }
}

function SQRT(i1) {
  if (i1.isSet()) {
    let intervals = []

    i1.intervals.forEach(interval => getIntervals(SQRT(interval)).forEach(i => intervals.push(i)))

    return new IntervalSet(intervals)
  } else {
    return POW_R(i1, 1/2)
  }
}

function CBRT(i1) {
  if (i1.isSet()) {
    let intervals = []

    i1.intervals.forEach(interval => getIntervals(CBRT(interval)).forEach(i => intervals.push(i)))

    return new IntervalSet(intervals)
  } else {
    return POW_RATIONAL(i1, 1, 3)
  }
}

// Integral n
function ROOT_N(n, i1) {
  return POW_RATIONAL(i1, 1, n)
}

function POW_RATIONAL(i1, p, q) {
  if (i1.isSet()) {
    let intervals = []

    i1.intervals.forEach(interval => getIntervals(POW_RATIONAL(interval, p, q)).forEach(i => intervals.push(i)))

    return new IntervalSet(intervals)
  } else {
    // Assuming p and q are reduced

    if (p === 0) {
      return POW_N(i1, 0)
    }

    if (!(q & 1)) {
      // If the denominator is even then we can treat it like a real number
      return POW_R(i1, p / q)
    }

    let min = i1.min, max = i1.max
    let r = p / q
    let absMinPowed = Math.pow(Math.abs(min), r)
    let absMaxPowed = Math.pow(Math.abs(max), r)

    // continuous and well-defined everywhere

    let defMin = i1.defMin
    let defMax = i1.defMax
    let contMin = i1.contMin
    let contMax = i1.contMax

    let minAttained = Math.min(absMinPowed, absMaxPowed)
    let maxAttained = Math.max(absMinPowed, absMaxPowed)

    if (!(p & 1) && min < 0) {
      minAttained *= -1
    }

    if (!(p & 1)) {
      if (p > 0) {
        // p / q with even, positive p and odd q
        // Continuous

        if (min < 0 && 0 < max) {
          // if 0 contained, then the minimum attained value is 0

          return new Interval(0, maxAttained, defMin, defMax, contMin, contMax)
        } else {
          return new Interval(minAttained, maxAttained, defMin, defMax, contMin, contMax)
        }

      } else {
        // p / q with even, negative p and odd q
        // Discontinuous at x = 0

        let min
        if (min < 0 && 0 < max) {
          // if 0 contained, then the maximum attained value is Infinity and the function is discontinuous

          return new Interval(minAttained, Infinity, defMin, defMax, false, contMax)
        } else {
          // Totally continuous and monotonic
          return new Interval(minAttained, maxAttained, defMin, defMax, contMin, contMax)
        }
      }
    } else {
      if (p > 0) {
        // p / q with odd, positive p and odd q
        // Continuous, monotonically increasing everywhere

        console.log(minAttained, maxAttained)

        return new Interval(minAttained, maxAttained, defMin, defMax, contMin, contMax)
      } else {
        // p / q with odd, negative p and odd q
        // Always decreasing, discontinuous at x = 0

        if (min < 0 && 0 < max) {
          let interval1 = new Interval(-Infinity, minAttained, defMin, defMax, contMin, contMax)
          let interval2 = new Interval(maxAttained, Infinity, defMin, defMax, contMin, contMax)

          return new IntervalSet([interval1, interval2])
        }
      }
    }
  }
}

function POW_B(b, i1) {
  if (i1.isExact()) {
    let ret = Math.pow(b, i1.min)

    return new Interval(ret, ret, i1.defMin, i1.defMax, true, true)
  }

  if (b < 0) {
    // TODO add strange branching
    return new Interval(0, 0, false, false, true, true)
  } else if (b === 0) {
    return new Interval(0, 0, i1.defMin, i1.defMax, true, true)
  } else if (b === 1) {
    return new Interval(1, 1, i1.defMin, i1.defMax, true, true)
  } else {
    // continuous, monotonic, always defined
    let minPowed = Math.pow(b, i1.min)
    let maxPowed = Math.pow(b, i1.max)

    let minValue = Math.min(minPowed, maxPowed)
    let maxValue = Math.max(minPowed, maxPowed)

    return new Interval(minValue, maxValue, i1.defMin, i1.defMax, i1.contMin, i1.contMax)
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

function POW(i1, i2) {
  let isSet = i1.isSet() || i2.isSet()

  if (isSet) {
    let left = getIntervals(i1)
    let right = getIntervals(i2)

    let intervals = []

    left.forEach(i => {
      right.forEach(j => {
        getIntervals(POW(i, j)).forEach(k => intervals.push(k))
      })
    })

    return new IntervalSet(intervals)
  } else {
    if (i2.isExact()) {
      if (Number.isInteger(i2.min)) {
        return POW_N(i1, i2.min)
      } else {
        return POW_R(i1, i2.min)
      }
    }

    if (i1.isExact()) {
      return POW_B(i1.min, i2)
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
    let contMin = i1.contMin && i2.contMin
    let contMax = i1.contMax && i2.contMax

    let endpointMinAttained = ignoreNaNMin(powMinMin, powMinMax, powMaxMin, powMaxMax)
    let endpointMaxAttained = ignoreNaNMax(powMinMin, powMinMax, powMaxMin, powMaxMax)

    // Nine cases
    if (i1Pos === 1) {
      // In these three cases, everything is continuous and monotonic and thus defined by the endpoints

      return new Interval(endpointMinAttained, endpointMaxAttained, defMin, defMax, contMin, contMax)
    } else if (i1Pos === 0) {
      // Discontinuities due to branching involved
      // Recurse into two subcases

      let int1 = POW(new Interval(0, i1max, i1.defMin, i1.defMax, i1.contMin, i1.contMax), i2)
      let int2 = POW(new Interval(i1min, 0, i1.defMin, i1.defMax, i1.contMin, i1.contMax), i2)

      return new IntervalSet([int1, ...int2.intervals])
    } else if (i1Pos === -1) {
      let powMinMin = Math.pow(Math.abs(i1min), i2min)
      let powMinMax = Math.pow(Math.abs(i1min), i2max)
      let powMaxMin = Math.pow(Math.abs(i1max), i2min)
      let powMaxMax = Math.pow(Math.abs(i1max), i2max)


      let minAttained = Math.min(powMinMin, powMinMax, powMaxMin, powMaxMax)
      let maxAttained = Math.max(powMinMin, powMinMax, powMaxMin, powMaxMax)

      // Not continuous over any interval
      let int1 = new Interval(-maxAttained, -minAttained, false, defMax, false, false)
      let int2 = new Interval(minAttained, maxAttained, false, defMax, false, false)

      return new IntervalSet([int1, int2])
    }
  }
}

function MAX(i1, i2, ...args) {
  if (args.length > 0) {
    return MAX(i1, MAX(i2, ...args))
  }

  let min = Math.max(i1.min, i2.min)
  let max = Math.max(i1.max, i2.max)
  let defMin = i1.defMin && i2.defMin
  let defMax = i1.defMax && i2.defMax
  let contMin = i1.contMin && i2.contMin
  let contMax = i1.contMax || i2.contMax

  return new Interval(min, max, defMin, defMax, contMin, contMax)
}

function MIN(i1, i2, ...args) {
  if (args.length > 0) {
    return MIN(i1, MIN(i2, ...args))
  }

  let min = Math.min(i1.min, i2.min)
  let max = Math.min(i1.max, i2.max)
  let defMin = i1.defMin && i2.defMin
  let defMax = i1.defMax && i2.defMax
  let contMin = i1.contMin && i2.contMin
  let contMax = i1.contMax || i2.contMax

  return new Interval(min, max, defMin, defMax, contMin, contMax)
}

const YES = new Interval(1, 1)
const YESNT = new Interval(0, 1)
const NO = new Interval(0, 0)

function invertBooleanInterval(i) {
  if (i.min === 0 && i.max === 0) {
    return new Interval(1, 1, i.defMin, i.defMax, i.contMin, i.contMax)
  } else if (i.max === 1 && i.max === 1) {
    return new Interval(0, 0, i.defMin, i.defMax, i.contMin, i.contMax)
  } else {
    return new Interval(0, 1, i.defMin, i.defMax, i.contMin, i.contMax)
  }
}

function LESS_THAN(i1, i2) {
  let ret;
  if (i1.max < i2.min) {
    ret = YES.clone()
  } else if (i2.max < i1.min) {
    ret = NO.clone()
  } else {
    ret = YESNT.clone()
  }

  ret.defMin = i1.defMin && i2.defMin
  ret.defMax = i1.defMax && i2.defMax
  ret.contMin = i1.contMin && i2.contMin
  ret.contMax = i1.contMax || i2.contMax

  return ret
}

function GREATER_THAN(i1, i2) {
  return LESS_THAN(i2, i1)
}

function LESS_EQUAL_THAN(i1, i2) {
  let ret;
  if (i1.max <= i2.min) {
    ret = YES.clone()
  } else if (i2.max <= i1.min) {
    ret = NO.clone()
  } else {
    ret = YESNT.clone()
  }

  ret.defMin = i1.defMin && i2.defMin
  ret.defMax = i1.defMax && i2.defMax
  ret.contMin = i1.contMin && i2.contMin
  ret.contMax = i1.contMax || i2.contMax

  return ret
}

function GREATER_EQUAL_THAN(i1, i2) {
  return LESS_EQUAL_THAN(i2, i1)
}

function EQUAL(i1, i2) {
  let ret;

  if (i1.isExact() && i2.isExact()) {
    if (i1.min === i2.min) {
      ret = YES.clone()
    } else {
      ret = NO.clone()
    }
  }

  if (i1.intersects(i2)) {
    ret = YESNT.clone()
  } else {
    ret = NO.clone()
  }

  ret.defMin = i1.defMin && i2.defMin
  ret.defMax = i1.defMax && i2.defMax
  ret.contMin = i1.contMin && i2.contMin
  ret.contMax = i1.contMax || i2.contMax

  return ret
}

function NOT_EQUAL(i1, i2) {
  return invertBooleanInterval(EQUAL(i1, i2))
}

function IFELSE(i1, cond, i2) {
  if (cond.min === 1) {
    return i1
  } else if (cond.min === 0 && cond.max === 1) {
    return new IntervalSet([i1, i2])
  } else {
    return i2
  }
}

function PIECEWISE(cond, i1, ...args) {
  if (!i1)
    return cond
  if (!cond)
    return new Interval(0, 0, true, true, true, true)
  if (cond.min === 1) {
    return i1
  } else if (cond.max === 0) {
    return PIECEWISE(...args)
  } else {
    // yesnt
    return new IntervalSet([i1, ...getIntervals(PIECEWISE(...args))])
  }
}

const GAMMA_MIN_X = 1.4616321449683623412626595423257213284681962040064463512959884085987864403538018102430749927337255
const GAMMA_MIN_Y = 0.8856031944108887002788159005825887332079515336699034488712001659

function GAMMA(i1) {
  if (i1.min < 0) {
    return new Interval(-Infinity, Infinity, false, i1.defMax, false, i1.contMax)
  }

  let y1 = gamma(i1.min), y2 = gamma(i1.max)
  let min = Math.min(y1, y2)
  let max = Math.max(y1, y2)

  if (i1.max < GAMMA_MIN_X) {

    return new Interval(min, max, i1.defMin, i1.defMax, i1.contMin, i1.contMax)
  } else if (i1.min < GAMMA_MIN_X && GAMMA_MIN_X < i1.max) {
    return new Interval(GAMMA_MIN_Y, max, i1.defMin, i1.defMax, i1.contMin, i1.contMax)
  } else {
    return new Interval(min, max, i1.defMin, i1.defMax, i1.contMin, i1.contMax)
  }
}

function DIGAMMA(i1) {
  let min = i1.min, max = i1.max

  if (min > 0) {
    let minVal = digamma(min)
    let maxVal = digamma(max)

    return new Interval(minVal, maxVal, i1.defMin, i1.defMax, i1.contMin, i1.contMax)
  }

  let minInt = Math.floor(min), maxInt = Math.ceil(max)
  let intDiff = maxInt - minInt

  if (intDiff === 0) {
    // Then min === max

    return new Interval(0, 0, false, false, i1.contMin, i1.contMax)
  }

  let minVal = digamma(min)
  let maxVal = digamma(max)

  if (intDiff === 1) {
    // Monotonically increasing
    return new Interval(minVal, maxVal, i1.defMin, i1.defMax, i1.contMin, i1.contMax)
  }

  return new Interval(-Infinity, Infinity, false, i1.defMax, false, i1.contMax)
}

function TRIGAMMA(i1) {
  let min = i1.min, max = i1.max

  if (max < 0)
    return new Interval(8.8, Infinity, false, i1.defMax, false, i1.contMax)
  if (min < 0) {
    return new Interval(0, Infinity, false, i1.defMax, false, i1.contMax)
  } else {
    let minVal = trigamma(max), maxVal = trigamma(min)
    return new Interval(minVal, maxVal, i1.defMin, i1.defMax, i1.contMin, i1.contMax)
  }
}

function POLYGAMMA(n, i1) {
  return new Interval(-Infinity, Infinity, false, i1.defMax, false, i1.contMax)
}

// Frankly, I don't know how this code works. I wrote it a long time ago
function SIN(i1) {
  let min = i1.min, max = i1.max

  if (max - min >= 2 * Math.PI) { // If the length is more than a full period, return [-1, 1]
    return new Interval(-1, 1, i1.defMin, i1.defMax, i1.contMin, i1.contMax)
  }

  let a_rem_2p = utils.mod(i1.min, 2 * Math.PI);
  let b_rem_2p = utils.mod(i1.max, 2 * Math.PI);

  let min_rem = Math.min(a_rem_2p, b_rem_2p);
  let max_rem = Math.max(a_rem_2p, b_rem_2p);

  let contains_1 = (min_rem < Math.PI / 2) && (max_rem > Math.PI / 2);
  let contains_n1 = (min_rem < 3 * Math.PI / 2 && max_rem > 3 * Math.PI / 2);

  if (b_rem_2p < a_rem_2p) {
    contains_1 = !contains_1;
    contains_n1 = !contains_n1;
  }

  if (contains_1 && contains_n1)
    return new Interval(-1, 1, i1.defMin, i1.defMax, i1.contMin, i1.contMax)

  let sa = Math.sin(a_rem_2p), sb = Math.sin(b_rem_2p);
  return new Interval(contains_n1 ? -1 : Math.min(sa, sb), contains_1 ? 1 : Math.max(sa, sb),
    i1.defMin, i1.defMax, i1.contMin, i1.contMax);
}

const PI_OVER_TWO = CONST(Math.PI / 2)
const ONE = CONST(1)

function COS(i1) {
  return SIN(ADD(i1, PI_OVER_TWO))
}

function TAN(i1) {
  return DIVIDE(SIN(i1), COS(i1))
}

function SEC(i1) {
  return DIVIDE(ONE, COS(i1))
}

function CSC(i1) {
  return DIVIDE(ONE, SIN(i1))
}

function COT(i1) {
  return DIVIDE(COS(i1), SIN(i1))
}

function ASIN(i1) {
  if (i1.max < -1 || i1.min > 1) {
    return new Interval(0, 0, false, false, true, true)
  }

  if (i1.max <= 1 && i1.min >= -1) { // Defined everywhere
    return new Interval(Math.asin(i1.min), Math.asin(i1.max), i1.defMin, i1.defMax, i1.contMin, i1.contMax)
  }

  let tmp = i1.clone()
  tmp.max = Math.min(1, tmp.max)
  tmp.min = Math.max(-1, tmp.min)

  let res = ASIN(tmp)
  res.defMin = false

  return res
}

const NEGATIVE_ONE = CONST(-1)

function ACOS(i1) {
  return ADD(ASIN(MULTIPLY(i1, NEGATIVE_ONE)), PI_OVER_TWO)
}

function ATAN(i1) {
  // Monotonically increasing everywhere
  return new Interval(Math.atan(i1.min), Math.atan(i1.max), i1.defMin, i1.defMax, i1.contMin, i1.contMax)
}

function ASEC(i1) {
  return ACOS(RECIPROCAL(i1))
}

function ACSC(i1) {
  return ASIN(RECIPROCAL(i1))
}

function ACOT(i1) {
  // Monotonically decreasing everywhere
  return new Interval(ExtraFunctions.Arccot(i1.max), ExtraFunctions.Arccot(i1.min), i1.defMin, i1.defMax, i1.contMin, i1.contMax)
}

function SINH(i1) {
  // Monotonically increasing everywhere
  return new Interval(Math.sinh(i1.min), Math.sinh(i1.max), i1.defMin, i1.defMax, i1.contMin, i1.contMax)
}

function COSH(i1) {
  // Flips direction at (x, y) = (0, 1)
  let val1 = Math.cosh(i1.min), val2 = Math.cosh(i1.max)

  if (i1.min <= 0 && 0 <= i1.max) {
    // if 0 is contained
    return new Interval(1, Math.max(val1, val2), i1.defMin, i1.defMax, i1.contMin, i1.contMax)
  }

  return new Interval(Math.min(val1, val2), Math.max(val1, val2), i1.defMin, i1.defMax, i1.contMin, i1.contMax)
}

function TANH(i1) {
  // Monotonically increasing everywhere
  return new Interval(Math.tanh(i1.min), Math.tanh(i1.max), i1.defMin, i1.defMax, i1.contMin, i1.contMax)
}

function SECH(i1) {
  return RECIPROCAL(COSH(i1))
}

function CSCH(i1) {
  return RECIPROCAL(SINH(i1))
}

function COTH(i1) {
  return RECIPROCAL(TANH(i1))
}

function ASINH(i1) {
  // Monotonically increasing
  return new Interval(Math.asinh(i1.min), Math.asinh(i1.max), i1.defMin, i1.defMax, i1.contMin, i1.contMax)
}

function ACOSH(i1) {
  // Monotonically increasing, undefined for x < 1

  if (i1.max < 1) {
    return new Interval(0, 0, false, false, true, true)
  }

  let defMin = i1.min >= 1

  let min = i1.min
  if (!defMin)
    min = 1

  return new Interval(Math.acosh(min), Math.acosh(i1.max), i1.defMin && defMin, i1.defMax, i1.contMin, i1.contMax)
}

function ATANH(i1) {
  // Monotonically increasing

  let max = Math.min(i1.max, 1)
  let min = Math.max(i1.min, -1)

  let defMin = i1.max === max && i1.min === min

  return new Interval(Math.atanh(min), Math.atanh(max), i1.defMin && defMin, i1.defMax, i1.contMin, i1.contMax)
}

function ASECH(i1) {
  // Monotonically decreasing

  return ACOSH(RECIPROCAL(i1))
}

function ACSCH(i1) {
  return ASINH(RECIPROCAL(i1))
}

function ACOTH(i1) {
  return ATANH(RECIPROCAL(i1))
}

function CCHAIN(i1, compare, i2, ...args) {
  if (!i2)
    return YES.clone()

  let res
  switch (compare) {
    case "<":
      res = LESS_THAN(i1, i2)
      break
    case ">":
      res = GREATER_THAN(i1, i2)
      break
    case "<=":
      res = LESS_EQUAL_THAN(i1, i2)
      break
    case ">=":
      res = GREATER_EQUAL_THAN(i1, i2)
      break
    case "!=":
      res = NOT_EQUAL(i1, i2)
      break
    case "==":
      res = EQUAL(i1, i2)
      break
    default:
      throw new Error("huh")
  }

  if (!res.max)
    return NO.clone()

  if (args.length > 0) {
    let ret = CCHAIN(val2, ...args)

    if (ret.min && res.min) {
      return YES.clone()
    } else if (!ret.max || !res.max) {
      return NO.clone()
    } else {
      return YESNT.clone()
    }
  }
}


const IntervalFunctions = Object.freeze({
  '+': ADD, '*': MULTIPLY, '/': DIVIDE, '-': SUBTRACT, '^': POW, 'pow_rational': POW_RATIONAL, 'sqrt': SQRT, 'cbrt': CBRT,
  '<': LESS_THAN, '>': GREATER_THAN, '<=': LESS_EQUAL_THAN, '>=': GREATER_EQUAL_THAN, '==': EQUAL, '!=': NOT_EQUAL,
  'gamma': GAMMA, 'digamma': DIGAMMA, 'trigamma': TRIGAMMA, 'polygamma': POLYGAMMA, 'sin': SIN, 'cos': COS, 'tan': TAN,
  'cchain': CCHAIN, 'sec': SEC, 'csc': CSC, 'cot': COT, 'asin': ASIN, 'acos': ACOS, 'atan': TAN, 'asec': ASEC, 'acsc': ACSC,
  'acot': ACOT, 'sinh': SINH, 'cosh': COSH, 'tanh': TANH, 'sech': SECH, 'csch': CSCH, 'coth': COTH, 'asinh': ASINH,
  'acosh': ACOSH, 'atanh': ATANH, 'acsch': ACSCH, 'asech': ASECH, 'acoth': ACOTH, 'ifelse': IFELSE, 'piecewise': PIECEWISE,
  'max': MAX, 'min': MIN
})

export {IntervalFunctions, Interval, IntervalSet}
