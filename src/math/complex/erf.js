import { Complex } from './complex'
import { erf, erfc} from '../erf'
import { Add, Subtract } from './basic_arithmetic'

function fk(k, x, y, cosXY, sinXY) {
  return 2 * x * (1 - cosXY * Math.cosh(k * y)) + k * sinXY * Math.sinh(k * y)
}

function gk(k, x, y, cosXY, sinXY) {
  return 2 * x * sinXY * Math.cosh(k * y) + k * cosXY * Math.sinh(k * y)
}

function ErfSubcall(x, y) {

  let xy2 = 2 * x * y
  let cosxy2 = Math.cos(xy2)
  let sinxy2 = Math.sin(xy2)

  let expX2 = Math.exp(- x * x)

  let cmp1 = new Complex(erf(x))
  let cmp2 = new Complex(1 - cosxy2, sinxy2).scale(expX2 / (2 * Math.PI * x))

  let sum = new Complex(0)
  let terms = Math.min(Math.max(10 * Math.abs(y), 10), 100)

  for (let k = 1; k < terms; ++k) {
    let component = new Complex(fk(k, x, y, cosxy2, sinxy2), gk(k, x, y, cosxy2, sinxy2)).scale(Math.exp(- k * k / 4) / (k * k + 4 * x * x))

    sum.re += component.re
    sum.im += component.im
  }

  return Add(cmp1, Add(cmp2, sum.scale(2 / Math.PI * expX2)))
}

function Erf(z) {
  if (z.im < 1e-17)
    return new Complex(erf(z.re))

  let x = z.re, y = z.im

  return ErfSubcall(x, y)
}

function Erfc(z) {
  return Erf(Subtract(new Complex(1), z))
}

export { Erf, Erfc }
