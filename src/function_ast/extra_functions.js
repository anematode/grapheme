
const Functions = {
  LogB: (b, v) => {
    return Math.ln(v) / Math.ln(b)
  },
  Factorial: (a) => {

  },
  Gamma: (a) => {

  },
  LogGamma: (a) => {

  },
  IfElse: (val1, condition, val2) => {
    if (condition)
      return val1
    else
      return val2
  },
  Piecewise: (condition, value, ...args) => {
    if (condition !== undefined && value === undefined) {
      return args[0]
    } else if (condition === undefined && value === undefined) {
      return 0
    } else {
      if (condition) {
        return value
      }

      return Functions.Piecewise(...args)
    }
  },
  CCHAIN: (val1, comparison, val2, ...args) => {
    if (!comparison)
      return true
    switch (comparison) {
      case "<":
        if (val1 < val2)
          return Functions.CCHAIN(val2, ...args)
        break
      case ">":
        if (val1 > val2)
          return Functions.CCHAIN(val2, ...args)
        break
      case "<=":
        if (val1 <= val2)
          return Functions.CCHAIN(val2, ...args)
        break
      case ">=":
        if (val1 >= val2)
          return Functions.CCHAIN(val2, ...args)
        break
      case "!=":
        if (val1 !== val2)
          return Functions.CCHAIN(val2, ...args)
        break
      case "==":
        if (val1 === val2)
          return Functions.CCHAIN(val2, ...args)
        break
    }

    return false
  }
}

export { Functions }
