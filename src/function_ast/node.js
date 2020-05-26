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
    let variableNames = this.getVariableNames()

    return new Function(...variableNames, "return " + this._getCompileText())
  }

  getVariableNames() {
    let variableNames = []

    this.applyAll(child => {
      if (child instanceof VariableNode) {
        let name = child.name

        if (variableNames.indexOf(name) === -1) {
          variableNames.push(name)
        }
      }
    })

    return variableNames
  }

  _getCompileText() {
    return this.children.map(child => "(" + child._getCompileText() + ")").join('+')
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

  _getCompileText() {
    return this.name
  }

  getText() {
    return this.name
  }
}

const OperatorPatterns = {
  "sin": ["Math.sin", "+"],
  "+": ["", "+"],
  "-": ["", "-"],
  "*": ["", "*"],
  "/": ["", "/"],
  "^": ["", "**"],
  "tan": ["Math.tan"],
  "cos": ["Math.cos"],
  "csc": ["1/Math.sin"],
  "sec": ["1/Math.cos"],
  "cot": ["1/Math.tan"],
  "asin": ["Math.asin"],
  "acos": ["Math.acos"],
  "atan": ["Math.atan"],
  "abs": ["Math.abs"],
  "sqrt": ["Math.sqrt"],
  "cbrt": ["Math.cbrt"]
}

class OperatorNode extends ASTNode {
  constructor(params={}) {
    super()

    const {
      operator = '^'
    } = params

    this.operator = operator
  }

  _getCompileText() {

    let pattern = OperatorPatterns[this.operator]

    if (!pattern)
      throw new Error("Unrecognized operation")

    return pattern[0] + "(" + this.children.map(child => "(" + child._getCompileText() + ")").join(pattern[1] ? pattern[1] : "+") + ")"
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

  _getCompileText() {
    return this.value + ""
  }

  getText() {
    return "" + this.value
  }
}

export {VariableNode, OperatorNode, ConstantNode, ASTNode}
