/**
 * In this file we define the abstract syntax tree, including the base ASTNode and the specialized ConstantNode,
 * VariableNode, and OperatorNode.
 */

/**
 * Helper function (doesn't need to be fast)
 * @param node {ASTNode}
 * @param name {string}
 * @param keys {Array<string>} Keys to look for
 * @param params {{}}
 * @returns {string}
 */
function prettyPrintNode(node, name, keys, params) {
  let out = []

  for (let key of keys) {
    let value = node[key]

    if (value != null) {
      if (key === "children") // Get children, pretty printed
        value = "List{" + value.map(node => node.prettyPrint(params)).join(", ") + "}"
      if (key === "name") // surround with quotes
        value = `"${value}"`

      out += `${key}=${value}`
    }
  }

  return name + "{" + out.join(", ") + "}"
}

const KNOWN_KEYS = ["type", "value", "name", "children"]

export class ASTNode {
  constructor (params={}) {
    /**
     * MathematicalType of the node (int, complex, etc.). Null if not resolved
     */
    this.type = params.type ?? null

    /**
     * EvaluationContext
     * @type {*|null}
     */
    this.ctx = params.ctx ?? null

    /**
     * Other info about the node (for example, where it was in a parsed string)
     * @type {{}}
     */
    this.info = params.info ?? {}
  }

  toString () {
    return `[object ${this.getNodeTypeAsString()}]`
  }

  getNodeType () {
    return 0
  }

  /**
   * Get the node type as a string instead of an enum
   * @returns {string}
   */
  getNodeTypeAsString () {
    switch (this.getNodeType()) {
      case 0: return "ASTNode"
      case 1: return "ConstantNode"
      case 2: return "VariableNode"
      case 3: return "OperatorNode"
      case 4: return "ASTGroup"
    }

    return "UnknownNode"
  }

  /**
   * For debug use only. Example: OperatorNode{type=int, name="+", children=List{ConstantNode{type=int, value="3"}, VariableNode{type=int, name="x"}}}
   */
  prettyPrint (params={}) {
    return prettyPrintNode(this, this.getNodeTypeAsString(), KNOWN_KEYS, params)
  }

  // Enum of node types
  static TYPES = Object.freeze({
    ASTNode: 0,
    ConstantNode: 1,
    VariableNode: 2,
    OperatorNode: 3
  })

  clone () {
    return new ASTNode(this)
  }
}

// Node with children
export class ASTGroup extends ASTNode {
  /**
   * Apply a function to this node and all of its children, recursively.
   * @param func {Function} The callback function. We call it each time with (node, depth) as arguments
   * @param onlyGroups {boolean} Only call the callback on groups
   * @param childrenFirst {boolean} Whether to call the callback function for each child first, or for the parent first.
   * @param depth {number}
   * @returns {ASTNode}
   */
  applyAll (func, onlyGroups = false, childrenFirst = false, depth = 0) {
    if (!childrenFirst) func(this, depth)

    let children = this.children
    for (let i = 0; i < children.length; ++i) {
      let child = children[i]
      if (child instanceof ASTNode) {
        child.applyAll(func, onlyGroups, childrenFirst, depth + 1)
      }
    }

    if (childrenFirst) func(this, depth)

    return this
  }

  getNodeType () {
    return 4
  }

  clone () {
    return new ASTGroup(this)
  }
}

export class ConstantNode extends ASTNode {
  constructor (params={}) {
    super(params)

    // Generally a text rendition of the constant node; e.g., "0.3" or "50"
    this.value = params.value
  }

  getNodeType () {
    return 1
  }

  clone () {
    return new ConstantNode(this)
  }
}

export class VariableNode extends ASTNode {
  constructor (params={}) {
    super(params)

    this.name = params.name
    if (!this.name || typeof this.name !== "string")
      throw new Error("Variable name must be a string")
  }

  getNodeType () {
    return 2
  }

  clone() {
    return new VariableNode(this)
  }
}

export class OperatorNode extends ASTGroup {
  constructor (params={}) {
    super(params)

    this.name = params.name
    if (!this.name || typeof this.name !== "string")
      throw new Error("Operator name must be a string")

    // Arguments to the operator
    this.children = params.children ?? []

    // Extra arguments that have an effect on the operator's mathematical meaning, but which are unwieldy to represent
    // directly as an argment. Current use: comparison chain, where the arguments are the comparisons to be done and
    // extraArgs.comparisons is, say, [ '<', '<=' ]
    this.extraArgs = params.extraArgs ?? {}
  }

  getNodeType () {
    return 3
  }

  clone () {
    return new OperatorNode(this)
  }
}
