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
