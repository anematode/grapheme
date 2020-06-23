import { mod, gcd } from "../core/utils"
import { gamma, polygamma, ln_gamma, digamma, trigamma } from '../math/gamma_function'

const ExtraFunctions = {
  LogB: (b, v) => {
    return Math.log(v) / Math.log(b)
  },
  Factorial: (a) => {
    return Functions.Gamma(a + 1)
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

    let gcd = gcd(p, q)

    if (gcd !== 1) {
      p /= gcd
      q /= gcd
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
  Mod: (n, m) => {
    return ((n % m) + m) % m
  }
}

export { ExtraFunctions }
