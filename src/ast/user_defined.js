import { NormalDefinition, Operators } from './operators'
import { UserDefinedFunction, UserDefinedVariable } from './function'
import { parseString } from './parse_string'

const Variables = {}
const Functions = {}

const RESERVED_VARIABLES = []
const RESERVED_FUNCTIONS = Object.keys(Operators)

function defineVariable(variableName, node) {
  if (Variables[variableName])
    undefineVariable(variableName)
  if (RESERVED_VARIABLES.includes(variableName))
    throw new Error("The variable " + variableName + " is reserved by Grapheme. Please choose a different name.")

  if (typeof node === 'string')
    node = parseString(node)

  return Variables[variableName] = new UserDefinedVariable(variableName, node)
}

function defineFunction(funcName, node, exportedVariables) {
  if (Functions[funcName])
    undefineFunction(funcName)
  if (RESERVED_FUNCTIONS.includes(funcName))
    throw new Error("The function " + funcName + " is reserved by Grapheme. Please choose a different name.")

  if (typeof node === 'string')
    node = parseString(node)

  if (!exportedVariables)
    exportedVariables = node.getDependencies().vars

  return Functions[funcName] = new UserDefinedFunction(funcName, node, exportedVariables)
}

function undefineVariable(variableName) {
  if (RESERVED_VARIABLES.includes(variableName))
    throw new Error("The variable " + variableName + " is reserved by Grapheme, and cannot be undefined.")
  delete Variables[variableName]
}

function undefineFunction(funcName) {
  if (RESERVED_FUNCTIONS.includes(funcName))
    throw new Error("The function " + funcName + " is reserved by Grapheme, and cannot be undefined.")
  delete Functions[funcName]
}

function getFunction(funcName) {
  return Functions[funcName]
}

function getVariable(varName) {
  return Variables[varName]
}


export { Variables, Functions, defineVariable, defineFunction, undefineVariable, undefineFunction, getFunction, getVariable, RESERVED_VARIABLES, RESERVED_FUNCTIONS }
