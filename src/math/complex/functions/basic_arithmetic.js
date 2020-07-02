import { Complex } from '../complex'

export const Add = (a, b) => {
  return new Complex(a.re + b.re, a.im + b.im)
}

export const Multiply = (a, b) => {
  return new Complex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re)
}

/**
 *
 * @param a
 * @param b
 * @returns {Complex}
 * @constructor
 */
export const Divide = (a, b) => {
  let div = b.magnitudeSquared()

  return Multiply(a, b.conj()).scale(1 / div)
}

export const Subtract = (a, b) => {
  return new Complex(a.re - b.re, a.im - b.im)
}

export const Re = (z) => {
  return z.re
}

export const Im = (z) => {
  return z.im
}
