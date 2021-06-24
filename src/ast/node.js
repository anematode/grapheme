
// const fs = require( ...
// No, this is not node.js the language.

import { Functions, Variables, getVariable } from './user_defined'
import {
  castableInto,
  castableIntoMultiple,
  getCastingFunction,
  Operators,
  retrieveEvaluationFunction
} from './operators'
import { LatexMethods } from './latex'
import { Typecasts } from '../math/typecasts'
import { RealFunctions } from '../math/real/functions.js'
import { RealIntervalFunctions } from '../math/real_interval/functions.js'
import { Vec2 } from '../math/vec'
import { protectVariable } from './js_keyword_variables'

const comparisonOperators = ['<', '>', '<=', '>=', '!=', '==']

function compileFunction(compileText, exportedVariables) {
  const GraphemeSubset = {
    ComplexIntervalFunctions,
    ComplexFunctions,
    RealIntervalFunctions,
    RealFunctions,
    Typecasts,
    RealInterval,
    RealIntervalSet,
    ComplexInterval,
    Vec2,
    Functions,
    Variables
  }

  return new Function("Grapheme", "return function(" + exportedVariables.map(protectVariable).join(',') + ") { return " + compileText + "}")(GraphemeSubset)
}

/**
 * Base class for a node in a Grapheme expression. Has children and a string type (returnType).
 *
 * A node can be one of a variety of types. A plain ASTNode signifies grouping, i.e. parentheses.
 */
class ASTNode {
  /**
   * Construct a new ASTNode from parameters.
   * @param params {Object} parameters
   * @param params.children {Array} Array of node's children.
   * @param params.returnType {string} The type of the node. Unlike math.js and similar libraries, Grapheme's expressions
   * are strictly typed. Each expression/function only returns a single type of variable. Polymorphism is possible,
   * however, in a C++-like fashion.
   */
  constructor (params = {}) {
    const {
      children = [],
      returnType = null
    } = params

    this.children = children
    this.returnType = returnType
  }

  /**
   * Convert the node into a string which can evaluated (in the JS interpreter sense) to get the value of the node.
   * @param exportedVariables {Array} Variables to export to be used in the function
   * @returns {string} The text of the function to evaluate.
   * @private
   */
  _getCompileText(exportedVariables=['x']) {
    return this.children[0]._getCompileText(exportedVariables)
  }

  /**
   * Convert the node into a string which can be evaluated with intervals.
   * @param exportedVariables {Array}
   * @returns {string}
   * @private
   */
  _getIntervalCompileText(exportedVariables=['x']) {
    return this.children[0]._getIntervalCompileText(exportedVariables)
  }

  /**
   * Function setting the value of this.parent for this node and all children. Useful when drawing trees, but shouldn't
   * be called in most contexts.
   * @returns {ASTNode}
   * @private
   */
  _setParents () {
    this.applyAll(child => {
      if (child.children) {
        child.children.forEach(subchild => subchild.parent = child)
      }
    })

    this.parent = null

    return this
  }

  /**
   * Apply a function to this node and all of its children, recursively.
   * @param func {Function} The callback function. We call it each time with (node, depth) as arguments
   * @param childrenFirst {boolean} Whether to call the callback function for each child first, or for the parent first.
   * @param depth {number}
   * @returns {ASTNode}
   */
  applyAll (func, childrenFirst=false, depth = 0) {
    if (!childrenFirst)
      func(this, depth)

    this.children.forEach(child => {
      if (child.applyAll) {
        child.applyAll(func, childrenFirst, depth+1)
      }
    })

    if (childrenFirst)
      func(this, depth)

    return this
  }

  /**
   * Clone this node
   * @returns {ASTNode}
   */
  clone () {
    return new ASTNode({
      children: this.children.map(child => child.clone()),
      returnType: this.returnType
    })
  }

