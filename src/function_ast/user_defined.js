import { ConstantNode, PI, E } from './node'
import { OperatorList } from './operators'
import * as utils from "../core/utils"

const Variables = {}
const Functions = {}

class DefinedVariable {
  constructor() {
    
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
