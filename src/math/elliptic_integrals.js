import { agm } from './agm'
import { nCrFloat } from '../core/utils'
import { hypergeometric } from './hypergeometric'

function ellipticK(k) {
  const absK = Math.abs(k)

  if (absK > 1)
    return NaN

  if (absK === 1)
    return Infinity

  return Math.PI / 2 / agm(1, Math.sqrt(1 - k * k))
}


function ellipticE(k) {
  let absK = Math.abs(k)

  if (absK > 1)
    return NaN
  else if (absK === 1)
    return 1

  return Math.PI / 2 * hypergeometric(1/2, -1/2, 1, k * k)
}

function ellipticPi(n, k) {

}


export { ellipticK, ellipticE, ellipticPi }
