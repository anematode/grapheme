var Grapheme = (function (exports) {
  'use strict';

  class Vec2 {
    constructor (x, y) {
      if (x.x) {
        this.x = x.x;
        this.y = x.y;
      } else if (Array.isArray(x)) {
        this.x = x[0];
        this.y = x[1];
      } else {
        this.x = x;
        this.y = y;
      }
    }

    clone() {
      return new Vec2(this.x, this.y)
    }

    set(v) {
      this.x = v.x;
      this.y = v.y;
    }

    subtract(v) {
      this.x -= v.x;
      this.y -= v.y;
      return this
    }

    add(v) {
      this.x += v.x;
      this.y += v.y;
      return this
    }

    multiply(s) {
      this.x *= s;
      this.y *= s;
      return this
    }

    hasNaN() {
      return isNaN(this.x) || isNaN(this.y)
    }

    scale(s) {
      return this.multiply(s)
    }

    divide(s) {
      this.x /= s;
      this.y /= s;
      return this
    }

    asArray() {
      return [this.x, this.y]
    }

    length() {
      return Math.hypot(this.x, this.y)
    }

    unit() {
      return this.clone().divide(this.length())
    }

    distanceTo(v) {
      return Math.hypot(this.x - v.x, this.y - v.y)
    }

    distanceSquaredTo(v) {
      return (this.x - v.x) ** 2 + (this.y - v.y) ** 2
    }

    cross(v) {
      return this.x * v.x + this.y * v.y
    }

    rotate(angle, about=Origin) {
      let c = Math.cos(angle), s = Math.sin(angle);

      if (about === Origin) {
        let x = this.x, y = this.y;

        this.x = x * c - y * s;
        this.y = y * c + x * s;
      } else {
        let x = this.x, y = this.y;

        this.subtract(about).rotate(angle).add(about);
      }

      return this
    }

    rotateDeg(angle_deg, about=Origin) {
      this.rotate(angle_deg / 180 * 3.14159265359, about);

      return this
    }
  }
  const Origin = new Vec2(0,0);

  class BoundingBox {
    //_width;
    //_height;

    draw(canvasCtx) {
      canvasCtx.beginPath();
      canvasCtx.rect(this.top_left.x, this.top_left.y, this.width, this.height);
      canvasCtx.stroke();
    }

    constructor(top_left=new Vec2(0,0), width=640, height=480) {
      this.top_left = top_left;

      this.width = width;
      this.height = height;
    }

    get width() {
      return this._width
    }

    get height() {
      return this._height
    }

    set width(w) {
      if (w < 0)
        throw new Error("Invalid bounding box width")
      this._width = w;
    }

    set height(h) {
      if (h < 0)
        throw new Error("Invalid bounding box height")
      this._height = h;
    }

    setTL(top_left) {
      this.top_left = top_left;
      return this
    }

    area() {
      return this.width * this.height
    }

    set cx(cx) {
      this.top_left.x = cx - this.width / 2;
    }

    set cy(cy) {
      this.top_left.y = cy - this.height / 2;
    }

    get cx() {
      return this.top_left.x + this.width / 2
    }

    get cy() {
      return this.top_left.y + this.height / 2
    }

    setSize(width, height) {
      this.width = width;
      this.height = height;
      return this
    }

    clone() {
      return new BoundingBox(this.top_left.clone(), this.width, this.height)
    }

    padLeft(x) {
      this.width -= x;
      this.top_left.x += x;
      return this
    }

    padRight(x) {
      this.width -= x;
      return this
    }

    padTop(y) {
      this.height -= y;
      this.top_left.y += y;
      return this
    }

    padBottom(y) {
      this.height -= y;
      return this
    }

    pad(paddings={}) {
      if (paddings.left) {
        this.padLeft(paddings.left);
      }
      if (paddings.right) {
        this.padRight(paddings.right);
      }
      if (paddings.top) {
        this.padTop(paddings.top);
      }
      if (paddings.bottom) {
        this.padBottom(paddings.bottom);
      }

      return this
    }

    get x1() {
      return this.top_left.x
    }

    get x2() {
      return this.top_left.x + this.width
    }

    set x1(x) {
      this.top_left.x = x;
    }

    set x2(x) {
      this.width = x - this.top_left.x;
    }

    get y1() {
      return this.top_left.y
    }

    get y2() {
      return this.top_left.y + this.height
    }

    set y1(y) {
      this.top_left.y = y;
    }

    set y2(y) {
      this.height = y - this.top_left.y;
    }

    getBoxVertices() {
      return [this.x1, this.y1, this.x2, this.y1, this.x2, this.y2, this.x1, this.y2, this.x1, this.y1]
    }

    getPath() {
      let path = new Path2D();

      path.rect(this.x1, this.y1, this.width, this.height);

      return path
    }

    clip(ctx) {
      ctx.clip(this.getPath());
    }
  }

  const boundingBoxTransform = {
    X: (x, box1, box2, flipX) => {
      if (Array.isArray(x) || isTypedArray(x)) {
        for (let i = 0; i < x.length; ++i) {
          let fractionAlong = (x[i] - box1.x1) / box1.width;

          if (flipX)
            fractionAlong = 1 - fractionAlong;

          x[i] = fractionAlong * box2.width + box2.x1;
        }
        return x
      } else {
        return boundingBoxTransform.X([x], box1, box2, flipX)[0]
      }
    },
    Y: (y, box1, box2, flipY) => {
      if (Array.isArray(y) || isTypedArray(y)) {
        for (let i = 0; i < y.length; ++i) {
          let fractionAlong = (y[i] - box1.y1) / box1.height;

          if (flipY)
            fractionAlong = 1 - fractionAlong;

          y[i] = fractionAlong * box2.height + box2.y1;
        }
        return y
      } else {
        return boundingBoxTransform.Y([y], box1, box2, flipY)[0]
      }
    },
    XY: (xy, box1, box2, flipX, flipY) => {
      if (Array.isArray(xy) || isTypedArray(x)) {
        for (let i = 0; i < xy.length; i += 2) {
          let fractionAlong = (xy[i] - box1.x1) / box1.width;

          if (flipX)
            fractionAlong = 1 - fractionAlong;

          xy[i] = fractionAlong * box2.width + box2.x1;

          fractionAlong = (xy[i+1] - box1.y1) / box1.height;

          if (flipY)
            fractionAlong = 1 - fractionAlong;

          xy[i+1] = fractionAlong * box2.height + box2.y1;
        }
        return xy
      } else {
        throw new Error("No")
      }
    },
    getReducedTransform(box1, box2, flipX, flipY) {
      let x_m = 1 / box1.width;
      let x_b = - box1.x1 / box1.width;

      if (flipX) {
        x_m *= -1;
        x_b = 1 - x_b;
      }

      x_m *= box2.width;
      x_b *= box2.width;
      x_b += box2.x1;

      let y_m = 1 / box1.height;
      let y_b = - box1.y1 / box1.height;

      if (flipY) {
        y_m *= -1;
        y_b = 1 - y_b;
      }

      y_m *= box2.height;
      y_b *= box2.height;
      y_b += box2.y1;

      return {x_m, x_b, y_m, y_b}
    }
  };

  const EMPTY = new BoundingBox(new Vec2(0,0), 0, 0);

  function intersectBoundingBoxes(box1, box2) {
    let x1 = Math.max(box1.x1, box2.x1);
    let y1 = Math.max(box1.y1, box2.y1);
    let x2 = Math.min(box1.x2, box2.x2);
    let y2 = Math.min(box1.y2, box2.y2);

    if (x2 < x1) {
      return EMPTY.clone()
    }

    if (y2 < y1) {
      return EMPTY.clone()
    }

    let width = x2 - x1;
    let height = y2 - y1;

    return new BoundingBox(new Vec2(x1, y1), width, height)
  }

  // This file defines some common utilities that Grapheme uses!

  // A list of all extant Grapheme Universes
  const Universes = [];

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
    assert(obj instanceof type, `Object must be instance of ${type}`);
  }

  // Check if two objects are... deeply equal
  // https://stackoverflow.com/questions/201183/how-to-determine-equality-for-two-javascript-objects
  function deepEquals (x, y) {
    const ok = Object.keys;
    const tx = typeof x;
    const ty = typeof y;
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

  const isWorker = typeof self !== "undefined";

  // https://stackoverflow.com/a/34749873
  function isObject (item) {
    return (item && typeof item === 'object' && !Array.isArray(item))
  }

  // This merges the characteristics of two objects, typically parameters
  // or styles or something like that
  // https://stackoverflow.com/a/34749873
  function mergeDeep (target, ...sources) {
    if (!sources.length) return target
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
      for (const key in source) {
        if (isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          mergeDeep(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
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
    self.window = self;

  // device pixel ratio... duh
  let dpr = window.devicePixelRatio;

  function updateDPR () {
    if (dpr !== window.devicePixelRatio) {
      dpr = window.devicePixelRatio;

      // Tell the babies that the device pixel ratio has changed
      Universes.forEach(context => context.triggerEvent('dprchanged'));
    }
  }

  // Periodically check whether the dpr has changed
  setInterval(updateDPR, 100);

  // Import the Grapheme CSS file for canvas styling
  function importGraphemeCSS () {
    try {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = '../build/grapheme.css'; // oof, must change l8r

      document.getElementsByTagName('HEAD')[0].appendChild(link);
    } catch (e) {
      console.error('Could not import Grapheme CSS');
      throw e
    }
  }

  if (!isWorker)
    importGraphemeCSS();

  // This function takes in a GL rendering context, a type of shader (fragment/vertex),
  // and the GLSL source code for that shader, then returns the compiled shader
  function createShaderFromSource (gl, shaderType, shaderSourceText) {
    // create an (empty) shader of the provided type
    const shader = gl.createShader(shaderType);

    // set the source of the shader to the provided source
    gl.shaderSource(shader, shaderSourceText);

    // compile the shader!! piquant
    gl.compileShader(shader);

    // get whether the shader compiled properly
    const succeeded = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

    if (succeeded) {
      return shader // return it if it compiled properly
    }

    // delete the shader to free it from memory
    gl.deleteShader(shader);

    // throw an error with the details of why the compilation failed
    throw new Error(gl.getShaderInfoLog(shader))
  }

  // This function takes in a GL rendering context, the fragment shader, and the vertex shader,
  // and returns a compiled program.
  function createGLProgram (gl, vertShader, fragShader) {
    // create an (empty) GL program
    const program = gl.createProgram();

    // link the vertex shader
    gl.attachShader(program, vertShader);

    // link the fragment shader
    gl.attachShader(program, fragShader);

    // compile the program
    gl.linkProgram(program);

    // get whether the program compiled properly
    const succeeded = gl.getProgramParameter(program, gl.LINK_STATUS);

    if (succeeded) {
      return program
    }

    // delete the program to free it from memory
    gl.deleteProgram(program);

    // throw an error with the details of why the compilation failed
    throw new Error(gl.getProgramInfoLog(program))
  }

  function generateUUID () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const
        v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16)
    })
  }

  let empty_canvas = window.OffscreenCanvas ? new window.OffscreenCanvas(1, 1) : document.createElement('canvas');
  let empty_canvas_ctx = empty_canvas.getContext('2d');

  function measureText (text, font) {
    if (empty_canvas_ctx.font !== font) {
      empty_canvas_ctx.font = font;
    }
    let metrics = empty_canvas_ctx.measureText(text);

    return new BoundingBox(new Vec2(0, 0), metrics.width, metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent)
  }

  // Delete buffers with the given name from all Grapheme Universes
  function deleteBuffersNamed (bufferNames) {
    if (Array.isArray(bufferNames)) {
      for (let i = 0; i < bufferNames.length; ++i) {
        deleteBuffersNamed(bufferNames[i]);
      }
      return
    }

    Universes.forEach((universe) => {
      universe.glManager.deleteBuffer(bufferNames);
    });
  }

  let x$1 = 0;

  function getRenderID () {
    x$1 += 1;
    return x$1
  }

  function roundToCanvasPixel (x) {
    return Math.round(x - 0.5) + 0.5
  }

  function flattenVectors (arr) {
    let flattened = [];

    for (let i = 0; i < arr.length; ++i) {
      let item = arr[i];
      if (item.x !== undefined) {
        flattened.push(item.x);
        flattened.push(item.y);
      } else if (Array.isArray(item)) {
        flattened.push(item[0]);
        flattened.push(item[1]);
      } else {
        flattened.push(item);
      }
    }

    return flattened
  }

  function zeroFill (number, width) {
    width -= number.toString().length;
    if (width > 0) {
      return new Array(width + (/\./.test(number) ? 2 : 1)).join('0') + number
    }
    return number + '' // always return a string
  }

  function removeUniverse (context) {
    let index = this.Universes.indexOf(context);

    if (index !== -1) {
      this.Universes.splice(index, 1);
    }
  }

  function beautifyFloat (f, prec = 12) {
    let strf = f.toFixed(prec);
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
  };

  const benchmark = function (callback, iterations = 100, output = console.log) {
    let start = performance.now();

    for (let i = 0; i < iterations; ++i) {
      callback(i);
    }

    let duration = performance.now() - start;

    output(`Function ${callback.name} took ${duration / iterations} ms per call.`);
  };

  var utils = /*#__PURE__*/Object.freeze({
    benchmark: benchmark,
    gcd: gcd,
    expressQuantityPP: expressQuantityPP,
    zeroFill: zeroFill,
    measureText: measureText,
    generateUUID: generateUUID,
    createShaderFromSource: createShaderFromSource,
    createGLProgram: createGLProgram,
    Universes: Universes,
    removeUniverse: removeUniverse,
    mod: mod,
    get dpr () { return dpr; },
    select: select,
    assert: assert,
    checkType: checkType,
    deepEquals: deepEquals,
    isInteger: isInteger,
    isNonnegativeInteger: isNonnegativeInteger,
    isNonpositiveInteger: isNonpositiveInteger,
    isNegativeInteger: isNegativeInteger,
    isPositiveInteger: isPositiveInteger,
    isTypedArray: isTypedArray,
    mergeDeep: mergeDeep,
    isApproxEqual: isApproxEqual,
    deleteBuffersNamed: deleteBuffersNamed,
    getRenderID: getRenderID,
    flattenVectors: flattenVectors,
    roundToCanvasPixel: roundToCanvasPixel
  });

  /**
   @class GLResourceManager stores GL resources on a per-context basis. This allows the
   separation of elements and their drawing buffers in a relatively complete way.
   It is given a gl context to operate on, and creates programs in manager.programs
   and buffers in manager.buffers. programs and buffers are simply key-value pairs
   which objects can create (and destroy) as they please.
   */
  class GLResourceManager {
    /**
     * Construct a GLResourceManager
     * @param gl {WebGLRenderingContext} WebGL context the manager will have dominion over
     */
    constructor (gl) {
      // WebGL rendering context
      this.gl = gl;

      // Compiled programs and created buffers
      this.programs = {};
      this.buffers = {};
    }

    /**
     * Compile a program and store it in this.programs
     * @param programName {string} Name of the program, used to identify the program
     * @param vertexShaderSource {string} Source code of the vertex shader
     * @param fragmentShaderSource {string} Source code of the fragment shader
     * @param vertexAttributeNames {Array} Array of vertex attribute names
     * @param uniformNames {Array} Array of uniform names
     */
    compileProgram (programName, vertexShaderSource, fragmentShaderSource,
                    vertexAttributeNames = [], uniformNames = []) {
      if (this.hasProgram(programName)) {
        // if this program name is already taken, delete the old one
        this.deleteProgram(programName);
      }

      const { gl } = this;

      // The actual gl program itself
      const glProgram = createGLProgram(gl,
        createShaderFromSource(gl, gl.VERTEX_SHADER, vertexShaderSource),
        createShaderFromSource(gl, gl.FRAGMENT_SHADER, fragmentShaderSource));

      // pairs of uniform names and their respective locations
      const uniforms = {};
      for (let i = 0; i < uniformNames.length; ++i) {
        const uniformName = uniformNames[i];

        uniforms[uniformName] = gl.getUniformLocation(glProgram, uniformName);
      }

      // pairs of vertex attribute names and their respective locations
      const vertexAttribs = {};
      for (let i = 0; i < vertexAttributeNames.length; ++i) {
        const vertexAttribName = vertexAttributeNames[i];

        vertexAttribs[vertexAttribName] = gl.getAttribLocation(glProgram, vertexAttribName);
      }

      this.programs[programName] = {
        program: glProgram,
        uniforms,
        attribs: vertexAttribs
      };
    }

    /**
     * Create a buffer with a certain name, typically including a WebGLElement's id
     * @param bufferName {string} Name of the buffer
     */
    createBuffer (bufferName) {
      // If buffer already exists, return
      if (this.hasBuffer(bufferName)) return

      const { gl } = this;

      // Create a new buffer
      this.buffers[bufferName] = gl.createBuffer();
    }

    /**
     * Delete buffer with given name
     * @param bufferName {string} Name of the buffer
     */
    deleteBuffer (bufferName) {
      if (!this.hasBuffer(bufferName)) return

      const buffer = this.getBuffer(bufferName);
      const { gl } = this;

      // Delete the buffer from GL memory
      gl.deleteBuffer(buffer);
      delete this.buffers[bufferName];
    }

    /**
     * Delete a program
     * @param programName {string} Name of the program to be deleted
     */
    deleteProgram (programName) {
      if (!this.hasProgram(programName)) return

      const programInfo = this.programs[programName];
      this.gl.deleteProgram(programInfo.program);

      // Remove the key from this.programs
      delete this.programs[programName];
    }

    /**
     * Retrieve a buffer with a given name, and create it if it does not already exist
     * @param bufferName Name of the buffer
     * @returns {WebGLBuffer} Corresponding buffer
     */
    getBuffer (bufferName) {
      if (!this.hasBuffer(bufferName)) this.createBuffer(bufferName);
      return this.buffers[bufferName]
    }

    /**
     * Retrieve program from storage
     * @param programName {string} Name of the program
     * @returns {Object} Object of the form {program, uniforms, vertexAttribs}
     */
    getProgram (programName) {
      return this.programs[programName]
    }

    /**
     * Whether this manager has a buffer with a given name
     * @param bufferName Name of the buffer
     * @returns {boolean} Whether this manager has a buffer with that name
     */
    hasBuffer (bufferName) {
      return !!this.buffers[bufferName]
    }

    /**
     * Whether a program with programName exists
     * @param programName {string} Name of the program
     * @returns {boolean} Whether that program exists
     */
    hasProgram (programName) {
      return !!this.programs[programName]
    }
  }

  /** @class GraphemeUniverse Universe for plots to live in. Allows WebGL rendering, variables, etc. */
  class GraphemeUniverse {
    /**
     * Construct a new GraphemeUniverse.
     * @constructor
     */
    constructor () {
      // Add this to the list of all extant universes
      Universes.push(this);

      // List of canvases using this universe
      /** @private */ this.canvases = [];

      // Canvas to draw
      /** @private */ this.glCanvas = window.OffscreenCanvas ? new window.OffscreenCanvas(1, 1) : document.createElement('canvas');

      // gl context
      /** @public */ this.gl = this.glCanvas.getContext('webgl');

      // gl manager
      /** @public */ this.glManager = new GLResourceManager(this.gl);

      if (!this.gl) {
        throw new Error('Grapheme needs WebGL to run! Sorry.')
      }
    }

    /**
     * Set the size of the canvas to width and height. This is used internally; the user should never have to call it.
     * @param width {number} The width of the canvas.
     * @param height {number} The height of the canvas.
     * @private
     */
    _setSize (width, height) {
      const glCanvas = this.glCanvas;

      glCanvas.width = width;
      glCanvas.height = height;
    }

    /**
     * Add canvas to this universe
     * @param canvas {GraphemeCanvas} Canvas to add to this universe
     */
    add (canvas) {
      if (canvas.universe !== this) {
        throw new Error('Canvas already part of a universe')
      }
      if (this.isChild(canvas)) {
        throw new Error('Canvas is already added to this universe')
      }

      this.canvases.push(canvas);
    }

    /**
     * Clear the WebGL canvas for rendering.
     */
    clear () {
      let gl = this.gl;

      // Set the clear color to transparent black
      gl.clearColor(0, 0, 0, 0);

      // Clear the canvas
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    /**
     * Copy the contents of the WebGL canvas on top of the plot canvas
     * @param canvas {GraphemeCanvas}
     */
    copyToCanvas (canvas) {
      const ctx = canvas.ctx;

      // Set the canvas transform to identity (since this.glCanvas does not factor in the device pixel ratio)
      ctx.resetTransform();

      // Draw the glCanvas to the plot canvas with drawImage
      ctx.drawImage(this.glCanvas, 0, 0);

      // Reset the canvas transform
      canvas.resetCanvasCtxTransform();
    }

    /**
     * Destroy this universe and all of its canvases
     */
    destroy () {
      // Remove universe from list of universes handled by utils
      removeUniverse(this);

      // Destroy all child canvases
      this.canvases.forEach(canvas => canvas.destroy());
    }

    /**
     * Expand the canvas to fit the max dimensions of all governed canvases. Called every time a canvas is rendered, so it
     * ought to be fast.
     */
    expandToFit () {
      let maxWidth = 1;
      let maxHeight = 1;

      for (let i = 0; i < this.canvases.length; ++i) {
        let canvas = this.canvases[i];

        // Set max dims. Note we use canvasWidth/Height instead of width/height because glCanvas does not factor in dpr.
        if (canvas.canvasWidth > maxWidth) {
          maxWidth = canvas.canvasWidth;
        }
        if (canvas.canvasHeight > maxHeight) {
          maxHeight = canvas.canvasHeight;
        }
      }

      this._setSize(maxWidth, maxHeight);
    }

    /**
     * Whether canvas is a child of this universe
     * @param canvas Canvas to test
     * @returns {boolean} Whether canvas is a child
     */
    isChild (canvas) {
      return this.canvases.indexOf(canvas) !== -1
    }

    /**
     * Remove canvas from this universe
     * @param canvas Canvas to remove
     */
    remove (canvas) {
      let index = this.canvases.indexOf(canvas);

      if (index !== -1) {
        this.canvases.splice(index, 1);
      }
    }

    /**
     * Trigger an event on all child canvases
     * @param type {string} The type of the event
     * @param event {Object} The event to pass to canvases
     * @returns {boolean} Whether an event handler stopped propagation.
     */
    triggerEvent (type, event) {
      // Trigger event in all canvases
      for (let i = 0; i < this.canvases.length; ++i) {
        if (this.canvases[i].triggerEvent(type, event)) {
          // Stop if event stopped propagation
          return true
        }
      }

      return false
    }
  }

  // The DefaultUniverse is the default universe that plots use. Other universes can be used by creating them, then passing
  // them in the constructor to the plot. Because the number of WebGL contexts per page is limited to six, it's best to just
  // use the DefaultUniverse; an unlimited number of plots can use the same universe, and the number of Canvas2DRendering
  // contexts per page is not capped.
  const DefaultUniverse = new GraphemeUniverse();

  /** @class GraphemeElement A component of Grapheme that supports a update() function, which prepares it for the rendering
   * stage, and a render() function which renders the element to a GraphemeCanvas. It also has children, used for grouping
   * elements together. */
  class GraphemeElement {
    constructor ({
      precedence = 0,
      alwaysUpdate = true
    } = {}) {
      // Used to sort which element is drawn first. A lower precedence means it will be drawn first and appear on the bottom
      /** @public */ this.precedence = precedence;

      // The parent of this element
      /** @public */ this.parent = null;

      // The plot this element belongs to
      /** @public */ this.plot = null;

      // Whether update() needs to be called before render()
      /** @public */ this.needsUpdate = true;

      // Custom event listeners
      /** @private */ this.eventListeners = {};

      // Children of this element
      /** @public */ this.children = [];

      // Whether this element is visible
      /** @public */ this.visible = true;

      // Jobs of this element, used with beasts
      /** @protected */ this.jobs = [];
    }

    /**
     * Append elements to this element as children
     * @param element {GraphemeElement} Element to add
     * @param elements Parameter pack, elements to add
     */
    add (element, ...elements) {
      // Make sure this operation is valid
      checkType(element, GraphemeElement);

      if (element.parent !== null)
        throw new Error('Element is already a child of some element.')

      if (this.hasChild(element, true))
        throw new Error('Element is already a child of this group.')

      // Set element parent and plot
      element.parent = this;
      element.setPlot(this.plot);

      // Add element to children
      this.children.push(element);

      // Potentially recurse
      if (elements.length > 0) {
        this.add(...elements);
      }
    }

    /**
     * Add event listener to this element
     * @param type {string} Event type to listen for
     * @param callback {Function} Function to call
     */
    addEventListener (type, callback) {
      const listenerArray = this.eventListeners[type];

      if (!listenerArray) {
        // If the array doesn't exist yet, create it
        this.eventListeners[type] = [callback];
      } else {
        listenerArray.push(callback);
      }
    }

    applyToChildren(func, recursive=true) {
      func(this);

      this.children.forEach(func);

      if (recursive) {
        this.children.forEach(child => child.applyToChildren(func, true));
      }
    }

    /**
     * Destroy this element. Also, destroy all children of this element.
     */
    destroy () {
      // Destroy all children
      this.children.forEach((child) => child.destroy());

      // Remove this element from its parent
      if (this.parent)
        this.parent.remove(this);

      // Set plot to null (modifying all children as well)
      this.setPlot(null);
    }

    /**
     * Return whether element is a child, potentially not an immediate child, of this element
     * @param element {GraphemeElement} The element to check.
     * @param recursive {boolean} Whether to check all children, not just immediate children
     * @returns {boolean} Whether element is a child of this.
     */
    hasChild (element, recursive = true) {
      // If we should recurse, check if this has the child, then check all children
      if (recursive) {
        if (this.hasChild(element, false)) return true
        return this.children.some((child) => child.hasChild(element, recursive))
      }

      // If not recursive, check whether children includes element
      return this.children.includes(element)
    }

    /**
     * Return whether element is an immediate child of this element; in other words, whether this.children.includes(elem).
     * @param element {GraphemeElement} The element to check.
     * @returns {boolean} Whether the element is an immediate child.
     */
    isChild (element) {
      return this.hasChild(element, false)
    }

    markUpdate() {
      this.needsUpdate = true;
    }

    /**
     * Remove elements from this
     * @param element {GraphemeElement} Element to remove
     * @param elements Parameter pack, elements to remove
     */
    remove (element, ...elements) {
      checkType(element, GraphemeElement);

      if (this.hasChild(element, false)) {
        // if element is an immediate child, remove it
        // get index of the element
        const index = this.children.indexOf(element);

        // Remove it from this.children
        this.children.splice(index, 1);

        // Orphanize the element
        element.parent = null;
        element.setPlot(null);
      }

      // Deal with parameter pack
      if (elements.length > 0) {
        this.remove(...elements);
      }
    }

    /**
     * Remove all children from this. Optimized for removing all children by not requiring successive calls to
     * this.remove
     */
    removeAllChildren() {
      // Set parent/plot of all children to null
      this.children.forEach(child => {
        child.parent = null;
        child.setPlot(null);
      });

      // Empty children array
      this.children = [];
    }

    /**
     * Remove event listener from this element
     * @param type {string} Event type listened for
     * @param callback {Function} Callback to remove
     */
    removeEventListener(type, callback) {
      const listenerArray = this.eventListeners[type];
      if (listenerArray) {
        // Find the callback in the list of listeners and remove it
        let index = listenerArray.indexOf(callback);
        if (index !== -1)
          listenerArray.splice(index, 1);
      }
    }

    /**
     * Render this element to a plot.
     * @param info The rendering info
     * @param info.ctx CanvasRenderingContext2D to draw to
     * @param info.plot The plot we are drawing onto
     * @param info.labelManager The LabelManager of the plot
     * @param info.beforeNormalRender The callback for elements that don't use WebGL.
     */
    render (info) {
      info.beforeNormalRender();

      // Render this element's children
      this.renderChildren(info);
    }

    /**
     * Render all the children of this element.
     * @param info The information to be passed to the children.
     */
    renderChildren(info) {
      // Sort children by precedence
      this.sortChildren();

      // Render all children
      this.children.forEach((child) => child.render(info));
    }

    /**
     * Set this.plot to the plot containing this element
     * @param plot {Plot2D} The plot to set it to
     */
    setPlot(plot) {
      this.plot = plot;

      // Set it for all children as well
      this.children.forEach(child => child.setPlot(plot));
    }

    /**
     * Sort the children of this GraphemeElement
     */
    sortChildren () {
      // Sort the children by their precedence value
      this.children.sort((x, y) => x.precedence - y.precedence);
    }

    /**
     * Trigger an event. If it returns true, some event listener returned true, which will stop the propagation of the event.
     * @param type The name of the event, e.g. "plotcoordschanged"
     * @param event The event itself, either a default event or a custom event.
     * @returns {boolean} Whether some event returned true.
     */
    triggerEvent (type, event) {
      this.sortChildren();

      // If child events should be triggered last, trigger all of this element's events first
      if (this.triggerChildEventsLast && this.eventListeners[type]) {
        let res = this.eventListeners[type].some(listener => listener(event));
        if (res)
          // Stop if event stopped propagation
          return true
      }

      // Trigger event in all children
      for (let i = 0; i < this.children.length; ++i) {
        if (this.children[i].triggerEvent(type, event)) {
          // Stop if event stopped propagation
          return true
        }
      }

      // If child events should not be triggered last, trigger all of this element's events first
      if (!this.triggerChildEventsLast && this.eventListeners[type]) {
        let res = this.eventListeners[type].some(listener => listener(event));
        if (res)
          // Stop if event stopped propagation
          return true
      }

      return false
    }

    /**
     * Function called to update for rendering.
     */
    update () {
      this.needsUpdate = false;
    }

    /**
     * Update asynchronously. If this is not specially defined by derived classes, it defaults to just calling update() directly after a setTimeout
     */
    async updateAsync() {
      this.update();
    }
  }

  /** @class GraphemeGroup
   * Used semantically to group elements. All elements already support this.children.
   * */
  class GraphemeGroup extends GraphemeElement {
    constructor (params = {}) {
      super(params);
    }
  }

  /** @class LabelManager
   * Manage the labels of a domElement, meant to be the container div of a grapheme window.
   * Remove old labels and retrieve elements for reuse by labels. */
  class LabelManager {
    constructor (container) {
      // Pass it the dom element div for grapheme_window
      /** @public */ this.container = container;

      // Mapping from Label keys to {renderID: the last render ID, domElement: html element to use}
      /** @private */ this.labels = new Map();

      // The current render ID
      /** @private */ this.currentRenderID = -1;
    }

    /**
     * Remove labels with an old render ID.
     */
    removeOldLabels () {
      const labels = this.labels;

      labels.forEach((labelInfo, label) => {
        // Delete labels who don't have the correct render ID
        if (labelInfo.renderID !== this.currentRenderID) {
          labelInfo.domElement.remove();

          labels.delete(label);
        }
      });
    }

    /**
     * Get dom element corresponding to a given label.
     * @param label {BasicLabel}
     */
    getElement (label) {
      // Retrieve label info
      const labelInfo = this.labels.get(label);

      let element;

      if (!labelInfo) {
        // Create a div for the label to use
        element = document.createElement('div');
        element.classList.add('grapheme-label');

        this.container.appendChild(element);

        // Update label info
        this.labels.set(label, { renderID: this.currentRenderID, domElement: element });
      } else {
        element = labelInfo.domElement;

        // Update render ID
        labelInfo.renderID = this.currentRenderID;
      }

      return element
    }
  }

  /** @class GraphemeCanvas A viewable instance of Grapheme. Provides the information required for rendering to canvas,
   * as well as domElement, which is a canvas element to be added to the canvas. */
  class GraphemeCanvas extends GraphemeGroup {
    /**
     * Creates a GraphemeCanvas.
     * @constructor
     * @param universe {GraphemeUniverse} Universe this canvas will be a part of
     */
    constructor (universe=DefaultUniverse) {
      super();

      if (!(universe instanceof GraphemeUniverse))
        throw new Error("Given universe not instance of Grapheme.Universe")

      this.universe = universe;

      // Add this canvas to the given universe
      this.universe.add(this);

      // Element to be put into the webpage
      /** @public */ this.domElement = document.createElement('div');

      // The canvas of a GraphemeCanvas
      /** @private */ this.canvas = document.createElement('canvas');

      // Append the canvas to the dom element
      this.domElement.appendChild(this.canvas);

      // Enable CSS stuff
      this.canvas.classList.add('grapheme-canvas');
      this.domElement.classList.add('grapheme-window');

      // CanvasRenderingContext2D for this GraphemeCanvas
      /** @public */ this.ctx = this.canvas.getContext('2d');

      // If no context, throw an error
      if (!this.ctx)
        throw new Error("This browser doesn't support 2D canvas, which is required for Grapheme. Please get a competent browser.")

      // Label manager for LaTeX-enabled labels
      /** @private */ this.labelManager = new LabelManager(this.domElement);

      // Set the default size to 640 by 480 in CSS pixels
      this.setSize(640, 480);

      // When the device pixel ratio changes, resize the canvas accordingly
      this.addEventListener("dprchanged", () => {
        this.setSize(this.width, this.height);
      });

      // Object containing information to be passed to rendered elements defined by derived classes
      /** @protected */ this.extraInfo = {};
    }

    /**
     * Get the width of the canvas in displayed pixels (not CSS pixels).
     * @returns {number} The width of the canvas.
     */
    get canvasWidth () {
      return this.canvas.width
    }

    /**
     * Set the width of the canvas in displayed pixels
     * @private
     * @param width The desired width of the canvas.
     */
    set canvasWidth (width) {
      // Round it to an integer and make sure it's in a reasonable range
      width = Math.round(width);
      assert(isPositiveInteger(width) && width < 16384, 'Canvas width must be in range [1,16383].');

      this.canvas.width = width;
    }

    /**
     * Get the height of the canvas in displayed pixels (not CSS pixels).
     * @returns {number} The height of the canvas.
     */
    get canvasHeight () {
      return this.canvas.height
    }

    /**
     * Set the height of the canvas in displayed pixels
     * @private
     * @param height The desired height of the canvas.
     */
    set canvasHeight (height) {
      height = Math.round(height);
      assert(isPositiveInteger(height) && height < 16384, 'Canvas height must be in range [1,16383].');

      this.canvas.height = height;
    }

    /**
     * Clear the canvas
     */
    clear () {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }

    /**
     * Destroy this GraphemeCanvas
     */
    destroy () {
      // Destroy the DOM element
      this.domElement.remove();

      // Remove this canvas from context
      this.universe.remove(this);

      // Destroy the elements too, if desired
      super.destroy();

      // Delete some references to allow memory to be freed immediately
      delete this.canvas;
      delete this.ctx;
      delete this.domElement;
      delete this.labelManager;
    }

    updateChildren(info, criteria) {
      this.applyToChildren((child) => {
          if (criteria(child)) {
            child.update();
          }
        }, true);
    }

    /**
     * Render this GraphemeCanvas. Unlike other elements, it does not take in an "info" argument. This function
     * constructs the information needed to render the child elements.
     */
    render () {
      // Expand the universe's canvas to fit its windows, in case it is too small
      this.universe.expandToFit();

      const { labelManager, ctx } = this;
      const plot = this;

      // Whether the universe's canvas needs to be copied over
      let needsWebGLCopy = false;

      // Function called before an element that doesn't use WebGL is rendered
      const beforeNormalRender = () => {
        if (needsWebGLCopy) {
          // Copy the universe's canvas over
          this.universe.copyToCanvas(this);

          // Mark the copy as done
          needsWebGLCopy = false;

          // Clear the universe's canvas for future renders
          this.universe.clear();
        }
      };

      const beforeWebGLRender = () => {
        // Set the viewport of the universe to the entire canvas. Note that the universe canvas is not
        // scaled with the device pixel ratio, so we must use this.canvasWidth/Height instead of this.width/height.
        this.universe.gl.viewport(0, 0, this.canvasWidth, this.canvasHeight);

        // Mark that a copy is needed
        needsWebGLCopy = true;
      };

      // Set ID of this render. This is used to remove DOM elements from a previous render.
      labelManager.currentRenderID = getRenderID();

      const extraInfo = this.extraInfo ? this.extraInfo : {};

      // Info to be passed to rendered elements; the object passed as "info" in render(info).
      const info = {
        labelManager, // the label manager
        ctx, // The canvas context to draw to
        plot, // The plot we are drawing
        beforeNormalRender, // Callback for elements that don't use WebGL
        beforeWebGLRender, // Callback for elements that use WebGL
        universe: this.universe, // The universe to draw to (for WebGL stuff)
        ...extraInfo
      };

      // Clear the canvas
      this.clear();

      // Reset the rendering context transform
      this.resetCanvasCtxTransform();

      this.updateChildren(info, child => child.needsUpdate);

      // If this class defines a beforeRender function, call it
      if (this.beforeRender)
        this.beforeRender(info);

      // Render all children
      super.render(info);

      // If this class defines an after render function, call it
      if (this.afterRender)
        this.afterRender(info);

      // Copy over the canvas if necessary
      beforeNormalRender();

      // Get rid of old labels
      labelManager.removeOldLabels();
    }

    /**
     * Resets the context's transform to scale up by the device pixel ratio
     */
    resetCanvasCtxTransform () {
      const ctx = this.ctx;

      ctx.resetTransform();
      ctx.scale(dpr, dpr);
    }

    /**
     * Set the size of this GraphemeCanvas. Note that width and height are in CSS pixels.
     * @param width Desired width of canvas.
     * @param height Desired height of canvas.
     */
    setSize (width, height) {
      /** @public */ this.width = width;
      /** @public */ this.height = height;

      // Update the actual canvas's size, factoring in the device pixel ratio
      this.canvasWidth = this.width * dpr;
      this.canvasHeight = this.height * dpr;

      // Set the canvas's display using CSS
      const canvas = this.canvas;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Scale up by device pixel ratio
      this.resetCanvasCtxTransform();

      // Trigger the resize event to let elements know to update
      this.triggerEvent("resize", {width, height});
    }
  }

  /**
   * @class Keyboard Keeps track of the held keys on a keyboard and allows for listeners to be attached to said keys.
   */
  class Keyboard {
    /**
     * Construct a Keyboard tracker.
     * @constructor
     * @param domElement The element to attach listeners to
     */
    constructor (domElement) {
      // Element to attach listeners to
      /** @public */ this.element = domElement;

      // Dictionary of pressed keys
      /** @public */ this.keys = {};

      // listeners on the dom element
      /** @private */ this.domListeners = {};

      // user-defined event listeners
      /** @private */ this.eventListeners = {};

      // whether the keyboard is enabled
      this.enabled = true;
    }

    /**
     * Get whether the keyboard is enabled
     * @returns {boolean}
     */
    get enabled () {
      // Check whether there are any listeners
      return Object.keys(this.domListeners).length !== 0
    }

    /**
     * Enabled or disable the keyboard
     * @param value {boolean} Whether the keyboard should be enabled
     */
    set enabled (value) {
      if (value === this.enabled) {
        return
      }

      if (value) {
        // Enable the keyboard

        this.element.addEventListener('keydown', this.domListeners.keydown = (evt) => {
          this.onKeyDown(evt);
        });

        this.element.addEventListener('keyup', this.domListeners.keyup = (evt) => {
          this.onKeyUp(evt);
        });

        this.element.addEventListener('keypress', this.domListeners.keypress = (evt) => {
          this.onKeyPress(evt);
        });
      } else {
        // Disable the keyboard

        let listeners = this.domListeners;

        this.element.removeEventListener('keyup', listeners.keyup);
        this.element.removeEventListener('keydown', listeners.keydown);
        this.element.removeEventListener('keypress', listeners.keypress);
      }
    }

    /**
     * Add an event listener to this keyboard
     * @param name {string} The event to listen for
     * @param callback {Function} The function to call
     */
    addEventListener (name, callback) {
      let listeners = this.eventListeners[name];

      if (!listeners) {
        listeners = this.eventListeners[name] = [];
      }

      listeners.push(callback);
    }

    /**
     * Detach event listeners if necessary and change the element to listen to
     * @param newElem Element to attach listeners to
     */
    changeElementTo (newElem) {
      let value = this.enabled;
      this.enabled = false;

      this.element = newElem;

      this.enabled = value;
    }

    /**
     * Callback for key down
     * @param evt {KeyboardEvent}
     * @private
     */
    onKeyDown (evt) {
      let key = evt.key;

      this.keys[key] = true;

      this.triggerEvent('keydown-' + key, evt);
    }

    /**
     * Callback for key press
     * @param evt {KeyboardEvent}
     * @private
     */
    onKeyPress (evt) {
      let key = evt.key;

      this.triggerEvent('keypress-' + key, evt);
    }

    /**
     * Callback for key up
     * @param evt {KeyboardEvent}
     * @private
     */
    onKeyUp (evt) {
      let key = evt.key;

      this.keys[key] = false;

      this.triggerEvent('keyup-' + key, evt);
    }

    /**
     * Remove an event listener from this keyboard
     * @param name {string} The event to listen for
     * @param callback {Function} The callback function
     */
    removeEventListener (name, callback) {
      let listeners = this.eventListeners[name];

      let index = listeners.indexOf(callback);

      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }

    /**
     * Trigger an event.
     * @param name {string} Name of the event
     * @param event The event to pass to event listeners
     * @returns {boolean} Whether an event returned true
     */
    triggerEvent (name, event) {
      let listeners = this.eventListeners[name];

      return listeners && listeners.some(listener => listener(event))
    }
  }

  // List of events to listen for
  const mouseEvents = ['click', 'mousemove', 'mousedown', 'mouseup', 'wheel'];
  const touchEvents = ['touchstart', 'touchmove', 'touchend', 'touchcancel'];
  const pointerEvents = ['pointerdown', 'pointerup', 'pointermove'];

  /**
   * @class InteractiveCanvas Canvas that supports interactivity events.
   * The callbacks are given above, and the events have the following structure:
   * {pos: new Vec2(... pixel coordinates of mouse event in canvas ...), rawEvent: ... raw mouse event ...}
   */
  class InteractiveCanvas extends GraphemeCanvas {
    /**
     * Construct an interactive canvas
     * @param universe {GraphemeUniverse} The universe to add this canvas to
     */
    constructor (universe = DefaultUniverse) {
      super(universe);

      // Used for tracking key presses
      this.keyboard = new Keyboard(window /* attach listeners to window */);

      // Used for listening to mouse/touch events
      this.interactivityListeners = {};

      // Whether interactivity is enabled
      this.interactivityEnabled = true;
    }

    /**
     * Get whether interactivity is enabled
     * @returns {boolean} Whether interactivity is enabled
     */
    get interactivityEnabled () {
      return Object.keys(this.interactivityListeners).length !== 0
    }

    /**
     * Set whether interactivity is enabled
     * @param enable Whether interactivity is enabled
     */
    set interactivityEnabled (enable) {
      if (enable) {
        // Add interactivity listeners for each mouse event
        mouseEvents.forEach(evtName => {
          let callback = (evt) => {
            // Calculate where the click is
            let rect = this.domElement.getBoundingClientRect();
            let pos = new Vec2(evt.clientX - rect.left, evt.clientY - rect.top);

            // Trigger the event
            this.triggerEvent(evtName, {
              pos,
              rawEvent: evt
            });

            // Prevent the default action e.g. scrolling
            evt.preventDefault();
          };

          // Store the listener
          this.interactivityListeners[evtName] = callback;

          // Add the listener
          this.domElement.addEventListener(evtName, callback);
        });

        // For each pointer event
        pointerEvents.forEach(evtName => {
          // Handle pointer events
          this.domElement.addEventListener(evtName,
            this.interactivityListeners[evtName] = (event) => this.handlePointer(event));
        });

        // For each touch event
        touchEvents.forEach(evtName => {
          // Handle touch events
          this.domElement.addEventListener(evtName,
            this.interactivityListeners[evtName] = (event) => this.handleTouch(event));
        });
      } else {
        // Remove all interactivity listeners
        [...mouseEvents, ...pointerEvents, ...touchEvents].forEach(evtName => {
          this.domElement.removeEventListener(evtName, this.interactivityListeners[evtName]);
        });

        this.interactivityListeners = {};
      }

      // Set whether the keyboard is enabled
      this.keyboard.enabled = enable;
    }

    /**
     * Handle pointer events.
     * @param event {PointerEvent} Pointer event
     * @todo
     */
    handlePointer (event) {
      if (event.type === 'pointerup') ; else if (event.type === 'pointermove') ;
    }

    /**
     * Handle touch events by converting them to corresponding mouse events
     * @param event {TouchEvent} The touch event.
     */
    handleTouch (event) {
      // Credit to https://stackoverflow.com/questions/1517924/javascript-mapping-touch-events-to-mouse-events

      let touches = event.changedTouches,
        first = touches[0],
        type = '';
      switch (event.type) {
        case 'touchstart':
          type = 'mousedown';
          break
        case 'touchmove':
          type = 'mousemove';
          break
        case 'touchend':
          type = 'mouseup';
          break
        default:
          return
      }

      let simulatedEvent = document.createEvent('MouseEvent');
      simulatedEvent.initMouseEvent(type, true, true, window, 1,
        first.screenX, first.screenY,
        first.clientX, first.clientY, false,
        false, false, false, 0, null);

      first.target.dispatchEvent(simulatedEvent);
      event.preventDefault();

      if (type === 'mouseup') {
        // also emit a click event

        simulatedEvent = document.createEvent('MouseEvent');
        simulatedEvent.initMouseEvent('click', true, true, window, 1,
          first.screenX, first.screenY,
          first.clientX, first.clientY, false,
          false, false, false, 0, null);

        first.target.dispatchEvent(simulatedEvent);
        event.preventDefault();
      }
    }
  }

  class Plot2DTransform {
    constructor(params={}) {
      this.box = params.box ? new BoundingBox(params.box) : new BoundingBox(new Vec2(0,0), this.width, this.height);
      this.coords = params.coords ? new BoundingBox(params.coords) : new BoundingBox(new Vec2(-5, -5), 10, 10);

      this.plot = params.plot;

      this.preserveAspectRatio = true;
      this.aspectRatio = 1; // Preserve the ratio coords.width / box.width

      this.allowDragging = true;
      this.allowScrolling = true;

      this.mouseDown = false;
      this.mouseAt = null;

      this.correctAspectRatio();
    }

    getPixelToPlotTransform() {
      // Returns the transform {x_m, x_b, y_m, y_b}

      return boundingBoxTransform.getReducedTransform(this.box, this.coords, false, true)
    }

    getPlotToPixelTransform() {
      // Returns the inverse transform of this.getPixelToPlotTransform()

      return boundingBoxTransform.getReducedTransform(this.coords, this.box, false, true)
    }

    correctAspectRatio() {
      if (this.preserveAspectRatio) {
        let cx = this.coords.cx, cy = this.coords.cy;

        this.coords.width = this.aspectRatio / this.box.height * this.box.width * this.coords.height;

        this._centerOn(new Vec2(cx, cy));

        if (this.plot)
          this.plot.triggerEvent("plotcoordschanged");
      }
    }

    getAspect() {
      // ratio between y axis and x axis

      return this.box.height / this.box.width * this.coords.width / this.coords.height
    }

    _centerOn(v) {
      this.coords.cx = v.x;
      this.coords.cy = v.y;
    }

    centerOn(v, ...args) {
      if (v instanceof Vec2) {
        this._centerOn(v);
      } else {
        this.centerOn(new Vec2(v, ...args));
      }

      this.correctAspectRatio();
      if (this.plot)
        this.plot.triggerEvent("plotcoordschanged");
    }

    translate(v, ...args) {
      if (v instanceof Vec2) {
        this.coords.top_left.add(v);

        if (this.plot)
          this.plot.triggerEvent("plotcoordschanged");
      } else {
        this.translate(new Vec2(v, ...args));
      }
    }

    zoomOn(factor, v = new Vec2(0,0), ...args) {
      if (this.allowScrolling) {
        let pixel_s = this.plotToPixel(v);

        this.coords.width *= factor;
        this.coords.height *= factor;

        this._internal_coincideDragPoints(v, pixel_s);
      }
    }

    _internal_coincideDragPoints(p1, p2) {
      this.translate(this.pixelToPlot(p2).subtract(p1).scale(-1));
    }

    _coincideDragPoints(p1, p2) {
      if (this.allowDragging) {
        this._internal_coincideDragPoints(p1, p2);
      }
    }

    pixelToPlotX(x) {
      return boundingBoxTransform.X(x, this.box, this.coords)
    }

    pixelToPlotY(y) {
      return boundingBoxTransform.Y(y, this.box, this.coords, true)
    }

    pixelToPlot(xy) {
      return new Vec2(boundingBoxTransform.XY(flattenVectors([xy]), this.box, this.coords, false, true))
    }

    plotToPixelX(x) {
      return boundingBoxTransform.X(x, this.coords, this.box)
    }

    plotToPixelY(y) {
      return boundingBoxTransform.Y(y, this.coords, this.box, true)
    }

    plotToPixel(xy) {
      return new Vec2(boundingBoxTransform.XY(flattenVectors([xy]), this.coords, this.box, false, true))
    }

    plotToPixelArr(arr) {
      let {x_m, x_b, y_m, y_b} = this.getPlotToPixelTransform();

      for (let i = 0; i < arr.length; i += 2) {
        arr[i] = x_m * arr[i] + x_b;
        arr[i+1] = y_m * arr[i+1] + y_b;
      }
    }

    pixelToPlotArr(arr) {
      let {x_m, x_b, y_m, y_b} = this.getPixelToPlotTransform();

      for (let i = 0; i < arr.length; i += 2) {
        arr[i] = x_m * arr[i] + x_b;
        arr[i+1] = y_m * arr[i+1] + y_b;
      }
    }

    clone() {
      let transform = new Plot2DTransform();
      transform.box = this.box.clone();
      transform.coords = this.coords.clone();
      return transform
    }
  }

  class SmartLabelManager {
    constructor(plot) {
      this.plot = plot;

      this.labelBoundingBoxes = [];
      this.labels = [];

      this.antipadding = 1000;
    }

    getIntersectingArea(bbox) {
      let area = 0;

      for (let box of this.labelBoundingBoxes) {
        area += intersectBoundingBoxes(bbox, box).area();
      }

      return area
    }

    addBox(box) {
      this.labelBoundingBoxes.push(box);
    }

    reset() {
      this.labelBoundingBoxes = [];
      this.labels = [];

      let box = this.plot.getCanvasBox();

      this.labelBoundingBoxes.push(new BoundingBox(box.top_left.clone().subtract(new Vec2(this.antipadding, this.antipadding)), this.antipadding * 2 + box.width, this.antipadding));
      this.labelBoundingBoxes.push(new BoundingBox(new Vec2(box.x1 - this.antipadding, box.y2), this.antipadding * 2 + box.width, this.antipadding));
      this.labelBoundingBoxes.push(new BoundingBox(box.top_left.clone().subtract(new Vec2(this.antipadding, 0)), this.antipadding, box.height));
      this.labelBoundingBoxes.push(new BoundingBox(new Vec2(box.x2, box.y1), this.antipadding, box.height));
    }

    drawBoundingBoxes(ctx) {
      ctx.fillStyle = "red";

      for (let box of this.labelBoundingBoxes) {
        ctx.fill(box.getPath());
      }
    }

    renderTopLabel(label) {
      this.labels.push(label);
    }

    renderLabels(info) {
      this.labels.forEach(label => label.render(info, true));
    }
  }

  /**
   * @class Plot2D
   * A generic plot in two dimensions, including a transform from plot coordinates to pixel coordinates.
   * Padding of the plot is determined by padding.top, padding.left, etc.. Interactivity like scrolling and dragging are
   * enabled via enableDrag and enableScroll.
   */
  class Plot2D extends InteractiveCanvas {
    /**
     * Construct a new Plot2D
     * @param universe {GraphemeUniverse} The universe that the plot will use
     * @constructor
     */
    constructor (universe = DefaultUniverse) {
      super(universe);

      // This is the plot of itself. Meta!
      this.plot = this;

      // The amount of padding on all sides of the plot, which determines the plotting box along with the canvas's size
      /** @public */ this.padding = {
        top: 40,
        right: 40,
        left: 40,
        bottom: 40
      };

      // The transformation from plot coordinates to pixels
      /** @public */ this.transform = new Plot2DTransform({ plot: this });

      // Whether to allow movement by dragging and scrolling
      /** @public */ this.enableDrag = true;
      /** @public */ this.enableScroll = true;

      // smartLabelManager, used to keep track of smart label positions and keep them from intersecting
      this.extraInfo.smartLabelManager = new SmartLabelManager(this);

      // Add event listeners for mouse events
      this.addEventListener('mousedown', evt => this.mouseDown(evt));
      this.addEventListener('mouseup', evt => this.mouseUp(evt));
      this.addEventListener('mousemove', evt => this.mouseMove(evt));
      this.addEventListener('wheel', evt => this.wheel(evt));

      // When the plot changes in size, correct the transform aspect ratio
      this.addEventListener('resize', evt => {
        this.calculateTransform();
        this.transform.correctAspectRatio();
      });

      // Timeout to check for "plotcoordslingered"
      let timeout = -1;

      this.addEventListener('plotcoordschanged', evt => {
        clearTimeout(timeout);

        // If plot coords haven't changed in 500 milliseconds, fire plotcoordslingered event
        timeout = setTimeout(() => {
          this.triggerEvent('plotcoordslingered');
        }, 500);
      });

      // When the space key is pressed, trigger the plot's events before the children's events,
      // which means that all mouse events except for those attached to the plot won't be called.
      this.keyboard.addEventListener('keydown- ', () => {
        this.triggerChildEventsLast = true;
      });

      // When the space key is released, reset
      this.keyboard.addEventListener('keyup- ', () => {
        this.triggerChildEventsLast = false;
      });

      // Calculate the transform so it's valid from the start
      this.update();
    }

    /**
     * Called after each render, used to display labels that have indicated they want to be displayed on top
     * of everything. This overrides the usual precedence system.
     * @param info {Object} render info
     */
    afterRender (info) {
      this.extraInfo.smartLabelManager.renderLabels(info);
    }

    /**
     * Called before each render. We reset the smart label manager's tracking of label positions.
     * clearing the bounding boxes for the labels to take up.
     * @param info {Object} (unused)
     */
    beforeRender (info) {
      this.extraInfo.smartLabelManager.reset();
    }

    /**
     * Calculate the plotting box, based on the canvas size and this.padding
     */
    calculateTransform () {
      this.transform.box = this.getCanvasBox().pad(this.padding);
    }

    /**
     * Get a bounding box corresponding to the entire canvas
     * @returns {BoundingBox} The canvas bounding box
     */
    getCanvasBox () {
      return new BoundingBox(new Vec2(0, 0), this.width, this.height)
    }

    /**
     * Handle mouse down events.
     * @param evt {Object} Event to handle
     * @returns {boolean} Returns true to stop propagation.
     */
    mouseDown (evt) {
      // Set where the mouse went down, in PLOT coordinates
      this.mouseDownPos = this.transform.pixelToPlot(evt.pos);
      return true
    }

    /**
     * Handle mouse move events.
     * @param evt {Object} Event to handle
     * @returns {boolean} Returns true to stop propagation.
     */
    mouseMove (evt) {
      // If the mouse is down
      if (this.mouseDownPos) {
        // If drag is enabled
        if (this.enableDrag)
        // Move the location of the event to the original mouse down position
        {
          this.transform._coincideDragPoints(this.mouseDownPos, evt.pos);
        }

        return true
      }
    }

    /**
     * Handle mouse up events.
     * @param evt {Object} Event to handle
     * @returns {boolean} Returns true to stop propagation.
     */
    mouseUp (evt) {
      // Mark the mouse as up
      this.mouseDownPos = null;
      return true
    }

    /**
     * Update function
     */
    update () {
      super.update();

      // Update the transform (the position of the plotting box)
      this.calculateTransform();
    }

    /**
     * Handle wheel events.
     * @param evt {Object} Event to handle
     * @returns {boolean} Returns true to stop propagation
     */
    wheel (evt) {
      let scrollY = evt.rawEvent.deltaY;

      if (this.enableScroll) {
        this.transform.zoomOn(Math.exp(scrollY / 1000), this.transform.pixelToPlot(evt.pos));
      }

      return true
    }
  }

  // Implementation of basic color functions
  // Could use a library, but... good experience for me too

  function isValidColorComponent (x) {
    return (x >= 0 && x <= 255)
  }

  class Color {
    constructor ({
      r = 0, g = 0, b = 0, a = 255
    } = {}) {
      this.r = r;
      this.g = g;
      this.b = b;
      this.a = a;

      assert([this.r, this.g, this.b, this.a].every(isValidColorComponent), 'Invalid color component');
    }

    rounded () {
      return {
        r: Math.round(this.r),
        g: Math.round(this.g),
        b: Math.round(this.b),
        a: Math.round(this.a)
      }
    }

    toJSON() {
      return {
        r: this.r,
        g: this.g,
        b: this.b,
        a: this.a
      }
    }

    hex () {
      const rnd = this.rounded();
      return `#${[rnd.r, rnd.g, rnd.b, rnd.a].map((x) => zeroFill(x.toString(16), 2)).join('')}`
    }

    glColor () {
      return {
        r: this.r / 255, g: this.g / 255, b: this.b / 255, a: this.a / 255
      }
    }

    toNumber() {
      return this.r * 0x1000000 + this.g * 0x10000 + this.b * 0x100 + this.a
    }

    clone() {
      return new Color(this)
    }
  }

  // all colors represented as object {r: x, g: x, b: x, a: x}. 0 <= r,g,b,a <= 255,
  // not necessarily integers
  function rgb (r, g, b) {
    return new Color({ r, g, b })
  }

  function rgba (r, g, b, a = 255) {
    return new Color({
      r, g, b, a
    })
  }

  const Colors = {
  get LIGHTSALMON() { return rgb(255,160,122); },
  get SALMON() { return rgb(250,128,114); },
  get DARKSALMON() { return rgb(233,150,122); },
  get LIGHTCORAL() { return rgb(240,128,128); },
  get INDIANRED() { return rgb(205,92,92); },
  get CRIMSON() { return rgb(220,20,60); },
  get FIREBRICK() { return rgb(178,34,34); },
  get RED() { return rgb(255,0,0); },
  get DARKRED() { return rgb(139,0,0); },
  get CORAL() { return rgb(255,127,80); },
  get TOMATO() { return rgb(255,99,71); },
  get ORANGERED() { return rgb(255,69,0); },
  get GOLD() { return rgb(255,215,0); },
  get ORANGE() { return rgb(255,165,0); },
  get DARKORANGE() { return rgb(255,140,0); },
  get LIGHTYELLOW() { return rgb(255,255,224); },
  get LEMONCHIFFON() { return rgb(255,250,205); },
  get LIGHTGOLDENRODYELLOW() { return rgb(250,250,210); },
  get PAPAYAWHIP() { return rgb(255,239,213); },
  get MOCCASIN() { return rgb(255,228,181); },
  get PEACHPUFF() { return rgb(255,218,185); },
  get PALEGOLDENROD() { return rgb(238,232,170); },
  get KHAKI() { return rgb(240,230,140); },
  get DARKKHAKI() { return rgb(189,183,107); },
  get YELLOW() { return rgb(255,255,0); },
  get LAWNGREEN() { return rgb(124,252,0); },
  get CHARTREUSE() { return rgb(127,255,0); },
  get LIMEGREEN() { return rgb(50,205,50); },
  get LIME() { return rgb(0, 255, 0); },
  get FORESTGREEN() { return rgb(34,139,34); },
  get GREEN() { return rgb(0,128,0); },
  get DARKGREEN() { return rgb(0,100,0); },
  get GREENYELLOW() { return rgb(173,255,47); },
  get YELLOWGREEN() { return rgb(154,205,50); },
  get SPRINGGREEN() { return rgb(0,255,127); },
  get MEDIUMSPRINGGREEN() { return rgb(0,250,154); },
  get LIGHTGREEN() { return rgb(144,238,144); },
  get PALEGREEN() { return rgb(152,251,152); },
  get DARKSEAGREEN() { return rgb(143,188,143); },
  get MEDIUMSEAGREEN() { return rgb(60,179,113); },
  get SEAGREEN() { return rgb(46,139,87); },
  get OLIVE() { return rgb(128,128,0); },
  get DARKOLIVEGREEN() { return rgb(85,107,47); },
  get OLIVEDRAB() { return rgb(107,142,35); },
  get LIGHTCYAN() { return rgb(224,255,255); },
  get CYAN() { return rgb(0,255,255); },
  get AQUA() { return rgb(0,255,255); },
  get AQUAMARINE() { return rgb(127,255,212); },
  get MEDIUMAQUAMARINE() { return rgb(102,205,170); },
  get PALETURQUOISE() { return rgb(175,238,238); },
  get TURQUOISE() { return rgb(64,224,208); },
  get MEDIUMTURQUOISE() { return rgb(72,209,204); },
  get DARKTURQUOISE() { return rgb(0,206,209); },
  get LIGHTSEAGREEN() { return rgb(32,178,170); },
  get CADETBLUE() { return rgb(95,158,160); },
  get DARKCYAN() { return rgb(0,139,139); },
  get TEAL() { return rgb(0,128,128); },
  get POWDERBLUE() { return rgb(176,224,230); },
  get LIGHTBLUE() { return rgb(173,216,230); },
  get LIGHTSKYBLUE() { return rgb(135,206,250); },
  get SKYBLUE() { return rgb(135,206,235); },
  get DEEPSKYBLUE() { return rgb(0,191,255); },
  get LIGHTSTEELBLUE() { return rgb(176,196,222); },
  get DODGERBLUE() { return rgb(30,144,255); },
  get CORNFLOWERBLUE() { return rgb(100,149,237); },
  get STEELBLUE() { return rgb(70,130,180); },
  get ROYALBLUE() { return rgb(65,105,225); },
  get BLUE() { return rgb(0,0,255); },
  get MEDIUMBLUE() { return rgb(0,0,205); },
  get DARKBLUE() { return rgb(0,0,139); },
  get NAVY() { return rgb(0,0,128); },
  get MIDNIGHTBLUE() { return rgb(25,25,112); },
  get MEDIUMSLATEBLUE() { return rgb(123,104,238); },
  get SLATEBLUE() { return rgb(106,90,205); },
  get DARKSLATEBLUE() { return rgb(72,61,139); },
  get LAVENDER() { return rgb(230,230,250); },
  get THISTLE() { return rgb(216,191,216); },
  get PLUM() { return rgb(221,160,221); },
  get VIOLET() { return rgb(238,130,238); },
  get ORCHID() { return rgb(218,112,214); },
  get FUCHSIA() { return rgb(255,0,255); },
  get MAGENTA() { return rgb(255,0,255); },
  get MEDIUMORCHID() { return rgb(186,85,211); },
  get MEDIUMPURPLE() { return rgb(147,112,219); },
  get BLUEVIOLET() { return rgb(138,43,226); },
  get DARKVIOLET() { return rgb(148,0,211); },
  get DARKORCHID() { return rgb(153,50,204); },
  get DARKMAGENTA() { return rgb(139,0,139); },
  get PURPLE() { return rgb(128,0,128); },
  get INDIGO() { return rgb(75,0,130); },
  get PINK() { return rgb(255,192,203); },
  get LIGHTPINK() { return rgb(255,182,193); },
  get HOTPINK() { return rgb(255,105,180); },
  get DEEPPINK() { return rgb(255,20,147); },
  get PALEVIOLETRED() { return rgb(219,112,147); },
  get MEDIUMVIOLETRED() { return rgb(199,21,133); },
  get WHITE() { return rgb(255,255,255); },
  get SNOW() { return rgb(255,250,250); },
  get HONEYDEW() { return rgb(240,255,240); },
  get MINTCREAM() { return rgb(245,255,250); },
  get AZURE() { return rgb(240,255,255); },
  get ALICEBLUE() { return rgb(240,248,255); },
  get GHOSTWHITE() { return rgb(248,248,255); },
  get WHITESMOKE() { return rgb(245,245,245); },
  get SEASHELL() { return rgb(255,245,238); },
  get BEIGE() { return rgb(245,245,220); },
  get OLDLACE() { return rgb(253,245,230); },
  get FLORALWHITE() { return rgb(255,250,240); },
  get IVORY() { return rgb(255,255,240); },
  get ANTIQUEWHITE() { return rgb(250,235,215); },
  get LINEN() { return rgb(250,240,230); },
  get LAVENDERBLUSH() { return rgb(255,240,245); },
  get MISTYROSE() { return rgb(255,228,225); },
  get GAINSBORO() { return rgb(220,220,220); },
  get LIGHTGRAY() { return rgb(211,211,211); },
  get SILVER() { return rgb(192,192,192); },
  get DARKGRAY() { return rgb(169,169,169); },
  get GRAY() { return rgb(128,128,128); },
  get DIMGRAY() { return rgb(105,105,105); },
  get LIGHTSLATEGRAY() { return rgb(119,136,153); },
  get SLATEGRAY() { return rgb(112,128,144); },
  get DARKSLATEGRAY() { return rgb(47,79,79); },
  get BLACK() { return rgb(0,0,0); },
  get CORNSILK() { return rgb(255,248,220); },
  get BLANCHEDALMOND() { return rgb(255,235,205); },
  get BISQUE() { return rgb(255,228,196); },
  get NAVAJOWHITE() { return rgb(255,222,173); },
  get WHEAT() { return rgb(245,222,179); },
  get BURLYWOOD() { return rgb(222,184,135); },
  get TAN() { return rgb(210,180,140); },
  get ROSYBROWN() { return rgb(188,143,143); },
  get SANDYBROWN() { return rgb(244,164,96); },
  get GOLDENROD() { return rgb(218,165,32); },
  get PERU() { return rgb(205,133,63); },
  get CHOCOLATE() { return rgb(210,105,30); },
  get SADDLEBROWN() { return rgb(139,69,19); },
  get SIENNA() { return rgb(160,82,45); },
  get BROWN() { return rgb(165,42,42); },
  get MAROON() { return rgb(128,0,0); },
  get RANDOM() { var keys = Object.keys(Colors); return Colors[keys[ keys.length * Math.random() << 0]]; }
  };

  const validDirs = ['C', 'N', 'S', 'W', 'E', 'NW', 'NE', 'SW', 'SE'];
  const labelClasses = validDirs.map(s => 'grapheme-label-' + s);

  class BasicLabelStyle {
    constructor (params = {}) {
      const {
        mode = 'latex', // valid values: latex, html
        dir = 'C' // valid values:
      } = params;

      this.mode = mode;
      this.dir = dir;
    }

    labelClass () {
      let dir = this.dir;

      if (!validDirs.includes(dir)) {
        dir = 'C';
      }

      return 'grapheme-label-' + this.dir
    }

    setLabelClass (labelElement) {
      const labelClass = this.labelClass();

      if (!labelElement.classList.contains(labelClass)) {
        labelElement.classList.remove(...labelClasses);
        labelElement.classList.add(labelClass);
      }
    }
  }

  class Label2DStyle extends BasicLabelStyle {
    // TODO: rotation
    constructor (params = {}) {
      const {
        color = new Color(),
        fontSize = 12,
        fontFamily = 'Helvetica',
        shadowColor = new Color(),
        shadowSize = 0
      } = params;
      super(params);

      this.mode = "2d";
      this.color = color;
      this.fontSize = fontSize;
      this.fontFamily = fontFamily;
      this.shadowColor = shadowColor;
      this.shadowSize = shadowSize;
    }

    drawText(ctx, text, x, y) {
      this.prepareContextTextStyle(ctx);

      if (this.shadowSize) {
        this.prepareContextShadow(ctx);
        ctx.strokeText(text, x, y);
      }

      this.prepareContextFill(ctx);
      ctx.fillText(text, x, y);

    }

    prepareContextTextAlignment (ctx) {
      let dir = this.dir;

      let textBaseline;
      let textAlign;

      if (!validDirs.includes(dir)) {
        dir = 'C';
      }

      // text align
      switch (dir) {
        case 'C': case 'N': case 'S':
          textAlign = 'center';
          break
        case 'NW': case 'W': case 'SW':
          textAlign = 'right';
          break
        case 'NE': case 'E': case 'SE':
          textAlign = 'left';
          break
      }

      // text baseline
      switch (dir) {
        case 'C': case 'W': case 'E':
          textBaseline = 'middle';
          break
        case 'SW': case 'S': case 'SE':
          textBaseline = 'top';
          break
        case 'NW': case 'N': case 'NE':
          textBaseline = 'bottom';
          break
      }

      ctx.textBaseline = textBaseline;
      ctx.textAlign = textAlign;
    }

    prepareContextTextStyle (ctx) {
      this.prepareContextTextAlignment(ctx);
      ctx.font = `${this.fontSize}px ${this.fontFamily}`;
    }

    prepareContextShadow (ctx) {
      ctx.strokeStyle = this.shadowColor.hex();
      ctx.lineWidth = this.shadowSize * 2;
    }

    prepareContextFill (ctx) {
      ctx.fillStyle = this.color.hex();
    }
  }

  class LabelBase extends GraphemeElement {
    constructor (params = {}) {
      super(params);

      const {
        text = '',
        position = new Vec2(0, 0)
      } = params;

      this.text = text;
      this.position = position;
    }
  }

  // Creates html element of the form
  // <div class="label label-S" > this.text ... </div>
  class BasicLabel extends LabelBase {
    constructor (params = {}) {
      super(params);

      this.style = params.style ? params.style : new BasicLabelStyle(params.style || {});
    }

    render (info) {
      const { text, position } = this;
      const mode = this.style.mode;

      const labelElement = renderInfo.labelManager.getElement(this);

      this.style.setLabelClass(labelElement);

      labelElement.style.top = position.y + 'px';
      labelElement.style.left = position.x + 'px';

      const oldLatex = labelElement.getAttribute('latex-content');

      if (mode === 'latex') {
        // latex-content stores the latex to be rendered to this node, which means
        // that if it is equal to text, it does not need to be recomputed, only maybe
        // moved in some direction
        if (oldLatex !== text) {
          labelElement.setAttribute('latex-content', text);
          // eslint-disable-next-line no-undef
          katex.render(text, labelElement, { throwOnError: false });
        }
      } else {
        if (oldLatex) { labelElement.removeAttribute('latex-content'); }

        labelElement.innerHTML = text;
      }
    }
  }

  class Label2D extends LabelBase {
    constructor (params) {
      super(params);

      this.style = (params.style instanceof Label2DStyle) ? params.style : new Label2DStyle(params.style || {});
    }

    boundingBoxNaive() {
      return measureText(this.text, `${this.style.fontSize}px ${this.style.fontFamily}`)
    }

    render(info) {
      super.render(info);

      this.style.drawText(info.ctx, this.text, this.position.x, this.position.y);
    }
  }

  class Pen {
    constructor (params = {}) {
      const {
        color = new Color(),
        thickness = 2, // in CSS pixels
        dashPattern = [], // lengths of alternating dashes
        dashOffset = 0, // length of dash offset
        endcap = 'round', // endcap, among "butt", "round", "square"
        endcapRes = 0.3, // angle between consecutive endcap roundings, only used in WebGL
        join = 'miter', // join type, among "miter", "round", "bevel"
        joinRes = 0.3, // angle between consecutive join roundings
        useNative = true, // whether to use native line drawing, only used in WebGL
        arrowhead = "Normal", // arrowhead to draw
        arrowLocations = [], // possible values of locations to draw: "start", "substart", "end", "subend"
        visible = true
      } = params;

      this.color = color;
      this.thickness = thickness;
      this.dashPattern = dashPattern;
      this.dashOffset = dashOffset;
      this.endcap = endcap;
      this.endcapRes = endcapRes;
      this.join = join;
      this.joinRes = joinRes;
      this.useNative = useNative;
      this.arrowhead = arrowhead;
      this.arrowLocations = arrowLocations;
      this.visible = visible;
    }

    clone() {
      let copy = new Pen(this);
      copy.color = this.color.clone();
    }

    prepareContext (ctx) {
      ctx.fillStyle = ctx.strokeStyle = this.color.hex();
      ctx.lineWidth = this.thickness;
      ctx.setLineDash(this.dashPattern);
      ctx.lineDashOffset = this.dashOffset;
      ctx.miterLimit = this.thickness / Math.cos(this.joinRes / 2);
      ctx.lineCap = this.endcap;
      ctx.lineJoin = this.join;
    }

    toJSON () {
      return {
        color: this.color.toJSON(),
        thickness: this.thickness,
        dashPattern: this.dashPattern.slice(),
        dashOffset: this.dashOffset,
        endcap: this.endcap,
        endcapRes: this.endcapRes,
        join: this.join,
        joinRes: this.joinRes,
        useNative: this.useNative,
        arrowhead: this.arrowhead,
        arrowLocations: this.arrowLocations.slice(),
        visible: this.visible
      }
    }
  }

  // A glyph to be fill drawn in some fashion.
  class Glyph {
    constructor (params = {}) {
      // vertices is array of Vec2s
      const { vertices = [] } = params;
      this.vertices = vertices;
    }

    addGlyphToPath (path, x = 0, y = 0, scale = 1, angle = 0) {
      const vertices = this.vertices;

      const translateV = new Vec2(x, y);

      // Nothing to draw
      if (vertices.length < 2) {
        return
      }

      const p1 = vertices[0].clone().scale(scale).rotate(angle).add(translateV);
      let jumpToNext = false;

      path.moveTo(p1.x, p1.y);

      for (let i = 1; i < vertices.length; ++i) {
        const p = vertices[i].clone().scale(scale).rotate(angle).add(translateV);

        if (p.hasNaN()) {
          jumpToNext = true;
          continue
        }

        if (jumpToNext) {
          jumpToNext = false;
          path.moveTo(p.x, p.y);
        } else path.lineTo(p.x, p.y);
      }

      path.closePath();
    }
  }

  /**
  A glyph which creates an arrowhead. Tells you where the arrowhead will be with a Path2D
  return value, but also tells you where the base of the arrowhead is so that you can join it
  up properly.

  length is the length of the arrowhead, from tip to tail */
  class Arrowhead extends Glyph {
    constructor (params = {}) {
      super(params);

      const { length = 0 } = params;
      this.length = length;
    }

    addPath2D (path, x1, y1, x2, y2, thickness) {
      const arrowTipAt = new Vec2(x2, y2);
      const displacement = new Vec2(x1, y1).subtract(arrowTipAt).unit().scale(this.length);

      this.addGlyphToPath(path, x2, y2, 2 * thickness, Math.atan2(y2 - y1, x2 - x1));

      return arrowTipAt.add(displacement)
    }
  }

  function createTriangleArrowhead (width, length) {
    return new Arrowhead({
      vertices: [
        new Vec2(0, 0),
        new Vec2(-length, width / 2),
        new Vec2(-length, -width / 2)
      ],
      length
    })
  }

  const Arrowheads = {
    Normal: createTriangleArrowhead(3, 6),
    Squat: createTriangleArrowhead(3, 3)
  };

  function GeometryASMFunctionsCreate(stdlib, foreign, buffer) {
    "use asm";

    var sqrt = stdlib.Math.sqrt;
    var abs = stdlib.Math.abs;
    var atan2 = stdlib.Math.atan2;
    var values = new stdlib.Float64Array(buffer);
    var Infinity = stdlib.Infinity;
    var PI = stdlib.Math.PI;

    function hypot(x, y) {
      x = +x;
      y = +y;

      var quot = 0.0;

      if (+x == +0.0) {
        return abs(y)
      }

      quot = y / x;

      return abs(x) * sqrt(1.0 + quot * quot)
    }

    function point_line_segment_distance(px, py, ax, ay, bx, by) {
      // All input values are floats
      px = +px;
      py = +py;
      ax = +ax;
      ay = +ay;
      bx = +bx;
      by = +by;

      var t = 0.0, tx = 0.0, ty = 0.0, d = 0.0, xd = 0.0, yd = 0.0;

      if (ax == bx) {
        if (ay == by) {
          return +hypot(px - ax, py - ay)
        }
      }

      xd = bx - ax;
      yd = by - ay;

      t = (xd * (px - ax) + yd * (py - ay)) / (xd * xd + yd * yd);

      if (t < 0.0) {
        t = 0.0;
      } else if (t > 1.0) {
        t = 1.0;
      }

      tx = ax + t * (bx - ax);
      ty = ay + t * (by - ay);

      d = +hypot(px - tx, py - ty);

      return d
    }

    function point_line_segment_min_distance(px, py, start, end) {
      px = +px;
      py = +py;
      start = start|0;
      end = end|0;

      var p = 0, q = 0, min_distance = 0.0, distance = 0.0;
      min_distance = Infinity;

      for (p = start << 3, q = ((end - 2) << 3); (p | 0) < (q | 0); p = (p + 16) | 0) {
        distance = +point_line_segment_distance(px, py, +values[p>>3], +values[(p+8)>>3], +values[(p+16)>>3], +values[(p+24)>>3]);

        if (distance < min_distance) {
          min_distance = distance;
        }
      }

      return min_distance
    }

    function point_line_segment_closest(px, py, ax, ay, bx, by) {
      // All input values are floats
      px = +px;
      py = +py;
      ax = +ax;
      ay = +ay;
      bx = +bx;
      by = +by;

      var t = 0.0, tx = 0.0, ty = 0.0, xd = 0.0, yd = 0.0;

      if (ax == bx) {
        if (ay == by) {
          values[0] = +ax;
          values[1] = +ay;

          return +hypot(px - ax, py - ay)
        }
      }

      xd = bx - ax;
      yd = by - ay;

      t = (xd * (px - ax) + yd * (py - ay)) / (xd * xd + yd * yd);

      if (t < 0.0) {
        t = 0.0;
      } else if (t > 1.0) {
        t = 1.0;
      }

      tx = ax + t * (bx - ax);
      ty = ay + t * (by - ay);

      values[0] = +tx;
      values[1] = +ty;

      return +hypot(px - tx, py - ty)
    }

    function point_line_segment_min_closest(px, py, start, end) {
      px = +px;
      py = +py;
      start = start|0;
      end = end|0;

      var p = 0, q = 0, min_distance = 0.0, distance = 0.0, cx = 0.0, cy = 0.0;
      min_distance = Infinity;

      for (p = start << 3, q = ((end - 2) << 3); (p | 0) < (q | 0); p = (p + 16) | 0) {
        distance = +point_line_segment_closest(px, py, +values[p>>3], +values[(p+8)>>3], +values[(p+16)>>3], +values[(p+24)>>3]);

        if (distance < min_distance) {
          min_distance = distance;
          cx = +values[0];
          cy = +values[1];
        }
      }

      values[0] = +cx;
      values[1] = +cy;

      return +min_distance
    }

    function min(x, y) {
      x = +x;
      y = +y;

      if (x < y)
        return x
      return y
    }

    function angle_between(x1, y1, x2, y2, x3, y3) {
      x1 = +x1;
      y1 = +y1;
      x2 = +x2;
      y2 = +y2;
      x3 = +x3;
      y3 = +y3;

      return atan2(y3 - y1, x3 - x1) - atan2(y2 - y1, x2 - x1)
    }

    // Returns 0 if no refinement needed, 1 if left refinement, 2 if right refinement, 3 if both refinment
    function needs_refinement(x1, y1, x2, y2, x3, y3, threshold) {
      x1 = +x1;
      y1 = +y1;
      x2 = +x2;
      y2 = +y2;
      x3 = +x3;
      y3 = +y3;
      threshold = +threshold;

      var angle = 0.0;

      angle = +angle_between(x2, y2, x1, y1, x3, y3);
      angle = +min(abs(angle-PI), abs(angle+PI));

      if (angle > threshold) {
        return 3
      }

      if (y2 != y2) {
        if (y3 == y3) {
          return 3
        }
        if (y1 == y1) {
          return 3
        }
      }

      if (y3 != y3) {
        if (y2 == y2) {
          return 3
        }
      }

      if (y1 != y1) {
        if (y2 == y2) {
          return 3
        }
      }

      return 0
    }

    function angles_between(start, end, threshold, aspectRatio) {
      start = start | 0;
      end = end | 0;
      threshold = +threshold;
      aspectRatio = +aspectRatio;

      var p = 0, q = 0, res = 0, indx = 0;

      for (p = (start + 2) << 3, q = ((end - 2) << 3); (p | 0) < (q | 0); p = (p + 16) | 0) {
        res = needs_refinement(+values[(p-16)>>3],
          +(values[(p-8)>>3] * aspectRatio),
          +values[p>>3],
          +(values[(p+8)>>3] * aspectRatio),
          +values[(p+16)>>3],
          +(values[(p+24)>>3] * aspectRatio),
          +threshold) | 0;

        indx = (((p-4)>>1)) | 0;

        values[indx>>3] = +(res|0);
      }
    }


    return {angles_between: angles_between, point_line_segment_min_distance: point_line_segment_min_distance, point_line_segment_min_closest: point_line_segment_min_closest, needs_refinement: needs_refinement}
  }

  function _point_line_segment_compute(px, py, polyline_vertices, func) {
    if (polyline_vertices.length < 4)
      return Infinity

    let f64 = ASMViews.f64;
    let is_typed_array = polyline_vertices instanceof Float64Array || polyline_vertices instanceof Float32Array;

    if (polyline_vertices.length > BufferSizes.f64) {
      let i, j, min_distance = Infinity;

      for (i = 0; i < polyline_vertices.length / BufferSizes.f64 + 1; ++i) {
        let offset = i * BufferSizes.f64;
        let cnt = polyline_vertices.length - offset;
        let elem_c = Math.min(BufferSizes.f64, cnt);

        if (is_typed_array) {
          f64.set(polyline_vertices.subarray(offset, offset + elem_c));
        } else {
          for (j = 0; j < elem_c; ++j) {
            f64[j] = polyline_vertices[offset + j];
          }
        }

        let distance = func(px, py, 0, elem_c);

        if (distance < min_distance) {
          min_distance = distance;
        }
      }

      return min_distance
    }

    let i;

    if (is_typed_array) {
      ASMViews.f64.set(polyline_vertices);
    } else {
      for (i = 0; i < polyline_vertices.length; ++i) {
        ASMViews.f64[i] = polyline_vertices[i];
      }
    }

    return func(px, py, 0, polyline_vertices.length)
  }


  function point_line_segment_min_distance(px, py, polyline_vertices) {
    return _point_line_segment_compute(px, py, polyline_vertices, GeometryASMFunctions.point_line_segment_min_distance)
  }

  function point_line_segment_min_closest(px, py, polyline_vertices) {
    let distance = _point_line_segment_compute(px, py, polyline_vertices, GeometryASMFunctions.point_line_segment_min_closest);

    let x = ASMViews.f64[0];
    let y = ASMViews.f64[1];

    return {x, y, distance}
  }

  function angles_between(polyline_vertices, threshold=0.03, aspectRatio=1) {
    if (polyline_vertices.length >= BufferSizes.f64) {
      throw new Error("Polyline too numerous")
    }

    if (polyline_vertices instanceof Float32Array || polyline_vertices instanceof Float64Array) {
      ASMViews.f64.set(polyline_vertices);
    }

    let i;

    for (i = 0; i < polyline_vertices.length; ++i) {
      ASMViews.f64[i] = polyline_vertices[i];
    }

    GeometryASMFunctions.angles_between(0, i, threshold, aspectRatio);

    return ASMViews.f64.subarray(0, i/2 - 2)
  }

  let heap = new ArrayBuffer(0x200000);
  let stdlib = {Math: Math, Float64Array: Float64Array, Infinity: Infinity};

  let ASMViews = {f64: new Float64Array(heap)};
  let BufferSizes = {f64: ASMViews.f64.length};
  var GeometryASMFunctions = GeometryASMFunctionsCreate(stdlib, null, heap);

  class PolylineBase extends GraphemeElement {
    constructor (params = {}) {
      super(params);

      let {
        pen,
        vertices = []
      } = params;

      if (!(pen instanceof Pen)) {
        pen = new Pen(pen || {});
      }

      this.pen = pen;
      this.vertices = vertices;
    }
  }


  class PolylineElement extends PolylineBase {
    constructor (params = {}) {
      super(params);

      this.mainPath = null;
      this.arrowPath = null;
    }

    update () {
      super.update();
      const path = new Path2D();
      this.mainPath = path;

      const arrowPath = new Path2D();
      this.arrowPath = arrowPath;

      let vertices = this.vertices;

      if (this.vertices[0] && (this.vertices[0].x || Array.isArray(this.vertices[0]))) {
        vertices = flattenVectors(vertices);
      }

      // Nothing to draw
      if (vertices.length < 4) {
        return
      }

      const coordinateCount = vertices.length;
      const { arrowLocations, thickness } = this.pen;

      const arrowhead = Arrowheads[this.pen.arrowhead];

      const inclStart = arrowLocations.includes('start') && arrowhead;
      const inclSubstart = arrowLocations.includes('substart') && arrowhead;
      const inclEnd = arrowLocations.includes('end') && arrowhead;
      const inclSubend = arrowLocations.includes('subend') && arrowhead;

      let x2 = NaN;
      let x3 = NaN;

      let y2 = NaN;
      let y3 = NaN;

      for (let i = 0; i <= coordinateCount; i += 2) {
        // [x1, y1] = previous vertex (p1), [x2, y2] = current (p2), [x3, y3] = next (p3)
        // If any of these is NaN, that vertex is considered undefined
        const x1 = x2;
        x2 = x3;
        x3 = (i === coordinateCount) ? NaN : vertices[i];

        const y1 = y2;
        y2 = y3;
        y3 = (i === coordinateCount) ? NaN : vertices[i + 1];

        if (i === 0) continue

        const isStartingEndcap = Number.isNaN(x1);
        const isEndingEndcap = Number.isNaN(x3);

        if (isStartingEndcap && ((i === 1 && inclStart) || inclSubstart)) {
          const newV = arrowhead.addPath2D(arrowPath, x3, y3, x2, y2, thickness);
          path.moveTo(newV.x, newV.y);
        } else if (isEndingEndcap && ((i === coordinateCount && inclEnd) || inclSubend)) {
          const newV = arrowhead.addPath2D(arrowPath, x1, y1, x2, y2, thickness);
          path.lineTo(newV.x, newV.y);
        } else if (isStartingEndcap) {
          path.moveTo(x2, y2);
        } else {
          path.lineTo(x2, y2);
        }
      }
    }

    isClick(point) {
      return this.distanceFrom(point) < Math.max(this.pen.thickness / 2, 2)
    }

    distanceFrom(point) {
      return point_line_segment_min_distance(point.x, point.y, this.vertices)
    }

    closestTo(point) {
      return point_line_segment_min_closest(point.x, point.y, this.vertices)
    }

    render (info) {
      super.render(info);

      if (!this.pen.visible || !this.mainPath || !this.arrowPath)
        return

      const ctx = info.ctx;

      this.pen.prepareContext(ctx);

      ctx.stroke(this.mainPath);
      ctx.fill(this.arrowPath);
    }
  }

  const desiredDemarcationSeparation = 50;

  // Array of potential demarcations [a,b], where the small demarcations are spaced every b * 10^n and the big ones are spaced every a * 10^n
  const StandardDemarcations = [[1, 0.2], [1, 0.25], [2, 0.5]];

  function get_demarcation(start, end, distance) {

    let lowestError = Infinity;
    let bestDemarcation;
    let dist = end - start;

    let desiredDemarcationCount = distance / desiredDemarcationSeparation;
    let desiredDemarcationSize = dist / desiredDemarcationCount;

    for (let demarcation of StandardDemarcations) {
      let a = demarcation[0];
      let b = demarcation[1];

      let power = Math.round(Math.log10(desiredDemarcationSize / b));
      let minorSize = 10 ** power * b;

      let err = Math.abs(desiredDemarcationSize - minorSize);
      if (err < lowestError) {
        lowestError = err;
        bestDemarcation = {power, major: a, minor: b};
      }
    }

    return bestDemarcation
  }

  function* demarcate(start, end, demarcation) {
    let modulus = demarcation.major / demarcation.minor;

    let factor = 10 ** demarcation.power * demarcation.minor;

    let start_i = Math.ceil(start / factor);
    let end_i = Math.ceil(end / factor);

    for (let i = start_i; i < end_i; ++i) {
      let pos = factor * i;

      if (pos === 0) {
        yield {pos, type: "axis"};
      } else if (i % modulus === 0) {
        yield {pos, type: "major"};
      } else {
        yield {pos, type: "minor"};
      }
    }
  }

  const GridlineStrategizers = {
    Standard: function* (start1, end1, distance1, start2, end2, distance2) {
      let eggRatio = (end1 - start1) / (end2 - start2) * distance2 / distance1;
      let forceSameDemarcations = Math.abs(eggRatio - 1) < 0.3;

      let demarcationX = get_demarcation(start1, end1, distance1);

      let demarcationY;
      if (forceSameDemarcations) {
        demarcationY = demarcationX;
      } else {
        demarcationY = get_demarcation(start2, end2, distance2);
      }

      for (let x_marker of demarcate(start1, end1, demarcationX)) {
        yield Object.assign(x_marker, {dir: 'x'});
      }

      for (let y_marker of demarcate(start2, end2, demarcationY)) {
        yield Object.assign(y_marker, {dir: 'y'});
      }
    }
  };

  const directionPrecedence = ["N", "S", "W", "E", "SW", "SE", "NW", "NE"];

  /**
   * Label which automatically figures out where to be placed to have the label shown well.
   */
  class SmartLabel extends Label2D {
    constructor(params={}) {
      super(params);

      this.objectBox = null;
      this.forceDir = null;
      this.renderTop = true;
    }

    computeAnchorPoint(dir) {
      const box = this.objectBox;

      let y = 0;
      let x = 0;

      switch (dir) {
        case "W": case "E":
          y = 1;
          break
        case "NW": case "NE": case "N":
          y = 0;
          break
        case "SW": case "SE": case "S":
          y = 2;
          break
      }
      switch (dir) {
        case "NW": case "W": case "SW":
          x = 0;
          break
        case "N": case "S":
          x = 1;
          break
        case "NE": case "E": case "SE":
          x = 2;
          break
      }

      let pos_x = box.x1 + box.width * x / 2;
      let pos_y = box.y1 + box.height * y / 2;

      return {pos: new Vec2(pos_x, pos_y), reference_x: x, reference_y: y, pos_x, pos_y}
    }

    computeTranslatedBoundingBox(bbox, dir) {
      if (!this.objectBox)
        return

      let bboxc = bbox.clone();

      let anchorInfo = this.computeAnchorPoint(dir);

      let x = 0, y = 0;

      switch (anchorInfo.reference_x) {
        case 0:
          x = anchorInfo.pos_x - bbox.width;
          break
        case 1:
          x = anchorInfo.pos_x - bbox.width / 2;
          break
        case 2:
          x = anchorInfo.pos_x;
          break
      }

      switch (anchorInfo.reference_y) {
        case 0:
          y = anchorInfo.pos_y - bbox.height;
          break
        case 1:
          y = anchorInfo.pos_y - bbox.height / 2;
          break
        case 2:
          y = anchorInfo.pos_y;
          break
      }

      bboxc.top_left = new Vec2(x, y);

      return bboxc
    }

    render(info, force=false) {
      if (this.renderTop && !force) {
        info.smartLabelManager.renderTopLabel(this);
        return
      }

      let bbox = this.boundingBoxNaive();

      let dir = this.forceDir;
      const sS = this.style.shadowSize;

      if (!this.forceDir) {
        let min_area = Infinity;

        if (info.smartLabelManager && !this.forceDir) {
          for (let direction of directionPrecedence) {
            let bbox_computed = this.computeTranslatedBoundingBox(bbox, direction);

            let area = info.smartLabelManager.getIntersectingArea(bbox_computed);

            if (area <= min_area) {
              dir = direction;
              min_area = area;
            }
          }
        }
      }

      let computed = this.computeTranslatedBoundingBox(bbox, dir).pad({
        top: -sS,
        bottom: -sS,
        left: -sS,
        right: -sS
      });

      let anchor_info = this.computeAnchorPoint(dir);

      this.style.dir = dir;
      this.position = new Vec2(anchor_info.pos_x, anchor_info.pos_y);

      info.smartLabelManager.addBox(computed);

      super.render(info);
    }
  }

  /* Unicode characters for exponent signs */
  const exponent_reference = {
    '-': String.fromCharCode(8315),
    '0': String.fromCharCode(8304),
    '1': String.fromCharCode(185),
    '2': String.fromCharCode(178),
    '3': String.fromCharCode(179),
    '4': String.fromCharCode(8308),
    '5': String.fromCharCode(8309),
    '6': String.fromCharCode(8310),
    '7': String.fromCharCode(8311),
    '8': String.fromCharCode(8312),
    '9': String.fromCharCode(8313)
  };

  /* Convert a digit into its exponent form */
  function convert_char(c) {
    return exponent_reference[c];
  }

  /* Convert an integer into its exponent form (of Unicode characters) */
  function exponentify(integer) {
    let stringi = integer + '';
    let out = '';

    for (let i = 0; i < stringi.length; ++i) {
      out += convert_char(stringi[i]);
    }

    return out;
  }

  // Credit: https://stackoverflow.com/a/20439411
  /* Turns a float into a pretty float by removing dumb floating point things */
  function beautifyFloat$1(f, prec=12) {
    let strf = f.toFixed(prec);
    if (strf.includes('.')) {
      return strf.replace(/\.?0+$/g,'');
    } else {
      return strf;
    }
  }

  function isApproxEqual$1(v, w, eps=1e-5) {
    return Math.abs(v - w) < eps;
  }

  const CDOT = String.fromCharCode(183);

  const StandardLabelFunction = x => {
    if (x === 0) return "0"; // special case
    else if (Math.abs(x) < 1e5 && Math.abs(x) > 1e-5)
      // non-extreme floats displayed normally
      return beautifyFloat$1(x);
    else {
      // scientific notation for the very fat and very small!

      let exponent = Math.floor(Math.log10(Math.abs(x)));
      let mantissa = x / (10 ** exponent);

      let prefix = (isApproxEqual$1(mantissa, 1) ? '' :
        (beautifyFloat$1(mantissa, 8) + CDOT));
      let exponent_suffix = "10" + exponentify(exponent);

      return prefix + exponent_suffix;
    }
  };

  /*
   * @class Gridlines A set of gridlines for a Plot2D
   */
  class Gridlines extends GraphemeElement {
    constructor(params={}) {
      super(params);

      this.strategizer = GridlineStrategizers.Standard;
      this.label_function = StandardLabelFunction;

      this.label_positions = ["dynamic"];
      this.label_types = ["axis", "major"];
      this.label_style = new Label2DStyle({fontSize: 14, shadowSize: 3, shadowColor: Colors.WHITE});
      this.label_padding = 5;

      this._labels = [];

      this.pens = {
        "axis": new Pen({thickness: 3}),
        "major": new Pen({thickness: 1}),
        "minor": new Pen({thickness: 0.5}),
        "box": new Pen({thickness: 2})
      };

      this._polylines = {};

      this.addEventListener("plotcoordschanged", () => this.markUpdate());
    }

    update(info) {
      super.update();

      let transform = this.plot.transform;
      let plotCoords = transform.coords;
      let plotBox = transform.box;

      this._labels = [];

      const markers = this.strategizer(plotCoords.x1, plotCoords.x2, plotBox.width, plotCoords.y1, plotCoords.y2, plotBox.height);

      let polylines = this._polylines = {};
      let computed_label_styles = {};

      let label_padding = this.label_padding;

      const addLabel = (marker_pos, style, position) => {
        let label = new Label2D({style, text: this.label_function(marker_pos), position});

        this._labels.push(label);
      };

      const getLabelStyle = (name, construct) => {
        if (computed_label_styles[name]) {
          return computed_label_styles[name]
        } else {
          let label_style = computed_label_styles[name] = new Label2DStyle(this.label_style);

          construct(label_style);
          return label_style
        }
      };

      const dynamic = this.label_positions.includes("dynamic");

      for (let marker of markers) {
        if (marker.dir === 'x') {
          let polyline = polylines[marker.type];

          if (!polyline)
            polyline = polylines[marker.type] = new PolylineElement({ pen: this.pens[marker.type] });

          let x_coord = roundToCanvasPixel(transform.plotToPixelX(marker.pos));
          let sy = plotBox.y1, ey = plotBox.y2;

          polyline.vertices.push(x_coord, sy, x_coord, ey, NaN, NaN);

          if (this.label_types.includes(marker.type)) {
            let axisPosition = transform.plotToPixelY(0);
            let axisInRange = (transform.box.y1 <= axisPosition && axisPosition <= transform.box.y2);
            let axis = this.label_positions.includes("axis") || (dynamic && axisInRange);

            let top = this.label_positions.includes("top");
            let bottom = this.label_positions.includes("bottom");
            let top_in = this.label_positions.includes("top-in") || (dynamic && axisPosition < transform.box.y1);
            let bottom_in = this.label_positions.includes("bottom-in") || (dynamic && axisPosition > transform.box.y2);

            if (top) {
              let style = getLabelStyle("top", (style) => style.dir = "N");

              addLabel(marker.pos, style, new Vec2(x_coord, sy - label_padding));
            }

            if (bottom) {
              let style = getLabelStyle("bottom", (style) => style.dir = "S");

              addLabel(marker.pos, style, new Vec2(x_coord, ey + label_padding));
            }

            if (bottom_in) {
              let style_name = "bottom-" + marker.type;

              let style = getLabelStyle(style_name, (style) => {
                style.dir = (marker.type === "axis") ? "NW" : "N";
              });

              addLabel(marker.pos, style, new Vec2(x_coord - ((marker.type === "axis") ? label_padding : 0), ey - label_padding));
            }

            if (top_in) {
              let style_name = "top-" + marker.type;

              let style = getLabelStyle(style_name, (style) => {
                style.dir = (marker.type === "axis") ? "SW" : "S";
              });

              addLabel(marker.pos, style, new Vec2(x_coord - ((marker.type === "axis") ? label_padding : 0), sy + label_padding));
            }

            if (axis && axisInRange) {
              let style_name = "x-axis-" + marker.type;

              let style = getLabelStyle(style_name, (style) => {
                style.dir = (marker.type === "axis") ? "SW" : "S";
              });

              addLabel(marker.pos, style, new Vec2(x_coord - ((marker.type === "axis") ? label_padding : 0), axisPosition + label_padding));
            }
          }
        } else if (marker.dir === 'y') {
          let polyline = polylines[marker.type];

          if (!polyline) {
            polyline = polylines[marker.type] = new PolylineElement({pen: this.pens[marker.type]});
          }

          let y_coord = roundToCanvasPixel(transform.plotToPixelY(marker.pos));
          let sx = plotBox.x1, ex = plotBox.x2;

          polyline.vertices.push(sx, y_coord, ex, y_coord, NaN, NaN);

          if (this.label_types.includes(marker.type)) {
            let axisPosition = transform.plotToPixelX(0);
            let axisInRange = (transform.box.x1 <= axisPosition && axisPosition <= transform.box.x2);
            let axis = this.label_positions.includes("axis") || (dynamic && axisInRange);

            let left = this.label_positions.includes("left");
            let right = this.label_positions.includes("right");
            let left_in = this.label_positions.includes("left-in") || (dynamic && axisPosition < transform.box.x1);
            let right_in = this.label_positions.includes("right-in") || (dynamic && axisPosition > transform.box.x2);

            if (left) {
              let style = getLabelStyle("left", (style) => style.dir = "W");

              addLabel(marker.pos, style, new Vec2(sx - label_padding, y_coord));
            }

            if (right) {
              let style = getLabelStyle("right", (style) => style.dir = "W");

              addLabel(marker.pos, style, new Vec2(ex + label_padding, y_coord));
            }

            if (left_in) {
              let style_name = "left-" + marker.type;

              let style = getLabelStyle(style_name, (style) => {
                style.dir = (marker.type === "axis") ? "SE" : "E";
              });

              addLabel(marker.pos, style, new Vec2(sx + label_padding, y_coord + ((marker.type === "axis") ? label_padding : 0)));
            }

            if (right_in) {
              let style_name = "right-" + marker.type;

              let style = getLabelStyle(style_name, (style) => {
                style.dir = (marker.type === "axis") ? "SW" : "W";
              });

              addLabel(marker.pos, style, new Vec2(ex - label_padding, y_coord + ((marker.type === "axis") ? label_padding : 0)));
            }

            if (axis && axisInRange) {
              let style_name = "y-axis-" + marker.type;

              let style = getLabelStyle(style_name, (style) => {
                style.dir = (marker.type === "axis") ? "SW" : "W";
              });

              addLabel(marker.pos, style, new Vec2(axisPosition - label_padding, y_coord + ((marker.type === "axis") ? label_padding : 0)));
            }
          }
        }
      }

      if (this.pens["box"]) {
        polylines["box"] = new PolylineElement({vertices: plotBox.getBoxVertices(), pen: this.pens["box"]});
      }

      for (let key in polylines) {
        polylines[key].update(info);
      }
    }

    render(info) {
      super.render(info);

      for (let key in this._polylines) {
        if (this._polylines.hasOwnProperty(key)) {

          this._polylines[key].render(info);
        }
      }

      for (let label of this._labels) {
        label.render(info);
      }
    }
  }

  function operator_derivative (opNode, variable = 'x') {
    if (opNode.isConstant()) {
      return new ConstantNode({value: 0})
    }

    let node;
    switch (opNode.operator) {
      case '>':
      case '>=':
      case '<':
      case '<=':
      case '!=':
      case '==':
        return new ConstantNode({ value: 0 })
      case 'ifelse':
        return new OperatorNode({
          operator: 'ifelse',
          children: [
            opNode.children[0].derivative(variable),
            opNode.children[1],
            opNode.children[2].derivative(variable)
          ]
        })
      case 'piecewise':
        node = opNode.clone();

        for (let i = 1; i < node.children.length; ++i) {
          node.children[i] = node.children[i].derivative(variable);
        }

        if (node.children.length % 2 === 1) {
          let i = node.children.length - 1;
          node.children[i] = node.children[i].derivative(variable);
        }

        return node
      case 'cchain':
        return opNode.clone()
      case '+':
        node = new OperatorNode({ operator: '+' });
        node.children = opNode.children.map(child => child.derivative(variable));
        return node
      case '*':
        let firstChild = opNode.children[0], secondChild = opNode.children[1];

        if (firstChild.isConstant()) {
          node = new OperatorNode({operator: '*', children: [
            firstChild,
              secondChild.derivative(variable)
            ]});
        } else if (secondChild.isConstant()) {
          node = new OperatorNode({operator: '*', children: [
              secondChild,
              firstChild.derivative(variable)
            ]});
        } else {
          node = new OperatorNode({ operator: '+' });

          // product rule
          let first = new OperatorNode({ operator: '*' });
          let second = new OperatorNode({ operator: '*' });

          first.children = [opNode.children[0].clone(), opNode.children[1].derivative(variable)];
          second.children = [opNode.children[0].derivative(variable), opNode.children[1].clone()];

          node.children = [first, second];
        }
        return node
      case '/':
        // Division rules
        if (opNode.children[1] instanceof ConstantNode) {
          return new OperatorNode({
            operator: '/',
            children: [opNode.children[0].derivative(variable), opNode.children[1]]
          })
        } else {
          node = new OperatorNode({ operator: '/' });

          let top = new OperatorNode({ operator: '-' });
          let topFirst = new OperatorNode({ operator: '*' });
          topFirst.children = [opNode.children[0].derivative(variable), opNode.children[1].clone()];
          let topSecond = new OperatorNode({ operator: '*' });
          topSecond.children = [opNode.children[0], opNode.children[1].derivative(variable)];

          top.children = [topFirst, topSecond];
          let bottom = new OperatorNode({ operator: '^' });
          bottom.children = [opNode.children[1].clone(), new ConstantNode({ value: 2 })];

          node.children = [top, bottom];
        }

        return node
      case '-':
        node = new OperatorNode({ operator: '-' });
        node.children = opNode.children.map(child => child.derivative(variable));
        return node
      case '^':
        let child1 = opNode.children[1];

        if (child1.isConstant()) {
          let power = child1.evaluateConstant();

          if (power === 0) {
            return new ConstantNode({ value: 0 })
          }

          // power rule
          let node = new OperatorNode({ operator: '*' });
          let node2 = new OperatorNode({ operator: '*' });
          let pow = new OperatorNode({ operator: '^' });

          let newPower;

          if (child1 instanceof ConstantNode && powerExactlyRepresentableAsFloat(child1.text)) {
            newPower = new ConstantNode({value: power - 1});
          } else {
            newPower = new OperatorNode({operator: '-', children: [
                opNode.children[1],
                new ConstantNode({ value: 1 })]});
          }

          pow.children = [opNode.children[0].clone(), newPower];

          node2.children = [opNode.children[0].derivative(variable), pow];
          node.children = [child1.clone(), node2];

          return node
        } else if (opNode.children[0].isConstant()) {
          return new OperatorNode({
            operator: '*',
            children: [
              new OperatorNode({
                operator: 'ln',
                children: [
                  opNode.children[0].clone()
                ]
              }),
              new OperatorNode({
                operator: '*',
                children: [
                  opNode.clone(),
                  opNode.children[1].derivative(variable)
                ]
              })
            ]
          })
        } else {
          return new OperatorNode({
            operator: '*',
            children: [
              opNode.clone(),
              new OperatorNode({
                operator: '+',
                children: [
                  new OperatorNode({
                    operator: '*',
                    children: [
                      opNode.children[1].derivative(variable),
                      new OperatorNode({
                        operator: 'ln',
                        children: [
                          opNode.children[0].clone()
                        ]
                      })
                    ]
                  }),
                  new OperatorNode({
                    operator: '*',
                    children: [
                      new OperatorNode({
                        operator: '/',
                        children: [
                          opNode.children[1].clone(),
                          opNode.children[0].clone()
                        ]
                      }),
                      opNode.children[0].derivative(variable)
                    ]
                  })
                ]
              })
            ]
          })
        }
      case 'sin':
        return new OperatorNode({
          operator: '*',
          children: [
            new OperatorNode({
              operator: 'cos',
              children: [opNode.children[0].clone()]
            }),
            opNode.children[0].derivative(variable)
          ]
        })
      case 'cos':
        return new OperatorNode({
          operator: '*',
          children: [
            new ConstantNode({ value: -1 }),
            new OperatorNode({
              operator: '*',
              children: [
                new OperatorNode({
                  operator: 'sin',
                  children: [opNode.children[0].clone()]
                }),
                opNode.children[0].derivative(variable)
              ]
            })
          ]
        })
      case 'tan':
        return new OperatorNode({
          operator: '*',
          children: [
            new OperatorNode({
              operator: '^',
              children: [
                new OperatorNode({
                  operator: 'sec',
                  children: [opNode.children[0].clone()]
                }),
                new ConstantNode({ value: 2 })
              ]
            }),
            opNode.children[0].derivative(variable)
          ]
        })
      case 'csc':
        return new OperatorNode({
          operator: '*',
          children: [
            new ConstantNode({ value: -1 }),
            new OperatorNode({
              operator: '*',
              children: [
                new OperatorNode({
                  operator: '*',
                  children: [
                    new OperatorNode({
                      operator: 'csc',
                      children: [
                        opNode.children[0].clone()
                      ]
                    }),
                    new OperatorNode({
                      operator: 'cot',
                      children: [
                        opNode.children[0].clone()
                      ]
                    })
                  ]
                }),
                opNode.children[0].derivative(variable)
              ]
            })
          ]
        })
      case 'sec':
        return new OperatorNode({
          operator: '*',
          children: [
            new OperatorNode({
              operator: '*',
              children: [
                new OperatorNode({
                  operator: 'sec',
                  children: [
                    opNode.children[0].clone()
                  ]
                }),
                new OperatorNode({
                  operator: 'tan',
                  children: [
                    opNode.children[0].clone()
                  ]
                })
              ]
            }),
            opNode.children[0].derivative(variable)
          ]
        })
      case 'cot':
        return new OperatorNode({
          operator: '*',
          children: [new ConstantNode({ value: -1 }), new OperatorNode({
            operator: '*',
            children: [
              new OperatorNode({
                operator: '^',
                children: [
                  new OperatorNode({
                    operator: 'csc',
                    children: [opNode.children[0].clone()]
                  }),
                  new ConstantNode({ value: 2 })
                ]
              }),
              opNode.children[0].derivative(variable)
            ]
          })]
        })
      case 'sqrt':
        return new OperatorNode({
          operator: '*',
          children: [
            new ConstantNode({ value: 0.5 }),
            new OperatorNode({
              operator: '*',
              children: [
                new OperatorNode({
                  operator: '^',
                  children: [
                    opNode.children[0].clone(),
                    new ConstantNode({ value: -0.5 })
                  ]
                }),
                opNode.children[0].derivative(variable)
              ]
            })
          ]
        })
      case 'cbrt':
        return new OperatorNode({
          operator: '*',
          children: [
            ONE_THIRD.clone(),
            new OperatorNode({
              operator: '*',
              children: [
                new OperatorNode({
                  operator: 'pow_rational',
                  children: [
                    opNode.children[0].clone(),
                    new ConstantNode({ value: -2 }),
                    new ConstantNode({ value: 3 })
                  ]
                }),
                opNode.children[0].derivative(variable)
              ]
            })
          ]
        })
      case 'asin':
        return new OperatorNode({
          operator: '/',
          children: [
            opNode.children[0].derivative(variable),
            new OperatorNode({
              operator: 'sqrt',
              children: [
                new OperatorNode({
                  operator: '-',
                  children: [
                    new ConstantNode({ value: 1 }),
                    new OperatorNode({
                      operator: '^',
                      children: [
                        opNode.children[0].clone(),
                        new ConstantNode({ value: 2 })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      case 'acos':
        return new OperatorNode({
          operator: '*',
          children: [new ConstantNode({ value: -1 }), new OperatorNode({
            operator: '/',
            children: [
              opNode.children[0].derivative(variable),
              new OperatorNode({
                operator: 'sqrt',
                children: [
                  new OperatorNode({
                    operator: '-',
                    children: [
                      new ConstantNode({ value: 1 }),
                      new OperatorNode({
                        operator: '^',
                        children: [
                          opNode.children[0].clone(),
                          new ConstantNode({ value: 2 })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          })]
        })
      case 'atan':
        return new OperatorNode({
          operator: '/',
          children: [
            opNode.children[0].derivative(variable),
            new OperatorNode({
              operator: '+',
              children: [
                new ConstantNode({ value: 1 }),
                new OperatorNode({
                  operator: '^',
                  children: [
                    opNode.children[0].clone(),
                    new ConstantNode({ value: 2 })
                  ]
                })
              ]
            })
          ]
        })
      case 'acot':
        return new OperatorNode({
          operator: '/',
          children: [
            new OperatorNode({
              operator: '*',
              children: [new ConstantNode({ value: -1 }), opNode.children[0].derivative(variable)]
            }),
            new OperatorNode({
              operator: '+',
              children: [
                new ConstantNode({ value: 1 }),
                new OperatorNode({
                  operator: '^',
                  children: [
                    opNode.children[0].clone(),
                    new ConstantNode({ value: 2 })
                  ]
                })
              ]
            })
          ]
        })
      case 'asec':
        return new OperatorNode({
          operator: '/',
          children: [
            opNode.children[0].derivative(variable),
            new OperatorNode({
              operator: '*',
              children: [
                new OperatorNode({
                  operator: 'abs',
                  children: [
                    opNode.children[0].clone()
                  ]
                }),
                new OperatorNode({
                  operator: 'sqrt',
                  children: [
                    new OperatorNode({
                      operator: '-',
                      children: [
                        new OperatorNode({
                          operator: '^',
                          children: [
                            opNode.children[0].clone(),
                            new ConstantNode({ value: 2 })
                          ]
                        }),
                        new ConstantNode({ value: 1 })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      case 'acsc':
        return new OperatorNode({
          operator: '/',
          children: [
            new OperatorNode({
              operator: '*',
              children: [new ConstantNode({ value: -1 }), opNode.children[0].derivative(variable)]
            }),
            new OperatorNode({
              operator: '*',
              children: [
                new OperatorNode({
                  operator: 'abs',
                  children: [
                    opNode.children[0].clone()
                  ]
                }),
                new OperatorNode({
                  operator: 'sqrt',
                  children: [
                    new OperatorNode({
                      operator: '-',
                      children: [
                        new OperatorNode({
                          operator: '^',
                          children: [
                            opNode.children[0].clone(),
                            new ConstantNode({ value: 2 })
                          ]
                        }),
                        new ConstantNode({ value: 1 })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      case 'sinh':
        return new OperatorNode({
          operator: '*',
          children: [
            opNode.children[0].derivative(),
            new OperatorNode({
              operator: 'cosh',
              children: [
                opNode.children[0].clone()
              ]
            })
          ]
        })
      case 'cosh':
        return new OperatorNode({
          operator: '*',
          children: [
            opNode.children[0].derivative(),
            new OperatorNode({
              operator: 'sinh',
              children: [
                opNode.children[0].clone()
              ]
            })
          ]
        })
      case 'tanh':
        return new OperatorNode({
          operator: '*',
          children: [
            new OperatorNode({
              operator: '^',
              children: [
                new OperatorNode({
                  operator: 'sech',
                  children: [ opNode.children[0].clone() ]
                }),
                new ConstantNode({ value: 2 })
              ]
            }),
            opNode.children[0].derivative(variable)
          ]
        })
      case 'csch':
        return new OperatorNode({
          operator: '*',
          children: [
            new ConstantNode({ value: -1 }),
            new OperatorNode({
              operator: '*',
              children: [
                new OperatorNode({
                  operator: '*',
                  children: [
                    new OperatorNode({
                      operator: 'csch',
                      children: [
                        opNode.children[0].clone()
                      ]
                    }),
                    new OperatorNode({
                      operator: 'coth',
                      children: [
                        opNode.children[0].clone()
                      ]
                    })
                  ]
                }),
                opNode.children[0].derivative(variable)
              ]
            })
          ]
        })
      case 'sech':
        return new OperatorNode({
          operator: '*',
          children: [new ConstantNode({ value: -1 }), new OperatorNode({
            operator: '*',
            children: [
              new OperatorNode({
                operator: '*',
                children: [
                  new OperatorNode({
                    operator: 'sech',
                    children: [
                      opNode.children[0].clone()
                    ]
                  }),
                  new OperatorNode({
                    operator: 'tanh',
                    children: [
                      opNode.children[0].clone()
                    ]
                  })
                ]
              }),
              opNode.children[0].derivative(variable)
            ]
          })]
        })
      case 'coth':
        return new OperatorNode({
          operator: '*',
          children: [new ConstantNode({ value: -1 }), new OperatorNode({
            operator: '*',
            children: [
              new OperatorNode({
                operator: '^',
                children: [
                  new OperatorNode({
                    operator: 'csch',
                    children: [opNode.children[0].clone()]
                  }),
                  new ConstantNode({ value: 2 })
                ]
              }),
              opNode.children[0].derivative(variable)
            ]
          })]
        })
      case 'asinh':
        return new OperatorNode({
          operator: '/',
          children: [
            opNode.children[0].derivative(variable),
            new OperatorNode({
              operator: 'sqrt',
              children: [
                new OperatorNode({
                  operator: '+',
                  children: [
                    new ConstantNode({ value: 1 }),
                    new OperatorNode({
                      operator: '^',
                      children: [
                        opNode.children[0].clone(),
                        new ConstantNode({ value: 2 })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      case 'acosh':
        return new OperatorNode({
          operator: 'ifelse',
          children: [new OperatorNode({
            operator: '*',
            children: [new ConstantNode({ value: -1 }), new OperatorNode({
              operator: '/',
              children: [
                opNode.children[0].derivative(variable),
                new OperatorNode({
                  operator: 'sqrt',
                  children: [
                    new OperatorNode({
                      operator: '-',
                      children: [
                        new OperatorNode({
                          operator: '^',
                          children: [
                            opNode.children[0].clone(),
                            new ConstantNode({ value: 2 })
                          ]
                        }),
                        new ConstantNode({ value: 1 })
                      ]
                    })
                  ]
                })
              ]
            })]
          }), new OperatorNode({
            operator: '>=',
            children: [opNode.children[0], new ConstantNode({ value: 1 })]
          }),
            new ConstantNode({ value: NaN })]
        })
      case 'atanh':
        var isAtanh = true;
      case 'acoth':
        return new OperatorNode({
          operator: 'ifelse',
          children: [new OperatorNode({
            operator: '/',
            children: [
              opNode.children[0].derivative(variable),
              new OperatorNode({
                operator: '-',
                children: [
                  new ConstantNode({ value: 1 }),
                  new OperatorNode({
                    operator: '^',
                    children: [
                      opNode.children[0].clone(),
                      new ConstantNode({ value: 2 })
                    ]
                  })
                ]
              })
            ]
          }), new OperatorNode({
            operator: isAtanh ? '<=' : '>=',
            children: [new OperatorNode({
              operator: 'abs',
              children: [opNode.children[0].clone()]
            }), new ConstantNode({ value: 1 })]
          }),
            new ConstantNode({ value: NaN })]
        })
      case 'asech':
        return new OperatorNode({
          operator: 'ifelse',
          children: [new OperatorNode({
            operator: '/',
            children: [
              new OperatorNode({
                operator: '*',
                children: [
                  new ConstantNode({ value: -1 }),
                  opNode.children[0].derivative(variable)
                ]
              }),
              new OperatorNode({
                operator: '*',
                children: [
                  opNode.children[0].clone(),
                  new OperatorNode({
                    operator: 'sqrt',
                    children: [
                      new OperatorNode({
                        operator: '-',
                        children: [
                          new ConstantNode({ value: 1 }),
                          new OperatorNode({
                            operator: '^',
                            children: [
                              opNode.children[0].clone(),
                              new ConstantNode({ value: 2 })
                            ]
                          })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          }), new OperatorNode({
            operator: '>',
            children: [opNode.children[0].clone(), new ConstantNode({ value: 0 })]
          }), new ConstantNode({ value: NaN })]
        })
      case 'acsch':
        return new OperatorNode({
          operator: '/',
          children: [
            new OperatorNode({
              operator: '*',
              children: [new ConstantNode({ value: -1 }), opNode.children[0].derivative(variable)]
            }),
            new OperatorNode({
              operator: '*',
              children: [
                new OperatorNode({
                  operator: 'abs',
                  children: [
                    opNode.children[0].clone()
                  ]
                }),
                new OperatorNode({
                  operator: 'sqrt',
                  children: [
                    new OperatorNode({
                      operator: '+',
                      children: [
                        new OperatorNode({
                          operator: '^',
                          children: [
                            opNode.children[0].clone(),
                            new ConstantNode({ value: 2 })
                          ]
                        }),
                        new ConstantNode({ value: 1 })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      case 'gamma':
        // Derivative of gamma is polygamma(0, z) * gamma(z) * z'
        return new OperatorNode({
          operator: '*',
          children: [
            new OperatorNode({
              operator: '*',
              children: [
                new OperatorNode({
                  operator: 'polygamma',
                  children: [
                    new ConstantNode({ value: 0 }),
                    opNode.children[0]
                  ]
                }),
                opNode.clone()
              ]
            }),
            opNode.children[0].derivative(variable)
          ]
        })
      case 'factorial':
        return new OperatorNode({
          operator: 'gamma',
          children: [
            new OperatorNode({
              operator: '+',
              children: [
                new ConstantNode({ value: 1 }),
                opNode.children[0]
              ]
            })
          ]
        }).derivative(variable)
      case 'abs':
        return new OperatorNode({
          operator: 'ifelse',
          children: [
            new OperatorNode({
              operator: '*',
              children: [
                new ConstantNode({ value: -1 }),
                opNode.children[0].derivative(variable)
              ]
            }),
            new OperatorNode({
              operator: '<',
              children: [
                opNode.children[0].clone(),
                new ConstantNode({ value: 0 })
              ]
            }),
            opNode.children[0].derivative(variable)
          ]
        })
      case 'min':
        if (opNode.children.length === 0) {
          return new ConstantNode({ value: 0 })
        } else if (opNode.children.length === 1) {
          return opNode.children[0].derivative(variable)
        }

        // Translate to ifelse statement, then take derivative
        var next_level = opNode.children.slice(1);

        if (next_level.length === 1) {
          next_level = next_level[0].clone();
        } else {
          next_level = new OperatorNode({
            operator: 'min',
            children: next_level.clone()
          });
        }

        return new OperatorNode({
          operator: 'ifelse',
          children: [
            opNode.children[0].derivative(variable),
            new OperatorNode({
              operator: '<',
              children: [
                opNode.children[0],
                next_level
              ]
            }),
            next_level.derivative(variable)
          ]
        })
      case 'max':
        if (opNode.children.length === 0) {
          return new ConstantNode({ value: 0 })
        } else if (opNode.children.length === 1) {
          return opNode.children[0].derivative(variable)
        }

        // Translate to ifelse statement, then take derivative
        var next_level = opNode.children.slice(1);

        if (next_level.length === 1) {
          next_level = next_level[0].clone();
        } else {
          next_level = new OperatorNode({
            operator: 'max',
            children: next_level.map(cow => cow.clone())
          });
        }

        return new OperatorNode({
          operator: 'ifelse',
          children: [
            opNode.children[0].derivative(variable),
            new OperatorNode({
              operator: '>',
              children: [
                opNode.children[0],
                next_level
              ]
            }),
            next_level.derivative(variable)
          ]
        })
      case 'floor':
        return new ConstantNode({ value: 0 })
      case 'ceil':
        return new ConstantNode({ value: 0 })
      case 'digamma':
        // digamma = polygamma(0, x)
        return new OperatorNode({
          operator: 'polygamma',
          children: [
            new ConstantNode({ value: 0 }),
            opNode.children[0]
          ]
        }).derivative(variable)
      case 'trigamma':
        // trigamma = polygamma(1, x)
        return new OperatorNode({
          operator: 'polygamma',
          children: [
            new ConstantNode({ value: 1 }),
            opNode.children[0]
          ]
        }).derivative(variable)
      case 'ln_gamma':
        return new OperatorNode({
          operator: '*',
          children: [
            new OperatorNode({
              operator: 'digamma',
              children: [
                opNode.children[0]
              ]
            }),
            opNode.children[0].derivative(variable)
          ]
        })
      case 'polygamma':
        return new OperatorNode({
          operator: '*',
          children: [new OperatorNode({
            operator: 'polygamma',
            children: [
              new ConstantNode({ value: opNode.children[0].value + 1 }),
              opNode.children[1]
            ]
          }),
            opNode.children[1].derivative(variable)
          ]
        })
      case 'ln':
        return new OperatorNode({
          operator: 'ifelse',
          children: [new OperatorNode({
            operator: '/',
            children: [
              opNode.children[0].derivative(variable),
              opNode.children[0].clone()
            ]
          }), new OperatorNode({
            operator: '>',
            children: [opNode.children[0].clone(), new ConstantNode({ value: 0 })]
          }), new ConstantNode({ value: NaN })]
        })
      case 'log10':
        return new OperatorNode({
          operator: 'ifelse',
          children: [new OperatorNode({
            operator: '/',
            children: [
              opNode.children[0].derivative(variable),
              new OperatorNode({
                operator: '*',
                children: [opNode.children[0].clone(), LN10.clone()]
              })
            ]
          }), new OperatorNode({
            operator: '>',
            children: [opNode.children[0].clone(), new ConstantNode({ value: 0 })]
          }), new ConstantNode({ value: NaN })]
        })
      case 'log2':
        return new OperatorNode({
          operator: 'ifelse',
          children: [new OperatorNode({
            operator: '/',
            children: [
              opNode.children[0].derivative(variable),
              new OperatorNode({
                operator: '*',
                children: [opNode.children[0], LN2.clone()]
              })
            ]
          }), new OperatorNode({
            operator: '>',
            children: [opNode.children[0].clone(), new ConstantNode({ value: 0 })]
          }), new ConstantNode({ value: NaN })]
        })
      case 'logb':
        return new OperatorNode({
          operator: 'ifelse',
          children: [new OperatorNode({
            operator: '/',
            children: [new OperatorNode({
              operator: 'ln',
              children: [opNode.children[1]]
            }).derivative(), new OperatorNode({
              operator: 'ln',
              children: [
                opNode.children[0]
              ]
            })]
          }), new OperatorNode({
            operator: '>',
            children: [opNode.children[0].clone(), new ConstantNode({ value: 0 })]
          }), new ConstantNode({ value: NaN })]
        })
      default:
        // No symbolic derivative, oof
        throw new Error('unimplemented')
    }
  }

  function multiplyPolynomials(coeffs1, coeffs2, degree) {
    let ret = [];
    for (let i = 0; i <= degree; ++i) {
      ret.push(0);
    }

    for (let i = 0; i < coeffs1.length; ++i) {
      for (let j = 0; j < coeffs2.length; ++j) {
        ret[i + j] += coeffs1[i] * coeffs2[j];
      }
    }

    return ret
  }

  class SingleVariablePolynomial {
    constructor(coeffs=[0]) {
      // Order: first is constant, second is linear, etc.
      this.coeffs = coeffs;
    }

    _evaluateFloat(x) {
      let coeffs = this.coeffs;
      let prod = 1;
      let sum = 0;

      for (let i = 0; i < coeffs.length; ++i) {
        sum += coeffs[i] * prod;

        prod *= x;
      }

      return sum
    }

    evaluate(x) {
      let coeffs = this.coeffs;
      let prod = 1;
      let sum = 0;

      for (let i = 0; i < coeffs.length; ++i) {
        let coeff = coeffs[i];

        // TODO
        if (isNaN(coeff))
          coeff = coeff.approximate_as_float();

        sum += coeff * prod;

        prod *= x;
      }

      return sum
    }

    degree() {
      return this.coeffs.length - 1
    }

    derivative() {
      let newCoeffs = [];
      const coeffs = this.coeffs;

      for (let i = 1; i < coeffs.length; ++i) {
        let coeff = coeffs[i];

        newCoeffs.push(i * coeff);
      }

      return new SingleVariablePolynomial(newCoeffs)
    }

    clone() {
      return new SingleVariablePolynomial(this.coeffs.slice())
    }

    add(poly) {
      let coeffs = this.coeffs;
      let otherCoeffs = poly.coeffs;

      for (let i = 0; i < otherCoeffs.length; ++i) {
        coeffs[i] = (coeffs[i] ? coeffs[i] : 0) + otherCoeffs[i];
      }

      return this
    }

    subtract(poly) {
      const coeffs = this.coeffs;
      const otherCoeffs = poly.coeffs;

      for (let i = 0; i < otherCoeffs.length; ++i) {
        coeffs[i] = (coeffs[i] ? coeffs[i] : 0) - otherCoeffs[i];
      }

      return this
    }

    multiplyScalar(s) {
      const coeffs = this.coeffs;

      for (let i = 0; i < coeffs.length; ++i) {
        coeffs[i] *= s;
      }

      return this
    }

    multiply(poly) {
      this.coeffs = multiplyPolynomials(poly.coeffs, this.coeffs, poly.degree() + this.degree());
      return this
    }

    integral() {
      // TODO
    }
  }

  // Credit to https://stackoverflow.com/questions/15454183/how-to-make-a-function-that-computes-the-factorial-for-numbers-with-decimals!! Thank you so much

  var g = 7;
  var C = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  var integer_factorials = [
    1,
    1,
    2,
    6,
    24,
    120,
    720,
    5040,
    40320,
    362880,
    3628800,
    39916800,
    479001600,
    6227020800,
    87178291200,
    1307674368000,
    20922789888000,
    355687428096000,
    6402373705728000,
    121645100408832000,
    2432902008176640000,
    51090942171709440000,
    1.1240007277776077e+21,
    2.585201673888498e+22,
    6.204484017332394e+23,
    1.5511210043330986e+25,
    4.0329146112660565e+26,
    1.0888869450418352e+28,
    3.0488834461171384e+29,
    8.841761993739701e+30,
    2.6525285981219103e+32,
    8.222838654177922e+33,
    2.631308369336935e+35,
    8.683317618811886e+36,
    2.9523279903960412e+38,
    1.0333147966386144e+40,
    3.719933267899012e+41,
    1.3763753091226343e+43,
    5.23022617466601e+44,
    2.0397882081197442e+46,
    8.159152832478977e+47,
    3.3452526613163803e+49,
    1.4050061177528798e+51,
    6.041526306337383e+52,
    2.6582715747884485e+54,
    1.1962222086548019e+56,
    5.5026221598120885e+57,
    2.5862324151116818e+59,
    1.2413915592536073e+61,
    6.082818640342675e+62,
    3.0414093201713376e+64,
    1.5511187532873822e+66,
    8.065817517094388e+67,
    4.2748832840600255e+69,
    2.308436973392414e+71,
    1.2696403353658276e+73,
    7.109985878048635e+74,
    4.052691950487722e+76,
    2.350561331282879e+78,
    1.3868311854568986e+80,
    8.320987112741392e+81,
    5.075802138772248e+83,
    3.146997326038794e+85,
    1.98260831540444e+87,
    1.2688693218588417e+89,
    8.247650592082472e+90,
    5.443449390774431e+92,
    3.647111091818868e+94,
    2.4800355424368305e+96,
    1.711224524281413e+98,
    1.197857166996989e+100,
    8.504785885678622e+101,
    6.123445837688608e+103,
    4.4701154615126834e+105,
    3.3078854415193856e+107,
    2.480914081139539e+109,
    1.8854947016660498e+111,
    1.4518309202828584e+113,
    1.1324281178206295e+115,
    8.946182130782973e+116,
    7.156945704626378e+118,
    5.797126020747366e+120,
    4.75364333701284e+122,
    3.945523969720657e+124,
    3.314240134565352e+126,
    2.8171041143805494e+128,
    2.4227095383672724e+130,
    2.107757298379527e+132,
    1.8548264225739836e+134,
    1.6507955160908452e+136,
    1.4857159644817607e+138,
    1.3520015276784023e+140,
    1.24384140546413e+142,
    1.1567725070816409e+144,
    1.0873661566567424e+146,
    1.0329978488239052e+148,
    9.916779348709491e+149,
    9.619275968248206e+151,
    9.426890448883242e+153,
    9.33262154439441e+155,
    9.33262154439441e+157,
    9.425947759838354e+159,
    9.614466715035121e+161,
    9.902900716486175e+163,
    1.0299016745145622e+166,
    1.0813967582402903e+168,
    1.1462805637347078e+170,
    1.2265202031961373e+172,
    1.3246418194518284e+174,
    1.4438595832024928e+176,
    1.5882455415227421e+178,
    1.7629525510902437e+180,
    1.9745068572210728e+182,
    2.2311927486598123e+184,
    2.543559733472186e+186,
    2.925093693493014e+188,
    3.3931086844518965e+190,
    3.969937160808719e+192,
    4.6845258497542883e+194,
    5.574585761207603e+196,
    6.689502913449124e+198,
    8.09429852527344e+200,
    9.875044200833598e+202,
    1.2146304367025325e+205,
    1.5061417415111404e+207,
    1.8826771768889254e+209,
    2.372173242880046e+211,
    3.012660018457658e+213,
    3.8562048236258025e+215,
    4.9745042224772855e+217,
    6.466855489220472e+219,
    8.471580690878817e+221,
    1.118248651196004e+224,
    1.4872707060906852e+226,
    1.992942746161518e+228,
    2.6904727073180495e+230,
    3.659042881952547e+232,
    5.01288874827499e+234,
    6.917786472619486e+236,
    9.615723196941086e+238,
    1.346201247571752e+241,
    1.89814375907617e+243,
    2.6953641378881614e+245,
    3.8543707171800706e+247,
    5.550293832739301e+249,
    8.047926057471987e+251,
    1.17499720439091e+254,
    1.7272458904546376e+256,
    2.5563239178728637e+258,
    3.808922637630567e+260,
    5.7133839564458505e+262,
    8.627209774233235e+264,
    1.3113358856834518e+267,
    2.006343905095681e+269,
    3.089769613847349e+271,
    4.789142901463391e+273,
    7.47106292628289e+275,
    1.1729568794264138e+278,
    1.8532718694937338e+280,
    2.946702272495037e+282,
    4.714723635992059e+284,
    7.590705053947215e+286,
    1.2296942187394488e+289,
    2.0044015765453015e+291,
    3.2872185855342945e+293,
    5.423910666131586e+295,
    9.003691705778433e+297,
    1.5036165148649983e+300,
    2.526075744973197e+302,
    4.2690680090047027e+304,
    7.257415615307994e+306
  ];

  function gamma (z) {

    // Define gamma specially for integral values
    if (z % 1 === 0) {
      if (z <= 0) {
        return Infinity
      }

      let res = integer_factorials[Math.round(z - 1)];

      if (!res) {
        return Infinity
      }
      return res
    }

    if (z < 0.5) {
      return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z))
    } else {
      z -= 1;

      var x = C[0];
      for (var i = 1; i < g + 2; i++) {
        x += C[i] / (z + i);
      }

      var t = z + g + 0.5;
      return Math.sqrt(2 * Math.PI) * Math.pow(t, (z + 0.5)) * Math.exp(-t) * x
    }
  }

  function ln_gamma (z) {
    if (z < 0.5) {
      // Compute via reflection formula
      let reflected = ln_gamma(1 - z);

      return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - reflected
    } else {
      z -= 1;

      var x = C[0];
      for (var i = 1; i < g + 2; i++) {
        x += C[i] / (z + i);
      }

      var t = z + g + 0.5;

      return Math.log(2 * Math.PI) / 2 + Math.log(t) * (z + 0.5) - t + Math.log(x)
    }
  }



  function polygamma (m, z) {
    if (m % 1 !== 0) {
      return NaN
    }

    if (m === 0) {
      return digamma(z)
    }

    if (m === 1) {
      return trigamma(z)
    }

    let sign = (m % 2 === 0) ? -1 : 1;
    let numPoly = getPolygammaNumeratorPolynomial(m);

    if (z < 0.5) {
      if (z % 1 === 0)
        return Infinity

      // Reflection formula, see https://en.wikipedia.org/wiki/Polygamma_function#Reflection_relation
      // psi_m(z) = pi ^ (m+1) * numPoly(cos(pi z)) / (sin ^ (m+1) (pi z)) + (-1)^(m+1) psi_m(1-z)

      return -(Math.pow(Math.PI, m + 1) * numPoly.evaluate(Math.cos(Math.PI * z)) /
        (Math.pow(Math.sin(Math.PI * z), m+1)) + sign * polygamma(m, 1 - z))
    } else if (z < 8) {
      // Recurrence relation
      // psi_m(z) = psi_m(z+1) + (-1)^(m+1) * m! / z^(m+1)

      return polygamma(m, z+1) + sign * gamma(m + 1) / Math.pow(z, m+1)
    }

    // Series representation

    let sum = 0;
    for (let i = 0; i < 200; ++i) {
      sum += 1 / Math.pow(z + i, m + 1);
    }

    return sign * gamma(m + 1) * sum

  }

  const GREGORY_COEFFICIENTS = [
    1.0, 0.5, -0.08333333333333333, 0.041666666666666664, -0.02638888888888889, 0.01875, -0.014269179894179895, 0.01136739417989418, -0.00935653659611993, 0.00789255401234568, -0.006785849984634707, 0.005924056412337663, -0.005236693257950285, 0.004677498407042265, -0.004214952239005473, 0.003826899553211884, -0.0034973498453499175, 0.0032144964313235674, -0.0029694477154582097, 0.002755390299436716, -0.0025670225450072377, 0.0024001623785907204, -0.0022514701977588703, 0.0021182495272954456, -0.001998301255043453, 0.0018898154636786972, -0.0017912900780718936, 0.0017014689263700736, -0.0016192940490963672, 0.0015438685969283421, -0.0014744276890609623, 0.001410315320613454, -0.0013509659123128112, 0.0012958894558251668, -0.0012446594681088444, 0.0011969031579517945, -0.001152293347825886, 0.0011105417984181721, -0.001071393661516785, 0.0010346228462800521, -0.0010000281292566525, 0.0009674298734228264, -0.0009366672485567989, 0.0009075958663860963, -0.0008800857605298948, 0.000854019654366952, -0.0008292914703794421, 0.0008058050428513827, -0.0007834730024921167, 0.0007622158069590723, -0.0007419608956386516, 0.0007226419506180641, -0.0007041982487069233, 0.000686574091772996, -0.0006697183046421545, 0.0006535837914580035, -0.0006381271427651654, 0.0006233082867224927, -0.0006090901788092055, 0.0005954385251909118, -0.0005823215355902033, 0.0005697097020796109, -0.0005575756007007343, 0.0005458937132267388, -0.0005346402667379662, 0.0005237930889818988, -0.0005133314777471911, 0.0005032360827036401, -0.0004934887983513816, 0.00048407266688788627, -0.00047497178994440343, 0.00046617124826760925, -0.00045765702853009814, 0.00044941595654733894, -0.0004414356362607454, 0.0004337043939182513, -0.00042621122694664064, 0.00041894575706506086, -0.0004118981872376783, 0.0004050592621061756, -0.00039842023158052236, 0.0003919728172997837, -0.0003857091817042604, 0.00037962189948642086, -0.00037370393121133474, 0.0003679485989179907, -0.0003623495635312948, 0.0003569008039309683, -0.0003515965975382364, 0.0003464315022943173, -0.00034140033991647036, 0.0003364981803279027, -0.00033172032716728803, 0.00032706230429215997, -0.0003225198431980953, 0.000318088871282497, -0.000313765500888013, 0.00030954601906624203, -0.0003054268780074607, 0.00030140468608670396, -0.00029747619948069663, 0.0002936383143139141
  ];

  let PolygammaNumeratorPolynomials = [new SingleVariablePolynomial([0, 1])];

  let POLY1 = new SingleVariablePolynomial([0, 1]);
  let POLY2 = new SingleVariablePolynomial([-1, 0, 1]);

  function getPolygammaNumeratorPolynomial(n) {
    let poly = PolygammaNumeratorPolynomials[n];
    if (poly)
      return poly

    if (n > 10000)
      return new SingleVariablePolynomial([0])

    if (n > 20) {
      // to prevent stack overflow issues
      for (let i = 0; i < n; ++i) {
        getPolygammaNumeratorPolynomial(i);
      }
    }

    return PolygammaNumeratorPolynomials[n] =
      getPolygammaNumeratorPolynomial(n - 1).clone().multiplyScalar(-n).multiply(POLY1).add(
        getPolygammaNumeratorPolynomial(n - 1).derivative().multiply(POLY2)
      )
  }

  function digamma (z) {
    if (z < 0.5) {
      // psi(1-x) - psi(x) = pi cot(pi x)
      // psi(x) = psi(1-x) - pi cot (pi x)

      return digamma(1 - z) - Math.PI / Math.tan(Math.PI * z)
    } else if (z < 5) {
      // psi(x+1) = psi(x) + 1/x
      // psi(x) = psi(x+1) - 1/x

      return digamma(z + 1) - 1 / z
    }

    let egg = 1;
    let sum = Math.log(z);

    for (let n = 1; n < 100; ++n) {
      let coeff = Math.abs(GREGORY_COEFFICIENTS[n]);

      egg *= ((n-1) ? (n-1) : 1);
      egg /= z + n - 1;

      sum -= coeff * egg;
    }

    return sum
  }

  function trigamma(z) {
    if (z < 0.5) {
      if (z % 1 === 0) {
        return Infinity
      }

      // psi_1(1-z) + psi_1(z) = pi^2 / (sin^2 pi z)
      // psi_1(z) = pi^2 / (sin^2 pi z) - psi_1(1-z)

      return (Math.PI * Math.PI) / (Math.sin(Math.PI * z) ** 2) - trigamma(1-z)
    } else if (z < 8) {
      // psi_1(z+1) = psi_1(z) - 1/z^2
      // psi_1(z) = psi_1(z+1) + 1/z^2

      return trigamma(z+1) + 1 / (z*z)
    }

    return 1 / z + 1 / (2 * z**2) + 1 / (6 * z**3) - 1 / (30 * z**5) + 1/(42 * z**7) - 1/(30 * z**9) + 5/(66 * z**11) - 691 / (2730 * z**13) + 7 / (6 * z**15)
  }

  const Functions = {
    LogB: (b, v) => {
      return Math.log(v) / Math.log(b)
    },
    Factorial: (a) => {
      return Functions.Gamma(a + 1)
    },
    Gamma: (a) => {
      return gamma(a)
    },
    LnGamma: (a) => {
      return ln_gamma(a)
    },
    Digamma: (a) => {
      return digamma(a)
    },
    Trigamma: (a) => {
      return trigamma(a)
    },
    Polygamma: (n, a) => {
      return polygamma(n, a)
    },
    Arccot: (z) => {
      let t = Math.atan(1 / z);

      if (t < 0) {
        t += Math.PI;
      }

      return t
    },
    PowRational: (x, p, q) => {
      // Calculates x ^ (p / q), where p and q are integers

      if (p === 0) {
        return 1
      }

      let gcd = gcd(p, q);

      if (gcd !== 1) {
        p /= gcd;
        q /= gcd;
      }

      if (x >= 0) {
        return Math.pow(x, p / q)
      } else {
        if (mod(q, 2) === 0)
          return NaN

        let ret = Math.pow(-x, p / q);
        if (mod(p, 2) === 0) {
          return ret
        } else {
          return -ret
        }
      }
    }
  };

  function cchain(val1, compare, val2, ...args) {
    if (!val2) {
      return false
    }

    switch (compare) {
      case '<':
        if (val1 >= val2)
          return false
        break
      case '>':
        if (val1 <= val2)
          return false
        break
      case '<=':
        if (val1 > val2)
          return false
        break
      case '>=':
        if (val1 < val2)
          return false
        break
      case '==':
        if (val1 !== val2)
          return false
        break
      case '!=':
        if (val1 === val2)
          return false
        break
    }

    if (args.length > 0)
      return cchain(val2, ...args)

    return true
  }
  function piecewise(cond, val, ...args) {
    if (!val) {
      return cond
    }

    if (cond) {
      return val
    }

    if (args.length === 0) {
      // This is a fail
      return val
    } else {
      return piecewise(...args)
    }
  }

  function ifelse(val1, cond, val2) {
    if (cond)
      return val1
    return val2
  }

  const Operators = {
    '+': (x, y) => x + y,
    '-': (x, y) => x - y,
    '*': (x, y) => x * y,
    '/': (x, y) => x / y,
    '^': (x, y) => Math.pow(x, y),
    '<': (x, y) => x < y,
    '<=': (x, y) => x <= y,
    '>': (x, y) => x > y,
    '>=': (x, y) => x >= y,
    '==': (x, y) => x === y,
    '!=': (x, y) => x !== y,
    'sin': Math.sin,
    'tan': Math.tan,
    'cos': Math.cos,
    'csc': x => 1/Math.sin(x),
    'sec': x => 1/Math.cos(x),
    'cot': x => 1/Math.tan(x),
    'asin': x => Math.asin(x),
    'acos': x => Math.acos(x),
    'atan': x => Math.atan(x),
    'abs': x => Math.abs(x),
    'sqrt': x => Math.sqrt(x),
    'cbrt': x => Math.cbrt(x),
    'ln': x => Math.log(x),
    'log': x => Math.log(x),
    'log10': x => Math.log10(x),
    'log2': x => Math.log2(x),
    'sinh': Math.sinh,
    'cosh': Math.cosh,
    'tanh': Math.tanh,
    'csch': x => 1/Math.sinh(x),
    'sech': x => 1/Math.cosh(x),
    'coth': x => 1/Math.tanh(x),
    'asinh': Math.asinh,
    'acosh': Math.acosh,
    'atanh': Math.atanh,
    'asec': x => Math.acos(1/x),
    'acsc': x => Math.asin(1/x),
    'acot': Functions.Arccot,
    'acsch': x => Math.asinh(1/x),
    'asech': x => Math.acosh(1/x),
    'acoth': x => Math.atanh(1/x),
    'logb': Functions.LogB,
    'gamma': Functions.Gamma,
    'factorial': Functions.Factorial,
    'ln_gamma': Functions.LnGamma,
    'digamma': Functions.Digamma,
    'trigamma': Functions.Trigamma,
    'polygamma': Functions.Polygamma,
    'pow_rational': Functions.PowRational,
    'max': Math.max,
    'min': Math.min,
    'floor': Math.floor,
    'ceil': Math.ceil,
    'and': (x, y) => x && y,
    'or': (x, y) => x || y,
    'cchain': cchain,
    'ifelse': ifelse,
    'piecewise': piecewise
  };

  function getLatex(opNode) {
    switch (opNode.operator) {
      case "^":
        let exponent = opNode.children[1];

        let exponent_latex;
        if (exponent.type() === "node") {
          exponent_latex = exponent.latex(false);
        } else {
          exponent_latex = exponent.latex();
        }
        return `${opNode.children[0].latex()}^{${exponent_latex}}`
      case "*":
        return `${opNode.children[0].latex()}\\cdot ${opNode.children[1].latex()}`
      case "+":
        return `${opNode.children[0].latex()}+${opNode.children[1].latex()}`
      case "-":
        return `${opNode.children[0].latex()}-${opNode.children[1].latex()}`
      case "/":
        return `\\frac{${opNode.children[0].latex()}}{${opNode.children[1].latex()}}`
      case "<":
        return `${opNode.children[0].latex()} < ${opNode.children[1].latex()}`
      case "<=":
        return `${opNode.children[0].latex()} \\leq ${opNode.children[1].latex()}`
      case "==":
        return `${opNode.children[0].latex()} = ${opNode.children[1].latex()}`
      case "!=":
        return `${opNode.children[0].latex()} \\neq ${opNode.children[1].latex()}`
      case ">":
        return `${opNode.children[0].latex()} > ${opNode.children[1].latex()}`
      case ">=":
        return `${opNode.children[0].latex()} \\geq ${opNode.children[1].latex()}`
      case "pow_rational":
        // Normally unused third child stores what the user actually inputted
        return `${opNode.children[0].latex()}^{${opNode.children[3].latex()}}`
      case "factorial":
        let needs_parens = opNode.needsParentheses();
        let latex_n = opNode.children[0].latex();

        if (needs_parens)
          return `\\left(${latex_n}\\right)!`
        else
          return latex_n + '!'
      case "logb":
        let log_needs_parens = opNode.children[1].needsParentheses();
        let base_needs_parens = opNode.children[0].needsParentheses();

        let base = `${base_needs_parens ? '\\left(' : ''}${opNode.children[0].latex()}${base_needs_parens ? '\\right)' : ''}`;
        let log = `${log_needs_parens ? '\\left(' : ''}${opNode.children[1].latex()}${log_needs_parens ? '\\right)' : ''}`;

        return `\\operatorname{log}_{${base}}{${log}}`
      case "ifelse":
        return `\\begin{cases} ${opNode.children[0].latex()} & ${opNode.children[1].latex()} \\\\ ${opNode.children[2].latex()} & \\text{otherwise} \\end{cases}`
      case "cchain":
        return opNode.children.map(child => child.latex()).join('')
      case "polygamma":
        return `\\psi^{(${opNode.children[0].latex()})}\\left(${opNode.children[1].latex()}\\right)`
      case "piecewise":
        let pre = `\\begin{cases} `;

        let post;
        if (opNode.children.length % 2 === 0) {

          post = `0 & \\text{otherwise} \\end{cases}`;
        } else {
          post = ` \\text{otherwise} \\end{cases}`;
        }

        let latex = pre;

        for (let i = 0; i < opNode.children.length; i += 2) {
          let k = 0;
          for (let j = 1; j >= 0; --j) {
            let child = opNode.children[i+j];

            if (!child)
              continue

            latex += child.latex();

            if (k === 0) {
              latex += " & ";
            } else {
              latex += " \\\\ ";
            }

            k++;
          }
        }

        latex += post;

        return latex
      case "not":
        return "\\neg(" + opNode.children.map(child => child.latex()).join('+') + ')'
      case "and":
        return opNode.children.map(child => child.latex()).join("\\land ")
      case "or":
        return opNode.children.map(child => child.latex()).join("\\lor ")
      case "abs":
        return '\\left|' + opNode.children.map(child => child.latex()).join(",") + '\\right|'
      default:
        let needs_parens2 = opNode.needsParentheses();

        let operatorName = getOperatorName(opNode.operator);
        if (!needs_parens2 && alwaysParenthesize(opNode.operator)) {
          needs_parens2 = true;
        }

        return `${operatorName}${needs_parens2 ? '\\left(' : ''}${opNode.children.map(child => child.latex()).join(',\\,')}${needs_parens2 ? '\\right)' : ''}`
    }
  }

  // const fs = require( ...

  // List of operators (currently)
  // +, -, *, /, ^,

  const comparisonOperators = ['<', '>', '<=', '>=', '!=', '=='];

  let floatRepresentabilityTester;
  const matchIntegralComponent = /[0-9]*\./;
  const trailingZeroes = /0+$/;

  function isExactlyRepresentableAsFloat (f) {
    if (typeof f === 'number') {
      return true
    }
    if (!floatRepresentabilityTester) {
      floatRepresentabilityTester = new Grapheme.Real(0, 53);
    }
    floatRepresentabilityTester.value = f;

    return floatRepresentabilityTester.value.replace(trailingZeroes, '').replace(matchIntegralComponent, '') ===
      f.replace(matchIntegralComponent, '')
  }

  class ASTNode {
    constructor (params = {}) {

      const {
        parent = null,
        children = []
      } = params;

      this.children = children;
      this.parent = parent;
    }

    _getCompileText (defineVariable) {
      return this.children.map(child => '(' + child._getCompileText(defineVariable) + ')').join('+')
    }

    _getIntervalCompileText (defineVariable) {
      return this.children.map(child => child._getIntervalCompileText(defineVariable)).join(',')
    }

    _getRealCompileText (defineRealVariable) {
      return this.children.map(child => '(' + child._getRealCompileText(defineRealVariable) + ')').join('+')
    }

    applyAll (func, depth = 0) {
      func(this, depth);

      this.children.forEach(child => {
        if (child.applyAll) {
          child.applyAll(func, depth + 1);
        }
      });
    }

    clone () {
      let node = new ASTNode();

      node.children = this.children.map(child => child.clone());

      return node
    }

    compile (exportedVariables) {
      if (!exportedVariables) {
        exportedVariables = this.getVariableNames();
      }

      let preamble = '';

      const defineVariable = (variable, expression) => {
        preamble += `let ${variable}=${expression};`;
      };

      let returnVal = this._getCompileText(defineVariable);

      return {
        func: new Function(...exportedVariables, preamble + 'return ' + returnVal),
        variableNames: exportedVariables
      }
    }

    compileInterval (exportedVariables) {
      if (!exportedVariables) {
        exportedVariables = this.getVariableNames();
      }
      let preamble = '';

      const defineVariable = (variable, expression) => {
        preamble += `let ${variable}=${expression};`;
      };

      let returnVal = this._getIntervalCompileText(defineVariable);

      return {
        func: new Function(...exportedVariables, preamble + 'return ' + returnVal),
        variableNames: exportedVariables
      }
    }

    compileReal (exportedVariables, precision = 53) {
      if (!exportedVariables) {
        exportedVariables = this.getVariableNames();
      }

      let Variables = {};
      let preamble = '';

      const defineRealVariable = (name, value, variable) => {
        Variables[name] = new Grapheme.Real(precision);
        if (value) {
          if (value === 'pi') {
            preamble += `${name}.set_pi()`;
          } else if (value === 'e') {
            preamble += `${name}.set_e()`;
          } else if (isExactlyRepresentableAsFloat(value)) {
            preamble += `${name}.value = ${value.toString()}; `;
          } else {
            preamble += `${name}.value = "${value}"; `;
          }

        } else {
          preamble += `${name}.value = ${variable};`;
        }
      };

      let text = this._getRealCompileText(defineRealVariable);

      let realVarNames = Object.keys(Variables);
      let realVars = realVarNames.map(name => Variables[name]);

      let func = new Function(...realVarNames, ...exportedVariables, `${preamble}
      return ${text};`);
      let isValid = true;

      return {
        isValid () {
          return isValid
        },
        set_precision: (prec) => {
          if (!isValid) {
            throw new Error('Already freed compiled real function!')
          }
          realVars.forEach(variable => variable.set_precision(prec));
        },
        evaluate: (...args) => {
          if (!isValid) {
            throw new Error('Already freed compiled real function!')
          }
          return func(...realVars, ...args)
        },
        variableNames: exportedVariables,
        free () {
          if (!isValid) {
            throw new Error('Already freed compiled real function!')
          }
          isValid = false;

          realVars.forEach(variable => variable.__destroy__());
        },
        _get_func () {
          if (!isValid) {
            throw new Error('Already freed compiled real function!')
          }
          return func
        }
      }
    }

    derivative (variable) {
      let node = new ASTNode();

      node.children = this.children.map(child => child.derivative(variable));

      node.applyAll(child => {
        if (child.children) {
          child.children.forEach(subchild => subchild.parent = child);
        }
      });

      return node
    }

    evaluateConstant () {
      return this.children.map(child => child.evaluateConstant()).reduce((x, y) => x + y, 0)
    }

    getText () {
      return '(node)'
    }

    getVariableNames () {
      let variableNames = [];

      this.applyAll(child => {
        if (child instanceof VariableNode) {
          let name = child.name;

          if (variableNames.indexOf(name) === -1 && comparisonOperators.indexOf(name) === -1) {
            variableNames.push(name);
          }
        }
      });

      return variableNames
    }

    hasChildren () {
      return this.children.length !== 0
    }

    isConstant () {
      return this.children.every(child => child.isConstant())
    }

    latex (parens = true) {
      let latex = this.children.map(child => child.latex()).join('+');

      if (parens) {
        return String.raw`\left(${latex}\right)`
      }
      return latex
    }

    needsParentheses () {
      return !(this.children.length <= 1 && (!this.children[0] || !this.children[0].hasChildren()))
    }

    setParents () {
      this.applyAll(child => {
        if (child.children) {
          child.children.forEach(subchild => subchild.parent = child);
        }
      });
    }

    toJSON () {
      return {
        type: 'node',
        children: this.children.map(child => child.toJSON())
      }
    }

    type () {
      return 'node'
    }
  }

  const greek = ['alpha', 'beta', 'gamma', 'Gamma', 'delta', 'Delta', 'epsilon', 'zeta', 'eta', 'theta', 'Theta', 'iota', 'kappa', 'lambda', 'Lambda', 'mu', 'nu', 'xi', 'Xi', 'pi', 'Pi', 'rho', 'Rho', 'sigma', 'Sigma', 'tau', 'phi', 'Phi', 'chi', 'psi', 'Psi', 'omega', 'Omega'];

  function substituteGreekLetters (string) {
    if (greek.includes(string)) {
      return '\\' + string
    }

    return string
  }

  class VariableNode extends ASTNode {
    constructor (params = {}) {
      super();

      const {
        name = 'x'
      } = params;

      this.name = name;
    }

    _getCompileText (defineVariable) {
      if (comparisonOperators.includes(this.name)) {
        return '"' + this.name + '"'
      }
      return this.name
    }

    _getIntervalCompileText (defineVariable) {
      if (comparisonOperators.includes(this.name)) {
        return '"' + this.name + '"'
      }
      return this.name
    }

    _getRealCompileText (defineRealVariable) {
      if (comparisonOperators.includes(this.name)) {
        return `'${this.name}'`
      }
      let var_name = '$' + getRenderID();

      defineRealVariable(var_name, null, this.name);

      return var_name
    }

    clone () {
      return new VariableNode({ name: this.name })
    }

    derivative (variable) {
      if (variable === this.name) {
        return new ConstantNode({ value: 1 })
      } else {
        return new ConstantNode({ value: 0 })
      }
    }

    evaluateConstant () {
      return NaN
    }

    getText () {
      return this.name
    }

    isConstant () {
      return false
    }

    isConstant () {
      return false
    }

    latex () {
      if (comparisonOperators.includes(this.name)) {
        switch (this.name) {
          case '>':
          case '<':
            return this.name
          case '>=':
            return '\\geq '
          case '<=':
            return '\\leq '
          case '==':
            return '='
          case '!=':
            return '\\neq '
        }
      }

      return substituteGreekLetters(this.name)
    }

    toJSON () {
      return {
        type: 'variable',
        name: this.name
      }
    }

    type () {
      return 'variable'
    }
  }

  const OperatorPatterns = {
    'sin': ['Math.sin'],
    '+': ['', '+'],
    '-': ['', '-'],
    '*': ['', '*'],
    '/': ['', '/'],
    '^': ['', '**'],
    '<': ['', '<'],
    '<=': ['', '<='],
    '>': ['', '>'],
    '>=': ['', '>='],
    '==': ['', '==='],
    '!=': ['', '!=='],
    'tan': ['Math.tan'],
    'cos': ['Math.cos'],
    'csc': ['1/Math.sin'],
    'sec': ['1/Math.cos'],
    'cot': ['1/Math.tan'],
    'asin': ['Math.asin'],
    'acos': ['Math.acos'],
    'atan': ['Math.atan'],
    'abs': ['Math.abs'],
    'sqrt': ['Math.sqrt'],
    'cbrt': ['Math.cbrt'],
    'ln': ['Math.log'],
    'log': ['Math.log'],
    'log10': ['Math.log10'],
    'log2': ['Math.log2'],
    'sinh': ['Math.sinh'],
    'cosh': ['Math.cosh'],
    'tanh': ['Math.tanh'],
    'csch': ['1/Math.sinh'],
    'sech': ['1/Math.cosh'],
    'coth': ['1/Math.tanh'],
    'asinh': ['Math.asinh'],
    'acosh': ['Math.acosh'],
    'atanh': ['Math.atanh'],
    'asec': ['Math.acos(1/', '+', ')'],
    'acsc': ['Math.asin(1/', '+', ')'],
    'acot': ['Grapheme.Functions.Arccot', ','],
    'acsch': ['Math.asinh(1/', '+', ')'],
    'asech': ['Math.acosh(1/', '+', ')'],
    'acoth': ['Math.atanh(1/', '+', ')'],
    'logb': ['Grapheme.Functions.LogB', ','],
    'gamma': ['Grapheme.Functions.Gamma', ','],
    'factorial': ['Grapheme.Functions.Factorial', ','],
    'ln_gamma': ['Grapheme.Functions.LnGamma', ','],
    'digamma': ['Grapheme.Functions.Digamma', ','],
    'trigamma': ['Grapheme.Functions.Trigamma', ','],
    'polygamma': ['Grapheme.Functions.Polygamma', ','],
    'pow_rational': ['Grapheme.Functions.PowRational', ','],
    'max': ['Math.max', ','],
    'min': ['Math.min', ','],
    'floor': ['Math.floor', ','],
    'ceil': ['Math.ceil', ',']
  };

  const OperatorSynonyms = {
    'arcsinh': 'asinh',
    'arsinh': 'asinh',
    'arccosh': 'acosh',
    'arcosh': 'acosh',
    'arctanh': 'atanh',
    'artanh': 'atanh',
    'arcsech': 'asech',
    'arccsch': 'acsch',
    'arccoth': 'acoth',
    'arsech': 'asech',
    'arcsch': 'acsch',
    'arcoth': 'acoth',
    'arcsin': 'asin',
    'arsin': 'asin',
    'arccos': 'acos',
    'arcos': 'acos',
    'arctan': 'atan',
    'artan': 'atan',
    'arcsec': 'asec',
    'arccsc': 'acsc',
    'arccot': 'acot',
    'arsec': 'asec',
    'arcsc': 'acsc',
    'arcot': 'acot',
    'log': 'ln'
  };

  class OperatorNode extends ASTNode {
    constructor (params = {}) {
      super(params);

      const {
        operator = '^'
      } = params;

      this.operator = operator;
    }

    _getCompileText (defineVariable) {

      switch (this.operator) {
        case 'cchain':
          let components = this.children;
          let ids = [];
          for (let i = 0; i < components.length; i += 2) {
            let variableId = '$' + getRenderID();

            defineVariable(variableId, components[i]._getCompileText(defineVariable));

            ids.push(variableId);
          }

          let comparisons = [];

          for (let i = 1; i < components.length; i += 2) {
            let comparison = components[i];
            let lhs = ids[(i - 1) / 2];
            let rhs = ids[(i + 1) / 2];

            // comparisons in cchains are variables
            comparisons.push('(' + lhs + comparison.name + rhs + ')');
          }

          return comparisons.join('&&')
        case 'ifelse':
          const res = this.children.map(child => child._getCompileText(defineVariable));

          return `((${res[1]})?(${res[0]}):(${res[2]}))`
        case 'piecewise':
          if (this.children.length === 0) {
            return '(0)'
          }

          if (this.children.length === 1) {
            return this.children[0]._getCompileText(defineVariable)
          }

          if (this.children.length === 3) {
            return new OperatorNode({
              operator: 'ifelse',
              children: [this.children[1], this.children[0], this.children[2]]
            })._getCompileText(defineVariable)
          } else if (this.children.length === 2) {
            return new OperatorNode({
              operator: 'ifelse',
              children: [this.children[1], this.children[0], new ConstantNode({ value: 0 })]
            })._getCompileText(defineVariable)
          } else {
            let remainder = new OperatorNode({
              operator: 'piecewise',
              children: this.children.slice(2)
            })._getCompileText(defineVariable);

            let condition = this.children[0]._getCompileText(defineVariable);
            let value = this.children[1]._getCompileText(defineVariable);

            return `((${condition})?(${value}):(${remainder}))`
          }
        case 'and':
          return this.children.map(child => child._getCompileText(defineVariable)).join('&&')
        case 'or':
          return this.children.map(child => child._getCompileText(defineVariable)).join('||')
      }

      let pattern = OperatorPatterns[this.operator];

      if (!pattern) {
        throw new Error('Unrecognized operation')
      }

      return pattern[0] + '(' + this.children.map(child => '(' + child._getCompileText(defineVariable) + ')').join(pattern[1] ? pattern[1] : '+') + ')' + (pattern[2] ? pattern[2] : '')
    }

    _getIntervalCompileText (defineVariable) {
      const children_text = this.children.map(child => child._getIntervalCompileText(defineVariable)).join(',');

      return `Grapheme.Intervals['${this.operator}'](${children_text})`
    }

    _getRealCompileText (defineRealVariable) {
      let children = this.children;
      if (this.operator === 'piecewise') {
        if (children.length % 2 === 0) {
          // add default value of 0
          children = children.slice();
          children.push(new ConstantNode({
            value: 0,
            text: '0'
          }));
        }
      }

      if (this.operator === 'ifelse') {
        if (children.length === 2) {
          // add default value of 0
          children.push(new ConstantNode({
            value: 0,
            text: '0'
          }));
          return
        }
      }

      const children_text = children.map(child => child._getRealCompileText(defineRealVariable)).join(',');

      return `Grapheme.REAL_FUNCTIONS['${this.operator}'](${children_text})`
    }

    clone () {
      let node = new OperatorNode({ operator: this.operator });

      node.children = this.children.map(child => child.clone());

      return node
    }

    derivative (variable) {
      return operator_derivative(this, variable)
    }

    evaluateConstant () {
      return Operators[this.operator](...this.children.map(child => child.evaluateConstant()))
    }

    getText () {
      return this.operator
    }

    latex () {
      return getLatex(this)
    }

    toJSON () {
      return {
        type: 'operator',
        operator: this.operator,
        children: this.children.map(child => child.toJSON())
      }
    }

    type () {
      return 'operator'
    }
  }

  class ConstantNode extends ASTNode {
    constructor (params = {}) {
      super();

      const {
        value = 0,
        text = '',
        invisible = false
      } = params;

      this.value = value;
      this.text = text ? text : StandardLabelFunction(value);
      this.invisible = invisible;
    }

    _getCompileText (defineVariable) {
      return this.value + ''
    }

    _getIntervalCompileText (defineVariable) {
      let varName = '$' + getRenderID();
      if (isNaN(this.value)) {
        defineVariable(varName, `new Grapheme.Interval(NaN, NaN, false, false, true, true)`);
        return varName
      }

      defineVariable(varName, `new Grapheme.Interval(${this.value}, ${this.value}, true, true, true, true)`);
      return varName
    }

    _getRealCompileText (defineRealVariable) {
      let var_name = '$' + getRenderID();
      defineRealVariable(var_name, this.text);
      return var_name
    }

    clone () {
      return new ConstantNode({
        value: this.value,
        invisible: this.invisible,
        text: this.text
      })
    }

    derivative () {
      return new ConstantNode({ value: 0 })
    }

    evaluateConstant () {
      return this.value
    }

    getText () {
      return this.invisible ? '' : this.text
    }

    isConstant () {
      return true
    }

    latex () {
      return this.getText()
    }

    toJSON () {
      return {
        value: this.value,
        text: this.text,
        invisible: this.invisible,
        type: 'constant'
      }
    }

    type () {
      return 'constant'
    }
  }

  function powerExactlyRepresentableAsFloat (power) {
    if (typeof power === 'number') return true

    // todo, make more precise
    if (Number.isInteger(parseFloat(power))) {
      return true
    }

    return false

    /*if (!floatRepresentabilityTester)
      floatRepresentabilityTester = new Real(0, 53)

    floatRepresentabilityTester.value = power

    floatRepresentabilityTester.subtract_float(1)

    floatRepresentabilityTester.set_precision(106)

    floatRepresentabilityTester.add_float(1)

    return floatRepresentabilityTester.value.replace(trailingZeroes, '').replace(matchIntegralComponent, '') ===
      power.replace(matchIntegralComponent, '');*/
  }

  const LN2 = new OperatorNode({
    operator: 'ln',
    children: [new ConstantNode({ value: 10 })]
  });
  const LN10 = new OperatorNode({
    operator: 'ln',
    children: [new ConstantNode({ value: 10 })]
  });
  const ONE_THIRD = new OperatorNode({
    operator: '/',
    children: [
      new ConstantNode({ value: 1 }),
      new ConstantNode({ value: 3 })
    ]
  });

  // a * b - c * d ^ g

  let operator_regex = /^[*\-\/+^]|^[<>]=?|^[=!]=|^and|^or/;
  let function_regex = /^([a-zA-Z_][a-zA-Z0-9_]*)\(/;
  let constant_regex = /^-?[0-9]*\.?[0-9]*e?[0-9]+/;
  let variable_regex = /^[a-zA-Z_][a-zA-Z0-9_]*/;
  let paren_regex = /^[()\[\]]/;
  let comma_regex = /^,/;

  function get_angry_at(string, index=0, message="I'm angry!") {
    let spaces = "";

    for (let i = 0; i < index; ++i)
      spaces += " ";

    throw new Error(message + " at index " + index + ":\n" + string + "\n" + spaces + "^")
  }

  function check_parens_balanced(string) {
    let stack = [];

    let i;
    let err = false;
    for (i = 0; i < string.length; ++i) {
      let chr = string[i];

      if (chr === '(') {
        stack.push('(');
      } else if (chr === '[') {
        stack.push('[');
      } else if (chr === ')' || chr === ']') {
        if (stack.length === 0) {
          err = true;
          break
        }

        if (chr === ')') {
          let pop = stack.pop();

          if (pop !== '(') {
            err = true;
            break
          }
        } else {
          let pop = stack.pop();

          if (pop !== '[') {
            err = true;
            break
          }
        }
      }
    }

    if (stack.length !== 0)
      err = true;

    if (err) {

      get_angry_at(string, i, "Unbalanced parentheses/brackets");
    }

  }

  function* tokenizer(string) {
    // what constitutes a token? a sequence of n letters, one of the operators *-/+^, parentheses or brackets

    string = string.trimEnd();

    let i = 0;
    let prev_len = string.length;

    let original_string = string;

    while (string) {
      string = string.trim();

      i += prev_len - string.length;
      prev_len = string.length;

      let match;

      do {
        match = string.match(paren_regex);

        if (match) {
          yield {
            type: "paren",
            paren: match[0],
            index: i
          };
          break
        }

        match = string.match(operator_regex);

        if (match) {
          yield {
            type: "operator",
            op: match[0],
            index: i
          };
          break
        }

        match = string.match(constant_regex);

        if (match) {
          yield {
            type: "constant",
            value: match[0],
            index: i
          };
          break
        }

        match = string.match(comma_regex);

        if (match) {
          yield {
            type: "comma",
            index: i
          };
          break
        }

        match = string.match(function_regex);

        if (match) {
          yield {
            type: "function",
            name: match[1],
            index: i
          };

          yield {
            type: "paren",
            paren: '(',
            index: i + match[1].length
          };

          break
        }

        match = string.match(variable_regex);

        if (match) {
          yield {
            type: "variable",
            name: match[0],
            index: i
          };

          break
        }

        get_angry_at(original_string, i, "Unrecognized token");
      } while (false)

      let len = match[0].length;

      string = string.slice(len);
    }
  }

  function check_valid(string, tokens) {
    for (let i = 0; i < tokens.length - 1; ++i) {
      let token1 = tokens[i];
      let token2 = tokens[i+1];

      if ((token1.type === "operator" || token1.type === "comma") && (token2.type === "operator" || token2.type === "comma") &&
        (!(token2.op === '-' && token2.op === '+') || i === tokens.length - 2))
        get_angry_at(string, token2.index, "No consecutive operators/commas");
      if (token1.paren === "(" && token2.paren === ")")
        get_angry_at(string, token2.index, "No empty parentheses");
      if (token1.paren === "[" && token2.paren === "]")
        get_angry_at(string, token2.index, "No empty brackets");
      if (token1.type === "operator" && token2.paren === ")")
        get_angry_at(string, token2.index, "No operator followed by closing parenthesis");
      if (token1.type === "operator" && token2.paren === "]")
        get_angry_at(string, token2.index, "No operator followed by closing bracket");
      if (token1.type === "comma" && token2.paren === ")")
      get_angry_at(string, token2.index, "No comma followed by closing parenthesis");
      if (token1.type === "comma" && token2.paren === "]")
        get_angry_at(string, token2.index, "No comma followed by closing bracket");
      if (token1.paren === '(' && token2.type === "comma")
        get_angry_at(string, token2.index, "No comma after starting parenthesis");
      if (token1.paren === '[' && token2.type === "comma")
        get_angry_at(string, token2.index, "No comma after starting bracket");
    }

    if (tokens[0].type === "comma" || (tokens[0].type === "operator" && !(tokens[0].op === '-' || tokens[0].op === '+')))
      get_angry_at(string, 0, "No starting comma/operator");

    const last_token = tokens[tokens.length - 1];
    if (last_token.type === "comma" || last_token.type === "operator")
      get_angry_at(string, tokens.length - 1, "No ending comma/operator");
  }

  function find_paren_indices(children) {
    let start_paren_index = -1;

    for (let i = 0; i < children.length; ++i) {
      let child = children[i];

      if (child.paren === '(' || child.paren === '[')
        start_paren_index = i;

      if ((child.paren === ')' || child.paren === ']') && start_paren_index !== -1)
        return [start_paren_index, i]
    }
  }

  function parse_tokens(tokens) {
    for (let i = 0; i < tokens.length; ++i) {
      let token = tokens[i];

      switch (token.type) {
        case "constant":
          tokens[i] = new ConstantNode({value: parseFloat(token.value), text: token.value});
          break
        case "variable":
          tokens[i] = new VariableNode({name: token.name});
          break
      }
    }

    let root = new ASTNode();
    root.children = tokens;

    let parens_remaining = true;

    while (parens_remaining) {
      parens_remaining = false;

      root.applyAll(child => {
        if (!(child instanceof ASTNode))
          return

        let indices = find_paren_indices(child.children);


        if (indices) {
          parens_remaining = true;

          let new_node = new ASTNode();
          new_node.children = child.children.slice(indices[0] + 1, indices[1]);
          child.children = child.children.slice(0, indices[0]).concat([
            new_node
          ]).concat(child.children.slice(indices[1] + 1));
        }
      });
    }

    root.applyAll(child => {
      let children = child.children;

      if (children) {
        let first_child = children[0];

        if (first_child) {
          if (first_child.op === '+' || first_child.op === '-') {
            children.splice(0, 0, new ConstantNode({value: 0, invisible: true}));
          }
        }
      }
    });

    let functions_remaining = true;

    while (functions_remaining) {
      functions_remaining = false;

      root.applyAll(child => {
        let children = child.children;

        if (children) {
          for (let i = 0; i < children.length; ++i) {
            let child_test = children[i];

            if (child_test.type === "function") {
              let synonym = OperatorSynonyms[child_test.name];

              let function_node = new OperatorNode({ operator: synonym ? synonym : child_test.name });

              children[i] = function_node;

              function_node.children = children[i + 1].children;

              functions_remaining = true;

              children.splice(i + 1, 1);
              return
            }
          }
        }
      });
    }

    let unary_remaining = true;

    while (unary_remaining) {
      unary_remaining = false;

      root.applyAll(child => {
        let children = child.children;

        for (let i = 0; i < children.length - 2; ++i) {
          let child1 = children[i];
          let child2 = children[i + 1];

          if (child1.op && (child2.op === '-' || child2.op === '+')) {
            const egg = new OperatorNode({
              operator: "*",
              children: [
                new ConstantNode({ value: child2.op === '-' ? -1 : 1 }),
                children[i + 2]
              ]
            });

            child.children = children.slice(0, i + 1).concat([egg]).concat(children.slice(i + 3));
            unary_remaining = true;

            return
          }
        }
      });
    }

    function combineOperators(operators) {
      let operators_remaining = true;

      while (operators_remaining) {
        operators_remaining = false;

        root.applyAll(child => {
          let children = child.children;

          for (let i = 0; i < children.length; ++i) {
            let child_test = children[i];

            if (operators.includes(child_test.op)) {
              let new_node = new OperatorNode({operator: child_test.op});

              new_node.children = [children[i-1],children[i+1]];

              child.children = children.slice(0, i-1).concat([new_node]).concat(children.slice(i+2));
              operators_remaining = true;

              return
            }
          }
        });
      }
    }

    combineOperators(['^']);
    combineOperators(['*','/']);
    combineOperators(['-','+']);

    const comparisonOperators = ['<', '<=', '==', '!=', '>=', '>'];

    // CChain
    let cchain_remaining = true;
    while (cchain_remaining) {
      cchain_remaining = false;

      root.applyAll(child => {
        const children = child.children;
        let cchain_found = false;

        for (let i = 0; i < children.length; ++i) {
          if (comparisonOperators.includes(children[i].op)) {
            let j;
            for (j = i + 2; j < children.length; j += 2) {
              if (comparisonOperators.includes(children[j].op)) {
                cchain_found = true;
              } else {
                break
              }
            }

            if (cchain_found) {
              child.children = children.slice(0, i-1).concat(new OperatorNode({
                operator: "cchain",
                children: children.slice(i-1, j).map(child => child.op ? new VariableNode({name: child.op}) : child)
              })).concat(children.slice(j));

              cchain_remaining = true;

              return

            }
          }
        }
      });
    }

    combineOperators(comparisonOperators);
    combineOperators(["and", "or"]);

    root.applyAll(child => {
      if (child.children) {
        child.children = child.children.filter(child => child.type !== "comma");
      }
    });

    root.setParents();

    return root
  }

  function parse_string(string) {
    check_parens_balanced(string);

    let tokens = [];

    for (let token of tokenizer(string)) {
      tokens.push(token);
    }

    check_valid(string, tokens);

    return parse_tokens(tokens)
  }

  class ConwaysGameOfLifeElement extends GraphemeElement {
    constructor(params={}) {
      super(params);

      const {
        size = {
          x: 200,
          y: 200
        }
      } = params;

      this.setSize(size.x, size.y);
    }

    setSize(x, y) {
      this.cells = new Uint8Array(x * y);
      this.width = x;
      this.height = y;
    }

    setCell(x, y, value) {
      this.cells[x*this.height+y] = value;
    }

    tickGame() {
      const cells = this.cells;

      if (!this.new_cells) {
        this.new_cells = new Uint8Array(this.width * this.height);
      }

      let new_cells = this.new_cells;
      new_cells.set(cells);

      for (let i = 0; i < this.width; ++i) {
        for (let j = 0; j < this.height; ++j) {
          let neighborCount = 0;

          for (let x = -1; x <= 1; ++x) {
            if (i+x < 0 || i+x >= this.width) {
              continue
            }

            for (let y = -1; y <= 1; ++y) {
              if ((x === 0 && y === 0) || (j+y < 0 || j+y >= this.height)) {
                continue
              }

              if (cells[(x+i) * this.height + (y+j)]) {
                neighborCount++;
              }
            }
          }

          if (neighborCount === 3) {
            new_cells[i * this.height + j] = 1;
          } else if (neighborCount < 2) {
            new_cells[i * this.height + j] = 0;
          } else if (neighborCount > 3) {
            new_cells[i * this.height + j] = 0;
          }
        }
      }

      this.cells.set(new_cells);
    }

    render(info) {
      super.render(info);

      const ctx = info.ctx;

      let simpleTransform = this.plot.transform.getPlotToPixelTransform();

      let {x_m, y_m, x_b, y_b} = simpleTransform;

      ctx.fillStyle="green";

      ctx.save();
      this.plot.transform.box.clip(ctx);

      for (let i = 0; i < this.width; ++i) {
        let offset = i * this.height;
        for (let j = 0; j < this.height; ++j) {
          let cell = this.cells[offset + j];

          if (cell) {
            ctx.fillRect(x_m * i + x_b, y_m * j + y_b, x_m, y_m);
          }
        }
      }

      ctx.restore();
    }
  }

  class TreeElement extends GraphemeElement {
    constructor(params={}) {
      super(params);

      this.root = null;

      this.pen = new Pen();
      this.label_style = new Label2DStyle({shadowSize: 5, shadowColor: Colors.WHITE});
      this.getTextOfNode = (node) => {
        return node.getText()
      };

      this.vertices = [];
      this.labels = [];
    }

    update() {
      super.update();

      this.vertices = [];
      this.labels = [];

      let flattened_nodes = [];
      let node_positions = [];

      this.root.applyAll((child, depth) => {
        if (!flattened_nodes[depth]) {
          flattened_nodes[depth] = [];
        }

        let flat_array = flattened_nodes[depth];
        flat_array.push(child);
      });

      for (let depth = 0; depth < flattened_nodes.length; ++depth) {
        let nodes = flattened_nodes[depth];

        node_positions[depth] = nodes.map((node, i) => {
          let x = (i - nodes.length / 2);
          let y = -depth;

          return new Vec2(x, y)
        });
      }

      function getNodePosition(node) {
        for (let depth = 0; depth < flattened_nodes.length; ++depth) {
          let nodes = flattened_nodes[depth];

          for (let i = 0; i < nodes.length; ++i) {
            if (nodes[i] === node) {
              return node_positions[depth][i]
            }
          }
        }
      }

      for (let depth = 0; depth < flattened_nodes.length; ++depth) {
        let nodes = flattened_nodes[depth];
        let positions = node_positions[depth];

        nodes.forEach((node, i) => {
          let parentPos = getNodePosition(node.parent);

          if (parentPos)
            this.vertices.push(positions[i].x, positions[i].y, parentPos.x, parentPos.y, NaN, NaN);

          this.labels.push(new Label2D({
            style: this.label_style,
            text: this.getTextOfNode(node),
            position: this.plot.transform.plotToPixel(positions[i])
          }));
        });
      }

    }

    render(info) {
      super.render(info);

      let polyline = new PolylineElement({pen: this.pen});
      polyline.vertices = this.vertices.slice();

      this.plot.transform.plotToPixelArr(polyline.vertices);

      polyline.render(info);

      this.labels.forEach(label => label.render(info));
    }
  }

  // Interactive event names
  const listenerKeys = ['click', 'mousemove', 'mousedown', 'mouseup', 'wheel'];

  /** @class InteractiveElement An element which takes up space in a plot and supports an "isClick" function.
   * Used exclusively for 2D plots (3D plots will have a raycasting system).
   */
  class InteractiveElement extends GraphemeElement {
    /**
     * Construct an InteractiveElement
     * @param params {Object}
     * @param params.interactivityEnabled {boolean} Whether interactivity is enabled
     * @param params.precedence See base class.
     * @param params.alwaysUpdate See base class.
     */
    constructor (params = {}) {
      super(params);

      const {
        interactivityEnabled = false
      } = params;

      this.interactivityEnabled = interactivityEnabled;
      this.interactivityListeners = {};
    }

    /**
     * Get whether interactivity is enabled
     * @returns {boolean} Whether interactivity is enabled
     */
    get interactivityEnabled () {
      return this.interactivityListeners && Object.keys(this.interactivityListeners).length !== 0
    }

    /**
     * Set whether interactivity is enabled.
     * @param value {boolean}
     */
    set interactivityEnabled (value) {
      if (this.interactivityEnabled === value) {
        return
      }

      let listeners = this.interactivityListeners;

      if (value) {
        // Enable interactivity

        // Warn if the element is added to a non-interactive canvas
        if (this.plot && !(this.plot instanceof InteractiveCanvas)) {
          console.warn('Interactive element in a non-interactive canvas');
        }

        // The position on the canvas of where the mouse was pressed. null if the mouse is not currently pressed.
        let mouseDownPos = null;

        // Whether the previous mousemove was on the element
        let prevIsClick = false;

        listenerKeys.forEach(key => {
          let callback = (evt) => {
            // Elide mouse moves
            if (key === 'mousemove' && !this._hasMouseMoveInteractivityListeners() && !mouseDownPos) {
              return
            }

            let eventPos = evt.pos;

            // Whether the event occurred on this element
            let isClick = this.isClick(eventPos);

            // Whether to stop propagation
            let stopPropagation = false;

            // Trigger mouse on and mouse off events
            if (isClick && !prevIsClick) {
              if (this.triggerEvent('interactive-mouseon', evt)) {
                stopPropagation = true;
              }
            } else if (!isClick && prevIsClick) {
              if (this.triggerEvent('interactive-mouseoff', evt)) {
                stopPropagation = true;
              }
            }

            // Set whether the previous mouse move is on the element
            if (key === 'mousemove' && isClick) {
              prevIsClick = true;
            } else if (key === 'mousemove' && !isClick) {
              prevIsClick = false;
            }

            if (isClick) {
              if (this.triggerEvent('interactive-' + key, evt)) {
                stopPropagation = true;
              }
            }

            // Trigger drag events
            if (key === 'mousemove') {
              if (mouseDownPos) {
                // return to allow the prevention of propagation
                if (this.triggerEvent('interactive-drag', { start: mouseDownPos, ...evt })) {
                  stopPropagation = true;
                }
              }
            } else if (key === 'mousedown' && isClick) {
              // Set the position of the mouse
              mouseDownPos = eventPos;
            } else if (key === 'mouseup') {
              // Prevent the mouse from
              mouseDownPos = null;
            }

            return stopPropagation
          };

          this.addEventListener(key, callback);
          listeners[key] = callback;
        });

      } else {
        // Disable interactivity
        for (let key in this.interactivityListeners) {
          if (this.interactivityListeners.hasOwnProperty(key)) {
            this.removeEventListener(key, listeners[key]);
          }
        }

        this.interactivityListeners = {};
      }
    }

    /**
     * Whether this element has interactivity listeners to fire when the mouse moves and is not pressed down. Used
     * internally to elide calls to isClick when the element would do nothing even if it returned true.
     * @returns {boolean}
     * @private
     */
    _hasMouseMoveInteractivityListeners () {
      const listeners = this.interactivityListeners;

      return !!(listeners['interactive-mouseon'] || listeners['interactive-mouseoff'] || listeners['interactivity-mousemove'])
    }

    /**
     * Derived classes need to define this function
     * @param position
     */
    isClick (position) {
      throw new Error("isClick unimplemented for InteractiveElement")
    }
  }

  const ENDCAP_TYPES = {
    'butt': 0,
    'round': 1,
    'square': 0 // Need to implement
  };
  const JOIN_TYPES = {
    'bevel': 0,
    'miter': 3,
    'round': 1,
    'dynamic': 3
  };

  function nextPowerOfTwo (x) {
    return 2 ** Math.ceil(Math.log2(x))
  }

  const MIN_RES_ANGLE = 0.05; // minimum angle in radians between roundings in a polyline

  // Parameters for the expanding/contracting float array for polyline
  const MIN_SIZE$1 = 16;

  /**
   * Convert an array of polyline vertices into a Float32Array of vertices to be rendered using WebGL.
   * @param vertices {Array} The vertices of the polyline.
   * @param pen {Object} A JSON representation of the pen. Could also be the pen object itself.
   * @param box {BoundingBox} The bounding box of the plot, used to optimize line dashes
   */
  function calculatePolylineVertices(vertices, pen, box) {
    if (pen.dashPattern.length === 0) {
      // No dashes to draw
      return convertTriangleStrip(vertices, pen);
    }
  }

  function convertTriangleStrip(vertices, pen) {
    if (pen.thickness <= 0 ||
      pen.endcapRes < MIN_RES_ANGLE ||
      pen.joinRes < MIN_RES_ANGLE ||
      vertices.length <= 3) {

      return {glVertices: null, vertexCount: 0}
    }

    let glVertices = new Float32Array(MIN_SIZE$1);

    let index = 0;
    let arraySize = glVertices.length - 2;

    function addVertex (x, y) {
      if (index > arraySize) {
        // not enough space!!!!

        let newArr = new Float32Array(2 * glVertices.length);
        newArr.set(glVertices);

        glVertices = newArr;
        arraySize = glVertices.length - 2;
      }

      glVertices[index++] = x;
      glVertices[index++] = y;
    }

    let origVertexCount = vertices.length / 2;

    let th = pen.thickness;
    let maxMiterLength = th / Math.cos(pen.joinRes / 2);

    let endcap = ENDCAP_TYPES[pen.endcap];
    let join = JOIN_TYPES[pen.join];

    if (endcap === undefined || join === undefined) {
      throw new Error("Undefined endcap or join.")
    }

    let x1, x2, x3, y1, y2, y3;
    let v1x, v1y, v2x, v2y, v1l, v2l, b1_x, b1_y, scale, nu_x, nu_y, pu_x, pu_y, dis;

    for (let i = 0; i < origVertexCount; ++i) {
      x1 = (i !== 0) ? vertices[2 * i - 2] : NaN; // Previous vertex
      x2 = vertices[2 * i]; // Current vertex
      x3 = (i !== origVertexCount - 1) ? vertices[2 * i + 2] : NaN; // Next vertex

      y1 = (i !== 0) ? vertices[2 * i - 1] : NaN; // Previous vertex
      y2 = vertices[2 * i + 1]; // Current vertex
      y3 = (i !== origVertexCount - 1) ? vertices[2 * i + 3] : NaN; // Next vertex

      if (isNaN(x2) || isNaN(y2)) {
        addVertex(NaN, NaN);
      }

      if (isNaN(x1) || isNaN(y1)) { // starting endcap
        let nu_x = x3 - x2;
        let nu_y = y3 - y2;
        let dis = Math.hypot(nu_x, nu_y);

        if (dis < 0.001) {
          nu_x = 1;
          nu_y = 0;
        } else {
          nu_x /= dis;
          nu_y /= dis;
        }

        if (isNaN(nu_x) || isNaN(nu_y)) {
          continue
        } // undefined >:(

        if (endcap === 1) {
          // rounded endcap
          let theta = Math.atan2(nu_y, nu_x) + Math.PI / 2;
          let steps_needed = Math.ceil(Math.PI / pen.endcapRes);

          let o_x = x2 - th * nu_y, o_y = y2 + th * nu_x;

          for (let i = 1; i <= steps_needed; ++i) {
            let theta_c = theta + i / steps_needed * Math.PI;

            addVertex(x2 + th * Math.cos(theta_c), y2 + th * Math.sin(theta_c));
            addVertex(o_x, o_y);
          }
          continue
        } else {
          // no endcap
          addVertex(x2 + th * nu_y, y2 - th * nu_x);
          addVertex(x2 - th * nu_y, y2 + th * nu_x);
          continue
        }
      }

      if (isNaN(x3) || isNaN(y3)) { // ending endcap
        let pu_x = x2 - x1;
        let pu_y = y2 - y1;
        let dis = Math.hypot(pu_x, pu_y);

        if (dis < 0.001) {
          pu_x = 1;
          pu_y = 0;
        } else {
          pu_x /= dis;
          pu_y /= dis;
        }

        if (isNaN(pu_x) || isNaN(pu_y)) {
          continue
        } // undefined >:(

        addVertex(x2 + th * pu_y, y2 - th * pu_x);
        addVertex(x2 - th * pu_y, y2 + th * pu_x);

        if (endcap === 1) {
          let theta = Math.atan2(pu_y, pu_x) + 3 * Math.PI / 2;
          let steps_needed = Math.ceil(Math.PI / pen.endcapRes);

          let o_x = x2 - th * pu_y, o_y = y2 + th * pu_x;

          for (let i = 1; i <= steps_needed; ++i) {
            let theta_c = theta + i / steps_needed * Math.PI;

            addVertex(x2 + th * Math.cos(theta_c), y2 + th * Math.sin(theta_c));
            addVertex(o_x, o_y);
          }
        }

        continue
      }

      // all vertices are defined, time to draw a joinerrrrr
      if (join === 2 || join === 3) {
        // find the two angle bisectors of the angle formed by v1 = p1 -> p2 and v2 = p2 -> p3

        v1x = x1 - x2;
        v1y = y1 - y2;
        v2x = x3 - x2;
        v2y = y3 - y2;

        v1l = Math.hypot(v1x, v1y);
        v2l = Math.hypot(v2x, v2y);

        b1_x = v2l * v1x + v1l * v2x, b1_y = v2l * v1y + v1l * v2y;
        scale = 1 / Math.hypot(b1_x, b1_y);

        if (scale === Infinity || scale === -Infinity) {
          b1_x = -v1y;
          b1_y = v1x;
          scale = 1 / Math.hypot(b1_x, b1_y);
        }

        b1_x *= scale;
        b1_y *= scale;

        scale = th * v1l / (b1_x * v1y - b1_y * v1x);

        if (join === 2 || (Math.abs(scale) < maxMiterLength)) {
          // if the length of the miter is massive and we're in dynamic mode, we exit pen if statement and do a rounded join
          if (scale === Infinity || scale === -Infinity) {
            scale = 1;
          }

          b1_x *= scale;
          b1_y *= scale;

          addVertex(x2 - b1_x, y2 - b1_y);
          addVertex(x2 + b1_x, y2 + b1_y);

          continue
        }
      }

      nu_x = x3 - x2;
      nu_y = y3 - y2;
      dis = Math.hypot(nu_x, nu_y);

      if (dis < 0.001) {
        nu_x = 1;
        nu_y = 0;
      } else {
        nu_x /= dis;
        nu_y /= dis;
      }

      pu_x = x2 - x1;
      pu_y = y2 - y1;
      dis = Math.hypot(pu_x, pu_y);

      if (dis === 0) {
        pu_x = 1;
        pu_y = 0;
      } else {
        pu_x /= dis;
        pu_y /= dis;
      }

      addVertex(x2 + th * pu_y, y2 - th * pu_x);
      addVertex(x2 - th * pu_y, y2 + th * pu_x);

      if (join === 1 || join === 3) {
        let a1 = Math.atan2(-pu_y, -pu_x) - Math.PI / 2;
        let a2 = Math.atan2(nu_y, nu_x) - Math.PI / 2;

        // if right turn, flip a2
        // if left turn, flip a1

        let start_a, end_a;

        if (mod(a1 - a2, 2 * Math.PI) < Math.PI) {
          // left turn
          start_a = Math.PI + a1;
          end_a = a2;
        } else {
          start_a = Math.PI + a2;
          end_a = a1;
        }

        let angle_subtended = mod(end_a - start_a, 2 * Math.PI);
        let steps_needed = Math.ceil(angle_subtended / pen.joinRes);

        for (let i = 0; i <= steps_needed; ++i) {
          let theta_c = start_a + angle_subtended * i / steps_needed;

          addVertex(x2 + th * Math.cos(theta_c), y2 + th * Math.sin(theta_c));
          addVertex(x2, y2);
        }
      }

      addVertex(x2 + th * nu_y, y2 - th * nu_x);
      addVertex(x2 - th * nu_y, y2 + th * nu_x);
    }

    return {
      glVertices,
      vertexCount: Math.ceil(index / 2)
    }
  }

  let MAX_DEPTH = 25;
  let MAX_POINTS = 1e6;

  // TODO: Stop this function from making too many points
  function adaptively_sample_1d(start, end, func, initialPoints=500,
    aspectRatio = 1, yRes = 0,
    angle_threshold=0.1, depth=0,
    includeEndpoints=true, ptCount=0) {
    if (depth > MAX_DEPTH || start === undefined || end === undefined || isNaN(start) || isNaN(end))
      return new Float64Array([NaN, NaN])

    let vertices = sample_1d(start, end, func, initialPoints, includeEndpoints);

    let angles = new Float32Array(angles_between(vertices, angle_threshold, aspectRatio));

    let final_vertices = new Float64Array(16);
    let index = 0;
    let maxSize = final_vertices.length - 2;

    function expandArray(size=-1) {
      let newArr = new Float64Array((size === -1) ? final_vertices.length * 2 : size);
      newArr.set(final_vertices);

      final_vertices = newArr;

      maxSize = final_vertices.length - 2;
    }

    function addVertex(x, y) {
      if (index > maxSize) {
        expandArray();
      }

      final_vertices[index++] = x;
      final_vertices[index++] = y;
    }

    function addVertices(arr) {
      let totalLen = index + arr.length;

      if (totalLen >= final_vertices.length) {
        expandArray(nextPowerOfTwo(totalLen));
      }

      final_vertices.set(arr, index);
      index += arr.length;
    }

    for (let i = 0; i < vertices.length; i += 2) {
      let angle_i = i / 2;

      if (angles[angle_i] === 3 || angles[angle_i - 1] === 3) { //&& Math.abs(vertices[i+1] - vertices[i+3]) > yRes / 2) {
        let vs = adaptively_sample_1d(vertices[i], vertices[i + 2], func, 3, aspectRatio, yRes, angle_threshold, depth + 1, true, ptCount);

        addVertices(vs);

        if (index > MAX_POINTS)
          return final_vertices.subarray(0, index)
      } else {
        addVertex(vertices[i], vertices[i+1]);
      }
    }

    return final_vertices.subarray(0, index)
  }

  function sample_1d(start, end, func, points=500, includeEndpoints=true) {
    let vertices = [];

    for (let i = 1 - includeEndpoints; i <= points - (1 - includeEndpoints); ++i) {
      let x = start + i * (end - start) / points;
      vertices.push(x, func(x));
    }

    return vertices
  }

  function find_roots(start, end, func, derivative, initialPoints = 500, iterations=10, accuracy=0.001) {
    let res = (end - start) / initialPoints;

    let points = [];

    initialPoints--;

    // Initial guesses
    for (let i = 0; i <= initialPoints; ++i) {
      let fraction = i / initialPoints;

      let x = start + (end - start) * fraction;
      points.push(x, func(x));
    }

    function iterateRoots() {
      for (let i = 0; i < points.length; i += 2) {
        if (Math.abs(points[i+1]) < accuracy)
          continue

        let x = points[i];
        let slope = derivative(x);

        let y = points[i+1];

        let new_x = x - y / slope;

        points[i] = new_x;
        points[i+1] = func(new_x);
      }
    }

    for (let i = 0; i < iterations; ++i)
      iterateRoots();

    let keptRoots = [];

    for (let i = 0; i < points.length; i += 2) {
      // remove roots which are in an area of many 0s

      let x = points[i];

      if (Math.abs(func(x - res)) < accuracy || Math.abs(func(x + res)) < accuracy)
        continue

      keptRoots.push(x, points[i+1]);
    }

    points = [];

    for (let i = 0; i < keptRoots.length; i += 2) {
      let x = keptRoots[i];

      let keepRoot = true;

      for (let j = 0; j < points.length; ++j) {
        // check if there is a root close by

        if (Math.abs(points[j] - x) < res) {
          // already a root nearby

          keepRoot = false;
          break
        }
      }

      if (keepRoot) {
        points.push(x, keptRoots[i+1]);
      }
    }

    return points
  }

  function adaptPolyline(polyline, oldTransform, newTransform, adaptThickness=true) {
    let arr = polyline._internal_polyline._gl_triangle_strip_vertices;

    let newland = oldTransform.getPixelToPlotTransform();
    let harvey = newTransform.getPlotToPixelTransform();

    let x_m = harvey.x_m * newland.x_m;
    let x_b = harvey.x_m * newland.x_b + harvey.x_b;
    let y_m = harvey.y_m * newland.y_m;
    let y_b = harvey.y_m * newland.y_b + harvey.y_b;

    let length = arr.length;

    for (let i = 0; i < length; i += 2) {
      arr[i] = x_m * arr[i] + x_b;
      arr[i+1] = y_m * arr[i+1] + y_b;
    }

    let ratio = oldTransform.coords.width / newTransform.coords.width;

    if (adaptThickness) {
      for (let i = 0; i < arr.length; i += 4) {
        let ax = arr[i];
        let ay = arr[i + 1];
        let bx = arr[i + 2];
        let by = arr[i + 3];

        let vx = (bx - ax) / 2 * (1 - ratio);
        let vy = (by - ay) / 2 * (1 - ratio);

        arr[i] = ax + vx;
        arr[i + 1] = ay + vy;
        arr[i + 2] = bx - vx;
        arr[i + 3] = by - vy;
      }
    }

    polyline._internal_polyline.needsBufferCopy = true;
  }

  /**
   * @class WebGLElement An element that supports WebGL rendering.
   */
  class WebGLElement extends GraphemeElement {
    /**
     * Construct a new WebGLElement
     * @param params Parameters
     */
    constructor (params = {}) {
      super(params);

      // id used for things like WebGL buffers
      /** @protected */ this.id = generateUUID();
    }

    /**
     *
     * @param info {Object} The render info
     * @param info.beforeWebGLRender {Function} Prepare the universe for WebGL drawing
     */
    render (info) {
      // Call beforeWebGLRender()
      info.beforeWebGLRender();

      // Sort this element's children. We don't want to call super.render() because that will run beforeNormalRender
      this.sortChildren();

      // Render all children
      this.children.forEach(child => child.render(info));
    }
  }

  // this vertex shader is used for the polylines
  const vertexShaderSource = `// set the float precision of the shader to medium precision
precision mediump float;
// a vector containing the 2D position of the vertex
attribute vec2 v_position;
uniform vec2 xy_scale;
vec2 displace = vec2(-1, 1);
void main() {
  // set the vertex's resultant position
  gl_Position = vec4(v_position * xy_scale + displace, 0, 1);
}`;
  // this frag shader is used for the polylines
  const fragmentShaderSource = `// set the float precision of the shader to medium precision
precision mediump float;
// vec4 containing the color of the line to be drawn
uniform vec4 line_color;
void main() {
  gl_FragColor = line_color;
}
`;

  // polyline primitive in Cartesian coordinates
  // has thickness, vertex information, and color stuff
  class WebGLPolyline extends WebGLElement {
    constructor (params = {}) {
      super(params);

      this.vertices = params.vertices ? params.vertices : []; // x,y values in pixel space
      this.pen = params.pen ? params.pen : new Pen();

      this.useNative = false;
      this.glVertices = null;
      this.glVertexCount = 0;

      this.alwaysUpdate = false;
    }

    _calculateTriangles () {
      let result = calculatePolylineVertices(this.vertices, this.pen);
      this.glVertices = result.glVertices;
      this.glVertexCount = result.vertexCount;
    }

    _calculateNativeLines () {
      let vertices = this.vertices;

      if (vertices.length <= 3) {
        this.glVertexCount = 0;
        return
      }

      let glVertices = this.glVertices;
      if (!glVertices) {
        glVertices = this.glVertices = new Float32Array(MIN_SIZE);
      }

      if (glVertices.length < vertices.length || glVertices.length > vertices.length * 2) {
        glVertices = this.glVertices = new Float32Array(Math.min(Math.max(MIN_SIZE, nextPowerOfTwo(vertices.length)), MAX_SIZE));
      }

      if (Array.isArray(vertices)) {
        for (let i = 0; i < vertices.length; ++i) {
          glVertices[i] = vertices[i];
        }
      } else {
        glVertices.set(vertices);
      }

      this.glVertexCount = Math.ceil(vertices.length / 2);
    }

    update () {
      super.update();

      if (this.useNative) {
        // use native LINE_STRIP for extreme speed
        this._calculateNativeLines();
      } else {
        this._calculateTriangles();
      }

      this.needsBufferCopy = true;
    }

    isClick (point) {
      return this.distanceFrom(point) < Math.max(this.pen.thickness / 2, 2)
    }

    distanceFrom (point) {
      return point_line_segment_min_distance(point.x, point.y, this.vertices)
    }

    closestTo (point) {
      return point_line_segment_min_closest(point.x, point.y, this.vertices)
    }

    render (info) {
      if (!this.visible) {
        return
      }

      super.render(info);

      const glManager = info.universe.glManager;
      const gl = info.universe.gl;

      let program = glManager.getProgram('webgl-polyline');

      if (!program) {
        glManager.compileProgram('webgl-polyline', vertexShaderSource, fragmentShaderSource, ['v_position'], ['line_color', 'xy_scale']);
        program = glManager.getProgram('webgl-polyline');
      }

      let buffer = glManager.getBuffer(this.id);
      let vertexCount = this.glVertexCount;

      if ((this.useNative && vertexCount < 2) || (!this.useNative && vertexCount < 3)) return
      // tell webgl to start using the gridline program
      gl.useProgram(program.program);
      // bind our webgl buffer to gl.ARRAY_BUFFER access point
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

      let color = this.pen.color;
      // set the vec4 at colorLocation to (r, g, b, a)
      // divided by 255 because webgl likes [0.0, 1.0]
      gl.uniform4f(program.uniforms.line_color, color.r / 255, color.g / 255, color.b / 255, color.a / 255);
      gl.uniform2f(program.uniforms.xy_scale,
        2 / info.plot.width,
        -2 / info.plot.height);

      // copy our vertex data to the GPU
      if (this.needsBufferCopy) {
        gl.bufferData(gl.ARRAY_BUFFER, this.glVertices, gl.DYNAMIC_DRAW /* means we will rewrite the data often */);

        this.needsBufferCopy = false;
      }

      // enable the vertices location attribute to be used in the program
      gl.enableVertexAttribArray(program.attribs.v_position);
      // tell it that the width of vertices is 2 (since it's x,y), that it's floats,
      // that it shouldn't normalize floats, and something i don't understand
      gl.vertexAttribPointer(program.attribs.v_position, 2, gl.FLOAT, false, 0, 0);
      // draw the vertices as triangle strip
      gl.drawArrays(this.useNative ? gl.LINE_STRIP : gl.TRIANGLE_STRIP, 0, vertexCount);
    }

    destroy () {
      deleteBuffersNamed(this.id);
    }
  }

  // Allowed plotting modes:
  // rough = linear sample, no refinement
  // fine = linear sample with refinement

  class FunctionPlot2D extends InteractiveElement {
    constructor(params={}) {
      super(params);

      const {
        plotPoints = "auto",
        plottingMode = "fine"
      } = params;

      this.plotPoints = plotPoints;
      this.plottingMode = plottingMode;
      this.quality = 0.2;

      this.function = (x) => Math.atan(x);

      this.pen = new Pen({color: Colors.RED, useNative: false, thickness: 2});
      this.polyline = null;

      this.alwaysUpdate = false;

      this.addEventListener("plotcoordschanged", () => this.markUpdate());

      this.interactivityEnabled = true;
    }

    setFunction(func) {
      this.function = func;
    }

    isClick(position) {
      if (!this.polyline)
        return false
      return this.polyline.distanceFrom(position) < this.polyline.pen.thickness * 2
    }

    updateLight(adaptThickness=true) {
      let transform = this.plot.transform;

      this.previousTransform = transform.clone();

      adaptPolyline(this.polyline, this.previousTransform, transform, adaptThickness);
    }

    update() {
      super.update();

      let transform = this.plot.transform;

      this.previousTransform = transform.clone();

      let { coords, box } = transform;

      let plotPoints = this.plotPoints;

      if (plotPoints === "auto") {
        plotPoints = this.quality * box.width;
      }

      let vertices = [];

      if (this.plottingMode === "rough") {
        let points = box.width * this.quality;

        vertices = sample_1d(coords.x1, coords.x2, this.function, points);
      } else {
        vertices = adaptively_sample_1d(coords.x1, coords.x2, this.function,
          box.width * this.quality, transform.getAspect(), coords.height / box.height);
      }

      this.plot.transform.plotToPixelArr(vertices);

      if (!this.polyline) {
        this.polyline = new WebGLPolyline({
          pen: this.pen,
          alwaysUpdate: false
        });
      }

      this.polyline.vertices = vertices;
      this.polyline.update();
    }

    render(info) {
      if (!this.polyline)
        return

      const box = info.plot.transform.box;
      const gl = info.universe.gl;

      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(box.top_left.x * dpr,
        box.top_left.y * dpr,
        box.width * dpr,
        box.height * dpr);

      this.polyline.render(info);

      gl.disable(gl.SCISSOR_TEST);

      this.renderChildren(info);
    }

    destroy() {
      if (this.polyline)
        this.polyline.destroy();
    }
  }

  const PieColors = ["SALMON", "STEELBLUE", "LAVENDER", "MEDIUMORCHID", "INDIGO", "THISTLE", "AZURE", "TAN", "CORNSILK", "MISTYROSE", "DIMGRAY"];

  class PieChart extends GraphemeElement {
    constructor(params={}) {
      super(params);

      this.box = null;
      this.sectors = [
        {name: "Nitrogen", value: 780840 / 1e6},
        {name: "Oxygen", value: 209460 / 1e6},
        {name: "Argon", value: 9340 / 1e6},
        {name: "Carbon dioxide", value: 413.32 / 1e6},
        {name: "Neon", value: 18.18 / 1e6},
        {name: "Helium", value: 5.24 / 1e6},
        {name: "Methane", value: 1.87 / 1e6},
        {name: "Krypton", value: 1.14 / 1e6}
      ];

      this.critical_angles = {
        "stop_labeling" : 3,
        "label_outside" : 15
      };

      this.label_function = (name, value) => {
        return name + ": " + expressQuantityPP(value)
      };

      this.label_style = new Label2DStyle({color: Colors.BLACK, fontSize: 20});
      this.label_ratio = 0.7;
      this.label_padding = 15;

      this.starting_angle = 90; // degrees counterclockwise from x axis

      this._paths = [];
      this._labels = [];
    }

    update() {
      super.update();

      let box = this.box;

      if (!box) {
        box = this.plot.transform.box;
      }

      let radius = Math.min(box.width, box.height) / 2;
      let totalValue = 0;

      for (let i = 0; i < this.sectors.length; ++i) {
        let sector = this.sectors[i];
        if (!sector.value) {
          totalValue += 1;
        } else {
          totalValue += sector.value;
        }
      }

      let theta = -this.starting_angle / 180 * Math.PI;
      let cx = box.cx;
      let cy = box.cy;

      this._paths = [];
      this._labels = [];

      for (let i = 0; i < this.sectors.length; ++i) {
        let sector = this.sectors[i];
        let value = sector.value;
        if (!value) {
          value = 1;
        }

        let angle = value / totalValue * 2 * Math.PI;
        let angleDeg = angle / Math.PI * 180;

        if (angleDeg > this.critical_angles.stop_labeling) {
          let label_angle = theta + angle / 2;
          let r = radius * this.label_ratio;

          if (angleDeg < this.critical_angles.label_outside) {
            r = radius + this.label_padding;
          }

          let x = cx + r * Math.cos(label_angle);
          let y = cy + r * Math.sin(label_angle);

          let pos = new Vec2(x, y);

          let label = new Label2D({style: this.label_style, position: pos});
          label.text = this.label_function(sector.name, sector.value);

          this._labels.push(label);
        }

        let path = new Path2D();
        path.moveTo(cx, cy);
        path.lineTo(cx + radius * Math.cos(theta), cy + radius * Math.sin(theta));
        path.arc(cx, cy, radius, theta, theta+angle);
        path.closePath();

        this._paths.push(path);

        theta += angle;
      }
    }

    render(info) {
      super.render(info);

      const ctx = info.ctx;

      let colorIndx = 0;

      function getSubstituteColor() {
        let color = Colors[PieColors[colorIndx]];

        colorIndx++;

        if (colorIndx >= PieColors.length)
          colorIndx = 0;

        return color
      }

      for (let i = 0; i < this.sectors.length; ++i) {
        let path = this._paths[i];

        if (path) {
          let color = this.sectors[i].color;
          if (!color)
            color = getSubstituteColor();

          ctx.fillStyle = color.hex();
          ctx.fill(path);
        }
      }

      for (let i = 0; i < this._labels.length; ++i) {
        this._labels[i].render(info);
      }
    }
  }

  // Inspired by tween.js!

  // list of all active interpolations. They are stored in the following form:
  // {object, property, startTime, endTime, interpolationFunction}
  let extantInterpolations = [];

  const SIGMOID_C = 0.964027580075816;

  // An interpolation function is a function from [0,1] to [0,1] such that f(0) = 0 and f(1) = 1
  const Interpolations = {
    LINEAR: x => Math.min(Math.max(x, 0), 1),
    QUADRATIC: x => x < 0 ? 0 : (x > 1 ? 1 : x * x),
    CUBIC: x => x < 0 ? 0 : (x > 1 ? 1 : x * x * x),
    QUARTIC: x => x < 0 ? 0 : (x > 1 ? 1 : x * x * x * x),
    INVERTED_QUADRATIC: x => x < 0 ? 0 : (x > 1 ? 1 : (1 - (x - 1) ** 2)),
    INVERTED_CUBIC: x => x < 0 ? 0 : (x > 1 ? 1 : (1 - (x - 1) ** 3)),
    INVERTED_QUARTIC: x => x < 0 ? 0 : (x > 1 ? 1 : (1 - (x - 1) ** 4)),
    INVERTED_CIRCULAR: x => x < 0 ? 0 : (x > 1 ? 1 : (1-Math.sqrt(1-x*x))),
    CIRCULAR: x => x < 0 ? 0 : (x > 1 ? 1 : (Math.sqrt(1 - (x - 1)  ** 2))),
    SIGMOID: x => x < 0 ? 0 : (x > 1 ? 1 : (Math.tanh(4 * x - 2) / (2 * SIGMOID_C) + 0.5))
  };

  function removeFinishedInterpolations() {
    let time = Date.now();

    for (let i = 0; i < extantInterpolations.length; ++i) {
      if (extantInterpolations[i].end < time + 1000) {
        extantInterpolations.splice(i, 1);
        --i;
      }
    }
  }

  // We store
  function update() {
    extantInterpolations.forEach(interpolation => interpolation.tick());

    removeFinishedInterpolations();
  }

  class GraphemeInterpolation {
    constructor(object) {
      this.object = object;

      this.duration = -1;
      this.interpolationFunction = Interpolations.LINEAR;

      this.values = {};

      this.startTime = -1;
      this.endTime = -1;

      this.onUpdate = [];
      this.onComplete = [];
    }

    to(values, duration) {
      for (let key in values) {
        let value = values[key];

        this.values[key] = {start: values[key], end: value};
      }

      this.duration = duration;

      return this
    }

    cancel() {
      let index = extantInterpolations.indexOf(this);

      if (index !== -1) {
        extantInterpolations.splice(index, 1);
      }

      return this
    }

    setInterpolation(func) {
      this.interpolationFunction = func;
      return this
    }

    start() {
      if (this.duration < 0) {
        throw new Error("You need to set a valid duration")
      }

      if (extantInterpolations.some(egg => egg.object === this.object))
        extantInterpolations = extantInterpolations.filter(egg => egg.object !== this.object);

      this.startTime = Date.now();
      this.endTime = this.startTime + this.duration;

      for (let key in this.values) {
        this.values[key].start = this.object[key];
      }

      extantInterpolations.push(this);

      return this
    }

    tick() {
      let time = Date.now();
      let fractionCompleted = (time - this.startTime) / this.duration;

      if (fractionCompleted >= 1) {
        fractionCompleted = 1;
      }

      for (let key in this.values) {
        let value = this.values[key];

        this.object[key] = this.interpolationFunction(fractionCompleted) * (value.end - value.start) + value.start;
      }

      this.onUpdate.forEach(callback => callback(this.object));

      if (fractionCompleted >= 1) {
        this.onComplete.forEach(callback => callback(this.object));

        this.cancel();
      }
    }

    update(func) {
      this.onUpdate.push(func);
      return this
    }

    complete(func) {
      this.onComplete.push(func);
      return this
    }
  }

  function interpolate(...args) {
    return new GraphemeInterpolation(...args)
  }

  let _interpolationsEnabled = true;

  function updateInterpolations() {

    update();

    requestAnimationFrame(updateInterpolations);
  }

  updateInterpolations();

  class PointElementStyle {
    constructor(params={}) {
      const {
        pen = new Pen(),
        fill = Colors.RED,
        doStroke = false,
        doFill = true,
        radius = 3
      } = params;

      this.pen = pen;
      this.fill = fill;
      this.doStroke = doStroke;
      this.doFill = doFill;
      this.radius = radius;
    }

    prepareContext(ctx) {
      this.pen.prepareContext(ctx);

      ctx.fillStyle = this.fill.hex();
    }
  }

  class PointElement extends GraphemeElement {
    constructor(params={}) {
      super(params);

      const {
        position = new Vec2(0,0),
        style = {}
      } = params;

      this.position = new Vec2(position);

      this.style = new PointElementStyle(style);
    }

    get radius() {
      return this.style.radius
    }

    set radius(value) {
      this.style.radius = value;
    }

    isClick(pos) {
      return this.position.distanceSquaredTo(pos) <= (2 + this.radius + (this.style.doStroke ? this.style.pen.thickness : 0)) ** 2
    }


    update() {
      super.update();

      this._path = new Path2D();
      this._path.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI);
    }

    render(info) {
      super.render(info);

      this.style.prepareContext(info.ctx);

      if (this.style.doFill)
        info.ctx.fill(this._path);
      if (this.style.doStroke)
        info.ctx.stroke(this._path);
    }

    getBBox() {
      let cx = this.position.x;
      let cy = this.position.y;

      let box = new BoundingBox();

      box.height = box.width = this.radius * 2 * 1.4;

      box.cx = cx;
      box.cy = cy;

      return box
    }
  }

  class LabeledPoint extends PointElement {
    constructor (params = {}) {
      super();

      this.position = params.position instanceof Vec2 ? params.position : new Vec2(params.position);
      this.label = new SmartLabel({style: params.labelStyle ? params.labelStyle : {dir: "NE", fontSize: 14, shadowColor: Colors.WHITE, shadowSize: 2}});

      this.add(this.label);
    }

    update () {
      super.update();

      this.label.objectBox = this.getBBox();
    }

    render (info) {
      super.render(info);
    }
  }

  class FunctionPlot2DInspectionPoint extends LabeledPoint {
    constructor(params={}) {
      super(params);
    }
  }

  /**
   * Function plot intended for use in a graphing calculator setting
   */
  class InteractiveFunctionPlot2D extends FunctionPlot2D {
    constructor (params = {}) {
      super(params);

      this.inspectionListeners = {};

      this.inspectionEnabled = true;
      this.inspectionPoint = null;

      this.inspectionPointLingers = true;
      this.inspectionPointLabelStyle = new Label2DStyle({dir: "NE", fontSize: 14, shadowColor: Colors.WHITE, shadowSize: 2});
    }

    setFunction(func) {
      super.setFunction(func);

      this.removeInspectionPoint();
    }

    removeInspectionPoint() {
      if (this.inspectionPoint)
        this.remove(this.inspectionPoint);
      this.inspectionPoint = null;
    }

    update() {
      super.update();

      if (this.inspectionPoint)
        this.inspectionPoint.style.fill = this.pen.color;
    }

    set inspectionEnabled (value) {
      if (value) {
        this.interactivityEnabled = true;
      }

      if (this.inspectionEnabled === value) {
        return
      }

      let inspLeo = 0;

      if (value) {
        this.inspectionListeners['interactive-mousedown'] = this.inspectionListeners['interactive-drag'] = (evt) => {
          inspLeo = 0;
          let position = evt.pos;

          if (!this.polyline) {
            return
          }

          let closestPoint = this.polyline.closestTo(position);
          let x = this.plot.transform.pixelToPlotX(closestPoint.x);
          let y = this.function(x);

          if (!this.inspectionPoint) {
            this.inspectionPoint = new FunctionPlot2DInspectionPoint({
              position: { x, y },
              labelStyle: this.inspectionPointLabelStyle
            });

            this.inspectionPoint.style.fill = this.pen.color;

            this.add(this.inspectionPoint);
          } else {
            let pos = new Vec2(x, y);
            let inspectionPt = this.inspectionPoint;

            inspectionPt.position =  this.plot.transform.plotToPixel(pos);

            inspectionPt.label.text = "(" + pos.asArray().map(StandardLabelFunction).join(', ') + ')';
          }

          this.inspectionPoint.markUpdate();

          return true
        };

        this.inspectionListeners['mouseup'] = (evt) => {
          if (!this.inspectionPointLingers)
            this.removeInspectionPoint();
        };

        this.inspectionListeners["click"] = (evt) => {
          if (this.inspectionPointLingers && inspLeo > 0)
            this.removeInspectionPoint();
          inspLeo++;
        };

        for (let key in this.inspectionListeners) {
          this.addEventListener(key, this.inspectionListeners[key]);
        }
      } else {
        for (let key in this.inspectionListeners) {
          this.removeEventListener(key, this.inspectionListeners[key]);
        }

        if (this.inspectionPoint) {
          this.remove(this.inspectionPoint);
        }

        this.inspectionListeners = {};
      }
    }
  }

  class InspectablePoint extends InteractiveElement {
    constructor(params={}) {
      super(params);

      this.point = new PointElement();
      this.label = new SmartLabel();

      this.position = params.position ? new Vec2(params.position) : new Vec2(0, 0);

      this.unselectedStyle = new PointElementStyle({fill: Colors.LIGHTGRAY, radius: 4});
      this.selectedStyle = new PointElementStyle({fill: Colors.BLACK, radius: 4});

      this.selected = false;

      this.labelText = "point";
      this.interactivityEnabled = true;

      this.addEventListener("interactive-click", () => {
        this.selected = !this.selected;
      });
    }

    get selected() {
      return this._selected
    }

    set selected(value) {
      this._selected = value;
      this.point.style = value ? this.selectedStyle : this.unselectedStyle;
    }

    get labelText() {
      return this.label.text
    }

    set labelText(value) {
      this.label.text = value;
    }

    updatePosition() {
      this.point.position = this.plot.transform.plotToPixel(this.position);

      this.label.objectBox = this.point.getBBox();
    }

    isClick(pos) {
      return this.point.isClick(pos)
    }

    update() {
      super.update();

      this.updatePosition();
    }

    render(info) {
      super.render(info);

      this.point.render(info);

      if (this.selected)
        this.label.render(info);
    }
  }

  const REPRESENTATION_LENGTH = 20;
  const MAX_DENOM = 1e7;

  function get_continued_fraction(f) {
    let representation = [];

    let k = Math.floor(f);

    representation.push(k);

    f -= k;

    let reprs = 0;

    while (++reprs < REPRESENTATION_LENGTH) {
      let cont = Math.floor(1 / f);

      if (cont === Infinity) {
        return representation
      }

      if (cont < 0) {
        return representation
      }

      representation.push(cont);

      f = 1 / f - cont;
    }


    return representation
  }

  function get_rational(x) {
    if (x === 0) {
      return 0
    }

    let repr = get_continued_fraction(x);

    let lastIndx = -1;

    for (let i = 1; i < repr.length; ++i) {
      if (repr[i] > MAX_DENOM) {
        lastIndx = i;
      }
    }

    if (lastIndx !== -1) {
      repr.length = lastIndx;
    }

    if (repr.length === REPRESENTATION_LENGTH) {
      // "irrational number"
      return [NaN, NaN]
    }

    // evaluate the continued fraction

    let n = 1, d = 0;
    for (let i = repr.length - 1; i >= 0; --i) {
      let val = repr[i];

      let tmp = d;
      d = n;
      n = tmp;

      n += val * d;
    }

    return [n, d]
  }

  // Copyright 2010 The Emscripten Authors.  All rights reserved.
  // Emscripten is available under two separate licenses, the MIT license and the
  // University of Illinois/NCSA Open Source License.  Both these licenses can be
  // found in the LICENSE file.

  // The Module object: Our interface to the outside world. We import
  // and export values on it. There are various ways Module can be used:
  // 1. Not defined. We create it here
  // 2. A function parameter, function(Module) { ..generated code.. }
  // 3. pre-run appended it, var Module = {}; ..generated code..
  // 4. External script tag defines var Module.
  // We need to check if Module already exists (e.g. case 3 above).
  // Substitution will be replaced with actual code on later stage of the build,
  // this way Closure Compiler will not mangle it (e.g. case 4. above).
  // Note that if you want to run closure, and also to use Module
  // after the generated code, you will need to define   var Module = {};
  // before the code. Then that object will be used in the code, and you
  // can continue to use Module afterwards as well.
  var Module = typeof Module !== 'undefined' ? Module : {};

  // --pre-jses are emitted after the Module integration code, so that they can
  // refer to Module (if they choose; they can also define Module)


  // Sometimes an existing Module object exists with properties
  // meant to overwrite the default module functionality. Here
  // we collect those properties and reapply _after_ we configure
  // the current environment's defaults to avoid having to be so
  // defensive during initialization.
  var moduleOverrides = {};
  var key;
  for (key in Module) {
    if (Module.hasOwnProperty(key)) {
      moduleOverrides[key] = Module[key];
    }
  }

  var arguments_ = [];
  var thisProgram = './this.program';

  // Determine the runtime environment we are in. You can customize this by
  // setting the ENVIRONMENT setting at compile time (see settings.js).

  var ENVIRONMENT_IS_WEB = false;
  var ENVIRONMENT_IS_WORKER = false;
  var ENVIRONMENT_IS_NODE = false;
  var ENVIRONMENT_HAS_NODE = false;
  var ENVIRONMENT_IS_SHELL = false;
  ENVIRONMENT_IS_WEB = typeof window === 'object';
  ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
  // A web environment like Electron.js can have Node enabled, so we must
  // distinguish between Node-enabled environments and Node environments per se.
  // This will allow the former to do things like mount NODEFS.
  // Extended check using process.versions fixes issue #8816.
  // (Also makes redundant the original check that 'require' is a function.)
  ENVIRONMENT_HAS_NODE = typeof process === 'object' && typeof process.versions === 'object' && typeof process.versions.node === 'string';
  ENVIRONMENT_IS_NODE = ENVIRONMENT_HAS_NODE && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
  ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

  if (Module['ENVIRONMENT']) {
    throw new Error('Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -s ENVIRONMENT=web or -s ENVIRONMENT=node)');
  }



  // `/` should be present at the end if `scriptDirectory` is not empty
  var scriptDirectory = '';
  function locateFile(path) {
    if (Module['locateFile']) {
      return Module['locateFile'](path, scriptDirectory);
    }
    return scriptDirectory + path;
  }

  // Hooks that are implemented differently in different runtime environments.
  var read_,
      readBinary;

  if (ENVIRONMENT_IS_NODE) {
    scriptDirectory = __dirname + '/';

    // Expose functionality in the same simple way that the shells work
    // Note that we pollute the global namespace here, otherwise we break in node
    var nodeFS;
    var nodePath;

    read_ = function shell_read(filename, binary) {
      var ret;
        if (!nodeFS) nodeFS = require('fs');
        if (!nodePath) nodePath = require('path');
        filename = nodePath['normalize'](filename);
        ret = nodeFS['readFileSync'](filename);
      return binary ? ret : ret.toString();
    };

    readBinary = function readBinary(filename) {
      var ret = read_(filename, true);
      if (!ret.buffer) {
        ret = new Uint8Array(ret);
      }
      assert$1(ret.buffer);
      return ret;
    };

    if (process['argv'].length > 1) {
      thisProgram = process['argv'][1].replace(/\\/g, '/');
    }

    arguments_ = process['argv'].slice(2);

    if (typeof module !== 'undefined') {
      module['exports'] = Module;
    }

    process['on']('uncaughtException', function(ex) {
      // suppress ExitStatus exceptions from showing an error
      if (!(ex instanceof ExitStatus)) {
        throw ex;
      }
    });

    process['on']('unhandledRejection', abort);

    Module['inspect'] = function () { return '[Emscripten Module object]'; };
  } else
  if (ENVIRONMENT_IS_SHELL) {


    if (typeof read != 'undefined') {
      read_ = function shell_read(f) {
        return read(f);
      };
    }

    readBinary = function readBinary(f) {
      var data;
      if (typeof readbuffer === 'function') {
        return new Uint8Array(readbuffer(f));
      }
      data = read(f, 'binary');
      assert$1(typeof data === 'object');
      return data;
    };

    if (typeof scriptArgs != 'undefined') {
      arguments_ = scriptArgs;
    } else if (typeof arguments != 'undefined') {
      arguments_ = arguments;
    }

    if (typeof print !== 'undefined') {
      // Prefer to use print/printErr where they exist, as they usually work better.
      if (typeof console === 'undefined') console = {};
      console.log = print;
      console.warn = console.error = typeof printErr !== 'undefined' ? printErr : print;
    }
  } else
  if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    if (ENVIRONMENT_IS_WORKER) { // Check worker, not web, since window could be polyfilled
      scriptDirectory = self.location.href;
    } else if (document.currentScript) { // web
      scriptDirectory = document.currentScript.src;
    }
    // blob urls look like blob:http://site.com/etc/etc and we cannot infer anything from them.
    // otherwise, slice off the final part of the url to find the script directory.
    // if scriptDirectory does not contain a slash, lastIndexOf will return -1,
    // and scriptDirectory will correctly be replaced with an empty string.
    if (scriptDirectory.indexOf('blob:') !== 0) {
      scriptDirectory = scriptDirectory.substr(0, scriptDirectory.lastIndexOf('/')+1);
    } else {
      scriptDirectory = '';
    }


    read_ = function shell_read(url) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.send(null);
        return xhr.responseText;
    };

    if (ENVIRONMENT_IS_WORKER) {
      readBinary = function readBinary(url) {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', url, false);
          xhr.responseType = 'arraybuffer';
          xhr.send(null);
          return new Uint8Array(xhr.response);
      };
    }
  } else
  {
    throw new Error('environment detection error');
  }

  // Set up the out() and err() hooks, which are how we can print to stdout or
  // stderr, respectively.
  var out = Module['print'] || console.log.bind(console);
  var err = Module['printErr'] || console.warn.bind(console);

  // Merge back in the overrides
  for (key in moduleOverrides) {
    if (moduleOverrides.hasOwnProperty(key)) {
      Module[key] = moduleOverrides[key];
    }
  }
  // Free the object hierarchy contained in the overrides, this lets the GC
  // reclaim data used e.g. in memoryInitializerRequest, which is a large typed array.
  moduleOverrides = null;

  // Emit code to handle expected values on the Module object. This applies Module.x
  // to the proper local x. This has two benefits: first, we only emit it if it is
  // expected to arrive, and second, by using a local everywhere else that can be
  // minified.
  if (Module['arguments']) arguments_ = Module['arguments'];if (!Object.getOwnPropertyDescriptor(Module, 'arguments')) Object.defineProperty(Module, 'arguments', { configurable: true, get: function() { abort('Module.arguments has been replaced with plain arguments_'); } });
  if (Module['thisProgram']) thisProgram = Module['thisProgram'];if (!Object.getOwnPropertyDescriptor(Module, 'thisProgram')) Object.defineProperty(Module, 'thisProgram', { configurable: true, get: function() { abort('Module.thisProgram has been replaced with plain thisProgram'); } });
  if (!Object.getOwnPropertyDescriptor(Module, 'quit')) Object.defineProperty(Module, 'quit', { configurable: true, get: function() { abort('Module.quit has been replaced with plain quit_'); } });

  // perform assertions in shell.js after we set up out() and err(), as otherwise if an assertion fails it cannot print the message
  // Assertions on removed incoming Module JS APIs.
  assert$1(typeof Module['memoryInitializerPrefixURL'] === 'undefined', 'Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead');
  assert$1(typeof Module['pthreadMainPrefixURL'] === 'undefined', 'Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead');
  assert$1(typeof Module['cdInitializerPrefixURL'] === 'undefined', 'Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead');
  assert$1(typeof Module['filePackagePrefixURL'] === 'undefined', 'Module.filePackagePrefixURL option was removed, use Module.locateFile instead');
  assert$1(typeof Module['read'] === 'undefined', 'Module.read option was removed (modify read_ in JS)');
  assert$1(typeof Module['readAsync'] === 'undefined', 'Module.readAsync option was removed (modify readAsync in JS)');
  assert$1(typeof Module['readBinary'] === 'undefined', 'Module.readBinary option was removed (modify readBinary in JS)');
  assert$1(typeof Module['setWindowTitle'] === 'undefined', 'Module.setWindowTitle option was removed (modify setWindowTitle in JS)');
  if (!Object.getOwnPropertyDescriptor(Module, 'read')) Object.defineProperty(Module, 'read', { configurable: true, get: function() { abort('Module.read has been replaced with plain read_'); } });
  if (!Object.getOwnPropertyDescriptor(Module, 'readAsync')) Object.defineProperty(Module, 'readAsync', { configurable: true, get: function() { abort('Module.readAsync has been replaced with plain readAsync'); } });
  if (!Object.getOwnPropertyDescriptor(Module, 'readBinary')) Object.defineProperty(Module, 'readBinary', { configurable: true, get: function() { abort('Module.readBinary has been replaced with plain readBinary'); } });

  // stack management, and other functionality that is provided by the compiled code,
  // should not be used before it is ready
  stackSave = stackRestore = stackAlloc = function() {
    abort('cannot use the stack before compiled code is ready to run, and has provided stack access');
  };

  function warnOnce(text) {
    if (!warnOnce.shown) warnOnce.shown = {};
    if (!warnOnce.shown[text]) {
      warnOnce.shown[text] = 1;
      err(text);
    }
  }




  // === Preamble library stuff ===

  // Documentation for the public APIs defined in this file must be updated in:
  //    site/source/docs/api_reference/preamble.js.rst
  // A prebuilt local version of the documentation is available at:
  //    site/build/text/docs/api_reference/preamble.js.txt
  // You can also build docs locally as HTML or other formats in site/
  // An online HTML version (which may be of a different version of Emscripten)
  //    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html


  var wasmBinary;if (Module['wasmBinary']) wasmBinary = Module['wasmBinary'];if (!Object.getOwnPropertyDescriptor(Module, 'wasmBinary')) Object.defineProperty(Module, 'wasmBinary', { configurable: true, get: function() { abort('Module.wasmBinary has been replaced with plain wasmBinary'); } });
  if (!Object.getOwnPropertyDescriptor(Module, 'noExitRuntime')) Object.defineProperty(Module, 'noExitRuntime', { configurable: true, get: function() { abort('Module.noExitRuntime has been replaced with plain noExitRuntime'); } });


  if (typeof WebAssembly !== 'object') {
    abort('No WebAssembly support found. Build with -s WASM=0 to target JavaScript instead.');
  }





  // Wasm globals

  var wasmMemory;

  // In fastcomp asm.js, we don't need a wasm Table at all.
  // In the wasm backend, we polyfill the WebAssembly object,
  // so this creates a (non-native-wasm) table for us.
  var wasmTable = new WebAssembly.Table({
    'initial': 17,
    'maximum': 17 + 0,
    'element': 'anyfunc'
  });


  //========================================
  // Runtime essentials
  //========================================

  // whether we are quitting the application. no code should run after this.
  // set in exit() and abort()
  var ABORT = false;

  /** @type {function(*, string=)} */
  function assert$1(condition, text) {
    if (!condition) {
      abort('Assertion failed: ' + text);
    }
  }

  // Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
  function getCFunc(ident) {
    var func = Module['_' + ident]; // closure exported function
    assert$1(func, 'Cannot call unknown function ' + ident + ', make sure it is exported');
    return func;
  }

  // C calling interface.
  function ccall(ident, returnType, argTypes, args, opts) {
    // For fast lookup of conversion functions
    var toC = {
      'string': function(str) {
        var ret = 0;
        if (str !== null && str !== undefined && str !== 0) { // null string
          // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
          var len = (str.length << 2) + 1;
          ret = stackAlloc(len);
          stringToUTF8(str, ret, len);
        }
        return ret;
      },
      'array': function(arr) {
        var ret = stackAlloc(arr.length);
        writeArrayToMemory(arr, ret);
        return ret;
      }
    };

    function convertReturnValue(ret) {
      if (returnType === 'string') return UTF8ToString(ret);
      if (returnType === 'boolean') return Boolean(ret);
      return ret;
    }

    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    assert$1(returnType !== 'array', 'Return type should not be "array".');
    if (args) {
      for (var i = 0; i < args.length; i++) {
        var converter = toC[argTypes[i]];
        if (converter) {
          if (stack === 0) stack = stackSave();
          cArgs[i] = converter(args[i]);
        } else {
          cArgs[i] = args[i];
        }
      }
    }
    var ret = func.apply(null, cArgs);

    ret = convertReturnValue(ret);
    if (stack !== 0) stackRestore(stack);
    return ret;
  }

  function cwrap(ident, returnType, argTypes, opts) {
    return function() {
      return ccall(ident, returnType, argTypes, arguments);
    }
  }


  // Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the given array that contains uint8 values, returns
  // a copy of that string as a Javascript String object.

  var UTF8Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf8') : undefined;

  /**
   * @param {number} idx
   * @param {number=} maxBytesToRead
   * @return {string}
   */
  function UTF8ArrayToString(u8Array, idx, maxBytesToRead) {
    var endIdx = idx + maxBytesToRead;
    var endPtr = idx;
    // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
    // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
    // (As a tiny code save trick, compare endPtr against endIdx using a negation, so that undefined means Infinity)
    while (u8Array[endPtr] && !(endPtr >= endIdx)) ++endPtr;

    if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
      return UTF8Decoder.decode(u8Array.subarray(idx, endPtr));
    } else {
      var str = '';
      // If building with TextDecoder, we have already computed the string length above, so test loop end condition against that
      while (idx < endPtr) {
        // For UTF8 byte structure, see:
        // http://en.wikipedia.org/wiki/UTF-8#Description
        // https://www.ietf.org/rfc/rfc2279.txt
        // https://tools.ietf.org/html/rfc3629
        var u0 = u8Array[idx++];
        if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
        var u1 = u8Array[idx++] & 63;
        if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
        var u2 = u8Array[idx++] & 63;
        if ((u0 & 0xF0) == 0xE0) {
          u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
        } else {
          if ((u0 & 0xF8) != 0xF0) warnOnce('Invalid UTF-8 leading byte 0x' + u0.toString(16) + ' encountered when deserializing a UTF-8 string on the asm.js/wasm heap to a JS string!');
          u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (u8Array[idx++] & 63);
        }

        if (u0 < 0x10000) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 0x10000;
          str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
        }
      }
    }
    return str;
  }

  // Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the emscripten HEAP, returns a
  // copy of that string as a Javascript String object.
  // maxBytesToRead: an optional length that specifies the maximum number of bytes to read. You can omit
  //                 this parameter to scan the string until the first \0 byte. If maxBytesToRead is
  //                 passed, and the string at [ptr, ptr+maxBytesToReadr[ contains a null byte in the
  //                 middle, then the string will cut short at that byte index (i.e. maxBytesToRead will
  //                 not produce a string of exact length [ptr, ptr+maxBytesToRead[)
  //                 N.B. mixing frequent uses of UTF8ToString() with and without maxBytesToRead may
  //                 throw JS JIT optimizations off, so it is worth to consider consistently using one
  //                 style or the other.
  /**
   * @param {number} ptr
   * @param {number=} maxBytesToRead
   * @return {string}
   */
  function UTF8ToString(ptr, maxBytesToRead) {
    return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : '';
  }

  // Copies the given Javascript String object 'str' to the given byte array at address 'outIdx',
  // encoded in UTF8 form and null-terminated. The copy will require at most str.length*4+1 bytes of space in the HEAP.
  // Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
  // Parameters:
  //   str: the Javascript string to copy.
  //   outU8Array: the array to copy to. Each index in this array is assumed to be one 8-byte element.
  //   outIdx: The starting offset in the array to begin the copying.
  //   maxBytesToWrite: The maximum number of bytes this function can write to the array.
  //                    This count should include the null terminator,
  //                    i.e. if maxBytesToWrite=1, only the null terminator will be written and nothing else.
  //                    maxBytesToWrite=0 does not write any bytes to the output, not even the null terminator.
  // Returns the number of bytes written, EXCLUDING the null terminator.

  function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
    if (!(maxBytesToWrite > 0)) // Parameter maxBytesToWrite is not optional. Negative values, 0, null, undefined and false each don't write out any bytes.
      return 0;

    var startIdx = outIdx;
    var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
    for (var i = 0; i < str.length; ++i) {
      // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
      // See http://unicode.org/faq/utf_bom.html#utf16-3
      // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
      var u = str.charCodeAt(i); // possibly a lead surrogate
      if (u >= 0xD800 && u <= 0xDFFF) {
        var u1 = str.charCodeAt(++i);
        u = 0x10000 + ((u & 0x3FF) << 10) | (u1 & 0x3FF);
      }
      if (u <= 0x7F) {
        if (outIdx >= endIdx) break;
        outU8Array[outIdx++] = u;
      } else if (u <= 0x7FF) {
        if (outIdx + 1 >= endIdx) break;
        outU8Array[outIdx++] = 0xC0 | (u >> 6);
        outU8Array[outIdx++] = 0x80 | (u & 63);
      } else if (u <= 0xFFFF) {
        if (outIdx + 2 >= endIdx) break;
        outU8Array[outIdx++] = 0xE0 | (u >> 12);
        outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
        outU8Array[outIdx++] = 0x80 | (u & 63);
      } else {
        if (outIdx + 3 >= endIdx) break;
        if (u >= 0x200000) warnOnce('Invalid Unicode code point 0x' + u.toString(16) + ' encountered when serializing a JS string to an UTF-8 string on the asm.js/wasm heap! (Valid unicode code points should be in range 0-0x1FFFFF).');
        outU8Array[outIdx++] = 0xF0 | (u >> 18);
        outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
        outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
        outU8Array[outIdx++] = 0x80 | (u & 63);
      }
    }
    // Null-terminate the pointer to the buffer.
    outU8Array[outIdx] = 0;
    return outIdx - startIdx;
  }

  // Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
  // null-terminated and encoded in UTF8 form. The copy will require at most str.length*4+1 bytes of space in the HEAP.
  // Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
  // Returns the number of bytes written, EXCLUDING the null terminator.

  function stringToUTF8(str, outPtr, maxBytesToWrite) {
    assert$1(typeof maxBytesToWrite == 'number', 'stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
    return stringToUTF8Array(str, HEAPU8,outPtr, maxBytesToWrite);
  }

  // Returns the number of bytes the given Javascript string takes if encoded as a UTF8 byte array, EXCLUDING the null terminator byte.
  function lengthBytesUTF8(str) {
    var len = 0;
    for (var i = 0; i < str.length; ++i) {
      // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
      // See http://unicode.org/faq/utf_bom.html#utf16-3
      var u = str.charCodeAt(i); // possibly a lead surrogate
      if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
      if (u <= 0x7F) ++len;
      else if (u <= 0x7FF) len += 2;
      else if (u <= 0xFFFF) len += 3;
      else len += 4;
    }
    return len;
  }


  // Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
  // a copy of that string as a Javascript String object.

  var UTF16Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-16le') : undefined;

  function writeArrayToMemory(array, buffer) {
    assert$1(array.length >= 0, 'writeArrayToMemory array must have a length (should be an array or typed array)');
    HEAP8.set(array, buffer);
  }
  var WASM_PAGE_SIZE = 65536;

  var /** @type {ArrayBuffer} */
    buffer,
  /** @type {Int8Array} */
    HEAP8,
  /** @type {Uint8Array} */
    HEAPU8,
  /** @type {Int16Array} */
    HEAP16,
  /** @type {Uint16Array} */
    HEAPU16,
  /** @type {Int32Array} */
    HEAP32,
  /** @type {Uint32Array} */
    HEAPU32,
  /** @type {Float32Array} */
    HEAPF32,
  /** @type {Float64Array} */
    HEAPF64;

  function updateGlobalBufferAndViews(buf) {
    buffer = buf;
    Module['HEAP8'] = HEAP8 = new Int8Array(buf);
    Module['HEAP16'] = HEAP16 = new Int16Array(buf);
    Module['HEAP32'] = HEAP32 = new Int32Array(buf);
    Module['HEAPU8'] = HEAPU8 = new Uint8Array(buf);
    Module['HEAPU16'] = HEAPU16 = new Uint16Array(buf);
    Module['HEAPU32'] = HEAPU32 = new Uint32Array(buf);
    Module['HEAPF32'] = HEAPF32 = new Float32Array(buf);
    Module['HEAPF64'] = HEAPF64 = new Float64Array(buf);
  }

  var STACK_BASE = 5265104,
      STACK_MAX = 22224,
      DYNAMIC_BASE = 5265104,
      DYNAMICTOP_PTR = 22064;

  assert$1(STACK_BASE % 16 === 0, 'stack must start aligned');
  assert$1(DYNAMIC_BASE % 16 === 0, 'heap must start aligned');



  var TOTAL_STACK = 5242880;
  if (Module['TOTAL_STACK']) assert$1(TOTAL_STACK === Module['TOTAL_STACK'], 'the stack size can no longer be determined at runtime');

  var INITIAL_TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;if (!Object.getOwnPropertyDescriptor(Module, 'TOTAL_MEMORY')) Object.defineProperty(Module, 'TOTAL_MEMORY', { configurable: true, get: function() { abort('Module.TOTAL_MEMORY has been replaced with plain INITIAL_TOTAL_MEMORY'); } });

  assert$1(INITIAL_TOTAL_MEMORY >= TOTAL_STACK, 'TOTAL_MEMORY should be larger than TOTAL_STACK, was ' + INITIAL_TOTAL_MEMORY + '! (TOTAL_STACK=' + TOTAL_STACK + ')');

  // check for full engine support (use string 'subarray' to avoid closure compiler confusion)
  assert$1(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && Int32Array.prototype.subarray !== undefined && Int32Array.prototype.set !== undefined,
         'JS engine does not provide full typed array support');






  // In standalone mode, the wasm creates the memory, and the user can't provide it.
  // In non-standalone/normal mode, we create the memory here.

  // Create the main memory. (Note: this isn't used in STANDALONE_WASM mode since the wasm
  // memory is created in the wasm, not in JS.)

    if (Module['wasmMemory']) {
      wasmMemory = Module['wasmMemory'];
    } else
    {
      wasmMemory = new WebAssembly.Memory({
        'initial': INITIAL_TOTAL_MEMORY / WASM_PAGE_SIZE
        ,
        'maximum': INITIAL_TOTAL_MEMORY / WASM_PAGE_SIZE
      });
    }


  if (wasmMemory) {
    buffer = wasmMemory.buffer;
  }

  // If the user provides an incorrect length, just use that length instead rather than providing the user to
  // specifically provide the memory length with Module['TOTAL_MEMORY'].
  INITIAL_TOTAL_MEMORY = buffer.byteLength;
  assert$1(INITIAL_TOTAL_MEMORY % WASM_PAGE_SIZE === 0);
  updateGlobalBufferAndViews(buffer);

  HEAP32[DYNAMICTOP_PTR>>2] = DYNAMIC_BASE;




  // Initializes the stack cookie. Called at the startup of main and at the startup of each thread in pthreads mode.
  function writeStackCookie() {
    assert$1((STACK_MAX & 3) == 0);
    // The stack grows downwards
    HEAPU32[(STACK_MAX >> 2)+1] = 0x02135467;
    HEAPU32[(STACK_MAX >> 2)+2] = 0x89BACDFE;
    // Also test the global address 0 for integrity.
    // We don't do this with ASan because ASan does its own checks for this.
    HEAP32[0] = 0x63736d65; /* 'emsc' */
  }

  function checkStackCookie() {
    var cookie1 = HEAPU32[(STACK_MAX >> 2)+1];
    var cookie2 = HEAPU32[(STACK_MAX >> 2)+2];
    if (cookie1 != 0x02135467 || cookie2 != 0x89BACDFE) {
      abort('Stack overflow! Stack cookie has been overwritten, expected hex dwords 0x89BACDFE and 0x02135467, but received 0x' + cookie2.toString(16) + ' ' + cookie1.toString(16));
    }
    // Also test the global address 0 for integrity.
    // We don't do this with ASan because ASan does its own checks for this.
    if (HEAP32[0] !== 0x63736d65 /* 'emsc' */) abort('Runtime error: The application has corrupted its heap memory area (address zero)!');
  }

  function abortStackOverflow(allocSize) {
    abort('Stack overflow! Attempted to allocate ' + allocSize + ' bytes on the stack, but stack has only ' + (STACK_MAX - stackSave() + allocSize) + ' bytes available!');
  }




  // Endianness check (note: assumes compiler arch was little-endian)
  (function() {
    var h16 = new Int16Array(1);
    var h8 = new Int8Array(h16.buffer);
    h16[0] = 0x6373;
    if (h8[0] !== 0x73 || h8[1] !== 0x63) throw 'Runtime error: expected the system to be little-endian!';
  })();



  function callRuntimeCallbacks(callbacks) {
    while(callbacks.length > 0) {
      var callback = callbacks.shift();
      if (typeof callback == 'function') {
        callback();
        continue;
      }
      var func = callback.func;
      if (typeof func === 'number') {
        if (callback.arg === undefined) {
          Module['dynCall_v'](func);
        } else {
          Module['dynCall_vi'](func, callback.arg);
        }
      } else {
        func(callback.arg === undefined ? null : callback.arg);
      }
    }
  }

  var __ATPRERUN__  = []; // functions called before the runtime is initialized
  var __ATINIT__    = []; // functions called during startup
  var __ATMAIN__    = []; // functions called when main() is to be run
  var __ATPOSTRUN__ = []; // functions called after the main() is called

  var runtimeInitialized = false;
  var runtimeExited = false;


  function preRun() {

    if (Module['preRun']) {
      if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
      while (Module['preRun'].length) {
        addOnPreRun(Module['preRun'].shift());
      }
    }

    callRuntimeCallbacks(__ATPRERUN__);
  }

  function initRuntime() {
    checkStackCookie();
    assert$1(!runtimeInitialized);
    runtimeInitialized = true;
    
    callRuntimeCallbacks(__ATINIT__);
  }

  function preMain() {
    checkStackCookie();
    
    callRuntimeCallbacks(__ATMAIN__);
  }

  function postRun() {
    checkStackCookie();

    if (Module['postRun']) {
      if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
      while (Module['postRun'].length) {
        addOnPostRun(Module['postRun'].shift());
      }
    }

    callRuntimeCallbacks(__ATPOSTRUN__);
  }

  function addOnPreRun(cb) {
    __ATPRERUN__.unshift(cb);
  }

  function addOnPreMain(cb) {
    __ATMAIN__.unshift(cb);
  }

  function addOnPostRun(cb) {
    __ATPOSTRUN__.unshift(cb);
  }


  assert$1(Math.imul, 'This browser does not support Math.imul(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
  assert$1(Math.fround, 'This browser does not support Math.fround(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
  assert$1(Math.clz32, 'This browser does not support Math.clz32(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
  assert$1(Math.trunc, 'This browser does not support Math.trunc(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');



  // A counter of dependencies for calling run(). If we need to
  // do asynchronous work before running, increment this and
  // decrement it. Incrementing must happen in a place like
  // Module.preRun (used by emcc to add file preloading).
  // Note that you can add dependencies in preRun, even though
  // it happens right before run - run will be postponed until
  // the dependencies are met.
  var runDependencies = 0;
  var runDependencyWatcher = null;
  var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled
  var runDependencyTracking = {};

  function addRunDependency(id) {
    runDependencies++;

    if (Module['monitorRunDependencies']) {
      Module['monitorRunDependencies'](runDependencies);
    }

    if (id) {
      assert$1(!runDependencyTracking[id]);
      runDependencyTracking[id] = 1;
      if (runDependencyWatcher === null && typeof setInterval !== 'undefined') {
        // Check for missing dependencies every few seconds
        runDependencyWatcher = setInterval(function() {
          if (ABORT) {
            clearInterval(runDependencyWatcher);
            runDependencyWatcher = null;
            return;
          }
          var shown = false;
          for (var dep in runDependencyTracking) {
            if (!shown) {
              shown = true;
              err('still waiting on run dependencies:');
            }
            err('dependency: ' + dep);
          }
          if (shown) {
            err('(end of list)');
          }
        }, 10000);
      }
    } else {
      err('warning: run dependency added without ID');
    }
  }

  function removeRunDependency(id) {
    runDependencies--;

    if (Module['monitorRunDependencies']) {
      Module['monitorRunDependencies'](runDependencies);
    }

    if (id) {
      assert$1(runDependencyTracking[id]);
      delete runDependencyTracking[id];
    } else {
      err('warning: run dependency removed without ID');
    }
    if (runDependencies == 0) {
      if (runDependencyWatcher !== null) {
        clearInterval(runDependencyWatcher);
        runDependencyWatcher = null;
      }
      if (dependenciesFulfilled) {
        var callback = dependenciesFulfilled;
        dependenciesFulfilled = null;
        callback(); // can add another dependenciesFulfilled
      }
    }
  }

  Module["preloadedImages"] = {}; // maps url to image data
  Module["preloadedAudios"] = {}; // maps url to audio data


  function abort(what) {
    if (Module['onAbort']) {
      Module['onAbort'](what);
    }

    what += '';
    out(what);
    err(what);

    ABORT = true;

    var output = 'abort(' + what + ') at ' + stackTrace();
    what = output;

    // Throw a wasm runtime error, because a JS error might be seen as a foreign
    // exception, which means we'd run destructors on it. We need the error to
    // simply make the program stop.
    throw new WebAssembly.RuntimeError(what);
  }




  // show errors on likely calls to FS when it was not included
  var FS = {
    error: function() {
      abort('Filesystem support (FS) was not included. The problem is that you are using files from JS, but files were not used from C/C++, so filesystem support was not auto-included. You can force-include filesystem support with  -s FORCE_FILESYSTEM=1');
    },
    init: function() { FS.error(); },
    createDataFile: function() { FS.error(); },
    createPreloadedFile: function() { FS.error(); },
    createLazyFile: function() { FS.error(); },
    open: function() { FS.error(); },
    mkdev: function() { FS.error(); },
    registerDevice: function() { FS.error(); },
    analyzePath: function() { FS.error(); },
    loadFilesFromDB: function() { FS.error(); },

    ErrnoError: function ErrnoError() { FS.error(); },
  };
  Module['FS_createDataFile'] = FS.createDataFile;
  Module['FS_createPreloadedFile'] = FS.createPreloadedFile;



  // Copyright 2017 The Emscripten Authors.  All rights reserved.
  // Emscripten is available under two separate licenses, the MIT license and the
  // University of Illinois/NCSA Open Source License.  Both these licenses can be
  // found in the LICENSE file.

  // Prefix of data URIs emitted by SINGLE_FILE and related options.
  var dataURIPrefix = 'data:application/octet-stream;base64,';

  // Indicates whether filename is a base64 data URI.
  function isDataURI(filename) {
    return String.prototype.startsWith ?
        filename.startsWith(dataURIPrefix) :
        filename.indexOf(dataURIPrefix) === 0;
  }




  var wasmBinaryFile = 'grapheme_wasm.wasm';
  if (!isDataURI(wasmBinaryFile)) {
    wasmBinaryFile = locateFile(wasmBinaryFile);
  }

  function getBinary() {
    try {
      if (wasmBinary) {
        return new Uint8Array(wasmBinary);
      }

      if (readBinary) {
        return readBinary(wasmBinaryFile);
      } else {
        throw "both async and sync fetching of the wasm failed";
      }
    }
    catch (err) {
      abort(err);
    }
  }

  function getBinaryPromise() {
    // if we don't have the binary yet, and have the Fetch api, use that
    // in some environments, like Electron's render process, Fetch api may be present, but have a different context than expected, let's only use it on the Web
    if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) && typeof fetch === 'function') {
      return fetch(wasmBinaryFile, { credentials: 'same-origin' }).then(function(response) {
        if (!response['ok']) {
          throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
        }
        return response['arrayBuffer']();
      }).catch(function () {
        return getBinary();
      });
    }
    // Otherwise, getBinary should be able to get it synchronously
    return new Promise(function(resolve, reject) {
      resolve(getBinary());
    });
  }



  // Create the wasm instance.
  // Receives the wasm imports, returns the exports.
  function createWasm() {
    // prepare imports
    var info = {
      'env': asmLibraryArg,
      'wasi_unstable': asmLibraryArg
    };
    // Load the wasm module and create an instance of using native support in the JS engine.
    // handle a generated wasm instance, receiving its exports and
    // performing other necessary setup
    function receiveInstance(instance, module) {
      var exports = instance.exports;
      Module['asm'] = exports;
      removeRunDependency('wasm-instantiate');
    }
     // we can't run yet (except in a pthread, where we have a custom sync instantiator)
    addRunDependency('wasm-instantiate');


    // Async compilation can be confusing when an error on the page overwrites Module
    // (for example, if the order of elements is wrong, and the one defining Module is
    // later), so we save Module and check it later.
    var trueModule = Module;
    function receiveInstantiatedSource(output) {
      // 'output' is a WebAssemblyInstantiatedSource object which has both the module and instance.
      // receiveInstance() will swap in the exports (to Module.asm) so they can be called
      assert$1(Module === trueModule, 'the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?');
      trueModule = null;
        // TODO: Due to Closure regression https://github.com/google/closure-compiler/issues/3193, the above line no longer optimizes out down to the following line.
        // When the regression is fixed, can restore the above USE_PTHREADS-enabled path.
      receiveInstance(output['instance']);
    }


    function instantiateArrayBuffer(receiver) {
      return getBinaryPromise().then(function(binary) {
        return WebAssembly.instantiate(binary, info);
      }).then(receiver, function(reason) {
        err('failed to asynchronously prepare wasm: ' + reason);
        abort(reason);
      });
    }

    // Prefer streaming instantiation if available.
    function instantiateAsync() {
      if (!wasmBinary &&
          typeof WebAssembly.instantiateStreaming === 'function' &&
          !isDataURI(wasmBinaryFile) &&
          typeof fetch === 'function') {
        fetch(wasmBinaryFile, { credentials: 'same-origin' }).then(function (response) {
          var result = WebAssembly.instantiateStreaming(response, info);
          return result.then(receiveInstantiatedSource, function(reason) {
              // We expect the most common failure cause to be a bad MIME type for the binary,
              // in which case falling back to ArrayBuffer instantiation should work.
              err('wasm streaming compile failed: ' + reason);
              err('falling back to ArrayBuffer instantiation');
              instantiateArrayBuffer(receiveInstantiatedSource);
            });
        });
      } else {
        return instantiateArrayBuffer(receiveInstantiatedSource);
      }
    }
    // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
    // to manually instantiate the Wasm module themselves. This allows pages to run the instantiation parallel
    // to any other async startup actions they are performing.
    if (Module['instantiateWasm']) {
      try {
        var exports = Module['instantiateWasm'](info, receiveInstance);
        return exports;
      } catch(e) {
        err('Module.instantiateWasm callback failed with error: ' + e);
        return false;
      }
    }

    instantiateAsync();
    return {}; // no exports yet; we'll fill them in later
  }




  // STATICTOP = STATIC_BASE + 21200;
  /* global initializers */  __ATINIT__.push({ func: function() { ___wasm_call_ctors(); } });



  /* no memory initializer */
  // {{PRE_LIBRARY}}


    function demangle(func) {
        warnOnce('warning: build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling');
        return func;
      }

    function demangleAll(text) {
        var regex =
          /\b_Z[\w\d_]+/g;
        return text.replace(regex,
          function(x) {
            var y = demangle(x);
            return x === y ? x : (y + ' [' + x + ']');
          });
      }

    function jsStackTrace() {
        var err = new Error();
        if (!err.stack) {
          // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
          // so try that as a special-case.
          try {
            throw new Error(0);
          } catch(e) {
            err = e;
          }
          if (!err.stack) {
            return '(no stack trace available)';
          }
        }
        return err.stack.toString();
      }

    function stackTrace() {
        var js = jsStackTrace();
        if (Module['extraStackTrace']) js += '\n' + Module['extraStackTrace']();
        return demangleAll(js);
      }

    
    function _atexit(func, arg) {
        warnOnce('atexit() called, but EXIT_RUNTIME is not set, so atexits() will not be called. set EXIT_RUNTIME to 1 (see the FAQ)');
      }function ___cxa_atexit(
    ) {
    return _atexit.apply(null, arguments)
    }

    function ___lock() {}

    function ___unlock() {}

    function _abort() {
        abort();
      }

    function _emscripten_get_sbrk_ptr() {
        return 22064;
      }

    function _emscripten_memcpy_big(dest, src, num) {
        HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
      }

    
    function abortOnCannotGrowMemory(requestedSize) {
        abort('Cannot enlarge memory arrays to size ' + requestedSize + ' bytes (OOM). Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value ' + HEAP8.length + ', (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which allows increasing the size at runtime, or (3) if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ');
      }function _emscripten_resize_heap(requestedSize) {
        abortOnCannotGrowMemory(requestedSize);
      }
  var SYSCALLS={buffers:[null,[],[]],printChar:function(stream, curr) {
          var buffer = SYSCALLS.buffers[stream];
          assert$1(buffer);
          if (curr === 0 || curr === 10) {
            (stream === 1 ? out : err)(UTF8ArrayToString(buffer, 0));
            buffer.length = 0;
          } else {
            buffer.push(curr);
          }
        },varargs:0,get:function(varargs) {
          SYSCALLS.varargs += 4;
          var ret = HEAP32[(((SYSCALLS.varargs)-(4))>>2)];
          return ret;
        },getStr:function() {
          var ret = UTF8ToString(SYSCALLS.get());
          return ret;
        },get64:function() {
          var low = SYSCALLS.get(), high = SYSCALLS.get();
          if (low >= 0) assert$1(high === 0);
          else assert$1(high === -1);
          return low;
        },getZero:function() {
          assert$1(SYSCALLS.get() === 0);
        }};function _fd_close(fd) {try {
    
        abort('it should not be possible to operate on streams when !SYSCALLS_REQUIRE_FILESYSTEM');
        return 0;
      } catch (e) {
      if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
      return e.errno;
    }
    }

    function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {try {
    
        abort('it should not be possible to operate on streams when !SYSCALLS_REQUIRE_FILESYSTEM');
        return 0;
      } catch (e) {
      if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
      return e.errno;
    }
    }
  function _fd_write(fd, iov, iovcnt, pnum) {try {
    
        // hack to support printf in SYSCALLS_REQUIRE_FILESYSTEM=0
        var num = 0;
        for (var i = 0; i < iovcnt; i++) {
          var ptr = HEAP32[(((iov)+(i*8))>>2)];
          var len = HEAP32[(((iov)+(i*8 + 4))>>2)];
          for (var j = 0; j < len; j++) {
            SYSCALLS.printChar(fd, HEAPU8[ptr+j]);
          }
          num += len;
        }
        HEAP32[((pnum)>>2)]=num;
        return 0;
      } catch (e) {
      if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
      return e.errno;
    }
    }

    function _setTempRet0($i) {
      }

  // Copyright 2017 The Emscripten Authors.  All rights reserved.
  // Emscripten is available under two separate licenses, the MIT license and the
  // University of Illinois/NCSA Open Source License.  Both these licenses can be
  // found in the LICENSE file.

  /** @type {function(string, boolean=, number=)} */
  function intArrayFromString(stringy, dontAddNull, length) {
    var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
    var u8array = new Array(len);
    var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
    if (dontAddNull) u8array.length = numBytesWritten;
    return u8array;
  }
  var asmLibraryArg = { "__cxa_atexit": ___cxa_atexit, "__lock": ___lock, "__unlock": ___unlock, "abort": _abort, "emscripten_get_sbrk_ptr": _emscripten_get_sbrk_ptr, "emscripten_memcpy_big": _emscripten_memcpy_big, "emscripten_resize_heap": _emscripten_resize_heap, "fd_close": _fd_close, "fd_seek": _fd_seek, "fd_write": _fd_write, "memory": wasmMemory, "setTempRet0": _setTempRet0, "table": wasmTable };
  var asm = createWasm();
  var real____wasm_call_ctors = asm["__wasm_call_ctors"];
  asm["__wasm_call_ctors"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real____wasm_call_ctors.apply(null, arguments);
  };

  var real__emscripten_bind_Real_Real_1 = asm["emscripten_bind_Real_Real_1"];
  asm["emscripten_bind_Real_Real_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_Real_1.apply(null, arguments);
  };

  var real__emscripten_bind_Real_set_precision_1 = asm["emscripten_bind_Real_set_precision_1"];
  asm["emscripten_bind_Real_set_precision_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_set_precision_1.apply(null, arguments);
  };

  var real__emscripten_bind_Real_get_precision_0 = asm["emscripten_bind_Real_get_precision_0"];
  asm["emscripten_bind_Real_get_precision_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_get_precision_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_set_value_from_float_1 = asm["emscripten_bind_Real_set_value_from_float_1"];
  asm["emscripten_bind_Real_set_value_from_float_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_set_value_from_float_1.apply(null, arguments);
  };

  var real__emscripten_bind_Real_set_value_from_string_1 = asm["emscripten_bind_Real_set_value_from_string_1"];
  asm["emscripten_bind_Real_set_value_from_string_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_set_value_from_string_1.apply(null, arguments);
  };

  var real__emscripten_bind_Real_get_value_1 = asm["emscripten_bind_Real_get_value_1"];
  asm["emscripten_bind_Real_get_value_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_get_value_1.apply(null, arguments);
  };

  var real__emscripten_bind_Real_get_value_no_point_1 = asm["emscripten_bind_Real_get_value_no_point_1"];
  asm["emscripten_bind_Real_get_value_no_point_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_get_value_no_point_1.apply(null, arguments);
  };

  var real__emscripten_bind_Real_set_value_from_real_1 = asm["emscripten_bind_Real_set_value_from_real_1"];
  asm["emscripten_bind_Real_set_value_from_real_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_set_value_from_real_1.apply(null, arguments);
  };

  var real__emscripten_bind_Real_set_nan_0 = asm["emscripten_bind_Real_set_nan_0"];
  asm["emscripten_bind_Real_set_nan_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_set_nan_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_set_inf_1 = asm["emscripten_bind_Real_set_inf_1"];
  asm["emscripten_bind_Real_set_inf_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_set_inf_1.apply(null, arguments);
  };

  var real__emscripten_bind_Real_set_zero_1 = asm["emscripten_bind_Real_set_zero_1"];
  asm["emscripten_bind_Real_set_zero_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_set_zero_1.apply(null, arguments);
  };

  var real__emscripten_bind_Real_approximate_as_float_0 = asm["emscripten_bind_Real_approximate_as_float_0"];
  asm["emscripten_bind_Real_approximate_as_float_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_approximate_as_float_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_add_float_1 = asm["emscripten_bind_Real_add_float_1"];
  asm["emscripten_bind_Real_add_float_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_add_float_1.apply(null, arguments);
  };

  var real__emscripten_bind_Real_add_real_1 = asm["emscripten_bind_Real_add_real_1"];
  asm["emscripten_bind_Real_add_real_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_add_real_1.apply(null, arguments);
  };

  var real__emscripten_bind_Real_subtract_float_1 = asm["emscripten_bind_Real_subtract_float_1"];
  asm["emscripten_bind_Real_subtract_float_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_subtract_float_1.apply(null, arguments);
  };

  var real__emscripten_bind_Real_subtract_real_1 = asm["emscripten_bind_Real_subtract_real_1"];
  asm["emscripten_bind_Real_subtract_real_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_subtract_real_1.apply(null, arguments);
  };

  var real__emscripten_bind_Real_multiply_float_1 = asm["emscripten_bind_Real_multiply_float_1"];
  asm["emscripten_bind_Real_multiply_float_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_multiply_float_1.apply(null, arguments);
  };

  var real__emscripten_bind_Real_multiply_real_1 = asm["emscripten_bind_Real_multiply_real_1"];
  asm["emscripten_bind_Real_multiply_real_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_multiply_real_1.apply(null, arguments);
  };

  var real__emscripten_bind_Real_square_0 = asm["emscripten_bind_Real_square_0"];
  asm["emscripten_bind_Real_square_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_square_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_divide_float_1 = asm["emscripten_bind_Real_divide_float_1"];
  asm["emscripten_bind_Real_divide_float_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_divide_float_1.apply(null, arguments);
  };

  var real__emscripten_bind_Real_divide_real_1 = asm["emscripten_bind_Real_divide_real_1"];
  asm["emscripten_bind_Real_divide_real_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_divide_real_1.apply(null, arguments);
  };

  var real__emscripten_bind_Real_pow_real_1 = asm["emscripten_bind_Real_pow_real_1"];
  asm["emscripten_bind_Real_pow_real_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_pow_real_1.apply(null, arguments);
  };

  var real__emscripten_bind_Real_pow_rational_2 = asm["emscripten_bind_Real_pow_rational_2"];
  asm["emscripten_bind_Real_pow_rational_2"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_pow_rational_2.apply(null, arguments);
  };

  var real__emscripten_bind_Real_pow_int_1 = asm["emscripten_bind_Real_pow_int_1"];
  asm["emscripten_bind_Real_pow_int_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_pow_int_1.apply(null, arguments);
  };

  var real__emscripten_bind_Real_sqrt_0 = asm["emscripten_bind_Real_sqrt_0"];
  asm["emscripten_bind_Real_sqrt_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_sqrt_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_cbrt_0 = asm["emscripten_bind_Real_cbrt_0"];
  asm["emscripten_bind_Real_cbrt_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_cbrt_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_rootn_1 = asm["emscripten_bind_Real_rootn_1"];
  asm["emscripten_bind_Real_rootn_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_rootn_1.apply(null, arguments);
  };

  var real__emscripten_bind_Real_ln_0 = asm["emscripten_bind_Real_ln_0"];
  asm["emscripten_bind_Real_ln_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_ln_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_log10_0 = asm["emscripten_bind_Real_log10_0"];
  asm["emscripten_bind_Real_log10_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_log10_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_log2_0 = asm["emscripten_bind_Real_log2_0"];
  asm["emscripten_bind_Real_log2_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_log2_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_exp_0 = asm["emscripten_bind_Real_exp_0"];
  asm["emscripten_bind_Real_exp_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_exp_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_exp2_0 = asm["emscripten_bind_Real_exp2_0"];
  asm["emscripten_bind_Real_exp2_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_exp2_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_exp10_0 = asm["emscripten_bind_Real_exp10_0"];
  asm["emscripten_bind_Real_exp10_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_exp10_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_sin_0 = asm["emscripten_bind_Real_sin_0"];
  asm["emscripten_bind_Real_sin_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_sin_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_cos_0 = asm["emscripten_bind_Real_cos_0"];
  asm["emscripten_bind_Real_cos_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_cos_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_tan_0 = asm["emscripten_bind_Real_tan_0"];
  asm["emscripten_bind_Real_tan_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_tan_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_sec_0 = asm["emscripten_bind_Real_sec_0"];
  asm["emscripten_bind_Real_sec_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_sec_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_csc_0 = asm["emscripten_bind_Real_csc_0"];
  asm["emscripten_bind_Real_csc_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_csc_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_cot_0 = asm["emscripten_bind_Real_cot_0"];
  asm["emscripten_bind_Real_cot_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_cot_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_acos_0 = asm["emscripten_bind_Real_acos_0"];
  asm["emscripten_bind_Real_acos_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_acos_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_asin_0 = asm["emscripten_bind_Real_asin_0"];
  asm["emscripten_bind_Real_asin_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_asin_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_atan_0 = asm["emscripten_bind_Real_atan_0"];
  asm["emscripten_bind_Real_atan_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_atan_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_sinh_0 = asm["emscripten_bind_Real_sinh_0"];
  asm["emscripten_bind_Real_sinh_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_sinh_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_cosh_0 = asm["emscripten_bind_Real_cosh_0"];
  asm["emscripten_bind_Real_cosh_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_cosh_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_tanh_0 = asm["emscripten_bind_Real_tanh_0"];
  asm["emscripten_bind_Real_tanh_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_tanh_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_sech_0 = asm["emscripten_bind_Real_sech_0"];
  asm["emscripten_bind_Real_sech_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_sech_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_csch_0 = asm["emscripten_bind_Real_csch_0"];
  asm["emscripten_bind_Real_csch_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_csch_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_coth_0 = asm["emscripten_bind_Real_coth_0"];
  asm["emscripten_bind_Real_coth_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_coth_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_acosh_0 = asm["emscripten_bind_Real_acosh_0"];
  asm["emscripten_bind_Real_acosh_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_acosh_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_asinh_0 = asm["emscripten_bind_Real_asinh_0"];
  asm["emscripten_bind_Real_asinh_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_asinh_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_atanh_0 = asm["emscripten_bind_Real_atanh_0"];
  asm["emscripten_bind_Real_atanh_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_atanh_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_asech_0 = asm["emscripten_bind_Real_asech_0"];
  asm["emscripten_bind_Real_asech_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_asech_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_acsch_0 = asm["emscripten_bind_Real_acsch_0"];
  asm["emscripten_bind_Real_acsch_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_acsch_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_acoth_0 = asm["emscripten_bind_Real_acoth_0"];
  asm["emscripten_bind_Real_acoth_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_acoth_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_gamma_0 = asm["emscripten_bind_Real_gamma_0"];
  asm["emscripten_bind_Real_gamma_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_gamma_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_factorial_0 = asm["emscripten_bind_Real_factorial_0"];
  asm["emscripten_bind_Real_factorial_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_factorial_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_ln_gamma_0 = asm["emscripten_bind_Real_ln_gamma_0"];
  asm["emscripten_bind_Real_ln_gamma_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_ln_gamma_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_digamma_0 = asm["emscripten_bind_Real_digamma_0"];
  asm["emscripten_bind_Real_digamma_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_digamma_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_set_pi_0 = asm["emscripten_bind_Real_set_pi_0"];
  asm["emscripten_bind_Real_set_pi_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_set_pi_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_is_nan_0 = asm["emscripten_bind_Real_is_nan_0"];
  asm["emscripten_bind_Real_is_nan_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_is_nan_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_is_inf_0 = asm["emscripten_bind_Real_is_inf_0"];
  asm["emscripten_bind_Real_is_inf_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_is_inf_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_abs_0 = asm["emscripten_bind_Real_abs_0"];
  asm["emscripten_bind_Real_abs_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_abs_0.apply(null, arguments);
  };

  var real__emscripten_bind_Real_equals_1 = asm["emscripten_bind_Real_equals_1"];
  asm["emscripten_bind_Real_equals_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_equals_1.apply(null, arguments);
  };

  var real__emscripten_bind_Real_greater_than_1 = asm["emscripten_bind_Real_greater_than_1"];
  asm["emscripten_bind_Real_greater_than_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_greater_than_1.apply(null, arguments);
  };

  var real__emscripten_bind_Real_greater_equal_than_1 = asm["emscripten_bind_Real_greater_equal_than_1"];
  asm["emscripten_bind_Real_greater_equal_than_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_greater_equal_than_1.apply(null, arguments);
  };

  var real__emscripten_bind_Real_less_than_1 = asm["emscripten_bind_Real_less_than_1"];
  asm["emscripten_bind_Real_less_than_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_less_than_1.apply(null, arguments);
  };

  var real__emscripten_bind_Real_less_equal_than_1 = asm["emscripten_bind_Real_less_equal_than_1"];
  asm["emscripten_bind_Real_less_equal_than_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_less_equal_than_1.apply(null, arguments);
  };

  var real__emscripten_bind_Real_logb_real_1 = asm["emscripten_bind_Real_logb_real_1"];
  asm["emscripten_bind_Real_logb_real_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real_logb_real_1.apply(null, arguments);
  };

  var real__emscripten_bind_Real___destroy___0 = asm["emscripten_bind_Real___destroy___0"];
  asm["emscripten_bind_Real___destroy___0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_Real___destroy___0.apply(null, arguments);
  };

  var real__emscripten_bind_VoidPtr___destroy___0 = asm["emscripten_bind_VoidPtr___destroy___0"];
  asm["emscripten_bind_VoidPtr___destroy___0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__emscripten_bind_VoidPtr___destroy___0.apply(null, arguments);
  };

  var real__malloc = asm["malloc"];
  asm["malloc"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__malloc.apply(null, arguments);
  };

  var real__free = asm["free"];
  asm["free"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__free.apply(null, arguments);
  };

  var real____errno_location = asm["__errno_location"];
  asm["__errno_location"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real____errno_location.apply(null, arguments);
  };

  var real__fflush = asm["fflush"];
  asm["fflush"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__fflush.apply(null, arguments);
  };

  var real__setThrew = asm["setThrew"];
  asm["setThrew"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real__setThrew.apply(null, arguments);
  };

  var real_stackSave = asm["stackSave"];
  asm["stackSave"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real_stackSave.apply(null, arguments);
  };

  var real_stackAlloc = asm["stackAlloc"];
  asm["stackAlloc"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real_stackAlloc.apply(null, arguments);
  };

  var real_stackRestore = asm["stackRestore"];
  asm["stackRestore"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real_stackRestore.apply(null, arguments);
  };

  var real___growWasmMemory = asm["__growWasmMemory"];
  asm["__growWasmMemory"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real___growWasmMemory.apply(null, arguments);
  };

  var real_dynCall_vi = asm["dynCall_vi"];
  asm["dynCall_vi"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real_dynCall_vi.apply(null, arguments);
  };

  var real_dynCall_iii = asm["dynCall_iii"];
  asm["dynCall_iii"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real_dynCall_iii.apply(null, arguments);
  };

  var real_dynCall_ii = asm["dynCall_ii"];
  asm["dynCall_ii"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real_dynCall_ii.apply(null, arguments);
  };

  var real_dynCall_iiiii = asm["dynCall_iiiii"];
  asm["dynCall_iiiii"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real_dynCall_iiiii.apply(null, arguments);
  };

  var real_dynCall_iiii = asm["dynCall_iiii"];
  asm["dynCall_iiii"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real_dynCall_iiii.apply(null, arguments);
  };

  var real_dynCall_vii = asm["dynCall_vii"];
  asm["dynCall_vii"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real_dynCall_vii.apply(null, arguments);
  };

  var real_dynCall_viiiiii = asm["dynCall_viiiiii"];
  asm["dynCall_viiiiii"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real_dynCall_viiiiii.apply(null, arguments);
  };

  var real_dynCall_jiji = asm["dynCall_jiji"];
  asm["dynCall_jiji"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return real_dynCall_jiji.apply(null, arguments);
  };

  Module["asm"] = asm;
  var ___wasm_call_ctors = Module["___wasm_call_ctors"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["__wasm_call_ctors"].apply(null, arguments)
  };

  var _emscripten_bind_Real_Real_1 = Module["_emscripten_bind_Real_Real_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_Real_1"].apply(null, arguments)
  };

  var _emscripten_bind_Real_set_precision_1 = Module["_emscripten_bind_Real_set_precision_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_set_precision_1"].apply(null, arguments)
  };

  var _emscripten_bind_Real_get_precision_0 = Module["_emscripten_bind_Real_get_precision_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_get_precision_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_set_value_from_float_1 = Module["_emscripten_bind_Real_set_value_from_float_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_set_value_from_float_1"].apply(null, arguments)
  };

  var _emscripten_bind_Real_set_value_from_string_1 = Module["_emscripten_bind_Real_set_value_from_string_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_set_value_from_string_1"].apply(null, arguments)
  };

  var _emscripten_bind_Real_get_value_1 = Module["_emscripten_bind_Real_get_value_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_get_value_1"].apply(null, arguments)
  };

  var _emscripten_bind_Real_get_value_no_point_1 = Module["_emscripten_bind_Real_get_value_no_point_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_get_value_no_point_1"].apply(null, arguments)
  };

  var _emscripten_bind_Real_set_value_from_real_1 = Module["_emscripten_bind_Real_set_value_from_real_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_set_value_from_real_1"].apply(null, arguments)
  };

  var _emscripten_bind_Real_set_nan_0 = Module["_emscripten_bind_Real_set_nan_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_set_nan_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_set_inf_1 = Module["_emscripten_bind_Real_set_inf_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_set_inf_1"].apply(null, arguments)
  };

  var _emscripten_bind_Real_set_zero_1 = Module["_emscripten_bind_Real_set_zero_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_set_zero_1"].apply(null, arguments)
  };

  var _emscripten_bind_Real_approximate_as_float_0 = Module["_emscripten_bind_Real_approximate_as_float_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_approximate_as_float_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_add_float_1 = Module["_emscripten_bind_Real_add_float_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_add_float_1"].apply(null, arguments)
  };

  var _emscripten_bind_Real_add_real_1 = Module["_emscripten_bind_Real_add_real_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_add_real_1"].apply(null, arguments)
  };

  var _emscripten_bind_Real_subtract_float_1 = Module["_emscripten_bind_Real_subtract_float_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_subtract_float_1"].apply(null, arguments)
  };

  var _emscripten_bind_Real_subtract_real_1 = Module["_emscripten_bind_Real_subtract_real_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_subtract_real_1"].apply(null, arguments)
  };

  var _emscripten_bind_Real_multiply_float_1 = Module["_emscripten_bind_Real_multiply_float_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_multiply_float_1"].apply(null, arguments)
  };

  var _emscripten_bind_Real_multiply_real_1 = Module["_emscripten_bind_Real_multiply_real_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_multiply_real_1"].apply(null, arguments)
  };

  var _emscripten_bind_Real_square_0 = Module["_emscripten_bind_Real_square_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_square_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_divide_float_1 = Module["_emscripten_bind_Real_divide_float_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_divide_float_1"].apply(null, arguments)
  };

  var _emscripten_bind_Real_divide_real_1 = Module["_emscripten_bind_Real_divide_real_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_divide_real_1"].apply(null, arguments)
  };

  var _emscripten_bind_Real_pow_real_1 = Module["_emscripten_bind_Real_pow_real_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_pow_real_1"].apply(null, arguments)
  };

  var _emscripten_bind_Real_pow_rational_2 = Module["_emscripten_bind_Real_pow_rational_2"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_pow_rational_2"].apply(null, arguments)
  };

  var _emscripten_bind_Real_pow_int_1 = Module["_emscripten_bind_Real_pow_int_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_pow_int_1"].apply(null, arguments)
  };

  var _emscripten_bind_Real_sqrt_0 = Module["_emscripten_bind_Real_sqrt_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_sqrt_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_cbrt_0 = Module["_emscripten_bind_Real_cbrt_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_cbrt_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_rootn_1 = Module["_emscripten_bind_Real_rootn_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_rootn_1"].apply(null, arguments)
  };

  var _emscripten_bind_Real_ln_0 = Module["_emscripten_bind_Real_ln_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_ln_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_log10_0 = Module["_emscripten_bind_Real_log10_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_log10_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_log2_0 = Module["_emscripten_bind_Real_log2_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_log2_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_exp_0 = Module["_emscripten_bind_Real_exp_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_exp_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_exp2_0 = Module["_emscripten_bind_Real_exp2_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_exp2_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_exp10_0 = Module["_emscripten_bind_Real_exp10_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_exp10_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_sin_0 = Module["_emscripten_bind_Real_sin_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_sin_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_cos_0 = Module["_emscripten_bind_Real_cos_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_cos_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_tan_0 = Module["_emscripten_bind_Real_tan_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_tan_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_sec_0 = Module["_emscripten_bind_Real_sec_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_sec_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_csc_0 = Module["_emscripten_bind_Real_csc_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_csc_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_cot_0 = Module["_emscripten_bind_Real_cot_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_cot_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_acos_0 = Module["_emscripten_bind_Real_acos_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_acos_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_asin_0 = Module["_emscripten_bind_Real_asin_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_asin_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_atan_0 = Module["_emscripten_bind_Real_atan_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_atan_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_sinh_0 = Module["_emscripten_bind_Real_sinh_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_sinh_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_cosh_0 = Module["_emscripten_bind_Real_cosh_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_cosh_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_tanh_0 = Module["_emscripten_bind_Real_tanh_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_tanh_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_sech_0 = Module["_emscripten_bind_Real_sech_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_sech_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_csch_0 = Module["_emscripten_bind_Real_csch_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_csch_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_coth_0 = Module["_emscripten_bind_Real_coth_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_coth_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_acosh_0 = Module["_emscripten_bind_Real_acosh_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_acosh_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_asinh_0 = Module["_emscripten_bind_Real_asinh_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_asinh_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_atanh_0 = Module["_emscripten_bind_Real_atanh_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_atanh_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_asech_0 = Module["_emscripten_bind_Real_asech_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_asech_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_acsch_0 = Module["_emscripten_bind_Real_acsch_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_acsch_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_acoth_0 = Module["_emscripten_bind_Real_acoth_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_acoth_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_gamma_0 = Module["_emscripten_bind_Real_gamma_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_gamma_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_factorial_0 = Module["_emscripten_bind_Real_factorial_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_factorial_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_ln_gamma_0 = Module["_emscripten_bind_Real_ln_gamma_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_ln_gamma_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_digamma_0 = Module["_emscripten_bind_Real_digamma_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_digamma_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_set_pi_0 = Module["_emscripten_bind_Real_set_pi_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_set_pi_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_is_nan_0 = Module["_emscripten_bind_Real_is_nan_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_is_nan_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_is_inf_0 = Module["_emscripten_bind_Real_is_inf_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_is_inf_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_abs_0 = Module["_emscripten_bind_Real_abs_0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_abs_0"].apply(null, arguments)
  };

  var _emscripten_bind_Real_equals_1 = Module["_emscripten_bind_Real_equals_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_equals_1"].apply(null, arguments)
  };

  var _emscripten_bind_Real_greater_than_1 = Module["_emscripten_bind_Real_greater_than_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_greater_than_1"].apply(null, arguments)
  };

  var _emscripten_bind_Real_greater_equal_than_1 = Module["_emscripten_bind_Real_greater_equal_than_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_greater_equal_than_1"].apply(null, arguments)
  };

  var _emscripten_bind_Real_less_than_1 = Module["_emscripten_bind_Real_less_than_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_less_than_1"].apply(null, arguments)
  };

  var _emscripten_bind_Real_less_equal_than_1 = Module["_emscripten_bind_Real_less_equal_than_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_less_equal_than_1"].apply(null, arguments)
  };

  var _emscripten_bind_Real_logb_real_1 = Module["_emscripten_bind_Real_logb_real_1"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real_logb_real_1"].apply(null, arguments)
  };

  var _emscripten_bind_Real___destroy___0 = Module["_emscripten_bind_Real___destroy___0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_Real___destroy___0"].apply(null, arguments)
  };

  var _emscripten_bind_VoidPtr___destroy___0 = Module["_emscripten_bind_VoidPtr___destroy___0"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["emscripten_bind_VoidPtr___destroy___0"].apply(null, arguments)
  };

  var _malloc = Module["_malloc"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["malloc"].apply(null, arguments)
  };

  var _free = Module["_free"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["free"].apply(null, arguments)
  };

  var ___errno_location = Module["___errno_location"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["__errno_location"].apply(null, arguments)
  };

  var _fflush = Module["_fflush"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["fflush"].apply(null, arguments)
  };

  var _setThrew = Module["_setThrew"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["setThrew"].apply(null, arguments)
  };

  var stackSave = Module["stackSave"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["stackSave"].apply(null, arguments)
  };

  var stackAlloc = Module["stackAlloc"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["stackAlloc"].apply(null, arguments)
  };

  var stackRestore = Module["stackRestore"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["stackRestore"].apply(null, arguments)
  };

  var __growWasmMemory = Module["__growWasmMemory"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["__growWasmMemory"].apply(null, arguments)
  };

  var dynCall_vi = Module["dynCall_vi"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["dynCall_vi"].apply(null, arguments)
  };

  var dynCall_iii = Module["dynCall_iii"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["dynCall_iii"].apply(null, arguments)
  };

  var dynCall_ii = Module["dynCall_ii"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["dynCall_ii"].apply(null, arguments)
  };

  var dynCall_iiiii = Module["dynCall_iiiii"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["dynCall_iiiii"].apply(null, arguments)
  };

  var dynCall_iiii = Module["dynCall_iiii"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["dynCall_iiii"].apply(null, arguments)
  };

  var dynCall_vii = Module["dynCall_vii"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["dynCall_vii"].apply(null, arguments)
  };

  var dynCall_viiiiii = Module["dynCall_viiiiii"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["dynCall_viiiiii"].apply(null, arguments)
  };

  var dynCall_jiji = Module["dynCall_jiji"] = function() {
    assert$1(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
    assert$1(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
    return Module["asm"]["dynCall_jiji"].apply(null, arguments)
  };




  // === Auto-generated postamble setup entry stuff ===

  Module['asm'] = asm;

  if (!Object.getOwnPropertyDescriptor(Module, "intArrayFromString")) Module["intArrayFromString"] = function() { abort("'intArrayFromString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "intArrayToString")) Module["intArrayToString"] = function() { abort("'intArrayToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  Module["ccall"] = ccall;
  Module["cwrap"] = cwrap;
  if (!Object.getOwnPropertyDescriptor(Module, "setValue")) Module["setValue"] = function() { abort("'setValue' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "getValue")) Module["getValue"] = function() { abort("'getValue' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "allocate")) Module["allocate"] = function() { abort("'allocate' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "getMemory")) Module["getMemory"] = function() { abort("'getMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you"); };
  if (!Object.getOwnPropertyDescriptor(Module, "AsciiToString")) Module["AsciiToString"] = function() { abort("'AsciiToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "stringToAscii")) Module["stringToAscii"] = function() { abort("'stringToAscii' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "UTF8ArrayToString")) Module["UTF8ArrayToString"] = function() { abort("'UTF8ArrayToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "UTF8ToString")) Module["UTF8ToString"] = function() { abort("'UTF8ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "stringToUTF8Array")) Module["stringToUTF8Array"] = function() { abort("'stringToUTF8Array' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "stringToUTF8")) Module["stringToUTF8"] = function() { abort("'stringToUTF8' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "lengthBytesUTF8")) Module["lengthBytesUTF8"] = function() { abort("'lengthBytesUTF8' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "UTF16ToString")) Module["UTF16ToString"] = function() { abort("'UTF16ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "stringToUTF16")) Module["stringToUTF16"] = function() { abort("'stringToUTF16' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "lengthBytesUTF16")) Module["lengthBytesUTF16"] = function() { abort("'lengthBytesUTF16' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "UTF32ToString")) Module["UTF32ToString"] = function() { abort("'UTF32ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "stringToUTF32")) Module["stringToUTF32"] = function() { abort("'stringToUTF32' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "lengthBytesUTF32")) Module["lengthBytesUTF32"] = function() { abort("'lengthBytesUTF32' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "allocateUTF8")) Module["allocateUTF8"] = function() { abort("'allocateUTF8' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "stackTrace")) Module["stackTrace"] = function() { abort("'stackTrace' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "addOnPreRun")) Module["addOnPreRun"] = function() { abort("'addOnPreRun' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "addOnInit")) Module["addOnInit"] = function() { abort("'addOnInit' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "addOnPreMain")) Module["addOnPreMain"] = function() { abort("'addOnPreMain' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "addOnExit")) Module["addOnExit"] = function() { abort("'addOnExit' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "addOnPostRun")) Module["addOnPostRun"] = function() { abort("'addOnPostRun' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "writeStringToMemory")) Module["writeStringToMemory"] = function() { abort("'writeStringToMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "writeArrayToMemory")) Module["writeArrayToMemory"] = function() { abort("'writeArrayToMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "writeAsciiToMemory")) Module["writeAsciiToMemory"] = function() { abort("'writeAsciiToMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "addRunDependency")) Module["addRunDependency"] = function() { abort("'addRunDependency' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you"); };
  if (!Object.getOwnPropertyDescriptor(Module, "removeRunDependency")) Module["removeRunDependency"] = function() { abort("'removeRunDependency' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you"); };
  if (!Object.getOwnPropertyDescriptor(Module, "ENV")) Module["ENV"] = function() { abort("'ENV' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "FS")) Module["FS"] = function() { abort("'FS' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "FS_createFolder")) Module["FS_createFolder"] = function() { abort("'FS_createFolder' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you"); };
  if (!Object.getOwnPropertyDescriptor(Module, "FS_createPath")) Module["FS_createPath"] = function() { abort("'FS_createPath' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you"); };
  if (!Object.getOwnPropertyDescriptor(Module, "FS_createDataFile")) Module["FS_createDataFile"] = function() { abort("'FS_createDataFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you"); };
  if (!Object.getOwnPropertyDescriptor(Module, "FS_createPreloadedFile")) Module["FS_createPreloadedFile"] = function() { abort("'FS_createPreloadedFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you"); };
  if (!Object.getOwnPropertyDescriptor(Module, "FS_createLazyFile")) Module["FS_createLazyFile"] = function() { abort("'FS_createLazyFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you"); };
  if (!Object.getOwnPropertyDescriptor(Module, "FS_createLink")) Module["FS_createLink"] = function() { abort("'FS_createLink' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you"); };
  if (!Object.getOwnPropertyDescriptor(Module, "FS_createDevice")) Module["FS_createDevice"] = function() { abort("'FS_createDevice' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you"); };
  if (!Object.getOwnPropertyDescriptor(Module, "FS_unlink")) Module["FS_unlink"] = function() { abort("'FS_unlink' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you"); };
  if (!Object.getOwnPropertyDescriptor(Module, "GL")) Module["GL"] = function() { abort("'GL' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "dynamicAlloc")) Module["dynamicAlloc"] = function() { abort("'dynamicAlloc' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "loadDynamicLibrary")) Module["loadDynamicLibrary"] = function() { abort("'loadDynamicLibrary' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "loadWebAssemblyModule")) Module["loadWebAssemblyModule"] = function() { abort("'loadWebAssemblyModule' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "getLEB")) Module["getLEB"] = function() { abort("'getLEB' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "getFunctionTables")) Module["getFunctionTables"] = function() { abort("'getFunctionTables' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "alignFunctionTables")) Module["alignFunctionTables"] = function() { abort("'alignFunctionTables' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "registerFunctions")) Module["registerFunctions"] = function() { abort("'registerFunctions' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "addFunction")) Module["addFunction"] = function() { abort("'addFunction' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "removeFunction")) Module["removeFunction"] = function() { abort("'removeFunction' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "getFuncWrapper")) Module["getFuncWrapper"] = function() { abort("'getFuncWrapper' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "prettyPrint")) Module["prettyPrint"] = function() { abort("'prettyPrint' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "makeBigInt")) Module["makeBigInt"] = function() { abort("'makeBigInt' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "dynCall")) Module["dynCall"] = function() { abort("'dynCall' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "getCompilerSetting")) Module["getCompilerSetting"] = function() { abort("'getCompilerSetting' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "stackSave")) Module["stackSave"] = function() { abort("'stackSave' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "stackRestore")) Module["stackRestore"] = function() { abort("'stackRestore' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "stackAlloc")) Module["stackAlloc"] = function() { abort("'stackAlloc' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "establishStackSpace")) Module["establishStackSpace"] = function() { abort("'establishStackSpace' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "print")) Module["print"] = function() { abort("'print' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "printErr")) Module["printErr"] = function() { abort("'printErr' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "getTempRet0")) Module["getTempRet0"] = function() { abort("'getTempRet0' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "setTempRet0")) Module["setTempRet0"] = function() { abort("'setTempRet0' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "callMain")) Module["callMain"] = function() { abort("'callMain' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "abort")) Module["abort"] = function() { abort("'abort' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "Pointer_stringify")) Module["Pointer_stringify"] = function() { abort("'Pointer_stringify' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  if (!Object.getOwnPropertyDescriptor(Module, "warnOnce")) Module["warnOnce"] = function() { abort("'warnOnce' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); };
  Module["writeStackCookie"] = writeStackCookie;
  Module["checkStackCookie"] = checkStackCookie;
  Module["abortStackOverflow"] = abortStackOverflow;if (!Object.getOwnPropertyDescriptor(Module, "ALLOC_NORMAL")) Object.defineProperty(Module, "ALLOC_NORMAL", { configurable: true, get: function() { abort("'ALLOC_NORMAL' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); } });
  if (!Object.getOwnPropertyDescriptor(Module, "ALLOC_STACK")) Object.defineProperty(Module, "ALLOC_STACK", { configurable: true, get: function() { abort("'ALLOC_STACK' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); } });
  if (!Object.getOwnPropertyDescriptor(Module, "ALLOC_DYNAMIC")) Object.defineProperty(Module, "ALLOC_DYNAMIC", { configurable: true, get: function() { abort("'ALLOC_DYNAMIC' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); } });
  if (!Object.getOwnPropertyDescriptor(Module, "ALLOC_NONE")) Object.defineProperty(Module, "ALLOC_NONE", { configurable: true, get: function() { abort("'ALLOC_NONE' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)"); } });
  if (!Object.getOwnPropertyDescriptor(Module, "calledRun")) Object.defineProperty(Module, "calledRun", { configurable: true, get: function() { abort("'calledRun' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you"); } });



  var calledRun;


  /**
   * @constructor
   * @this {ExitStatus}
   */
  function ExitStatus(status) {
    this.name = "ExitStatus";
    this.message = "Program terminated with exit(" + status + ")";
    this.status = status;
  }


  dependenciesFulfilled = function runCaller() {
    // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
    if (!calledRun) run();
    if (!calledRun) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
  };





  /** @type {function(Array=)} */
  function run(args) {

    if (runDependencies > 0) {
      return;
    }

    writeStackCookie();

    preRun();

    if (runDependencies > 0) return; // a preRun added a dependency, run will be called later

    function doRun() {
      // run may have just been called through dependencies being fulfilled just in this very frame,
      // or while the async setStatus time below was happening
      if (calledRun) return;
      calledRun = true;

      if (ABORT) return;

      initRuntime();

      preMain();

      if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

      assert$1(!Module['_main'], 'compiled without a main, but one is present. if you added it from JS, use Module["onRuntimeInitialized"]');

      postRun();
    }

    if (Module['setStatus']) {
      Module['setStatus']('Running...');
      setTimeout(function() {
        setTimeout(function() {
          Module['setStatus']('');
        }, 1);
        doRun();
      }, 1);
    } else
    {
      doRun();
    }
    checkStackCookie();
  }
  Module['run'] = run;

  if (Module['preInit']) {
    if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
    while (Module['preInit'].length > 0) {
      Module['preInit'].pop()();
    }
  }

  run();





  // {{MODULE_ADDITIONS}}




  // Bindings utilities

  function WrapperObject() {
  }
  WrapperObject.prototype = Object.create(WrapperObject.prototype);
  WrapperObject.prototype.constructor = WrapperObject;
  WrapperObject.prototype.__class__ = WrapperObject;
  WrapperObject.__cache__ = {};
  Module['WrapperObject'] = WrapperObject;

  function getCache(__class__) {
    return (__class__ || WrapperObject).__cache__;
  }
  Module['getCache'] = getCache;

  function wrapPointer(ptr, __class__) {
    var cache = getCache(__class__);
    var ret = cache[ptr];
    if (ret) return ret;
    ret = Object.create((__class__ || WrapperObject).prototype);
    ret.ptr = ptr;
    return cache[ptr] = ret;
  }
  Module['wrapPointer'] = wrapPointer;

  function castObject(obj, __class__) {
    return wrapPointer(obj.ptr, __class__);
  }
  Module['castObject'] = castObject;

  Module['NULL'] = wrapPointer(0);

  function destroy(obj) {
    if (!obj['__destroy__']) throw 'Error: Cannot destroy object. (Did you create it yourself?)';
    obj['__destroy__']();
    // Remove from cache, so the object can be GC'd and refs added onto it released
    delete getCache(obj.__class__)[obj.ptr];
  }
  Module['destroy'] = destroy;

  function compare(obj1, obj2) {
    return obj1.ptr === obj2.ptr;
  }
  Module['compare'] = compare;

  function getPointer(obj) {
    return obj.ptr;
  }
  Module['getPointer'] = getPointer;

  function getClass(obj) {
    return obj.__class__;
  }
  Module['getClass'] = getClass;

  // Converts big (string or array) values into a C-style storage, in temporary space

  var ensureCache = {
    buffer: 0,  // the main buffer of temporary storage
    size: 0,   // the size of buffer
    pos: 0,    // the next free offset in buffer
    temps: [], // extra allocations
    needed: 0, // the total size we need next time

    prepare: function() {
      if (ensureCache.needed) {
        // clear the temps
        for (var i = 0; i < ensureCache.temps.length; i++) {
          Module['_free'](ensureCache.temps[i]);
        }
        ensureCache.temps.length = 0;
        // prepare to allocate a bigger buffer
        Module['_free'](ensureCache.buffer);
        ensureCache.buffer = 0;
        ensureCache.size += ensureCache.needed;
        // clean up
        ensureCache.needed = 0;
      }
      if (!ensureCache.buffer) { // happens first time, or when we need to grow
        ensureCache.size += 128; // heuristic, avoid many small grow events
        ensureCache.buffer = Module['_malloc'](ensureCache.size);
        assert$1(ensureCache.buffer);
      }
      ensureCache.pos = 0;
    },
    alloc: function(array, view) {
      assert$1(ensureCache.buffer);
      var bytes = view.BYTES_PER_ELEMENT;
      var len = array.length * bytes;
      len = (len + 7) & -8; // keep things aligned to 8 byte boundaries
      var ret;
      if (ensureCache.pos + len >= ensureCache.size) {
        // we failed to allocate in the buffer, ensureCache time around :(
        assert$1(len > 0); // null terminator, at least
        ensureCache.needed += len;
        ret = Module['_malloc'](len);
        ensureCache.temps.push(ret);
      } else {
        // we can allocate in the buffer
        ret = ensureCache.buffer + ensureCache.pos;
        ensureCache.pos += len;
      }
      return ret;
    },
    copy: function(array, view, offset) {
      var offsetShifted = offset;
      var bytes = view.BYTES_PER_ELEMENT;
      switch (bytes) {
        case 2: offsetShifted >>= 1; break;
        case 4: offsetShifted >>= 2; break;
        case 8: offsetShifted >>= 3; break;
      }
      for (var i = 0; i < array.length; i++) {
        view[offsetShifted + i] = array[i];
      }
    },
  };

  function ensureString(value) {
    if (typeof value === 'string') {
      var intArray = intArrayFromString(value);
      var offset = ensureCache.alloc(intArray, HEAP8);
      ensureCache.copy(intArray, HEAP8, offset);
      return offset;
    }
    return value;
  }


  // Real
  /** @suppress {undefinedVars, duplicate} */function Real(precision) {
    if (precision && typeof precision === 'object') precision = precision.ptr;
    this.ptr = _emscripten_bind_Real_Real_1(precision);
    getCache(Real)[this.ptr] = this;
  }Real.prototype = Object.create(WrapperObject.prototype);
  Real.prototype.constructor = Real;
  Real.prototype.__class__ = Real;
  Real.__cache__ = {};
  Module['Real'] = Real;

  Real.prototype['set_precision'] = Real.prototype.set_precision = /** @suppress {undefinedVars, duplicate} */function(precision) {
    var self = this.ptr;
    if (precision && typeof precision === 'object') precision = precision.ptr;
    _emscripten_bind_Real_set_precision_1(self, precision);
  };
  Real.prototype['get_precision'] = Real.prototype.get_precision = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    return _emscripten_bind_Real_get_precision_0(self);
  };
  Real.prototype['set_value_from_float'] = Real.prototype.set_value_from_float = /** @suppress {undefinedVars, duplicate} */function(value) {
    var self = this.ptr;
    if (value && typeof value === 'object') value = value.ptr;
    _emscripten_bind_Real_set_value_from_float_1(self, value);
  };
  Real.prototype['set_value_from_string'] = Real.prototype.set_value_from_string = /** @suppress {undefinedVars, duplicate} */function(value) {
    var self = this.ptr;
    ensureCache.prepare();
    if (value && typeof value === 'object') value = value.ptr;
    else value = ensureString(value);
    _emscripten_bind_Real_set_value_from_string_1(self, value);
  };
  Real.prototype['get_value'] = Real.prototype.get_value = /** @suppress {undefinedVars, duplicate} */function(precision) {
    var self = this.ptr;
    if (precision && typeof precision === 'object') precision = precision.ptr;
    return UTF8ToString(_emscripten_bind_Real_get_value_1(self, precision));
  };
  Real.prototype['get_value_no_point'] = Real.prototype.get_value_no_point = /** @suppress {undefinedVars, duplicate} */function(precision) {
    var self = this.ptr;
    if (precision && typeof precision === 'object') precision = precision.ptr;
    return UTF8ToString(_emscripten_bind_Real_get_value_no_point_1(self, precision));
  };
  Real.prototype['set_value_from_real'] = Real.prototype.set_value_from_real = /** @suppress {undefinedVars, duplicate} */function(r) {
    var self = this.ptr;
    if (r && typeof r === 'object') r = r.ptr;
    _emscripten_bind_Real_set_value_from_real_1(self, r);
  };
  Real.prototype['set_nan'] = Real.prototype.set_nan = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_set_nan_0(self);
  };
  Real.prototype['set_inf'] = Real.prototype.set_inf = /** @suppress {undefinedVars, duplicate} */function(sign) {
    var self = this.ptr;
    if (sign && typeof sign === 'object') sign = sign.ptr;
    _emscripten_bind_Real_set_inf_1(self, sign);
  };
  Real.prototype['set_zero'] = Real.prototype.set_zero = /** @suppress {undefinedVars, duplicate} */function(sign) {
    var self = this.ptr;
    if (sign && typeof sign === 'object') sign = sign.ptr;
    _emscripten_bind_Real_set_zero_1(self, sign);
  };
  Real.prototype['approximate_as_float'] = Real.prototype.approximate_as_float = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    return _emscripten_bind_Real_approximate_as_float_0(self);
  };
  Real.prototype['add_float'] = Real.prototype.add_float = /** @suppress {undefinedVars, duplicate} */function(value) {
    var self = this.ptr;
    if (value && typeof value === 'object') value = value.ptr;
    _emscripten_bind_Real_add_float_1(self, value);
  };
  Real.prototype['add_real'] = Real.prototype.add_real = /** @suppress {undefinedVars, duplicate} */function(r) {
    var self = this.ptr;
    if (r && typeof r === 'object') r = r.ptr;
    _emscripten_bind_Real_add_real_1(self, r);
  };
  Real.prototype['subtract_float'] = Real.prototype.subtract_float = /** @suppress {undefinedVars, duplicate} */function(value) {
    var self = this.ptr;
    if (value && typeof value === 'object') value = value.ptr;
    _emscripten_bind_Real_subtract_float_1(self, value);
  };
  Real.prototype['subtract_real'] = Real.prototype.subtract_real = /** @suppress {undefinedVars, duplicate} */function(r) {
    var self = this.ptr;
    if (r && typeof r === 'object') r = r.ptr;
    _emscripten_bind_Real_subtract_real_1(self, r);
  };
  Real.prototype['multiply_float'] = Real.prototype.multiply_float = /** @suppress {undefinedVars, duplicate} */function(value) {
    var self = this.ptr;
    if (value && typeof value === 'object') value = value.ptr;
    _emscripten_bind_Real_multiply_float_1(self, value);
  };
  Real.prototype['multiply_real'] = Real.prototype.multiply_real = /** @suppress {undefinedVars, duplicate} */function(r) {
    var self = this.ptr;
    if (r && typeof r === 'object') r = r.ptr;
    _emscripten_bind_Real_multiply_real_1(self, r);
  };
  Real.prototype['square'] = Real.prototype.square = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_square_0(self);
  };
  Real.prototype['divide_float'] = Real.prototype.divide_float = /** @suppress {undefinedVars, duplicate} */function(value) {
    var self = this.ptr;
    if (value && typeof value === 'object') value = value.ptr;
    _emscripten_bind_Real_divide_float_1(self, value);
  };
  Real.prototype['divide_real'] = Real.prototype.divide_real = /** @suppress {undefinedVars, duplicate} */function(r) {
    var self = this.ptr;
    if (r && typeof r === 'object') r = r.ptr;
    _emscripten_bind_Real_divide_real_1(self, r);
  };
  Real.prototype['pow_real'] = Real.prototype.pow_real = /** @suppress {undefinedVars, duplicate} */function(r) {
    var self = this.ptr;
    if (r && typeof r === 'object') r = r.ptr;
    _emscripten_bind_Real_pow_real_1(self, r);
  };
  Real.prototype['pow_rational'] = Real.prototype.pow_rational = /** @suppress {undefinedVars, duplicate} */function(p, q) {
    var self = this.ptr;
    if (p && typeof p === 'object') p = p.ptr;
    if (q && typeof q === 'object') q = q.ptr;
    _emscripten_bind_Real_pow_rational_2(self, p, q);
  };
  Real.prototype['pow_int'] = Real.prototype.pow_int = /** @suppress {undefinedVars, duplicate} */function(p) {
    var self = this.ptr;
    if (p && typeof p === 'object') p = p.ptr;
    _emscripten_bind_Real_pow_int_1(self, p);
  };
  Real.prototype['sqrt'] = Real.prototype.sqrt = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_sqrt_0(self);
  };
  Real.prototype['cbrt'] = Real.prototype.cbrt = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_cbrt_0(self);
  };
  Real.prototype['rootn'] = Real.prototype.rootn = /** @suppress {undefinedVars, duplicate} */function(n) {
    var self = this.ptr;
    if (n && typeof n === 'object') n = n.ptr;
    _emscripten_bind_Real_rootn_1(self, n);
  };
  Real.prototype['ln'] = Real.prototype.ln = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_ln_0(self);
  };
  Real.prototype['log10'] = Real.prototype.log10 = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_log10_0(self);
  };
  Real.prototype['log2'] = Real.prototype.log2 = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_log2_0(self);
  };
  Real.prototype['exp'] = Real.prototype.exp = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_exp_0(self);
  };
  Real.prototype['exp2'] = Real.prototype.exp2 = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_exp2_0(self);
  };
  Real.prototype['exp10'] = Real.prototype.exp10 = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_exp10_0(self);
  };
  Real.prototype['sin'] = Real.prototype.sin = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_sin_0(self);
  };
  Real.prototype['cos'] = Real.prototype.cos = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_cos_0(self);
  };
  Real.prototype['tan'] = Real.prototype.tan = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_tan_0(self);
  };
  Real.prototype['sec'] = Real.prototype.sec = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_sec_0(self);
  };
  Real.prototype['csc'] = Real.prototype.csc = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_csc_0(self);
  };
  Real.prototype['cot'] = Real.prototype.cot = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_cot_0(self);
  };
  Real.prototype['acos'] = Real.prototype.acos = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_acos_0(self);
  };
  Real.prototype['asin'] = Real.prototype.asin = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_asin_0(self);
  };
  Real.prototype['atan'] = Real.prototype.atan = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_atan_0(self);
  };
  Real.prototype['sinh'] = Real.prototype.sinh = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_sinh_0(self);
  };
  Real.prototype['cosh'] = Real.prototype.cosh = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_cosh_0(self);
  };
  Real.prototype['tanh'] = Real.prototype.tanh = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_tanh_0(self);
  };
  Real.prototype['sech'] = Real.prototype.sech = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_sech_0(self);
  };
  Real.prototype['csch'] = Real.prototype.csch = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_csch_0(self);
  };
  Real.prototype['coth'] = Real.prototype.coth = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_coth_0(self);
  };
  Real.prototype['acosh'] = Real.prototype.acosh = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_acosh_0(self);
  };
  Real.prototype['asinh'] = Real.prototype.asinh = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_asinh_0(self);
  };
  Real.prototype['atanh'] = Real.prototype.atanh = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_atanh_0(self);
  };
  Real.prototype['asech'] = Real.prototype.asech = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_asech_0(self);
  };
  Real.prototype['acsch'] = Real.prototype.acsch = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_acsch_0(self);
  };
  Real.prototype['acoth'] = Real.prototype.acoth = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_acoth_0(self);
  };
  Real.prototype['gamma'] = Real.prototype.gamma = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_gamma_0(self);
  };
  Real.prototype['factorial'] = Real.prototype.factorial = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_factorial_0(self);
  };
  Real.prototype['ln_gamma'] = Real.prototype.ln_gamma = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_ln_gamma_0(self);
  };
  Real.prototype['digamma'] = Real.prototype.digamma = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_digamma_0(self);
  };
  Real.prototype['set_pi'] = Real.prototype.set_pi = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_set_pi_0(self);
  };
  Real.prototype['is_nan'] = Real.prototype.is_nan = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    return _emscripten_bind_Real_is_nan_0(self);
  };
  Real.prototype['is_inf'] = Real.prototype.is_inf = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    return _emscripten_bind_Real_is_inf_0(self);
  };
  Real.prototype['abs'] = Real.prototype.abs = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real_abs_0(self);
  };
  Real.prototype['equals'] = Real.prototype.equals = /** @suppress {undefinedVars, duplicate} */function(r) {
    var self = this.ptr;
    if (r && typeof r === 'object') r = r.ptr;
    return !!(_emscripten_bind_Real_equals_1(self, r));
  };
  Real.prototype['greater_than'] = Real.prototype.greater_than = /** @suppress {undefinedVars, duplicate} */function(r) {
    var self = this.ptr;
    if (r && typeof r === 'object') r = r.ptr;
    return !!(_emscripten_bind_Real_greater_than_1(self, r));
  };
  Real.prototype['greater_equal_than'] = Real.prototype.greater_equal_than = /** @suppress {undefinedVars, duplicate} */function(r) {
    var self = this.ptr;
    if (r && typeof r === 'object') r = r.ptr;
    return !!(_emscripten_bind_Real_greater_equal_than_1(self, r));
  };
  Real.prototype['less_than'] = Real.prototype.less_than = /** @suppress {undefinedVars, duplicate} */function(r) {
    var self = this.ptr;
    if (r && typeof r === 'object') r = r.ptr;
    return !!(_emscripten_bind_Real_less_than_1(self, r));
  };
  Real.prototype['less_equal_than'] = Real.prototype.less_equal_than = /** @suppress {undefinedVars, duplicate} */function(r) {
    var self = this.ptr;
    if (r && typeof r === 'object') r = r.ptr;
    return !!(_emscripten_bind_Real_less_equal_than_1(self, r));
  };
  Real.prototype['logb_real'] = Real.prototype.logb_real = /** @suppress {undefinedVars, duplicate} */function(r) {
    var self = this.ptr;
    if (r && typeof r === 'object') r = r.ptr;
    _emscripten_bind_Real_logb_real_1(self, r);
  };
    Real.prototype['__destroy__'] = Real.prototype.__destroy__ = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_Real___destroy___0(self);
  };
  // VoidPtr
  /** @suppress {undefinedVars, duplicate} */function VoidPtr() { throw "cannot construct a VoidPtr, no constructor in IDL" }
  VoidPtr.prototype = Object.create(WrapperObject.prototype);
  VoidPtr.prototype.constructor = VoidPtr;
  VoidPtr.prototype.__class__ = VoidPtr;
  VoidPtr.__cache__ = {};
  Module['VoidPtr'] = VoidPtr;

    VoidPtr.prototype['__destroy__'] = VoidPtr.prototype.__destroy__ = /** @suppress {undefinedVars, duplicate} */function() {
    var self = this.ptr;
    _emscripten_bind_VoidPtr___destroy___0(self);
  };
  (function() {
    function setupEnums() {
      
    }
    if (runtimeInitialized) ;
    else addOnPreMain(setupEnums);
  })();

  const Real$1 = Module.Real;

  class OvinusReal extends Real$1 {
    constructor(value="0", precision=53) {
      super(precision);

      this.set_value(value);
    }

    get value() {
      return this.get_value();
    }

    set value(v) {
      this.set_value(v);
    }

    set_value(v) {
      if (typeof v === "string") {
        this.set_value_from_string(v);
      } else if (v instanceof Real$1) {
        this.set_value_from_real(v);
      } else {
        this.set_value_from_float(v);
      }
    }
  }

  function cchain$1(val1, compare, val2, ...args) {
    if (!val2) {
      return false
    }

    switch (compare) {
      case '<':
        if (!val1.less_than(val2))
          return false
        break
      case '>':
        if (!val1.greater_than(val2))
          return false
        break
      case '<=':
        if (!val1.less_equal_than(val2))
          return false
        break
      case '>=':
        if (!val1.greater_equal_than(val2))
          return false
        break
      case '==':
        if (!val1.equals(val2))
          return false
        break
      case '!=':
        if (val1.equals(val2))
          return false
        break
    }

    if (args.length > 0)
      return cchain$1(val2, ...args)

    return true
  }

  function piecewise$1(cond, val, ...args) {
    if (!val) {
      return cond
    }

    if (cond) {
      return val
    }

    if (args.length === 0) {
      // This is a fail
      return val
    } else {
      return piecewise$1(...args)
    }
  }

  const PRECISE_REAL_FUNCTIONS = {
    '*': (r1, r2) => {
      r1.multiply_real(r2);
      return r1
    },
    '+': (r1, r2) => {
      r1.add_real(r2);
      return r1
    },
    '-': (r1, r2) => {
      r1.subtract_real(r2);
      return r1
    },
    '/': (r1, r2) => {
      r1.divide_real(r2);
      return r1
    },
    '^': (r1, r2) => {
      r1.pow_real(r2);
      return r1
    },
    '<': (r1, r2) => {
      return r1.less_than(r2)
    },
    '>': (r1, r2) => {
      return r1.greater_than(r2)
    },
    '<=': (r1, r2) => {
      return r1.less_equal_than(r2)
    },
    '>=': (r1, r2) => {
      return r1.greater_equal_than(r2)
    },
    '==': (r1, r2) => {
      return r1.equals(r2)
    },
    '!=': (r1, r2) => {
      return !(r1.equals(r2))
    },
    'sin': (r1) => {
      r1.sin();
      return r1
    },
    'cos': (r1) => {
      r1.cos();
      return r1
    },
    'tan': (r1) => {
      r1.tan();
      return r1
    },
    'sinh': (r1) => {
      r1.sinh();
      return r1
    },
    'cosh': (r1) => {
      r1.cosh();
      return r1
    },
    'tanh': (r1) => {
      r1.tanh();
      return r1
    },
    'asin': (r1) => {
      r1.asin();
      return r1
    },
    'acos': (r1) => {
      r1.acos();
      return r1
    },
    'atan': (r1) => {
      r1.atan();
      return r1
    },
    'asinh': (r1) => {
      r1.asinh();
      return r1
    },
    'acosh': (r1) => {
      r1.acosh();
      return r1
    },
    'atanh': (r1) => {
      r1.atanh();
      return r1
    },
    'csc': (r1) => {
      r1.csc();
      return r1
    },
    'sec': (r1) => {
      r1.sec();
      return r1
    },
    'cot': (r1) => {
      r1.cot();
      return r1
    },
    'csch': (r1) => {
      r1.csch();
      return r1
    },
    'sech': (r1) => {
      r1.sech();
      return r1
    },
    'coth': (r1) => {
      r1.coth();
      return r1
    },
    'acsc': (r1) => {
      r1.acsc();
      return r1
    },
    'asec': (r1) => {
      r1.asec();
      return r1
    },
    'acot': (r1) => {
      r1.acot();
      return r1
    },
    'acsch': (r1) => {
      r1.acsch();
      return r1
    },
    'asech': (r1) => {
      r1.asech();
      return r1
    },
    'acoth': (r1) => {
      r1.acoth();
      return r1
    },
    'abs': (r1) => {
      r1.abs();
      return r1
    },
    'sqrt': (r1) => {
      r1.sqrt();
      return r1
    },
    'cbrt': (r1) => {
      r1.cbrt();
      return r1
    },
    'pow_rational': (r1, p, q) => {
      r1.pow_rational(p, q);
      return r1
    },
    'ln': (r1) => {
      r1.ln();
      return r1
    },
    'log10': (r1) => {
      r1.log10();
      return r1
    },
    'log2': (r1) => {
      r1.log2();
      return r1
    },
    'logb': (b, r1) => {
      r1.logb_real(b);
      return r1
    },
    'gamma': (r1) => {
      r1.gamma();
      return r1
    },
    'ln_gamma': (r1) => {
      r1.ln_gamma();
      return r1
    },
    'factorial': (r1) => {
      r1.factorial();
      return r1
    },
    'digamma': (r1) => {
      r1.digamma();
      return r1
    },
    'cchain': cchain$1,
    'ifelse': function (val1, cond, val2) {
      if (cond) {
        return val1
      } else {
        return val2
      }
    },
    'piecewise': piecewise$1
  };

  const APPROXIMATE_REAL_FUNCTIONS = {
    "polygamma": (m, r1) => {
      let f = r1.approximate_as_float();

      r1.set_value(polygamma(m, f));

      return r1
    },
    "trigamma": (r1) => {
      let f = r1.approximate_as_float();

      r1.set_value(trigamma(f));

      return r1
    }
  };

  const REAL_FUNCTIONS = {...PRECISE_REAL_FUNCTIONS, ...APPROXIMATE_REAL_FUNCTIONS};

  // An interval is defined as a series of six values, namely two floating point values, two booleans for domain tracking, and two booleans for continuity tracking.
  // See more information at this (very readable) paper by Jeff Tupper:


  class Interval {
    constructor(min, max, defMin=true, defMax=true, contMin=true, contMax=true) {
      this.min = min;
      this.max = max;
      this.defMin = defMin;
      this.defMax = defMax;
      this.contMin = contMin;
      this.contMax = contMax;
    }

    isExact() {
      return this.min === this.max
    }

    isSet() {
      return false
    }

    prettyPrint() {
      return `(${this.min}, ${this.max}), <${this.defMin}, ${this.defMax}>, <${this.contMin}, ${this.contMax}>`
    }

    clone() {
      return new Interval(this.min, this.max, this.defMin, this.defMax, this.contMin, this.contMax)
    }

    contains(x) {
      return this.min <= x && x <= this.max
    }

    containsNeighborhoodOf(x) {
      return this.min < x && x < this.max
    }

    intersects(i) {
      if (i.isSet()) {
        return getIntervals(i).some(interval => this.intersects(interval))
      } else {
        return (i.contains(this.min) || i.contains(this.max) || this.contains(i.min))
      }
    }
  }

  class IntervalSet {
    constructor(intervals=[]) {
      this.intervals = intervals;
    }

    get min() {
      return Math.min.apply(null, this.intervals.map(interval => interval.min))
    }

    get max() {
      return Math.max.apply(null, this.intervals.map(interval => interval.max))
    }

    get defMin() {
      return !!Math.min.apply(null, this.intervals.map(interval => interval.defMin))
    }

    get defMax() {
      return !!Math.max.apply(null, this.intervals.map(interval => interval.defMax))
    }

    get contMin() {
      return !!Math.min.apply(null, this.intervals.map(interval => interval.contMin))
    }

    get contMax() {
      return !!Math.max.apply(null, this.intervals.map(interval => interval.contMax))
    }

    mergeIntervals() {

    }

    isSet() {
      return true
    }

    isExact() {
      return this.min === this.max
    }

    contains(x) {
      return this.intervals.some(i => i.contains(x))
    }

    containsNeighborhoodOf(x) {
      return this.intervals.some(i => i.containsNeighborhoodOf(x))
    }

    intersects(i) {
      return this.intervals.some(interval => interval.intersects(i))
    }
  }

  function getIntervals(i) {
    if (i.isSet()) {
      return i.intervals
    } else {
      return [i]
    }
  }

  function ADD(i1, i2) {
    let isSet1 = i1.isSet();
    let isSet2 = i2.isSet();

    if (isSet1 || isSet2) {
      let left = getIntervals(i1);
      let right = getIntervals(i2);

      let intervals = [];

      left.forEach(i => {
        right.forEach(j => {
          intervals.push(ADD(i, j));
        });
      });

      return new IntervalSet(intervals)
    } else {
      return new Interval(i1.min + i2.min, i1.max + i2.max,
        i1.defMin && i2.defMin, i1.defMax && i2.defMax,
        i1.contMin && i2.contMin, i1.contMax && i2.contMax)
    }
  }

  function MULTIPLY(i1, i2) {
    let isSet1 = i1.isSet();
    let isSet2 = i2.isSet();

    if (isSet1 || isSet2) {
      let left = getIntervals(i1);
      let right = getIntervals(i2);

      let intervals = [];

      left.forEach(i => {
        right.forEach(j => {
          intervals.push(MULTIPLY(i, j));
        });
      });

      return new IntervalSet(intervals)
    } else {
      let prod1 = i1.min * i2.min;
      let prod2 = i1.min * i2.max;
      let prod3 = i1.max * i2.min;
      let prod4 = i1.max * i2.max;

      return new Interval(Math.min(prod1, prod2, prod3, prod4),
        Math.max(prod1, prod2, prod3, prod4),
        i1.defMin && i2.defMin, i1.defMax && i2.defMax,
        i1.contMin && i2.contMin, i1.contMax && i2.contMax)
    }
  }

  function SUBTRACT(i1, i2) {
    let isSet1 = i1.isSet();
    let isSet2 = i2.isSet();

    if (isSet1 || isSet2) {
      let left = getIntervals(i1);
      let right = getIntervals(i2);

      let intervals = [];

      left.forEach(i => {
        right.forEach(j => {
          intervals.push(SUBTRACT(i, j));
        });
      });

      return new IntervalSet(intervals)
    } else {
      return new Interval(i1.min - i2.max, i1.max - i2.min,
        i1.defMin && i2.defMin, i1.defMax && i2.defMax,
        i1.contMin && i2.contMin, i1.contMax && i2.contMax)
    }
  }

  function DIVIDE(i1, i2) {
    let isSet1 = i1.isSet();
    let isSet2 = i2.isSet();

    if (isSet1 || isSet2) {
      let left = getIntervals(i1);
      let right = getIntervals(i2);

      let intervals = [];

      left.forEach(i => {
        right.forEach(j => {
          getIntervals(DIVIDE(i, j)).forEach(k => intervals.push(k));
        });
      });

      return new IntervalSet(intervals)
    } else {
      return MULTIPLY(i1, RECIPROCAL(i2))
    }
  }

  function RECIPROCAL(i1) {
    let isSet = i1.isSet();

    if (isSet) {
      let intervals = [];

      i1.intervals.forEach(interval => getIntervals(RECIPROCAL(interval)).forEach(i => intervals.push(i)));

      return new IntervalSet(intervals)
    } else {
      let min = i1.min;
      let max = i1.max;

      let defMin = i1.defMin, defMax = i1.defMax, contMin = i1.contMin, contMax = i1.contMax;

      if (0 < min || max < 0) {
        return new Interval(1 / max, max, defMin, defMax, contMin, contMax)
      } else if (max === 0) {
        return new Interval(-Infinity, 1 / min, defMin, defMax, contMin, contMax)
      } else if (min === 0) {
        return new Interval(1 / max, Infinity, defMin, defMax, contMin, contMax)
      } else {
        // 0 contained in the interval

        let interval1 = new Interval(-Infinity, 1 / min, defMin, defMax, contMin, contMax);
        let interval2 = new Interval(1 / max, Infinity, defMin, defMax, contMin, contMax);

        return new IntervalSet([interval1, interval2])
      }
    }
  }

  function int_pow(b, n) {
    let prod = 1;
    for (let i = 0; i < n; ++i) {
      prod *= b;
    }
    return prod
  }

  // N is an integer
  function POW_N(i1, n) {
    let isSet = i1.isSet();

    if (isSet) {
      let intervals = [];

      i1.intervals.forEach(interval => getIntervals(POW_N(interval, n)).forEach(i => intervals.push(i)));

      return new IntervalSet(intervals)
    } else {
      // x^0 = 1
      if (n === 0) {
        return new Interval(1, 1, i1.defMin, i1.defMax, true, true)
      } else if (n === 1) {
        // identity function
        return i1.clone()
      } else if (n === -1) {
        return RECIPROCAL(i1)
      }

      if (n > 1) {
        // Positive integers
        // if even, then there is a turning point at x = 0. If odd, monotonically increasing
        // always continuous and well-defined

        let min = i1.min;
        let max = i1.max;

        let minPowed, maxPowed;

        if (n === 2) {
          minPowed = min * min;
          maxPowed = max * max;
        } else if (n === 3) {
          minPowed = min * min * min;
          maxPowed = max * max * max;
        } else {
          minPowed = int_pow(min, n);
          maxPowed = int_pow(max, n);
        }

        let defMin = i1.defMin;
        let defMax = i1.defMax;
        let contMin = i1.contMin;
        let contMax = i1.contMax;

        if (!(n & 1)) {
          let maxValue = Math.max(minPowed, maxPowed);
          if (min <= 0 && 0 <= max) { // if 0 is included, then it's just [0, max(min^n, max^n)]
            return new Interval(0, maxValue, defMin, defMax, contMin, contMax)
          } else {
            // if 0 is not included, then it's [min(min^n, max^n), max(min^n, max^n)]
            let minValue = Math.min(minPowed, maxPowed);

            return new Interval(minValue, maxValue, defMin, defMax, contMin, contMax)
          }
        } else {
          // Monotonically increasing, so it's [min^n, max^n]

          return new Interval(minPowed, maxPowed, defMin, defMax, contMin, contMax)
        }
      } else {
        // Negative integers, utilize reciprocal function
        return RECIPROCAL(POW_N(i1, -n))
      }
    }
  }

  // r is a real number
  function POW_R(i1, r) {
    let min = i1.min;
    let max = i1.max;

    if (max < 0) {
      // Function is totally undefined
      return new Interval(0, 0, false, false, i1.contMin, i1.contMax)
    } else if (min < 0) {
      // 0 included in range, so the function is partially undefined
      let defMin = false;
      let defMax = i1.defMax;
      let contMin = i1.contMin;
      let contMax = i1.contMax;

      let bound = Math.pow(max, r);

      if (r < 0) {
        // Monotonically decreasing, infinite maximum, max^r minimum

        return new Interval(bound, Infinity, defMin, defMax, contMin, contMax)
      } else {
        // Monotonically increasing, 0 minimum, max^r maximum

        return new Interval(0, bound, defMin, defMax, contMin, contMax)
      }
    } else {
      // function is totally defined and continuous

      let minPowed = Math.pow(min, r);
      let maxPowed = Math.pow(max, r);

      let minValue = Math.min(minPowed, maxPowed);
      let maxValue = Math.max(minPowed, maxPowed);

      return new Interval(minValue, maxValue, i1.defMin, i1.defMax, i1.contMin, i1.contMax)
    }
  }

  function SQRT(i1) {
    if (i1.isSet()) {
      let intervals = [];

      i1.intervals.forEach(interval => getIntervals(SQRT(interval)).forEach(i => intervals.push(i)));

      return new IntervalSet(intervals)
    } else {
      return POW_R(i1, 1/2)
    }
  }

  function CBRT(i1) {
    if (i1.isSet()) {
      let intervals = [];

      i1.intervals.forEach(interval => getIntervals(CBRT(interval)).forEach(i => intervals.push(i)));

      return new IntervalSet(intervals)
    } else {
      return POW_RATIONAL(i1, 1, 3)
    }
  }

  function POW_RATIONAL(i1, p, q) {
    if (i1.isSet()) {
      let intervals = [];

      i1.intervals.forEach(interval => getIntervals(POW_RATIONAL(interval, p, q)).forEach(i => intervals.push(i)));

      return new IntervalSet(intervals)
    } else {
      // Assuming p and q are reduced

      if (p === 0) {
        return POW_N(i1, 0)
      }

      if (!(q & 1)) {
        // If the denominator is even then we can treat it like a real number
        return POW_R(i1, p / q)
      }

      let min = i1.min, max = i1.max;
      let r = p / q;
      let absMinPowed = Math.pow(Math.abs(min), r);
      let absMaxPowed = Math.pow(Math.abs(max), r);

      // continuous and well-defined everywhere

      let defMin = i1.defMin;
      let defMax = i1.defMax;
      let contMin = i1.contMin;
      let contMax = i1.contMax;

      let minAttained = Math.min(absMinPowed, absMaxPowed);
      let maxAttained = Math.max(absMinPowed, absMaxPowed);

      if (!(p & 1) && min < 0) {
        minAttained *= -1;
      }

      if (!(p & 1)) {
        if (p > 0) {
          // p / q with even, positive p and odd q
          // Continuous

          if (min < 0 && 0 < max) {
            // if 0 contained, then the minimum attained value is 0

            return new Interval(0, maxAttained, defMin, defMax, contMin, contMax)
          } else {
            return new Interval(minAttained, maxAttained, defMin, defMax, contMin, contMax)
          }

        } else {
          {
            // Totally continuous and monotonic
            return new Interval(minAttained, maxAttained, defMin, defMax, contMin, contMax)
          }
        }
      } else {
        if (p > 0) {
          // p / q with odd, positive p and odd q
          // Continuous, monotonically increasing everywhere

          console.log(minAttained, maxAttained);

          return new Interval(minAttained, maxAttained, defMin, defMax, contMin, contMax)
        } else {
          // p / q with odd, negative p and odd q
          // Always decreasing, discontinuous at x = 0

          if (min < 0 && 0 < max) {
            let interval1 = new Interval(-Infinity, minAttained, defMin, defMax, contMin, contMax);
            let interval2 = new Interval(maxAttained, Infinity, defMin, defMax, contMin, contMax);

            return new IntervalSet([interval1, interval2])
          }
        }
      }
    }
  }

  function POW_B(b, i1) {
    if (i1.isExact()) {
      let ret = Math.pow(b, i1.min);

      return new Interval(ret, ret, i1.defMin, i1.defMax, true, true)
    }

    if (b < 0) {
      // TODO add strange branching
      return new Interval(0, 0, false, false, true, true)
    } else if (b === 0) {
      return new Interval(0, 0, i1.defMin, i1.defMax, true, true)
    } else if (b === 1) {
      return new Interval(1, 1, i1.defMin, i1.defMax, true, true)
    } else {
      // continuous, monotonic, always defined
      let minPowed = Math.pow(b, i1.min);
      let maxPowed = Math.pow(b, i1.max);

      let minValue = Math.min(minPowed, maxPowed);
      let maxValue = Math.max(minPowed, maxPowed);

      return new Interval(minValue, maxValue, i1.defMin, i1.defMax, i1.contMin, i1.contMax)
    }
  }

  function cmpZero(min, max) {
    if (min >= 0) {
      return 1
    } else if (max > 0) {
      return 0
    } else {
      return -1
    }
  }

  function ignoreNaNMin(...args) {
    let min = Infinity;
    for (let i = 0; i < args.length; ++i) {
      let val = args[i];

      if (val < min) {
        min = val;
      }
    }

    return min
  }

  function ignoreNaNMax(...args) {
    let max = -Infinity;
    for (let i = 0; i < args.length; ++i) {
      let val = args[i];

      if (val > max) {
        max = val;
      }
    }

    return max
  }

  function POW(i1, i2) {
    let isSet = i1.isSet() || i2.isSet();

    if (isSet) {
      let left = getIntervals(i1);
      let right = getIntervals(i2);

      let intervals = [];

      left.forEach(i => {
        right.forEach(j => {
          getIntervals(POW(i, j)).forEach(k => intervals.push(k));
        });
      });

      return new IntervalSet(intervals)
    } else {
      if (i2.isExact()) {
        if (Number.isInteger(i2.min)) {
          return POW_N(i1, i2.min)
        } else {
          return POW_R(i1, i2.min)
        }
      }

      if (i1.isExact()) {
        return POW_B(i1.min, i2)
      }

      let i1min = i1.min, i1max = i1.max, i2min = i2.min, i2max = i2.max;

      // This is a rather complex algorithm, so I must document it!!
      // We wish to find the intervals of the set [i1min, i1max] ^ [i2min, i2max].
      // We should treat the exponent as a real number, not as a rational number (since that case is
      // the dominion of POW_RATIONAL). That means that there are two branches for negative base.
      // We split up the cases depending on the position of i1, i2 relative to 0.

      let i1Pos = cmpZero(i1min, i1max);

      let powMinMin = Math.pow(i1min, i2min);
      let powMinMax = Math.pow(i1min, i2max);
      let powMaxMin = Math.pow(i1max, i2min);
      let powMaxMax = Math.pow(i1max, i2max);

      let defMin = i1.defMin && i2.defMin;
      let defMax = i1.defMax && i2.defMax;
      let contMin = i1.contMin && i2.contMin;
      let contMax = i1.contMax && i2.contMax;

      let endpointMinAttained = ignoreNaNMin(powMinMin, powMinMax, powMaxMin, powMaxMax);
      let endpointMaxAttained = ignoreNaNMax(powMinMin, powMinMax, powMaxMin, powMaxMax);

      // Nine cases
      if (i1Pos === 1) {
        // In these three cases, everything is continuous and monotonic and thus defined by the endpoints

        return new Interval(endpointMinAttained, endpointMaxAttained, defMin, defMax, contMin, contMax)
      } else if (i1Pos === 0) {
        // Discontinuities due to branching involved
        // Recurse into two subcases

        let int1 = POW(new Interval(0, i1max, i1.defMin, i1.defMax, i1.contMin, i1.contMax), i2);
        let int2 = POW(new Interval(i1min, 0, i1.defMin, i1.defMax, i1.contMin, i1.contMax), i2);

        return new IntervalSet([int1, ...int2.intervals])
      } else if (i1Pos === -1) {
        let powMinMin = Math.pow(Math.abs(i1min), i2min);
        let powMinMax = Math.pow(Math.abs(i1min), i2max);
        let powMaxMin = Math.pow(Math.abs(i1max), i2min);
        let powMaxMax = Math.pow(Math.abs(i1max), i2max);


        let minAttained = Math.min(powMinMin, powMinMax, powMaxMin, powMaxMax);
        let maxAttained = Math.max(powMinMin, powMinMax, powMaxMin, powMaxMax);

        // Not continuous over any interval
        let int1 = new Interval(-maxAttained, -minAttained, false, defMax, false, false);
        let int2 = new Interval(minAttained, maxAttained, false, defMax, false, false);

        return new IntervalSet([int1, int2])
      }
    }
  }

  const YES = new Interval(1, 1);
  const YESNT = new Interval(0, 1);
  const NO = new Interval(0, 0);

  function invertBooleanInterval(i) {
    if (i.min === 0 && i.max === 0) {
      return new Interval(1, 1, i.defMin, i.defMax, i.contMin, i.contMax)
    } else if (i.max === 1 && i.max === 1) {
      return new Interval(0, 0, i.defMin, i.defMax, i.contMin, i.contMax)
    } else {
      return new Interval(0, 1, i.defMin, i.defMax, i.contMin, i.contMax)
    }
  }

  function LESS_THAN(i1, i2) {
    let ret;
    if (i1.max < i2.min) {
      ret = YES.clone();
    } else if (i2.max < i1.min) {
      ret = NO.clone();
    } else {
      ret = YESNT.clone();
    }

    ret.defMin = i1.defMin && i2.defMin;
    ret.defMax = i1.defMax && i2.defMax;
    ret.contMin = i1.contMin && i2.contMin;
    ret.contMax = i1.contMax || i2.contMax;

    return ret
  }

  function GREATER_THAN(i1, i2) {
    return LESS_THAN(i2, i1)
  }

  function LESS_EQUAL_THAN(i1, i2) {
    let ret;
    if (i1.max <= i2.min) {
      ret = YES.clone();
    } else if (i2.max <= i1.min) {
      ret = NO.clone();
    } else {
      ret = YESNT.clone();
    }

    ret.defMin = i1.defMin && i2.defMin;
    ret.defMax = i1.defMax && i2.defMax;
    ret.contMin = i1.contMin && i2.contMin;
    ret.contMax = i1.contMax || i2.contMax;

    return ret
  }

  function GREATER_EQUAL_THAN(i1, i2) {
    return LESS_EQUAL_THAN(i2, i1)
  }

  function EQUAL(i1, i2) {
    let ret;

    if (i1.isExact() && i2.isExact()) {
      if (i1.min === i2.min) {
        ret = YES.clone();
      } else {
        ret = NO.clone();
      }
    }

    if (i1.intersects(i2)) {
      ret = YESNT.clone();
    } else {
      ret = NO.clone();
    }

    ret.defMin = i1.defMin && i2.defMin;
    ret.defMax = i1.defMax && i2.defMax;
    ret.contMin = i1.contMin && i2.contMin;
    ret.contMax = i1.contMax || i2.contMax;

    return ret
  }

  function NOT_EQUAL(i1, i2) {
    return invertBooleanInterval(EQUAL(i1, i2))
  }

  function GAMMA(i1) {
    
  }

  function DIGAMMA(i1) {

  }

  function TRIGAMMA(i1) {

  }

  function POLYGAMMA(n, i1) {

  }

  function SIN(i1) {

  }

  function COS(i1) {

  }

  function TAN(i1) {

  }

  // TODO
  function CCHAIN(i1, compare, i2, ...args) {
    if (!i2) {
      return NO.clone()
    }

    if (args.length > 0)
      return CCHAIN()

    return true
  }


  const Intervals = {
    '+': ADD, '*': MULTIPLY, '/': DIVIDE, '-': SUBTRACT, '^': POW, 'pow_rational': POW_RATIONAL, 'sqrt': SQRT, 'cbrt': CBRT,
    '<': LESS_THAN, '>': GREATER_THAN, '<=': LESS_EQUAL_THAN, '>=': GREATER_EQUAL_THAN, '==': EQUAL, '!=': NOT_EQUAL,
    'gamma': GAMMA, 'digamma': DIGAMMA, 'trigamma': TRIGAMMA, 'polygamma': POLYGAMMA, 'sin': SIN, 'cos': COS, 'tan': TAN,
    'cchain': CCHAIN
  };
  Object.freeze(Intervals);

  function generateContours2(func, curvatureFunc, xmin, xmax, ymin, ymax, searchDepth=10, renderingQuality=10, maxDepth=16) {
    let polyline = [];

    function add_contour_segment(x1, y1, x2, y2) {
      polyline.push(x1, y1, x2, y2, NaN, NaN);
    }

    function create_tree(depth, xmin, xmax, ymin, ymax, fxy, fxY, fXY, fXy) {
      let needs_subdivide = depth < searchDepth;

      if (depth <= maxDepth && !needs_subdivide) {
        let signxy = Math.sign(fxy);
        let signxY = Math.sign(fxY);
        let signXY = Math.sign(fXY);
        let signXy = Math.sign(fXy);

        // Search for contours
        if (signxy !== signxY || signxY !== signXY || signXY !== signXy) {
          let minDim = Math.min(xmax - xmin, ymax - ymin);
          let radius = Math.abs(curvatureFunc((xmax + xmin) / 2, (ymax + ymin) / 2));

          if (depth < maxDepth && radius < renderingQuality * minDim) {
            // subdivide
            needs_subdivide = true;
          } else {
            let side1 = signxy !== signxY;
            let side2 = signxY !== signXY;
            let side3 = signXY !== signXy;
            let side4 = signXy !== signxy;

            let side1x, side3x, side2y, side4y;
            let side1y, side3y, side2x, side4x;

            if (side1) {
              let side1a = Math.abs(fxy);
              let side1b = Math.abs(fxY);
              let side1ratio = side1a / (side1a + side1b);
              side1x = xmin;
              side1y = ymin + side1ratio * (ymax - ymin);
            }

            if (side3) {
              let side3a = Math.abs(fXy);
              let side3b = Math.abs(fXY);
              let side3ratio = side3a / (side3a + side3b);
              side3x = xmax;
              side3y = ymin + side3ratio * (ymax - ymin);
            }

            if (side2) {
              let side2a = Math.abs(fxY);
              let side2b = Math.abs(fXY);
              let side2ratio = side2a / (side2a + side2b);
              side2x = xmin + side2ratio * (xmax - xmin);
              side2y = ymax;
            }

            if (side4) {
              let side4a = Math.abs(fxy);
              let side4b = Math.abs(fXy);
              let side4ratio = side4a / (side4a + side4b);
              side4x = xmin + side4ratio * (xmax - xmin);
              side4y = ymin;
            }

            if (side1 && side2 && side3 && side4) {
              // Saddle point

              add_contour_segment(side1x, side1y, side3x, side3y);
              add_contour_segment(side2x, side2y, side4x, side4y);

              return
            }

            if (side1 && side3) {
              add_contour_segment(side1x, side1y, side3x, side3y);
              return
            }

            if (side2 && side4) {
              add_contour_segment(side2x, side2y, side4x, side4y);
              return
            }

            if (side1 && side2) {
              add_contour_segment(side1x, side1y, side2x, side2y);
            } else if (side2 && side3) {
              add_contour_segment(side3x, side3y, side2x, side2y);
            } else if (side3 && side4) {
              add_contour_segment(side3x, side3y, side4x, side4y);
            } else if (side4 && side1) {
              add_contour_segment(side1x, side1y, side4x, side4y);
            }
          }
        } else {
          // no contour, return
          return
        }
      }

      if (needs_subdivide) {
        // subdivide
        let midX = (xmin + xmax) / 2;
        let midY = (ymin + ymax) / 2;

        let mxmyCorner = func(midX, midY);
        let mxyCorner = func(midX, ymin);
        let mxYCorner = func(midX, ymax);
        let xmyCorner = func(xmin, midY);
        let XmyCorner = func(xmax, midY);

        create_tree(depth + 1, xmin, midX, ymin, midY, fxy, xmyCorner, mxmyCorner, mxyCorner);
        create_tree(depth + 1, xmin, midX, midY, ymax, xmyCorner, fxY, mxYCorner, mxmyCorner);
        create_tree(depth + 1, midX, xmax, ymin, midY, mxyCorner, mxmyCorner, XmyCorner, fXy);
        create_tree(depth + 1, midX, xmax, midY, ymax, mxmyCorner, mxYCorner, fXY, XmyCorner);
      }
    }

    let xyCorner = func(xmin, ymin);
    let xYCorner = func(xmin, ymax);
    let XYCorner = func(xmax, ymax);
    let XyCorner = func(xmax, ymin);

    create_tree(0, xmin, xmax, ymin, ymax, xyCorner, xYCorner, XYCorner, XyCorner);

    return polyline
  }

  /**
   * Plots an equation of x and y of the form equation(x,y) = 0.
   */
  class EquationPlot2D extends InteractiveElement {
    constructor(params={}) {
      super(params);

      this.equation = parse_string("x^2+y");

      this.updateFunc();

      const disp = this.displayedElement = new WebGLPolyline();
      disp.pen.useNative = false;
      disp.pen.endcap = "none";
      disp.pen.color = Colors.RED;

      this.addEventListener("plotcoordschanged", () => this.update());
    }

    setEquation(text) {
      if (typeof text === "string") {
        this.equation = parse_string(text);
      } else if (text instanceof ASTNode) {
        this.equation = text;
      } else {
        throw new Error("Given equation is not text or AST")
      }

      this.updateFunc();
    }

    updateLight(adaptThickness=false) {
      if (!this.plot)
        return

      let transform = this.plot.transform;
      let previousTransform = this.previousTransform;
      let polyline = this.displayedElement;

      adaptPolyline(polyline, previousTransform, transform, adaptThickness);

      this.previousTransform = transform.clone();
    }

    updateFunc() {
      let exportedVariables = ['x', 'y'];

      let eqn = this.equation.compile(exportedVariables).func;
      let interval = this.equation.compileInterval(exportedVariables).func;
      //let real = this.equation.compileReal(exportedVariables)

      let fxNode = this.equation.derivative('x');
      let fyNode = this.equation.derivative('y');
      let fxxNode = fxNode.derivative('x');
      let fxyNode = fxNode.derivative('y');
      let fyyNode = fyNode.derivative('y');

      let fx = fxNode.compile(exportedVariables).func;
      let fy = fyNode.compile(exportedVariables).func;
      let fxx = fxxNode.compile(exportedVariables).func;
      let fxy = fxyNode.compile(exportedVariables).func;
      let fyy = fyyNode.compile(exportedVariables).func;

      let curvatureFunc = (x, y) => {
        let fxV = fx(x, y), fyV = fy(x, y), fxxV = fxx(x, y), fxyV = fxy(x,y), fyyV = fyy(x, y);
        let fxVSq = fxV * fxV, fyVSq = fyV * fyV;

        return (fxVSq + fyVSq) ** 1.5 / (fyVSq * fxxV - 2 * fxV * fyV * fxyV + fxVSq * fyyV)
      };

      this.compiledFunctions = {
        eqn,
        interval,
        curvatureFunc
      };
    }

    update() {
      super.update();

      if (this.plot) {
        let coords = this.plot.transform.coords;
        let vertices = generateContours2(this.compiledFunctions.eqn, this.compiledFunctions.curvatureFunc, coords.x1, coords.x2, coords.y1, coords.y2);

        this.plot.transform.plotToPixelArr(vertices);

        this.displayedElement.vertices = vertices;
        this.displayedElement.update();

        this.previousTransform = this.plot.transform.clone();
      }
    }

    render(info) {
      if (this.visible) {
        const gl = info.universe.gl;
        const box = info.plot.transform.box;

        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(box.top_left.x * dpr,
          box.top_left.y * dpr,
          box.width * dpr,
          box.height * dpr);

        this.displayedElement.render(info);

        gl.disable(gl.SCISSOR_TEST);
      }
    }
  }

  function nodeFromJSON(topNode) {
    let children = topNode.children ? topNode.children.map(child => nodeFromJSON(child)) : [];

    switch (topNode.type) {
      case "operator":
        return new OperatorNode({operator: topNode.operator, children})
      case "variable":
        return new VariableNode({name: topNode.name, children})
      case "node":
        return new ASTNode({children})
      case "constant":
        return new ConstantNode({value: topNode.value, text: topNode.text, invisible: topNode.invisible})
    }
  }

  let id = 0;

  function getJobID() {
    return id++
  }

  class Job {
    constructor(beast, id) {
      assert(beast instanceof Beast);

      this.beast = beast;
      this.id = id;

      this.eventListeners = {};
    }

    addEventListener(type, callback) {
      if (!this.eventListeners[type])
        this.eventListeners[type] = [callback];
      else
        this.eventListeners[type].push(callback);
    }

    triggerEvent(type, evt) {
      this.eventListeners[type] ? this.eventListeners[type].forEach(callback => callback(evt)) : null;
    }

    progress(callback) {
      this.addEventListener("progress", callback);
      return this
    }

    finished(callback) {
      this.addEventListener("finished", callback);
      return this
    }

    cancelled(callback) {
      this.addEventListener("cancel", callback);
      return this
    }

    onError(callback) {
      this.addEventListener("error", callback);
    }

    error(err) {
      if (this.eventListeners["error"].length > 0) {
        this.triggerEvent("error");
      } else {
        throw new Error(err)
      }
    }

    cancel() {
      this.beast.cancelJob(this);
      this.triggerEvent("cancel");
    }
  }

  class Beast {
    constructor() {
      this.worker = new Worker("../build/grapheme_worker.js");

      this.worker.onmessage = (evt) => {
        this.onMessage(evt);
      };

      this.jobs = [];
    }

    cancelJob(job) {
      this.worker.postMessage({job: "cancel", jobID: job.id});
      this.removeJob(job);
    }

    removeJob(job) {
      let index = this.jobs.indexOf(job);

      if (index !== -1) {
        this.jobs.splice(index, 1);
      }
    }

    onMessage(evt) {
      const data = evt.data;

      switch (data.response) {
        case "error":
          this.jobs.forEach(job => {
            if (job.id === data.jobID) {
              job.error(data.data);
            }
          });
          break
        case "progress":
          this.jobs.forEach(job => {
            if (job.id === data.jobID) {
              job.triggerEvent("progress", data.data);

              if (data.data.progress === 1) {
                this.removeJob(job);
              }
            }
          });
          break
        default:
          throw new Error("HUH?")
      }
    }

    createJob(type, data) {
      let id = getJobID();

      this.worker.postMessage({job: type, jobID: id, data});

      let job = new Job(this, id);

      this.jobs.push(job);

      return job
    }

    terminate() {
      this.jobs.forEach(job => job.cancel());
      this.jobs = [];

      this.worker.terminate();
    }
  }

  class BeastPool {
    constructor() {
      this.beasts = [];
      this._index = 0;

      this.setThreadCount(4);
    }

    get threadCount() {
      return this.beasts.length
    }

    setThreadCount(t) {
      let current = this.threadCount;

      if (current === t)
        return

      if (current > t) {
        this.beasts.slice(t).forEach(beast => beast.terminate());

        this.beasts.length = t;
      } else {
        for (let i = 0; i < t - current; ++i) {
          this.beasts.push(new Beast());
        }
      }
    }

    getBeast() {
      if (this.threadCount <= 0)
        throw new Error("No beasts to use!")

      if (this._index >= this.threadCount) {
        this._index = 0;
      }

      return this.beasts[this._index++]
    }

    destroy() {
      this.beasts.forEach(beast => beast.terminate());
    }
  }

  const BEAST_POOL = new BeastPool();

  exports.ASTNode = ASTNode;
  exports.BEAST_POOL = BEAST_POOL;
  exports.BasicLabel = BasicLabel;
  exports.BoundingBox = BoundingBox;
  exports.Color = Color;
  exports.Colors = Colors;
  exports.ConstantNode = ConstantNode;
  exports.ConwaysGameOfLifeElement = ConwaysGameOfLifeElement;
  exports.DefaultUniverse = DefaultUniverse;
  exports.EquationPlot2D = EquationPlot2D;
  exports.FunctionPlot2D = FunctionPlot2D;
  exports.Functions = Functions;
  exports.GridlineStrategizers = GridlineStrategizers;
  exports.Gridlines = Gridlines;
  exports.Group = GraphemeGroup;
  exports.InspectablePoint = InspectablePoint;
  exports.InteractiveFunctionPlot2D = InteractiveFunctionPlot2D;
  exports.Interpolations = Interpolations;
  exports.Interval = Interval;
  exports.IntervalSet = IntervalSet;
  exports.Intervals = Intervals;
  exports.LN10 = LN10;
  exports.LN2 = LN2;
  exports.Label2D = Label2D;
  exports.ONE_THIRD = ONE_THIRD;
  exports.OperatorNode = OperatorNode;
  exports.OperatorSynonyms = OperatorSynonyms;
  exports.Pen = Pen;
  exports.PieChart = PieChart;
  exports.Plot2D = Plot2D;
  exports.PolylineBase = PolylineBase;
  exports.PolylineElement = PolylineElement;
  exports.REAL_FUNCTIONS = REAL_FUNCTIONS;
  exports.Real = OvinusReal;
  exports.StandardLabelFunction = StandardLabelFunction;
  exports.TreeElement = TreeElement;
  exports.Universe = GraphemeUniverse;
  exports.VariableNode = VariableNode;
  exports.Vec2 = Vec2;
  exports.WebGLPolyline = WebGLPolyline;
  exports._interpolationsEnabled = _interpolationsEnabled;
  exports.adaptively_sample_1d = adaptively_sample_1d;
  exports.angles_between = angles_between;
  exports.boundingBoxTransform = boundingBoxTransform;
  exports.calculatePolylineVertices = calculatePolylineVertices;
  exports.digamma = digamma;
  exports.find_roots = find_roots;
  exports.gamma = gamma;
  exports.getPolygammaNumeratorPolynomial = getPolygammaNumeratorPolynomial;
  exports.get_continued_fraction = get_continued_fraction;
  exports.get_rational = get_rational;
  exports.interpolate = interpolate;
  exports.intersectBoundingBoxes = intersectBoundingBoxes;
  exports.isExactlyRepresentableAsFloat = isExactlyRepresentableAsFloat;
  exports.ln_gamma = ln_gamma;
  exports.nextPowerOfTwo = nextPowerOfTwo;
  exports.nodeFromJSON = nodeFromJSON;
  exports.parse_string = parse_string;
  exports.point_line_segment_min_closest = point_line_segment_min_closest;
  exports.point_line_segment_min_distance = point_line_segment_min_distance;
  exports.polygamma = polygamma;
  exports.powerExactlyRepresentableAsFloat = powerExactlyRepresentableAsFloat;
  exports.rgb = rgb;
  exports.rgba = rgba;
  exports.sample_1d = sample_1d;
  exports.tokenizer = tokenizer;
  exports.trigamma = trigamma;
  exports.utils = utils;

  return exports;

}({}));
