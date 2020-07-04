import { GREGORY_COEFFICIENTS } from '../gamma_function'
import { Add, Divide, Multiply, Subtract } from './basic_arithmetic'
import { Complex } from './complex'
import { Cot } from './trig_functions'
import { Ln } from './log'

/**
 * Evaluates the digamma function of z.
 * @param z {Complex}
 * @return {Complex}
 */
function Digamma(z) {
  if (z.re < 0.5) {
    // psi(1-x) - psi(x) = pi cot(pi x)
    // psi(x) = psi(1-x) - pi cot (pi x)

    return Subtract(Digamma(Subtract(Complex.One, z)), Cot(z.scale(Math.PI)).scale(Math.PI))
  } else if (z.re < 15) {
    // psi(x+1) = psi(x) + 1/x
    // psi(x) = psi(x+1) - 1/x

    let sum = new Complex(0)
    let one = Complex.One

    while (z.re < 15) {
      let component = Divide(one, z)

      z.re += 1

      sum.re += component.re
      sum.im += component.im
    }

    return Subtract(Digamma(z), sum)
  }

  let egg = new Complex(1)
  let sum = Ln(z)

  for (let n = 1; n < 15; ++n) {
    let coeff = Math.abs(GREGORY_COEFFICIENTS[n])

    egg = Divide(Multiply(egg, new Complex(((n-1) ? (n-1) : 1))), Add(z, new Complex(n - 1)))

    sum.re -= coeff * egg.re
    sum.im -= coeff * egg.im
  }

  return sum
}

export default Digamma
