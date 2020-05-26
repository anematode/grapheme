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
    const ok = Object.keys; const tx = typeof x; const
      ty = typeof y;
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

  // device pixel ratio... duh
  let dpr = window.devicePixelRatio;
  function updateDPR () {
    if (dpr !== window.devicePixelRatio) {
      dpr = window.devicePixelRatio;

      // Tell the babies that the device pixel ratio has changed
      Universes.forEach(context => context.triggerEvent("dprchanged"));
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
      const r = Math.random() * 16 | 0; const
        v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16)
    })
  }

  let empty_canvas = window.OffscreenCanvas ? new window.OffscreenCanvas(1, 1) : document.createElement("canvas");
  let empty_canvas_ctx = empty_canvas.getContext("2d");

  function measureText(text, font) {
    if (empty_canvas_ctx.font !== font)
      empty_canvas_ctx.font = font;
    let metrics = empty_canvas_ctx.measureText(text);

    return new BoundingBox(new Vec2(0,0), metrics.width, metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent)
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

  function roundToCanvasPixel(x) {
    return Math.round(x - 0.5) + 0.5
  }

  function flattenVectors(arr) {
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

  function zeroFill(number, width) {
    width -= number.toString().length;
    if (width > 0) {
      return new Array( width + (/\./.test( number ) ? 2 : 1) ).join( '0' ) + number;
    }
    return number + ""; // always return a string
  }

  function removeUniverse(context) {
    let index = this.Universes.indexOf(context);

    if (index !== -1) {
      this.Universes.splice(index, 1);
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

  var utils = /*#__PURE__*/Object.freeze({
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

      // Whether to always update when render is called
      /** @public */ this.alwaysUpdate = alwaysUpdate;

      // Custom event listeners
      /** @private */ this.eventListeners = {};

      // Children of this element
      /** @public */ this.children = [];
    }

    /**
     * Trigger an event. If it returns true, some event listener returned true, which will stop the propagation of the event.
     * @param type The name of the event, e.g. "plotcoordschanged"
     * @param event The event itself, either a default event or a custom event.
     * @returns {boolean} Whether some event returned true.
     */
    triggerEvent (type, event) {
      this.sortChildren();

      // Trigger event in all children
      for (let i = 0; i < this.children.length; ++i) {
        if (this.children[i].triggerEvent(type, event)) {
          // Stop if event stopped propagation
          return true
        }
      }

      if (this.eventListeners[type]) {
        // Stop if event stopped propagation
        let res = this.eventListeners[type].some(listener => listener(event));
        if (res)
          return true
      }

      return false
    }

    /**
     * Sort the children of this GraphemeElement
     */
    sortChildren () {
      // Sort the children by their precedence value
      this.children.sort((x, y) => x.precedence - y.precedence);
    }

    /**
     * Render this element to a plot.
     * @param info The rendering info
     * @param info.ctx CanvasRenderingContext2D to draw to
     * @param info.plot The plot we are drawing onto
     * @param info.labelManager The LabelManager of the plot
     */
    render (info) {
      if (info.beforeNormalRender)
        info.beforeNormalRender();

      // Update if needed
      if (this.alwaysUpdate)
        this.update();

      this.renderChildren(info);
    }

    renderChildren(info) {
      // Sort children
      this.sortChildren();

      // Render all children
      this.children.forEach((child) => child.render(info));
    }

    // Whether element is a direct child of this
    isChild (element) {
      return this.hasChild(element, false)
    }

    // Whether element is a child (potentially recursive) of this
    hasChild (element, recursive = true) {
      if (recursive) {
        if (this.hasChild(element, false)) return true
        return this.children.some((child) => child.hasChild(element, recursive))
      }

      const index = this.children.indexOf(element);
      return (index !== -1)
    }

    /** Append element(s) to this
     *
     * @param element Element to remove
     * @param elements Parameter pack, elements to remove
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
      element.plot = this.plot;

      // Add element to children
      this.children.push(element);

      // Potentially recurse
      if (elements.length > 0) {
        this.add(...elements);
      }
    }

    /** Remove elements from this
     *
     * @param element Element to remove
     * @param elements Parameter pack, elements to remove
     */
    remove (element, ...elements) {
      checkType(element, GraphemeElement);

      if (this.hasChild(element, false)) {
        // if element is an immediate child

        const index = this.children.indexOf(element);
        this.children.splice(index, 1);

        element.parent = null;
        element.plot = null;
      }

      if (elements.length > 0) {
        this.remove(...elements);
      }
    }

    /**
     * Destroy this element
     */
    destroy () {
      // Destroy all children
      this.children.forEach((child) => child.destroy());

      // Remove this element from its parent
      if (this.parent)
        this.parent.remove(this);

      this.plot = null;
    }

    /**
     * Add event listener to this element
     * @param type Event to listen for
     * @param callback Function to call
     */
    addEventListener (type, callback) {
      const listenerArray = this.eventListeners[type];
      if (!listenerArray) {
        this.eventListeners[type] = [callback];
      } else {
        listenerArray.push(callback);
      }
    }

    /**
     * Remove event listener from this element
     * @param type Event to listen for
     * @param callback Function to call
     */
    removeEventListener(type, callback) {
      const listenerArray = this.eventListeners[type];
      if (listenerArray) {
        let index = listenerArray.indexOf(callback);
        if (index !== -1) {
          listenerArray.splice(index, 1);
        }
      }
    }

    /**
     * Function called to update for rendering. Empty in case child classes don't define it.
     */
    update () {

    }
  }

  /** @class Used semantically to group elements */
  class GraphemeGroup extends GraphemeElement {
    constructor (params = {}) {
      super(params);
    }
  }

  /** @claas LabelManager
   * Manage the labels of a domElement, meant to be the container div of a grapheme window */
  class LabelManager {
    constructor (container) {
      // Pass it the dom element div for grapheme_window
      this.container = container;

      // Mapping from Label keys to {renderID: the last render ID, domElement: html element to use}
      this.labels = new Map();

      this.currentRenderID = -1;
    }

    cleanOldRenders () {
      const labelInfos = this.labels;

      labelInfos.forEach((labelInfo, label) => {
        if (labelInfo.renderID !== this.currentRenderID) {
          labelInfo.domElement.remove();

          labelInfos.delete(label);
        }
      });
    }

    // Get element corresponding to a given label
    getElement (label) {
      const labelInfo = this.labels.get(label);
      let domElement;

      if (!labelInfo) {
        // Create a div for the label to use
        domElement = document.createElement('div');
        domElement.classList.add('grapheme-label');
        this.container.appendChild(domElement);

        // Set renderID so that we know if it needs updating later
        this.labels.set(label, { renderID: this.currentRenderID, domElement });
      } else {
        domElement = labelInfo.domElement;

        // Update render ID
        labelInfo.renderID = this.currentRenderID;
      }

      return domElement
    }
  }

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
     * Whether a program with programName exists
     * @param programName {string} Name of the program
     * @returns {boolean} Whether that program exists
     */
    hasProgram (programName) {
      return !!this.programs[programName]
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
     * Whether this manager has a buffer with a given name
     * @param bufferName Name of the buffer
     * @returns {boolean} Whether this manager has a buffer with that name
     */
    hasBuffer (bufferName) {
      return !!this.buffers[bufferName]
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
     * Delete buffer with given name
     * @param bufferName Name of the buffer
     */
    deleteBuffer (bufferName) {
      if (!this.hasBuffer(bufferName)) return
      
      const buffer = this.getBuffer(bufferName);
      const { gl } = this;

      // Delete the buffer from GL memory
      gl.deleteBuffer(buffer);
      delete this.buffers[bufferName];
    }
  }

  /** @class GraphemeUniverse universe for plots to live in. Allows WebGL rendering, variables, etc. */
  class GraphemeUniverse {
    /**
     * Construct a new GraphemeUniverse
     */
    constructor() {
      this.canvases = [];

      // Add this to the list of all extant universes
      Universes.push(this);

      this.glCanvas = window.OffscreenCanvas ? new window.OffscreenCanvas(691, 1015) : document.createElement("canvas");
      this.gl = this.glCanvas.getContext("webgl");
      this.glManager = new GLResourceManager(this.gl);

      if (!this.gl)
        throw new Error("Grapheme needs WebGL to run! Sorry.")
    }

    clear() {
      let gl = this.gl;

      gl.clearColor(0,0,0,0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    copyToCanvas(graphemeCanvas) {
      graphemeCanvas.ctx.resetTransform();

      graphemeCanvas.ctx.drawImage(this.glCanvas, 0, 0);

      graphemeCanvas.resetCanvasCtxTransform();
    }

    _setSize(width, height) {
      const glCanvas = this.glCanvas;

      glCanvas.width = width;
      glCanvas.height = height;
    }

    expandToFit() {
      let maxWidth = 1;
      let maxHeight = 1;

      for (let i = 0; i < this.canvases.length; ++i) {
        let canvas = this.canvases[i];

        if (canvas.canvasWidth > maxWidth)
          maxWidth = canvas.canvasWidth;
        if (canvas.canvasHeight > maxHeight)
          maxHeight = canvas.canvasHeight;
      }

      this._setSize(maxWidth, maxHeight);
    }

    /**
     * Add canvas to this universe
     * @param canvas Canvas to add
     */
    add(canvas) {
      if (canvas.universe !== this)
        throw new Error("Canvas already part of a universe")
      if (this.isChild(canvas))
        throw new Error("Canvas is already added to this universe")

      this.canvases.push(canvas);
    }

    /**
     * Remove canvas from this universe
     * @param canvas Canvas to remove
     */
    remove(canvas) {
      let index = this.canvases.indexOf(canvas);

      if (index !== -1) {
        this.canvases.splice(index, 1);
      }
    }

    /**
     * Whether canvas is a child of this universe
     * @param canvas Canvas to test
     * @returns {boolean} Whether canvas is a child
     */
    isChild(canvas) {
      return this.canvases.indexOf(canvas) !== -1
    }

    /**
     * Trigger an event on all child canvases
     * @param type
     * @param event
     * @returns {boolean}
     */
    triggerEvent(type, event) {
      // Trigger event in all canvases
      for (let i = 0; i < this.canvases.length; ++i) {
        if (this.canvases[i].triggerEvent(type, event)) {
          // Stop if event stopped propagation
          return true
        }
      }

      return false
    }

    destroy() {
      removeUniverse(this);
    }
  }

  const DefaultUniverse = new GraphemeUniverse();

  /** @class GraphemeCanvas A viewable instance of Grapheme. Provides the information required for rendering to canvas. */
  class GraphemeCanvas extends GraphemeGroup {
    /**
     * Creates a GraphemeCanvas.
     *
     * @constructor
     * @param universe {GraphemeUniverse} Universe this canvas will be a part of
     */
    constructor (universe=DefaultUniverse) {
      super();

      if (!(universe instanceof GraphemeUniverse))
        throw new Error("Given universe not instance of Grapheme.Universe")

      this.universe = universe;

      this.universe.add(this);

      // Element to be put into the webpage
      /** @public */ this.domElement = document.createElement('div');

      // The canvas of a GraphemeCanvas
      /** @public */ this.canvas = document.createElement('canvas');

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

      this.addEventListener("dprchanged", () => {
        this.setSize(this.width, this.height);
      });

      this.extraInfo = {};
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

    /**
     * Get the width of the canvas in displayed pixels (not CSS pixels).
     * @returns {number} The width of the canvas.
     */
    get canvasWidth () {
      return this.canvas.width
    }

    /**
     * Get the height of the canvas in displayed pixels (not CSS pixels).
     * @returns {number} The height of the canvas.
     */
    get canvasHeight () {
      return this.canvas.height
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

    /**
     * Clear the canvas
     */
    clear () {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }

    /**
     * Render this GraphemeCanvas
     */
    render () {
      this.universe.expandToFit();

      const { labelManager, ctx } = this;
      const plot = this;

      let needsWebGLCopy = false;

      const beforeNormalRender = () => {
        if (needsWebGLCopy) {
          this.universe.copyToCanvas(this);

          needsWebGLCopy = false;
          this.universe.clear();
        }
      };

      const beforeWebGLRender = () => {
        this.universe.gl.viewport(0, 0, this.canvasWidth, this.canvasHeight);

        needsWebGLCopy = true;
      };

      // Set ID of this render
      labelManager.currentRenderID = getRenderID();

      // Info to be given to rendered elements
      const info = { labelManager, ctx, plot, beforeNormalRender, beforeWebGLRender, universe: this.universe, extraInfo: this.extraInfo };

      // Clear the canvas
      this.clear();

      // Reset the rendering context transform
      this.resetCanvasCtxTransform();

      // Render all children
      super.render(info);

      beforeNormalRender();

      // Get rid of old labels
      labelManager.cleanOldRenders();
    }
  }

  // List of events to listen for
  const EVENTS = ["click", "mousemove", "mousedown", "mouseup", "wheel"];
  const TOUCH_EVENTS = ["touchstart", "touchmove", "touchend", "touchcancel"];
  const POINTER_EVENTS = ["pointerdown", "pointerup", "pointermove"];

  /**
   * @class Canvas that supports interactivity events.
   * The callbacks are given above, and the events have the following structure:
   * {pos: new Vec2(... pixel coordinates of mouse event in canvas ...), rawEvent: ... raw mouse event ...}
   */
  class InteractiveCanvas extends GraphemeCanvas {
    /**
     * Construct an interactive canvas
     * @param universe GraphemeUniverse this canvas is a part of
     */
    constructor(universe=DefaultUniverse) {
      super(universe);

      this.interactivityListeners = {};

      this.interactivityEnabled = true;
    }

    /**
     * Get whether interactivity is enabled
     * @returns {boolean} Whether interactivity is enabled
     */
    get interactivityEnabled() {
      return Object.keys(this.interactivityListeners).length !== 0
    }

    /**
     * Set whether interactivity is enabled
     * @param enable Whether interactivity is enabled
     */
    set interactivityEnabled(enable) {
      if (enable) {
        // Add interactivity listeners
        EVENTS.forEach(evtName => {
          let callback = (evt) => {
            // Calculate where the click is
            let rect = this.domElement.getBoundingClientRect();

            this.triggerEvent(evtName, {
              pos: new Vec2(evt.clientX - rect.left,evt.clientY - rect.top),
              rawEvent: evt
            });
          };

          this.interactivityListeners[evtName] = callback;

          this.domElement.addEventListener(evtName, callback);
        });

        POINTER_EVENTS.forEach(evtName => {
          let callback = (event) => this.handlePointer(event);

          this.interactivityListeners[evtName] = callback;

          this.domElement.addEventListener(evtName, callback);
        });

        TOUCH_EVENTS.forEach(evtName => {
          let callback = (event) => this.handleTouch(event);

          this.interactivityListeners[evtName] = callback;

          this.domElement.addEventListener(evtName, callback);
        });
      } else {
        // Remove all interactivity listeners
        EVENTS.concat(TOUCH_EVENTS).concat(POINTER_EVENTS).forEach(evtName => {
          this.domElement.removeEventListener(evtName, this.interactivityListeners[evtName]);
        });

        this.interactivityListeners = {};
      }
    }

    handleTouch(event) {
      // Credit to https://stackoverflow.com/questions/1517924/javascript-mapping-touch-events-to-mouse-events
        let touches = event.changedTouches,
          first = touches[0],
          type = "";
        switch (event.type) {
          case "touchstart": type = "mousedown"; break;
          case "touchmove":  type = "mousemove"; break;
          case "touchend":   type = "mouseup";   break;
          default: return;
        }

        let simulatedEvent = document.createEvent("MouseEvent");
        simulatedEvent.initMouseEvent(type, true, true, window, 1,
          first.screenX, first.screenY,
          first.clientX, first.clientY, false,
          false, false, false, 0, null);

        first.target.dispatchEvent(simulatedEvent);
        event.preventDefault();

        if (type === "mouseup") {
          // also emit a click event

          let simulatedEvent2 = document.createEvent("MouseEvent");
          simulatedEvent2.initMouseEvent("click", true, true, window, 1,
            first.screenX, first.screenY,
            first.clientX, first.clientY, false,
            false, false, false, 0, null);

          first.target.dispatchEvent(simulatedEvent2);
          event.preventDefault();
        }
    }

    handlePointer(event) {
      if (event.type === "pointerup") ; else if (event.type === "pointermove") ;
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
      }

      this.plot.triggerEvent("plotcoordschanged");
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
      this.plot.triggerEvent("plotcoordschanged");
    }

    translate(v, ...args) {
      if (v instanceof Vec2) {
        this.coords.top_left.add(v);
      } else {
        this.translate(new Vec2(v, ...args));
      }

      this.plot.triggerEvent("plotcoordschanged");
    }

    zoomOn(factor, v = new Vec2(0,0), ...args) {
      if (this.allowScrolling) {
        let pixel_s = this.plotToPixel(v);

        this.coords.width *= factor;
        this.coords.height *= factor;

        this._internal_coincideDragPoints(v, pixel_s);
      }

      this.plot.triggerEvent("plotcoordschanged");
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
  }

  class SmartLabelManager {
    constructor(plot) {
      this.plot = plot;

      this.labelBoundingBoxes = [];

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
  }

  /**
   * @class Plot2D
   * A generic plot in two dimensions, including a transform from plot coordinates to pixel coordinates.
   * Padding of the plot is determined by padding.top, padding.left, etc.. Interactivity like scrolling and dragging are
   * enabled via enableDrag and enableScroll
   */
  class Plot2D extends InteractiveCanvas {
    constructor (universe=DefaultUniverse) {
      super(universe);

      // This is the plot of itself. Meta!
      this.plot = this;

      // The amount of padding on all sides of the plot, which determines the plotting box along with the canvas's size
      this.padding = {top: 40, right: 40, left: 40, bottom: 40};

      // The transformation from plot coordinates to pixels
      this.transform = new Plot2DTransform({plot: this});

      // Whether to allow movement by dragging and scrolling TODO
      this.enableDrag = true;
      this.enableScroll = true;

      this.extraInfo.smartLabelManager = new SmartLabelManager(this);

      this.addEventListener("mousedown", evt => this.mouseDown(evt));
      this.addEventListener("mouseup", evt => this.mouseUp(evt));
      this.addEventListener("mousemove", evt => this.mouseMove(evt));
      this.addEventListener("wheel", evt => this.wheel(evt));
      this.addEventListener("resize", evt => {
        this.update();
        this.transform.correctAspectRatio();
      });

      this.update();
    }

    mouseDown(evt) {
      this.mouseDownAt = this.transform.pixelToPlot(evt.pos);
    }

    mouseUp(evt) {
      this.mouseDownAt = null;
    }

    mouseMove(evt) {
      if (this.mouseDownAt) {
        this.transform._coincideDragPoints(this.mouseDownAt, evt.pos);

        return true
      }
    }

    wheel(evt) {
      let scrollY = evt.rawEvent.deltaY;

      this.transform.zoomOn(Math.exp(scrollY / 1000), this.transform.pixelToPlot(evt.pos));
    }

    render() {
      this.extraInfo.smartLabelManager.reset();

      super.render();
    }

    update () {
      this.calculateTransform();
    }

    getCanvasBox() {
      return new BoundingBox(new Vec2(0,0), this.width, this.height)
    }

    calculateTransform () {
      this.transform.box = this.getCanvasBox().pad(this.padding);
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
        arrowLocations = [] // possible values of locations to draw: "start", "substart", "end", "subend"
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

      return 0
    }

    function angles_between(start, end, threshold) {
      start = start | 0;
      end = end | 0;
      threshold = +threshold;

      var p = 0, q = 0, res = 0, indx = 0;

      for (p = (start + 2) << 3, q = ((end - 2) << 3); (p | 0) < (q | 0); p = (p + 16) | 0) {
        res = needs_refinement(+values[(p-16)>>3], +values[(p-8)>>3], +values[p>>3], +values[(p+8)>>3], +values[(p+16)>>3], +values[(p+24)>>3], +threshold) | 0;

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

  function angles_between(polyline_vertices, threshold=0.03) {
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

    GeometryASMFunctions.angles_between(0, i, threshold);

    return ASMViews.f64.subarray(0, i/2 - 2)
  }

  let heap = new ArrayBuffer(0x10000000);
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

  /* Unicode characters for exponent signs, LOL */
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

  // I'm just gonna hardcode gridlines for now. Eventually it will have a variety of styling options
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
    }


    update() {
      let transform = this.plot.transform;
      let plotCoords = transform.coords;
      let plotBox = transform.box;

      this._labels = [];

      const markers = this.strategizer(plotCoords.x1, plotCoords.x2, plotBox.width, plotCoords.y1, plotCoords.y2, plotBox.height);

      let polylines = this._polylines = {};
      let computed_label_styles = this.computed_label_styles = {};

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

  // const fs = require( ...
  // No, this is not node.js the language.

  class ASTNode {
    constructor() {
      this.parent = null;
      this.children = [];
    }

    applyAll(func, depth=0) {
      func(this, depth);

      this.children.forEach(child => {
        if (child.applyAll)
          child.applyAll(func, depth + 1);
      });
    }

    getText() {
      return "(node)"
    }

    compile() {
      let variableNames = this.getVariableNames();

      return new Function(...variableNames, "return " + this._getCompileText())
    }

    getVariableNames() {
      let variableNames = [];

      this.applyAll(child => {
        if (child instanceof VariableNode) {
          let name = child.name;

          if (variableNames.indexOf(name) === -1) {
            variableNames.push(name);
          }
        }
      });

      return variableNames
    }

    _getCompileText() {
      return this.children.map(child => "(" + child._getCompileText() + ")").join('+')
    }
  }

  class VariableNode extends ASTNode {
    constructor(params={}) {
      super();

      const {
        name = 'x'
      } = params;

      this.name = name;
    }

    _getCompileText() {
      return this.name
    }

    getText() {
      return this.name
    }
  }

  const OperatorPatterns = {
    "sin": ["Math.sin", "+"],
    "+": ["", "+"],
    "-": ["", "-"],
    "*": ["", "*"],
    "/": ["", "/"],
    "^": ["", "**"],
    "tan": ["Math.tan"],
    "cos": ["Math.cos"],
    "csc": ["1/Math.sin"],
    "sec": ["1/Math.cos"],
    "cot": ["1/Math.tan"],
    "asin": ["Math.asin"],
    "acos": ["Math.acos"],
    "atan": ["Math.atan"],
    "abs": ["Math.abs"],
    "sqrt": ["Math.sqrt"],
    "cbrt": ["Math.cbrt"]
  };

  class OperatorNode extends ASTNode {
    constructor(params={}) {
      super();

      const {
        operator = '^'
      } = params;

      this.operator = operator;
    }

    _getCompileText() {

      let pattern = OperatorPatterns[this.operator];

      if (!pattern)
        throw new Error("Unrecognized operation")

      return pattern[0] + "(" + this.children.map(child => "(" + child._getCompileText() + ")").join(pattern[1] ? pattern[1] : "+") + ")"
    }

    getText() {
      return this.operator
    }
  }

  class ConstantNode extends ASTNode {
    constructor(params={}) {
      super();

      const {
        value = 0
      } = params;

      this.value = value;
    }

    _getCompileText() {
      return this.value + ""
    }

    getText() {
      return "" + this.value
    }
  }

  // a * b - c * d ^ g

  let operator_regex = /^[*-\/+^]/;
  let function_regex = /^([^\s\\*-\/+!^()]+)\(/;
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

        match = string.match(constant_regex);

        if (match) {
          yield {
            type: "constant",
            value: match[0],
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

        get_angry_at(string, i, "Unrecognized token");
      } while (false)

      let len = match[0].length;

      string = string.slice(len);
    }
  }

  function check_valid(string, tokens) {
    for (let i = 0; i < tokens.length - 1; ++i) {
      let token1 = tokens[i];
      let token2 = tokens[i+1];

      if ((token1.type === "operator" || token1.type === "comma") && (token2.type === "operator" || token2.type === "comma"))
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
          tokens[i] = new ConstantNode({value: token.value});
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
            children.splice(0, 0, new ConstantNode({value: 0}));
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
              let function_node = new OperatorNode({ operator: child_test.name });

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

    root.applyAll(child => {
      if (child.children)
        child.children.forEach(subchild => subchild.parent = child);
    });

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

  const listenerKeys = ["click", "mousemove", "mousedown", "mouseup", "wheel"];

  /** @class InteractiveElement An element which takes up space a plot and supports an "isClick" function.
   * Used exclusively for 2D plots (3D plots will have a raycasting system).
   */
  class InteractiveElement extends GraphemeElement {
    /**
     * Construct an InteractiveElement
     * @param params
     * @param params.interactivityEnabled {boolean} Whether interactivity is enabled
     */
    constructor(params={}) {
      super(params);

      const {
        interactivityEnabled = false
      } = params;
      this.interactivityEnabled = interactivityEnabled;
    }

    /**
     * Get whether interactivity is enabled
     * @returns {boolean} Whether interactivity is enabled
     */
    get interactivityEnabled() {
      return this.interactivityListeners && Object.keys(this.interactivityListeners).length !== 0
    }

    /**
     * Set whether interactivity is enabled
     * @param value
     */
    set interactivityEnabled(value) {
      if (this.interactivityEnabled === value)
        return

      if (!this.interactivityListeners)
        this.interactivityListeners = {};

      let interactivityListeners = this.interactivityListeners;

      if (value) {
        if (this.plot && !(this.plot instanceof InteractiveCanvas))
          console.warn("Interactive element in a non-interactive canvas");

        let mouseDown = null;

        // Whether the previous mousemove was on the element
        let prevIsClick = false;

        for (let key of listenerKeys) {
          let key_ = key;

          let callback = (evt) => {
            let position = evt.pos;
            let isClick = this.isClick(position);

            // Trigger mouse on and mouse off events
            if (isClick && !prevIsClick) {
              this.triggerEvent("interactive-mouseon", evt);
            } else if (!isClick && prevIsClick) {
              this.triggerEvent("interactive-mouseoff", evt);
            }

            // Set whether the previous mouse move is on the element
            if (key_ === "mousemove" && isClick)
              prevIsClick = true;
            else if (key_ === "mousemove" && !isClick)
              prevIsClick = false;

            if (isClick) {
              this.triggerEvent("interactive-" + key_, evt);
            }

            // Trigger drag events
            if (key_ === "mousemove") {
              if (mouseDown) {
                // return to allow the prevention of propagation
                return this.triggerEvent("interactive-drag", {start: mouseDown, ...evt})
              }
            } else if (key_ === "mousedown" && isClick) {
              mouseDown = evt.pos;
            } else if (key_ === "mouseup") {
              mouseDown = null;
            }
          };

          this.addEventListener(key, callback);
          interactivityListeners[key] = callback;
        }

      } else {
        for (let key in this.interactivityListeners) {
          if (this.interactivityListeners.hasOwnProperty(key)) {
            this.removeEventListener(key, interactivityListeners[key]);
          }
        }

        this.interactivityListeners = {};
      }
    }

    // Derived classes need to define this function
    isClick(position) {
      throw new Error("")
    }
  }

  let MAX_DEPTH = 10;

  // TODO: Stop this function from making too many points
  function adaptively_sample_1d(start, end, func, initialPoints=500, angle_threshold=0.2, depth=0, includeEndpoints=true) {
    if (depth > MAX_DEPTH || start === undefined || end === undefined || isNaN(start) || isNaN(end))
      return [NaN, NaN]

    let vertices = sample_1d(start, end, func, initialPoints, includeEndpoints);

    let angles = new Float64Array(angles_between(vertices, angle_threshold));

    let final_vertices = [];

    for (let i = 0; i < vertices.length; i += 2) {
      let angle_i = i / 2;

      if (angles[angle_i] === 3 || angles[angle_i - 1] === 3) {
        let vs = adaptively_sample_1d(vertices[i], vertices[i + 2], func, 3, angle_threshold, depth + 1, true);

        vs.forEach(a => final_vertices.push(a));
      } else {
        final_vertices.push(vertices[i]);
        final_vertices.push(vertices[i+1]);
      }
    }

    return final_vertices
  }

  function sample_1d(start, end, func, points=500, includeEndpoints=true) {
    let vertices = [];

    for (let i = 1 - includeEndpoints; i <= points - (1 - includeEndpoints); ++i) {
      let x = start + i * (end - start) / points;
      vertices.push(x, func(x));
    }

    return vertices
  }

  class WebGLElement extends GraphemeElement {
    constructor(params={}) {
      super(params);

      this.id = generateUUID();
    }

    render(info) {
      if (info.beforeWebGLRender)
        info.beforeWebGLRender();

      this.sortChildren();

      // Update if needed
      if (this.alwaysUpdate)
        this.update();

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
  const ENDCAP_TYPES = {
    'NONE': 0,
    'ROUND': 1
  };
  const JOIN_TYPES = {
    'NONE': 0,
    'ROUND': 1,
    'MITER': 2,
    'DYNAMIC': 3
  };

  function integerInRange (x, min, max) {
    return isInteger(x) && min <= x && x <= max
  }

  const MIN_RES_ANGLE = 0.05; // minimum angle in radians between roundings in a polyline

  // Parameters for the expanding/contracting float array for polyline
  const MIN_SIZE = 16;
  const MAX_SIZE = 2 ** 24;

  function nextPowerOfTwo (x) {
    return 2 ** Math.ceil(Math.log2(x))
  }

  // polyline primitive in Cartesian coordinates
  // has thickness, vertex information, and color stuff
  class WebGLPolyline extends WebGLElement {
    constructor (params = {}) {
      super(params);
      this.vertices = []; // x,y values in pixel space

      this.color = 0x000000ff; //r,g,b,a
      this.thickness = 2; // thickness of the polyline in pixels

      this.endcap_type = 1; // refer to ENDCAP enum
      this.endcap_res = 0.4; // angle in radians between consecutive roundings
      this.join_type = 3; // refer to ENDCAP enum
      this.join_res = 0.5; // angle in radians between consecutive roundings

      this.use_native = false;
      this.use_cpp = true;

      this._gl_triangle_strip_vertices = null;
      this._gl_triangle_strip_vertices_total = 0;

      this.alwaysUpdate = false;
    }

    static ENDCAP_TYPES () {
      return ENDCAP_TYPES
    }

    static JOIN_TYPES () {
      return JOIN_TYPES
    }

    static MIN_RES_ANGLE () {
      return MIN_RES_ANGLE
    }

    _calculateTriangles () {
      // This is nontrivial

      // check validity of inputs
      if (this.thickness <= 0 ||
        !integerInRange(this.endcap_type, 0, 1) ||
        !integerInRange(this.join_type, 0, 3) ||
        this.endcap_res < MIN_RES_ANGLE ||
        this.join_res < MIN_RES_ANGLE ||
        this.vertices.length <= 3) {

        this._gl_triangle_strip_vertices_total = 0; // pretend there are no vertices ^_^
        return
      }

      let tri_strip_vertices = this._gl_triangle_strip_vertices;

      if (!tri_strip_vertices) {
        tri_strip_vertices = this._gl_triangle_strip_vertices = new Float32Array(MIN_SIZE);
      }

      let gl_tri_strip_i = 0;
      let that = this; // ew
      let tri_strip_vertices_threshold = tri_strip_vertices.length - 2;

      function addVertex(x, y) {
        if (gl_tri_strip_i > tri_strip_vertices_threshold) {
          // not enough space!!!!

          let new_float_array = new Float32Array(2 * tri_strip_vertices.length);
          new_float_array.set(tri_strip_vertices);

          tri_strip_vertices = that._gl_triangle_strip_vertices = new_float_array;
          tri_strip_vertices_threshold = tri_strip_vertices.length - 2;
        }

        tri_strip_vertices[gl_tri_strip_i++] = x;
        tri_strip_vertices[gl_tri_strip_i++] = y;

        if (need_to_dupe_vertex) {
          need_to_dupe_vertex = false;
          addVertex(x, y);
        }
      }

      function duplicateVertex() {
        addVertex(tri_strip_vertices[gl_tri_strip_i - 2], tri_strip_vertices[gl_tri_strip_i - 1]);
      }

      let vertices = this.vertices;
      let original_vertex_count = vertices.length / 2;

      let th = this.thickness;
      let need_to_dupe_vertex = false;

      let max_miter_length = th / Math.cos(this.join_res / 2);

      let x1,x2,x3,y1,y2,y3;
      let v1x, v1y, v2x, v2y, v1l, v2l, b1_x, b1_y, scale, nu_x, nu_y, pu_x, pu_y, dis;

      for (let i = 0; i < original_vertex_count; ++i) {
        x1 = (i !== 0) ? vertices[2 * i - 2] : NaN; // Previous vertex
        x2 = vertices[2 * i]; // Current vertex
        x3 = (i !== original_vertex_count - 1) ? vertices[2 * i + 2] : NaN; // Next vertex

        y1 = (i !== 0) ? vertices[2 * i - 1] : NaN; // Previous vertex
        y2 = vertices[2 * i + 1]; // Current vertex
        y3 = (i !== original_vertex_count - 1) ? vertices[2 * i + 3] : NaN; // Next vertex

        if (isNaN(x2) || isNaN(y2)) {
          duplicateVertex();
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

          if (isNaN(nu_x) || isNaN(nu_y))
            continue; // undefined >:(

          if (this.endcap_type === 1) {
            // rounded endcap
            let theta = Math.atan2(nu_y, nu_x) + Math.PI / 2;
            let steps_needed = Math.ceil(Math.PI / this.endcap_res);

            let o_x = x2 - th * nu_y, o_y = y2 + th * nu_x;

            for (let i = 1; i <= steps_needed; ++i) {
              let theta_c = theta + i / steps_needed * Math.PI;

              addVertex(x2 + th * Math.cos(theta_c), y2 + th * Math.sin(theta_c));
              addVertex(o_x, o_y);
            }
            continue;
          } else {
            // no endcap
            addVertex(x2 + th * nu_y, y2 - th * nu_x);
            addVertex(x2 - th * nu_y, y2 + th * nu_x);
            continue;
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

          if (isNaN(pu_x) || isNaN(pu_y))
            continue; // undefined >:(

          addVertex(x2 + th * pu_y, y2 - th * pu_x);
          addVertex(x2 - th * pu_y, y2 + th * pu_x);

          if (this.endcap_type === 1) {
            let theta = Math.atan2(pu_y, pu_x) + 3 * Math.PI / 2;
            let steps_needed = Math.ceil(Math.PI / this.endcap_res);

            let o_x = x2 - th * pu_y, o_y = y2 + th * pu_x;

            for (let i = 1; i <= steps_needed; ++i) {
              let theta_c = theta + i / steps_needed * Math.PI;

              addVertex(x2 + th * Math.cos(theta_c), y2 + th * Math.sin(theta_c));
              addVertex(o_x, o_y);
            }
            continue;
          } else {
            break;
          }
        }

        if (isNaN(x2) || isNaN(x2)) {
          duplicateVertex();
          need_to_dupe_vertex = true;

          continue;
        } else { // all vertices are defined, time to draw a joinerrrrr
          if (this.join_type === 2 || this.join_type === 3) {
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

            if (this.join_type === 2 || (Math.abs(scale) < max_miter_length)) {
              // if the length of the miter is massive and we're in dynamic mode, we exit this if statement and do a rounded join
              if (scale === Infinity || scale === -Infinity)
                scale = 1;

              b1_x *= scale;
              b1_y *= scale;

              addVertex(x2 - b1_x, y2 - b1_y);
              addVertex(x2 + b1_x, y2 + b1_y);

              continue;
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

          if (this.join_type === 1 || this.join_type === 3) {
            let a1 = Math.atan2(-pu_y, -pu_x) - Math.PI/2;
            let a2 = Math.atan2(nu_y, nu_x) - Math.PI/2;

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
            let steps_needed = Math.ceil(angle_subtended / this.join_res);

            for (let i = 0; i <= steps_needed; ++i) {
              let theta_c = start_a + angle_subtended * i / steps_needed;

              addVertex(x2 + th * Math.cos(theta_c), y2 + th * Math.sin(theta_c));
              addVertex(x2, y2);
            }
          }

          addVertex(x2 + th * nu_y, y2 - th * nu_x);
          addVertex(x2 - th * nu_y, y2 + th * nu_x);
        }
      }

      if (gl_tri_strip_i * 2 < tri_strip_vertices.length) {
        let new_float_array = new Float32Array(Math.min(Math.max(MIN_SIZE, nextPowerOfTwo(gl_tri_strip_i)), MAX_SIZE));
        new_float_array.set(tri_strip_vertices.subarray(0, gl_tri_strip_i));

        tri_strip_vertices = this._gl_triangle_strip_vertices = new_float_array;
      }

      this._gl_triangle_strip_vertices_total = Math.ceil(gl_tri_strip_i / 2);
    }

    _calculateNativeLines () {
      let vertices = this.vertices;
      if (vertices.length <= 3) {
        this._gl_triangle_strip_vertices_total = 0;
        return
      }

      let tri_strip_vertices = this._gl_triangle_strip_vertices;
      if (!tri_strip_vertices) {
        tri_strip_vertices = this._gl_triangle_strip_vertices = new Float32Array(MIN_SIZE);
      }

      if (tri_strip_vertices.length < vertices.length || tri_strip_vertices.length > vertices.length * 2) {
        tri_strip_vertices = this._gl_triangle_strip_vertices = new Float32Array(Math.min(Math.max(MIN_SIZE, nextPowerOfTwo(vertices.length)), MAX_SIZE));
      }

      if (Array.isArray(vertices)) {
        for (let i = 0; i < vertices.length; ++i) {
          tri_strip_vertices[i] = vertices[i];
        }
      } else {
        tri_strip_vertices.set(vertices);
      }

      this._gl_triangle_strip_vertices_total = Math.ceil(vertices.length / 2);
    }

    update () {
      if (!this.use_native) {
        this._calculateTriangles();
      } else {
        // use native LINE_STRIP for xtreme speed

        this._calculateNativeLines();
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

      const glManager = info.universe.glManager;
      const gl = info.universe.gl;

      let program = glManager.getProgram('webgl-polyline');

      if (!program) {
        glManager.compileProgram('webgl-polyline', vertexShaderSource, fragmentShaderSource, ['v_position'], ['line_color', 'xy_scale']);
        program = glManager.getProgram('webgl-polyline');
      }

      let buffer = glManager.getBuffer(this.id);
      let vertexCount = this._gl_triangle_strip_vertices_total;
      if ((this.use_native && vertexCount < 2) || (!this.use_native && vertexCount < 3)) return
  // tell webgl to start using the gridline program
      gl.useProgram(program.program);
  // bind our webgl buffer to gl.ARRAY_BUFFER access point
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      let color = this.color;
  // set the vec4 at colorLocation to (r, g, b, a)
      gl.uniform4f(program.uniforms.line_color,
        ((color >> 24) & 0xff) / 255, // bit masks to retrieve r, g, b and a
        ((color >> 16) & 0xff) / 255, // divided by 255 because webgl likes [0.0, 1.0]
        ((color >> 8) & 0xff) / 255,
        (color & 0xff) / 255);
      gl.uniform2f(program.uniforms.xy_scale,
        2 / info.plot.width,
        -2 / info.plot.height);
  // copy our vertex data to the GPU
      gl.bufferData(gl.ARRAY_BUFFER, this._gl_triangle_strip_vertices, gl.DYNAMIC_DRAW /* means we will rewrite the data often */);
  // enable the vertices location attribute to be used in the program
      gl.enableVertexAttribArray(program.attribs.v_position);
  // tell it that the width of vertices is 2 (since it's x,y), that it's floats,
      // that it shouldn't normalize floats, and something i don't understand
      gl.vertexAttribPointer(program.attribs.v_position, 2, gl.FLOAT, false, 0, 0);
  // draw the vertices as triangle strip
      gl.drawArrays(this.use_native ? gl.LINE_STRIP : gl.TRIANGLE_STRIP, 0, vertexCount);
    }

    destroy () {
      deleteBuffersNamed(this.id);
    }
  }

  class WebGLPolylineWrapper extends PolylineBase {
    constructor(params={}) {
      super(params);

      this._internal_polyline = new WebGLPolyline();
    }

    update() {
      this._internal_polyline.vertices = this.vertices;

      const pen = this.pen;

      this._internal_polyline.color = pen.color.toNumber();
      this._internal_polyline.thickness = pen.thickness / 2;
      this._internal_polyline.use_native = pen.useNative;

      // TODO: add other pen things

      this._internal_polyline.update();
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

    render(info) {
      this._internal_polyline.render(info);
    }
  }

  // Allowed plotting modes:
  // rough = linear sample, no refinement
  // fine = linear sample with refinement

  class FunctionPlot2D extends InteractiveElement {
    constructor(params={}) {
      super(params);

      const {
        plotPoints = "auto"
      } = params;

      this.plotPoints = plotPoints;
      this.plottingMode = "fine";
      this.quality = 1;
      this.function = (x) => Math.atan(x);

      this.pen = new Pen({color: Colors.RED, useNative: false, thickness: 2});
      this.polyline = null;

      this.alwaysUpdate = false;

      this.addEventListener("plotcoordschanged", () => this.update());

      this.interactivityEnabled = true;
    }

    isClick(position) {
      return this.polyline.distanceFrom(position) < this.polyline.pen.thickness * 2
    }

    update() {
      let transform = this.plot.transform;
      let { coords, box } = transform;
      let simplifiedTransform = transform.getPlotToPixelTransform();

      let plotPoints = this.plotPoints;

      if (plotPoints === "auto") {
        plotPoints = this.quality * box.width;
      }

      let min_y = coords.y1 - coords.height / 4;
      let max_y = coords.y2 + coords.height / 4;

      let vertices = [];

      if (this.plottingMode === "rough") {
        vertices = sample_1d(coords.x1, coords.x2, this.function, box.width * this.quality);
      } else {
        vertices = adaptively_sample_1d(coords.x1, coords.x2, this.function, box.width * this.quality);
      }

      this.plot.transform.plotToPixelArr(vertices);

      if (!this.polyline)
        this.polyline = new WebGLPolylineWrapper({pen: this.pen, alwaysUpdate: false});

      this.polyline.vertices = vertices;
      this.polyline.update();
    }

    render(info) {
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

  const directionPrecedence = ["N", "S", "W", "E", "SW", "SE", "NW", "NE"];

  /**
   * Label which automatically figures out where to be placed to have the label shown well.
   */
  class SmartLabel extends Label2D {
    constructor(params={}) {
      super(params);

      this.objectBox = null;
      this.forceDir = null;
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

    render(info) {
      let bbox = this.boundingBoxNaive();

      let dir = this.forceDir;
      const sS = this.style.shadowSize;

      if (this.forceDir) ; else {
        let min_area = Infinity;

        if (info.extraInfo.smartLabelManager && !this.forceDir) {
          for (let direction of directionPrecedence) {
            let bbox_computed = this.computeTranslatedBoundingBox(bbox, direction);

            let area = info.extraInfo.smartLabelManager.getIntersectingArea(bbox_computed);

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

      super.render(info);

      info.extraInfo.smartLabelManager.addBox(computed);
    }
  }

  class LabeledPoint extends GraphemeElement {
    constructor (params = {}) {
      super();

      this.position = params.position instanceof Vec2 ? params.position : new Vec2(params.position);

      this.point = new PointElement();
      this.label = new SmartLabel({style: {dir: "NE", fontSize: 14, shadowColor: Colors.WHITE, shadowSize: 2}});

    }

    update () {
      let position = this.plot.transform.plotToPixel(this.position);

      this.point.position = position;
      this.label.objectBox = this.point.getBBox();

      if (this.position)
        this.label.text = "(" + this.position.asArray().map(StandardLabelFunction).join(', ') + ')';
    }

    render (info) {
      super.render(info);

      this.point.render(info);
      this.label.render(info);
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
    }

    removeInspectionPoint() {
      if (this.inspectionPoint)
        this.remove(this.inspectionPoint);
      this.inspectionPoint = null;
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
              position: { x, y }
            });

            this.add(this.inspectionPoint);
          } else {
            this.inspectionPoint.position = new Vec2(x, y);
          }

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

    get position() {
      return this.point.position
    }

    set position(value) {
      this.point.position = value;

      this.label.objectBox = this.point.getBBox();
    }

    isClick(pos) {
      return this.point.isClick(pos)
    }

    update() {

    }

    render(info) {
      super.render(info);

      this.point.render(info);

      if (this.selected)
        this.label.render(info);
    }
  }

  exports.BasicLabel = BasicLabel;
  exports.BoundingBox = BoundingBox;
  exports.ConwaysGameOfLifeElement = ConwaysGameOfLifeElement;
  exports.DefaultUniverse = DefaultUniverse;
  exports.FunctionPlot2D = FunctionPlot2D;
  exports.GridlineStrategizers = GridlineStrategizers;
  exports.Gridlines = Gridlines;
  exports.Group = GraphemeGroup;
  exports.InspectablePoint = InspectablePoint;
  exports.InteractiveFunctionPlot2D = InteractiveFunctionPlot2D;
  exports.Interpolations = Interpolations;
  exports.Label2D = Label2D;
  exports.PieChart = PieChart;
  exports.Plot2D = Plot2D;
  exports.PolylineBase = PolylineBase;
  exports.PolylineElement = PolylineElement;
  exports.StandardLabelFunction = StandardLabelFunction;
  exports.TreeElement = TreeElement;
  exports.Universe = GraphemeUniverse;
  exports.Vec2 = Vec2;
  exports.WebGLPolyline = WebGLPolyline;
  exports._interpolationsEnabled = _interpolationsEnabled;
  exports.adaptively_sample_1d = adaptively_sample_1d;
  exports.angles_between = angles_between;
  exports.boundingBoxTransform = boundingBoxTransform;
  exports.interpolate = interpolate;
  exports.intersectBoundingBoxes = intersectBoundingBoxes;
  exports.parse_string = parse_string;
  exports.point_line_segment_min_closest = point_line_segment_min_closest;
  exports.point_line_segment_min_distance = point_line_segment_min_distance;
  exports.sample_1d = sample_1d;
  exports.utils = utils;

  return exports;

}({}));