  /**
   * Compile this node into a function to evaluate it directly
   * @param exportedVariables {array}
   * @returns {*}
   */
  compile(exportedVariables=[]) {
    if (!this.returnType)
      throw new Error("The node's type is not known. You need to call resolveTypes before compiling the node.")


    const compileInfo = {
      exportedVariables,

    }

    // Get the text of the function
    const compileText = this._getCompileText(exportedVariables)

    // Compile the function
    return compileFunction(compileText, exportedVariables)
  }

  /**
   * Compile this node into a function to evaluate it intervallicly
   * @param exportedVariables
   * @returns {*}
   */
  compileInterval(exportedVariables=[]) {
    if (!this.returnType)
      throw new Error("Need to call resolveTypes before compiling node.")

    // Check for operators which don't support interval evaluation
    this.applyAll(child => {
      if (child.definition && !child.definition.evaluateInterval)
        throw new Error("Operator " + child.operator + " cannot be evaluated intervallicly. Sorry!")
    })

    // Get the text of the function
    const compileText = this._getIntervalCompileText(exportedVariables)

    // Compile the function
    return compileFunction(compileText, exportedVariables)
  }

  /**
   * Return whether this is deep equal to the given node.
   * @param node
   * @returns {boolean}
   */
  equals(node) {
    // Easy condition
    if (this.returnType !== node.returnType)
      return false

    // Return false if any of the children are not equal
    for (let i = 0; i < this.children.length; ++i) {
      if (!this.children[i].equals(node.children[i]))
        return false
    }

    // Return true otherwise
    return true
  }

  /**
   * Evaluate this node with a given scope, which is an object containing the values of variables and functions. For
   * example, Grapheme.parseString("x^2").evaluate({x: -3}) returns 9. If a variable is not defined in scope and isn't
   * in Grapheme.Variables, it will probably just throw an error or return NaN.
   * @param scope {Object} Description of the variables and functions used by the node.
   * @returns {*}
   */
  evaluate(scope) {
    return this.children[0].evaluate(scope)
  }

  /**
   * Get the operators and variables used by this function, and are thus required for the function to be evaluated
   * correctly. Includes builtin operators.
   * @returns {{funcs: string[], vars: string[]}}
   */
  getDependencies() {
    let ops = new Set()
    let vars = new Set()

    // Accumulate all used variables and operators
    this.applyAll((node) => {
      if (node instanceof OperatorNode) {
        ops.add(node.operator)
      } else if (node instanceof VariableNode) {
        vars.add(node.name)
      }
    })

    ops = Array.from(ops).sort()
    vars = Array.from(vars).sort()

    return {operators: ops, variables: vars}
  }

  /**
   * Convert the node to a simple text representation for drawing in a tree.
   * @returns {string}
   */
  getText () {
    return '(node)'
  }

  /**
   * Convert the node into a simple text representation, including its return type.
   * @returns {string}
   */
  getTreeText() {
    return this.getText() + ' -> ' + this.returnType
  }

  /**
   * Whether this node has children.
   * @returns {boolean}
   */
  hasChildren () {
    return this.children.length !== 0
  }

  /**
   * Whether this node is constant (in that all of its operators are deterministic and all of its nodes are constant or
   * constant variables, i.e. builtin variables such as pi, e, i)
   * @returns {boolean}
   */
  isConstant () {
    return this.children.every(child => child.isConstant())
  }

  /**
   * Convert this node to latex, given options.
   * @param options {Object} Options to be passed onto children.
   * @returns {string}
   */
  latex (options={}) {
    const latex = this.children.map(child => child.latex(options)).join(' ')

    return String.raw`\left(${latex}\right)`
  }

  /**
   * Resolve types, finding operator definitions and return types. parseString(str, false) returns a string whose types
   * have not been resolved; this tries to figure out the types of each child node as well as which definition to use
   * for each operator. For variables and functions, Grapheme.Variables and Grapheme.Functions are referenced to find
   * types and definitions. Given types tells us the
   * @param givenTypes
   * @returns {ASTNode}
   */
  resolveTypes(givenTypes) {
    // Resolve the types of children
    this.children.forEach(child => child.resolveTypes(givenTypes))

    this.returnType = this.children[0].returnType

    return this
  }

