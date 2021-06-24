

// Defines an interface between a user-facing getter/setter and the internal properties of an element. There is not a
// one-to-one correspondence between the user-facing "properties" and the actual underlying properties. In fact, some
// operations by the user may be no-ops while others may fail silently, and still others may throw an error when
// appropriate. The programmer can adjust this behavior by defining the _set and get functions. But using a bunch of if
// statements is generally clunky and not very expressive. Thus, we define for most elements an INTERFACE, an easier way
// to abstract this getter/setter system.

// A natural question is: why do you have such a system? Wouldn't this make property accesses unbearably slow? Well, the
// user generally isn't supposed to make a ridiculous amount of elements. Plus, most of Grapheme's time is spent in the
// update function, which should be optimized first. If the property system turns out to be a serious drag, then I'll
// find a workaround. But even just for me, having this kind of system would help with catching my own errors.


import {Vec2} from "../math/vec/vec2.js"
import {deepMerge, isTypedArray} from "./utils.js"
import {Color, lookupCompositionType} from "../styles/definitions.js"
import {Props} from "./props.js"

/**
 * Print object to string in a way that isn't too painful (limit the length of the string to 100 chars or so)
 * @param obj
 * @param limit {number} (Estimated) number of characters to restrict the display to
 */
function relaxedPrint (obj, limit=100) {
  if (typeof obj === "number" || typeof obj === "boolean") {
    return '' + obj
  } else if (typeof obj === "function") {
    let name = obj.name
    let ret = name ? "[function " + name : "[function]"

    if (ret.length > limit)
      return "..."

    return ret
  } else if (typeof obj === "object") {
    let keys = Object.keys(obj).slice(0, 3)

    if (keys.length === 0) {
      return "{}"
    }

    let keysUsed = 0
    let keyValues = []
    let totalLen = 5

    for (let key of keys) {
      let n = obj[key]
      let pp = relaxedPrint(n, limit - totalLen - 4)

      totalLen += pp.length + 4

      if (totalLen > limit) break
      keyValues.push(pp)
      keysUsed++
    }

    if (keysUsed === 0) {
      return "{ ... }"
    } else {
      let ret = "{ "

      for (let i = 0; i < keysUsed; ++i) {
        ret += keys[i]
        ret += ': '
        ret += keyValues[i]
        if (i !== keysUsed - 1)
          ret += ', '
      }

      return ret + " }"
    }
  } else if (typeof obj === "string") {
    if (obj.length <= limit - 2) return `"${obj}"`

    let len = Math.max(((limit / 2) | 0) - 4, 0)

    return '"' + obj.slice(0, len) + " ... " + obj.slice(obj.length - len) + '"'
  }
}

function genTypecheckRangedInteger (lo, hi) {
  if (lo === undefined) {
    return obj => (!Number.isInteger(obj) || obj > hi) ? `Expected $p to be an integer less than ${hi}; got $v.` : undefined
  } else if (hi === undefined) {
    return obj => (!Number.isInteger(obj) || obj < lo) ? `Expected $p to be an integer greater than ${lo}; got $v.` : undefined
  } else {
    return obj => (!Number.isInteger(obj) || obj < lo || obj > hi) ? `Expected $p to be an integer in the range [${lo}, ${hi}], inclusive; got $v.` : undefined
  }
}

function typecheckInteger (obj) {
  if (!Number.isInteger(obj))
    return "Expected $p to be an integer, not $v."
}

function genTypecheckRangedNumber (lo, hi, finite) {
  let finiteMsg = finite ? "finite " : ""

  if (lo === undefined) {
    return obj => (typeof obj !== "number" || obj > hi || (finite && !Number.isFinite(obj))) ? `Expected $p to be a ${finiteMsg}number less than ${hi}, got $v.` : undefined
  } else if (hi === undefined) {
    return obj => (typeof obj !== "number" || obj < lo) ? `Expected $p to be a ${finiteMsg}number greater than ${lo}, got $v.` : undefined
  } else {
    return obj => (typeof obj !== "number" || obj < lo || obj > hi) ? `Expected $p to be a ${finiteMsg}number in the range [${lo}, ${hi}], inclusive; got $v.` : undefined
  }
}

function typecheckNumber (obj) {
  if (typeof obj !== "number")
    return "Expected $p to be a number, got $v."
}

function typecheckFiniteNumber (obj) {
  if (typeof obj !== "number" || !Number.isFinite(obj))
    return "Expected $p to be a finite number, got $v."
}

function createIntegerTypecheck (check) {
  let min = check.min
  let max = check.max

  if (min === undefined && max === undefined) {
    return typecheckInteger
  } else {
    return genTypecheckRangedInteger(min, max)
  }
}

