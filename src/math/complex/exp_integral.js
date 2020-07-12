import { Ln } from './log'
import * as utils from '../../core/utils'
import { Add, Multiply } from './basic_arithmetic'
import Exp from './exp'
import { ei, getEiCoeff } from '../exp_integral'
import {Complex } from './complex'

export const Ei = (z) => {
  if (z.im < 1e-17)
    return new Complex(ei(z.re))

  let sum = new Complex(0)
  let accum = new Complex(1)

  let terms = Math.min(Math.max(4 * z.magnitudeSquared() ** 0.375, 8), 100)

  for (let n = 1; n < terms; ++n) {
    accum = Multiply(accum, z.scale(1/n))

    let component = accum.scale(getEiCoeff(n))

    accum.re *= -0.5
    accum.im *= -0.5

    sum.re += component.re
    sum.im += component.im
  }

  return Add(new Complex(utils.eulerGamma), Add(Ln(z), Multiply(Exp(z.scale(0.5)), sum)))
}

export const Li = (z) => {
  return Ei(Ln(z))
}
