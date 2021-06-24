import { Complex } from '../complex/complex'

const Typecasts = {
  RealToComplex: (r) => new Complex(r),
  RealArrayToComplexArray: (arr) => arr.map(elem => new Complex(elem)),
  Identity: (r) => r
}

export { Typecasts }
