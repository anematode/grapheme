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

function defineFunction(funcName, node, exportedVariables=[["x", "real"]]) {
  if (Functions[funcName])
    undefineFunction(funcName)
  if (RESERVED_FUNCTIONS.includes(funcName))
    throw new Error("The function " + funcName + " is reserved by Grapheme. Please choose a different name.")

  if (typeof node === 'string')
    node = parseString(node)

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

setTimeout(() => {
  defineVariable('i', parseString("complex(0, 1)"))
  defineVariable('pi', parseString("3.141592653589793238"))
  defineVariable('e', parseString("2.71828182845904523536"))
  defineVariable('<', parseString("1"))
  defineVariable('>', parseString("1"))
  defineVariable('<=', parseString("1"))
  defineVariable('>=', parseString("1"))
  defineVariable('!=', parseString("1"))
  defineVariable('==', parseString("1"))

  RESERVED_VARIABLES.push('i', 'x', 'y', 'z', 'pi', 'e')
}, 0)


export { Variables, Functions, defineVariable, defineFunction, undefineVariable, undefineFunction, getFunction, getVariable }
