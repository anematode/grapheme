/**
 * @file This file defines functions for bit-level manipulation of double-precision floating point numbers. More
 * information can be found in Grapheme Theory.
 */

/**
 * Check endianness. The functions in this file will not work on big-endian systems, so we need to throw an error if that is the case.
 * Credit goes to Lucio Pavia on StackOverflow, specifically {@link https://stackoverflow.com/a/52827031/13458117|this answer}.
 * It is released under CC BY-SA 4.0, which is compatible with this project.
 * @ignore
 */
const isBigEndian = (() => {
  const array = new Uint8Array(4)
  const view = new Uint32Array(array.buffer)
  return !((view[0] = 1) & array[0])
})()
if (isBigEndian) throw new Error('only works on little-endian systems; your system is mixed- or big-endian.')

// Used for bit-level manipulation of floats
export const floatStore = new Float64Array(1)
export const intView = new Uint32Array(floatStore.buffer)

/**
 * Returns the next floating point number after a positive x, but doesn't account for special cases.
 * @param x {number}
 * @returns {number}
 * @private
 */
function _roundUp (x) {
  floatStore[0] = x

  if (++intView[0] === 4294967296 /* uint32_max + 1 */) ++intView[1]

  return floatStore[0]
}

/**
 * Returns the previous floating point number before a positive x, but doesn't account for special cases.
 * @param x {number}
 * @returns {number}
 * @private
 */
function _roundDown (x) {
  floatStore[0] = x

  if (--intView[0] === -1) --intView[1]

  return floatStore[0]
}

/**
 * Returns the next floating point number after x. For example, roundUp(0) returns Number.MIN_VALUE.
 * Special cases (±inf, NaNs, 0) are handled separately. (An interesting special case is -Number.MIN_VALUE,
 * which would normally return -0 and thus must be handled separately.) Then, the float is put into a TypedArray,
 * treated as an integer, and incremented, which sets it to the next representable value. roundUp should
 * NEVER return -0 or -Infinity, but it can accept those values. On my computer both these functions take about
 * 20 ns / call (October 2020). They need to be performant because they are called very often (every interval
 * function, pretty much).
 * @param x {number} Any floating-point number
 * @returns {number} The next representable floating-point number, handling special cases
 * @function roundUp
 * @memberOf FP
 */
export function roundUp (x) {
  // Special cases, where the float representation will mess us up
  if (x === Infinity) return Infinity
  if (x === -Infinity) return -Number.MAX_VALUE
  // since -0 === 0, deals with signed zero
  if (x === 0) return Number.MIN_VALUE
  if (Number.isNaN(x)) return NaN

  // Special case unique to roundUp
  if (x === -Number.MIN_VALUE) return 0

  return (x < 0) ? -_roundDown(-x) : _roundUp(x)
}

/**
 * Returns the previous floating point number before x. For example, roundUp(0) returns -Number.MIN_VALUE.
 * See {@link FP.roundUp} for implementation explanation. This function should NEVER return -0 or
 * +Infinity, but it can accept those values; roundDown(0) is -Number.MIN_VALUE and roundDown(Infinity) is
 * Number.MAX_VALUE.
 * @param x {number} Any floating-point number
 * @returns {number} The previous representable floating-point number, handling special cases
 * @function roundDown
 * @memberOf FP
 */
export function roundDown (x) {
  if (x === Infinity) return Number.MAX_VALUE
  if (x === -Infinity) return -Infinity
  if (x === 0) return -Number.MIN_VALUE
  if (Number.isNaN(x)) return NaN

  return (x < 0) ? -_roundUp(-x) : _roundDown(x)
}

// The first positive normal number
const POSITIVE_NORMAL_MIN = 2.2250738585072014e-308

// The first negative normal number
const NEGATIVE_NORMAL_MAX = -POSITIVE_NORMAL_MIN

/**
 * Return whether a number is denormal; see {@link https://en.wikipedia.org/wiki/Denormal_number|Wikipedia} for a
 * technical explanation of what this means. ±0 are not considered denormal numbers. Denormal numbers are sometimes
 * known as subnormal numbers.
 * @param x {number} Any floating-point number
 * @returns {boolean} Whether the number is a denormal number
 * @function isDenormal
 * @memberOf FP
 */
