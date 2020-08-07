import { levenshtein, isWorker } from "../core/utils"
import { RealFunctions } from '../math/real/functions'
import { RealIntervalFunctions } from '../math/real_interval/interval_functions'
import { ComplexFunctions } from '../math/complex/functions'
import { ComplexIntervalFunctions } from '../math/complex_interval/interval_functions'
import { LatexMethods } from './latex'
import { IntervalTypecasts } from '../math/complex_interval/typecasts'

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

    if (params.latex)
      this.latex = params.latex
    else
      this.latex = () => { throw new Error("unimplemented") }

    let evaluate = params.evaluate

    this.evaluate = "Grapheme." + evaluate

    this.evaluateFunc = params.evaluateFunc ? params.evaluateFunc : retrieveEvaluationFunction(this.evaluate)

      const evaluateInterval = this.evaluate.replace(/Functions/g, "IntervalFunctions")

      this.evaluateIntervalFunc = params.evaluateIntervalFunc ? params.evaluateIntervalFunc : retrieveEvaluationFunction(evaluateInterval)


    if (!this.evaluateIntervalFunc)
      this.evaluateInterval = this.evaluateIntervalFunc = null
    else
      this.evaluateInterval = evaluateInterval
  }

  latex(nodes, options={}) {
    if (this.latexFunc) {
      return this.latexFunc(nodes, options)
    }
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
      evaluateInterval: this.evaluateInterval,
      desc: this.desc,
      latex: this.latex
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
  ]
}

const SummarizedTypecasts = {}

for (let type in Typecasts) {
  if (Typecasts.hasOwnProperty(type)) {
    SummarizedTypecasts[type] = Typecasts[type].map(cast => cast.returns)
  }
}

import { Typecasts as eggs } from '../math/typecasts'
import { BooleanFunctions } from '../math/boolean_functions'

function retrieveEvaluationFunction(str) {
  let fName = str.split('.').pop()

  const realFunctions = RealFunctions
  const realIntervalFunctions = RealIntervalFunctions
  const complexFunctions = ComplexFunctions
  const complexIntervalFunctions = ComplexIntervalFunctions
  const booleanFunctions = BooleanFunctions

  if (str.includes("RealFunctions"))
    return realFunctions[fName]
  if (str.includes("RealIntervalFunctions"))
    return realIntervalFunctions[fName]
  if (str.includes("ComplexFunctions"))
    return complexFunctions[fName]
  if (str.includes("ComplexIntervalFunctions"))
    return complexIntervalFunctions[fName]
  if (str.includes("Typecasts"))
    return eggs[fName]
  if (str.includes("BooleanFunctions"))
    return booleanFunctions[fName]

}

function constructTrigDefinitions(name, funcName) {

  let latex = LatexMethods.genFunctionLatex(funcName.toLowerCase())

  return [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions." + funcName,
      desc: "Returns the " + name + " of the real number x.",
      latex
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions." + funcName,
      desc: "Returns the " + name + " of the complex number z.",
      latex
    })
  ]
}

