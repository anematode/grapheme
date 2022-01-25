import { ConcreteType, MathematicalType } from './type.js'

/**
 * A context inhabited by functions, variables, and the like. Allows separation from the global scope. A default context
 * contains plenty of builtin types, but user-defined types are technically possible as well--just a pain to implement.
 */
export class EvaluationContext {
  constructor () {

  }

  registerEvaluationMode (mode) {

  }

  getConcreteType (type) {

  }

  /**
   * Register an (abstract) evaluator. Some builtin evaluators are handled specially. For example, you won't be able to
   * override *(real, real), but it's conceivable to override *(fancy_type, int).
   * @param evaluator
   */
  registerEvaluator (evaluator) {

  }

  /**
   * Register a cast between mathematical types.
   * @param cast
   */
  registerMathematicalCast (cast) {

  }
}
