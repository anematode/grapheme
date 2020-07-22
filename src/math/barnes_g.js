import * as utils from '../core/utils'
import { digamma, ln_gamma, polygamma } from './gamma_function'
import { integrate } from './numerical_integration'
import { Cl2 } from './clausen'
import { nCr } from '../core/utils'

function integrateCow(z, terms=50) {
  return integrate(x => {
    return (x < 0.0001) ? -1 : x * digamma(x)
  }, 0, z,  terms)
}

function lnBarnesG(z, terms=50) {
  if (z < 0)
    return NaN

  // log G(z + 1) = (z - z^2) / 2 + z * log(2 * Math.PI) / 2 + integrateCow(z)
  // We want log G(z) of course

  z--

  return (z - z*z) / 2 + z / 2 * Math.log(2 * Math.PI) + integrateCow(z, terms)
}

const BARNES_G_VALUES = [0, 1, 1, 1, 2, 12, 288, 34560, 24883200, 125411328000]

function barnesG(z, terms=8) {
  // G(-z) = (-1)^(floor(z/2) - 1) * G(z+2) * (|sin(pi z)| / pi
  if (z < 1) {
    if (Number.isInteger(z))
      return 0

    // 2 pi log(G(1-z) / G(1+z)) = 2 pi z * log(sin pi z / pi) + Cl2(2 pi z)
    // Thus G(1-z) = G(1+z) * ( (sin(pi z) / pi)^z + exp(Cl2(2 pi z) / (2 pi)) )
    z = 1 - z

    let z2pi = 2 * Math.PI * z

    let base = Math.sin(Math.PI * z) / Math.PI

    return barnesG(1 + z, terms) * (Math.sign(base) * Math.abs(base) ** z * Math.exp(Cl2(z2pi) / (2 * Math.PI)))
  }

  if (Number.isInteger(z) && z < 10) {
    return BARNES_G_VALUES[z]
  }

  return Math.exp(lnBarnesG(z, terms))
}

const log2Pi = Math.log(2 * Math.PI)

function integrateLnGamma(z) {
  if (z === 1) {
    return log2Pi / 2
  }

  return z/2 * log2Pi + z * (1-z) / 2 + z * ln_gamma(z) - lnBarnesG(z+1)
}

function lnKFunction(z) {
  return log2Pi * ((1 - z) / 2) + (nCr(z, 2) + integrateLnGamma(z) - integrateLnGamma(1))
}

function KFunction(z) {
  if (z >= 0 && Number.isInteger(z)) {
    let prod = 1

    for (let i = 0; i < z; ++i) {
      prod *= i ** i
    }

    return prod
  }

  return Math.exp(lnKFunction(z))
}


export { barnesG, lnBarnesG, integrateLnGamma, lnKFunction, KFunction }
