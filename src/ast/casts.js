
import { MathematicalType, ConcreteType } from './type.js'
import { OperatorDefinition } from './operator_definition.js'
import { ConcreteEvaluator } from './evaluator.js'

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

// Maps from src hash to map from dst hash to cast
const BUILTIN_MATHEMATICAL_CASTS = new Map()
const BUILTIN_CONCRETE_CASTS = new Map()

/**
 * Register a mathematical cast from src to dst
 * @param cast
 */
export function registerMathematicalCast (cast) {
  const CASTS = BUILTIN_MATHEMATICAL_CASTS

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

/**
 * Register a concrete cast from src to dst
 * @param cast
 */
export function registerConcreteCast (cast) {
  const CASTS = BUILTIN_MATHEMATICAL_CASTS

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

export function getMathematicalCasts () {
  let casts = []
  for (let castList of BUILTIN_MATHEMATICAL_CASTS.values()) {
    casts.push(...castList.values())
  }
  return casts
}

export function getConcreteCasts () {
  let casts = []
  for (let castList of BUILTIN_CONCRETE_CASTS.values()) {
    casts.push(...castList.values())
  }
  return casts
}
