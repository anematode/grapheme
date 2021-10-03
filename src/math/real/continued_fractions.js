
// We simply represent continued fractions in the form [a0; a1, a2, a3, ... ] and interpret the value as a0 + 1 / (a1 + 1 / (...)).
// a_n are positive integers if n > 0; a0 may be +-inf or NaN


import { rationalExp, pow2 } from './fp_manip.js'
import { gcd } from '../../core/utils.js'

export function doubleToContinuedFraction (f) {
  if (!Number.isFinite(f) || Number.isInteger(f)) {
    return [f]
  }

  let a0 = Math.floor(f), expansion = [a0]
  let rem = f - a0 // rem = frac(f)

  // guaranteed that n,d <= Number.MAX_SAFE_INTEGER + 1, e<=1. rem = n/d * 2^e
  let [ n, d, e ] = rationalExp(rem)

  // if e is very small, a1 may be a large unrepresentable number. TODO

  ;[ n, d ] = [ d, n ]
  n *= pow2(-e)

  for (let i = 0; i < 10; ++i) {
    let rem = n % d
    let int = Math.floor((n - rem) / d)

    expansion.push(int)

    n -= d * int
    if (n === 0) break

    ;[ n, d ] = [ d, n ]
  }

  return expansion
}

export function rationalsBetween (f1, f2, maxDenom=10) {
  let nLeft = Math.floor(f1), dLeft = 1
  let nRight = Math.ceil(f2), dRight = 1

  let fracs = []

  function recurse (nLeft, dLeft, leftVal, nRight, dRight, rightVal) {
    let nMid = nLeft + nRight, dMid = dLeft + dRight
    let div = gcd(nMid, dMid)

    nMid /= div
    dMid /= div

    if (dMid > maxDenom) {
      if (leftVal >= f1) fracs.push({ n: nLeft, d: dLeft })
      return
    }

    let val = nMid / dMid

    if (!(val < f1 && leftVal < f1)) {
      recurse(nLeft, dLeft, leftVal, nMid, dMid, val)
    }

    if (!(val > f2 && rightVal > f2)) {
      recurse(nMid, dMid, val, nRight, dRight, rightVal)
    }
  }

  recurse (nLeft, dLeft, nLeft/dLeft, nRight, dRight, nRight/dRight)

  if (f2 === nRight) fracs.push({ n: f2, d: 1 })

  return fracs
}

export function limitedRationalsBetween (f1, f2, count=10) {
  // The principle here is simple: we calculate each successive level of the Stern–Brocot tree between f1 and f2 via a
  // breadth-first search, searching via increasing denominator

  let nLeft = Math.floor(f1), dLeft = 1
  let nRight = Math.ceil(f2), dRight = 1

  let queue = [{ nLeft, dLeft, leftVal: nLeft / dLeft, nRight, dRight, rightVal: nRight / dRight }]
  let maxDenom = 2 // maxDenom_(n+1) = maxDenom_n * 1.2

  function calcTree () {
    let newQueue = []

    for (let entry of queue) {
      let { nLeft, dLeft, leftVal, nRight, dRight, rightVal } = entry

      let nMid = nLeft + nRight, dMid = dLeft + dRight
      let div = gcd(nMid, dMid)

      nMid /= div
      dMid /= div

      if (dMid > maxDenom) {
        newQueue.push(entry)
        continue
      }

      let val = nMid / dMid

      if (!(val < f1 && leftVal < f1)) {
        newQueue.push({ nLeft, dLeft, leftVal, nRight: nMid, dRight: dMid, rightVal: val })
      }

      if (!(val > f2 && rightVal > f2)) {
        console.log(val, rightVal, f2, nMid, dMid)
        newQueue.push({ nLeft: nMid, dLeft: dMid, leftVal: val, nRight, dRight, rightVal })
      }
    }

    maxDenom *= 1.2
    queue = newQueue
  }

  for (let i = 0; i < 100; ++i) {
    calcTree()
    if (queue.length > count) {
      let last = queue[queue.length - 1]
      if (last.rightVal === f2 && false) // pseudo segment for last value
        queue.push({ nLeft: last.nRight, dLeft: last.dRight, leftVal: last.rightVal })

      return queue.filter(v => (v.leftVal >= f1 && v.leftVal <= f2)).map(v => ({ n: v.nLeft, d: v.dLeft, v: v.leftVal }))
    }
  }
}
