// const fs = require( ...
// No, this is not node.js the language.

import { operator_derivative } from './derivative'
import * as utils from '../core/utils'
import { StandardLabelFunction } from '../elements/gridlines'
import { Operators } from './operators'
import { getLatex } from './latex'
import { compileNode, compileNodeInterval, compileNodeReal } from './compile_node'

// List of operators (currently)
// +, -, *, /, ^,

const comparisonOperators = ['<', '>', '<=', '>=', '!=', '==']

let floatRepresentabilityTester
const matchIntegralComponent = /[0-9]*\./
const trailingZeroes = /0+$/

function isExactlyRepresentableAsFloat (f) {
  if (typeof f === 'number') {
    return true
  }
  if (!floatRepresentabilityTester) {
    floatRepresentabilityTester = new Grapheme.Real(0, 53)
  }
  floatRepresentabilityTester.value = f

  return floatRepresentabilityTester.value.replace(trailingZeroes, '').replace(matchIntegralComponent, '') ===
    f.replace(matchIntegralComponent, '')
}

class ASTNode {
  constructor (params = {}) {

    const {
      parent = null,
      children = []
    } = params

    this.children = children
    this.parent = parent
  }

  getDependencies() {

  }

  _getRealCompileText (defineRealVariable) {
  }

  applyAll (func, depth = 0) {
    func(this, depth)

    this.children.forEach(child => {
      if (child.applyAll) {
        child.applyAll(func, depth + 1)
      }
    })
  }

  clone () {
    let node = new ASTNode()

    node.children = this.children.map(child => child.clone())

    return node
  }

  compile (exportedVariables) {
    if (!exportedVariables) {
      exportedVariables = this.getVariableNames()
    }

    return compileNode(this, exportedVariables)
  }

  compileInterval (exportedVariables) {
    if (!exportedVariables) {
      exportedVariables = this.getVariableNames()
    }

    return compileNodeInterval(this, exportedVariables)
  }

  compileReal (exportedVariables, precision = 53) {
    if (!exportedVariables) {
      exportedVariables = this.getVariableNames()
    }

    return compileNodeReal(this, exportedVariables)
  }

  derivative (variable) {
    let node = new ASTNode()

    node.children = this.children.map(child => child.derivative(variable))

    node.applyAll(child => {
      if (child.children) {
        child.children.forEach(subchild => subchild.parent = child)
      }
    })

    return node
  }

  evaluateConstant () {
    return this.children.map(child => child.evaluateConstant()).reduce((x, y) => x + y, 0)
  }

  getText () {
    return '(node)'
  }

  getVariableNames () {
    let variableNames = []

    this.applyAll(child => {
      if (child instanceof VariableNode) {
        let name = child.name

        if (variableNames.indexOf(name) === -1 && comparisonOperators.indexOf(name) === -1) {
          variableNames.push(name)
        }
      }
    })

    return variableNames
  }

  hasChildren () {
    return this.children.length !== 0
  }

  isConstant () {
    return this.children.every(child => child.isConstant())
  }

  latex (parens = true) {
    let latex = this.children.map(child => child.latex()).join('+')

    if (parens) {
      return String.raw`\left(${latex}\right)`
    }
    return latex
  }

  needsParentheses () {
    return !(this.children.length <= 1 && (!this.children[0] || !this.children[0].hasChildren()))
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
      children: this.children.map(child => child.toJSON())
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

  clone () {
    return new VariableNode({ name: this.name })
  }

  derivative (variable) {
    if (variable === this.name) {
      return new ConstantNode({ value: 1 })
    } else {
      return new ConstantNode({ value: 0 })
    }
  }

  evaluateConstant () {
    return NaN
  }

  getText () {
    return this.name
  }

  isConstant () {
    return false
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

  toJSON () {
    return {
      type: 'variable',
      name: this.name
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
  }

  clone () {
    let node = new OperatorNode({ operator: this.operator })

    node.children = this.children.map(child => child.clone())

    return node
  }

  derivative (variable) {
    return operator_derivative(this, variable)
  }

  evaluateConstant () {
    return Operators[this.operator](...this.children.map(child => child.evaluateConstant()))
  }

  getText () {
    return this.operator
  }

  latex () {
    return getLatex(this)
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

  clone () {
    return new ConstantNode({
      value: this.value,
      invisible: this.invisible,
      text: this.text
    })
  }

  derivative () {
    return new ConstantNode({ value: 0 })
  }

  evaluateConstant () {
    return this.value
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

  toJSON () {
    return {
      value: this.value,
      text: this.text,
      invisible: this.invisible,
      type: 'constant'
    }
  }

  type () {
    return 'constant'
  }
}

function powerExactlyRepresentableAsFloat (power) {
  if (typeof power === 'number') return true

  // todo, make more precise
  if (Number.isInteger(parseFloat(power))) {
    return true
  }
}

const LN2 = new OperatorNode({
  operator: 'ln',
  children: [new ConstantNode({ value: 10 })]
})
const LN10 = new OperatorNode({
  operator: 'ln',
  children: [new ConstantNode({ value: 10 })]
})
const ONE_THIRD = new OperatorNode({
  operator: '/',
  children: [
    new ConstantNode({ value: 1 }),
    new ConstantNode({ value: 3 })
  ]
})

export {
  ONE_THIRD,
  VariableNode,
  OperatorNode,
  ConstantNode,
  ASTNode,
  OperatorSynonyms,
  LN2,
  LN10,
  isExactlyRepresentableAsFloat,
  powerExactlyRepresentableAsFloat
}
