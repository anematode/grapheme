import { Ln, LnBranched } from './log'
import { Add, Divide, Multiply, Subtract } from './basic_arithmetic'
import { Sqrt } from './pow'
import { Complex } from './complex'

// arcsinh(z) = ln(z + sqrt(z^2 + 1))
export const Arcsinh = (z) => Ln(Add(z, Sqrt(Add(Multiply(z, z), Complex.One))))

// arccosh(z) = ln(z + sqrt(z^2 - 1))
export const Arccosh = (z) => Ln(Add(z, Multiply(Sqrt(Add(z, Complex.One)), Sqrt(Subtract(z, Complex.One)))))

// arctanh(z) = 1/2 * ln( (1+z) / (1-z) )
export const Arctanh = (z) => Ln(Divide(Add(Complex.One, z), Subtract(Complex.One, z))).scale(1/2)

export const Arcsech = (z) => Arccosh(Divide(Complex.One, z))

// arccsch(z) = arcsinh(1/z)
export const Arccsch = (z) => Arcsinh(Divide(Complex.One, z))

// arccoth(z) = arctanh(1/z)
export const Arccoth = (z) => Arctanh(Divide(Complex.One, z))

// Branched variants of the normal functions
// arcsinh(z) = ln(z + sqrt(z^2 + 1))
export const ArcsinhBranched = (z, branch=0) =>
  LnBranched(Add(z, Sqrt(Add(Multiply(z, z), Complex.One))), branch)

// arccosh(z) = ln(z + sqrt(z^2 - 1))
export const ArccoshBranched = (z, branch=0) =>
  LnBranched(Add(z, Multiply(Sqrt(Add(z, Complex.One)), Sqrt(Subtract(z, Complex.One)))), branch)

// arctanh(z) = 1/2 * ln( (1+z) / (1-z) )
export const ArctanhBranched = (z, branch=0) =>
  LnBranched(Divide(Add(Complex.One, z), Subtract(Complex.One, z)), branch).scale(1/2)

export const ArcsechBranched = (z, branch=0) => ArccoshBranched(Divide(Complex.One, z), branch)

// arccsch(z) = arcsinh(1/z)
export const ArccschBranched = (z, branch=0) => ArcsinhBranched(Divide(Complex.One, z), branch)

// arccoth(z) = arctanh(1/z)
export const ArccothBranched = (z, branch=0) => ArctanhBranched(Divide(Complex.One, z), branch)
