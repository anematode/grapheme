// const fs = require( ...
// No, this is not node.js the language.

class ASTNode {
  constructor() {
    this.parent = null
    this.children = []
  }
}

class VariableNode extends ASTNode {
  constructor(params={}) {
    super()

    const {
      name = 'x'
    } = params

    this.name = name
  }
}

class OperatorNode extends ASTNode {
  constructor(params={}) {
    super()

  }
}

class ConstantNode extends ASTNode {
  constructor(params={}) {
    super()

    const {
      value = 0
    } = params

    this.value = value
  }
}

export {VariableNode, OperatorNode, ConstantNode, ASTNode}
