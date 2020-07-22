
// Computes the Riemann zeta function of a real number r.
import { gamma, ln_gamma } from './gamma_function'
import { bernoulli } from './bernoulli'

const ZETA_N = 30
const ZETA_COEFFS = []

for (let k = 0; k <= ZETA_N; ++k) {
  let value = 0

  for (let j = k; j <= ZETA_N; ++j) {
    value += gamma(ZETA_N + j - 1) * 4 ** j / gamma(ZETA_N - j) / gamma(2 * j)
  }

  value *= ZETA_N

  ZETA_COEFFS.push(value)
}

function zeta(r) {
  if (r === 1)
    return Infinity

  if (r % 2 === 0 && r < 0)
    return 0

  if (r % 2 === 0 && r > 1) {
    if (r > 100)
      return 1

    let prod1 = ((r / 2 + 1) % 2 === 0 ? 1 : -1) * bernoulli(r)

    let lnProd2 = Math.log(2 * Math.PI) * r - Math.log(2) - ln_gamma(r + 1)

    return prod1 * Math.exp(lnProd2)
  }

  if (r < 0.5) {
    // zeta(s) = 2 ^ s * pi ^ (s - 1) * sin( pi * s / 2 ) * gamma( 1 - s ) * zeta( 1 - s )

    return 2 ** r * Math.PI ** (r - 1) * Math.sin(Math.PI * r / 2) * gamma(1 - r) * zeta(1 - r)
  }

  if (r === 0.5) {
    return -1.4603545088095868
  }

  let seriesSum = 0
  let sign = 1

  for (let k = 0; k < ZETA_N; ++k) {
    seriesSum += sign * ZETA_COEFFS[k+1] / ((k+1) ** r)

    sign *= -1
  }

  return seriesSum / (ZETA_COEFFS[0] * (1 - 2 ** (1 - r)))
}

function eta(r) {
  return (1 - 2 ** (1 - r)) * zeta(r)
}

function hurwitzZeta(s, v) {
  let sum = v**(1-s) / (s-1)
  let innerSum = 0

  for (let n = 0; n < 100; ++n) {

  }
}

zeta.coeffs = ZETA_COEFFS
zeta.n = ZETA_N

export { zeta, eta, hurwitzZeta}
