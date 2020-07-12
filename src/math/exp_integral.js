import { factorial } from './gamma_function'
import * as utils from '../core/utils'

const EI_COEFFS = []

function getEiCoeff(n) {
  for (let i = EI_COEFFS.length; i <= n; ++i) {
    let sum = 0

    for (let k = 0; k <= Math.floor((n - 1) / 2); ++k) {
      sum += 1 / (2 * k + 1)
    }

    EI_COEFFS[i] = sum
  }

  return EI_COEFFS[n]
}

function E1(x) {
  if (x === 0)
    return Infinity
  // see https://www.sciencedirect.com/science/article/pii/S0022169499001845?via%3Dihub
  if (x > 0) {
    const q = 20 / 47 * x ** xPow
    const h = 1 / (1 + x * Math.sqrt(x)) + hInf * q / (1 + q)

    return Math.exp(-x) / (G + (1 - G) * Math.exp(-x / (1 - G))) * Math.log(1 + G / x - (1 - G) / (h + b * x) ** 2)
  } else {
    return -ei(-x)
  }
}

const G = Math.exp(-utils.eulerGamma)
const b = Math.sqrt(2 * (1 - G) / (G * (2 - G)))
const hInf = (1-G) * (G * G - 6 * G + 12) / (3 * G * (2 - G) ** 2 * b)
const xPow = Math.sqrt(31 / 26)

// The exponential integral Ei(x).
// E1(z) = euler_gamma + ln(z) + exp(z / 2) * sum((-1)^(n-1) x^n / (n! 2^(n-1)) * sum(1 / (2k + 1) for k in [0, floor((n-1)/2)]) for n in [1, infinity])
function ei(x) {
  if (x === 0)
    return -Infinity

  if (x < 0) {
    return -E1(-x)
  } else {
    let sum = 0

    let z = 1, component = 0

    let terms = Math.min(100, Math.max(4 * x ** 0.75, 8))

    for (let n = 1; n < terms; ++n) {
      z *= x / n

      component = z * getEiCoeff(n)

      z *= -1 / 2

      sum += component
    }

    return utils.eulerGamma + Math.log(x) + Math.exp(x / 2) * sum
  }
}

// The logarithmic integral li(x).
function li(x) {
  return ei(Math.log(x))
}

export { ei, li, getEiCoeff }
