import { ConstantNode, PI, E } from './node'

/**
 * Space for user defined variables and functions
 */

const RESERVED_FUNCTIONS = []
const RESERVED_VARIABLES = ["pi", "e"]

const Variables = {}
const Functions = {}

function defineVariable(varName, node, force=false) {

}

function undefineVariable(varName, force=false) {

}

function defineFunction(functionName, node, exportedVariables=['x'], force=false) {

}

function undefineFunction(functionName, force=false) {

}

defineVariable('pi', PI)
defineVariable('e', E)

export { Variables, Functions }
