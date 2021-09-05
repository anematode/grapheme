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

import { Vec2 } from '../math/vec/vec2.js'
import { deepMerge, isTypedArray } from './utils.js'
import { Color, lookupCompositionType } from '../styles/definitions.js'
import { Props } from './props.js'
import { isValidVariableName } from '../ast/parse_string.js'

/**
 * Print object to string in a way that isn't too painful (limit the length of the string to 100 chars or so)
 * @param obj
 * @param limit {number} (Estimated) number of characters to restrict the display to
 */
export function relaxedPrint (obj, limit = 100) {
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return '' + obj
  } else if (typeof obj === 'function') {
    let name = obj.name
    let ret = name ? '[function ' + name : '[function]'

    if (ret.length > limit) return '...'

    return ret
  } else if (typeof obj === 'object') {
    let keys = Object.keys(obj).slice(0, 3)

    if (keys.length === 0) {
      return '{}'
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
      return '{ ... }'
    } else {
      let ret = '{ '

      for (let i = 0; i < keysUsed; ++i) {
        ret += keys[i]
        ret += ': '
        ret += keyValues[i]
        if (i !== keysUsed - 1) ret += ', '
      }

      return ret + ' }'
    }
  } else if (typeof obj === 'string') {
    if (obj.length <= limit - 2) return `"${obj}"`

    let len = Math.max(((limit / 2) | 0) - 4, 0)

    return '"' + obj.slice(0, len) + ' ... ' + obj.slice(obj.length - len) + '"'
  }
}

function genTypecheckRangedInteger (lo, hi) {
  if (lo === undefined) {
    return obj =>
      !Number.isInteger(obj) || obj > hi
        ? `Expected $p to be an integer less than ${hi}; got $v.`
        : undefined
  } else if (hi === undefined) {
    return obj =>
      !Number.isInteger(obj) || obj < lo
        ? `Expected $p to be an integer greater than ${lo}; got $v.`
        : undefined
  } else {
    return obj =>
      !Number.isInteger(obj) || obj < lo || obj > hi
        ? `Expected $p to be an integer in the range [${lo}, ${hi}], inclusive; got $v.`
        : undefined
  }
}

function typecheckInteger (obj) {
  if (!Number.isInteger(obj)) return 'Expected $p to be an integer, not $v.'
}

function genTypecheckRangedNumber (lo, hi, finite) {
  let finiteMsg = finite ? 'finite ' : ''

  if (lo === undefined) {
    return obj =>
      typeof obj !== 'number' || obj > hi || (finite && !Number.isFinite(obj))
        ? `Expected $p to be a ${finiteMsg}number less than ${hi}, got $v.`
        : undefined
  } else if (hi === undefined) {
    return obj =>
      typeof obj !== 'number' || obj < lo
        ? `Expected $p to be a ${finiteMsg}number greater than ${lo}, got $v.`
        : undefined
  } else {
    return obj =>
      typeof obj !== 'number' || obj < lo || obj > hi
        ? `Expected $p to be a ${finiteMsg}number in the range [${lo}, ${hi}], inclusive; got $v.`
        : undefined
  }
}

function typecheckNumber (obj) {
  if (typeof obj !== 'number') return 'Expected $p to be a number, got $v.'
}

function typecheckFiniteNumber (obj) {
  if (typeof obj !== 'number' || !Number.isFinite(obj))
    return 'Expected $p to be a finite number, got $v.'
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
  return typeof obj !== 'boolean'
    ? 'Expected $p to be a boolean, got $v.'
    : undefined
}

function stringTypecheck (obj) {
  return typeof obj !== 'string'
    ? 'Expected $p to be a string, got $v.'
    : undefined
}

function variableNameTypecheck (obj) {
  return !isValidVariableName(obj)
    ? 'Expected $p to be a valid variable name, got $v. Variable '
    : undefined
}

