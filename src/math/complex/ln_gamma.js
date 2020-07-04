import { LANCZOS_COEFFICIENTS, ln_gamma } from '../gamma_function'
import { Complex } from './complex'
import { Add, Divide, Multiply, Subtract } from './basic_arithmetic'
import { Ln } from './log'
import { Sin } from './trig_functions'

const logPi = Math.log(Math.PI)
const logSqrt2Pi = Math.log(2 * Math.PI) / 2

function LnGamma (z) {
  if (Math.abs(z.im) < 1e-17) {
    return new Complex(ln_gamma(z.re))
  }

  if (z.re < 0.5) {
    // Compute via reflection formula
    let reflected = LnGamma(Subtract(Complex.One, z))

    return Subtract(Subtract(new Complex(logPi), Ln(Sin(Multiply(new Complex(Math.PI), z)))), reflected)
  } else {
    z.re -= 1

    const g = 7

    var x = new Complex(LANCZOS_COEFFICIENTS[0])

    for (var i = 1; i < g + 2; i++) {
      let component = Divide(new Complex(LANCZOS_COEFFICIENTS[i]), Add(z, new Complex(i)))

      x.re += component.re
      x.im += component.im
    }

    var t = Add(z, new Complex(g + 0.5))

    return Add(new Complex(logSqrt2Pi), Add(Subtract(Multiply(Ln(t), Add(z, new Complex(0.5))), t), Ln(x)))
  }
}

export default LnGamma