  substitute(node, expr) {
    this.applyAll((n) => {
      const children = n.children

      for (let i = 0; i < children.length; ++i) {
        const child = children[i]

        if (child.equals(node)) {
          children[i] = expr.clone()
        }
      }
    }, 0, true)

    return this
  }

  toJSON () {
    return {
      type: 'node',
      children: this.children.map(child => child.toJSON()),
      returnType: this.returnType
    }
  }

  type () {
    return 'node'
  }
}

class VariableNode extends ASTNode {
  constructor (params = {}) {
    super()

    const {
      name = 'x'
    } = params

    this.name = name
  }

  _getCompileText(exportedVariables) {
    if (comparisonOperators.includes(this.name))
      return `"${this.name}"`
    if (exportedVariables.includes(this.name))
      return protectVariable(this.name)
    else
      return (isWorker ? '' : "Grapheme.") + "Variables." + this.name + ".value"
  }

  _getIntervalCompileText (exportedVariables = ['x']) {
    if (comparisonOperators.includes(this.name))
      return `"${this.name}"`
    if (exportedVariables.includes(this.name))
      return protectVariable(this.name)
    else
      return (isWorker ? '' : "Grapheme.") + "Variables." + this.name + ".intervalValue"
  }

  clone () {
    let node = new VariableNode({ name: this.name })

    node.returnType = this.returnType

    return node
  }

  equals(node) {
    return (node instanceof VariableNode) && this.name === node.name && super.equals(node)
  }

  evaluate(scope) {
    const value = scope[this.name]

    if (value !== undefined) {
      return value
    }

    let globalVar = Grapheme.Variables[this.name]

    return globalVar.value
  }

  getText () {
    return this.name
  }

  isConstant () {
    return false
  }

  latex(params) {
    return LatexMethods.getVariableLatex(this.name)
  }

  resolveTypes(typeInfo) {
    if (typeInfo[this.name]) {
      this.returnType = typeInfo[this.name]
      return
    }

    let variable = getVariable(this.name)

    if (variable) {
      if (variable.returnType) {
        this.returnType = variable.returnType
      } else {
        throw new Error("UserDefinedVariable " + this.name + " is defined but has unknown type. Please properly define the variable.")
      }
    } else {
      this.returnType = "real" //throw new Error("Cannot resolve variable " + this.name + ". Please define it.")
    }

  }

  toJSON () {
    return {
      type: 'variable',
      name: this.name,
      returnType: this.returnType
    }
  }

  type () {
    return 'variable'
  }
}

class OperatorNode extends ASTNode {
  constructor (params = {}) {
    super(params)

    const {
      operator = '^'
    } = params

    this.operator = operator
    this.definition = null
  }

  _getCompileText(exportedVariables) {
    if (!this.definition)
      throw new Error("huh")

    const definition = this.definition

    return this.definition.evaluate + "(" + this.children.map((child, index) => {
      let text = child._getCompileText(exportedVariables)

      if (child.returnType !== definition.signature[index]) {
        let func = getCastingFunction(child.returnType, definition.signature[index])

        text = func + '(' + text + ')'
      }

      return text
    }).join(',') + ")"
  }

  _getIntervalCompileText(exportedVariables) {
    if (!this.definition)
      throw new Error("huh")

    const definition = this.definition

    return this.definition.evaluateInterval + "(" + this.children.map((child, index) => {
      let text = child._getIntervalCompileText(exportedVariables)

      if (child.returnType !== definition.signature[index]) {
        let func = getCastingFunction(child.returnType, definition.signature[index])

        text = func + '(' + text + ')'
      }

      return text
    }).join(',') + ")"
  }

  clone () {
    let node = new OperatorNode({ operator: this.operator })

    node.children = this.children.map(child => child.clone())
    node.definition = this.definition
    node.returnType = this.returnType

    return node
  }

