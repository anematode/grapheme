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
