// This class represents an interval [min, max]. If defMin=defMax=true, the interval is defined for all x. If defMin=false
// and defMax=true, then the interval may be defined for all x. If defMin=defMax=false, the interval is undefined for
// all x. For example, sqrt([-2,-1]) would have defMin=defMax=false
class RealInterval {
  constructor (min = 0, max = min, defMin = true, defMax = true) {
    this.min = min
    this.max = max
    this.defMin = defMin
    this.defMax = defMax
  }

  /**
   * Returns whether the interval can be represented as a single number; does it contain only one number.
   * @returns {boolean}
   */
  isExact () {
    return this.min === this.max
  }

  /**
   * Returns whether the interval is a set of intervals, aka false
   * @returns {boolean}
   */
  isSet () {
    return false
  }

  /**
   * Print out the interval nicely for analysis
   * @returns {string}
   */
  prettyPrint () {
    return `(${this.min}, ${this.max}), <${this.defMin}, ${this.defMax}>`
  }

  /**
   * Clone the interval
   * @returns {RealInterval}
   */
  clone () {
    return new RealInterval(this.min, this.max, this.defMin, this.defMax)
  }

  /**
   * Whether x is contained within the interval.
   * @param x
   */
  contains (x) {
    return this.min <= x && x <= this.max
  }

  intersects (i) {
    if (i.isSet()) {
      return getIntervals(i).some(int => this.intersects(int))
    } else {
      return i.contains(this.min) || i.contains(this.max) || this.contains(i.min)
    }
  }

  equals(i1) {
    return (this.min === i1.min && this.max === i1.max && this.defMin === i1.defMin && this.defMax === i1.defMax)
  }

  static get One () {
    return constructIntervalFromFloat(1)
  }

  static get Yes () {
    return new RealInterval(1, 1, true, true)
  }

  static get Yesnt () {
    return new RealInterval(0, 1, true, true)
  }

  static get No () {
    return new RealInterval(0, 0, true, false)
  }

  static fromNumber(d, correctRounding=true) {
    if (correctRounding && typeof d === "string") {
      // We can check whether d is exactly representable as a float
      // TODO make more general

      let f = parseFloat(d)

      if (f === parseInt(d)) {
        correctRounding = false

        d = f
      }
    }

    if (correctRounding)
      return constructIntervalFromFloat(d)
    else
      return new RealInterval(d, d, true, true)
  }
}

/**
 * Convert an Interval or an IntervalSet into a list of intervals
 * @param i
 * @returns {Array}
 */
function getIntervals (i) {
  if (i.isSet()) {
    return i.intervals
  } else {
    return [i]
  }
}

/**
 * Represents a set of RealIntervals
 */
class RealIntervalSet {
  constructor (intervals = []) {
    this.intervals = intervals
  }

  get min () {
    return Math.min.apply(null, this.intervals.map(interval => interval.min))
  }

  get max () {
    return Math.max.apply(null, this.intervals.map(interval => interval.max))
  }

  get defMin () {
    return !!Math.min.apply(null, this.intervals.map(interval => interval.defMin))
  }

  get defMax () {
    return !!Math.max.apply(null, this.intervals.map(interval => interval.defMax))
  }

  isSet () {
    return true
  }

  isExact () {
    return this.min === this.max
  }

  contains (x) {
    return this.intervals.some(i => i.contains(x))
  }

  intersects (i) {
    return this.intervals.some(interval => interval.intersects(i))
  }
}

function applyTuples (callback, intervals) {
  switch (intervals.length) {
    case 0:
      return
    case 1:
      intervals[0].forEach(callback)
      break
    case 2:
      let int1 = intervals[0]
      let int2 = intervals[1]

      int1.forEach(i1 => {
        int2.forEach(i2 => {
          callback(i1, i2)
        })
      })
      break
    default:
      let remainingIntervals = intervals.slice(1)
      intervals[0].forEach(int => {
        applyTuples((...args) => {
          callback(int, ...args)
        }, remainingIntervals)
      })
  }
}

function wrapIntervalSetFunction (func, intervalArgCount=func.length) {
  return function (...intervals) {
    let isSet = false
    let extraParams = intervals.slice(intervalArgCount)

    for (let i = 0; i < intervalArgCount; ++i) {
      let interval = intervals[i]

      if (interval.isSet()) {
        isSet = true
        break
      }
    }

    if (isSet) {
      const retIntervals = []

      const obtainedIntervals = intervals.slice(0, intervalArgCount).map(getIntervals)

      applyTuples((...ints) => {
        const result = func(...ints, ...extraParams)

        const intervals = getIntervals(result)

        for (let i = 0; i < intervals.length; ++i) {
          retIntervals.push(intervals[i])
        }
      }, obtainedIntervals)

      return new RealIntervalSet(retIntervals)
    } else {
      return func(...intervals)
    }
  }
}

const floatStore = new Float64Array(1)

const intView = new Uint32Array(floatStore.buffer)

let correctRounding = true

const roundUpCorrectRounding = (x) => {
  if (x === Infinity) {
    return Infinity
  }
  if (x === -Infinity) {
    return -Number.MAX_VALUE
  }
  if (x === 0) {
    return Number.MIN_VALUE
  }
  if (isNaN(x)) {
    return NaN
  }

  if (x < 0) {
    return -roundDownCorrectRounding(-x)
  }

  floatStore[0] = x

  let leastSignificantGroup = ++intView[0]

  if (leastSignificantGroup === 0) {
    ++intView[1]
  }

  return floatStore[0]
}

const roundDownCorrectRounding = (x) => {
  if (x === Infinity) {
    return Number.MAX_VALUE
  }
  if (x === -Infinity) {
    return -Infinity
  }
  if (x === 0) {
    return -Number.MIN_VALUE
  }
  if (isNaN(x)) {
    return NaN
  }

  if (x < 0) {
    return -roundUpCorrectRounding(-x)
  }

  floatStore[0] = x

  let leastSignificantGroup = --intView[0]

  if (leastSignificantGroup === -1) {
    --intView[1]
  }

  return floatStore[0]
}

let roundUp = roundUpCorrectRounding
let roundDown = roundDownCorrectRounding

const identity = (x) => x

function toggleCorrectRounding(v) {
  if (v === correctRounding)
    return

  if (v) {
    roundUp = roundUpCorrectRounding
    roundDown = roundDownCorrectRounding
  } else {
    roundUp = roundDown = identity
  }
}

function constructIntervalFromFloat (f) {
  return new RealInterval(roundDown(f), roundUp(f))
}

export { RealInterval, wrapIntervalSetFunction, roundUp, roundDown, toggleCorrectRounding, RealIntervalSet, getIntervals }
