import { toMathematicalType } from './builtin_types.js'
import { MathematicalType } from './type.js'
import { castDistance } from './evaluator.js'

export class OperatorDefinition {
  constructor (params={}) {
    this.name = params.name

    /**
     * Arguments
     * @type {MathematicalType[]}
     */
    this.args = (params.args ?? []).map(toMathematicalType)
    if (!this.args.every(arg => !!arg)) throw new Error("Unknown argument type")

    /**
     * Return type (void type if nothing)
     * @type {MathematicalType}
     */
    this.returns = toMathematicalType(params.returns ?? "void")
    if (!this.returns) throw new Error("Unknown return type " + params.returns)

    // List of potential concrete evaluators
    this.evaluators = params.evaluators ?? []

    this.tags = {}
  }

  argCount () {
    return this.args.length
  }

  /**
   * Check whether this operator can be called with the given mathematical types.
   * @param args {MathematicalType[]}
   * @returns {number} -1 if it cannot be called, a nonnegative integer giving the number of necessary implicit casts to call it
   */
  canCallWith (args) {
    return castDistance(this.getCasts(args))
  }

  getCasts (args) {
    if (this.args.length !== args.length) return null

    let casts = []
    for (let i = 0; i < args.length; ++i) {
      let cast = getMathematicalCast(args[i] /* src */, this.args[i])

      if (!cast) return null
      casts.push(cast)
    }

    return casts
  }

  prettyPrint() {
    // ^(int, int) -> int
    return `${this.name}(${this.args.map(arg => arg.prettyPrint()).join(', ')}) -> ${this.returns.prettyPrint()}`
  }
}

// A cast is just a special operator that converts one type to another
export class MathematicalCast extends OperatorDefinition {
  constructor (params) {
    if (!params.src || !params.dst) throw new Error("No source or destination types provided")

    params.args = [ params.src ]
    params.returns = params.dst

    super(params)

    this.name = this.name ?? this.returns.toHashStr()
  }

  srcType () {
    return this.args[0]
  }

  dstType () {
    return this.returns
  }
}

// Maps from src hash to map from dst hash to cast
const BUILTIN_MATHEMATICAL_CASTS = new Map()

/**
 * Register a mathematical cast from src to dst
 * @param cast
 */
export function registerMathematicalCast (cast) {
  const CASTS = BUILTIN_MATHEMATICAL_CASTS

  let srcType = cast.srcType().toHashStr()
  let dstType = cast.dstType().toHashStr()

  if (!CASTS.has(srcType))
    CASTS.set(srcType, new Map())
  let srcCasts = CASTS.get(srcType)

  srcCasts.set(dstType, cast)
  return cast
}

/**
 * Get cast from src to dst. Returns "null" if the cast doesn't exist, "identity" if the types are the same, and a
 * corresponding MathematicalCast if there is a match
 * @param srcType
 * @param dstType
 */
export function getMathematicalCast (srcType, dstType) {
  if (!(srcType instanceof MathematicalType) || !(dstType instanceof MathematicalType))
    throw new Error("Invalid source or destination type")

  if (srcType.isSameType(dstType)) return "identity"

  let srcCasts = BUILTIN_MATHEMATICAL_CASTS.get(srcType.toHashStr())
  if (!srcCasts) return null

  return srcCasts.get(dstType.toHashStr()) ?? null
}

export function canMathematicalCast (srcType, dstType) {
  return !!getMathematicalCast(srcType, dstType)
}

window.MC = BUILTIN_MATHEMATICAL_CASTS

export function getMathematicalCasts () {
  let casts = []

  for (let castList of BUILTIN_MATHEMATICAL_CASTS.values()) {
    casts.push(...castList.values())
  }

  return casts
}
