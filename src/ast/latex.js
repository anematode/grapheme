import { ConstantNode, VariableNode } from './new_node.js'

function genInfixLatex(operator) {
  return (nodes, params={}) => {
    return nodes.map(node => node.latex(params)).join(operator)
  }
}

function parenthesize(str) {
  return String.raw`\left(${str}\right)`
}

function surround(str, leftToken, rightToken) {
  return "\\left\\" + leftToken + " " + str + "\\right\\" + rightToken
}

function multiplicationLatex(nodes, params={}) {
  return nodes.map(node => node.latex(params)).join('\\cdot ')
}

function additionLatex(nodes, params={}) {
  return nodes.map(node => node.latex(params)).join('+')
}

function subtractionLatex(nodes, params={}) {
  return nodes.map(node => node.latex(params)).join('-')
}

function divisionLatex(nodes, params={}) {
  return `\\frac{${nodes[0].latex(params)}}{${nodes[1].latex(params)}}`
}

function exponentiationLatex(nodes, params={}) {
  return String.raw`${nodes[0].latex(params)}^{${nodes[1].latex(params)}}`
}

function genFunctionLatex(functionName) {
  let fName = functionName[0] === '\\' ? functionName : `\\operatorname{${functionName}}`

  return (nodes, params={}) => {
    if (nodes.length === 1) {
      if (optionalParentheses.includes(functionName) && !needsParentheses(nodes[0])) {
        return String.raw`${fName} ${nodes[0].latex(params)}`
      }
    }

    return String.raw`${fName}\left(${nodes.map(node => node.latex(params)).join(', ')}\right)`
  }
}

function genFunctionSubscriptLatex(functionName) {
  let fName = functionName[0] === '\\' ? functionName : `\\operatorname{${functionName}}`

  return (nodes, params={}) => String.raw`${fName}_{${nodes[0].latex(params)}}\left(${nodes.slice(1).map(node => node.latex(params)).join(', ')}\right)`
}

function needsParentheses(node) {
  if (node instanceof VariableNode) {
    return false
  } else return !(node instanceof ConstantNode);
}

// Mapping between inequality operators and their respective latex symbols
const inequalityOperatorSymbols = {
  '<': '<',
  '>': '>',
  '<=': '\\leq',
  '>=': '\\geq',
  '==': '=',
  '!=': '\\neq'
}

// Inequality
function getInequalityOperator(str) {
  let symbol = inequalityOperatorSymbols[str]

  return symbol ? symbol : ''
}

// https://www.latex-tutorial.com/symbols/greek-alphabet/
// Array.from(document.getElementsByTagName("tr")).forEach(egg => { arr.push(...egg.children[2].innerText.split(' ').filter(egg => egg[0] === '\\')) } )

// Mapping between greek letters and their latex counterparts
const _builtinGreekLetters = [
  "\\alpha",
  "\\beta",
  "\\gamma",
  "\\Gamma",
  "\\delta",
  "\\Delta",
  "\\epsilon",
  "\\zeta",
  "\\eta",
  "\\theta",
  "\\Theta",
  "\\iota",
  "\\kappa",
  "\\lambda",
  "\\Lambda",
  "\\mu",
  "\\nu",
  "\\omicron",
  "\\pi",
  "\\Pi",
  "\\rho",
  "\\sigma",
  "\\Sigma",
  "\\tau",
  "\\upsilon",
  "\\Upsilon",
  "\\phi",
  "\\Phi",
  "\\chi",
  "\\psi",
  "\\Psi",
  "\\omega",
  "\\Omega"
]

const optionalParentheses = []

;["sin", "cos", "tan"].forEach(trig => {
  ["", "arc"].forEach(arc => {
    ["", "h"].forEach(hyper => {
      optionalParentheses.push(arc + trig + hyper)
    })
  })
})

const greekLetterSymbols = {}

for (let letter of _builtinGreekLetters) {
  greekLetterSymbols[letter.replace(/\\/g, '')] = letter
}

