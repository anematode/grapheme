
// const fs = require( ...
// No, this is not node.js the language.

import * as utils from '../core/utils'
import { StandardLabelFunction } from '../elements/gridlines'
import { Functions, getVariable } from './user_defined'
import { castableInto, castableIntoMultiple, getCastingFunction, Operators } from './operators'
import { isWorker } from '../core/utils'

// List of operators (currently)
// +, -, *, /, ^,

const comparisonOperators = ['<', '>', '<=', '>=', '!=', '==']

class ASTNode {
  constructor (params = {}) {
    const {
      parent = null,
      children = [],
      returnType = null
    } = params

    this.children = children
    this.parent = parent
    this.returnType = returnType
  }

  _getCompileText(exportedVariables=['x']) {
    return this.children[0]._getCompileText(exportedVariables)
  }

  applyAll (func, depth = 0, childrenFirst=false) {
    if (!childrenFirst)
      func(this, depth)

    this.children.forEach(child => {
      if (child.applyAll) {
        child.applyAll(func, depth + 1, childrenFirst)
      }
    })

    if (childrenFirst)
      func(this, depth)
  }

  compile(exportedVariables) {
    if (!this.returnType) {
      throw new Error("Need to call resolveTypes before compiling node.")
    }

    let compileText = this._getCompileText(exportedVariables)

    return new Function(...exportedVariables, "return " + compileText)
  }

  compileInterval(exportedVariables) {
    if (!this.returnType) {
      throw new Error("Need to call resolveTypes before compiling node.")
    }

    this.applyAll(child => {
      if (child.definition && !child.definition.evaluateInterval) {
        throw new Error("Operator " + child.operator + " cannot be evaluated intervallicly.")
      }
    })

    let compileText = this._getIntervalCompileText(exportedVariables)

    return new Function(...exportedVariables, "return " + compileText)
  }

  derivative(variable) {
    return this.children[0].derivative(variable)
  }

  clone () {
    return new ASTNode({
      children: this.children.map(child => child.clone()),
      returnType: this.returnType
    })
  }

  getDependencies() {
    let varDependencies = new Set()
    let funcDependencies = new Set()

    this.applyAll(child => {
      if (child instanceof VariableNode) {
        varDependencies.add(child.name)
      } else if (child instanceof OperatorNode) {
        funcDependencies.add()
      }
    })
  }

  getText () {
    return '(node)'
  }

  hasChildren () {
    return this.children.length !== 0
  }

  isConstant () {
    return this.children.every(child => child.isConstant())
  }

  latex (parens = true) {
    let latex = this.children.map(child => child.latex()).join('')

    if (parens) {
      return String.raw`\left(${latex}\right)`
    }

    return latex
  }

  needsParentheses () {
    return !(this.children.length <= 1 && (!this.children[0] || !this.children[0].hasChildren()))
  }

  resolveTypes(givenTypes) {
    this.children.forEach(child => child.resolveTypes(givenTypes))

    this.returnType = this.children[0].returnType
  }

  setParents () {
    this.applyAll(child => {
      if (child.children) {
        child.children.forEach(subchild => subchild.parent = child)
      }
    })
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

const greek = ['alpha', 'beta', 'gamma', 'Gamma', 'delta', 'Delta', 'epsilon', 'zeta', 'eta', 'theta', 'Theta', 'iota', 'kappa', 'lambda', 'Lambda', 'mu', 'nu', 'xi', 'Xi', 'pi', 'Pi', 'rho', 'Rho', 'sigma', 'Sigma', 'tau', 'phi', 'Phi', 'chi', 'psi', 'Psi', 'omega', 'Omega']

function substituteGreekLetters (string) {
  if (greek.includes(string)) {
    return '\\' + string
  }

  return string
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
      return this.name
    else
      return (isWorker ? '' : "Grapheme.") + "Variables." + this.name + ".value"
  }

  clone () {
    return new VariableNode({ name: this.name })
  }

  derivative(variable) {
    if (this.name === variable)
      return new ConstantNode({value: 1})
    else
      return new ConstantNode({value: 0})
  }

  getText () {
    return this.name
  }

  isConstant () {
    return false
  }

  latex () {
    if (comparisonOperators.includes(this.name)) {
      switch (this.name) {
        case '>':
        case '<':
          return this.name
        case '>=':
          return '\\geq '
        case '<=':
          return '\\leq '
        case '==':
          return '='
        case '!=':
          return '\\neq '
      }
    }

    return substituteGreekLetters(this.name)
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
      throw new Error("Cannot resolve variable " + this.name + ". Please define it.")
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

const OperatorSynonyms = {
  'arcsinh': 'asinh',
  'arsinh': 'asinh',
  'arccosh': 'acosh',
  'arcosh': 'acosh',
  'arctanh': 'atanh',
  'artanh': 'atanh',
  'arcsech': 'asech',
  'arccsch': 'acsch',
  'arccoth': 'acoth',
  'arsech': 'asech',
  'arcsch': 'acsch',
  'arcoth': 'acoth',
  'arcsin': 'asin',
  'arsin': 'asin',
  'arccos': 'acos',
  'arcos': 'acos',
  'arctan': 'atan',
  'artan': 'atan',
  'arcsec': 'asec',
  'arccsc': 'acsc',
  'arccot': 'acot',
  'arsec': 'asec',
  'arcsc': 'acsc',
  'arcot': 'acot',
  'log': 'ln'
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

  clone () {
    let node = new OperatorNode({ operator: this.operator })

    node.children = this.children.map(child => child.clone())

    return node
  }

  derivative(variable) {
    if (!this.definition.derivative) {
      throw new Error("Cannot take derivative of operator " + this.operator + ".")
    }

    return this.definition.derivative(variable, ...this.children)
  }

  getText () {
    return this.operator
  }

  latex () {
    return getLatex(this)
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

  getChildrenSignature() {
    return this.children.map(child => child.returnType)
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
    super()

    const {
      value = 0,
      text = '',
      invisible = false
    } = params

    this.value = value
    this.text = text ? text : StandardLabelFunction(value)
    this.invisible = invisible
  }

  _getCompileText(exportedVariables) {
    return this.value
  }

  clone () {
    return new ConstantNode({
      value: this.value,
      invisible: this.invisible,
      text: this.text,
      returnType: this.returnType
    })
  }

  getText () {
    return this.invisible ? '' : this.text
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