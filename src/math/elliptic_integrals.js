import { agm } from './agm'
import { nCrFloat } from '../core/utils'
import { hypergeometric } from './hypergeometric'

function ellipticK(m) {
  const absM = Math.abs(m)

  if (m > 1)
    return NaN

  if (absM === 1)
    return Infinity

  return Math.PI / 2 / agm(1, Math.sqrt(1 - m))
}

// See https://dlmf.nist.gov/19.8
function ellipticE(m, tolerance=1e-15) {
  if (m > 1)
    return NaN
  else if (m === 1)
    return 1

  if (m > 0) {
    let an = 1, gn = Math.sqrt(1 - m)
    let cn = Math.sqrt(Math.abs(an * an - gn * gn))
    let i = 0
    let sum = 0

    do {
      sum += (2 ** (i - 1)) * cn * cn

      i++

      let tmp = an
      an = (an + gn) / 2
      gn = Math.sqrt(tmp * gn)

      cn = cn * cn / (4 * an)
    } while (Math.abs(an - gn) > tolerance && i < agm.MAX_ITERS)

    return Math.PI / (2 * an) * (1 - sum);
  } else if (m === 0) {
    return Math.PI / 2
  } else {
    // Note that E(-m) = sqrt(m+1) * E(m / (m+1))

    let nM = -m

    return Math.sqrt(nM + 1) * ellipticE(nM / (nM + 1), tolerance)
  }
}

// Doesn't work yet
function ellipticPi(n, m, tolerance=1e-15) {
  if (m > 1)
    return NaN
  else if (m === 1)
    return Infinity

  if (m > 0) {
    let an = 1, gn = Math.sqrt(1 - m)
    let cn = Math.sqrt(Math.abs(an * an - gn * gn))
    let pn = 1 - n
    let Qn = 1
    let i = 0
    let sum = 0

    do {
      sum += Qn

      i++

      let tmp = an
      an = (an + gn) / 2
      gn = Math.sqrt(tmp * gn)

      cn = cn * cn / (4 * an)

      let pn2 = pn * pn
      let angn = an * gn

      let en = (pn2 - angn) / (pn2 + angn)

      pn = (pn2 + angn) / (2 * pn)

      Qn = 0.5 * Qn * en

    } while (Math.abs(an - gn) > tolerance && i < agm.MAX_ITERS)

    return Math.PI / (4 * an) * (2 + n / (1 - n) * sum);
  } else if (m === 0) {
    return Math.PI / (2 * Math.sqrt(1 - n))
  } else {
    // Note that Pi(n, -m) = 1 / ((1 - n) * sqrt(m + 1)) * Pi(n / (n-1) | m / (m+1))

    let nM = -m
    let a = Math.sqrt(n)

    return 1 / ((1 - n) * Math.sqrt(nM + 1) * ellipticPi(n / (n - 1), nM / (nM + 1)))
  }
}

function ellipsePerimeter(a, b) {
  return 4 * a * ellipticE(1 - b * b / (a * a))
}


export { ellipticK, ellipticE, ellipticPi, ellipsePerimeter }
