import { Complex } from './complex'
import { Add, Multiply } from './basic_arithmetic'
import Cis from './cis'
import Exp from './exp'

/**
 * Return the principal value of z^w.
 * @param z {Complex}
 * @param w {Complex}
 * @returns {Complex}
 */
export const Pow = (z, w) => {
  return Exp(Multiply(w, new Complex(Math.log(z.magnitude()), z.arg())))
}

/**
 * Multivalued version of z^w.
 * @param z {Complex}
 * @param w {Complex}
 * @param branch {number}
 * @returns {Complex}
 */
export const PowBranched = (z, w, branch=0) => {
  return Multiply(Pow(z, w), Exp(Multiply(Complex.I, w.scale(2 * Math.PI * branch))))
}

/**
 * z^r, where r is a real number.
 * @param z {Complex}
 * @param r {number}
 * @returns {Complex}
 */
export const PowR = (z, r) => {
  if (r === 0)
    return new Complex(1)
  else if (r === 1)
    return z.clone()
  else if (r === 2)
    return Multiply(z, z)

  return Pow(z, new Complex(r))
}

export const PowZ = (r, z) => {
  return Exp(Multiply(z, new Complex(Math.log(Math.abs(r)), r > 0 ? 0 : Math.PI)))
}

/**
 * z^r, where r is a real number, branched.
 * @param z {Complex}
 * @param r {number}
 * @param branch {number}
 * @returns {Complex}
 */
export const PowRBranched = (z, r, branch=0) => {
  return PowBranched(z, new Complex(r), branch)
}

/**
 * Returns z^n, where n is a positive integer
 * @param z {Complex} The base of the exponentiation.
 * @param n {number} Positive integer, exponent.
 * @returns {Complex}
 */
export const PowN = (z, n) => {
  if (n === 0) {
    return new Complex(1, 0)
  } else if (n === 1) {
    return z.clone()
  } else if (n === -1) {
    return z.conj().scale(1 / z.magnitudeSquared())
  } else if (n === 2) {
    return Multiply(z, z)
  }

  let mag = z.magnitude()
  let angle = z.arg()

  let newMag = Math.pow(mag, n)
  let newAngle = angle * n

  return Cis(newAngle).scale(newMag)
}

/**
 * Returns the principal value of sqrt(z).
 * @param z {Complex}
 * @returns {Complex}
 */
export const Sqrt = (z) => {
  // Handle real z specially
  if (Math.abs(z.im) < 1e-17) {
    let r = z.re

    if (r >= 0) {
      return new Complex(Math.sqrt(r))
    } else {
      return new Complex(0, Math.sqrt(-r))
    }
  }

  let r = z.magnitude()

  let zR = Add(z, new Complex(r)).normalize()

  return zR.scale(Math.sqrt(r))
}

/**
 * Branched version of Sqrt(z).
 * @param z {Complex}
 * @param branch {number}
 * @returns {Complex}
 */
export const SqrtBranched = (z, branch=0) => {
  if (branch % 2 === 0) {
    return Sqrt(z)
  } else {
    return Multiply(new Complex(-1, 0), Sqrt(z))
  }
}

/**
 * Principal value of cbrt(z).
 * @param z {Complex}
 * @returns {Complex}
 */
export const Cbrt = (z) => {
  return PowR(z, 1/3)
}

/**
 * Multivalued version of Cbrt(z).
 * @param z {Complex}
 * @param branch {number}
 * @returns {Complex}
 */
export const CbrtBranched = (z, branch=0) => {
  return PowRBranched(z, 1/3, branch)
}
