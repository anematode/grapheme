import { ComplexInterval } from './interval'

export const Construct = (reMin, reMax, imMin, imMax) => {
  return new ComplexInterval(reMin, reMax, imMin, imMax)
}

export const Add = (int1, int2) => {
  return new ComplexInterval(int1.reMin, int1.reMax, int2.imMin, int2.imMax, int1.defMin || int2.defMin, int1.defMax && int2.defMax)
}
