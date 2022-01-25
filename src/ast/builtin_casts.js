import { MathematicalCast, registerMathematicalCast } from './casts.js'

{
  let intToReal = new MathematicalCast({
    src: "int",
    dst: "real",
    name: "real" // by convention, the name of the cast
  })

  registerMathematicalCast(intToReal)
}
