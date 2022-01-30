
// The actual types and typecasts used by Grapheme.

// CONCRETE TYPES

import { ConcreteType, MathematicalType } from './type.js'
import { NullableBoolean } from '../math/other/boolean_functions.js'
import { NullableInteger } from '../math/other/integer_functions.js'
import { FastBooleanInterval } from '../math/fast_interval/fast_boolean_interval.js'
import { FastRealInterval } from '../math/fast_interval/fast_real_interval.js'
import { Complex } from '../math/complex/complex.js'

// The boolean type is nullable. meaning it takes on a value of 0, 1, or NaN. -0, false, and true are also ACCEPTED as
// values, but aren't used that way internally, since each is implicitly casted to the correct value in all numeric
// calculations.
let concreteBoolean = new ConcreteType({
  name: "bool",
  isPrimitive: true,
  init: () => 0,

  // The typechecks are for usability, not strictness
  typecheck: NullableBoolean.isUsableNullableBoolean,
  typecheckVerbose: NullableBoolean.typecheckUsableNullableBoolean,
})

// Integers can be any number that's not a non-integral finite number (so they can be ±Infinity, NaN) but they can
// overflow--meaning any operation that takes them out of the [-2^53 - 1, 2^53 - 1] safe range
let concreteInt = new ConcreteType({
  name: "int",
  isPrimitive: true,
  init: () => 0,

  typecheck: NullableInteger.isNullableInteger,
  typecheckVerbose: NullableInteger.typecheckNullableInteger
})

// Real can be ANY floating-point number
let concreteReal = new ConcreteType({
  name: "real",
  isPrimitive: true,
  init: () => 0,

  typecheck: b => typeof b === "number",
  typecheckVerbose: b => (typeof b !== "number") ? ("Expected JS number, found type " + (typeof b)) : "",
})

let concreteComplex = new ConcreteType({
  name: "complex",
  isPrimitive: false,
  init: () => new Complex(0, 0),

  typecheck: b => b instanceof Complex,
  typecheckVerbose: b => (b instanceof Complex) ? "Expected complex number" : "",
  clone: c => new Complex(c.re, c.im),
  copyTo: (src, dst) => { dst.re = src.re; dst.im = src.im; }
})

let concreteIntervalBoolean = new ConcreteType({
  name: "interval_bool",
  isPrimitive: false,
  init: () => new FastBooleanInterval(false, false, 0b111),

  typecheck: b => b instanceof FastBooleanInterval,
  clone: b => new FastBooleanInterval(b.min, b.max, b.info),
  copyTo: (src, dst) => { dst.min = src.min; dst.max = src.max; dst.info = src.info }
})

let concreteIntervalReal = new ConcreteType({
  name: "interval_real",
  isPrimitive: false,
  init: () => new FastRealInterval(0, 0, 0b1111),

  typecheck: b => b instanceof FastRealInterval,
  clone: b => new FastRealInterval(b.min, b.max, b.info),
  copyTo: (src, dst) => { dst.min = src.min; dst.max = src.max; dst.info = src.info }
})

let concreteIntervalInt = new ConcreteType({
  ...concreteIntervalReal,
  name: "interval_int"
})
/**
 * MATHEMATICAL TYPES
 */

let mathematicalReal = new MathematicalType({
  name: "real",
  concreteTypes: {
    "normal": concreteReal,
    "interval": concreteIntervalReal
  }
})

let mathematicalInt = new MathematicalType({
  name: "int",
  concreteTypes: {
    "normal": concreteInt,
    "interval": concreteIntervalInt
  }
})

let mathematicalComplex = new MathematicalType({
  name: "complex",
  concreteTypes: {
    "normal": concreteComplex
  }
})

export function defineConcreteType (concreteType) {
  let { name } = concreteType

  concreteTypes.set(name, concreteType)
}

export function defineMathematicalType (type) {
  let { name } = type

  mathematicalTypes.set(name, type)
}

/**
 * "Intelligently" convert an object to the corresponding concrete type object. Returns null if no such type is found
 * @param o {any}
 * @returns {ConcreteType|null}
 */
export function toConcreteType (o) {
  if (typeof o === "string") return concreteTypes.get(o) ?? null

  return (o instanceof ConcreteType) ? o : null
}

/**
 * "Intelligently" convert an object to the corresponding mathematical type object
 * @param o {*}
 * @returns {MathematicalType|null}
 */
export function toMathematicalType (o) {
  if (typeof o === "string") return mathematicalTypes.get(o) ?? null

  return (o instanceof MathematicalType) ? o : null
}

let concreteTypes = new Map()
let mathematicalTypes = new Map()

  // Concrete types
;[concreteBoolean, concreteInt, concreteReal, concreteIntervalBoolean, concreteIntervalInt, concreteIntervalReal, concreteComplex].forEach(defineConcreteType)

// abstract types
;[mathematicalReal, mathematicalInt, mathematicalComplex].forEach(defineMathematicalType)