function createTypecheck (check) {
  if (typeof check === 'string') check = { type: check }
  let type = check.type

  switch (type) {
    case 'integer':
      return createIntegerTypecheck(check)
    case 'number':
      return createNumberTypecheck(check)
    case 'boolean':
      return booleanTypecheck
    case 'string':
      return stringTypecheck
    case 'VariableName':
      return variableNameTypecheck
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
  let x = 0,
    y = 0

  if (typeof obj === 'number' || typeof obj === 'string') {
    CONVERSION_MSG = 'Expected $p to be convertible to a Vec2, got $v.'
  } else if (typeof obj === 'object') {
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

function vec2NonFlatArrayConversion (arr, f32 = true) {
  let ret = new (f32 ? Float32Array : Float64Array)(arr.length * 2)
  let retIndex = -1

  for (let i = 0; i < arr.length; ++i) {
    let elem = arr[i]

    if (elem.x) {
      ret[++retIndex] = elem.x
      ret[++retIndex] = elem.y
    } else if (Array.isArray(elem)) {
      if (elem.length !== 2) {
        CONVERSION_MSG = `Expected $p to be convertible to a flat array of Vec2s, found element ${relaxedPrint(
          elem
        )} at index ${i}`
        return
      }

      ret[++retIndex] = elem[0]
      ret[++retIndex] = elem[1]
    } else {
      CONVERSION_MSG = `Expected $p to be convertible to a flat array of Vec2s, found element ${relaxedPrint(
        elem
      )} at index ${i}`
      return
    }
  }

  return ret
}

function vec2ArrayConversion (obj, f32 = true) {
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; ++i) {
      if (typeof obj[i] !== 'number') {
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

    if (f32 && obj instanceof Float32Array) return obj
    if (!f32 && obj instanceof Float64Array) return obj

    return new (f32 ? Float32Array : Float64Array)(obj)
  }
}

/**
 * Return a function which, when evaluated, either sets CONVERSION_MSG to a message indicating why the conversion is
 * impossible and returns nothing or returns a converted result.
 * @param conversion
 */
function createConversion (conversion) {
  if (typeof conversion === 'string') conversion = { type: conversion }
  else if (typeof conversion === 'function') return conversion

  let type = conversion.type

  switch (type) {
    case 'Color':
      return colorConversion
    case 'Vec2':
      return vec2Conversion
    case 'f32_vec2_array':
      return vec2ArrayConversion
    default:
      throw new Error(`Unknown conversion type ${type}.`)
  }
}

let NullInterface

/**
 * Construct an interface from other interfaces and various property descriptors.
 *
 * @param description
 * @param description.extends {Array} List of interfaces to extend from, inheriting interface, internal, and memberFunctions
 * @param description.interface {{}} Map of external facing props to how to handle them
 * @param description.internal {{}} Internal properties and how to handle them
 * @param description.memberFunctions {{}} Functions to add to the class
 * @returns {{extend: Function, set: Function, get: Function, description: {}, update: Function, computeProps: Function}}
 */
export function constructInterface (description) {
  let extends_ = description.extends ?? []
  if (!Array.isArray(extends_)) extends_ = [ extends_ ]

  if (NullInterface) extends_.unshift(NullInterface)

  let interfaceDesc = description.interface ?? {}
  let internal = description.internal ?? {}
  let memberFunctions = description.memberFunctions ?? {}

  // Extend interface, internal and memberFunctions
  if (extends_.length !== 0) {
    for (let i = extends_.length - 1; i >= 0; --i) {
      let extendInterface = extends_[i]
      if (!extendInterface) continue

      const desc = extendInterface.description

      // Extend the interface
      interfaceDesc = { ...desc.interface, ...interfaceDesc }
      internal = { ...desc.internal, ...internal }
      memberFunctions = { ...desc.memberFunctions, ...memberFunctions }
    }

    // Update the description
    description.interface = interfaceDesc
    description.internal = internal
    description.memberFunctions = memberFunctions
  }

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
      let {
        typecheck,
        target,
        setTarget,
        setAs,
        conversion,
        aliases,
        merge
      } = desc

      setAs = Props.toBit(setAs)

      if (typecheck) setter.typecheck = createTypecheck(typecheck)
      if (conversion) setter.conversion = createConversion(conversion)
      if (setAs) setter.setAs = setAs
      if (merge) setter.merge = true
      setter.target = setTarget ?? target ?? name

      setters[name] = setter

      if (aliases)
        for (const alias of Array.from(aliases)) setters[alias] = setter
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
      if (result) {
        throw new TypeError(
          `Failed typecheck: ${result
            .replace('$v', relaxedPrint(value))
            .replace('$p', 'parameter "' + propName + '"')}`
        )
      }
    }

    if (setter.conversion) {
      let newValue = setter.conversion(value)

      if (newValue === undefined)
        throw new TypeError(
          `Failed conversion: ${CONVERSION_MSG
            .replace('$v', relaxedPrint(value))
            .replace('$p', 'parameter "' + propName + '"')}`
        )

      value = newValue
    }

    let setAs = setter.setAs ?? 0 /* real */
    let merge = !!setter.merge

    if (merge) {
      props.set(
        setter.target,
        deepMerge(props.get(setter.target, setAs), value),
        setAs
      )
    } else {
      props.set(setter.target, value, setAs)
    }
  }

  function _setDict (props, propDict) {
    for (let propName in propDict) {
      _set(props, propName, propDict[propName])
    }
  }

  /**
   * Set a property, or a series of properties, on an element, through the interface
   * @param elem {Element} Element to set the properties on
   * @param propName {string|{}} Name of the property, or a dictionary of properties to set
   * @param value {*} Value to set the property to (unused if propName is a dictionary)
   * @returns {*}
   */
  function set (elem, propName, value) {
    if (typeof propName === 'object') {
      _setDict(elem.props, propName)
    } else if (typeof propName === 'string') {
      _set(elem.props, propName, value)
    }
  }

  /**
   * Retrieve a property from an element through the interface
   * @param elem {Element} Element to retrieve the property from
   * @param propName {string} Name of the property to retrieve
   * @returns {*}
   */
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

  /**
   * Given the internal description of the properties, compute their values based on their user values, current values,
   * et cetera. If isInitialized is true, compute all properties as if they are new.
   * @param props
   * @param isInitialized
   */
  function computeProps (props, isInitialized = true) {
    function getDefault (instructions) {
      let def = instructions.default

      if (instructions.evaluateDefault) {
        if (typeof def !== 'function')
          throw new Error(
            'Internal instruction computation instruction says to evaluate the default value, but given default is not a function'
          )
        return def()
      }

      return def
    }

    for (let propName in internal) {
      // shouldn't be an issue, but eh
      if (!internal.hasOwnProperty(propName)) continue

      let instructions = internal[propName]
      let computed = instructions.computed
      let doCompose = !!instructions.compose

      if (computed === 'none') continue
      if (computed === 'default') {
        // Check whether the current value is undefined. If so, fill it with the default


        if (props.get(propName) === undefined) {
          props.set(propName, getDefault(instructions))
        }
      } else if (computed === 'user') {
        // Check whether the user value is undefined, then the value, then the default
        let store = props.getPropertyStore(propName) // just to make things more efficient

        if (!store) {
          props.set(propName, getDefault(instructions))
        } else {
          if (store.userValue !== undefined) {
            if (doCompose) {
              let type = lookupCompositionType(instructions.type)
              if (!type)
                throw new Error(
                  `Unknown composition type ${instructions.type}.`
                )

              props.set(
                propName,
                type.compose(
                  getDefault(instructions) ?? type.default,
                  store.userValue
                )
              )
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

  const interface_ = { set, get, update, init, extend, computeProps, description }

  /**
   * Extend a class with the various member functions of the interface, as defined in memberFunctions. For example, if
   * memberFunctions is { toggleInteractivity: function() { ... } }, then toggleInteractivity will be added to the
   * prototype of the class. Yeah, I know mixing ES6 classes and prototypical inheritance isn't the greatest, especially
   * for static analysis, but it's the only satisfactory way to do multiple inheritance that I can think of at the
   * moment
   * @param class_ Class to extend. Pass the class, NOT the prototype.
   */
  function extend (class_) {
    if (!class_.prototype)
      throw new Error("Given class doesn't have a prototype to extend")

    const prototype = class_.prototype
    for (const [ fName, f ] of Object.entries(memberFunctions)) {
      // Functions starting with _ are effectively private functions
      if (fName[0] === '_') continue

      Object.defineProperty(prototype, fName, {
        value: f,
        writable: false,
        configurable: true
      })
    }

    Object.defineProperty(prototype, "getInterface", {
      value: () => interface_
    })
  }

  function update (elem) {
    for (const extendedInterface of extends_) {
      let _update = extendedInterface.description.memberFunctions?._update

      if (_update) {
        _update.bind(elem)()
      }
    }

    if (memberFunctions._update) {
      memberFunctions._update.bind(elem)()
    }
  }

  function init (elem, params) {
    for (const extendedInterface of extends_) {
      let _init = extendedInterface._init

      if (_init) {
        _init.bind(elem)(params)
      }
    }

    if (memberFunctions._init) {
      memberFunctions._init.bind(elem)(params)
    }
  }

  return interface_
}

const attachGettersAndSetters = () => null
export { attachGettersAndSetters }

NullInterface = constructInterface({ interface: {}, internal: {},
  memberFunctions: {
    _update () {
      this.defaultInheritProps()
      this.defaultComputeProps()
    }
  }
})
export { NullInterface }
