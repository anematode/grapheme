import { Functions } from './extra_functions'

function cchain(val1, compare, val2, ...args) {
  if (!val2) {
    return false
  }

  switch (compare) {
    case '<':
      if (val1 >= val2)
        return false
      break
    case '>':
      if (val1 <= val2)
        return false
      break
    case '<=':
      if (val1 > val2)
        return false
      break
    case '>=':
      if (val1 < val2)
        return false
      break
    case '==':
      if (val1 !== val2)
        return false
      break
    case '!=':
      if (val1 === val2)
        return false
      break
  }

  if (args.length > 0)
    return cchain(val2, ...args)

  return true
}
function piecewise(cond, val, ...args) {
  if (!val) {
    return cond
  }

  if (cond) {
    return val
  }

  if (args.length === 0) {
    // This is a fail
    return val
  } else {
    return piecewise(...args)
  }
}

function ifelse(val1, cond, val2) {
  if (cond)
    return val1
  return val2
}

const Operators = {
  '+': (x, y) => x + y,
  '-': (x, y) => x - y,
  '*': (x, y) => x * y,
  '/': (x, y) => x / y,
  '^': (x, y) => Math.pow(x, y),
  '<': (x, y) => x < y,
  '<=': (x, y) => x <= y,
  '>': (x, y) => x > y,
  '>=': (x, y) => x >= y,
  '==': (x, y) => x === y,
  '!=': (x, y) => x !== y,
  'sin': Math.sin,
  'tan': Math.tan,
  'cos': Math.cos,
  'csc': x => 1/Math.sin(x),
  'sec': x => 1/Math.cos(x),
  'cot': x => 1/Math.tan(x),
  'asin': x => Math.asin(x),
  'acos': x => Math.acos(x),
  'atan': x => Math.atan(x),
  'abs': x => Math.abs(x),
  'sqrt': x => Math.sqrt(x),
  'cbrt': x => Math.cbrt(x),
  'ln': x => Math.log(x),
  'log': x => Math.log(x),
  'log10': x => Math.log10(x),
  'log2': x => Math.log2(x),
  'sinh': Math.sinh,
  'cosh': Math.cosh,
  'tanh': Math.tanh,
  'csch': x => 1/Math.sinh(x),
  'sech': x => 1/Math.cosh(x),
  'coth': x => 1/Math.tanh(x),
  'asinh': Math.asinh,
  'acosh': Math.acosh,
  'atanh': Math.atanh,
  'asec': x => Math.acos(1/x),
  'acsc': x => Math.asin(1/x),
  'acot': Functions.Arccot,
  'acsch': x => Math.asinh(1/x),
  'asech': x => Math.acosh(1/x),
  'acoth': x => Math.atanh(1/x),
  'logb': Functions.LogB,
  'gamma': Functions.Gamma,
  'factorial': Functions.Factorial,
  'ln_gamma': Functions.LnGamma,
  'digamma': Functions.Digamma,
  'trigamma': Functions.Trigamma,
  'polygamma': Functions.Polygamma,
  'pow_rational': Functions.PowRational,
  'max': Math.max,
  'min': Math.min,
  'floor': Math.floor,
  'ceil': Math.ceil,
  'and': (x, y) => x && y,
  'or': (x, y) => x || y,
  'cchain': cchain,
  'ifelse': ifelse,
  'piecewise': piecewise
}

export { Operators }
