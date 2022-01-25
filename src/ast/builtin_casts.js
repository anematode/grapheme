import { ConcreteCast, MathematicalCast, registerConcreteCast, registerMathematicalCast } from './casts.js'
import { Complex } from '../math/complex/complex.js'

let intToReal = [
  registerConcreteCast(new ConcreteCast({
    src: "int",
    dst: "real",
    identity: true
  })),
  registerConcreteCast(new ConcreteCast({
    src: "interval_int",
    dst: "interval_real",
    identity: true
  }))
]

let realToComplex = [
  registerConcreteCast(new ConcreteCast({
    src: "real", dst: "complex",
    type: "write", func: (src, dst) => { dst.re = src; dst.im = 0; }
  })),
  registerConcreteCast(new ConcreteCast({
    src: "real", dst: "complex",
    type: "new", func: r => new Complex(r, 0)
  }))
]

{
  registerMathematicalCast(new MathematicalCast({
    src: "int",
    dst: "real",
    evaluators: intToReal
  }))

  registerMathematicalCast(new MathematicalCast({
    src: "int",
    dst: "complex"
  }))

  registerMathematicalCast(new MathematicalCast({
    src: "real",
    dst: "complex",
    evaluators: realToComplex
  }))
}
