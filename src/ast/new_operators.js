import {FixedOperatorDefinition} from "./new_operator.js"

export const Operators = {}

/**
 * Find the operator of a given name which matches a signature
 * @param name {string}
 * @param signature {string[]}
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
