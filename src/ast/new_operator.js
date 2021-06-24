import {levenshtein} from "../core/utils.js"
import {Complex} from "../math/complex/complex.js"
import {initTypecasts} from "./typecasts.js"

// List of valid types in Grapheme math language (as distinct from the props and stuff)
export const TYPES = {
  "bool": {
    typecheck: {
      generic: {
        f: x => (typeof x === "boolean")
      }
    }
  },
  "int": {
    typecheck: {
      generic: {
        f: Number.isInteger
      }
    }
  },
  "real": {
    typecheck: {
      generic: {
        f: x => (typeof x === "number")
      }
    }
  },
  "complex": true,
  "null": true
}

/**
 * Get typecast definition between two types--if the definition exists. Can also be used as a boolean test for whether
 * two types are castable. The list of allowed casts is generated in typecasts.js
 * @param from {string}
 * @param to {string}
 * @returns {TypecastDefinition|*}
 */
export function getCast (from, to) {
  let candidates = typecastDict[from]

  if (!candidates)
    return

  for (let i = candidates.length - 1; i >= 0; --i) {
    let candidate = candidates[i]
    if (candidate.to === to)
      return candidate
  }
}

export function canCast (from, to) {
  return from === to || !!getCast(from, to)
}

/**
 * Whether a type is valid
 * @param typename {string}
 * @returns {boolean}
 */
function isValidType(typename) {
  return (typeof typename === "string") && (typename in TYPES)
}

/**
 * Throw a (hopefully helpful) error when a type is invalid
 * @param typename {string}
 * @returns {boolean}
 */
function throwInvalidType(typename) {
  if (!isValidType(typename)) {
    if (typeof typename !== "string")
      throw new Error("Non-string passed as typename")

    let didYouMean = ""

    let minDistance = Infinity, closestType
    Object.keys(TYPES).forEach(type => {
      let dist = levenshtein(typename, type)
      if (dist < minDistance) {
        minDistance = dist
        closestType = type
      }
    })

    if (minDistance < 2) {
      didYouMean = ". Did you mean " + closestType + "?"
    } else {
      didYouMean = `; valid types are ${Object.keys(TYPES).join(', ')}.`
    }

    throw new Error(`Unrecognized type "${typename}"${didYouMean}`)
  }
}

/**
 * Abstract class: definition of an evaluable operator
 */
export class OperatorDefinition {
  constructor (params={}) {
    throwInvalidType(this.returnType = params.returnType)

    /**
     * Mapping of evaluation mode -> evaluator which can evaluate the operator in that mode. "generic" accepts arguments
     * of various types--that is the intent
     * @type {{}}
     */
    this.evaluators = params.evaluators ?? {}
  }
}

/**
 * Taking in a signature argument like "real", ["real", "complex"], or undefined and converting it to a normalized form
 * @param obj {string[]|string|undefined}
 * @returns {string[]}
 */
function signatureNormalize (obj) {
  if (Array.isArray(obj)) {
    obj.forEach(throwInvalidType)

    return obj
  } else if (!obj) {
    return []
  } else {
    throwInvalidType(obj)

    return [ obj ]
  }
}

const specialEvaluators = {
  identity: {
    type: "special",
    name: "identity",
    f: x => x
  },
  addition: {
    type: "special_binary",
    binary: '+',
    f: (a, b) => a + b
  },
  subtraction: {
    type: "special_binary",
    binary: '-',
    f: (a, b) => a - b
  },
  unary_subtraction: {
    type: "special",
    f: a => -a
  },
  multiplication: {
    type: "special_binary",
    binary: '*',
    f: (a, b) => a * b
  },
  division: {
    type: "special_binary",
    binary: '/',
    f: (a, b) => a / b
  },
  pow: {
    type: "special",
    name: "pow",
    f: Math.pow
  }
}

/**
 * Given an evaluator description, return a normalized evaluator of the form { type: (str), f: (function) } and
 * potentially more information that the compiler can use to optimize the evaluator (identity, piecewiseness, etc.)
 * @param obj
 */
function evaluatorNormalize (obj) {
  if (typeof obj === "string") {
    let evaluator = specialEvaluators[obj]

    if (!obj) throw new Error(`Unknown special evaluator ${obj}`)

    return evaluator
  } else if (typeof obj === "function") {
    return {
      type: "normal",
      f: obj
    }
  }

  return obj
}

/**
 * Normalize the form of evaluators in an evaluator dictionary. Modifies the passed object.
 * @param obj {{}}
 */
function evaluatorsNormalize (obj) {
  for (let key in obj) {
    if (!obj.hasOwnProperty(key)) continue

    obj[key] = evaluatorNormalize(obj[key])
  }

  return obj
}

/**
 * Operator with a fixed type signature and type output
 */
export class FixedOperatorDefinition extends OperatorDefinition {
  constructor (params={}) {
    super(params)

    this.signature = signatureNormalize(params.signature)
    this.evaluators = evaluatorsNormalize(params.evaluators)
  }

  argCount () {
    return this.signature.length
  }

  /**
   * Return whether a given signature is compatible with this operator definition
   * @param signature {string[]}
   * @returns {boolean}
   */
  signatureWorks (signature) {
    let match = this.signature

    if (match.length !== signature.length) return false
    return match.every((type, i) => canCast(signature[i], type))
  }
}

// List of typecasts and dict from (source type) -> (dst type)
let typecastList = [], typecastDict = {}

class TypecastDefinition extends FixedOperatorDefinition {
  constructor(params = {}) {
    let from = params.from
    let to = params.to

    super({...params, returnType: to, signature: from})

    this.from = from
    this.to = to
  }
}

initTypecasts(TypecastDefinition, typecastList, typecastDict)

