/**
 * This file defines classes UserDefinedFunction and UserDefinedVariable, which represent functions and variables to be
 * defined by the user. They are constructed with a name, a node/string which is the expression, and optionally, a list
 * of exported variables which the function can be evaluated at with f.evaluate(...). The list of exported variables can
 * include type information which will be
 */

import { NormalDefinition } from './operators'

// Convert exportedVariables into a standard form that includes variable name and type information. For example,
// 'x' is converted to [['x', "real"]], ['x', ['y', "complex"]] is converted to [['x', "real"], ['y', "complex"]]
function processExportedVariables(exportedVariables) {
  if (typeof exportedVariables === "string")
    return [[exportedVariables, "real"]]
  for (let i = 0; i < exportedVariables.length; ++i) {
    let pair = exportedVariables[i]

    if (typeof pair === "string") {
      exportedVariables[i] = [pair, "real"]
    }
  }

  return exportedVariables
}

class UserDefinedFunction {
  constructor(name, node, exportedVariables=['x']) {
    this.name = name

    this.node = node

    this.exportedVariables = processExportedVariables(exportedVariables)

    this.definition = null

    this.update()
  }

  getVariableTypesAsDict() {
    let dict = {}

    for (let pair of this.exportedVariables) {
      dict[pair[0]] = pair[1]
    }

    return dict
  }

  getSignature() {
    return this.exportedVariables.map(pair => pair[1])
  }

  getVariables() {
    return this.exportedVariables.map(pair => pair[0])
  }

  update() {
    this.usable = false

    this.node.resolveTypes(this.getVariableTypesAsDict())
    this.evaluate = this.node.compile(this.getVariables())
    this.evaluateInterval = null

    try {
      this.evaluateInterval = this.node.compileInterval(this.getVariables())
    } catch (e) {

    }

    const returnType = this.node.returnType

    if (!returnType)
      throw new Error("Was not able to find a return type for function " + this.name + ".")

    this.definition = new NormalDefinition({
      signature: this.getSignature(),
      returns: returnType,
      evaluate: "Functions." + this.name + '.evaluate',
      evaluateFunc: this.evaluate,
      evaluateInterval: "Functions." + this.name + ".evaluateInterval",
      evaluateIntervalFunc: this.evaluateInterval
    })
    this.returnType = returnType

    this.usable = true
  }
}

class UserDefinedVariable extends UserDefinedFunction {
  constructor(name, node) {
    super(name, node, [])
  }

  update() {
    super.update()

    this.value = this.evaluate()
    this.intervalValue = this.evaluateInterval()
  }
}

export { UserDefinedFunction, UserDefinedVariable }
