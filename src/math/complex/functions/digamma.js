import { GREGORY_COEFFICIENTS } from '../../gamma_function'
import { Add, Divide, Multiply, Subtract } from './basic_arithmetic'
import { Complex } from '../complex'
import { Cot } from './trig_functions'
import { Ln } from './log'

/**
 * Evaluates the digamma function of z.
 * @return {Complex}
 */
function Digamma(z) {
  if (z.re < 0.5) {
    // psi(1-x) - psi(x) = pi cot(pi x)
    // psi(x) = psi(1-x) - pi cot (pi x)

    return Subtract(Digamma(Subtract(Complex.One, z)), Cot(z.scale(Math.PI)).scale(Math.PI))
  } else if (z.re < 5) {
    // psi(x+1) = psi(x) + 1/x
    // psi(x) = psi(x+1) - 1/x

    return Subtract(Digamma(Add(z, Complex.One)), Divide(Complex.One, z))
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
