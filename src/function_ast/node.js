// const fs = require( ...
// No, this is not node.js the language.

class ASTNode {
  constructor() {
    this.parent = null
    this.children = []
  }

  applyAll(func, depth=0) {
    func(this, depth)

    this.children.forEach(child => {
      if (child.applyAll)
        child.applyAll(func, depth + 1)
    })
  }

  getText() {
    return "(node)"
  }

  compile() {

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

  getText() {
    return this.name
  }
}

class OperatorNode extends ASTNode {
  constructor(params={}) {
    super()

    const {
      operator = '^'
    } = params

    this.operator = operator
  }

  getText() {
    return this.operator
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

  getText() {
    return "" + this.value
  }
}

export {VariableNode, OperatorNode, ConstantNode, ASTNode}
