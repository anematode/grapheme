import { Type } from './type'

function processArguments(args) {
  for (let i = 0; i < args.length; ++i) {
    args[i] = Type.toType(args[i])
  }
}

class FunctionArguments extends Array {
  constructor(...args) {
    // Make sure the args are all Types
    processArguments(args)

    super(...args)
  }
}

class FunctionSignature {
  constructor(returnType, args=[]) {
    if (!returnType)
      throw new TypeError("FunctionSignature needs to be supplied a return type")
    if (!args)
      throw new TypeError("FunctionSignature needs to be supplied a list of arguments")

    returnType = Type.toType(returnType)

    if (args instanceof Type) {
      args = [args]
    }

    processArguments(args)

    this.returnType = returnType
    this.args = args
  }
}

export { FunctionSignature }
