import * as utils from '../core/utils'
import { digamma, polygamma } from './gamma_function'

function integratePolygamma(z) {
  const steps = 50
  let sum = 0

  for (let i = 0; i <= steps; ++i) {
    if ( i === 0 )
      continue

    let x = i / steps * z

    sum += x * digamma(x)
  }

  return sum / (steps + 1) * z
}

function lnBarnesG(z) {
  z--

  return -(z-1)*(z-2)/2 + (z - 1) / 2 * Math.log(2 * Math.PI) + integratePolygamma(z-1)
}

function barnesG(z) {
  return Math.exp(lnBarnesG(z))
}

export { barnesG, lnBarnesG }
