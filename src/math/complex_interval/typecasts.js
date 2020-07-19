import { ComplexInterval } from './interval'

export const IntervalTypecasts = {
  Identity: (x) => x,
  RealToComplex: (int) => {
    return new ComplexInterval(int.min, int.max, 0, 0, int.defMin, int.defMax)
  }
}
