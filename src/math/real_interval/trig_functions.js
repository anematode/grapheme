import { RealInterval, roundDown, roundUp, wrapIntervalSetFunction, RealIntervalSet, getIntervals } from './interval'
import * as utils from "../../core/utils"
import { Add, Divide } from './basic_arithmetic'

// Frankly, I don't know how this code works. I wrote it a long time ago
function _Sin(i1) {
  let min = i1.min, max = i1.max

  if (min === max) {
    let sin = Math.sin(min)

    return new RealInterval(roundDown(sin), roundUp(sin), i1.defMin, i1.defMax)
  }

  if (max - min >= 2 * Math.PI) { // If the length is more than a full period, return [-1, 1]
    return new RealInterval(-1, 1, i1.defMin, i1.defMax)
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
    return new RealInterval(-1, 1, i1.defMin, i1.defMax)

  let sa = Math.sin(a_rem_2p), sb = Math.sin(b_rem_2p);
  return new RealInterval(contains_n1 ? -1 : roundDown(Math.min(sa, sb)), contains_1 ? 1 : roundUp(Math.max(sa, sb)),
    i1.defMin, i1.defMax);
}

const PI_OVER_TWO = RealInterval.fromNumber(Math.PI / 2)

function _Cos(i1) {
  return Sin(Add(i1, PI_OVER_TWO))
}

function _Tan(i1) {
  return Divide(_Sin(i1), _Cos(i1))
}

function _Sec(i1) {
  return Divide(RealInterval.One, _Cos(i1))
}

function _Csc(i1) {
  return Divide(RealInterval.One, _Sin(i1))
}

function _Cot(i1) {
  return Divide(_Cos(i1), _Sin(i1))
}

function _Sinh(i1) {
  return new RealInterval(roundDown(Math.sinh(i1.min)), roundUp(Math.sinh(i1.max)), i1.defMin, i1.defMax)
}

function _Cosh(i1) {
  let coshiMin = Math.cosh(i1.min), coshiMax = Math.cosh(i1.max)
  let max = Math.max(coshiMin, coshiMax)

  if (i1.min < 0 && i1.max > 0) {
    return new RealInterval(1, roundUp(max), i1.defMin, i1.defMax)
  }

  let min = Math.min(coshiMin, coshiMax)

  return new RealInterval()
}


export const Sin = wrapIntervalSetFunction(_Sin)
export const Cos = wrapIntervalSetFunction(_Cos)
export const Tan = wrapIntervalSetFunction(_Tan)
export const Sec = wrapIntervalSetFunction(_Sec)
export const Csc = wrapIntervalSetFunction(_Csc)
export const Cot = wrapIntervalSetFunction(_Cot)
