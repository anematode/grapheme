import { toMathematicalType } from './builtin_types.js'
import { MathematicalType } from './type.js'
import { castDistance } from './evaluator.js'
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
