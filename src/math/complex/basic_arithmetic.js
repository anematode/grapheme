import { Complex } from './complex'

/**
 * Returns a + b.
 * @param a {Complex}
 * @param b {Complex}
 * @returns {Complex}
 */
export const Add = (a, b) => {
  return new Complex(a.re + b.re, a.im + b.im)
}

/**
 * Returns a * b.
 * @param a {Complex}
 * @param b {Complex}
 * @returns {Complex}
 */
export const Multiply = (a, b) => {
  return new Complex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re)
}

/**
 * Returns a / b.
 * @param a {Complex}
 * @param b {Complex}
 * @returns {Complex}
 */
export const Divide = (a, b) => {
  let div = b.magnitudeSquared()

  return Multiply(a, b.conj()).scale(1 / div)
}

/**
 * Returns a - b.
 * @param a {Complex}
 * @param b {Complex}
 * @returns {Complex}
 */
export const Subtract = (a, b) => {
  return new Complex(a.re - b.re, a.im - b.im)
}

/**
 * Returns Re(z).
 * @param z
 * @returns {number}
 */
export const Re = (z) => {
  return z.re
}

/**
 * Returns Im(z)
 * @param z
 * @returns {number}
 */
export const Im = (z) => {
  return z.im
}

/**
 * Returns the complex number a+bi
 * @param a
 * @param b
 * @returns {Complex}
 * @constructor
 */
export const Construct = (a, b=0) => {
  return new Complex(a, b)
}

export const UnaryMinus = (a) => {
  return new Complex(-a.re, -a.im)
}

const piecewise = (val1, cond, ...args) => {
  if (cond)
    return val1
  if (args.length === 0) {
    if (cond === undefined)
      return val1
    else
      return new Complex(0)
  }

  return piecewise(...args)
}

export const Abs = (z) => {
  return z.magnitude()
}

export const IsFinite = (z) => {
  return isFinite(z.re) && isFinite(z.im)
}

export const Piecewise = piecewise