function createNumberTypecheck (check) {
  let min = check.min
  let max = check.max
  let finite = check.finite

  if (min === undefined && max === undefined) {
    if (finite) {
      return typecheckFiniteNumber
    } else {
      return typecheckNumber
    }
  } else {
    return genTypecheckRangedNumber(min, max, finite)
  }
}

function booleanTypecheck (obj) {
  return (typeof obj !== "boolean") ? "Expected $p to be a boolean, got $v." : undefined
}

function stringTypecheck (obj) {
  return (typeof obj !== "string") ? "Expected $p to be a string, got $v." : undefined
}

function createTypecheck (check) {
  if (typeof check === "string")
    check = { type: check }
  let type = check.type

  switch (type) {
    case "integer":
      return createIntegerTypecheck (check)
    case "number":
      return createNumberTypecheck (check)
    case "boolean":
      return booleanTypecheck
    case "string":
      return stringTypecheck
    default:
      throw new Error(`Unrecognized typecheck type ${type}.`)
  }
}

let CONVERSION_MSG

function colorConversion (obj) {
  obj = Color.fromObj(obj)
  if (obj) return obj

  CONVERSION_MSG = `Expected $p to be convertible to a Color, got $v.`
}

function vec2Conversion (obj) {
  let x=0, y=0

  if (typeof obj === "number" || typeof obj === "string") {
    CONVERSION_MSG = "Expected $p to be convertible to a Vec2, got $v."
  } else if (typeof obj === "object") {
    if (Array.isArray(obj)) {
      if (obj.length !== 2) {
        CONVERSION_MSG = `Expected $p to be convertible to a Vec2, got $v (length ${obj.length}).`
      } else {
        x = obj[0]
        y = obj[1]
      }
    } else {
      x = obj.x ?? obj.re
      y = obj.y ?? obj.im
    }
  }

  return new Vec2(x, y)
}

function vec2NonFlatArrayConversion (arr, f32=true) {
  let ret = new (f32 ? Float32Array : Float64Array)(arr.length / 2)
  let retIndex = -1

  for (let i = 0; i < arr.length; ++i) {
    let elem = arr[i]

    if (elem.x) {
      ret[++retIndex] = elem.x
      ret[++retIndex] = elem.y
    } else if (Array.isArray(elem)) {
      if (elem.length !== 2) {
        CONVERSION_MSG = `Expected $p to be convertible to a flat array of Vec2s, found element ${relaxedPrint(elem)} at index ${i}`
        return
      }

      ret[++retIndex] = elem[0]
      ret[++retIndex] = elem[1]
    } else {
      CONVERSION_MSG = `Expected $p to be convertible to a flat array of Vec2s, found element ${relaxedPrint(elem)} at index ${i}`
      return
    }
  }
}

function vec2ArrayConversion (obj, f32=true) {
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; ++i) {
      if (typeof obj[i] !== "number") {
        return vec2NonFlatArrayConversion(obj)
      }
    }

    // Obj is just an array of numbers
    if (obj.length & 1) {
      CONVERSION_MSG = `Expected $p to be convertible to a flat array of Vec2s, got numeric array of odd length ${obj.length}.`
      return
    }

    return new (f32 ? Float32Array : Float64Array)(obj)
  } else if (isTypedArray(obj)) {
    if (obj.length & 1) {
      CONVERSION_MSG = `Expected $p to be convertible to a flat array of Vec2s, got typed array of odd length ${obj.length}.`
      return
    }

    if (f32 && obj instanceof Float32Array)
      return obj
    if (!f32 && obj instanceof Float64Array)
      return obj

    return new (f32 ? Float32Array : Float64Array)(obj)
  }
}

/**
 * Return a function which, when evaluated, either sets CONVERSION_MSG to a message indicating why the conversion is
 * impossible and returns nothing or returns a converted result.
 * @param conversion
 */
function createConversion (conversion) {
  if (typeof conversion === "string")
    conversion = { type: conversion }
  else if (typeof conversion === "function")
    return conversion

  let type = conversion.type

  switch (type) {
    case "Color":
      return colorConversion
    case "Vec2":
      return vec2Conversion
    case "f32_vec2_array":
      return vec2ArrayConversion
    default:
      throw new Error(`Unknown conversion type ${type}.`)
  }
}

