/**
 * @file Basic functions for common operations on floating-point numbers.
 */

/**
 * Returns x + y.
 * @param x {number}
 * @param y {number}
 * @returns {number}
 * @function add
 * @memberOf RealFunctions
 */
export function Add (x, y) {
  return x + y
}

/**
 * Returns x - y.
 * @param x {number}
 * @param y {number}
 * @returns {number}
 * @function subtract
 * @memberOf RealFunctions
 */
export function Subtract (x, y) {
  return x - y
}

/**
 * Returns x * y.
 * @param x {number}
 * @param y {number}
 * @returns {number}
 * @function multiply
 * @memberOf RealFunctions
 */
export function Multiply (x, y) {
  return x * y
}

/**
 * Returns x / y.
 * @param x {number}
 * @param y {number}
 * @returns {number}
 * @function divide
 * @memberOf RealFunctions
 */
export function Divide (x, y) {
  return x / y
}

/**
 * Returns the greatest common divisor of a and b. Uses the Euclidean algorithm. Returns NaN if one of them is not an
 * integer, and the non-zero argument if one of them is zero (0 if both are zero).
 * @param a {number}
 * @param b {number}
 * @returns {number}
 * @function gcd
 * @memberOf RealFunctions
 */
export function Gcd (a, b) {
  if (!Number.isInteger(a) || !Number.isInteger(b)) return NaN

  a = Math.abs(a)
  b = Math.abs(b)

  if (a === 0) { return b }
  if (b === 0) { return a }

  if (b > a) {
    const tmp = a
    a = b
    b = tmp
  }

  while (true) {
    if (b === 0) { return a }

    a %= b

    if (a === 0) { return b }

    b %= a
  }
}

/**
 * Returns the least common multiple of two a and b. Returns NaN if one of them is not an integer, and returns the
 * non-zero argument if one of them is zero (0 if both are zero).
 * @param a {number}
 * @param b {number}
 * @returns {number}
 * @function lcm
 * @memberOf RealFunctions
 */
export function Lcm (a, b) {
  if (a === 0) { return Math.abs(b) }
  if (b === 0) { return Math.abs(a) }

  const abGCD = gcd(a, b)
  return Math.abs(a / abGCD * b)
}
