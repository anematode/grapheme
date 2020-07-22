
// See https://en.wikipedia.org/wiki/Clausen_function#Series_acceleration
import { zeta } from './riemann_zeta'
import { mod } from '../core/utils'

const PI2 = 2 * Math.PI

function Cl2(theta, threshold=1e-15) {
  if (theta === 0)
    return 0

  theta = mod(theta, PI2)

  if (theta < 1e-18)
    return 0

  let sum1 = 3 - Math.log(Math.abs(theta) * (1 - (theta / (PI2)) ** 2))
  let sum2 = 2 * Math.PI / theta * Math.log((PI2 + theta) / (2 * Math.PI - theta))
  let sum = 0
  let prod = 1
  let base = (theta / (2 * Math.PI)) ** 2

  for (let n = 1; n < 20; ++n) {
    prod *= base

    let component = (zeta(2 * n) - 1) / (n * (2 * n + 1)) * prod

    sum += component

    if (component < threshold) {
      break
    }
  }

  return (sum1 - sum2 + sum) * theta
}

export { Cl2 }
