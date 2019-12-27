// This file defines some common utilities that Grapheme uses!

// A list of all extant Grapheme Contexts
const CONTEXTS = []

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
    CONTEXTS.forEach(context => context.onDPRChanged())
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

// Delete buffers with the given name from all Grapheme contexts
function deleteBuffersNamed (bufferNames) {
  if (Array.isArray(bufferNames)) {
    for (let i = 0; i < bufferNames.length; ++i) {
      deleteBuffersNamed(bufferNames[i])
    }
    return
  }

  CONTEXTS.forEach((context) => {
    context.glManager.deleteBuffer(bufferNames)
  })
}

let x = 0

function getRenderID () {
  x += 1
  return x
}

export {
  createShaderFromSource, createGLProgram, mod, dpr, deepEquals, mergeDeep
}
