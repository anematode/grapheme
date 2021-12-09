/**
 * Grapheme uses nullable booleans sometimes, to signify that the result of a boolean operation is undefined. For
 * example, sqrt(-1) == sqrt(-2) and sqrt(-1) == sqrt(-1) will both return the null boolean. We represent booleans as
 * 0 (false), 1 (true), or NaN (null). The reasoning here is that we want to propagate undefinedness. If an undefined
 * operation like sqrt(-1) is hidden away behind some boolean operation that in turn returns false, the result may
 * appear "defined" when it should be considered meaningless, since an invalid operation was used.
 *
 * Ints and reals have their own "nullable" values: NaN. Interval classes usually have some form of definedness built
 * into them. The only real problem is the boolean. We *could* use (true, false, undefined) or (true, false, NaN) to be
 * the representation, but these use different underlying primitives. Choosing (0, 1, NaN) means everything operates in
 * floating-point, enabling greater optimization. Furthermore, NaN is implicitly converted to false in a boolean
 * expression, so user code that doesn't care about undefinedness will treat undefined results as false--which is
 * usually the most sensible.
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

/**
 * Convert any object to a nullable boolean via the following conversion:
 * undefined, null, NaN -> NaN;
 * -0, 0, 0n, "", false, document.all -> 0,
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

const NullableBoolean = Object.freeze({
  Functions,
  Comparisons,
  toNullableBoolean,
  isUsableNullableBoolean,
  isNullableBoolean
})

export { NullableBoolean }
