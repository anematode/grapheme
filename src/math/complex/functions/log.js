import { Complex } from '../complex'
import { Add, Divide } from './basic_arithmetic'

export const Ln = (z) => {
  let mag = Math.log(z.magnitude())
  let theta = z.arg()

  return new Complex(mag, theta)
}

export const LnBranched = (z, branch=0) => {
  return Add(Ln(z), Complex.I.scale(2 * Math.PI * branch))
}

export const Log = Ln

export const LogBranched = LnBranched

const LN10 = Math.log(10)
const LN2 = Math.log(2)

export const Log10 = (z) => {
  return Ln(z).scale(1 / LN10)
}

export const Log10Branched = (z, branch=0) => {
  return LnBranched(z, branch).scale(1 / LN10)
}

export const Log2 = (z) => {
  return Ln(z).scale(1 / LN2)
}

export const Log2Branched = (z, branch=0) => {
  return LnBranched(z, branch).scale(1 / LN2)
}

export const LogB = (b, z) => {
  if (b.equals(z))
    return Complex.One

  return Divide(Ln(z), Ln(b))
}

export const LogBBranched = (b, z, branch=0) => {
  if (branch === 0 && b.equals(z))
    return Complex.One
  
  return Divide(LnBranched(z, branch), LnBranched(b, branch))
}