export function constructInterface (description) {
  const interfaceDesc = description.interface
  const internal = description.internal

  //if (!interfaceDesc) throw new Error("Interface description lacks an interface")
  //if (!internal) throw new Error("Interface description lacks an internal description")

  // Instructions on how to get and set properties, respectively
  const setters = {}
  const getters = {}

  function handleProp (name, desc) {
    let needsSetter = !desc.readOnly
    let needsGetter = !desc.writeOnly

    if (!needsSetter && !needsGetter) return

    if (needsSetter) {
      let setter = {}
      let { typecheck, target, setTarget, setAs, conversion, aliases, merge } = desc

      setAs = Props.toBit(setAs)

      if (typecheck) setter.typecheck = createTypecheck(typecheck)
      if (conversion) setter.conversion = createConversion(conversion)
      if (setAs) setter.setAs = setAs
      if (merge) setter.merge = true
      setter.target = setTarget ?? target ?? name

      setters[name] = setter

      if (aliases) for (const alias of Array.from(aliases)) setters[alias] = setter
    }


    if (needsGetter) {
      let getter = {}

      let { target, getAs, getTarget } = desc
      getAs = Props.toBit(getAs)

      if (getAs) getter.getAs = getAs

      getter.target = getTarget ?? target ?? name
      getters[name] = getter
    }
  }

  for (let propName in interfaceDesc) {
    if (interfaceDesc.hasOwnProperty(propName)) {
      let propDesc = interfaceDesc[propName]

      handleProp(propName, propDesc)
    }
  }

  function _set (props, propName, value) {
    let setter = setters[propName]

    if (!setter) {
      if (getters[propName])
        throw new Error(`Parameter "${propName}" is read-only.`)
      throw new Error(`Unrecognized parameter "${propName}".`)
    }

    if (setter.typecheck) {
      let result = setter.typecheck(value)
      if (result)
        throw new TypeError(`Failed typecheck: ${result.replace("$v", relaxedPrint(value)).replace("$p", 'parameter "' + propName + '"')}`)
    }

    if (setter.conversion) {
      let newValue = setter.conversion(value)

      if (newValue === undefined)
        throw new TypeError(`Failed conversion: ${result.replace("$v", relaxedPrint(value)).replace("$p", 'parameter "' + propName + '"')}`)

      value = newValue
    }

    let setAs = setter.setAs ?? 0 /* real */
    let merge = !!setter.merge

    if (merge) {
      props.set(setter.target, deepMerge(props.get(setter.target, setAs), value), setAs)
    } else {
      props.set(setter.target, value, setAs)
    }
  }

  function set (elem, propName, value) {
    if (typeof propName === "object") {
      setDict(elem.props, propName)
    } else if (typeof propName === "string") {
      _set(elem.props, propName, value)
    }
  }

  function get (elem, propName) {
    let getter = getters[propName]

    if (!getter) {
      if (setters[propName])
        throw new Error(`Parameter "${propName}" is write-only.`)
      throw new Error(`Unrecognized parameter "${propName}".`)
    }

    let getAs = getter.getAs ?? 0 /* real */

    return elem.props.get(getter.target, getAs)
  }

  function setDict (props, propDict) {
    let ret = {}

    for (let propName in propDict) {
      _set(props, propName, propDict[propName])
    }
  }

  /**
   * Given the internal description of the properties, compute their values based on their user values, current values,
   * et cetera. If isInitialized is true, compute all properties as if they are new.
   * @param props
   * @param isInitialized
   */
  function computeProps (props, isInitialized=true) {
    function getDefault (instructions) {
      let def = instructions.default

      if (instructions.evaluateDefault) {
        if (typeof def !== "function")
          throw new Error("Internal instruction computation instruction says to evaluate the default value, but given default is not a function")
        return def()
      }

      return def
    }

    for (let propName in internal) {
      let instructions = internal[propName]
      let computed = instructions.computed
      let doCompose = !!instructions.compose

      if (computed === "none") continue
      if (computed === "default") {
        // Check whether the current value is undefined. If so, fill it with the default
        if (props.get(propName) === undefined) {
          props.set(propName, getDefault(instructions))
        }
      } else if (computed === "user") {
        // Check whether the user value is undefined, then the value, then the default
        let store = props.getPropertyStore(propName) // just to make things more efficient
        if (!store) {
          props.set(propName, getDefault(instructions))
        } else {
          if (store.userValue !== undefined) {
            if (doCompose) {
              let type = lookupCompositionType(instructions.type)
              if (!type) throw new Error(`Unknown composition type ${instructions.type}.`)

              props.set(propName, type.compose(getDefault(instructions) ?? type.default, store.userValue))
            } else {
              props.set(propName, store.userValue)
            }
          } else if (store.value !== undefined) {
            // do nothing
          } else {
            props.set(propName, getDefault(instructions))
          }
        }
      }
    }
  }

  return { set, get, computeProps, description }
}

const attachGettersAndSetters = () => null
export { attachGettersAndSetters }

const NullInterface = constructInterface({ interface: {}, internal: {} })
export { NullInterface }
