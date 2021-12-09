
/**
 * Integers are interesting, in that ideally we want to catch overflow (ex., 3^100 will not be represented exactly), but
 * in many contexts that overflow isn't what we care about, and we just want float values. For now, we will let integers
 * be anything except non-integer finite values. In other words, we permit integers to be -Infinity, Infinity, NaN, and
 * any integer.
 */

let isSafe = Math.isSafeInteger
let isNaN = Math.isNaN

// All functions assume they are taking in nullable integers
const Functions = Object.freeze({
  add: (a, b) => {
    let result = a + b
    return isSafe(result) ? result : NaN
  },
  sub: (a, b) => {
    let result = a - b
    return isSafe(result) ? result : NaN
  },
  mul: (a, b) => {
    let result = a * b
    return isSafe(result) ? result : NaN
  },
  mod: (a, b) => {
    return a % b
  },
  floordiv: (a, b) => {
    // Unsafe when a = -2^53 and b = -1

    let result = Math.floor(a / b)
    return isSafe(result) ? result : NaN
  }
})

/**
 *
 * @param {*} i
 * @returns {boolean} Whether the given parameter is a valid nullable integer
 */
function isNullableInteger (i) {
  return isSafe(i) || isNaN(i)
}


function typecheckNullableInteger (i) {
  let isInteger = isSafe(i)
  let isNaN = isNaN(i)

  if (!isInteger && !isNaN) {
    if (typeof i === "number") {
      return "Expected nullable integer (integer between -2^53 and 2^53 - 1, or NaN), found number " + i
    } else {
      return "Expected nullable integer (integral JS number between -2^53 and 2^53 - 1 or NaN), found type " + (typeof i)
    }
  }

  return ""
}

const NullableInteger = Object.freeze({
  Functions,
  isNullableInteger,
  typecheckNullableInteger
})

export { NullableInteger }
