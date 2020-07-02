import Cis from "./cis"

const Exp = (z) => {
  let magnitude = Math.exp(z.re)

  let angle = z.im

  return Cis(angle).scale(magnitude)
}

export default Exp
