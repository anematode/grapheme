import { OperatorNode, ConstantNode, ASTNode, VariableNode } from './node'

function nodeFromJSON(topNode) {
  let children = topNode.children ? topNode.children.map(child => nodeFromJSON(child)) : []

  switch (topNode.type) {
    case "operator":
      return new OperatorNode({operator: topNode.operator, children})
    case "variable":
      return new VariableNode({name: topNode.name, children})
    case "node":
      return new ASTNode({children})
    case "constant":
      return new ConstantNode({value: topNode.value, text: topNode.text, invisible: topNode.invisible})
  }
}

export {nodeFromJSON}
