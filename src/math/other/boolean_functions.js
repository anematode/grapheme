/**
 * Grapheme uses nullable booleans sometimes, to signify that the result of a boolean operation is undefined. For
 * example, sqrt(-1) == sqrt(-2) and sqrt(-1) == sqrt(-1) will both return the null boolean. We represent booleans as
 * 0 (false), 1 (true), or NaN (null). The reasoning here is that we want to propagate undefinedness. If an undefined
 * operation like sqrt(-1) is hidden away behind some boolean operation that in turn returns false, the result may
 * appear "defined" when it should be considered meaningless, since an invalid operation was used. For example, suppose
 * piecewise(condition, a, b) is a when condition is true and b when condition is false. For example, piecewise(x > 0, 1,
 * 0) is 1 for positive x and 0 for nonpositive x. But what if there was something like piecewise(sqrt(x) < 1, 1, 0)?
 * Then it is clearly 1 for x in [0, 1) and 0 for x in [1, inf), but what about x < 0? The sqrt operation is undefined
 * in that range. We have a couple options: throw an error, pretend that undefined operations are false, or return
 * an undefined value (in this case, probably NaN). The last case is the most sensible, but then we need some third
 * boolean value besides true or false. Thus, we use the nullable boolean.
 *
 * Ints and reals have their own "nullable" values: NaN. Interval classes usually have some form of definedness built
 * into them. The only tricky problem is the boolean. We *could* use (true, false, undefined) or (true, false, NaN) to be
 * the representation, but these use different underlying primitives. Choosing (0, 1, NaN) means everything operates in
 * floating-point, enabling greater optimization. Furthermore, NaN is implicitly converted to false in a boolean
 * expression, so user code that doesn't handle undefinedness will treat undefined results as false--which is
 * usually what is intended.
 */

// All these functions assume their inputs are in (-0, +0, 1, false, true, NaN). They return results in the range (0, 1, NaN)
// and propagate NaNs as appropriate
const Functions = Object.freeze({
  not: a => 1 - a,

  and: (a, b) => a * b,
  or: (a, b) => Math.sign(a + b),
  eq: (a, b) => 1 - Math.abs(a - b),
  notEq: (a, b) => Math.abs(a - b)
})

// Compare numerical values, taking into account NaNs and returning nullable booleans. Infinities are treated
// differently than normal; -inf < inf is true and -inf > inf is false, but inf < inf is NaN, for example.
const Comparisons = Object.freeze({
  less: (a, b) => 1 - Math.sign(Math.sign(a - b) + 1), // 1 if a < b, 0 if a >= b, NaN otherwise
  lessEq: (a, b) => 0 - Math.sign(Math.sign(a - b) - 1), // 1 if a <= b, 0 if a > b, NaN otherwise
  greater: (a, b) => 1 - Math.sign(Math.sign(b - a) - 1),
  greaterEq: (a, b) => 0 - Math.sign(Math.sign(b - a) - 1),
  eq: (a, b) => 1 - Math.sign(Math.abs(a - b)),
  notEq: (a, b) => Math.sign(Math.abs(a - b))
})

// Test for values
const Test = Object.freeze({
  true: a => a === 1,
  false: a => a === 0,
  defined: a => a === a,
  undefined: a => a !== a
})

/**
 * Convert any object to a nullable boolean via the following conversion:
 * undefined, null, NaN -> NaN;
 * -0, 0, 0n, "", false, document.all (:P) -> 0,
 * everything else -> 1
 * @param {*} b
 * @returns {number} The nullable boolean
 */
function toNullableBoolean (b) {
  if (b == null || b !== b)
    return NaN

  return +!!b
}

/**
 * Returns true if b can be USED as a nullable boolean (i.e., it is one of -0, 0, false, true, or NaN) because of
 * implicit conversions
 * @param {*} b
 * @returns {boolean} Whether b can be used AS a nullable boolean
 */
function isUsableNullableBoolean (b) {
  return b === 0 || b !== b || typeof b === "boolean"
}

/**
 * Returns true if b is STRICTLY a nullable boolean (i.e., it is one of 0, 1, or NaN)
 * @param {*} b
 * @returns {boolean} Whether b IS a nullable boolean
 */
function isNullableBoolean (b) {
  return b === 1 || b !== b || Object.is(b, 0)
}

/**
 * Returns a descriptive nonempty string if b is not a usable nullable boolean
 * @param {*} b
 * @returns {string}
 */
function typecheckUsableNullableBoolean (b) {
  if (typeof b === "boolean") return ""
  if (typeof b === "number") {
    if (b === 0 || b === 1 || b !== b) return ""
    return `Expected nullable boolean (0, 1, NaN, false, or true), got number ${b}`
  }

  return `Expected nullable boolean (0, 1, NaN, false, or true), got type ${typeof b}`
}

const NullableBoolean = Object.freeze({
  Functions,
  Comparisons,
  Test,
  toNullableBoolean,
  isUsableNullableBoolean,
  isNullableBoolean,
  typecheckUsableNullableBoolean
})

export { NullableBoolean }