export function isDenormal (x) {
  // Note that NaN will return false, since NaN < anything is false.
  return x !== 0 && x < POSITIVE_NORMAL_MIN && x > NEGATIVE_NORMAL_MAX
}

/**
 * Get the non-biased exponent of a floating-point number x. Equivalent mathematically to floor(log2(abs(x))) for
 * finite values, but more accurate as the precision of log2 is not technically guaranteed. My tests on Chrome suggest
 * that it is actually twice as fast as floor(log2(...)), which is surprising; the culprit is likely the log2 function,
 * which must calculate to full precision before being floored.
 * @param x {number} Any floating-point number
 * @returns {number} The non-biased exponent of that number's floating-point representation
 * @function getExponent
 * @memberOf FP
 */
export function getExponent (x) {
  floatStore[0] = x

  // Mask the biased exponent, retrieve it and convert it to non-biased
  return ((intView[1] & 0x7ff00000) >> 20) - 1023
}

// Internal function
function _getMantissaHighWord () {
  return intView[1] & 0x000fffff
}

/**
 * Get the mantissa of a floating-point number as an integer in [0, 2^52).
 * @param x {number} Any floating-point number
 * @returns {number} An integer in [0, 2^52) containing the mantissa of that number
 * @function getMantissa
 * @memberOf FP
 */
export function getMantissa (x) {
  floatStore[0] = x

  return intView[0] + _getMantissaHighWord() * 4294967296
}

export function getExponentAndMantissa (x) {
  floatStore[0] = x

  return [ ((intView[1] & 0x7ff00000) >> 20) - 1023, intView[0] + _getMantissaHighWord() * 4294967296 ]
}

/**
 * Testing function counting the approximate number of floats between x1 and x2, including x1 but excluding x2. NaN if
 * either is undefined. It is approximate because the answer may sometimes exceed Number.MAX_SAFE_INTEGER, but it is
 * exact if the answer is less than Number.MAX_SAFE_INTEGER.
 * @param x1 {number} The lesser number
 * @param x2 {number} The greater number
 * @returns {number} The number of floats in the interval [x1, x2)
 * @function getExponent
 * @memberOf FP
 */
export function countFloatsBetween (x1, x2) {
  if (Number.isNaN(x1) || Number.isNaN(x2)) { return NaN }

  if (x1 === x2) return 0

  if (x2 < x1) {
    const tmp = x1
    x1 = x2
    x2 = tmp
  }

  const [ x1man, x1exp ] = frExp(x1)
  const [ x2man, x2exp ] = frExp(x2)

  return (x2man - x1man) * 2 ** 53 + (x2exp - x1exp) * 2 ** 52
}

/**
 * Calculates 2 ^ exp, using a customized method for integer exponents. An examination of V8's pow function didn't
 * reveal any special handling, and indeed my benchmark indicates this method is 3 times faster than pow for integer
 * exponents. Note that bit shifts can't really be used except for a restricted range of exponents.
 * @param exp {number} Exponent; intended for use with integers, but technically works with any floating-point number.
 * @returns {number} Returns 2 ^ exp, and is guaranteed to be exact for integer exponents.
 * @function pow2
 * @memberOf FP
 */
export function pow2 (exp) {
  if (!Number.isInteger(exp)) return Math.pow(2, exp)
  if (exp > 1023) return Infinity
  if (exp < -1074) return 0

  if (exp < -1022) {
    // Works because of JS's insane casting systems
    const field = 1 << (exp + 1074)

    if (exp > -1043) { // denormalized case 1
      intView[0] = 0
      intView[1] = field
    } else { // case 2
      intView[0] = field
      intView[1] = 0
    }
  } else {
    intView[0] = 0
    intView[1] = (exp + 1023) << 20
  }

  return floatStore[0]
}

// Counts the number of trailing zeros in a 32-bit integer n; similar to <i>Math.clz32</i>.
function countTrailingZeros (n) {
  let bits = 0

  if (n !== 0) {
    let x = n

    // Suck off groups of 16 bits, then 8 bits, et cetera
    if ((x & 0x0000FFFF) === 0) {
      bits += 16
      x >>>= 16
    }

    if ((x & 0x000000FF) === 0) {
      bits += 8
      x >>>= 8
    }

    if ((x & 0x0000000F) === 0) {
      bits += 4
      x >>>= 4
    }

    if ((x & 0x00000003) === 0) {
      bits += 2
      x >>>= 2
    }

    bits += (x & 1) ^ 1
  } else {
    return 32
  }

  return bits
}

