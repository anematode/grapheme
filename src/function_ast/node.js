// const fs = require( ...
// No, this is not node.js the language.

import { operator_derivative } from './derivative'
import * as utils from "../core/utils"
import { Real } from '../math/arbitrary_prec'
import { StandardLabelFunction } from '../elements/gridlines'

// List of operators (currently)
// +, -, *, /, ^,

const comparisonOperators = ['<', '>', '<=', '>=', '!=', '==']

let floatRepresentabilityTester

function isExactlyRepresentableAsFloat(f) {
  if (typeof f === "number")
    return true
  if (!floatRepresentabilityTester)
    floatRepresentabilityTester = new Real(0, 53)
  floatRepresentabilityTester.value = f

  let matchIntegralComponent = /[0-9]*\./

  if (floatRepresentabilityTester.value.replace(/0+$/,'').replace(matchIntegralComponent, '') ===
    f.replace(matchIntegralComponent, '')) {
    return true
  }

  return false
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

  isConstant() {
    if (this.children.length === 0)
      return true

    return this.children.every(child => child.isConstant())
  }

  hasChildren() {
    return this.children.length !== 0
  }

  needsParentheses() {
    return !(this.children.length <= 1 && (!this.children[0] || !this.children[0].hasChildren()))
  }

  applyAll (func, depth = 0) {
    func(this, depth)

    this.children.forEach(child => {
      if (child.applyAll) {
        child.applyAll(func, depth + 1)
      }
    })
  }

  latex(parens=true) {
    let latex = this.children.map(child => child.latex()).join('+')

    if (parens)
      return String.raw`\left(${latex}\right)`
    return latex
  }

  getText () {
    return '(node)'
  }

  type() {
    return "node"
  }

  _getIntervalCompileText(defineVariable) {
    return this.children.map(child => child._getIntervalCompileText(defineVariable)).join(',')
  }

  compileReal(precision=53) {
    let variableNames = this.getVariableNames()

    let Variables = {}
    let preamble = ""

    const defineRealVariable = (name, value, variable) => {
      Variables[name] = new Real(precision)
      if (value) {
        if (value === "pi")
          preamble += `${name}.set_pi()`
        else if (value === "e")
          preamble += `${name}.set_e()`
        else if (isExactlyRepresentableAsFloat(value))
          preamble += `${name}.value = ${value.toString()}; `
        else
          preamble += `${name}.value = "${value}"; `

      } else {
        preamble += `${name}.value = ${variable};`
      }
    }

    let text = this._getRealCompileText(defineRealVariable)

    let realVarNames = Object.keys(Variables)
    let realVars = realVarNames.map(name => Variables[name])

    let func = new Function(...realVarNames, ...variableNames, `${preamble}
      return ${text};`)
    let isValid = true

    return {
      isValid() {
        return isValid
      },
      set_precision: (prec) => {
        if (!isValid)
          throw new Error("Already freed compiled real function!")
        realVars.forEach(variable => variable.set_precision(prec))
      },
      evaluate: (...args) => {
        if (!isValid)
          throw new Error("Already freed compiled real function!")
        return func(...realVars, ...args)
      },
      variable_list: variableNames,
      free() {
        if (!isValid)
          throw new Error("Already freed compiled real function!")
        isValid = false

        realVars.forEach(variable => variable.__destroy__())
      },
      _get_func() {
        if (!isValid)
          throw new Error("Already freed compiled real function!")
        return func
      }
    }
  }

  compileInterval() {
    let variableNames = this.getVariableNames()
    let preamble = ""

    const defineVariable = (variable, expression) => {
      preamble += `let ${variable}=${expression};`
    }

    let returnVal = this._getIntervalCompileText(defineVariable)

    return {func: new Function(...variableNames, preamble + 'return ' + returnVal), variableNames}
  }

  compile () {
    let variableNames = this.getVariableNames()

    let preamble = ""

    const defineVariable = (variable, expression) => {
      preamble += `let ${variable}=${expression};`
    }

    let returnVal = this._getCompileText(defineVariable)

    return {func: new Function(...variableNames, preamble + 'return ' + returnVal), variableNames}
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

  _getCompileText (defineVariable) {
    return this.children.map(child => '(' + child._getCompileText(defineVariable) + ')').join('+')
  }

  _getRealCompileText(defineRealVariable) {
    return this.children.map(child => '(' + child._getRealCompileText(defineRealVariable) + ')').join('+')
  }

  clone () {
    let node = new ASTNode()

    node.children = this.children.map(child => child.clone())

    return node
  }
}

const greek = [ "alpha", "beta", "gamma", "Gamma", "delta", "Delta", "epsilon", "zeta", "eta", "theta", "Theta", "iota", "kappa", "lambda", "Lambda", "mu", "nu", "xi", "Xi", "pi", "Pi", "rho", "Rho", "sigma", "Sigma", "tau", "phi", "Phi", "chi", "psi", "Psi", "omega", "Omega" ]

function substituteGreekLetters(string) {
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

  isConstant() {
    return false
  }

  _getCompileText (defineVariable) {
    if (comparisonOperators.includes(this.name))
      return '"' + this.name + '"'
    return this.name
  }

  _getRealCompileText(defineRealVariable) {
    if (comparisonOperators.includes(this.name)) {
      return `'${this.name}'`
    }
    let var_name = '$' + utils.getRenderID()

    defineRealVariable(var_name, null, this.name)

    return var_name
  }

  _getIntervalCompileText(defineVariable) {
    if (comparisonOperators.includes(this.name))
      return '"' + this.name + '"'
    return this.name
  }

  type() {
    return "variable"
  }

  derivative (variable) {
    if (variable === this.name) {
      return new ConstantNode({ value: 1 })
    } else {
      return new ConstantNode({ value: 0 })
    }
  }

  latex() {
    if (comparisonOperators.includes(this.name)) {
      switch (this.name) {
        case ">": case "<":
          return this.name
        case ">=":
          return "\\geq "
        case "<=":
          return "\\leq "
        case "==":
          return "="
        case "!=":
          return "\\neq "
      }
    }

    return substituteGreekLetters(this.name)
  }

  getText () {
    return this.name
  }

  clone () {
    return new VariableNode({ name: this.name })
  }
}

const OperatorPatterns = {
  'sin': ['Math.sin', '+'],
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
  "arcsinh": "asinh",
  "arsinh": "asinh",
  "arccosh": "acosh",
  "arcosh": "acosh",
  "arctanh": "atanh",
  "artanh": "atanh",
  "arcsech": "asech",
  "arccsch": "acsch",
  "arccoth": "acoth",
  "arsech": "asech",
  "arcsch": "acsch",
  "arcoth": "acoth",
  "arcsin": "asin",
  "arsin": "asin",
  "arccos": "acos",
  "arcos": "acos",
  "arctan": "atan",
  "artan": "atan",
  "arcsec": "asec",
  "arccsc": "acsc",
  "arccot": "acot",
  "arsec": "asec",
  "arcsc": "acsc",
  "arcot": "acot",
  "log": "ln"
}

const OperatorNames = {
  "asin": "\\operatorname{sin}^{-1}",
  "acos": "\\operatorname{cos}^{-1}",
  "atan": "\\operatorname{tan}^{-1}",
  "asec": "\\operatorname{sec}^{-1}",
  "acsc": "\\operatorname{csc}^{-1}",
  "acot": "\\operatorname{cot}^{-1}",
  "asinh": "\\operatorname{sinh}^{-1}",
  "acosh": "\\operatorname{cosh}^{-1}",
  "atanh": "\\operatorname{tanh}^{-1}",
  "asech": "\\operatorname{sech}^{-1}",
  "acsch": "\\operatorname{csch}^{-1}",
  "acoth": "\\operatorname{coth}^{-1}",
  "gamma": "\\Gamma",
  "digamma": "\\psi",
  "trigamma": "\\psi_1",
  "ln_gamma": "\\operatorname{ln} \\Gamma",
  "log10": "\\operatorname{log}_{10}",
  "log2": "\\operatorname{log}_{2}"
}

let canNotParenthesize = ["sin", "cos", "tan", "asin", "acos", "atan", "sec", "csc", "cot", "asec", "acsc", "acot", "sinh", "cosh", "tanh", "asinh", "acosh", "atanh", "sech", "csch", "coth", "asech", "acsch", "acoth"]

function getOperatorName(op) {
  let special = OperatorNames[op]
  if (special) {
    return special
  }

  return "\\operatorname{" + op + "}"
}

function alwaysParenthesize(op) {
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

  latex() {
    switch (this.operator) {
      case "^":
        let exponent = this.children[1]

        let exponent_latex
        if (exponent.type() === "node") {
          exponent_latex = exponent.latex(false)
        } else {
          exponent_latex = exponent.latex()
        }
        return `${this.children[0].latex()}^{${exponent_latex}}`
      case "*":
        return `${this.children[0].latex()}\\cdot ${this.children[1].latex()}`
      case "+":
        return `${this.children[0].latex()}+${this.children[1].latex()}`
      case "-":
        return `${this.children[0].latex()}-${this.children[1].latex()}`
      case "/":
        return `\\frac{${this.children[0].latex()}}{${this.children[1].latex()}}`
      case "<":
        return `${this.children[0].latex()} < ${this.children[1].latex()}`
      case "<=":
        return `${this.children[0].latex()} \\leq ${this.children[1].latex()}`
      case "==":
        return `${this.children[0].latex()} = ${this.children[1].latex()}`
      case "!=":
        return `${this.children[0].latex()} \\neq ${this.children[1].latex()}`
      case ">":
        return `${this.children[0].latex()} > ${this.children[1].latex()}`
      case ">=":
        return `${this.children[0].latex()} \\geq ${this.children[1].latex()}`
      case "pow_rational":
        // Normally unused third child stores what the user actually inputted
        return `${this.children[0].latex()}^{${this.children[3].latex()}}`
      case "factorial":
        let needs_parens = this.needsParentheses()
        let latex_n = this.children[0].latex()

        if (needs_parens)
          return `\\left(${latex_n}\\right)!`
        else
          return latex_n + '!'
      case "logb":
        let log_needs_parens = this.children[1].needsParentheses()
        let base_needs_parens = this.children[0].needsParentheses()

        let base = `${base_needs_parens ? '\\left(' : ''}${this.children[0].latex()}${base_needs_parens ? '\\right)' : ''}`
        let log = `${log_needs_parens ? '\\left(' : ''}${this.children[1].latex()}${log_needs_parens ? '\\right)' : ''}`

        return `\\operatorname{log}_{${base}}{${log}}`
      case "ifelse":
        return `\\begin{cases} ${this.children[0].latex()} & ${this.children[1].latex()} \\\\ ${this.children[2].latex()} & \\text{otherwise} \\end{cases}`
      case "cchain":
        return this.children.map(child => child.latex()).join('')
      case "polygamma":
        return `\\psi^{(${this.children[0].latex()})}\\left(${this.children[1].latex()}\\right)`
      case "piecewise":
        let pre = `\\begin{cases} `

        let post
        if (this.children.length % 2 === 0) {

          post = `0 & \\text{otherwise} \\end{cases}`
        } else {
          post = ` \\text{otherwise} \\end{cases}`
        }

        let latex = pre

        for (let i = 0; i < this.children.length; i += 2) {
          let k = 0
          for (let j = 1; j >= 0; --j) {
            let child = this.children[i+j]

            if (!child)
              continue

            latex += child.latex()

            if (k === 0) {
              latex += " & "
            } else {
              latex += " \\\\ "
            }

            k++
          }
        }

        latex += post

        return latex
      case "not":
        return "\\neg(" + this.children.map(child => child.latex()).join('+') + ')'
      case "and":
        return this.children.map(child => child.latex()).join("\\land ")
      case "or":
        return this.children.map(child => child.latex()).join("\\lor ")
      case "abs":
        return '\\left|' + this.children.map(child => child.latex()).join(",") + '\\right|'
      default:
        let needs_parens2 = this.needsParentheses()

        let operatorName = getOperatorName(this.operator)
        if (!needs_parens2 && alwaysParenthesize(this.operator)) {
          needs_parens2 = true
        }

        return `${operatorName}${needs_parens2 ? '\\left(' : ''}${this.children.map(child => child.latex()).join(',\\,')}${needs_parens2 ? '\\right)' : ''}`
    }
  }

  _getIntervalCompileText(defineVariable) {
    const children_text = this.children.map(child => child._getIntervalCompileText(defineVariable)).join(',')

    return `Grapheme.Intervals['${this.operator}'](${children_text})`
  }

  _getRealCompileText(defineRealVariable) {
    let children = this.children
    if (this.operator === "piecewise") {
      if (children.length % 2 === 0) {
        // add default value of 0
        children = children.slice()
        children.push(new ConstantNode({value: 0, text: "0"}))
      }
    }

    if (this.operator === "ifelse") {
      if (children.length === 2) {
        // add default value of 0
        children.push(new ConstantNode({value: 0, text: "0"}))
        return
      }
    }

    const children_text = children.map(child => child._getRealCompileText(defineRealVariable)).join(',')

    return `Grapheme.REAL_FUNCTIONS['${this.operator}'](${children_text})`
  }

  _getCompileText (defineVariable) {

    switch (this.operator) {
      case "cchain":
        let components = this.children
        let ids = []
        for (let i = 0; i < components.length; i += 2) {
          let variableId = "$" + utils.getRenderID()

          defineVariable(variableId, components[i]._getCompileText(defineVariable))

          ids.push(variableId)
        }

        let comparisons = []

        for (let i = 1; i < components.length; i += 2) {
          let comparison = components[i]
          let lhs = ids[(i - 1) / 2]
          let rhs = ids[(i + 1) / 2]

          // comparisons in cchains are variables
          comparisons.push("(" + lhs + comparison.name + rhs + ")")
        }

        return comparisons.join("&&")
      case "ifelse":
        const res = this.children.map(child => child._getCompileText(defineVariable))

        return `((${res[1]})?(${res[0]}):(${res[2]}))`
      case "piecewise":
        if (this.children.length === 0) {
          return "(0)"
        }

        if (this.children.length === 1) {
          return this.children[0]._getCompileText(defineVariable)
        }

        if (this.children.length === 3) {
          return new OperatorNode({operator: "ifelse", children: [this.children[1], this.children[0], this.children[2]]})._getCompileText(defineVariable)
        } else if (this.children.length === 2) {
          return new OperatorNode({operator: "ifelse", children: [this.children[1], this.children[0], new ConstantNode({value: 0})]})._getCompileText(defineVariable)
        } else {
          let remainder = new OperatorNode({operator: "piecewise", children: this.children.slice(2)})._getCompileText(defineVariable)

          let condition = this.children[0]._getCompileText(defineVariable)
          let value = this.children[1]._getCompileText(defineVariable)

          return `((${condition})?(${value}):(${remainder}))`
        }
      case "and":
        return this.children.map(child => child._getCompileText(defineVariable)).join("&&")
      case "or":
        return this.children.map(child => child._getCompileText(defineVariable)).join("||")
    }

    let pattern = OperatorPatterns[this.operator]

    if (!pattern) {
      throw new Error('Unrecognized operation')
    }

    return pattern[0] + '(' + this.children.map(child => '(' + child._getCompileText(defineVariable) + ')').join(pattern[1] ? pattern[1] : '+') + ')' + (pattern[2] ? pattern[2] : '')
  }

  type() {
    return "operator"
  }

  derivative (variable) {
    return operator_derivative(this, variable)
  }

  getText () {
    return this.operator
  }

  clone () {
    let node = new OperatorNode({ operator: this.operator })

    node.children = this.children.map(child => child.clone())

    return node
  }
}

class ConstantNode extends ASTNode {
  constructor (params = {}) {
    super()

    const {
      value = 0,
      text = "",
      invisible = false
    } = params

    this.value = value
    this.text = text ? text : StandardLabelFunction(value)
    this.invisible = invisible
  }

  _getRealCompileText(defineRealVariable) {
    let var_name = '$' + utils.getRenderID()
    defineRealVariable(var_name, this.text)
    return var_name
  }

  _getIntervalCompileText(defineVariable) {
    let varName = '$' + utils.getRenderID()
    if (isNaN(this.value)) {
      defineVariable(varName, `new Grapheme.Interval(NaN, NaN, false, false, true, true)`)
      return varName
    }

    defineVariable(varName, `new Grapheme.Interval(${this.value}, ${this.value}, true, true, true, true)`)
    return varName
  }

  _getCompileText (defineVariable) {
    return this.value + ''
  }

  derivative () {
    return new ConstantNode({ value: 0 })
  }

  getText () {
    return this.invisible ? '' : this.text
  }

  latex() {
    return this.getText()
  }

  type() {
    return "constant"
  }

  clone () {
    return new ConstantNode({ value: this.value, invisible: this.invisible, text: this.text })
  }
}

const LN2 = new OperatorNode({operator: 'ln', children: [new ConstantNode({value: 10})]})
const LN10 = new OperatorNode({operator: 'ln', children: [new ConstantNode({value: 10})]})
const ONE_THIRD = new OperatorNode({operator: '/', children: [
  new ConstantNode({value: 1}),
    new ConstantNode({value: 3})
  ]})

export { ONE_THIRD, VariableNode, OperatorNode, ConstantNode, ASTNode, OperatorSynonyms, LN2, LN10, isExactlyRepresentableAsFloat }
