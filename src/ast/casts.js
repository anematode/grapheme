
import { MathematicalType, ConcreteType } from './type.js'
import { OperatorDefinition } from './operator_definition.js'

// A cast is just a special operator that converts one type to another
export class MathematicalCast extends OperatorDefinition {
  constructor (params) {
    if (!params.src || !params.dst) throw new Error()

    params.args = [ params.src ]
    params.returns = params.dst
    params.name = params.name ?? params.src

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

function canMathematicalCast (srcType, dstType) {
  return !!getMathematicalCast(srcType, dstType)
}

function getConcreteCast (srcType, dstType) {

}
