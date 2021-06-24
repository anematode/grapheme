/**
 * @file This file implements the gamma function and related functions, though not to least-significant-bit accuracy.
 */

// Lanczos approximation data
const LANCZOS_COUNT = 7
const LANCZOS_COEFFICIENTS = [
  0.99999999999980993,
  676.5203681218851,
  -1259.1392167224028,
  771.32342877765313,
  -176.61502916214059,
  12.507343278686905,
  -0.13857109526572012,
  9.9843695780195716e-6,
  1.5056327351493116e-7
]

// 1, 1, 2, 6, ...
const INTEGER_FACTORIALS = [ 1 ]

// Populate INTEGER_FACTORIALS
let fact = 1
for (let i = 1; ; ++i) {
  fact *= i

  if (fact === Infinity) { break }

  INTEGER_FACTORIALS.push(fact)
}

const INTEGER_FACTORIAL_LEN = INTEGER_FACTORIALS.length

/**
 * This function accepts a real-valued number x and returns the value of the gamma function evaluated at
 * x. If there is a pole at x, NaN is returned. NaN is returned instead of Infinity to distinguish a pole
 * (at -1, -2, ...) from a massive value (e.g. at 100). The function is relatively accurate and fast, though I
 * would like to assess its accuracy at some point.
 * <br>
 * The algorithm works based on the Lanczos approximation. The original code was written in Python by
 * Fredrik Johansson and published to Wikipedia, which means it is compatible license-wise with this
 * project. The relevant diff (on the Swedish Wikipedia) is at
 * {@link https://sv.wikipedia.org/w/index.php?title=Gammafunktionen&diff=1146966&oldid=1146894}.
 * Values below 0.5 are calculated using the reflection formula, see
 * {@link https://en.wikipedia.org/wiki/Gamma_function#General}.
 * @param x {number} The argument to the gamma function
 * @returns {number} gamma(x), approximately
 * @function gamma
 * @memberOf RealFunctions
 */
export function gamma (x) {
  // Special cases
  if (Number.isNaN(x)) return NaN
  if (x === Infinity) return Infinity
  if (x === -Infinity) return NaN

  // Define gamma specially for integral values
  if (Number.isInteger(x)) {
    // Gamma function undefined for negative integers
    if (x <= 0) return NaN

    // Gamma function too large, return Infinity
    if (x > INTEGER_FACTORIAL_LEN) return Infinity

    return INTEGER_FACTORIALS[x - 1]
  }

  if (x < 0.5) {
    // Reflection formula
    return Math.PI / (Math.sin(Math.PI * x) * gamma(1 - x))
  } else {
    // Lanczos approximation
    x -= 1

    // The value of A_g(x), see https://en.wikipedia.org/wiki/Lanczos_approximation#Introduction
    let z = LANCZOS_COEFFICIENTS[0]
    for (let i = 1; i < LANCZOS_COUNT + 2; ++i) {
      z += LANCZOS_COEFFICIENTS[i] / (x + i)
    }

    const t = x + LANCZOS_COUNT + 0.5
    const sqrt2Pi = Math.sqrt(2 * Math.PI) // for performance, since Math.sqrt can be overwritten

    return sqrt2Pi * Math.pow(t, (x + 0.5)) * Math.exp(-t) * z
  }
}

/**
 * The factorial of x. This function accepts all numerical values and just internally uses the gamma function.
 * @param x {number} The argument to the factorial function
 * @returns {number} factorial(x), approximately (but exact if possible for integer x)
 * @function factorial
 * @memberOf RealFunctions
 */
export function factorial (x) {
  return gamma(x + 1)
}

/**
 * The log-gamma or ln-gamma function, commonly used because the gamma function blows up fast and it is
 * useful to work with its larger values. It is just the natural logarithm of the gamma function. The
 * algorithm is identical to the above, except there is no special case for positive integers > 2 (since
 * there is little point, and the list would have to be enormous).
 * <br>
 * Handling of special values: NaN -> NaN, Infinity -> Infinity, -Infinity -> NaN
 * @param x {number} The argument to the lnGamma function
 * @returns {number} lnGamma(x), approximately
 * @function lnGamma
 * @memberOf RealFunctions
 */
export function lnGamma (x) {
  // Special cases
  if (Number.isNaN(x)) return NaN
  if (x === Infinity) return Infinity
  if (x === -Infinity) return NaN

  if (x <= 0) {
    // Handle negative numbers
    if (Number.isInteger(x)) return NaN

    // If the floor of x is an odd number, then gamma(x) is negative and thus NaN should be returned.
    if (Math.floor(x) % 2 === 1) return NaN
  }

  // lnGamma(1) = lnGamma(2) = 0; the algorithm is inexact for the former
  if (x === 1 || x === 2) return 0

  if (x < 0.5) {
    // Reflection formula, as above
    const reflected = lnGamma(1 - x)

    const lnPi = Math.log(Math.PI) // for performance, since Math.log can be overwritten

    return lnPi - Math.log(Math.sin(Math.PI * x)) - reflected
  } else {
    // See above for explanation
    x -= 1

    let z = LANCZOS_COEFFICIENTS[0]
    for (let i = 1; i < LANCZOS_COUNT + 2; ++i) {
      z += LANCZOS_COEFFICIENTS[i] / (x + i)
    }

    const t = x + LANCZOS_COUNT + 0.5
    const lnSqrt2Pi = Math.log(2 * Math.PI) / 2 // for performance, since Math.log can be overwritten

    return lnSqrt2Pi + Math.log(t) * (x + 0.5) - t + Math.log(z)
  }
}
