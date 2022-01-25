import { toMathematicalType } from './builtin_types.js'
import { MathematicalType } from './type.js'
import { getMathematicalCast } from './casts.js'

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
    if (!args.every(arg => arg instanceof MathematicalType))
      throw new Error()

    if (this.argCount() !== args.length)
      return -1

    let castsNeeded = 0
    for (let i = 0; i < args.length; ++i) {
      let srcType = args[i]
      let dstType = this.args[i]

      let cast = getMathematicalCast(srcType, dstType)

      if (!cast) return -1
      if (cast !== "identity") {
        castsNeeded++
      }
    }

    return castsNeeded
  }

  prettyPrint() {
    return `${this.name}(${this.args.map(arg => arg.prettyPrint()).join(', ')}) -> ${this.returns.prettyPrint()}`
  }
}

// ^(int, int) -> int

