import { FunctionSignature } from './function_signature'

let nativeFunction = window.Function

class Function {
  constructor (params) {
    this.signature = new FunctionSignature(params.returnType, params.argumentTypes)
    this.argumentNames = params.argumentNames ? params.argumentNames : []
    this.name = params.name
  }

  arity() {
    return this.signature.length
  }

  latex() {

  }

  _getEvaluatorLocation() {
    throw new Error("Grapheme.Function does not implement getEvaluatorLocation")
  }

  _getIntervalEvaluatorLocation() {
    throw new Error("Grapheme.Function does not implement getIntervalEvaluatorLocation")
  }

  _getEvaluator() {
    throw new Error("Grapheme.Function does not implement getEvaluatorLocation")
  }

  _getIntervalEvaluator() {

  }

  getArgumentsAsString() {
    const args = this.signature.args
    const argNames = this.argumentNames
    const namesLen = argNames.length

    return args.map((argType, i) => ((i < namesLen) ? argNames[i] + ': ' : '') + argType.toString()).join(", ")
  }

  toString() {
    return this.name + "(" + this.getArgumentsAsString() + ") -> " + this.signature.returnType
  }
}

class BuiltinFunction extends Function {
  constructor (params) {
    super(params)

    if (!params.evaluator)
      throw new Error("Built-in function must be supplied with an evaluator")

    this._evaluatorLocation = params.evaluator
    this._intervalEvaluatorLocation = params.evaluator
  }


}

export { Function }