// Internal function
function _mantissaCtz () {
  const bits = countTrailingZeros(intView[0])

  if (bits === 32) {
    const secondWordCount = countTrailingZeros(_getMantissaHighWord())

    return 32 + Math.min(secondWordCount, 20)
  }

  return bits
}

/**
 * Counts the number of trailing zeros in the mantissa of a floating-point number, between 0 and 52.
 * @param d {number} A floating-point number
 * @returns {number} The number of trailing zeros in that number's mantissa
 * @function mantissaCtz
 * @memberOf FP
 */
export function mantissaCtz (d) {
  floatStore[0] = d

  return _mantissaCtz()
}

// Internal function
function _mantissaClz () {
  const bits = Math.clz32(_getMantissaHighWord()) - 12 // subtract the exponent zeroed part

  return bits !== 20 ? bits : bits + Math.clz32(intView[0])
}

/**
 * Counts the number of leading zeros in the mantissa of a floating-point number, between 0 and 52.
 * @param d {number} A floating-point number
 * @returns {number} The number of leading zeros in that number's mantissa
 * @function mantissaClz
 * @memberOf FP
 */
export function mantissaClz (d) {
  floatStore[0] = d

  return _mantissaClz()
}

/**
 * Converts a floating-point number into a fraction in [0.5, 1) or (-1, -0.5], except special cases, and an exponent,
 * such that fraction * 2 ^ exponent gives the original floating point number. If x is ±0, ±Infinity or NaN, [x, 0] is
 * returned to maintain this guarantee.
 * @param x {number} Any floating-point number
 * @returns {number[]} [fraction, exponent]
 * @function frExp
 * @memberOf FP
 */
export function frExp (x) {
  if (x === 0 || !Number.isFinite(x)) return [ x, 0 ]

  // +1 so that the fraction is between 0.5 and 1 instead of 1 and 2
  let exp = getExponent(x) + 1

  // Denormal
  if (exp === -1022) {
    // If the mantissa is the integer m, then we should subtract clz(m) from exp to get a suitable answer
    exp -= _mantissaClz()
  }

  return [ x / pow2(exp), exp ]
}

/**
 * Converts a floating-point number into a numerator, denominator and exponent such that it is equal to n/d * 2^e. n and
 * d are guaranteed to be less than or equal to 2^53 and greater than or equal to 0 (unless the number is ±0, Infinity,
 * or NaN, at which point [x, 1, 0] is returned). See Grapheme Theory for details. n/d is between 0.5 and 1.
 * @param x {number} Any floating-point number
 * @returns {number[]} [numerator, denominator, exponent]
 * @function rationalExp
 * @memberOf FP
 */
export function rationalExp (x) {
  const [ frac, denExponent, exp ] = rationalExpInternal(x)

  let den = pow2(denExponent)

  return [ frac * den, den, exp ]
}

function rationalExpInternal (x) {
  if (x < 0) {
    const [ num, den, exp ] = rationalExpInternal(-x)

    return [ -num, den, exp ]
  }

  if (x === 0 || !Number.isFinite(x)) return [ x, 0, 0 ]

  // Decompose into frac * 2 ^ exp
  const [ frac, exp ] = frExp(x)

  // This tells us the smallest power of two which frac * (2 ** shift) is an integer, which is the denominator
  // of the dyadic rational corresponding to x
  const denExponent = 53 - mantissaCtz(frac)

  return [ frac, denExponent, exp ]
}

/**
 * Converts a floating-point number into an integer and exponent [i, e], so that i * 2^e gives the original number. i
 * will be within the bounds of Number.MAX_SAFE_INTEGER.
 * @param x
 */
export function integerExp (x) {
  const [ frac, denExponent, exp ] = rationalExpInternal(x)

  return [ frac * pow2(denExponent), exp - denExponent]
}

/**
 * Compute an ACCURATE floor log 2 function. floor(log2(268435455.99999994)), for example, returns 28 when it should
 * mathematically return 27.
 * @param x
 */
export function flrLog2 (x) {
  let exp = getExponent(x) + 1

  if (exp === -1022) exp -= _mantissaClz()

  return exp - 1
}