  derivative(variable) {
    if (!this.definition.derivative) {
      throw new Error("Cannot take derivative of operator " + this.operator + ".")
    }

    return this.definition.derivative(variable, ...this.children)
  }

  equals(node) {
    return (node instanceof OperatorNode) && (node.definition === this.definition) && super.equals(node)
  }

  evaluate(scope) {
    const children = this.children
    let params = this.children.map(child => child.evaluate(scope))
    const definition = this.definition, sig = definition.signature

    params.forEach((param, i) => {
      if (sig[i] !== children[i].returnType) {
        params[i] = (retrieveEvaluationFunction(getCastingFunction(children[i].returnType, sig[i])))(param)
      }
    })

    return this.definition.evaluateFunc(...params)
  }

  getChildrenSignature() {
    return this.children.map(child => child.returnType)
  }

  getText () {
    return this.operator
  }

  latex (params) {
    return this.definition.latex(this.children, params)
  }

  resolveTypes(typeInfo={}) {
    super.resolveTypes(typeInfo)

    let signature = this.getChildrenSignature()

    if (Functions[this.operator]) {
      let func = Functions[this.operator]

      const funcSig = func.definition.signature

      if (castableIntoMultiple(signature, funcSig)) {
        this.definition = func.definition
        this.returnType = func.returnType
        return
      } else {
        throw new Error("Given signature " + signature + " is not castable into function " + this.operator + ", signature " + funcSig + '.')
      }
    }

    let potentialDefinitions = Operators[this.operator]

    if (!potentialDefinitions) {
      throw new Error("Unknown operation " + this.operator + ".")
    }

    for (let definition of potentialDefinitions) {
      if (definition.signatureWorks(signature)) {
        this.definition = definition.getDefinition(signature)
        this.returnType = definition.returns

        return
      }
    }

    throw new Error("Could not find a suitable definition for " + this.operator + "(" + signature.join(', ') + ').')
  }

  toJSON () {
    return {
      type: 'operator',
      operator: this.operator,
      children: this.children.map(child => child.toJSON())
    }
  }

  type () {
    return 'operator'
  }
}

class ConstantNode extends ASTNode {
  constructor (params = {}) {
    super(params)

    const {
      value = 0,
      text = '',
      invisible = false
    } = params

    this.value = value
    this.text = text ? text : value + ''
    this.invisible = invisible
  }

  _getCompileText(exportedVariables) {
    return this.value
  }

  _getIntervalCompileText() {
    switch (this.returnType) {
      case "bool":
        let int = this.value | 0

        return "new Grapheme.RealInterval(" + int + "," + int + ")"
      case "real":
      case "int":
        return "new Grapheme.RealInterval(" + this.value + "," + this.value + ")"
      case "complex":
          const re = this.value.re
          const im = this.value.im

          return `new Grapheme.ComplexInterval(${re}, ${re}, ${im}, ${im})`
    }
  }

  clone () {
    return new ConstantNode({
      value: this.value,
      invisible: this.invisible,
      text: this.text,
      returnType: this.returnType
    })
  }

  equals(node) {
    return node.value === this.value && super.equals(node)
  }

  evaluate() {
    return this.value
  }

  getText () {
    return this.invisible ? '' : LatexMethods.getConstantLatex(this)
  }

  isConstant () {
    return true
  }

  latex () {
    return this.getText()
  }

  resolveTypes(givenTypes) {
    if (Number.isInteger(this.value))
      this.returnType = "int"
    else this.returnType = "real"
  }

  toJSON () {
    return {
      value: this.value,
      text: this.text,
      invisible: this.invisible,
      returnType: this.returnType,
      type: 'constant'
    }
  }

  type () {
    return 'constant'
  }
}

export {
  VariableNode,
  OperatorNode,
  ConstantNode,
  ASTNode,
  OperatorSynonyms
}
