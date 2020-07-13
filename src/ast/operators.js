import { levenshtein, isWorker } from "../core/utils"

// Types: "bool", "int", "real", "complex", "vec2", "vec3", "vec4", "mat2", "mat3", "mat4", "real_list", "complex_list", "real_interval", "complex_interval"

const TYPES = ["bool", "int", "real", "complex", "vec2", "vec3", "vec4", "mat2", "mat3", "mat4", "real_list", "complex_list", "real_interval", "complex_interval"]

function isValidType(typename) {
  return TYPES.includes(typename)
}

function throwInvalidType(typename) {
  if (!isValidType(typename)) {

    let didYouMean = ""

    let distances = TYPES.map(type => levenshtein(typename, type))
    let minDistance = Math.min(...distances)

    if (minDistance < 2) {
      didYouMean = "Did you mean " + TYPES[distances.indexOf(minDistance)] + "?"
    }

    throw new Error(`Unrecognized type ${typename}; valid types are ${TYPES.join(', ')}. ${didYouMean}`)
  }
}

class OperatorDefinition {
  constructor(params={}) {
    this.returns = params.returns || "real"

    throwInvalidType(this.returns)

    let evaluate = params.evaluate

    if (params.noGraphemePrefix)
      this.evaluate = evaluate
    else
      this.evaluate = ((isWorker || evaluate.startsWith("Grapheme")) ? "" : "Grapheme.") + evaluate
  }
}

function castableIntoMultiple(signature1, signature2) {
  return (signature1.length === signature2.length) && signature1.every((type, index) => castableInto(type, signature2[index]))
}

class NormalDefinition extends OperatorDefinition {
  constructor(params={}) {
    super(params)

    this.signature = params.signature
    if (!Array.isArray(this.signature))
      throw new Error("Given signature is not an array")

    this.signature.forEach(throwInvalidType)

  }

  signatureWorks(signature) {
    return castableIntoMultiple(signature, this.signature)
  }

  getDefinition(signature) {
    return this
  }
}

class VariadicDefinition extends OperatorDefinition {
  constructor(params={}) {
    super(params)

    this.initialSignature = params.initialSignature
    this.repeatingSignature = params.repeatingSignature

    this.initialSignature.forEach(throwInvalidType)
    this.repeatingSignature.forEach(throwInvalidType)
  }

  getSignatureOfLength(len) {
    let signature = this.initialSignature.slice()

    while (signature.length < len) {
      signature.push(...this.repeatingSignature)
    }

    return signature
  }

  signatureWorks(signature) {
    let len = signature.length

    if (len < this.initialSignature.length)
      return false

    let compSig = this.getSignatureOfLength(len)
    if (!compSig)
      return false

    return castableIntoMultiple(signature, compSig)
  }

  getDefinition(signature) {
    let sig = this.getSignatureOfLength(signature.length)

    return new NormalDefinition({
      signature: sig,
      returns: this.returns,
      evaluate: this.evaluate,
      desc: this.desc
    })
  }
}

function castableInto(from, into) {
  if (from === into)
    return true

  let summarizedTypecasts = SummarizedTypecasts[from]

  if (!summarizedTypecasts)
    return false

  return summarizedTypecasts.includes(into)
}

function getCastingFunction(from, into) {
  if (!castableInto(from, into))
    throw new Error("Cannot cast from type " + from + " into " + into + ".")

  let casts = Typecasts[from]

  for (let cast of casts) {
    if (cast.returns === into)
      return cast.evaluate
  }
}

class TypecastDefinition extends OperatorDefinition {
  constructor(params={}) {
    super(params)
  }
}

const Typecasts = {
  'int': [
    new TypecastDefinition({
      returns: 'real',
      evaluate: "Typecasts.Identity"
    }),
    new TypecastDefinition({
      returns: 'complex',
      evaluate: "Typecasts.RealToComplex"
    })
  ],
  'real': [
    new TypecastDefinition({
      returns: 'complex',
      evaluate: "Typecasts.RealToComplex"
    })
  ],
  'real_interval': [
    new TypecastDefinition({
      returns: 'complex_interval',
      evaluate: "Typecasts.RealIntervalToComplexInterval"
    })
  ]
}

const SummarizedTypecasts = {}

for (let type in Typecasts) {
  if (Typecasts.hasOwnProperty(type)) {
    SummarizedTypecasts[type] = Typecasts[type].map(cast => cast.returns)
  }
}

