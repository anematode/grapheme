import { Divide } from './basic_arithmetic'
import { Sin } from './trig_functions'

export const Sinc = (x) => {
  if (x.re === 0 && x.im === 0)
    return new Complex(1)

  return Divide(Sin(x), x)
}

export const NormSinc = (x) => {
  return Sinc(x.scale(Math.PI))
}
