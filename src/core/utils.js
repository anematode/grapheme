import { BoundingBox } from '../math/bounding_box'
import { Vec2 } from '../math/vec'
import { ln_gamma } from '../math/gamma_function'

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
  const ok = Object.keys
  const tx = typeof x
  const ty = typeof y
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

function isTypedArray (arr) {
  return !!(arr.buffer instanceof ArrayBuffer && arr.BYTES_PER_ELEMENT)
}

const isWorker = typeof window === "undefined"

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

if (typeof window === "undefined")
  self.window = self

// device pixel ratio... duh
let dpr = window.devicePixelRatio

function updateDPR () {
  if (dpr !== window.devicePixelRatio) {
    dpr = window.devicePixelRatio

    // Tell the babies that the device pixel ratio has changed
    Universes.forEach(context => context.triggerEvent('dprchanged'))
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

if (!isWorker)
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
    const r = Math.random() * 16 | 0
    const
      v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

let empty_canvas = window.OffscreenCanvas ? new window.OffscreenCanvas(1, 1) : document.createElement('canvas')
let empty_canvas_ctx = empty_canvas.getContext('2d')

function measureText (text, font) {
  if (empty_canvas_ctx.font !== font) {
    empty_canvas_ctx.font = font
  }
  let metrics = empty_canvas_ctx.measureText(text)

  return new BoundingBox(new Vec2(0, 0), metrics.width, metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent)
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

function roundToCanvasPixel (x) {
  return Math.round(x - 0.5) + 0.5
}

function flattenVectors (arr) {
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

function zeroFill (number, width) {
  width -= number.toString().length
  if (width > 0) {
    return new Array(width + (/\./.test(number) ? 2 : 1)).join('0') + number
  }
  return number + '' // always return a string
}

function removeUniverse (context) {
  let index = this.Universes.indexOf(context)

  if (index !== -1) {
    this.Universes.splice(index, 1)
  }
}

function beautifyFloat (f, prec = 12) {
  let strf = f.toFixed(prec)
  if (strf.includes('.')) {
    return strf.replace(/\.?0+$/g, '')
  } else {
    return strf
  }
}

function expressQuantityPP (quantity) {
  if (quantity > 0.01) {
    return beautifyFloat(quantity * 100, 6) + '%'
  } else if (quantity > 1e-6) {
    return beautifyFloat(quantity * 1e6, 6) + ' ppm'
  } else if (quantity > 1e-9) {
    return beautifyFloat(quantity * 1e9, 6) + ' ppb'
  } else if (quantity > 1e-12) {
    return beautifyFloat(quantity * 1e12, 6) + ' ppt'
  } else if (quantity > 1e-15) {
    return beautifyFloat(quantity * 1e12, 6) + ' ppq'
  } else {
    return '0'
  }
}

const gcd = function (a, b) {
  if (!b) {
    return a
  }

  return gcd(b, a % b)
}

const benchmark = function (callback, iterations = 100, output = console.log) {
  let start = performance.now()

  for (let i = 0; i < iterations; ++i) {
    callback(i)
  }

  let duration = performance.now() - start

  output(`Function ${callback.name} took ${duration / iterations} ms per call.`)
}

function removeDuplicates(arr) {
  return [... new Set(arr)]
}

// Credit to https://github.com/gustf/js-levenshtein/blob/master/index.js
const levenshtein = (function()
{
  function _min(d0, d1, d2, bx, ay)
  {
    return d0 < d1 || d2 < d1
      ? d0 > d2
        ? d2 + 1
        : d0 + 1
      : bx === ay
        ? d1
        : d1 + 1;
  }

  return function(a, b)
  {
    if (a === b) {
      return 0;
    }

    if (a.length > b.length) {
      var tmp = a;
      a = b;
      b = tmp;
    }

    var la = a.length;
    var lb = b.length;

    while (la > 0 && (a.charCodeAt(la - 1) === b.charCodeAt(lb - 1))) {
      la--;
      lb--;
    }

    var offset = 0;

    while (offset < la && (a.charCodeAt(offset) === b.charCodeAt(offset))) {
      offset++;
    }

    la -= offset;
    lb -= offset;

    if (la === 0 || lb < 3) {
      return lb;
    }

    var x = 0;
    var y;
    var d0;
    var d1;
    var d2;
    var d3;
    var dd;
    var dy;
    var ay;
    var bx0;
    var bx1;
    var bx2;
    var bx3;

    var vector = [];

    for (y = 0; y < la; y++) {
      vector.push(y + 1);
      vector.push(a.charCodeAt(offset + y));
    }

    var len = vector.length - 1;

    for (; x < lb - 3;) {
      bx0 = b.charCodeAt(offset + (d0 = x));
      bx1 = b.charCodeAt(offset + (d1 = x + 1));
      bx2 = b.charCodeAt(offset + (d2 = x + 2));
      bx3 = b.charCodeAt(offset + (d3 = x + 3));
      dd = (x += 4);
      for (y = 0; y < len; y += 2) {
        dy = vector[y];
        ay = vector[y + 1];
        d0 = _min(dy, d0, d1, bx0, ay);
        d1 = _min(d0, d1, d2, bx1, ay);
        d2 = _min(d1, d2, d3, bx2, ay);
        dd = _min(d2, d3, dd, bx3, ay);
        vector[y] = dd;
        d3 = d2;
        d2 = d1;
        d1 = d0;
        d0 = dy;
      }
    }

    for (; x < lb;) {
      bx0 = b.charCodeAt(offset + (d0 = x));
      dd = ++x;
      for (y = 0; y < len; y += 2) {
        dy = vector[y];
        vector[y] = dd = _min(dy, d0, dd, bx0, vector[y + 1]);
        d0 = dy;
      }
    }

    return dd;
  };
})();

function getFunctionName() {
  return '$' + getRenderID()
}

function wait(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms)
  })
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const BINOMIAL_TABLE = new Float64Array([0, 0, 0.6931471805599453, 1.791759469228055, 3.1780538303479458, 4.787491742782046, 6.579251212010101, 8.525161361065415, 10.60460290274525, 12.801827480081469, 15.104412573075516, 17.502307845873887, 19.987214495661885, 22.552163853123425, 25.19122118273868, 27.89927138384089, 30.671860106080672, 33.50507345013689, 36.39544520803305, 39.339884187199495, 42.335616460753485, 45.38013889847691, 48.47118135183523, 51.60667556776438, 54.78472939811232, 58.00360522298052, 61.261701761002, 64.55753862700634, 67.88974313718154, 71.25703896716801, 74.65823634883016, 78.0922235533153, 81.55795945611504, 85.05446701758152, 88.58082754219768, 92.1361756036871, 95.7196945421432, 99.33061245478743, 102.96819861451381, 106.63176026064346, 110.32063971475739, 114.0342117814617, 117.77188139974507, 121.53308151543864, 125.3172711493569, 129.12393363912722, 132.95257503561632, 136.80272263732635, 140.67392364823425, 144.5657439463449, 148.47776695177302, 152.40959258449735, 156.3608363030788, 160.3311282166309, 164.32011226319517, 168.32744544842765,  172.3527971391628, 176.39584840699735, 180.45629141754378, 184.53382886144948, 188.6281734236716, 192.7390472878449, 196.86618167289, 201.00931639928152, 205.1681994826412, 209.34258675253685, 213.53224149456327, 217.73693411395422, 221.95644181913033, 226.1905483237276, 230.43904356577696, 234.70172344281826, 238.97838956183432, 243.2688490029827, 247.57291409618688, 251.8904022097232, 256.22113555000954, 260.5649409718632, 264.9216497985528, 269.2910976510198, 273.6731242856937, 278.0675734403661, 282.4742926876304, 286.893133295427, 291.3239500942703, 295.76660135076065, 300.22094864701415, 304.6868567656687, 309.1641935801469, 313.65282994987905, 318.1526396202093, 322.66349912672615, 327.1852877037752, 331.7178871969285, 336.26118197919845, 340.815058870799, 345.37940706226686, 349.95411804077025, 354.5390855194408, 359.1342053695754, 363.73937555556347])
const binomComputed = BINOMIAL_TABLE.length

function nCrFloat(n, k) {
  if (Number.isInteger(n) && Number.isInteger(k) && n >= 0 && k >= 0 && n < binomComputed && k < binomComputed)
    return Math.exp(BINOMIAL_TABLE[n] - BINOMIAL_TABLE[n-k] - BINOMIAL_TABLE[k]);
  else return Math.exp(ln_gamma(n) - ln_gamma(n - k) - ln_gamma(k))
}

function nCr(n, k) {
  let result = 1;

  for (let i = 1; i <= k; i++) {
    result *= (n + 1 - i) / i;
  }

  return result;
}

const eulerGamma = 0.57721566490153286060

let boundC = 1e152

function bound(x) {
  return Math.max(Math.min(x, boundC), -boundC)
}

export {
  benchmark,
  gcd,
  expressQuantityPP,
  zeroFill,
  measureText,
  generateUUID,
  createShaderFromSource,
  createGLProgram,
  Universes,
  removeUniverse,
  mod,
  dpr,
  select,
  assert,
  checkType,
  deepEquals,
  isInteger,
  isNonnegativeInteger,
  isNonpositiveInteger,
  isNegativeInteger,
  isPositiveInteger,
  isTypedArray,
  mergeDeep,
  isApproxEqual,
  deleteBuffersNamed,
  getRenderID,
  flattenVectors,
  roundToCanvasPixel,
  removeDuplicates,
  isWorker,
  levenshtein,
  getFunctionName,
  wait,
  getRandomInt,
  nCrFloat,
  nCr,
  eulerGamma,
  bound
}
