
import { RealInterval, roundDown, roundUp, wrapIntervalSetFunction, RealIntervalSet, getIntervals } from './interval'
import { DIGAMMA_ZEROES, gamma, ln_gamma } from '../gamma_function'
import { Ln } from './log'

const FIRST_ZERO = 1.461632144963766

function _Gamma(int) {
  if (int.min < 0 && int.max > 0) {
    let ints1 = _Gamma(new RealInterval(0, int.max, int.defMin, int.defMax))
    let ints2 = _Gamma(new RealInterval(int.min, 0, int.defMin, int.defMax))

    return new RealIntervalSet(getIntervals(ints1).concat(getIntervals(ints2)))
  }

  if (int.min > FIRST_ZERO) {
    return new RealInterval(gamma(int.min), gamma(int.max), int.defMin, int.defMax)
  } else if (int.min >= 0) {
    if (int.max < FIRST_ZERO) {
      let gMin = gamma(int.min), gMax = gamma(int.max)

      let max = roundUp(Math.max(gMin, gMax))

      let min = roundDown(Math.min(gMin, gMax))

      return new RealInterval(min, max, int.defMin, int.defMax)
    } else {
      let max = roundUp(Math.max(gamma(int.min), gamma(int.max)))

      return new RealInterval(0.8856031944108887003, max, int.defMin, int.defMax)
    }
  } else {
    let minAsymptote = Math.floor(int.min)

    let zeroI = 1000+minAsymptote
    let zero

    for (let i = Math.max(0, zeroI - 2); i < Math.min(zeroI + 2, DIGAMMA_ZEROES.length - 1); ++i) {
      zero = DIGAMMA_ZEROES[i]

      if (zero > minAsymptote) {
        zeroI = i
        break
      }
    }

    let nextZero = DIGAMMA_ZEROES[zeroI + 1]

    let gammaAtFirstZero = gamma(zero)
    let gammaAtNextZero = gamma(nextZero)

    let min = 0, max = 0

    if (gammaAtFirstZero < 0) {
      if (int.min < zero && int.max > zero)
        min = gammaAtFirstZero
      else
        min = gamma(int.min)
    } else {
      if (int.min < zero && int.max > zero)
        max = gammaAtFirstZero
      else
        max = gamma(int.min)
    }

    if (gammaAtNextZero < 0) {
      if (int.max > nextZero)
        min = gammaAtNextZero
      else
        min = gamma(int.max)
    } else {
      if (int.max > nextZero)
        max = gammaAtNextZero
      else {
        if (int.max === 0)
          max = -Infinity
        else
          max = gamma(int.max)
      }
    }

    let rMin = Math.min(min, max), rMax = Math.max(min, max)

    if (int.max <= Math.floor(nextZero) ) {
      return new RealInterval(roundDown(rMin), roundUp(rMax), int.defMin, int.defMax)
    } else {
      return new RealIntervalSet([
        new RealInterval(-Infinity, roundUp(rMin), int.defMin, int.defMax),
        new RealInterval(roundDown(rMax), Infinity, int.defMin, int.defMax)
      ])
    }
  }
}

function _LnGamma(int) {
  if (int.max < 0) {
    return Ln(Gamma(int))
  }

  if (int.min < 0 && int.max > 0) {
    return _LnGamma(new RealInterval(0, int.max, int.defMin, int.defMax))
  }

  if (int.min > FIRST_ZERO) {
    return new RealInterval(roundDown(ln_gamma(int.min)), roundUp(ln_gamma(int.max)), int.defMin, int.defMax)
  } else if (int.min >= 0) {
    if (int.max < FIRST_ZERO) {
      return new RealInterval(roundDown(ln_gamma(int.max)), roundUp(ln_gamma(int.min)), int.defMin, int.defMax)
    } else {
      return new RealInterval(ln_gamma(FIRST_ZERO), roundUp(Math.max(ln_gamma(int.max), ln_gamma(int.min))), int.defMin, int.defMax)
    }
  }

  return new RealInterval(NaN, NaN, false, false)
}

export const Gamma = wrapIntervalSetFunction(_Gamma)
export const LnGamma = wrapIntervalSetFunction(_LnGamma)
