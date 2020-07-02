import { Complex } from '../complex'

const Cis = (theta) => {
  // For real theta
  let c = Math.cos(theta)
  let s = Math.sin(theta)

  return new Complex(c, s)
}

export default Cis
