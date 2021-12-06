/**
 * In this file we define the abstract syntax tree, including the base ASTNode and the specialized ConstantNode,
 * VariableNode, and OperatorNode.
 */

/**
 * Helper function
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
     * Type of the node (int, complex, etc.). Null if not resolved
     */
    this.type = params.type ?? null
  }

  toString () {
    return `[object ${getNodeType()}]`
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

export class ConstantNode extends ASTNode {
  constructor (params={}) {
    super(params)

    if (params.value === undefined)
      throw new Error("ConstantNode must be initialized with a value")

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

export class OperatorNode extends ASTNode {
  constructor (params={}) {
    super(params)

    this.name = params.name
    if (!this.name || typeof this.name !== "string")
      throw new Error("Operator name must be a string")

    // Arguments to the operator
    this.children = params.children ?? []
  }

  getNodeType () {
    return 3
  }

  clone () {
    return new OperatorNode(this)
  }
}
