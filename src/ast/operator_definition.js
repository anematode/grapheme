import { toConcreteType } from './builtin_types.js'
import { MathematicalType } from './type.js'

export class OperatorDefinition {
  constructor (params={}) {
    this.name = params.name

    // Arguments
    this.args = (params.args ?? []).map(toConcreteType)

    // Return type (void type if nothing)
    this.returns = (params.returns ?? "void").map(toConcreteType)

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
      return -1;


  }

  prettyPrint() {
    return `${this.name}(${this.args.map(arg => arg.prettyPrint()).join(', ')}) -> ${this.returns.prettyPrint()}`
  }
}

// ^(int, int) -> int

