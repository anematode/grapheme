
// The actual types and typecasts used by Grapheme.

// CONCRETE TYPES

import { ConcreteType, Type } from './type.js'
import { FastBooleanInterval } from '../math/fast_interval/fast_boolean_interval.js'
import { FastRealInterval } from '../math/fast_interval/fast_real_interval.js'

// A boolean may be true/false OR NaN, the latter signifying an undefined value
let concreteNormalBoolean = new ConcreteType({
  name: "bool",
  isPrimitive: true,
  init: () => false,
  typecheck: b => typeof b === "boolean" || Number.isNaN(b),
  typecheckVerbose: b => (typeof b !== "boolean" && !Number.isNaN(b)) ? ("Expected JS boolean, found type " + (typeof b)) : "",
})

let concreteNormalInt = new ConcreteType({
  name: "int",
  isPrimitive: true,
  init: () => 0,
  typecheck: i => Number.isInteger(i) || Number.isNaN(i),
  typecheckVerbose: i => {
    let isInteger = Number.isInteger(i)
    let isNaN = Number.isNaN(i)

    if (!isInteger && !isNaN) {
      if (typeof i === "number") {
        return "Expected integral JS number or NaN, found type " + (typeof i)
      } else {
        return "Expected integer or NaN, found non-integral number " + i
      }
    }

    return ""
  }
})

let concreteNormalReal = new ConcreteType({
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
;[concreteNormalBoolean, concreteNormalInt, concreteNormalReal, concreteFastIntervalBoolean, concreteFastIntervalInt, concreteFastIntervalInt].forEach(concreteType => {
  concreteTypeDict[concreteType.name] = concreteType
})

/**
 * ABSTRACT TYPES
 */

let abstractReal = new Type({
  name: "real",
  concreteTypes: {
    "normal": concreteNormalReal,
    "fast_interval": concreteFastIntervalReal
  }
})

export const Types = {
  real: abstractReal
}

/**
 * Convert string to concrete type
 * @return {ConcreteType}
 */
export function toConcreteType (t) {
  if (t instanceof ConcreteType) {
    return t
  }

  if (typeof t === "string") {
    let type = concreteTypeDict[t]

    if (!type) throw new Error("Concrete type '" + t + "' not found")
    return type
  }

  throw new TypeError("Argument to toConcreteType must be a concrete type or string")
}
