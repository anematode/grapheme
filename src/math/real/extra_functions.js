import { mod, gcd } from "../../core/utils"
import { gamma, polygamma, ln_gamma, digamma, trigamma } from '../gamma_function'

const ExtraFunctions = {
  LogB: (b, v) => {
    return Math.log(v) / Math.log(b)
  },
  Factorial: (a) => {
    return ExtraFunctions.Gamma(a + 1)
  },
  Gamma: (a) => {
    return gamma(a)
  },
  LnGamma: (a) => {
    return ln_gamma(a)
  },
  Digamma: (a) => {
    return digamma(a)
  },
  Trigamma: (a) => {
    return trigamma(a)
  },
  Polygamma: (n, a) => {
    return polygamma(n, a)
  },
  Arccot: (z) => {
    let t = Math.atan(1 / z)

    if (t < 0) {
      t += Math.PI
    }

    return t
  },
  PowRational: (x, p, q) => {
    // Calculates x ^ (p / q), where p and q are integers

    if (p === 0) {
      return 1
    }

    let GCD = gcd(p, q)

    if (GCD !== 1) {
      p /= GCD
      q /= GCD
    }

    if (x >= 0) {
      return Math.pow(x, p / q)
    } else {
      if (mod(q, 2) === 0)
        return NaN

      let ret = Math.pow(-x, p / q)
      if (mod(p, 2) === 0) {
        return ret
      } else {
        return -ret
      }
    }
  },
  Pow: (x, r) => { // Tries to find a ratio close to r, then do PowRational, otherwise just do normal pow

  },
  Mod: (n, m) => {
    return ((n % m) + m) % m
  }
}

export default ExtraFunctions
