// An interval is defined as a series of six values, namely two floating point values, two booleans for domain tracking, and two booleans for continuity tracking.
// See more information at this (very readable) paper by Jeff Tupper:


class Interval {
  constructor(params={}) {
    this.min = params.min === undefined ? 0 : params.min
    this.max = params.max === undefined ? 0 : params.max
    this.defMin = params.defMin === undefined ? false : params.defMin
    this.defMax = params.defMax === undefined ? true : params.defMax
    this.contMin = params.contMin === undefined ? false : params.contMin
    this.contMax = params.contMax === undefined ? false : params.contMax
  }

  isSet() {
    return false
  }

  prettyPrint() {
    return `(${this.min}, ${this.max}), <${this.defMin}, ${this.defMax}>, <${this.contMin}, ${this.contMax}>`
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
    let interval = new Interval()

    interval.min = i1.min + i2.min
    interval.max = i1.max + i2.max

    interval.defMin = i1.defMin && i2.defMin
    interval.defMax = i1.defMax && i2.defMax

    interval.contMin = i1.contMin && i2.contMin
    interval.contMax = i1.contMax && i2.contMax

    return interval
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
    let interval = new Interval()

    let prod1 = i1.min * i2.min
    let prod2 = i1.min * i2.max
    let prod3 = i1.max * i2.min
    let prod4 = i1.max * i2.max

    interval.min = Math.min(prod1, prod2, prod3, prod4)
    interval.max = Math.max(prod1, prod2, prod3, prod4)

    interval.defMin = i1.defMin && i2.defMin
    interval.defMax = i1.defMax && i2.defMax

    interval.contMin = i1.contMin && i2.contMin
    interval.contMax = i1.contMax && i2.contMax

    return interval
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
    let interval = new Interval()

    interval.min = i1.min - i2.max
    interval.max = i1.max - i2.min

    interval.defMin = i1.defMin && i2.defMin
    interval.defMax = i1.defMax && i2.defMax

    interval.contMin = i1.contMin && i2.contMin
    interval.contMax = i1.contMax && i2.contMax

    return interval
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

    let returnedProps = {defMin: i1.defMin, defMax: i1.defMax, contMin: i1.contMin, contMax: i1.contMax}

    if (0 < min || max < 0) {
      return new Interval({min: 1 / max, max: 1 / min, ...returnedProps})
    } else if (max === 0) {
      return new Interval({min: -Infinity, max: 1 / min, ...returnedProps})
    } else if (min === 0) {
      return new Interval({min: 1 / max, max: Infinity, ...returnedProps})
    } else {
      // 0 contained in the interval

      let interval1 = new Interval({min: -Infinity, max: 1 / min, ...returnedProps})
      let interval2 = new Interval({min: 1 / max, max: Infinity, ...returnedProps})

      return new IntervalSet([interval1, interval2])
    }
  }
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

      return new Interval({min: absMin, max: absMax, defMin: i1.defMin, defMax: i1.defMax, contMin: i1.contMin, contMax: i1.contMax})
    }
  }
}

function POW_N(i1, n) {
  let isSet = i1.isSet()

  if (isSet) {

  }
}

const Intervals = {ADD, MULTIPLY, DIVIDE, SUBTRACT}

Object.freeze(Intervals)

export {Intervals}
