
// Ah, the gamma function.
import { Sin } from './trig_functions'
import { Add, Divide, Multiply, Subtract } from './basic_arithmetic'
import { Complex } from './complex'
import { Pow } from './pow'
import Exp from './exp'
import { LANCZOS_COEFFICIENTS, gamma } from '../gamma_function'

function Gamma(z) {
  if (z.re < 1/2) {
    // Gamma(z) * Gamma(1-z) = pi / sin(pi * z)
    // Gamma(z) = pi / sin(pi * z) / Gamma(1-z)

    return Divide(new Complex(Math.PI), Multiply(Sin(z.scale(Math.PI)), Gamma(Subtract(Complex.One, z))))
  }

  if (Math.abs(z.im) < 1e-17) {
    return new Complex(gamma(z.re))
  }

  // We use the Lanczos approximation for the factorial function.
  z.re -= 1
  let x = new Complex(LANCZOS_COEFFICIENTS[0])

  let newZ = z.clone()
  let re, im, mag2

  for (let i = 1; i < LANCZOS_COEFFICIENTS.length; ++i) {
    let coeff = LANCZOS_COEFFICIENTS[i]

    newZ.re += 1

    re = newZ.re * coeff
    im = -newZ.im * coeff

    mag2 = newZ.magnitudeSquared()

    re /= mag2
    im /= mag2

    x.re += re
    x.im += im
  }

  let t = z.clone()
  t.re += LANCZOS_COEFFICIENTS.length - 1.5

  return Multiply(new Complex(Math.sqrt(2 * Math.PI)),
    Multiply(x, Multiply(
      Pow(t, Add(z, new Complex(0.5))),
      Exp(t.scale(-1)))))
}

export default Gamma
