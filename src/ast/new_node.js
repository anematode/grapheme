import {castableIntoMultiple, getCastingFunction, Operators, retrieveEvaluationFunction} from "./operators.js"
import {getCast} from "./new_operator.js"
import {resolveOperator} from "./new_operators.js"

class EvaluationError extends Error {
  constructor(message) {
    super(message)

    this.name = "EvaluationError"
  }
}

/**
 * Abstract base class for AST nodes
 */
export class ASTNode {
  applyAll (func, onlyGroups=true, childrenFirst=false, depth=0) {
    if (!onlyGroups)
      func(this, depth)
  }

  nodeType () {
    return "node"
  }

  usedVariables () {
    // Map var -> type
    let types = new Map()

    this.applyAll(node => {
      if (node.nodeType() === "var") {
        if (!types.has(node.name))
          types.set(node.name, node.type)
      }
    })

    return types
  }
}

/**
 * Base class for a node in a Grapheme expression. Has children and a string type (returnType).
 *
 * A node can be one of a variety of types. A plain ASTNode signifies grouping, i.e. parentheses. Extended ASTNodes,
 * like constant nodes and operator nodes have more complexity.
 */
export class ASTGroup extends ASTNode {
  /**
   * A relatively simple base constructor, taking in only the children and the return type, which is "any" by default.
   * @param children {Array}
   * @param type {string}
   */
  constructor (children=[], type=null) {
    super()

    /**
     * Children of this node, which should also be ASTNodes
     * @type {Array}
     */
    this.children = children

    /**
     * Type of this ASTNode (real, complex, etc.)
     * @type {string}
     */
    this.type = type
  }

  /**
   * Apply a function to this node and all of its children, recursively.
   * @param func {Function} The callback function. We call it each time with (node, depth) as arguments
   * @param onlyGroups
   * @param childrenFirst {boolean} Whether to call the callback function for each child first, or for the parent first.
   * @param depth {number}
   * @returns {ASTNode}
   */
  applyAll (func, onlyGroups=false, childrenFirst=false, depth=0) {
    if (!childrenFirst)
      func(this, depth)

    let children = this.children
    for (let i = 0; i < children.length; ++i) {
      let child = children[i]
      if (child instanceof ASTNode) {
        child.applyAll(func, onlyGroups, childrenFirst, depth + 1)
      }
    }

    if (childrenFirst)
      func(this, depth)

    return this
  }

  /**
   * Evaluate the value of this node using a given scope, which gives the evaluation parameters (values of the
   * variables) among other things
   * @param scope {{}}
   * @returns {*}
   */
  evaluate (scope) {
    return this.children[0].evaluate(scope)
  }

  /**
   * Given the types of variables, construct function definitions, et cetera
   * @param typeInfo
   */
  resolveTypes (typeInfo) {
    this.children.forEach(child => child.resolveTypes(typeInfo))

    this.type = this.children[0].type
  }

  nodeType () {
    return "group"
  }
}

export class VariableNode extends ASTNode {
  constructor (name, type=null) {
    super()

    this.name = name
    this.type = type
  }

  evaluate (scope) {
    let val = scope.variables[this.name]
    if (!val)
      throw new EvaluationError(`Variable ${this.name} was not found in the scope`)

    return val
  }

  resolveTypes (typeInfo) {
    let type = typeInfo[this.name]

    this.type = type ?? "real"
  }

  nodeType () {
    return "var"
  }
}

export class OperatorNode extends ASTGroup {
  constructor (operator) {
    super()

    this.op = operator
    this.definition = null // One of the definitions in operators.js is actually going to be used to evaluate the node
  }

  getChildrenSignature() {
    return this.children.map(child => child.type)
  }

  evaluate (scope) {
    if (!this.definition)
      throw new EvaluationError(`Evaluation definition not generated for operator node`)

    const children = this.children
    let params = this.children.map(child => child.evaluate(scope))
    const definition = this.definition, sig = definition.signature

    // Cast arguments appropriately
    params.forEach((param, i) => {
      let dstType = sig[i]
      let srcType = children[i].type

      if (dstType !== srcType)
        params[i] = getCast(srcType, dstType)(param)
    })

    return definition.evaluators.generic.f.apply(null, params)
  }

  resolveTypes (typeInfo={}) {
    // We need to find the function definition that matches
    this.children.forEach(child => child.resolveTypes(typeInfo))

    let signature = this.getChildrenSignature()
    let definition = resolveOperator(this.op, signature)

    if (!definition)
      throw new Error("Could not find a suitable definition for operator " + this.op + "(" + signature.join(', ') + ').')

    this.definition = definition
    this.type = definition.returnType

    return this
  }

  nodeType () {
    return "op"
  }
}

export class ConstantNode extends ASTNode {
  constructor (value, text, type="real") {
    super()

    this.value = value
    this.text = text
    this.type = type
  }

  evaluate (scope) {
    return this.value
  }

  resolveTypes (typeInfo) {

  }

  nodeType () {
    return "const"
  }
}