function constructTrigDefinitions(name, funcName) {
  return [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions." + funcName,
      desc: "Returns the " + name + " of the real number x."
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions." + funcName,
      desc: "Returns the " + name + " of the complex number z."
    })
  ]
}

const Operators = {
  '*': [
    new NormalDefinition({
      signature: ["int", "int"],
      returns: "int",
      evaluate: "RealFunctions.Multiply",
      desc: "Returns the product of two integers."
    }),
    new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.Multiply",
      desc: "Returns the product of two real numbers."
    }),
    new NormalDefinition({
      signature: ["complex", "complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Multiply",
      desc: "Returns the product of two complex numbers."
    })
  ],
  '+': [
    new NormalDefinition({
      signature: ["int", "int"],
      returns: "int",
      evaluate: "RealFunctions.Add",
      desc: "Returns the sum of two integers."
    }),
    new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.Add",
      desc: "Returns the sum of two real numbers."
    }),
    new NormalDefinition({
      signature: ["complex", "complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Add",
      desc: "Returns the sum of two complex numbers."
    }),
    new NormalDefinition({
      signature: ["vec2", "vec2"],
      returns: "vec2",
      evaluate: "VectorFunctions.Add",
      desc: "Returns the sum of two 2-dimensional vectors."
    })
  ],
  '-': [
    new NormalDefinition({
      signature: ["int", "int"],
      returns: "int",
      evaluate: "RealFunctions.Subtract",
      desc: "Returns the difference of two integers."
    }),
    new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.Subtract",
      desc: "Returns the difference of two real numbers."
    }),
    new NormalDefinition({
      signature: ["complex", "complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Subtract",
      desc: "Returns the difference of two complex numbers."
    }),
    new NormalDefinition({
      signature: ["vec2", "vec2"],
      returns: "vec2",
      evaluate: "VectorFunctions.Subtract",
      desc: "Returns the sum of two 2-dimensional vectors."
    })
  ],
  '/': [
    new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.Divide",
      desc: "Returns the quotient of two real numbers."
    }),
    new NormalDefinition({
      signature: ["complex", "complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Divide",
      desc: "Returns the quotient of two real numbers."
    })
  ],
  "complex": [
    new NormalDefinition({
      signature: ["real"],
      returns: "complex",
      evaluate: "ComplexFunctions.Construct",
      desc: "complex(a) casts a real number to a complex number."
    }),
    new NormalDefinition({
      signature: ["real", "real"],
      returns: "complex",
      evaluate: "ComplexFunctions.Construct",
      desc: "complex(a, b) returns the complex number a + bi."
    })
  ],
  "sin": constructTrigDefinitions("sine", "Sin"),
  "cos": constructTrigDefinitions("cosine", "Cos"),
  "tan": constructTrigDefinitions("tangent", "Tan"),
  "csc": constructTrigDefinitions("cosecant", "Csc"),
  "sec": constructTrigDefinitions("secant", "Sec"),
  "cot": constructTrigDefinitions("cotangent", "Cot"),
  "asin": constructTrigDefinitions("inverse sine", "Arcsin"),
  "acos": constructTrigDefinitions("inverse cosine", "Arccos"),
  "atan": constructTrigDefinitions("inverse tangent", "Arctan"),
  "acsc": constructTrigDefinitions("inverse cosecant", "Arccsc"),
  "asec": constructTrigDefinitions("inverse secant", "Arcsec"),
  "acot": constructTrigDefinitions("inverse cotangent", "Arccot"),
  "sinh": constructTrigDefinitions("hyperbolic sine", "Sinh"),
  "cosh": constructTrigDefinitions("hyperbolic cosine", "Cosh"),
  "tanh": constructTrigDefinitions("hyperbolic tangent", "Tanh"),
  "csch": constructTrigDefinitions("hyperbolic cosecant", "Csch"),
  "sech": constructTrigDefinitions("hyperbolic secant", "Sech"),
  "coth": constructTrigDefinitions("hyperbolic cotangent", "Coth"),
  "asinh": constructTrigDefinitions("inverse hyperbolic sine", "Arcsinh"),
  "acosh": constructTrigDefinitions("inverse hyperbolic cosine", "Arccosh"),
  "atanh": constructTrigDefinitions("inverse hyperbolic tangent", "Arctanh"),
  "acsch": constructTrigDefinitions("inverse hyperbolic cosecant", "Arccsch"),
  "asech": constructTrigDefinitions("inverse hyperbolic secant", "Arcsech"),
  "acoth": constructTrigDefinitions("inverse hyperbolic cotangent", "Arccoth"),
  "Im": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Im",
      desc: "Im(r) returns the imaginary part of r, i.e. 0."
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "real",
      evaluate: "ComplexFunctions.Im",
      desc: "Im(z) returns the imaginary part of z."
    })
  ],
  "Re": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Re",
      desc: "Re(r) returns the real part of r, i.e. r."
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "real",
      evaluate: "ComplexFunctions.Re",
      desc: "Re(z) returns the real part of z."
    })
  ],
  "gamma": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Gamma",
      desc: "Evaluates the gamma function at r."
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Gamma",
      desc: "Evaluates the gamma function at z."
    })
  ],
  '^': [
    new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.Pow",
      desc: "Evaluates a^b, undefined for negative b. If you want to evaluate something like a^(1/5), use pow_rational(a, 1, 5)."
    }),
    new NormalDefinition({
      signature: ["complex", "complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Pow",
      desc: "Returns the principal value of z^w."
    })
  ],
  "pow_rational": [
    new NormalDefinition({
      signature: ["real", "int", "int"],
      returns: "real",
      evaluate: "RealFunctions.PowRational"
    })
  ],
  "digamma": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Digamma",
      desc: "Evaluates the digamma function at r."
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Digamma",
      desc: "Evaluates the digamma function at z."
    })
  ],
  "trigamma": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Trigamma",
      desc: "Evaluates the trigamma function at r."
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Trigamma",
      desc: "Evaluates the trigamma function at z."
    })
  ],
  "polygamma": [
    new NormalDefinition({
      signature: ["int", "real"],
      returns: "real",
      evaluate: "RealFunctions.Polygamma",
      desc: "polygamma(n, r) evaluates the nth polygamma function at r."
    }),
    new NormalDefinition({
      signature: ["int", "complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Polygamma",
      desc: "polygamma(n, z) evaluates the nth polygamma function at z."
    })
  ],
  "sqrt": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Sqrt",
      desc: "sqrt(r) returns the square root of r. NaN if r < 0."
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Sqrt",
      desc: "sqrt(z) returns the principal branch of the square root of z."
    })
  ],
  "cbrt": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Cbrt",
      desc: "cbrt(r) returns the cube root of r. NaN if r < 0."
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Cbrt",
      desc: "cbrt(z) returns the principal branch of the cube root of z."
    })
  ],
  "ln": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Ln",
      desc: "ln(r) returns the natural logarithm of r. NaN if r < 0."
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Ln",
      desc: "ln(z) returns the principal value of the natural logarithm of z."
    })
  ],
  "log10": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Log10",
      desc: "log10(r) returns the base-10 logarithm of r. NaN if r < 0."
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Log10",
      desc: "log10(z) returns the principal value of base-10 logarithm of z."
    })
  ],
  "log2": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Log2",
      desc: "log2(r) returns the base-2 logarithm of r. NaN if r < 0."
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Log2",
      desc: "log2(z) returns the principal value of base-2 logarithm of z."
    })
  ],
  "piecewise": [
    new VariadicDefinition({
      initialSignature: [],
      repeatingSignature: ["real", "bool"],
      returns: "real",
      evaluate: "RealFunctions.Piecewise",
      desc: "piecewise(a, cond1, b, cond2 ... ) returns a if cond1 is true, b if cond2 is true, and so forth, and 0 otherwise."
    }),
    new VariadicDefinition({
      initialSignature: ["real"],
      repeatingSignature: ["bool", "real"],
      returns: "real",
      evaluate: "RealFunctions.Piecewise",
      desc: "piecewise(a, cond1, b, cond2, ..., default) returns a if cond1 is true, b if cond2 is true, and so forth, and default otherwise."
    }),
    new VariadicDefinition({
      initialSignature: [],
      repeatingSignature: ["complex", "bool"],
      returns: "complex",
      evaluate: "ComplexFunctions.Piecewise",
      desc: "piecewise(a, cond1, b, cond2 ... ) returns a if cond1 is true, b if cond2 is true, and so forth, and 0 otherwise."
    }),
    new VariadicDefinition({
      initialSignature: ["complex"],
      repeatingSignature: ["bool", "complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Piecewise",
      desc: "piecewise(a, cond1, b, cond2, ..., default) returns a if cond1 is true, b if cond2 is true, and so forth, and default otherwise."
    }),
  ],
  "ifelse": [
    new NormalDefinition({
      signature: ["real", "bool", "real"],
      returns: "real",
      evaluate: "RealFunctions.Piecewise",
      desc: "ifelse(a, cond, b) returns a if cond is true, and b otherwise"
    }),
    new NormalDefinition({
      signature: ["complex", "bool", "complex"],
      returns: "real",
      evaluate: "RealFunctions.Piecewise",
      desc: "ifelse(a, cond, b) returns a if cond is true, and b otherwise"
    })
  ],
  "cchain": [
    new VariadicDefinition({
      initialSignature: ["real"],
      repeatingSignature: ["int", "real"],
      returns: "real",
      evaluate: "RealFunctions.CChain",
      desc: "Used internally to describe comparison chains (e.x. 0 < a < b < 1)"
    })
  ],
  "<": [
    new NormalDefinition( {
      signature: ["real", "real"],
      returns: "bool",
      evaluate: "RealFunctions.Cmp.LessThan",
      desc: "Returns a < b."
    })
  ],
  ">": [
    new NormalDefinition( {
      signature: ["real", "real"],
      returns: "bool",
      evaluate: "RealFunctions.Cmp.GreaterThan",
      desc: "Returns a > b."
    })
  ],
  "<=": [
    new NormalDefinition( {
      signature: ["real", "real"],
      returns: "bool",
      evaluate: "RealFunctions.Cmp.LessEqualThan",
      desc: "Returns a <= b."
    })
  ],
  ">=": [
    new NormalDefinition( {
      signature: ["real", "real"],
      returns: "bool",
      evaluate: "RealFunctions.Cmp.GreaterEqualThan",
      desc: "Returns a >= b."
    })
  ],
  "==": [
    new NormalDefinition( {
      signature: ["real", "real"],
      returns: "bool",
      evaluate: "RealFunctions.Cmp.Equal",
      desc: "Returns a == b."
    })
  ],
  "!=": [
    new NormalDefinition( {
      signature: ["real", "real"],
      returns: "bool",
      evaluate: "RealFunctions.Cmp.NotEqual",
      desc: "Returns a != b."
    })
  ],
  "euler_phi": [
    new NormalDefinition({
      signature: ["int"],
      returns: "int",
      evaluate: "eulerPhi",
      desc: "Returns Euler's totient function evaluated at an integer n."
    })
  ],
  "floor": [
    new NormalDefinition({
      signature: ["real"],
      returns: "int",
      evaluate: "RealFunctions.Floor",
      desc: "Returns the floor of a real number r."
    })
  ],
  "ceil": [
    new NormalDefinition({
      signature: ["real"],
      returns: "int",
      evaluate: "RealFunctions.Ceil",
      desc: "Returns the ceiling of a real number r."
    })
  ],
  "riemann_zeta": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Zeta",
      desc: "Returns the Riemann zeta function of a real number r."
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Zeta",
      desc: "Returns the Riemann zeta function of a complex number r."
    })
  ],
  "dirichlet_eta": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Eta",
      desc: "Returns the Dirichlet eta function of a real number r."
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Eta",
      desc: "Returns the Dirichlet eta function of a complex number r."
    })
  ],
  "mod": [
    new NormalDefinition({
      signature: ["int", "int"],
      returns: "int",
      evaluate: "RealFunctions.Mod",
      desc: "Returns a modulo b."
    }),
    new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.Mod",
      desc: "Returns a modulo b."
    })
  ],
  "frac": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Frac",
      desc: "Returns the fractional part of x."
    })
  ],
  "sign": [
    new NormalDefinition({
      signature: ["real"],
      returns: "int",
      evaluate: "RealFunctions.Sign",
      desc: "Returns the sign of x: 1 if x > 0, 0 if x == 0 and -1 otherwise."
    })
  ],
  "round": [
    new NormalDefinition({
      signature: ["real"],
      returns: "int",
      evaluate: "RealFunctions.Round",
      desc: "Returns the nearest integer to x. Note that if |x| > " + Number.MAX_SAFE_INTEGER + " this may not be accurate."
    })
  ],
  "trunc": [
    new NormalDefinition({
      signature: ["real"],
      returns: "int",
      evaluate: "RealFunctions.Trunc",
      desc: "Removes the fractional part of x."
    })
  ],
  "is_finite": [
    new NormalDefinition({
      signature: ["real"],
      returns: "bool",
      evaluate: "RealFunctions.IsFinite",
      desc: "Returns true if the number is finite and false if it is -Infinity, Infinity, or NaN"
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "bool",
      evaluate: "ComplexFunctions.IsFinite",
      desc: "Returns true if the number is finite and false if it is undefined or infinite"
    })
  ],
  "not": [
    new NormalDefinition({
      signature: ["bool"],
      returns: "bool",
      evaluate: "!",
      noGraphemePrefix: true,
      desc: "Returns the logical negation of b."
    })
  ],
  "and": [
    new NormalDefinition({
      signature: ["bool", "bool"],
      returns: "bool",
      evaluate: "BooleanFunctions.And",
      desc: "Returns true if a and b are true, and false otherwise."
    })
  ],
  "or": [
    new NormalDefinition({
      signature: ["bool", "bool"],
      returns: "bool",
      evaluate: "BooleanFunctions.Or",
      desc: "Returns true if a or b are true, and false otherwise."
    })
  ],
  "Ei": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Ei",
      desc: "Returns the exponential integral of x."
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Ei",
      desc: "Returns the exponential integral of z."
    })
  ],
  "li": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Li",
      desc: "Returns the logarithmic integral of x."
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Li",
      desc: "Returns the logarithmic integral of z."
    })
  ],
  "sinc": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Sinc",
      desc: "Returns the sinc function of x."
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Sinc",
      desc: "Returns the sinc function of x."
    })
  ],
  "Si": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Si",
      desc: "Returns the sine integral of x."
    })
  ],
  "Ci": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Ci",
      desc: "Returns the cosine integral of x."
    })
  ],
  "erf": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Erf",
      desc: "Returns the error function of x."
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Erf",
      desc: "Returns the error function of z."
    })
  ],
  "erfc": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Erfc",
      desc: "Returns the complementary error function of x."
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Erfc",
      desc: "Returns the complementary error function of z."
    })
  ],
  "inverse_erf": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.InverseErf",
      desc: "Returns the inverse error function of x."
    })
  ],
  "inverse_erfc": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.InverseErfc",
      desc: "Returns the inverse complementary error function of x."
    })
  ],
  "gcd": [
    new NormalDefinition({
      signature: ["int", "int"],
      returns: "int",
      evaluate: "RealFunctions.Gcd",
      desc: "Returns the greatest common divisor of a and b."
    })
  ],
  "lcm": [
    new NormalDefinition({
      signature: ["int", "int"],
      returns: "int",
      evaluate: "RealFunctions.Lcm",
      desc: "Returns the least common multiple of a and b."
    })
  ],
  "fresnel_S": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.FresnelS",
      desc: "Return the integral from 0 to x of sin(x^2)."
    })
  ],
  "fresnel_C": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.FresnelC",
      desc: "Return the integral from 0 to x of cos(x^2)."
    })
  ],
  "product_log": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.ProductLog",
      desc: "Return the principal branch of the product log of x (also known as the Lambert W function or W0(x))."
    }),
    new NormalDefinition({
      signature: ["int", "real"],
      returns: "real",
      evaluate: "RealFunctions.ProductLogBranched",
      desc: "Return the nth branch of the product log of x (also known as the Lambert W function or W0(x)). n can be 0 or -1."
    })
  ],
  "elliptic_K": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.EllipticK",
      desc: "Return the complete elliptic integral K(m) with parameter m = k^2."
    })
  ],
  "elliptic_E": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.EllipticE",
      desc: "Return the complete elliptic integral E(m) with parameter m = k^2."
    })
  ],
  "agm": [
    new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.Agm",
      desc: "Return the arithmetic geometric mean of a and b."
    })
  ],
  "abs": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Abs",
      desc: "Return the absolute value of r."
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "real",
      evaluate: "ComplexFunctions.Abs",
      desc: "Return the magnitude of z."
    })
  ],
  "vec2": [
    new NormalDefinition({
      signature: ["real", "real"],
      returns: "vec2",
      evaluate: "VectorFunctions.Construct",
      desc: "Construct a new vec2."
    })
  ],
  "vec": [
    new NormalDefinition({
      signature: ["real", "real"],
      returns: "vec2",
      evaluate: "VectorFunctions.Construct",
      desc: "Construct a new vec2."
    })
  ],
  "dot": [
    new NormalDefinition({
      signature: ["vec2", "vec2"],
      returns: "real",
      evaluate: "VectorFunctions.Dot",
      desc: "Find the dot product of vectors v and w."
    })
  ]
}

export { Typecasts, Operators, castableInto, castableIntoMultiple, getCastingFunction, NormalDefinition }
