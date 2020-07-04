import { Complex } from './complex'
import { Multiply, Add, Subtract, Divide } from './basic_arithmetic'
import { Ln } from './log'
import { Sqrt } from './pow'

// arcsin(z) = -i * ln(i * z + sqrt(1 - z^2))
export const Arcsin = (z) => Multiply(Complex.I.scale(-1), // -i
  Ln(Add(Multiply(Complex.I, z),                              // i * z
    Sqrt(Subtract(Complex.One, Multiply(z, z))))))            // sqrt(1 - z^2

// arccos(z) = pi/2 + i * ln(i * z + sqrt(1 - z^2))
export const Arccos = (z) => Add(new Complex(Math.PI / 2), // pi / 2
  Multiply(Complex.I, Ln(Add(Multiply(Complex.I, z),           // i * ln(iz
    Sqrt(Subtract(Complex.One, Multiply(z, z)))))))            // + sqrt(1 - z^2)

// arctan(z) = i/2 * ln( (i+z) / (1-z) )
export const Arctan = (z) => Multiply(Complex.I.scale(1/2),  // i / 2
  Ln(Divide(Add(Complex.I, z), Subtract(Complex.I, z))))      // ln( (i+z) / (1-z) )

// arcsec(z) = arccos(1 / z)
export const Arcsec = (z) => Arccos(Divide(Complex.One, z))

// arccsc(z) = arcsin(1 / z)
export const Arccsc = (z) => Arcsin(Divide(Complex.One, z))

// arccot(z) = pi / 2 - arctan(z)
export const Arccot = (z) => Subtract(new Complex(Math.PI / 2), Arctan(z))

// Branched variants of the inverse trig functions
export const ArcsinBranched = (z, branch=0) => {
  return Add(Arcsin(z), new Complex(2 * Math.PI * branch))
}

export const ArccosBranched = (z, branch=0) => {
  return Add(Arccos(z), new Complex(2 * Math.PI * branch))
}

export const ArctanBranched = (z, branch=0) =>
  Add(Arctan(z), new Complex(Math.PI * branch))

export const ArcsecBranched = (z, branch=0) => ArccosBranched(Divide(Complex.One, z), branch)

export const ArccscBranched = (z, branch=0) => ArcsinBranched(Divide(Complex.One, z), branch)

export const ArccotBranched = (z, branch=0) =>
  Subtract(new Complex(Math.PI / 2), ArctanBranched(z, -branch))
