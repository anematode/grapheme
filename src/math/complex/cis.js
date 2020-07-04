import { Complex } from './complex'

/**
 * Returns e^(i theta) for real theta.
 * @param theta {number}
 * @returns {Complex} cis(theta)
 */
const Cis = (theta) => {
  // For real theta
  let c = Math.cos(theta)
  let s = Math.sin(theta)

  return new Complex(c, s)
}

export default Cis
