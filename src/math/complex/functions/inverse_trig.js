import { Complex } from '../complex'
import { Multiply, Add, Subtract, Divide } from './basic_arithmetic'
import { Ln } from './log'
import { Sqrt } from './pow'

// arcsin(z) = -i * ln(i * z + sqrt(1 - z^2))
export const Arcsin = (z) => Multiply(Complex.I.scale(-1), // -i
  Ln(Add(Multiply(Complex.I, z),                              // i * z
    Sqrt(Subtract(Complex.One, Multiply(z, z))))))            // sqrt(1 - z^2

export const ArcsinBranched = (z, branch=0) => {
  return Add(Arcsin(z), Complex.One.scale(2 * Math.PI * branch))
}

// arccos(z) = pi/2 + i * ln(i * z + sqrt(1 - z^2))
export const Arccos = (z) => Add(new Complex(Math.PI / 2), // pi / 2
  Multiply(Complex.I, Ln(Add(Multiply(Complex.I, z),           // i * ln(iz
    Sqrt(Subtract(Complex.One, Multiply(z, z)))))))            // + sqrt(1 - z^2)

export const ArccosBranched = (z, branch=0) => {
  return Add(Arccos(z), Complex.One.scale(2 * Math.PI * branch))
}

// arctan(z) = i/2 * ln( (i+z) / (1-z) )
export const Arctan = (z) => Multiply(Complex.I.scale(1/2),  // i / 2
  Ln(Divide(Add(Complex.I, z), Subtract(Complex.I, z))))      // ln( (i+z) / (1-z) )

export const ArctanBranched = (z, branch=0) =>
  Add(Arctan(z), Complex.One.scale(Math.PI * branch))

// arcsec(z) = arccos(1 / z)
export const Arcsec = (z) => Arccos(Divide(Complex.One, z))

export const ArcsecBranched = (z, branch=0) => ArccosBranched(Divide(Complex.One, z), branch)

// arccsc(z) = arcsin(1 / z)
export const Arccsc = (z) => Arcsin(Divide(Complex.One, z))

export const ArccscBranched = (z, branch=0) => ArcsinBranched(Divide(Complex.One, z), branch)

// arccot(z) = pi / 2 - arctan(z)
export const Arccot = (z) => Subtract(Complex.One.scale(Math.PI / 2), Arctan(z))

export const ArccotBranched = (z, branch=0) =>
  Subtract(Complex.One.scale(Math.PI / 2), ArctanBranched(z, -branch))