function replaceGreekInName(str) {
  for (let letter in greekLetterSymbols) {
    if (greekLetterSymbols.hasOwnProperty(letter)) {
      if (str === letter) {
        return greekLetterSymbols[letter]
      }
    }
  }

  return str
}

function getVariableLatex(str) {
  let booleanOp = inequalityOperatorSymbols[str]

  if (booleanOp)
    return booleanOp + ' '

  let components = str.split('_')

  components = components.map(str => {
    str = replaceGreekInName(str)

    if (str[0] !== '\\' && str.length > 1)
      str = String.raw`\text{${str}}`

    return str
  })

  return components.reduceRight((a, b) => `${b}_{${a}}`)
}

let MIN_LATEX_REPRESENTABLE = 1e-6
let MAX_LATEX_REPRESENTABLE = 1e6


function getConstantLatex(obj) {
  let value = obj.value
  let text = obj.text

  if (text)
    return text

  return value + ''
}

function sqrtLatex(nodes, params={}) {
  return String.raw`\sqrt{${nodes[0].latex(params)}}`
}

function cbrtLatex(nodes, params={}) {
  return String.raw`\sqrt[3]{${nodes[0].latex(params)}}`
}

function nthRootLatex(nodes, params={}) {
  return String.raw`\sqrt[${nodes[0].latex(params)}]{${nodes[1].latex(params)}}`
}

function polygammaLatex(nodes, params={}) {
  return String.raw`\psi^{(${nodes[0].latex(params)})}\\left(${nodes[1].latex(params)}\\right)`
}

function piecewiseLatex(nodes, params={}) {
  let pre = `\\begin{cases} `

  let post
  if (nodes.length % 2 === 0) {
    post = `0 & \\text{otherwise} \\end{cases}`
  } else {
    post = ` \\text{otherwise} \\end{cases}`
  }

  let latex = pre

  for (let i = 0; i < nodes.length; i += 2) {
    let k = 0
    for (let j = 0; j <= 1; ++j) {
      let child = nodes[i+j]

      if (!child)
        continue

      latex += child.latex(params)

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
}

function cchainLatex(nodes, params={}) {
  return nodes.map(child => child.latex(params)).join('')
}

function floorLatex(nodes, params={}) {
  return surround(nodes[0].latex(params), "lfloor", "rfloor")
}

function ceilLatex(nodes, params={}) {
  return surround(nodes[0].latex(params), "lceil", "rceil")
}

function fractionalPartLatex(nodes, params={}) {
  return surround(nodes[0].latex(params), "{", "}")
}

function absoluteValueLatex(nodes, params={}) {
  return surround(nodes[0].latex(params), "lvert", "rvert")
}

function unaryMinusLatex(nodes, params={}) {
  return "-" + nodes[0].latex(params)
}

const cmpLatex = {}

Object.entries(inequalityOperatorSymbols).forEach(([key, value]) => {
  cmpLatex[key] = genInfixLatex(value)
})

const logicLatex = {
  not: (nodes, params) => {
    return "\\neg " + nodes[0].latex(params)
  },
  or: (nodes, params) => {
    return nodes.map(node => node.latex(params)).join("\\lor ")
  },
  and: (nodes, params) => {
    return nodes.map(node => node.latex(params)).join("\\land ")
  }
}

const LatexMethods = {
  multiplicationLatex,
  additionLatex,
  subtractionLatex,
  divisionLatex,
  exponentiationLatex,
  sqrtLatex,
  cbrtLatex,
  nthRootLatex,
  polygammaLatex,
  piecewiseLatex,
  absoluteValueLatex,
  floorLatex,
  ceilLatex,
  fractionalPartLatex,
  cchainLatex,
  replaceGreekInName,
  getInequalityOperator,
  getVariableLatex,
  genFunctionLatex,
  getConstantLatex,
  genFunctionSubscriptLatex,
  unaryMinusLatex,
  cmpLatex,
  logicLatex
}

export { LatexMethods }
