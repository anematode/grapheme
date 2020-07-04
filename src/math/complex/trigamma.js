import { trigamma } from '../gamma_function'
import { Complex } from './complex'
import { Sin } from './trig_functions'
import { Add, Divide, Multiply, Subtract } from './basic_arithmetic'
import { PowN } from './pow'

let coeffs = [[1, 1], [2, 1 / 2], [3, 1 / 6], [5, 1 / 30], [7, 1 / 42], [9, 1 / 30], [11, 5 / 66], [13, 691 / 2730], [15, 7 / 6]]

/**
 *
 * @param z
 * @returns {Complex}
 */
function Trigamma(z) {
  if (Math.abs(z.im) < 1e-17)
    return new Complex(trigamma(z.re))

  if (z.re < 0.5) {
    // psi_1(1-z) + psi_1(z) = pi^2 / (sin^2 pi z)
    // psi_1(z) = pi^2 / (sin^2 pi z) - psi_1(1-z)

    return Subtract(Divide(new Complex(Math.PI * Math.PI), PowN(Sin(z.scale(Math.PI)), 2)), Trigamma(Subtract(Complex.One, z)))
  } else if (z.re < 20) {
    // psi_1(z+1) = psi_1(z) - 1/z^2
    // psi_1(z) = psi_1(z+1) + 1/z^2

    let sum = new Complex(0)

    while (z.re < 20) {
      let component = PowN(z, -2)

      z.re += 1

      sum.re += component.re
      sum.im += component.im
    }

    return Add(Trigamma(z), sum)
  }

  let sum = new Complex(0)

  for (let coeffPair of coeffs) {
    let pow = coeffPair[0]
    let coeff = coeffPair[1]

    let part = Multiply(new Complex(coeff), PowN(z, -pow))

    sum.re += part.re
    sum.im += part.im
  }

  return sum
}

export default Trigamma
