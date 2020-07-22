import { RealInterval, roundDown, roundUp, wrapIntervalSetFunction, RealIntervalSet, getIntervals } from './interval'
import { Divide } from './basic_arithmetic'

function _Ln(int1) {
  if (int1.max <= 0) {
    // Interval is wholly undefined
    return new RealInterval(NaN, NaN, false, false)
  }

  if (int1.min < 0) {
    return _Ln(new RealInterval(0, int1.max, false, int1.defMax))
  }

  return new RealInterval(roundDown(Math.log(int1.min)), roundUp(Math.log(int1.max)), int1.defMin, int1.defMax)
}

const LN10 = RealInterval.fromNumber(Math.log(10))
const LN2 = RealInterval.fromNumber(Math.log(2))

function _Log10(int1) {
  return Divide(_Ln(int1), LN10)
}

function _Log2(int1) {
  return Divide(_Ln(int1), LN2)
}

function _Exp(i1) {
  let min = i1.min
  let max = i1.max

  let expMin = roundDown(Math.exp(min))
  let expMax = roundUp(Math.exp(max))

  return new RealInterval(expMin, expMax, i1.defMin, i1.defMax)
}

export const Exp = wrapIntervalSetFunction(_Exp)
export const Ln = wrapIntervalSetFunction(_Ln)
export const Log10 = wrapIntervalSetFunction(_Log10)
export const Log2 = wrapIntervalSetFunction(_Log2)
