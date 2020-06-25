import { ConstantNode, PI, E } from './node'
import { OperatorList } from './operators'
import * as utils from "../core/utils"

const Variables = {}
const Functions = {}

function variableExists(varName) {
  return !!Variables[varName]
}

function defineVariable(varName, node) {
  
}
