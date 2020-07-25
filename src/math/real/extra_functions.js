import { mod, gcd } from "../../core/utils"
import { gamma, polygamma, ln_gamma, digamma, trigamma } from '../gamma_function'
import { eta, zeta } from '../riemann_zeta'
import { ei, li } from '../exp_integral'
import { Ci, Si } from '../trig_integrals'
import { erf, erfc, inverseErf, inverseErfc } from '../erf'
import * as utils from "../../core/utils"
import { FresnelS, FresnelC } from '../fresnel'
import { productLog, productLogBranched } from '../product_log'
import { ellipticE, ellipticK, ellipticPi } from '../elliptic_integrals'
import { agm } from '../agm'
import { eratosthenes, eulerPhi } from '../primes'
import { Cl2 } from '../clausen'
import { barnesG, KFunction, lnBarnesG, lnKFunction } from '../barnes_g'
import { Beta } from '../beta'
import { besselJ, besselY, sphericalBesselJ, sphericalBesselY } from '../bessel'
import { polylogarithm } from '../polylogarithm'

const piecewise = (val1, cond, ...args) => {
  if (cond)
    return val1
  if (args.length === 0) {
    if (cond === undefined)
      return val1
    else
      return 0
  }

  return piecewise(...args)
}

const cchain = (val1, comparison, val2, ...args) => {
  switch (comparison) {
    case "<":
      if (val1 >= val2)
        return false
      break
    case ">":
      if (val1 <= val2)
        return false
      break
    case "<=":
      if (val1 > val2)
        return false
      break
    case ">=":
      if (val1 < val2)
        return false
      break
    case "==":
      if (val1 !== val2)
        return false
      break
    case "!=":
      if (val1 === val2)
        return false
      break
  }

  if (args.length === 0)
    return true
  else
    return cchain(val2, ...args)
}

const ExtraFunctions = {
  Sqrt: Math.sqrt,
  Cbrt: Math.cbrt,
  Log2: Math.log2,
  Log10: Math.log10,
  Ln: Math.log,
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
  Pow: (x, r) => {
    return Math.pow(x, r)
  },
  Im: (x) => {
    return 0
  },
  Re: (x) => {
    return x
  },
  Mod: (n, m) => {
    return ((n % m) + m) % m
  },
  Piecewise: piecewise,
  CChain: cchain,
  Cmp: {
    LessThan: (a, b) => a < b,
    GreaterThan: (a, b) => a > b,
    LessEqualThan: (a, b) => a <= b,
    GreaterEqualThan: (a, b) => a >= b,
    Equal: (a,b) => a === b,
    NotEqual: (a,b) => a !== b
  },
  Logic: {
    And: (a, b) => a && b,
    Or: (a, b) => a || b
  },
  Floor: Math.floor,
  Ceil: Math.ceil,
  Zeta: zeta,
  Eta: eta,
  Frac: (x) => x - Math.floor(x),
  Sign: Math.sign,
  Round: Math.round,
  Trunc: Math.trunc,
  IsFinite: isFinite,
  Ei: ei,
  Li: li,
  Sinc: (x) => x === 0 ? 1 : Math.sin(x) / x,
  NormSinc: (x) => ExtraFunctions.Sinc(x * Math.PI),
  Si: Si,
  Ci: Ci,
  Erf: erf,
  Erfc: erfc,
  Gcd: (a, b) => utils.gcd(Math.abs(a), Math.abs(b)),
  Lcm: (a, b) => a * b / ExtraFunctions.Gcd(a, b),
  FresnelS,
  FresnelC,
  InverseErf: inverseErf,
  InverseErfc: inverseErfc,
  ProductLog: productLog,
  ProductLogBranched: productLogBranched,
  EllipticE: ellipticE,
  EllipticK: ellipticK,
  EllipticPi: ellipticPi,
  Agm: agm,
  Abs: Math.abs,
  PrimeCount: (n) => {
    if (n <= 1) {
      return 0
    }

    return eratosthenes(n+1).length
  },
  Cl2: Cl2,
  BarnesG: barnesG,
  LnBarnesG: lnBarnesG,
  Beta: Beta,
  Exp: Math.exp,
  KFunction: KFunction,
  LnKFunction: lnKFunction,
  BesselJ: besselJ,
  BesselY: besselY,
  BesselJ0: (z) => besselJ(0, z),
  BesselJ1: (z) => besselJ(1, z),
  BesselY0: (z) => besselY(0, z),
  BesselY1: (z) => besselY(1, z),
  SphericalBesselJ: sphericalBesselJ,
  SphericalBesselY: sphericalBesselY,
  Polylogarithm: polylogarithm,
  EulerPhi: eulerPhi
}

export default ExtraFunctions
