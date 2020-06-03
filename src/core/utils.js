import { BoundingBox } from '../math/bounding_box'
import { Vec2 } from "../math/vec"

// This file defines some common utilities that Grapheme uses!

// A list of all extant Grapheme Universes
const Universes = []

// this function takes in a variadic list of arguments and returns the first
// one that's not undefined
function select (opt1, ...opts) {
  if (opts.length === 0) { // if there are no other options, choose the first
    return opt1
  }
  if (opt1 === undefined) { // if the first option is undefined, proceed
    return select(...opts)
  }

  // If the first option is valid, return it
  return opt1
}

// Assert that a statement is true, and throw an error if it's not
function assert (statement, error = 'Unknown error') {
  if (!statement) throw new Error(error)
}

// Check that an object is of a given type
function checkType (obj, type) {
  assert(obj instanceof type, `Object must be instance of ${type}`)
}

// Check if two objects are... deeply equal
// https://stackoverflow.com/questions/201183/how-to-determine-equality-for-two-javascript-objects
function deepEquals (x, y) {
  const ok = Object.keys; const tx = typeof x; const
    ty = typeof y
  return x && y && tx === 'object' && tx === ty ? (
    ok(x).length === ok(y).length &&
      ok(x).every((key) => deepEquals(x[key], y[key]))
  ) : (x === y)
}

// The following functions are self-explanatory.

function isInteger (z) {
  return Number.isInteger(z) // didn't know about this lol
}

function isNonnegativeInteger (z) {
  return Number.isInteger(z) && z >= 0
}

function isPositiveInteger (z) {
  return Number.isInteger(z) && z > 0
}

function isNonpositiveInteger (z) {
  return Number.isInteger(z) && z <= 0
}

function isNegativeInteger (z) {
  return Number.isInteger(z) && z < 0
}

function isTypedArray(arr) {
  return !!(arr.buffer instanceof ArrayBuffer && arr.BYTES_PER_ELEMENT)
}

// https://stackoverflow.com/a/34749873
function isObject (item) {
  return (item && typeof item === 'object' && !Array.isArray(item))
}

// This merges the characteristics of two objects, typically parameters
// or styles or something like that
// https://stackoverflow.com/a/34749873
function mergeDeep (target, ...sources) {
  if (!sources.length) return target
  const source = sources.shift()

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} })
        mergeDeep(target[key], source[key])
      } else {
        Object.assign(target, { [key]: source[key] })
      }
    }
  }

  return mergeDeep(target, ...sources)
}

// Check if two numbers are within epsilon of each other
function isApproxEqual (v, w, eps = 1e-5) {
  return Math.abs(v - w) < eps
}

// Non-stupid mod function
function mod (n, m) {
  return ((n % m) + m) % m
}

// device pixel ratio... duh
let dpr = window.devicePixelRatio
function updateDPR () {
  if (dpr !== window.devicePixelRatio) {
    dpr = window.devicePixelRatio

    // Tell the babies that the device pixel ratio has changed
    Universes.forEach(context => context.triggerEvent("dprchanged"))
  }
}

// Periodically check whether the dpr has changed
setInterval(updateDPR, 100)

// Import the Grapheme CSS file for canvas styling
function importGraphemeCSS () {
  try {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.type = 'text/css'
    link.href = '../build/grapheme.css' // oof, must change l8r

    document.getElementsByTagName('HEAD')[0].appendChild(link)
  } catch (e) {
    console.error('Could not import Grapheme CSS')
    throw e
  }
}

importGraphemeCSS()

// This function takes in a GL rendering context, a type of shader (fragment/vertex),
// and the GLSL source code for that shader, then returns the compiled shader
function createShaderFromSource (gl, shaderType, shaderSourceText) {
  // create an (empty) shader of the provided type
  const shader = gl.createShader(shaderType)

  // set the source of the shader to the provided source
  gl.shaderSource(shader, shaderSourceText)

  // compile the shader!! piquant
  gl.compileShader(shader)

  // get whether the shader compiled properly
  const succeeded = gl.getShaderParameter(shader, gl.COMPILE_STATUS)

  if (succeeded) {
    return shader // return it if it compiled properly
  }

  // delete the shader to free it from memory
  gl.deleteShader(shader)

  // throw an error with the details of why the compilation failed
  throw new Error(gl.getShaderInfoLog(shader))
}

