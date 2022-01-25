import { ConcreteCast, MathematicalCast, registerConcreteCast, registerMathematicalCast } from './casts.js'

let intToReal = [
  registerConcreteCast(new ConcreteCast({
    src: "int",
    dst: "real",
    identity: true
  })),
  registerConcreteCast(new ConcreteCast({
    src: "fast_interval_int",
    dst: "fast_interval_real",
    identity: true
  }))
]

let realToComplex = [
  registerConcreteCast(new ConcreteCast({
    src: "real",
    dst: "complex",

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
    dst: "complex"
  }))
}
