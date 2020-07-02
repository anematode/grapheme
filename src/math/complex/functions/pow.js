import { Complex } from '../complex'
import { Add, Multiply } from './basic_arithmetic'
import Cis from './cis'
import Exp from './exp'

export const Pow = (z, w) => {
  return Exp(Multiply(w, new Complex(Math.log(z.magnitude()), z.arg())))
}

export const PowBranched = (z, w, branch=0) => {
  return Multiply(Pow(z, w), Exp(Multiply(Complex.I, w.scale(2 * Math.PI * branch))))
}

export const PowR = (z, r) => {
  return Pow(z, new Complex(r))
}

export const PowRBranched = (z, r, branch=0) => {
  return PowBranched(z, new Complex(r), branch)
}

export const PowN = (z, n) => {
  if (n === 0) {
    return new Complex(1, 0)
  } else if (n === 1) {
    return z.clone()
  } else if (n === -1) {
    return z.conj().scale(1 / z.magnitudeSquared())
  } else if (n === 2) {
    return Multiply(z, z)
  }

  let mag = z.magnitude()
  let angle = z.arg()

  let newMag = Math.pow(mag, n)
  let newAngle = angle * n

  return Cis(newAngle).scale(newMag)
}

export const Sqrt = (z) => {
  // Handle real z specially
  if (Math.abs(z.im) < 1e-17) {
    let r = z.re

    if (r >= 0) {
      return new Complex(Math.sqrt(r))
    } else {
      return new Complex(0, Math.sqrt(-r))
    }
  }

  let r = z.magnitude()

  let zR = Add(z, new Complex(r)).normalize()

  return zR.scale(Math.sqrt(r))
}

export const SqrtBranched = (z, branch=0) => {
  if (branch % 2 === 0) {
    return Sqrt(z)
  } else {
    return Multiply(new Complex(-1, 0), Sqrt(z))
  }
}

export const Cbrt = (z) => {
  return PowR(z, 1/3)
}

export const CbrtBranched = (z, branch=0) => {
  return PowRBranched(z, 1/3, branch)
}
