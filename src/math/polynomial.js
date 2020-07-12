import { Complex } from './complex/complex'
import { Multiply } from './complex/basic_arithmetic'

function multiplyPolynomials(coeffs1, coeffs2, degree) {
  let ret = []
  for (let i = 0; i <= degree; ++i) {
    ret.push(0)
  }

  for (let i = 0; i < coeffs1.length; ++i) {
    for (let j = 0; j < coeffs2.length; ++j) {
      ret[i + j] += coeffs1[i] * coeffs2[j]
    }
  }

  return ret
}

class SingleVariablePolynomial {
  constructor(coeffs=[0]) {
    // Order: first is constant, second is linear, etc.
    this.coeffs = coeffs
  }

  _evaluateFloat(x) {
    let coeffs = this.coeffs
    let prod = 1
    let sum = 0

    for (let i = 0; i < coeffs.length; ++i) {
      sum += coeffs[i] * prod

      prod *= x
    }

    return sum
  }

  evaluateComplex(z) {
    let coeffs = this.coeffs
    let prod = Complex.One
    let sum = new Complex(0)

    for (let i = 0; i < coeffs.length; ++i) {
      let coeff = coeffs[i]

      let component = Multiply(new Complex(coeff), prod)

      prod = Multiply(prod, z)
    }

    return sum
  }

  evaluate(x) {
    let coeffs = this.coeffs
    let prod = 1
    let sum = 0

    for (let i = 0; i < coeffs.length; ++i) {
      let coeff = coeffs[i]


      if (coeff !== 0)
        sum += coeff * prod

      prod *= x

    }

    return sum
  }

  degree() {
    return this.coeffs.length - 1
  }

  derivative() {
    let newCoeffs = []
    const coeffs = this.coeffs

    for (let i = 1; i < coeffs.length; ++i) {
      let coeff = coeffs[i]

      newCoeffs.push(i * coeff)
    }

    return new SingleVariablePolynomial(newCoeffs)
  }

  clone() {
    return new SingleVariablePolynomial(this.coeffs.slice())
  }

  add(poly) {
    let coeffs = this.coeffs
    let otherCoeffs = poly.coeffs

    for (let i = 0; i < otherCoeffs.length; ++i) {
      coeffs[i] = (coeffs[i] ? coeffs[i] : 0) + otherCoeffs[i]
    }

    return this
  }

  subtract(poly) {
    const coeffs = this.coeffs
    const otherCoeffs = poly.coeffs

    for (let i = 0; i < otherCoeffs.length; ++i) {
      coeffs[i] = (coeffs[i] ? coeffs[i] : 0) - otherCoeffs[i]
    }

    return this
  }

  multiplyScalar(s) {
    const coeffs = this.coeffs

    for (let i = 0; i < coeffs.length; ++i) {
      coeffs[i] *= s
    }

    return this
  }

  multiply(poly) {
    this.coeffs = multiplyPolynomials(poly.coeffs, this.coeffs, poly.degree() + this.degree())
    return this
  }

  integral() {
    // TODO
  }
}

export { SingleVariablePolynomial }
