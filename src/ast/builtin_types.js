
// The actual types and typecasts used by Grapheme.

// CONCRETE TYPES

import { ConcreteType, MathematicalType } from './type.js'
import { NullableBoolean } from '../math/other/boolean_functions.js'
import { NullableInteger } from '../math/other/integer_functions.js'
import { FastBooleanInterval } from '../math/fast_interval/fast_boolean_interval.js'
import { FastRealInterval } from '../math/fast_interval/fast_real_interval.js'

// The boolean type is nullable. meaning it takes on a value of 0, 1, or NaN. -0, false, and true are also ACCEPTED as
// values, but aren't used that way internally, since each is implicitly casted to the correct value in all numeric
// calculations.
let concreteBoolean = new ConcreteType({
  name: "bool",
  isPrimitive: true,
  init: () => false,

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

let concreteFastIntervalBoolean = new ConcreteType({
  name: "fast_interval_bool",
  isPrimitive: false,
  init: () => new FastBooleanInterval(false, false, 0b111),

  typecheck: b => b instanceof FastBooleanInterval,
  clone: b => new FastBooleanInterval(b.min, b.max, b.info),
  copyTo: (src, dst) => { dst.min = src.min; dst.max = src.max; dst.info = src.info }
})

let concreteFastIntervalReal = new ConcreteType({
  name: "fast_interval_real",
  isPrimitive: false,
  init: () => new FastRealInterval(0, 0, 0b1111),

  typecheck: b => b instanceof FastRealInterval,
  clone: b => new FastRealInterval(b.min, b.max, b.info),
  copyTo: (src, dst) => { dst.min = src.min; dst.max = src.max; dst.info = src.info }
})

let concreteFastIntervalInt = new ConcreteType({
  ...concreteFastIntervalReal,
  name: "fast_interval_int"
})

let concreteTypeDict = {}
;[concreteBoolean, concreteInt, concreteReal, concreteFastIntervalBoolean, concreteFastIntervalInt, concreteFastIntervalInt].forEach(concreteType => {
  concreteTypeDict[concreteType.name] = concreteType
})

/**
 * ABSTRACT TYPES
 */

let abstractReal = new MathematicalType({
  name: "real",
  concreteTypes: {
    "normal": concreteReal,
    "fast_interval": concreteFastIntervalReal
  }
})
