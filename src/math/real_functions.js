
function cchain(val1, compare, val2, ...args) {
  if (!val2) {
    return false
  }

  switch (compare) {
    case '<':
      if (!val1.less_than(val2))
        return false
      break
    case '>':
      if (!val1.greater_than(val2))
        return false
      break
    case '<=':
      if (!val1.less_equal_than(val2))
        return false
      break
    case '>=':
      if (!val1.greater_equal_than(val2))
        return false
      break
    case '==':
      if (!val1.equals(val2))
        return false
      break
    case '!=':
      if (val1.equals(val2))
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

const PRECISE_REAL_FUNCTIONS = {
  '*': (r1, r2) => {
    r1.multiply_real(r2)
    return r1
  },
  '+': (r1, r2) => {
    r1.add_real(r2)
    return r1
  },
  '-': (r1, r2) => {
    r1.subtract_real(r2)
    return r1
  },
  '/': (r1, r2) => {
    r1.divide_real(r2)
    return r1
  },
  '^': (r1, r2) => {
    r1.pow_real(r2)
    return r1
  },
  '<': (r1, r2) => {
    return r1.less_than(r2)
  },
  '>': (r1, r2) => {
    return r1.greater_than(r2)
  },
  '<=': (r1, r2) => {
    return r1.less_equal_than(r2)
  },
  '>=': (r1, r2) => {
    return r1.greater_equal_than(r2)
  },
  '==': (r1, r2) => {
    return r1.equals(r2)
  },
  '!=': (r1, r2) => {
    return !(r1.equals(r2))
  },
  'sin': (r1) => {
    r1.sin()
    return r1
  },
  'cos': (r1) => {
    r1.cos()
    return r1
  },
  'tan': (r1) => {
    r1.tan()
    return r1
  },
  'sinh': (r1) => {
    r1.sinh()
    return r1
  },
  'cosh': (r1) => {
    r1.cosh()
    return r1
  },
  'tanh': (r1) => {
    r1.tanh()
    return r1
  },
  'asin': (r1) => {
    r1.asin()
    return r1
  },
  'acos': (r1) => {
    r1.acos()
    return r1
  },
  'atan': (r1) => {
    r1.atan()
    return r1
  },
  'asinh': (r1) => {
    r1.asinh()
    return r1
  },
  'acosh': (r1) => {
    r1.acosh()
    return r1
  },
  'atanh': (r1) => {
    r1.atanh()
    return r1
  },
  'csc': (r1) => {
    r1.csc()
    return r1
  },
  'sec': (r1) => {
    r1.sec()
    return r1
  },
  'cot': (r1) => {
    r1.cot()
    return r1
  },
  'csch': (r1) => {
    r1.csch()
    return r1
  },
  'sech': (r1) => {
    r1.sech()
    return r1
  },
  'coth': (r1) => {
    r1.coth()
    return r1
  },
  'acsc': (r1) => {
    r1.acsc()
    return r1
  },
  'asec': (r1) => {
    r1.asec()
    return r1
  },
  'acot': (r1) => {
    r1.acot()
    return r1
  },
  'acsch': (r1) => {
    r1.acsch()
    return r1
  },
  'asech': (r1) => {
    r1.asech()
    return r1
  },
  'acoth': (r1) => {
    r1.acoth()
    return r1
  },
  'abs': (r1) => {
    r1.abs()
    return r1
  },
  'sqrt': (r1) => {
    r1.sqrt()
    return r1
  },
  'cbrt': (r1) => {
    r1.cbrt()
    return r1
  },
  'pow_rational': (r1, p, q) => {
    r1.pow_rational(p, q)
    return r1
  },
  'ln': (r1) => {
    r1.ln()
    return r1
  },
  'log10': (r1) => {
    r1.log10()
    return r1
  },
  'log2': (r1) => {
    r1.log2()
    return r1
  },
  'logb': (b, r1) => {
    r1.logb_real(b)
    return r1
  },
  'gamma': (r1) => {
    r1.gamma()
    return r1
  },
  'ln_gamma': (r1) => {
    r1.ln_gamma()
    return r1
  },
  'factorial': (r1) => {
    r1.factorial()
    return r1
  },
  'digamma': (r1) => {
    r1.digamma()
    return r1
  },
  'cchain': cchain,
  'ifelse': function (val1, cond, val2) {
    if (cond) {
      return val1
    } else {
      return val2
    }
  },
  'piecewise': piecewise
}

import {polygamma, trigamma} from './gamma_function'

const APPROXIMATE_REAL_FUNCTIONS = {
  "polygamma": (m, r1) => {
    let f = r1.approximate_as_float()

    r1.set_value(polygamma(m, f))

    return r1
  },
  "trigamma": (r1) => {
    let f = r1.approximate_as_float()

    r1.set_value(trigamma(f))

    return r1
  }
}

const REAL_FUNCTIONS = {...PRECISE_REAL_FUNCTIONS, ...APPROXIMATE_REAL_FUNCTIONS}

export {REAL_FUNCTIONS}