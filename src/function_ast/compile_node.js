import * as utils from '../core/utils'
import { ConstantNode, isExactlyRepresentableAsFloat } from './node'

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
  'acot': [utils.isWorker ? 'ExtraFunctions.Arccot' : 'Grapheme.ExtraFunctions.Arccot', ','],
  'acsch': ['Math.asinh(1/', '+', ')'],
  'asech': ['Math.acosh(1/', '+', ')'],
  'acoth': ['Math.atanh(1/', '+', ')'],
  'logb': [utils.isWorker ? 'ExtraFunctions.LogB' : 'Grapheme.ExtraFunctions.LogB', ','],
  'gamma': [utils.isWorker ? 'ExtraFunctions.Gamma' : 'Grapheme.ExtraFunctions.Gamma', ','],
  'factorial': [utils.isWorker ? 'ExtraFunctions.Factorial' : 'Grapheme.ExtraFunctions.Factorial', ','],
  'ln_gamma': [utils.isWorker ? 'ExtraFunctions.LnGamma' : 'Grapheme.ExtraFunctions.LnGamma', ','],
  'digamma': [utils.isWorker ? 'ExtraFunctions.Digamma' : 'Grapheme.ExtraFunctions.Digamma', ','],
  'trigamma': [utils.isWorker ? 'ExtraFunctions.Trigamma' : 'Grapheme.ExtraFunctions.Trigamma', ','],
  'polygamma': [utils.isWorker ? 'ExtraFunctions.Polygamma' : 'Grapheme.ExtraFunctions.Polygamma', ','],
  'pow_rational': [utils.isWorker ? 'ExtraFunctions.PowRational' : 'Grapheme.ExtraFunctions.PowRational', ','],
  'max': ['Math.max', ','],
  'min': ['Math.min', ','],
  'floor': ['Math.floor', ','],
  'ceil': ['Math.ceil', ','],
  'remainder': ['', '%']
}

const comparisonOperators = ['<', '>', '<=', '>=', '!=', '==']

function getOperatorCompileText(node, defineVariable) {
  switch (node.operator) {
    case 'cchain':
      let components = node.children
      let ids = []
      for (let i = 0; i < components.length; i += 2) {
        let variableId = '$' + utils.getRenderID()

        defineVariable(variableId, getCompileText(components[i], defineVariable))

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
      const res = node.children.map(child => getCompileText(child, defineVariable))

      return `((${res[1]})?(${res[0]}):(${res[2]}))`
    case 'piecewise':
      if (node.children.length === 0) {
        return '(0)'
      }

      if (node.children.length === 1) {
        return getCompileText(node.children[0], defineVariable)
      }

      if (node.children.length === 3) {
        return getCompileText(OperatorNode({
          operator: 'ifelse',
          children: [node.children[1], node.children[0], node.children[2]]
        }), defineVariable)
      } else if (node.children.length === 2) {
        return getCompileText(new OperatorNode({
          operator: 'ifelse',
          children: [node.children[1], node.children[0], new ConstantNode({ value: 0 })]
        }), defineVariable)
      } else {
        let remainder = getCompileText(OperatorNode({
          operator: 'piecewise',
          children: node.children.slice(2)
        }), defineVariable)

        let condition = getCompileText(node.children[0], defineVariable)
        let value = getCompileText(node.children[1], defineVariable)

        return `((${condition})?(${value}):(${remainder}))`
      }
    case 'and':
      return node.children.map(child => getCompileText(child, defineVariable)).join('&&')
    case 'or':
      return node.children.map(child => getCompileText(child, defineVariable)).join('||')
  }

  let pattern = OperatorPatterns[node.operator]

  if (!pattern) {
    throw new Error('Unrecognized operation')
  }

  return pattern[0] + '(' + node.children.map(child => '(' + getCompileText(child, defineVariable) + ')').join(pattern[1] ? pattern[1] : '+') + ')' + (pattern[2] ? pattern[2] : '')
}

function getCompileText(node, defineVariable) {
  switch (node.type()) {
    case "node":
      return node.children.map(child => '(' + getCompileText(child, defineVariable) + ')').join('+')
    case "operator":
      return getOperatorCompileText(node, defineVariable)
    case "constant":
      return node.value + ''
    case "variable":
      if (comparisonOperators.includes(node.name)) {
        return '"' + node.name + '"'
      }
      return node.name
  }
}

export function compileNode(node, exportedVariables=['x']) {
  let preamble = ''

  const defineVariable = (variable, expression) => {
    preamble += `let ${variable}=${expression};`
  }

  let returnVal = getCompileText(node, defineVariable)

  return {
    func: new Function(...exportedVariables, preamble + 'return ' + returnVal),
    variableNames: exportedVariables
  }
}


function getIntervalCompileText(node, defineVariable) {
  switch (node.type()) {
    case "node":
      return node.children.map(child => getIntervalCompileText(child, defineVariable)).join(',')
    case "operator":
      const children_text = node.children.map(child => getIntervalCompileText(child, defineVariable)).join(',')

      return `${utils.isWorker ? "IntervalFunctions" : "Grapheme.IntervalFunctions"}['${node.operator}'](${children_text})`
    case "constant":
      let varName = '$' + utils.getRenderID()
      if (isNaN(node.value)) {
        defineVariable(varName, `new ${utils.isWorker ? "Interval" : "Grapheme.Interval"}(NaN, NaN, false, false, true, true)`)
        return varName
      }

      defineVariable(varName, `new ${utils.isWorker ? "Interval" : "Grapheme.Interval"}(${node.value}, ${node.value}, true, true, true, true)`)
      return varName
    case "variable":
      if (comparisonOperators.includes(node.name)) {
        return '"' + node.name + '"'
      }
      return node.name
  }
}

export function compileNodeInterval(node, exportedVariables=['x']) {
  let preamble = ''

  const defineVariable = (variable, expression) => {
    preamble += `let ${variable}=${expression};`
  }

  let returnVal = getIntervalCompileText(node, defineVariable)

  return {
    func: new Function(...exportedVariables, preamble + 'return ' + returnVal),
    variableNames: exportedVariables
  }
}

function getRealCompileText(node, defineRealVariable) {
  switch (node.type()) {
    case "node":
      return node.children.map(child => '(' + getRealCompileText(child, defineRealVariable) + ')').join(',')
    case "operator":
      let children = node.children
      if (node.operator === 'piecewise') {
        if (children.length % 2 === 0) {
          // add default value of 0
          children = children.slice()
          children.push(new ConstantNode({
            value: 0,
            text: '0'
          }))
        }
      }

      if (node.operator === 'ifelse') {
        if (children.length === 2) {
          // add default value of 0
          children = children.slice()
          children.push(new ConstantNode({
            value: 0,
            text: '0'
          }))
          return
        }
      }

      const children_text = children.map(child => getRealCompileText(child, defineRealVariable)).join(',')

      return `${utils.isWorker ? "RealFunctions" : "Grapheme.RealFunctions"}S['${node.operator}'](${children_text})`
    case "constant":
      let varName = '$' + utils.getRenderID()
      defineRealVariable(varName, node.text)
      return varName
    case "variable":
      if (comparisonOperators.includes(node.name)) {
        return `'${node.name}'`
      }
      let name = '$' + utils.getRenderID()

      defineRealVariable(name, null, node.name)

      return name

  }
}

export function compileNodeReal(node, exportedVariables=['x']) {
  let Variables = {}
  let preamble = ''

  const defineRealVariable = (name, value, variable) => {
    Variables[name] = new Grapheme.Real(precision)
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

  let text = getRealCompileText(node, defineRealVariable)

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
