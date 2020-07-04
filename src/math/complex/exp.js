import Cis from "./cis"

/**
 * Returns e^z for complex z.
 * @param z {Complex}
 * @returns {Complex}
 */
const Exp = (z) => {
  let magnitude = Math.exp(z.re)

  let angle = z.im

  return Cis(angle).scale(magnitude)
}

export default Exp
