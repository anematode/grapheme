import Operators from './operator_definitions'
import { parseString } from './parse_string'

const Variables = {}
const Functions = {}

const RESERVED_VARIABLES = []
const RESERVED_FUNCTIONS = Object.keys(Operators)

class UserDefinedBase {
  constructor(params={}) {
    this.node = params.node
    this.name = params.name

    this.type = null

    this.usable = false
    this.canTakeDerivative = false
    this.canEvaluateInterval = false

    this.varDependencies = []
    this.funcDependencies = []

    let deps = this.node.getDependencies()

    this.unusableBecause = ""
  }

  checkDependencies() {
    for (let i = 0; i < varDependencies.length; ++i) {

    }
  }

  update() {
    this.usable = false


    this.usable = true
  }

  onUsableChanged(callback) {

  }
}

class UserDefinedVariable extends UserDefinedBase {

}

class UserDefinedFunction extends UserDefinedBase {
  constructor(params={}) {
    super(params)
  }
}

function defineVariable(variableName, node) {
  if (Variables[variableName])
    throw new Error("There is already a variable named " + variableName + ". Remove that definition or choose a different name.")
  if (RESERVED_VARIABLES.includes(variableName))
    throw new Error("The variable " + variableName + " is reserved by Grapheme. Please choose a different name.")

  if (typeof node === 'string')
    node = parseString(node)

  return Variables[variableName] = new UserDefinedVariable({name: variableName, node})
}

function defineFunction(funcName, node, exportedVariables={'x': "real"}) {
  if (Functions[funcName])
    throw new Error("There is already a function named " + funcName + ". Remove that definition or choose a different name.")
  if (RESERVED_FUNCTIONS.includes(funcName))
    throw new Error("The function " + funcName + " is reserved by Grapheme. Please choose a different name.")

  if (typeof node === 'string')
    node = parseString(node)

  return Functions[funcName] = new UserDefinedFunction({name: funcName, node})
}

function undefineVariable(variableName) {
  if (RESERVED_VARIABLES.includes(variableName))
    throw new Error("The variable " + variableName + " is reserved by Grapheme, and cannot be undefined.")
  delete Variables[variableName]
}

function undefineFunction(funcName) {
  if (RESERVED_FUNCTIONS.includes(variableName))
    throw new Error("The function " + funcName + " is reserved by Grapheme, and cannot be undefined.")
  delete Functions[funcName]
}

function getFunction(funcName) {
  return Functions[funcName]
}

function getVariable(varName) {
  return Variables[varName]
}

defineVariable('i', parseString("complex(0, 1)"))
defineVariable('pi', parseString("3.141592653589793238"))
defineVariable('e', parseString("2.71828182845904523536"))

RESERVED_VARIABLES.push('i', 'x', 'y', 'z', 'pi', 'e')


export { Variables, Functions, defineVariable, defineFunction, undefineVariable, undefineFunction, getFunction, getVariable }
