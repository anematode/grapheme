
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
  binaryPrimitives[op] = (new Function('x', 'y', `return x ${op} y`))
})

export class ConcreteEvaluator {
  constructor (params={}) {
    /**
     * Argument types (should all be concrete types)
     * @type {ConcreteType[]}
     */
    this.args = (params.args ?? []).map(toConcreteType)
    if (!this.args.every(arg => !!arg)) throw new Error("Unknown argument type")

    /**
     * Return type
     * @type {ConcreteType}
     */
    this.returns = toConcreteType(params.returns ?? "void")
    if (!this.returns) throw new Error("Unknown return type")

    this.argCount = this.args.length

    /**
     * Whether this operation is an identity operation (at the type level)
     * @type {boolean}
     */
    this.identity = params.identity

    /**
     * Either "new" or "write". "new" means the func returns a new instance of the object. "write" means the function
     * writes the result to the last argument (arg1, arg2, dst). For example, a "write" +(complex, complex, complex)
     * would put the result of the addition of the first two numbers into the second, overwriting whatever was there
     * @type {string}
     */
    this.type = params.type ?? "new"
    if (this.type !== "new" && this.type !== "write") throw new Error("Evaluator type must be either new or write, not " + this.type)

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

  /**
   * Given a list of concrete types, whether the evaluator can be called with those types. -1 if not, 0 if no casts are
   * needed, >0 for the number of needed casts
   * @param args
   */
  canCallWith (args) {
    return castDistance(this.getCasts(args))
  }

  getCasts (args) {
    if (this.args.length !== args.length) return null

    let casts = []
    for (let i = 0; i < args.length; ++i) {
      let cast = getConcreteCast(args[i] /* src */, this.args[i])

      if (!cast) return null
      casts.push(cast)
    }

    return casts
  }
}

// A concrete cast is a special evaluator taking in one concrete type and outputting another. Note the concrete types
// might be of the same mathematical type! For example, the concrete cast real -> real_interval makes quite a bit of
// sense; 3.2 -> [3.2, 3.2].
export class ConcreteCast extends ConcreteEvaluator {
  constructor (params) {
    if (!params.src || !params.dst) throw new Error("No source or destination types provided")

    params.args = [ params.src ]
    params.returns = params.dst

    super(params)
  }

  srcType () {
    return this.args[0]
  }

  dstType () {
    return this.returns
  }
}

const BUILTIN_CONCRETE_CASTS = new Map()

/**
 * Register a concrete cast from src to dst
 * @param cast
 */
export function registerConcreteCast (cast) {
  const CASTS = BUILTIN_CONCRETE_CASTS

  let srcType = cast.srcType()
  let dstType = cast.dstType()

  if (!CASTS.has(srcType))
    CASTS.set(srcType.toHashStr(), new Map())
  let srcCasts = CASTS.get(srcType.toHashStr())

  srcCasts.set(dstType.toHashStr(), cast)
  return cast
}

/**
 * Get cast from src to dst. Returns "null" if the cast doesn't exist, "identity" if the types are the same, and a
 * corresponding ConcreteCast if there is a match
 * @param srcType
 * @param dstType
 */
export function getConcreteCast (srcType, dstType) {
  if (!(srcType instanceof ConcreteType) || !(dstType instanceof ConcreteType))
    throw new Error("Invalid source or destination type")

  if (srcType.isSameType(dstType)) return "identity"

  let srcCasts = BUILTIN_MATHEMATICAL_CASTS.get(srcType.toHashStr())
  if (!srcCasts) return null

  return srcCasts.get(dstType.toHashStr()) ?? null
}

export function canConcreteCast (srcType, dstType) {
  return !!getConcreteCast(srcType, dstType)
}

export function getConcreteCasts () {
  let casts = []
  for (let castList of BUILTIN_CONCRETE_CASTS.values()) {
    casts.push(...castList.values())
  }
  return casts
}

export function castDistance (casts) {
  let count = 0

  for (let cast of casts) {
    if (cast !== "identity")
      count++
    else if (!cast) {
      count = -1
      break
    }
  }

  return count
}