// This function takes in a GL rendering context, the fragment shader, and the vertex shader,
// and returns a compiled program.
function createGLProgram (gl, vertShader, fragShader) {
  // create an (empty) GL program
  const program = gl.createProgram()

  // link the vertex shader
  gl.attachShader(program, vertShader)

  // link the fragment shader
  gl.attachShader(program, fragShader)

  // compile the program
  gl.linkProgram(program)

  // get whether the program compiled properly
  const succeeded = gl.getProgramParameter(program, gl.LINK_STATUS)

  if (succeeded) {
    return program
  }

  // delete the program to free it from memory
  gl.deleteProgram(program)

  // throw an error with the details of why the compilation failed
  throw new Error(gl.getProgramInfoLog(program))
}

function generateUUID () {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0; const
      v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

let empty_canvas = window.OffscreenCanvas ? new window.OffscreenCanvas(1, 1) : document.createElement("canvas")
let empty_canvas_ctx = empty_canvas.getContext("2d")

function measureText(text, font) {
  if (empty_canvas_ctx.font !== font)
    empty_canvas_ctx.font = font
  let metrics = empty_canvas_ctx.measureText(text)

  return new BoundingBox(new Vec2(0,0), metrics.width, metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent)
}

// Delete buffers with the given name from all Grapheme Universes
function deleteBuffersNamed (bufferNames) {
  if (Array.isArray(bufferNames)) {
    for (let i = 0; i < bufferNames.length; ++i) {
      deleteBuffersNamed(bufferNames[i])
    }
    return
  }

  Universes.forEach((universe) => {
    universe.glManager.deleteBuffer(bufferNames)
  })
}

let x = 0

function getRenderID () {
  x += 1
  return x
}

function roundToCanvasPixel(x) {
  return Math.round(x - 0.5) + 0.5
}

function flattenVectors(arr) {
  let flattened = []

  for (let i = 0; i < arr.length; ++i) {
    let item = arr[i]
    if (item.x !== undefined) {
      flattened.push(item.x)
      flattened.push(item.y)
    } else if (Array.isArray(item)) {
      flattened.push(item[0])
      flattened.push(item[1])
    } else {
      flattened.push(item)
    }
  }

  return flattened
}

function zeroFill(number, width) {
  width -= number.toString().length;
  if (width > 0) {
    return new Array( width + (/\./.test( number ) ? 2 : 1) ).join( '0' ) + number;
  }
  return number + ""; // always return a string
}

function removeUniverse(context) {
  let index = this.Universes.indexOf(context)

  if (index !== -1) {
    this.Universes.splice(index, 1)
  }
}

function beautifyFloat(f, prec=12) {
  let strf = f.toFixed(prec);
  if (strf.includes('.')) {
    return strf.replace(/\.?0+$/g,'');
  } else {
    return strf;
  }
}

function expressQuantityPP(quantity) {
  if (quantity > 0.01) {
    return beautifyFloat(quantity * 100, 6) + "%"
  } else if (quantity > 1e-6) {
    return beautifyFloat(quantity * 1e6, 6) + " ppm"
  } else if (quantity > 1e-9) {
    return beautifyFloat(quantity * 1e9, 6) + " ppb"
  } else if (quantity > 1e-12) {
    return beautifyFloat(quantity * 1e12, 6) + " ppt"
  } else if (quantity > 1e-15) {
    return beautifyFloat(quantity * 1e12, 6) + " ppq"
  } else {
    return "0"
  }
}

const gcd = function(a, b) {
  if (!b) {
    return a;
  }

  return gcd(b, a % b);
}

const benchmark = function(callback, iterations=100, output=console.log) {
  let start = performance.now()

  for (let i = 0; i < iterations; ++i)
    callback(i)

  let duration = performance.now() - start

  output(`Function ${callback.name} took ${duration / iterations} ms per call.`)
}

export {
  benchmark, gcd, expressQuantityPP, zeroFill, measureText, generateUUID, createShaderFromSource, createGLProgram, Universes, removeUniverse, mod, dpr, select, assert, checkType, deepEquals, isInteger, isNonnegativeInteger,
  isNonpositiveInteger, isNegativeInteger, isPositiveInteger, isTypedArray, mergeDeep, isApproxEqual, deleteBuffersNamed, getRenderID, flattenVectors, roundToCanvasPixel
}
