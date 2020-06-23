import { OperatorNode, ConstantNode, ASTNode, VariableNode } from './node'

/**
 * Convert a JSONified node into a node that we can use. This works recursively
 * @param json The JSON to convert
 * @returns {ConstantNode|VariableNode|ASTNode|OperatorNode} The corresponding ASTNode
 */
function nodeFromJSON(json) {
  // Children of the node
  let children = json.children ? json.children.map(child => nodeFromJSON(child)) : []

  // Return corresponding node type
  switch (json.type) {
    case "operator":
      return new OperatorNode({operator: json.operator, children})
    case "variable":
      return new VariableNode({name: json.name, children})
    case "node":
      return new ASTNode({children})
    case "constant":
      return new ConstantNode({value: json.value, text: json.text, invisible: json.invisible})
  }
}

export {nodeFromJSON}
