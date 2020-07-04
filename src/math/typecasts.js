import { Complex } from './complex/complex'
import { ComplexInterval } from "./complex_interval/interval"

const Typecasts = {
  RealToComplex: (r) => new Complex(r),
  RealArrayToComplexArray: (arr) => arr.map(elem => new Complex(elem)),
  RealIntervalToComplexInterval: (int) => new ComplexInterval(int.min, int.max, 0, 0),
  Identity: (r) => r
}

export { Typecasts }
