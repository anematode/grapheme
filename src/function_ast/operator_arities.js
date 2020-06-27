
// List of operators to support: *, /, -, +, ^, cos, sin, tan, (hyperbolic variants), (inverses), (inverse hyperbolics),
// sqrt, cbrt, ln, log10, log2, logb, gamma, digamma, trigamma, polygamma, pow_rational, max, min, mod, remainder, floor
// ceil, and, or, cchain, ifelse

const Signatures = {
  '*': {
    min: 2,
    max: 2,
    returns: "real"
  },
  '/': {
    min: 2,
    max: 2,
    returns: "real"
  },
}
