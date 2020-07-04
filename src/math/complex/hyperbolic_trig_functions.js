import { Complex } from './complex'
import { Divide } from './basic_arithmetic'

/**
 * Returns sinh(z).
 * @param z {Complex}
 * @returns {Complex}
 */
export const Sinh = (z) => {
  let a = z.re, b = z.im

  let sinhA = Math.sinh(a)
  let coshA = Math.sqrt(1 + sinhA * sinhA)

  let sinB = Math.sin(b)
  let cosB = Math.cos(b)

  return new Complex(sinhA * cosB, coshA * sinB)
}

/**
 * Returns cosh(z).
 * @param z {Complex}
 * @returns {Complex}
 */
export const Cosh = (z) => {
  let a = z.re, b = z.im

  let sinhA = Math.sinh(a)
  let coshA = Math.sqrt(1 + sinhA * sinhA)

  let sinB = Math.sin(b)
  let cosB = Math.cos(b)

  return new Complex(coshA * cosB, sinhA * sinB)
}

/**
 * Returns tanh(z).
 * @param z {Complex}
 * @returns {Complex}
 */
export const Tanh = (z) => {
  let a = 2 * z.re, b = 2 * z.im

  let sinhA = Math.sinh(a)
  let coshA = Math.sqrt(1 + sinhA * sinhA)

  let sinB = Math.sin(b)
  let cosB = Math.cos(b)

  return new Complex(sinhA, sinB).scale(1 / (coshA + cosB))
}

/**
 * Returns sech(z).
 * @param z {Complex}
 * @returns {Complex}
 */
export const Sech = (z) => {
  return Divide(Complex.One, Cosh(z))
}

/**
 * Returns csch(z).
 * @param z {Complex}
 * @returns {Complex}
 */
export const Csch = (z) => {
  return Divide(Complex.One, Sinh(z))
}

/**
 * Returns coth(z).
 * @param z {Complex}
 * @returns {Complex}
 */
export const Coth = (z) => {
  return Divide(Complex.One, Tanh(z))
}
