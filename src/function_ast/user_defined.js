import { ConstantNode, PI, E } from './node'
import { OperatorList } from './operators'
import * as utils from "../core/utils"

const RESERVED_VARIABLE_NAMES = ['x', 'y', 'z', 't', 'i']
const RESERVED_FUNCTION_NAMES = [...OperatorList]

const Variables = {}
const Functions = {}

class DefinedBase {
  constructor(node) {
    this.node = node
    this.wellDefined = false

    this.dependencies = {}
    this.compiled = {}
  }

  throwUndefined() {
    if (!this.wellDefined)
      throw new Error("The function/variable is not well defined. Issue: " + this.error)
  }

  getValue() {
     this.throwUndefined()
  }

  getNormalFunc() {
    this.throwUndefined()
  }

  getIntervalFunc() {
    this.throwUndefined()

  }

  getRealFunc() {
    this.throwUndefined()

  }

  getComplexFunc() {
    this.throwUndefined()

  }
}

class DefinedFunction {
  constructor(name, node, exportedVariables) {
    if (RESERVED_FUNCTION_NAMES.includes(name))
      throw new Error("The name " + name + " is reserved. Please name your function something else.")

    let dependencies = node.getDependencies()

    for (let variable of exportedVariables.concat(RESERVED_VARIABLE_NAMES)) {
      let index = dependencies.vars.indexOf(variable)

      if (index !== -1) {
        dependencies.vars.splice(index, 1)
      }
    }

    for (let func of RESERVED_FUNCTION_NAMES) {
      let index = dependencies.funcs.indexOf(variable)

      if (index !== -1) {
        dependencies.funcs.splice(index, 1)
      }
    }

    this.dependencies = dependencies

    this.checkWellDefined()
  }



  getValue() {
    throw new Error("Value requested from function.")
  }
}

class DefinedVariable {
  constructor(name) {
    if (RESERVED_VARIABLE_NAMES.includes(name))
      throw new Error("The name " + name + " is reserved. Please name your variable something else.")

  }
}

function variableExists(varName) {
  return !!Variables[varName]
}

function defineVariable(varName, node) {

}

function defineFunction(funcName, node, exportedVariables=['x']) {

}

function getVariable(varName) {

}

function getFunction(funcName) {

}

function undefineVariable(varName) {

}

function undefineFunction(funcName) {

}
