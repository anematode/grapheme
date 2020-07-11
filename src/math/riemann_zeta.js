
// Computes the Riemann zeta function of a real number r.
import { gamma } from './gamma_function'

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

zeta.coeffs = ZETA_COEFFS
zeta.n = ZETA_N

export { zeta }
