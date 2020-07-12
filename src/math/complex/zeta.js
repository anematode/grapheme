import { zeta } from '../riemann_zeta'
import { Complex } from './complex'
import { Pow, PowZ } from './pow'
import { Divide, Subtract, Add, Multiply } from './basic_arithmetic'
import { Sin } from './trig_functions'
import Gamma from './gamma'

let ZETA_COEFFS = zeta.coeffs
let ZETA_N = zeta.n

function Chi(s) {
  let powers = Multiply(PowZ(2, s), PowZ(Math.PI, Subtract(s, new Complex(1))))

  let sine = Sin(s.scale(Math.PI / 2))

  let gamma = Gamma(Subtract(new Complex(1), s))

  return Multiply(powers, Multiply(sine, gamma))
}

function RiemannSiegel(z) {
  let t = z.im
  let m = 10

  let chiS = Chi(z)

  let sum = new Complex(0)

  let mZ = z.scale(-1)

  for (let n = 1; n <= m; ++n) {
    let component = PowZ(n, mZ)

    sum.re += component.re
    sum.im += component.im
  }

  let secondSum = new Complex(0)

  let oneMz = Subtract(z, new Complex(1))

  for (let n = 1; n <= m; ++n) {
    let component = PowZ(n, oneMz)

    secondSum.re += component.re
    secondSum.im += component.im
  }

  secondSum = Multiply(chiS, secondSum)

  return Add(sum, secondSum)
}

// Implementation of the riemann zeta function for complex numbers

function Zeta(z) {
  if (Math.abs(z.im) < 1e-17)
    return new Complex(zeta(z.re))

  if (z.re < 0.5) {
    // Reflection formula

    return Multiply(Chi(z), Zeta(Subtract(new Complex(1), z)))
  }

  if (0 <= z.re && z.re <= 1 && Math.abs(z.im) > 48.005150881167159727942472749427) {
    return RiemannSiegel(z)
  }

  // series time

  let seriesSum = new Complex(0)

  let sign = new Complex(1)

  for (let k = 0; k < ZETA_N; ++k) {
    let component = Divide(sign, PowZ(k + 1, z)).scale(ZETA_COEFFS[k + 1])

    seriesSum.re += component.re
    seriesSum.im += component.im

    sign.re *= -1
  }

  return Divide(seriesSum, Multiply(new Complex(ZETA_COEFFS[0]), Subtract(new Complex(1), PowZ(2, Subtract(new Complex(1), z)))))
}

// Dirichlet eta function
function Eta(z) {
  return Multiply(Zeta(z), Subtract(new Complex(1), PowZ(2, Subtract(new Complex(1), z))))
}

export {Eta, Zeta}
