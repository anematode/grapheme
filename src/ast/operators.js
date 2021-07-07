import { FixedOperatorDefinition } from './operator.js'
import { Vec2 } from '../math/vec/vec2.js'
import { FastRealInterval } from '../math/fast_interval/fast_real_interval.js'

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

function defineSimpleBinaryOperator (type, name, generic, fast_interval) {
  registerOperator(
    name,
    new FixedOperatorDefinition({
      signature: [type, type],
      returnType: type,
      evaluators: {
        generic,
        fast_interval: {
          type: "writes",
          f: fast_interval
        }
      }
    })
  )
}

defineSimpleBinaryOperator('int', '+', 'addition', FastRealInterval.add)
defineSimpleBinaryOperator('int', '-', 'subtraction', FastRealInterval.sub)
defineSimpleBinaryOperator('int', '*', 'multiplication', FastRealInterval.mul)
defineSimpleBinaryOperator('int', '^', Math.pow, FastRealInterval.pow)

defineSimpleBinaryOperator('real', '+', 'addition', FastRealInterval.add)
defineSimpleBinaryOperator('real', '-', 'subtraction', FastRealInterval.sub)
defineSimpleBinaryOperator('real', '*', 'multiplication', FastRealInterval.mul)
defineSimpleBinaryOperator('real', '/', 'division', FastRealInterval.div)
defineSimpleBinaryOperator('real', '^', Math.pow, FastRealInterval.pow)

registerOperator(
  '-',
  new FixedOperatorDefinition({
    signature: ['int'],
    returnType: 'int',
    evaluators: {
      generic: 'unary_subtraction',
      fast_interval: {
        type: "writes",
        f: FastRealInterval.unarySub
      }
    }
  })
)

registerOperator(
  '-',
  new FixedOperatorDefinition({
    signature: ['real'],
    returnType: 'real',
    evaluators: {
      generic: 'unary_subtraction',
      fast_interval: {
        type: "writes",
        f: FastRealInterval.unarySub
      }
    }
  })
)

function defineUnaryReal (name, evaluator, fast_interval) {
  registerOperator(
    name,
    new FixedOperatorDefinition({
      signature: ['real'],
      returnType: 'real',
      evaluators: {
        generic: evaluator,
        fast_interval: {
          type: "writes",
          f: fast_interval
        }
      }
    })
  )
}

defineUnaryReal('sin', Math.sin, FastRealInterval.sin)
defineUnaryReal('cos', Math.cos, FastRealInterval.cos)
defineUnaryReal('tan', Math.tan, FastRealInterval.tan)
defineUnaryReal('asin', Math.asin, FastRealInterval.asin)
defineUnaryReal('acos', Math.acos, FastRealInterval.acos)
defineUnaryReal('atan', Math.atan, FastRealInterval.atan)
defineUnaryReal('sinh', Math.sinh)
defineUnaryReal('cosh', Math.cosh)
defineUnaryReal('tanh', Math.tanh)
defineUnaryReal('asinh', Math.asinh)
defineUnaryReal('acosh', Math.acosh)
defineUnaryReal('atanh', Math.atanh)

defineUnaryReal('sqrt', Math.sqrt, FastRealInterval.sqrt)
defineUnaryReal('cbrt', Math.cbrt, FastRealInterval.cbrt)

registerOperator(
  'vec2',
  new FixedOperatorDefinition({
    signature: ['real', 'real'],
    returnType: 'vec2',
    evaluators: {
      generic: {
        type: "writes",
        f: (x, y, v) => {
          v.x = x
          v.y = y
        }
      },
      fast_interval: {
        type: "writes",
        f: (int1, int2, v) => {
          v.xMin = int1.min
          v.xMax = int1.max
          v.yMin = int2.min
          v.yMax = int2.max
          v.info = int1.info & int2.info
        }
      }
    }
  })
)

registerOperator(
  '+',
  new FixedOperatorDefinition( {
    signature: ["vec2", "vec2"],
    returnType: "vec2",
    evaluators: {
      generic: {
        type: "writes",
        f: (x, y, v) => {
          v.x = x.x + y.x
          v.y = x.y + y.y
        }
      },
      fast_interval: {
        type: "writes",
        f: (x, y, v) => {
          v.xMin = x.xMin + y.xMin
          v.xMax = x.xMax + y.xMax
          v.yMin = x.yMin + y.yMin
          v.yMax = x.yMax + y.yMax
          v.info = x.info & y.info
        }
      }
    }
  })
)
