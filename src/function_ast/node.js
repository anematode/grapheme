// const fs = require( ...
// No, this is not node.js the language.

import * as utils from '../core/utils'
import { StandardLabelFunction } from '../elements/gridlines'

// List of operators (currently)
// +, -, *, /, ^,

const comparisonOperators = ['<', '>', '<=', '>=', '!=', '==']

class ASTNode {
  constructor (params = {}) {

    const {
      parent = null,
      children = []
    } = params

    this.children = children
    this.parent = parent
    this.type = null
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

  clone () {
    let node = new ASTNode()

    node.children = this.children.map(child => child.clone())

    return node
  }

  evaluateConstant () {
    return this.children.map(child => child.evaluateConstant()).reduce((x, y) => x + y, 0)
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

  setParents () {
    this.applyAll(child => {
      if (child.children) {
        child.children.forEach(subchild => subchild.parent = child)
      }
    })
  }

  substitute (replacement, criterion) {
    let substituted = []

    this.applyAll((child) => {
      if (substituted.includes(child)) {
        return
      }

      const children = child.children

      for (let i = 0; i < children.length; ++i) {
        let subchild = children[i]

        let res = criterion(subchild)

        if (res) {
          children[i] = replacement.clone()
          substituted.push(children[i])
        }
      }
    })
  }

  substituteByFunction (substitutionFunc) {
    let substituted = []

    this.applyAll((child) => {
      if (substituted.includes(child)) {
        return
      }

      const children = child.children

      for (let i = 0; i < children.length; ++i) {
        let subchild = children[i]

        let res = substitutionFunc(subchild)

        if (res) {
          children[i] = res
          substituted.push(children[i])
        }
      }
    })
  }

  substituteVariable (variable, replacement) {
    this.substitute(replacement, node => node instanceof VariableNode && node.name === variable)
  }

  substituteVariables (dict) {
    this.substituteByFunction((node) => {
      if (node instanceof VariableNode) {
        let potentialReplacement = dict[node.name]

        if (potentialReplacement) {
          return potentialReplacement
        }
      }

      return false
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

  evaluateConstant () {
    return NaN
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
const PI = new ConstantNode({
  text: 'pi',
  value: Math.PI
})
const E = new ConstantNode({
  text: 'e',
  value: 2.71828182845904523
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
  PI,
  E
}
