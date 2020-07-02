
import { Complex } from '../complex'
import { mod } from '../../../core/utils'
import { Divide } from './basic_arithmetic'

// sin(a+bi) = sin a cosh b + i cos a sinh b
export const Sin = (z) => {
  let a = z.re, b = z.im
  let sinA = Math.sin(a)
  let cosA = Math.cos(a)

  let sinhB = Math.sinh(b)
  let coshB = Math.sqrt(1 + sinhB * sinhB)

  return new Complex(sinA * coshB, cosA * sinhB)
}

// cos(a+bi) = cos a cosh b - i sin a sinh b
export const Cos = (z) => {
  let a = z.re, b = z.im
  let sinA = Math.sin(a)
  let cosA = Math.cos(a)

  let sinhB = Math.sinh(b)
  let coshB = Math.sqrt(1 + sinhB * sinhB)

  return new Complex(cosA * coshB, -sinA * sinhB)
}

// tan(a+bi) = 1/(cos 2a + cosh 2b) * (sin 2a + i sinh 2b)
export const Tan = (z) => {
  let a = 2 * z.re, b = 2 * z.im

  let sinA = Math.sin(a)
  let cosA = Math.cos(a)

  let sinhB = Math.sinh(b)
  let coshB = Math.sqrt(1 + sinhB * sinhB)

  return new Complex(sinA, sinhB).scale(1 / (cosA + coshB))
}

// sec(a+bi) = 1 / cos(a+bi)
export const Sec = (z) => {
  return Divide(Complex.One, Cos(z))
}

// csc(a+bi) = 1 / sin(a+bi)
export const Csc = (z) => {
  return Divide(Complex.One, Sin(z))
}

// sec(a+bi) = 1 / cos(a+bi)
export const Cot = (z) => {
  return Divide(Complex.One, Tan(z))
}
