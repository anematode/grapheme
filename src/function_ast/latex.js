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

function getLatex(opNode) {
  switch (opNode.operator) {
    case "^":
      let exponent = opNode.children[1]

      let exponent_latex
      if (exponent.type() === "node") {
        exponent_latex = exponent.latex(false)
      } else {
        exponent_latex = exponent.latex()
      }
      return `${opNode.children[0].latex()}^{${exponent_latex}}`
    case "*":
      return `${opNode.children[0].latex()}\\cdot ${opNode.children[1].latex()}`
    case "+":
      return `${opNode.children[0].latex()}+${opNode.children[1].latex()}`
    case "-":
      return `${opNode.children[0].latex()}-${opNode.children[1].latex()}`
    case "/":
      return `\\frac{${opNode.children[0].latex()}}{${opNode.children[1].latex()}}`
    case "<":
      return `${opNode.children[0].latex()} < ${opNode.children[1].latex()}`
    case "<=":
      return `${opNode.children[0].latex()} \\leq ${opNode.children[1].latex()}`
    case "==":
      return `${opNode.children[0].latex()} = ${opNode.children[1].latex()}`
    case "!=":
      return `${opNode.children[0].latex()} \\neq ${opNode.children[1].latex()}`
    case ">":
      return `${opNode.children[0].latex()} > ${opNode.children[1].latex()}`
    case ">=":
      return `${opNode.children[0].latex()} \\geq ${opNode.children[1].latex()}`
    case "pow_rational":
      // Normally unused third child stores what the user actually inputted
      return `${opNode.children[0].latex()}^{${opNode.children[3].latex()}}`
    case "factorial":
      let needs_parens = opNode.needsParentheses()
      let latex_n = opNode.children[0].latex()

      if (needs_parens)
        return `\\left(${latex_n}\\right)!`
      else
        return latex_n + '!'
    case "logb":
      let log_needs_parens = opNode.children[1].needsParentheses()
      let base_needs_parens = opNode.children[0].needsParentheses()

      let base = `${base_needs_parens ? '\\left(' : ''}${opNode.children[0].latex()}${base_needs_parens ? '\\right)' : ''}`
      let log = `${log_needs_parens ? '\\left(' : ''}${opNode.children[1].latex()}${log_needs_parens ? '\\right)' : ''}`

      return `\\operatorname{log}_{${base}}{${log}}`
    case "ifelse":
      return `\\begin{cases} ${opNode.children[0].latex()} & ${opNode.children[1].latex()} \\\\ ${opNode.children[2].latex()} & \\text{otherwise} \\end{cases}`
    case "cchain":
      return opNode.children.map(child => child.latex()).join('')
    case "polygamma":
      return `\\psi^{(${opNode.children[0].latex()})}\\left(${opNode.children[1].latex()}\\right)`
    case "piecewise":
      let pre = `\\begin{cases} `

      let post
      if (opNode.children.length % 2 === 0) {

        post = `0 & \\text{otherwise} \\end{cases}`
      } else {
        post = ` \\text{otherwise} \\end{cases}`
      }

      let latex = pre

      for (let i = 0; i < opNode.children.length; i += 2) {
        let k = 0
        for (let j = 1; j >= 0; --j) {
          let child = opNode.children[i+j]

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
      return "\\neg(" + opNode.children.map(child => child.latex()).join('+') + ')'
    case "and":
      return opNode.children.map(child => child.latex()).join("\\land ")
    case "or":
      return opNode.children.map(child => child.latex()).join("\\lor ")
    case "abs":
      return '\\left|' + opNode.children.map(child => child.latex()).join(",") + '\\right|'
    default:
      let needs_parens2 = opNode.needsParentheses()

      let operatorName = getOperatorName(opNode.operator)
      if (!needs_parens2 && alwaysParenthesize(opNode.operator)) {
        needs_parens2 = true
      }

      return `${operatorName}${needs_parens2 ? '\\left(' : ''}${opNode.children.map(child => child.latex()).join(',\\,')}${needs_parens2 ? '\\right)' : ''}`
  }
}

export {getLatex}
