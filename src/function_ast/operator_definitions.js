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

    this.evaluate = (isWorker ? "" : "Grapheme") + params.evaluate
  }
}

class NormalDefinition extends OperatorDefinition {
  constructor(params={}) {
    super(params)

    this.signature = params.signature
    if (!Array.isArray(this.signature))
      throw new Error("Given signature is not an array")

    this.signature.forEach(throwInvalidType)

  }
}

class VariadicDefinition extends OperatorDefinition {
  constructor() {
    super()
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

const Operators = {
  '*': [
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
    })
  ],
  '-': [
    new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.Subtract"
    }),
    new NormalDefinition({
      signature: ["complex", "complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Subtract"
    })
  ],
  '/': [
    new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.Divide"
    }),
    new NormalDefinition({
      signature: ["complex", "complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Divide"
    })
  ]
}

export default Operators
