import { Complex } from './complex'
import { Add, Divide } from './basic_arithmetic'

/**
 * Returns ln(z), where ln is the natural logarithm.
 * @param z {Complex}
 * @returns {Complex}
 */
export const Ln = (z) => {
  let mag = Math.log(z.magnitude())
  let theta = z.arg()

  return new Complex(mag, theta)
}

/**
 * The multivalued version of ln(z). In other words, if ln(z) is the principal value of ln(z), it returns
 * ln(z) + 2 * pi * i * branch, where branch is an integer.
 * @param z {Complex}
 * @param branch {number}
 * @returns {Complex}
 */
export const LnBranched = (z, branch=0) => {
  return Add(Ln(z), Complex.I.scale(2 * Math.PI * branch))
}

/* Alias for Ln */
export const Log = Ln

/* Alias for LnBranched */
export const LogBranched = LnBranched

// Constants
const LN10 = Math.log(10)
const LN2 = Math.log(2)

/**
 * log10(z) (principal value)
 * @param z {Complex}
 * @returns {Complex}
 */
export const Log10 = (z) => {
  return Ln(z).scale(1 / LN10)
}

/**
 * log10(z) (branched)
 * @param z {Complex}
 * @returns {Complex}
 */
export const Log10Branched = (z, branch=0) => {
  return LnBranched(z, branch).scale(1 / LN10)
}

/**
 * log2(z) (principal value)
 * @param z {Complex}
 * @returns {Complex}
 */
export const Log2 = (z) => {
  return Ln(z).scale(1 / LN2)
}

/**
 * log2(z) (branched)
 * @param z {Complex}
 * @returns {Complex}
 */
export const Log2Branched = (z, branch=0) => {
  return LnBranched(z, branch).scale(1 / LN2)
}

/**
 * Log base b of z
 * @param b {Complex}
 * @param z {Complex}
 * @returns {Complex}
 */
export const LogB = (b, z) => {
  if (b.equals(z))
    return Complex.One

  return Divide(Ln(z), Ln(b))
}

/**
 * Log base b of z, multivalued
 * @param b {Complex}
 * @param z {Complex}
 * @param branch {number} Integer, which branch to evaluate
 * @returns {Complex}
 */
export const LogBBranched = (b, z, branch=0) => {
  if (branch === 0 && b.equals(z))
    return Complex.One

  return Divide(LnBranched(z, branch), LnBranched(b, branch))
}
