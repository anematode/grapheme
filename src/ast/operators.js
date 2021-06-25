import {FixedOperatorDefinition} from "./operator.js"
import { Vec2 } from '../math/vec/vec2.js'

/**
 * Mapping of operator name to list of operators with that name
 */
export const Operators = {}

/**
 * Find the operator of a given name which matches a signature--a list of types. If types can be successfully casted,
 * then it is a match (the signatures don't have to be identical, just compatible).
 * @param name {string} The operator name (ex. +)
 * @param signature {string[]} The type signature to call the function (ex. ["real", "real"])
 * @returns {OperatorDefinition|undefined} The OperatorDefinition corresponding to that function call, if it exists
 */
export function resolveOperator (name, signature) {
  let candidates = Operators[name]
  if (!candidates) return

  for (let candidate of candidates) {
    if (candidate.signatureWorks(signature)) {
      return candidate
    }
  }
}

/**
 * Given the name of an operator and its definition, place it into the register of operators
 * @param name {string}
 * @param ops {OperatorDefinition[]}
 */
function registerOperator (name, ...ops) {
  if (Operators[name]) {
    Operators[name].push(...ops)
  } else {
    Operators[name] = ops
  }
}

function defineSimpleBinaryOperator (type, name, generic) {
  registerOperator(name, new FixedOperatorDefinition({
    signature: [ type, type ],
    returnType: type,
    evaluators: {
      generic
    }
  }))
}

defineSimpleBinaryOperator("int", "+", "addition")
defineSimpleBinaryOperator("int", "-", "subtraction")
defineSimpleBinaryOperator("int", "*", "multiplication")
defineSimpleBinaryOperator("int", "^", Math.pow)

defineSimpleBinaryOperator("real", "+", "addition")
defineSimpleBinaryOperator("real", "-", "subtraction")
defineSimpleBinaryOperator("real", "*", "multiplication")
defineSimpleBinaryOperator("real", "/", "division")
defineSimpleBinaryOperator("real", "^", Math.pow)

registerOperator('-', new FixedOperatorDefinition({
  signature: [ "int" ],
  returnType: "int",
  evaluators: {
    generic: "unary_subtraction"
  }
}))

registerOperator('-', new FixedOperatorDefinition({
  signature: [ "real" ],
  returnType: "real",
  evaluators: {
    generic: "unary_subtraction"
  }
}))

function defineUnaryReal (name, evaluator) {
  registerOperator(name, new FixedOperatorDefinition({
    signature: [ "real" ],
    returnType: "real",
    evaluators: {
      generic: evaluator
    }
  }))
}

defineUnaryReal("sin", Math.sin)
defineUnaryReal("cos", Math.cos)
defineUnaryReal("tan", Math.tan)
defineUnaryReal("asin", Math.asin)
defineUnaryReal("acos", Math.acos)
defineUnaryReal("atan", Math.atan)
defineUnaryReal("sinh", Math.sinh)
defineUnaryReal("cosh", Math.cosh)
defineUnaryReal("tanh", Math.tanh)
defineUnaryReal("asinh", Math.asinh)
defineUnaryReal("acosh", Math.acosh)
defineUnaryReal("atanh", Math.atanh)

defineUnaryReal("sqrt", Math.sqrt)
defineUnaryReal("cbrt", Math.cbrt)

registerOperator('vec2', new FixedOperatorDefinition({
  signature: [ "real", "real" ],
  returnType: "vec2",
  evaluators: {
    generic: (a, b) => new Vec2(a, b)
  }
}))
