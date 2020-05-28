// const fs = require( ...
// No, this is not node.js the language.

import { operator_derivative } from './derivative'
import * as utils from "../core/utils"

const comparisonOperators = ['<', '>', '<=', '>=', '!=', '==']

class ASTNode {
  constructor (params = {}) {

    const {
      parent = null,
      children = []
    } = params

    this.children = children
    this.parent = parent
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

  clone () {
    let node = new ASTNode()

    node.children = this.children.map(child => child.clone())

    return node
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

  _getCompileText (defineVariable) {
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
    return this.name
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
  'acot': ['Math.atan(1/', '+', ')'],
  'acsch': ['Math.asinh(1/', '+', ')'],
  'asech': ['Math.acosh(1/', '+', ')'],
  'acoth': ['Math.atanh(1/', '+', ')'],
  'logb': ['Grapheme.Functions.LogB', ',']
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
      case "ifelse":
        return `\\begin{cases} ${this.children[0].latex()} & ${this.children[1].latex()} \\\\ ${this.children[2].latex()} & \\text{otherwise} \\end{cases}`
      case "cchain":
        return this.children.map(child => child.latex()).join('')
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
      default:
        return `\\operatorname{${this.operator}}(${this.children.map(child => child.latex()).join(',\\,')})`
    }
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
      value = 0
    } = params

    this.value = value
  }

  _getCompileText (defineVariable) {
    return this.value + ''
  }

  derivative () {
    return new ConstantNode({ value: 0 })
  }

  getText () {
    return '' + this.value
  }

  latex() {
    return this.getText()
  }

  type() {
    return "constant"
  }

  clone () {
    return new ConstantNode({ value: this.value })
  }
}


export { VariableNode, OperatorNode, ConstantNode, ASTNode }