const Operators = {
  '*': [
    new NormalDefinition({
      signature: ["int", "int"],
      returns: "int",
      evaluate: "RealFunctions.Multiply",
      intervalEvaluate: "RealIntervalFunctions.Multiply",
      desc: "Returns the product of two integers.",
      latex: LatexMethods.multiplicationLatex
    }),
    new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.Multiply",
      desc: "Returns the product of two real numbers.",
      latex: LatexMethods.multiplicationLatex
    }),
    new NormalDefinition({
      signature: ["complex", "complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Multiply",
      desc: "Returns the product of two complex numbers.",
      latex: LatexMethods.multiplicationLatex
    })
  ],
  '+': [
    new NormalDefinition({
      signature: ["int", "int"],
      returns: "int",
      evaluate: "RealFunctions.Add",
      desc: "Returns the sum of two integers.",
      latex: LatexMethods.additionLatex
    }),
    new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.Add",
      desc: "Returns the sum of two real numbers.",
      latex: LatexMethods.additionLatex
    }),
    new NormalDefinition({
      signature: ["complex", "complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Add",
      desc: "Returns the sum of two complex numbers.",
      latex: LatexMethods.additionLatex
    }),
    new NormalDefinition({
      signature: ["vec2", "vec2"],
      returns: "vec2",
      evaluate: "VectorFunctions.Add",
      desc: "Returns the sum of two 2-dimensional vectors.",
      latex: LatexMethods.additionLatex
    })
  ],
  '-': [
    new NormalDefinition({
      signature: ["int", "int"],
      returns: "int",
      evaluate: "RealFunctions.Subtract",
      desc: "Returns the difference of two integers.",
      latex: LatexMethods.subtractionLatex
    }),
    new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.Subtract",
      desc: "Returns the difference of two real numbers.",
      latex: LatexMethods.subtractionLatex
    }),
    new NormalDefinition({
      signature: ["complex", "complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Subtract",
      desc: "Returns the difference of two complex numbers.",
      latex: LatexMethods.subtractionLatex
    }),
    new NormalDefinition({
      signature: ["int"],
      returns: "int",
      evaluate: "RealFunctions.UnaryMinus",
      desc: "Returns the negation of an integer.",
      latex: LatexMethods.unaryMinusLatex
    }),
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.UnaryMinus",
      desc: "Returns the negation of a real number.",
      latex: LatexMethods.unaryMinusLatex
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.UnaryMinus",
      desc: "Returns the negation of a complex number.",
      latex: LatexMethods.unaryMinusLatex
    }),
    new NormalDefinition({
      signature: ["vec2", "vec2"],
      returns: "vec2",
      evaluate: "VectorFunctions.Subtract",
      desc: "Returns the sum of two 2-dimensional vectors.",
      latex: LatexMethods.subtractionLatex
    })
  ],
  '/': [
    new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.Divide",
      desc: "Returns the quotient of two real numbers.",
      latex: LatexMethods.divisionLatex
    }),
    new NormalDefinition({
      signature: ["complex", "complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Divide",
      desc: "Returns the quotient of two real numbers.",
      latex: LatexMethods.divisionLatex
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
      desc: "Im(r) returns the imaginary part of r, i.e. 0.",
      latex: LatexMethods.genFunctionLatex("Im")
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "real",
      evaluate: "ComplexFunctions.Im",
      desc: "Im(z) returns the imaginary part of z.",
      latex: LatexMethods.genFunctionLatex("Im")
    })
  ],
  "Re": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Re",
      desc: "Re(r) returns the real part of r, i.e. r.",
      latex: LatexMethods.genFunctionLatex("Re")
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "real",
      evaluate: "ComplexFunctions.Re",
      desc: "Re(z) returns the real part of z.",
      latex: LatexMethods.genFunctionLatex("Re")
    })
  ],
  "gamma": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Gamma",
      desc: "Evaluates the gamma function at r.",
      latex: LatexMethods.genFunctionLatex("\\Gamma")
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Gamma",
      desc: "Evaluates the gamma function at z.",
      latex: LatexMethods.genFunctionLatex("\\Gamma")
    })
  ],
  '^': [
    new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.Pow",
      desc: "Evaluates a^b, undefined for negative b. If you want to evaluate something like a^(1/5), use pow_rational(a, 1, 5).",
      latex: LatexMethods.exponentiationLatex
    }),
    new NormalDefinition({
      signature: ["complex", "complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Pow",
      desc: "Returns the principal value of z^w.",
      latex: LatexMethods.exponentiationLatex
    })
  ],
  "digamma": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Digamma",
      desc: "Evaluates the digamma function at r.",
      latex: LatexMethods.genFunctionLatex("\\psi^{(0})")
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Digamma",
      desc: "Evaluates the digamma function at z.",
      latex: LatexMethods.genFunctionLatex("\\psi^{(0})")
    })
  ],
  "trigamma": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Trigamma",
      desc: "Evaluates the trigamma function at r.",
      latex: LatexMethods.genFunctionLatex("\\psi^{(1})")
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Trigamma",
      desc: "Evaluates the trigamma function at z.",
      latex: LatexMethods.genFunctionLatex("\\psi^{(1})")
    })
  ],
  "polygamma": [
    new NormalDefinition({
      signature: ["int", "real"],
      returns: "real",
      evaluate: "RealFunctions.Polygamma",
      desc: "polygamma(n, r) evaluates the nth polygamma function at r.",
      latex: LatexMethods.polygammaLatex
    }),
    new NormalDefinition({
      signature: ["int", "complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Polygamma",
      desc: "polygamma(n, z) evaluates the nth polygamma function at z.",
      latex: LatexMethods.polygammaLatex
    })
  ],
  "sqrt": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Sqrt",
      desc: "sqrt(r) returns the square root of r. NaN if r < 0.",
      latex: LatexMethods.sqrtLatex
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Sqrt",
      desc: "sqrt(z) returns the principal branch of the square root of z.",
      latex: LatexMethods.sqrtLatex
    })
  ],
  "cbrt": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Cbrt",
      desc: "cbrt(r) returns the cube root of r. NaN if r < 0.",
      latex: LatexMethods.cbrtLatex
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Cbrt",
      desc: "cbrt(z) returns the principal branch of the cube root of z.",
      latex: LatexMethods.cbrtLatex
    })
  ],
  "ln": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Ln",
      desc: "ln(r) returns the natural logarithm of r. NaN if r < 0.",
      latex: LatexMethods.genFunctionLatex("ln")
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Ln",
      desc: "ln(z) returns the principal value of the natural logarithm of z.",
      latex: LatexMethods.genFunctionLatex("ln")
    })
  ],
  "log10": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Log10",
      desc: "log10(r) returns the base-10 logarithm of r. NaN if r < 0.",
      latex: LatexMethods.genFunctionLatex("log_{10}")
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Log10",
      desc: "log10(z) returns the principal value of base-10 logarithm of z.",
      latex: LatexMethods.genFunctionLatex("log_{10}")
    })
  ],
  "log2": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Log2",
      desc: "log2(r) returns the base-2 logarithm of r. NaN if r < 0.",
      latex: LatexMethods.genFunctionLatex("log_{2}")
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Log2",
      desc: "log2(z) returns the principal value of base-2 logarithm of z.",
      latex: LatexMethods.genFunctionLatex("log_{2}")
    })
  ],
  "piecewise": [
    new VariadicDefinition({
      initialSignature: [],
      repeatingSignature: ["real", "bool"],
      returns: "real",
      evaluate: "RealFunctions.Piecewise",
      desc: "piecewise(a, cond1, b, cond2 ... ) returns a if cond1 is true, b if cond2 is true, and so forth, and 0 otherwise.",
      latex: LatexMethods.piecewiseLatex
    }),
    new VariadicDefinition({
      initialSignature: ["real"],
      repeatingSignature: ["bool", "real"],
      returns: "real",
      evaluate: "RealFunctions.Piecewise",
      desc: "piecewise(a, cond1, b, cond2, ..., default) returns a if cond1 is true, b if cond2 is true, and so forth, and default otherwise.",
      latex: LatexMethods.piecewiseLatex
    }),
    new VariadicDefinition({
      initialSignature: [],
      repeatingSignature: ["complex", "bool"],
      returns: "complex",
      evaluate: "ComplexFunctions.Piecewise",
      desc: "piecewise(a, cond1, b, cond2 ... ) returns a if cond1 is true, b if cond2 is true, and so forth, and 0 otherwise.",
      latex: LatexMethods.piecewiseLatex
    }),
    new VariadicDefinition({
      initialSignature: ["complex"],
      repeatingSignature: ["bool", "complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Piecewise",
      desc: "piecewise(a, cond1, b, cond2, ..., default) returns a if cond1 is true, b if cond2 is true, and so forth, and default otherwise.",
      latex: LatexMethods.piecewiseLatex
    }),
  ],
  "ifelse": [
    new NormalDefinition({
      signature: ["real", "bool", "real"],
      returns: "real",
      evaluate: "RealFunctions.Piecewise",
      desc: "ifelse(a, cond, b) returns a if cond is true, and b otherwise",
      latex: LatexMethods.piecewiseLatex
    }),
    new NormalDefinition({
      signature: ["complex", "bool", "complex"],
      returns: "real",
      evaluate: "RealFunctions.Piecewise",
      desc: "ifelse(a, cond, b) returns a if cond is true, and b otherwise",
      latex: LatexMethods.piecewiseLatex
    })
  ],
  "cchain": [
    new VariadicDefinition({
      initialSignature: ["real"],
      repeatingSignature: ["int", "real"],
      returns: "bool",
      evaluate: "RealFunctions.CChain",
      desc: "Used internally to describe comparison chains (e.x. 0 < a < b < 1)",
      latex: LatexMethods.cchainLatex
    })
  ],
  "<": [
    new NormalDefinition( {
      signature: ["real", "real"],
      returns: "bool",
      evaluate: "RealFunctions.Cmp.LessThan",
      desc: "Returns a < b.",
      latex: LatexMethods.cmpLatex['<']
    })
  ],
  ">": [
    new NormalDefinition( {
      signature: ["real", "real"],
      returns: "bool",
      evaluate: "RealFunctions.Cmp.GreaterThan",
      desc: "Returns a > b.",
      latex: LatexMethods.cmpLatex['>']
    })
  ],
  "<=": [
    new NormalDefinition( {
      signature: ["real", "real"],
      returns: "bool",
      evaluate: "RealFunctions.Cmp.LessEqualThan",
      desc: "Returns a <= b.",
      latex: LatexMethods.cmpLatex['<=']
    })
  ],
  ">=": [
    new NormalDefinition( {
      signature: ["real", "real"],
      returns: "bool",
      evaluate: "RealFunctions.Cmp.GreaterEqualThan",
      desc: "Returns a >= b.",
      latex: LatexMethods.cmpLatex['>=']
    })
  ],
  "==": [
    new NormalDefinition( {
      signature: ["real", "real"],
      returns: "bool",
      evaluate: "RealFunctions.Cmp.Equal",
      desc: "Returns a == b.",
      latex: LatexMethods.cmpLatex['==']
    })
  ],
  "!=": [
    new NormalDefinition( {
      signature: ["real", "real"],
      returns: "bool",
      evaluate: "RealFunctions.Cmp.NotEqual",
      desc: "Returns a != b.",
      latex: LatexMethods.cmpLatex['!=']
    })
  ],
  "euler_phi": [
    new NormalDefinition({
      signature: ["int"],
      returns: "int",
      evaluate: "RealFunctions.EulerPhi",
      desc: "Returns Euler's totient function evaluated at an integer n.",
      latex: LatexMethods.genFunctionLatex('\\phi')
    })
  ],
  "floor": [
    new NormalDefinition({
      signature: ["real"],
      returns: "int",
      evaluate: "RealFunctions.Floor",
      desc: "Returns the floor of a real number r.",
      latex: LatexMethods.floorLatex
    })
  ],
  "ceil": [
    new NormalDefinition({
      signature: ["real"],
      returns: "int",
      evaluate: "RealFunctions.Ceil",
      desc: "Returns the ceiling of a real number r.",
      latex: LatexMethods.ceilLatex
    })
  ],
  "riemann_zeta": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Zeta",
      desc: "Returns the Riemann zeta function of a real number r.",
      latex: LatexMethods.genFunctionLatex("\\zeta")
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Zeta",
      desc: "Returns the Riemann zeta function of a complex number r.",
      latex: LatexMethods.genFunctionLatex("\\zeta")
    })
  ],
  "dirichlet_eta": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Eta",
      desc: "Returns the Dirichlet eta function of a real number r.",
      latex: LatexMethods.genFunctionLatex("\\eta")
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Eta",
      desc: "Returns the Dirichlet eta function of a complex number r.",
      latex: LatexMethods.genFunctionLatex("\\eta")
    })
  ],
  "mod": [
    new NormalDefinition({
      signature: ["int", "int"],
      returns: "int",
      evaluate: "RealFunctions.Mod",
      desc: "Returns a modulo b.",
      latex: LatexMethods.genFunctionLatex("mod")
    }),
    new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.Mod",
      desc: "Returns a modulo b.",
      latex: LatexMethods.genFunctionLatex("mod")
    })
  ],
  "frac": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Frac",
      desc: "Returns the fractional part of x.",
      latex: LatexMethods.fractionalPartLatex
    })
  ],
  "sign": [
    new NormalDefinition({
      signature: ["real"],
      returns: "int",
      evaluate: "RealFunctions.Sign",
      desc: "Returns the sign of x: 1 if x > 0, 0 if x == 0 and -1 otherwise.",
      latex: LatexMethods.genFunctionLatex("sgn")
    })
  ],
  "round": [
    new NormalDefinition({
      signature: ["real"],
      returns: "int",
      evaluate: "RealFunctions.Round",
      desc: "Returns the nearest integer to x. Note that if |x| > " + Number.MAX_SAFE_INTEGER + " this may not be accurate.",
      latex: LatexMethods.genFunctionLatex("round")
    })
  ],
  "trunc": [
    new NormalDefinition({
      signature: ["real"],
      returns: "int",
      evaluate: "RealFunctions.Trunc",
      desc: "Removes the fractional part of x.",
      latex: LatexMethods.genFunctionLatex("trunc")
    })
  ],
  "is_finite": [
    new NormalDefinition({
      signature: ["real"],
      returns: "bool",
      evaluate: "RealFunctions.IsFinite",
      desc: "Returns true if the number is finite and false if it is -Infinity, Infinity, or NaN",
      latex: LatexMethods.genFunctionLatex("isFinite")
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "bool",
      evaluate: "ComplexFunctions.IsFinite",
      desc: "Returns true if the number is finite and false if it is undefined or infinite",
      latex: LatexMethods.genFunctionLatex("isFinite")
    })
  ],
  "not": [
    new NormalDefinition({
      signature: ["bool"],
      returns: "bool",
      evaluate: "BooleanFunctions.Not",
      desc: "Returns the logical negation of b.",
      latex: LatexMethods.logicLatex.not
    })
  ],
  "and": [
    new NormalDefinition({
      signature: ["bool", "bool"],
      returns: "bool",
      evaluate: "BooleanFunctions.And",
      desc: "Returns true if a and b are true, and false otherwise.",
      latex: LatexMethods.logicLatex.and
    })
  ],
  "or": [
    new NormalDefinition({
      signature: ["bool", "bool"],
      returns: "bool",
      evaluate: "BooleanFunctions.Or",
      desc: "Returns true if a or b are true, and false otherwise.",
      latex: LatexMethods.logicLatex.or
    })
  ],
  "Ei": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Ei",
      desc: "Returns the exponential integral of x.",
      latex: LatexMethods.genFunctionLatex("Ei")
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Ei",
      desc: "Returns the exponential integral of z.",
      latex: LatexMethods.genFunctionLatex("Ei")
    })
  ],
  "li": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Li",
      desc: "Returns the logarithmic integral of x.",
      latex: LatexMethods.genFunctionLatex("li")
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Li",
      desc: "Returns the logarithmic integral of z.",
      latex: LatexMethods.genFunctionLatex("li")
    })
  ],
  "sinc": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Sinc",
      desc: "Returns the sinc function of x.",
      latex: LatexMethods.genFunctionLatex("sinc")
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Sinc",
      desc: "Returns the sinc function of x.",
      latex: LatexMethods.genFunctionLatex("sinc")
    })
  ],
  "Si": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Si",
      desc: "Returns the sine integral of x.",
      latex: LatexMethods.genFunctionLatex("Si")
    })
  ],
  "Ci": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Ci",
      desc: "Returns the cosine integral of x.",
      latex: LatexMethods.genFunctionLatex("Ci")
    })
  ],
  "erf": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Erf",
      desc: "Returns the error function of x.",
      latex: LatexMethods.genFunctionLatex("erf")
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Erf",
      desc: "Returns the error function of z.",
      latex: LatexMethods.genFunctionLatex("erf")
    })
  ],
  "erfc": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Erfc",
      desc: "Returns the complementary error function of x.",
      latex: LatexMethods.genFunctionLatex("erfc")
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Erfc",
      desc: "Returns the complementary error function of z.",
      latex: LatexMethods.genFunctionLatex("erfc")
    })
  ],
  "inverse_erf": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.InverseErf",
      desc: "Returns the inverse error function of x.",
      latex: LatexMethods.genFunctionLatex("erf^{-1}")
    })
  ],
  "inverse_erfc": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.InverseErfc",
      desc: "Returns the inverse complementary error function of x.",
      latex: LatexMethods.genFunctionLatex("erfc^{-1}")
    })
  ],
  "gcd": [
    new NormalDefinition({
      signature: ["int", "int"],
      returns: "int",
      evaluate: "RealFunctions.Gcd",
      desc: "Returns the greatest common divisor of a and b.",
      latex: LatexMethods.genFunctionLatex("gcd")
    })
  ],
  "lcm": [
    new NormalDefinition({
      signature: ["int", "int"],
      returns: "int",
      evaluate: "RealFunctions.Lcm",
      desc: "Returns the least common multiple of a and b.",
      latex: LatexMethods.genFunctionLatex("lcm")
    })
  ],
  "fresnel_S": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.FresnelS",
      desc: "Return the integral from 0 to x of sin(x^2).",
      latex: LatexMethods.genFunctionLatex("S")
    })
  ],
  "fresnel_C": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.FresnelC",
      desc: "Return the integral from 0 to x of cos(x^2).",
      latex: LatexMethods.genFunctionLatex("C")
    })
  ],
  "product_log": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.ProductLog",
      desc: "Return the principal branch of the product log of x (also known as the Lambert W function or W0(x)).",
      latex: LatexMethods.genFunctionLatex("W_0")
    }),
    new NormalDefinition({
      signature: ["int", "real"],
      returns: "real",
      evaluate: "RealFunctions.ProductLogBranched",
      desc: "Return the nth branch of the product log of x (also known as the Lambert W function or W0(x)). n can be 0 or -1.",
      latex: LatexMethods.genFunctionSubscriptLatex("W")
    })
  ],
  "elliptic_K": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.EllipticK",
      desc: "Return the complete elliptic integral K(m) with parameter m = k^2.",
      latex: LatexMethods.genFunctionLatex("K")
    })
  ],
  "elliptic_E": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.EllipticE",
      desc: "Return the complete elliptic integral E(m) with parameter m = k^2.",
      latex: LatexMethods.genFunctionLatex("E")
    })
  ],
  "agm": [
    new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.Agm",
      desc: "Return the arithmetic geometric mean of a and b.",
      latex: LatexMethods.genFunctionLatex("agm")
    })
  ],
  "abs": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Abs",
      desc: "Return the absolute value of r.",
      latex: LatexMethods.absoluteValueLatex
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "real",
      evaluate: "ComplexFunctions.Abs",
      desc: "Return the magnitude of z.",
      latex: LatexMethods.absoluteValueLatex
    })
  ],
  "vec2": [
    new NormalDefinition({
      signature: ["real", "real"],
      returns: "vec2",
      evaluate: "VectorFunctions.Construct",
      desc: "Construct a new vec2."
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "vec2",
      evaluate: "VectorFunctions.FromComplex",
      desc: "Construct a new vec2 from the real and imaginary components of a complex number."
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
  ],
  "prime_count": [
    new NormalDefinition({
      signature: ["int"],
      returns: "int",
      evaluate: "RealFunctions.PrimeCount",
      desc: "Find the number of primes below n.",
      latex: LatexMethods.genFunctionLatex("\\pi")
    })
  ],
  "cis": [
    new NormalDefinition({
      signature: ["real"],
      returns: "complex",
      evaluate: "ComplexFunctions.Cis",
      desc: "Returns cos(theta) + i sin(theta).",
      latex: LatexMethods.genFunctionLatex("cis")
    })
  ],
  "Cl2": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Cl2",
      desc: "Evaluates the Clausen function of x.",
      latex: LatexMethods.genFunctionLatex("Cl_2")
    })
  ],
  "beta": [
    new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.Beta",
      desc: "Evaluates the beta function at a,b.",
      latex: LatexMethods.genFunctionLatex("B")
    })
  ],
  "exp": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Exp",
      latex: LatexMethods.genFunctionLatex("exp")
    }),
    new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Exp",
      latex: LatexMethods.genFunctionLatex("exp")
    })
  ],
  "ln_gamma": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.LnGamma",
      latex: LatexMethods.genFunctionLatex("\\ln \\Gamma")
    })
  ],
  "barnes_G": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.BarnesG",
      latex: LatexMethods.genFunctionLatex("G")
    })
  ],
  "ln_barnes_G": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.LnBarnesG",
      latex: LatexMethods.genFunctionLatex("\\ln \\operatorname{G}")
    })
  ],
  "K_function": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.KFunction",
      latex: LatexMethods.genFunctionLatex("K")
    })
  ],
  "ln_K_function": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.LnKFunction",
      latex: LatexMethods.genFunctionLatex("\\ln \\operatorname{K}")
    })
  ],
  "bessel_J": [
    new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.BesselJ",
      latex: LatexMethods.genFunctionSubscriptLatex("J")
    })
  ],
  "bessel_Y": [
    new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.BesselY",
      latex: LatexMethods.genFunctionSubscriptLatex("Y")
    })
  ],
  "bessel_J0": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.BesselJ0",
      latex: LatexMethods.genFunctionLatex("J_0")
    })
  ],
  "bessel_Y0": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.BesselY0",
      latex: LatexMethods.genFunctionLatex("Y_0")
    })
  ],
  "bessel_J1": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.BesselJ1",
      latex: LatexMethods.genFunctionLatex("J_1")
    })
  ],
  "bessel_Y1": [
    new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.BesselY1",
      latex: LatexMethods.genFunctionLatex("Y_1")
    })
  ],
  "spherical_bessel_J": [
    new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.SphericalBesselJ",
      latex: LatexMethods.genFunctionSubscriptLatex("j")
    })
  ],
  "spherical_bessel_Y": [
    new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.SphericalBesselY",
      latex: LatexMethods.genFunctionSubscriptLatex("y")
    })
  ],
  "polylog": [
    new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.Polylogarithm",
      latex: LatexMethods.genFunctionSubscriptLatex("Li")
    })
  ]
}

export { Typecasts, Operators, castableInto, castableIntoMultiple, getCastingFunction, NormalDefinition, retrieveEvaluationFunction }
