// const fs = require( ...
// No, this is not node.js the language.

import { operator_derivative } from './derivative'
import * as utils from '../core/utils'
import { Real } from '../math/arbitrary_prec'
import { StandardLabelFunction } from '../elements/gridlines'
import { Operators } from './operators'
import { getLatex } from './latex'

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
    floatRepresentabilityTester = new Real(0, 53)
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

  _getCompileText (defineVariable) {
    return this.children.map(child => '(' + child._getCompileText(defineVariable) + ')').join('+')
  }

  _getIntervalCompileText (defineVariable) {
    return this.children.map(child => child._getIntervalCompileText(defineVariable)).join(',')
  }

  _getRealCompileText (defineRealVariable) {
    return this.children.map(child => '(' + child._getRealCompileText(defineRealVariable) + ')').join('+')
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

    let preamble = ''

    const defineVariable = (variable, expression) => {
      preamble += `let ${variable}=${expression};`
    }

    let returnVal = this._getCompileText(defineVariable)

    return {
      func: new Function(...exportedVariables, preamble + 'return ' + returnVal),
      variableNames: exportedVariables
    }
  }

  compileInterval (exportedVariables) {
    if (!exportedVariables) {
      exportedVariables = this.getVariableNames()
    }
    let preamble = ''

    const defineVariable = (variable, expression) => {
      preamble += `let ${variable}=${expression};`
    }

    let returnVal = this._getIntervalCompileText(defineVariable)

    return {
      func: new Function(...exportedVariables, preamble + 'return ' + returnVal),
      variableNames: exportedVariables
    }
  }

  compileReal (exportedVariables, precision = 53) {
    if (!exportedVariables) {
      exportedVariables = this.getVariableNames()
    }

    let Variables = {}
    let preamble = ''

    const defineRealVariable = (name, value, variable) => {
      Variables[name] = new Real(precision)
      if (value) {
        if (value === 'pi') {
          preamble += `${name}.set_pi()`
        } else if (value === 'e') {
          preamble += `${name}.set_e()`
        } else if (isExactlyRepresentableAsFloat(value)) {
          preamble += `${name}.value = ${value.toString()}; `
        } else {
          preamble += `${name}.value = "${value}"; `
        }

      } else {
        preamble += `${name}.value = ${variable};`
      }
    }

    let text = this._getRealCompileText(defineRealVariable)

    let realVarNames = Object.keys(Variables)
    let realVars = realVarNames.map(name => Variables[name])

    let func = new Function(...realVarNames, ...exportedVariables, `${preamble}
      return ${text};`)
    let isValid = true

    return {
      isValid () {
        return isValid
      },
      set_precision: (prec) => {
        if (!isValid) {
          throw new Error('Already freed compiled real function!')
        }
        realVars.forEach(variable => variable.set_precision(prec))
      },
      evaluate: (...args) => {
        if (!isValid) {
          throw new Error('Already freed compiled real function!')
        }
        return func(...realVars, ...args)
      },
      variableNames: exportedVariables,
      free () {
        if (!isValid) {
          throw new Error('Already freed compiled real function!')
        }
        isValid = false

        realVars.forEach(variable => variable.__destroy__())
      },
      _get_func () {
        if (!isValid) {
          throw new Error('Already freed compiled real function!')
        }
        return func
      }
    }
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

  _getCompileText (defineVariable) {
    if (comparisonOperators.includes(this.name)) {
      return '"' + this.name + '"'
    }
    return this.name
  }

  _getIntervalCompileText (defineVariable) {
    if (comparisonOperators.includes(this.name)) {
      return '"' + this.name + '"'
    }
    return this.name
  }

  _getRealCompileText (defineRealVariable) {
    if (comparisonOperators.includes(this.name)) {
      return `'${this.name}'`
    }
    let var_name = '$' + utils.getRenderID()

    defineRealVariable(var_name, null, this.name)

    return var_name
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

const OperatorPatterns = {
  'sin': ['Math.sin'],
  '+': ['', '+'],
  '-': ['', '-'],
  '*': ['', '*'],
  '/': ['', '/'],
  '^': ['', '**'],
  '<': ['', '<'],
  '<=': ['', '<='],
  '>': ['', '>'],
  '>=': ['', '>='],
  '==': ['', '==='],
  '!=': ['', '!=='],
  'tan': ['Math.tan'],
  'cos': ['Math.cos'],
  'csc': ['1/Math.sin'],
  'sec': ['1/Math.cos'],
  'cot': ['1/Math.tan'],
  'asin': ['Math.asin'],
  'acos': ['Math.acos'],
  'atan': ['Math.atan'],
  'abs': ['Math.abs'],
  'sqrt': ['Math.sqrt'],
  'cbrt': ['Math.cbrt'],
  'ln': ['Math.log'],
  'log': ['Math.log'],
  'log10': ['Math.log10'],
  'log2': ['Math.log2'],
  'sinh': ['Math.sinh'],
  'cosh': ['Math.cosh'],
  'tanh': ['Math.tanh'],
  'csch': ['1/Math.sinh'],
  'sech': ['1/Math.cosh'],
  'coth': ['1/Math.tanh'],
  'asinh': ['Math.asinh'],
  'acosh': ['Math.acosh'],
  'atanh': ['Math.atanh'],
  'asec': ['Math.acos(1/', '+', ')'],
  'acsc': ['Math.asin(1/', '+', ')'],
  'acot': ['Grapheme.Functions.Arccot', ','],
  'acsch': ['Math.asinh(1/', '+', ')'],
  'asech': ['Math.acosh(1/', '+', ')'],
  'acoth': ['Math.atanh(1/', '+', ')'],
  'logb': ['Grapheme.Functions.LogB', ','],
  'gamma': ['Grapheme.Functions.Gamma', ','],
  'factorial': ['Grapheme.Functions.Factorial', ','],
  'ln_gamma': ['Grapheme.Functions.LnGamma', ','],
  'digamma': ['Grapheme.Functions.Digamma', ','],
  'trigamma': ['Grapheme.Functions.Trigamma', ','],
  'polygamma': ['Grapheme.Functions.Polygamma', ','],
  'pow_rational': ['Grapheme.Functions.PowRational', ','],
  'max': ['Math.max', ','],
  'min': ['Math.min', ','],
  'floor': ['Math.floor', ','],
  'ceil': ['Math.ceil', ',']
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

const OperatorNames = {
  'asin': '\\operatorname{sin}^{-1}',
  'acos': '\\operatorname{cos}^{-1}',
  'atan': '\\operatorname{tan}^{-1}',
  'asec': '\\operatorname{sec}^{-1}',
  'acsc': '\\operatorname{csc}^{-1}',
  'acot': '\\operatorname{cot}^{-1}',
  'asinh': '\\operatorname{sinh}^{-1}',
  'acosh': '\\operatorname{cosh}^{-1}',
  'atanh': '\\operatorname{tanh}^{-1}',
  'asech': '\\operatorname{sech}^{-1}',
  'acsch': '\\operatorname{csch}^{-1}',
  'acoth': '\\operatorname{coth}^{-1}',
  'gamma': '\\Gamma',
  'digamma': '\\psi',
  'trigamma': '\\psi_1',
  'ln_gamma': '\\operatorname{ln} \\Gamma',
  'log10': '\\operatorname{log}_{10}',
  'log2': '\\operatorname{log}_{2}'
}

let canNotParenthesize = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sec', 'csc', 'cot', 'asec', 'acsc', 'acot', 'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh', 'sech', 'csch', 'coth', 'asech', 'acsch', 'acoth']

function getOperatorName (op) {
  let special = OperatorNames[op]
  if (special) {
    return special
  }

  return '\\operatorname{' + op + '}'
}

function alwaysParenthesize (op) {
  return !(canNotParenthesize.includes(op))
}

class OperatorNode extends ASTNode {
  constructor (params = {}) {
    super(params)

    const {
      operator = '^'
    } = params

    this.operator = operator
  }

  _getCompileText (defineVariable) {

    switch (this.operator) {
      case 'cchain':
        let components = this.children
        let ids = []
        for (let i = 0; i < components.length; i += 2) {
          let variableId = '$' + utils.getRenderID()

          defineVariable(variableId, components[i]._getCompileText(defineVariable))

          ids.push(variableId)
        }

        let comparisons = []

        for (let i = 1; i < components.length; i += 2) {
          let comparison = components[i]
          let lhs = ids[(i - 1) / 2]
          let rhs = ids[(i + 1) / 2]

          // comparisons in cchains are variables
          comparisons.push('(' + lhs + comparison.name + rhs + ')')
        }

        return comparisons.join('&&')
      case 'ifelse':
        const res = this.children.map(child => child._getCompileText(defineVariable))

        return `((${res[1]})?(${res[0]}):(${res[2]}))`
      case 'piecewise':
        if (this.children.length === 0) {
          return '(0)'
        }

        if (this.children.length === 1) {
          return this.children[0]._getCompileText(defineVariable)
        }

        if (this.children.length === 3) {
          return new OperatorNode({
            operator: 'ifelse',
            children: [this.children[1], this.children[0], this.children[2]]
          })._getCompileText(defineVariable)
        } else if (this.children.length === 2) {
          return new OperatorNode({
            operator: 'ifelse',
            children: [this.children[1], this.children[0], new ConstantNode({ value: 0 })]
          })._getCompileText(defineVariable)
        } else {
          let remainder = new OperatorNode({
            operator: 'piecewise',
            children: this.children.slice(2)
          })._getCompileText(defineVariable)

          let condition = this.children[0]._getCompileText(defineVariable)
          let value = this.children[1]._getCompileText(defineVariable)

          return `((${condition})?(${value}):(${remainder}))`
        }
      case 'and':
        return this.children.map(child => child._getCompileText(defineVariable)).join('&&')
      case 'or':
        return this.children.map(child => child._getCompileText(defineVariable)).join('||')
    }

    let pattern = OperatorPatterns[this.operator]

    if (!pattern) {
      throw new Error('Unrecognized operation')
    }

    return pattern[0] + '(' + this.children.map(child => '(' + child._getCompileText(defineVariable) + ')').join(pattern[1] ? pattern[1] : '+') + ')' + (pattern[2] ? pattern[2] : '')
  }

  _getIntervalCompileText (defineVariable) {
    const children_text = this.children.map(child => child._getIntervalCompileText(defineVariable)).join(',')

    return `Grapheme.Intervals['${this.operator}'](${children_text})`
  }

  _getRealCompileText (defineRealVariable) {
    let children = this.children
    if (this.operator === 'piecewise') {
      if (children.length % 2 === 0) {
        // add default value of 0
        children = children.slice()
        children.push(new ConstantNode({
          value: 0,
          text: '0'
        }))
      }
    }

    if (this.operator === 'ifelse') {
      if (children.length === 2) {
        // add default value of 0
        children.push(new ConstantNode({
          value: 0,
          text: '0'
        }))
        return
      }
    }

    const children_text = children.map(child => child._getRealCompileText(defineRealVariable)).join(',')

    return `Grapheme.REAL_FUNCTIONS['${this.operator}'](${children_text})`
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

  _getCompileText (defineVariable) {
    return this.value + ''
  }

  _getIntervalCompileText (defineVariable) {
    let varName = '$' + utils.getRenderID()
    if (isNaN(this.value)) {
      defineVariable(varName, `new Grapheme.Interval(NaN, NaN, false, false, true, true)`)
      return varName
    }

    defineVariable(varName, `new Grapheme.Interval(${this.value}, ${this.value}, true, true, true, true)`)
    return varName
  }

  _getRealCompileText (defineRealVariable) {
    let var_name = '$' + utils.getRenderID()
    defineRealVariable(var_name, this.text)
    return var_name
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

  return false

  /*if (!floatRepresentabilityTester)
    floatRepresentabilityTester = new Real(0, 53)

  floatRepresentabilityTester.value = power

  floatRepresentabilityTester.subtract_float(1)

  floatRepresentabilityTester.set_precision(106)

  floatRepresentabilityTester.add_float(1)

  return floatRepresentabilityTester.value.replace(trailingZeroes, '').replace(matchIntegralComponent, '') ===
    power.replace(matchIntegralComponent, '');*/
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
