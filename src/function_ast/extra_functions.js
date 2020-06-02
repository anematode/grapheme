import { mod, gcd } from "../core/utils"
import { gamma, polygamma } from '../math/gamma_function'

const Functions = {
  LogB: (b, v) => {
    return Math.ln(v) / Math.ln(b)
  },
  Factorial: (a) => {
    return Functions.Gamma(a + 1)
  },
  Gamma: (a) => {
    return gamma(a)
  },
  LogGamma: (a) => {

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
  Reals: {
    MUL: (r1, r2) => {
      r1.multiply_real(r2)

      return r1
    },
    ADD: (r1, r2) => {
      r1.add_real(r2)

      return r1
    },
    SUB: (r1, r2) => {
      r1.subtract_real(r2)

      return r1
    },
    DIV: (r1, r2) => {
      r1.divide_real(r2)

      return r1
    },
    POW: (r1, r2) => {
      r1.pow_real(r2)

      return r1
    },

  }
}

export { Functions }
