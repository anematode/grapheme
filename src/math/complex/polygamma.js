import { Complex } from './complex'
import Digamma from './digamma'
import Trigamma from './trigamma'
import { getPolygammaNumeratorPolynomial, gamma } from '../gamma_function'
import { Add, Divide, Multiply, Subtract } from './basic_arithmetic'
import { Cos, Sin } from './trig_functions'
import { PowN } from './pow'

/**
 * Returns polygamma(m, z), where polygamma is the mth logarithmic derivative of the gamma function.
 * @param m {number}
 * @param z {Complex}
 * @returns {Complex}
 */
function Polygamma(m, z) {
  if (m < 0)
    return new Complex(NaN, NaN)
  if (m % 1 !== 0)
    return new Complex(NaN, NaN)

  if (m === 0)
    return Digamma(z)
  else if (m === 1)
    return Trigamma(z)

  let sign = (m % 2 === 0) ? -1 : 1
  let numPoly = getPolygammaNumeratorPolynomial(m)

  if (z < 0.5) {
    if (z % 1 === 0)
      return new Complex(Infinity)

    // Reflection formula, see https://en.wikipedia.org/wiki/Polygamma_function#Reflection_relation
    // psi_m(z) = pi ^ (m+1) * numPoly(cos(pi z)) / (sin ^ (m+1) (pi z)) + (-1)^(m+1) psi_m(1-z)

    return Multiply(new Complex(-1), Divide(numPoly.evaluateComplex(Cos(z.scale(Math.PI))).scale(Math.pow(Math.PI, m + 1)),
      (PowN(Sin(z.scale(Math.PI)), m+1)) + sign * Polygamma(m, Subtract(Complex.One, z))))
  } else if (z < 8) {
    // Recurrence relation
    // psi_m(z) = psi_m(z+1) + (-1)^(m+1) * m! / z^(m+1)

    return Add(Polygamma(m, z+1), Divide(new Complex(sign * gamma(m + 1)), PowN(z, m+1)))
  }

  // Series representation

  let sum = new Complex(0)

  for (let i = 0; i < 200; ++i) {
    let component = Divide(Complex.One, PowN(Add(z, new Complex(i)), m + 1))
    sum.re += component.re
    sum.im += component.im
  }

  return Multiply(new Complex(sign * gamma(m + 1)), sum)
}

export default Polygamma
