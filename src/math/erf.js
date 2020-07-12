import { SingleVariablePolynomial } from './polynomial'

const p = 0.3275911
const ERF_POLY = new SingleVariablePolynomial([0, 0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429])

function erf(x) {
  if (x === 0)
    return 0
  if (x < 0)
    return -erf(-x)

  let t = 1 / (1 + p * x)

  return 1 - ERF_POLY.evaluate(t) * Math.exp(- x * x)
}

function erfc(x) {
  return 1 - erf(x)
}

function erfi(x) {

}

export {erf, erfc, erfi}
