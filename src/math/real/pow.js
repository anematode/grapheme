/**
 * @file This file allows the computation of pow with "near-rational" numbers.
 */
import { doubleToRational } from './rational.js'

// Computes the real branch of a ^ (c/d), where c and d are integers.
function powRational (a, c, d) {
  // Simple return cases
  if (d === 0 || Number.isNaN(c) || Number.isNaN(d) || !Number.isInteger(c) || !Number.isInteger(d) || Number.isNaN(a)) { return NaN }
  if (a === 0) return 0

  const evenDenom = d % 2 === 0
  const evenNumer = c % 2 === 0

  if (evenDenom && a < 0) return NaN

  if (d < 0) {
    c = -c
    d = -d
  }

  // Now we know that a is not NaN, c is an integer, and d is a nonzero positive integer. Also, the answer is not NaN.
  const mag = Math.pow(Math.abs(a), c / d)

  if (a >= 0) { // Can just do Math.pow
    return mag
  } else if (a === 0) {
    return 0
  } else {
    // We know that evenDenom is false
    return evenNumer ? mag : -mag
  }
}

/**
 * Given a < 0 and non-integer b, try to compute a ^ b. We try to convert b to a nearby rational number. If there is no
 * such rational number, we assume that b is irrational and simply return NaN. If there is such a rational number p/q,
 * then we return NaN if q is even, and otherwise return the mathematical value.
 * @param a {number} The base of the exponential
 * @param b {number} The exponent
 * @private
 */
function powSpecial (a, b) {
  const [ num, den ] = doubleToRational(b)

  // deemed irrational
  if (!den) return NaN

  // integer, just use <i>Math.pow</i> directly
  if (den === 1) return Math.pow(a, num)

  return powRational(a, num, den)
}

/**
 * This function computes a^b, where a and b are floats, but does not always return NaN for a < 0 and b ≠ Z. The
 * method by which this is bodged is specified in Grapheme Theory. The idea is that something like pow(-1, 1/3), instead
 * of returning NaN, returns -1. For the special cases, it takes about 0.006 ms per evaluation on my computer.
 *
 * There are some special cases:
 *   a. if a === b === 0, 1 is returned (this is same as <i>Math.pow</i>)
 *   b. if a is NaN or b is NaN, NaN is returned
 *   c. if a < 0, b not an integer, a special algorithm is used (see above)
 *   d. The rest of the cases are identical to <i>Math.pow</i>.
 *
 * Contrast these cases with <i>Math.pow</i> at https://tc39.es/ecma262/#sec-numeric-types-number-exponentiate
 * @param a {number} The base of the exponential
 * @param b {number} The exponent
 * @returns {number} a ^ b as described
 * @function pow
 * @memberOf RealFunctions
 */
export function pow (a, b) {
  if (Number.isNaN(a) || Number.isNaN(b)) return NaN

  if (a < 0 && a > -Infinity && !Number.isInteger(b)) return powSpecial(a, b)

  return Math.pow(a, b)
}
