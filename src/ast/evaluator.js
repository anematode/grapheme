
// Evaluators are functions of a specific signature that compute some operator. They are less abstract than the
// operators themselves; for example, * may have multiple evaluators: (int, int) -> int, (complex, complex) -> complex.
// In turn, evaluators are abstractions over concrete evaluators, which have a signature of concrete types and actual
// functions to be evaluated. Concrete evaluators do the actual legwork! In the case of primitive returns, they return
// the result directly; in the case of non-primitive returns, they will usually have two forms: one form that simply
// takes the operator arguments and returns the result, and one that takes in an extra parameter, the *destination*, and
// writes the result to the destination. This avoids unnecessary allocations and is especially useful in the fast
// interval case.

// Evaluators of all types have metadata that allow for proper usage and various optimizations. Some important ones
// common to both types:
// identity: true/false; whether the evaluator is an identity operation, either abstractly or concretely. For example,
// the cast from concrete int -> real is an identity. Almost all identities in practice are concrete casts, like
// concrete int -> real, since both use numbers
//
// Data particular to concrete evaluators:
// func: A function that can actually be invoked (with the appropriate arguments)
// primitive: If an empty string, func *must* be used. If non-empty, it may be used as a literal string in code.
// For example, concrete +(int, int) -> int has primitive="+", so that func doesn't have to be used at all in the
// compiled code. If it has no arguments, then the string itself can be used (for example, a hypothetical zero() -> int
// might have primitive="0"). If it has one argument, then the argument is a unary prefix. If it has two arguments, then
// the argument is a binary prefix.
// type: "new" or "write". If "new", takes in arguments and returns the result. If "write", takes in arguments and
// writes the result to the last argument.

// Casts are a special form of evaluator that take in a single argument and return another argument. As with most
// things, there are both abstract and concrete casts. For example, real -> complex is an implicit abstract
// cast and a concrete cast. What's special about casts, though, is that there are casts between concrete types that
// usually are used in different modes. For example, real -> fast_interval_real.

import { toConcreteType } from './builtin_types.js'

let unaryPrimitives = {
  '-': x => -x
}

let binaryPrimitives = {}
;['+', '-', '/', '*', '&&', '||', '==', '!=', '<=', '>=', '<', '>'].forEach(op => {
  binaryPrimitives[op] = (new Function(`return x ${op} y`, 'x', 'y'))
})

let implicitConcreteCasts = {}

function registerConcreteCast (srcConcreteType, dstConcreteType, concreteEvaluator) {

}

// Returns an ARRAY of concrete evaluators between the source and destination types
function getConcreteCast (srcConcreteType, dstConcreteType) {

}

class ConcreteEvaluator {
  constructor (params={}) {
    /**
     * Argument types (should all be concrete types)
     * @type {ConcreteType[]}
     */
    this.args = (params.args ?? []).map(toConcreteType)

    /**
     * Return type
     * @type {ConcreteType}
     */
    this.returns = toConcreteType(params.returns ?? "void")

    this.argCount = this.args.length

    this.identity = params.identity

    this.type = params.type ?? "new"

    this.primitive = params.primitive ?? ""

    this.func = params.func ?? null

    this.fillDefaults()
  }

  fillDefaults () {
    if (this.returns.isPrimitive && this.type === "write") throw new Error("Cannot write to a primitive")

    if (!this.func) {
      let func

      if (this.identity) {
        if (this.type === "new") {
          func = this.returns.clone
        } else if (this.type === "write") {
          func = this.returns.copyTo
        }
      } else if (this.primitive) {
        if (this.argCount === 0) {
          func = new Function("return " + this.primitive)
        } else if (this.argCount === 1) {
          func = unaryPrimitives[this.primitive]
        } else if (this.argCount === 2) {
          func = binaryPrimitives[this.primitive]
        }

        this.type = "new"
      }

      if (!func) throw new Error("Unable to generate evaluation function")
      this.func = func
    }
  }

  // Whether the evaluator can be called with the given concrete types, WITHOUT IMPLICIT CASTING
  canBeCalledDirectlyWith (typeList) {
    if (typeList.length !== this.argCount) return false

    for (let i = 0; i < this.args.length; ++i) {
      let thisType = args[i]
      if (!thisType.isSameConcreteType(typeList[i])) {
        return false
      }
    }

    return true
  }

  // Returns -1 if the evaluator cannot be called,
  castDistance (typeList) {
    if (typeList.length !== this.argCount) return -1

    for (let i = 0; i < this.args.length; ++i) {
      let thisType = args[i]
      if (!thisType.isSameConcreteType(typeList[i])) {
        return false
      }
    }

    return true
  }
}

class ConcreteCast {

}
