var Grapheme = (function (exports) {
  'use strict';

  // This file defines some common utilities that Grapheme uses!

  // A list of all extant Grapheme Contexts
  const CONTEXTS = [];

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
      CONTEXTS.forEach(context => context.onDPRChanged());
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

  // Delete buffers with the given name from all Grapheme contexts
  function deleteBuffersNamed (bufferNames) {
    if (Array.isArray(bufferNames)) {
      for (let i = 0; i < bufferNames.length; ++i) {
        deleteBuffersNamed(bufferNames[i]);
      }
      return
    }

    CONTEXTS.forEach((context) => {
      context.glManager.deleteBuffer(bufferNames);
    });
  }

  let x$1 = 0;

  function getRenderID () {
    x$1 += 1;
    return x$1
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

  var utils = /*#__PURE__*/Object.freeze({
    generateUUID: generateUUID,
    createShaderFromSource: createShaderFromSource,
    createGLProgram: createGLProgram,
    CONTEXTS: CONTEXTS,
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
    flattenVectors: flattenVectors
  });

  class GraphemeElement {
    constructor ({
      precedence = 0,
      visible = true,
      alwaysUpdate = true
    } = {}) {
      // precedence is a number from -Infinity to Infinity.
      this.precedence = precedence;

      // The parent of this element
      this.parent = null;

      // The plot this element belongs to
      this.plot = null;

      // Whether to always update geometries when render is called
      this.alwaysUpdate = alwaysUpdate;

      // Custom event listeners
      this.eventListeners = {};

      // Children of this element
      this.children = [];
    }

    update () {

    }

    triggerEvent (type, evt) {
      this.sortChildren();

      for (let i = 0; i < this.children.length; ++i) {
        if (this.children[i].triggerEvent(type, evt)) {
          return true
        }
      }

      if (this.eventListeners[type]) {
        let res = this.eventListeners[type].every(listener => listener(evt));
        if (res)
          return true
      }

      return false
    }

    sortChildren () {
      // Sort the children by their precedence value
      this.children.sort((x, y) => x.precedence - y.precedence);
    }

    render (info) {
      this.sortChildren();

      if (this.alwaysUpdate) {
        this.update();
      }

      this.children.forEach((child) => child.render(info));
    }

    isChild (element) {
      return this.hasChild(element, false)
    }

    hasChild (element, recursive = true) {
      if (recursive) {
        if (this.hasChild(element, false)) return true
        return this.children.some((child) => child.hasChild(element, recursive))
      }

      const index = this.children.indexOf(element);
      return (index !== -1)
    }

    add (element, ...elements) {
      checkType(element, GraphemeElement);

      if (element.parent !== null) {
        throw new Error('Element is already a child')
      }

      assert(!this.hasChild(element, true), 'Element is already a child of this group...');

      element.parent = this;
      element.plot = this.plot;
      this.children.push(element);

      if (elements.length > 0) {
        this.add(...elements);
      }

      this.childrenSorted = false;
    }

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

    destroy () {
      this.children.forEach((child) => child.destroy());

      if (this.parent)
        this.parent.remove(this);
    }

    addEventListener (type, callback) {
      const listenerArray = this.eventListeners[type];
      if (!listenerArray) {
        this.eventListeners[type] = [callback];
      } else {
        listenerArray.push(callback);
      }
    }
  }

  class GraphemeGroup extends GraphemeElement {
    constructor (params = {}) {
      super(params);
    }
  }

  /** Manage the labels of a domElement, meant to be the container div of a grapheme window */
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

    getElement (label) {
      const labelInfo = this.labels.get(label);
      let domElement;

      if (!labelInfo) {
        domElement = document.createElement('div');
        domElement.classList.add('grapheme-label');
        this.container.appendChild(domElement);

        this.labels.set(label, { renderID: this.currentRenderID, domElement });
      } else {
        domElement = labelInfo.domElement;
        labelInfo.renderID = this.currentRenderID;
      }

      return domElement
    }
  }

  /** A grapheme window is an actual viewable instance of Grapheme.
  That is, it is a div that can be put into the DOM and manipulated (and seen).

  Properties:
  domElement = the div that the user adds to the webpage
  textCanvas = the canvas that text and stuff is done on
  context = the parent Grapheme.Context of this window
  textCanvasContext = the Canvas2DRenderingContext associated with the textCanvas
  cssWidth, cssHeight = the size of the canvas in CSS pixels
  canvasWidth, canvasHeight = the actual size of the canvas in pixels
  */
  class GraphemeCanvas extends GraphemeGroup {
    constructor (params={}) {
      super(params);

      // Element to be put into the webpage
      this.domElement = document.createElement('div');

      // The canvas of a GraphemeWindow
      this.canvas = document.createElement('canvas');
      this.domElement.appendChild(this.canvas);

      // CSS stuffs
      this.canvas.classList.add('grapheme-canvas');
      this.domElement.classList.add('grapheme-window');

      // Get the contexts
      this.ctx = this.canvas.getContext('2d');
      assert(this.ctx, "This browser doesn't support 2D canvas, what the heck");

      // label manager
      this.labelManager = new LabelManager(this.domElement);

      // Set the default size to 640 by 480 in CSS pixels
      this.setSize(640, 480);

      // Scale text canvas as needed due to DPR
      this.resetCanvasCtxTransform();

      this.addEventListener('dprchanged', () => {
        this.update();
        return true;
      });
    }

    resetCanvasCtxTransform () {
      const ctx = this.ctx;

      ctx.resetTransform();
      ctx.scale(dpr, dpr);
    }

    // Set the size of this window (including adjusting the canvas size)
    // Note that this width and height are in CSS pixels
    setSize (width, height) {
      // width and height are in CSS pixels
      this.width = width;
      this.height = height;

      // Update the canvas size, factoring in the device pixel ratio
      this.canvasWidth = this.width * dpr;
      this.canvasHeight = this.height * dpr;

      // Set the canvas CSS size using CSS
      const canvas = this.canvas;

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      this.triggerEvent("resize", {width, height});
    }

    // Returns the pixel width of the canvas
    get canvasWidth () {
      return this.canvas.width
    }

    // Returns the pixel height of the canvas
    get canvasHeight () {
      return this.canvas.height
    }

    // Sets the pixel width of the canvas
    set canvasWidth (x) {
      // Round it to an integer and make sure it's in a reasonable range
      x = Math.round(x);
      assert(isPositiveInteger(x) && x < 16384, 'canvas width must be in range [1,16383]');

      this.canvas.width = x;
    }

    // Sets the pixel height of the canvas
    set canvasHeight (y) {
      y = Math.round(y);
      assert(isPositiveInteger(y) && y < 16384, 'canvas height must be in range [1,16383]');

      this.canvas.height = y;
    }

    // Event triggered when the device pixel ratio changes
    onDPRChanged () {
      // This will resize the canvas accordingly
      this.setSize(this.width, this.height);

      this.resetCanvasCtxTransform();
    }

    // Destroy this window.
    destroy () {
      // Destroy the domElement
      this.domElement.remove();

      // Destroy the elements too, if desired
      super.destroy();

      // Delete some references
      delete this.canvas;
      delete this.domElement;
      delete this.ctx;
    }

    clear () {
      // Clear the canvas
      this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    }

    render () {
      const { labelManager, ctx } = this;

      // ID of this render
      labelManager.currentRenderID = getRenderID();

      // Render information to be given to elements. Namely,
      // labelManager
      // ctx
      // window
      const info = {
        labelManager,
        ctx,
        plot: this
      };

      this.resetCanvasCtxTransform();

      let err; // potential error in try {...} catch
      try {
        // Clear this canvas
        this.clear();

        // Render all children
        super.render(info);

        // Get rid of old labels
        labelManager.cleanOldRenders();
      } catch (e) {
        err = e;
      }

      if (err) throw err
    }
  }

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

  const EVENTS = ["click", "mousemove", "mousedown", "mouseup", "touchstart", "touchend", "touchcancel", "touchmove", "scroll"];

  class InteractiveCanvas extends GraphemeCanvas {
    constructor(params={}) {
      super(params);

      this.interactivityListeners = {};
      this.interactivityEnabled = true;
    }

    get interactivityEnabled() {
      return this._interactivityEnabled
    }

    set interactivityEnabled(v) {
      this._interactivityEnabled = v;

      if (v) {
        EVENTS.forEach(evtName => {
          let callback = (evt) => {
            let rect = this.domElement.getBoundingClientRect();

            this.triggerEvent(evtName, {pos: new Vec2(evt.clientX - rect.left,evt.clientY - rect.top), rawEvent: evt});
          };

          this.interactivityListeners[evtName] = callback;

          this.domElement.addEventListener(evtName, callback);
        });
      } else {
        EVENTS.forEach(evtName => {
          this.domElement.removeEventListener(evtName, this.interactivityListeners[evtName]);
        });
      }
    }
  }

  class BoundingBox {
    //_width;
    //_height;

    draw(canvasCtx) {
      canvasCtx.beginPath();
      canvasCtx.rect(this.top_left.x, this.top_left.y, this.width, this.height);
      canvasCtx.stroke();
    }

    constructor(top_left=Vec2(0,0), width=640, height=480) {
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
      if (w <= 0)
        throw new Error("Invalid bounding box width")
      this._width = w;
    }

    set height(h) {
      if (h <= 0)
        throw new Error("Invalid bounding box height")
      this._height = h;
    }

    setTL(top_left) {
      this.top_left = top_left;
      return this
    }

    set cx(cx) {
      this.top_left.x = cx - this.width / 2;
    }

    set cy(cy) {
      this.top_left.y = cy - this.width / 2;
    }

    get cx() {
      return this.top_left.x + this.width / 2
    }

    get cy() {
      return this.top_left.y + this.width / 2
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
  }

  const boundingBoxTransform = {
    X: (x, box1, box2, flipX=false) => {
      if (Array.isArray(x) || isTypedArray(x)) {
        for (let i = 0; i < x.length; ++i) {
          let fractionAlong = (x[i] - box1.x1) / box1.width;

          if (flipX)
            fractionAlong = 1 - fractionAlong;

          x[i] = fractionAlong * box2.width + box2.x1;
        }
        return x
      } else {
        return boundingBoxTransform.X([x], box1, box2)[0]
      }
    },
    Y: (y, box1, box2, flipY=false) => {
      if (Array.isArray(y) || isTypedArray(y)) {
        for (let i = 0; i < y.length; ++i) {
          let fractionAlong = (y[i] - box1.y1) / box1.height;

          if (flipY)
            fractionAlong = 1 - fractionAlong;

          y[i] = fractionAlong * box2.height + box2.y1;
        }
        return y
      } else {
        return boundingBoxTransform.Y([y], box1, box2)[0]
      }
    },
    XY: (xy, box1, box2, flipX=false, flipY=false) => {
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
    }
  };

  class Plot2DTransform {
    constructor(params={}) {
      this.box = params.box ? new BoundingBox(params.box) : new BoundingBox(new Vec2(0,0), this.width, this.height);
      this.coords = params.coords ? new BoundingBox(params.coords) : new BoundingBox(new Vec2(-5, 5), 10, 10);

      this.preserveAspectRatio = true;
      this.aspectRatio = 1; // Preserve the ratio coords.width / box.width

      this.allowDragging = true;
      this.allowScrolling = true;

      this.mouseDown = false;
      this.mouseAt = null;
    }

    centerOn(v, ...args) {
      if (v instanceof Vec2) {
        this.coords.cx = v.x;
        this.coords.cy = v.y;
      } else {
        this.centerOn(new Vec2(v, ...args));
      }
    }

    zoomOn(factor, v) {
      let pixel = this.plotToPixel(v);

      this.width *= factor;
      this.height *= factor;

      this.coincidePoints(this.pixelToPlot(pixel), v);
    }

    coincidePoints(v_old, v_new) {
      this.translate(v_old.subtract(v_new));
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
  }

  class Plot2D extends InteractiveCanvas {
    constructor (context) {
      super(context);

      this.plot = this;

      this.transform = new Plot2DTransform();
      this.padding = {top: 40, right: 40, left: 40, bottom: 40};

      this.enableDrag = true;
      this.enableScroll = true;

      this.addEventListener("mousedown", evt => this.mouseDown(evt));
      this.addEventListener("mouseup", evt => this.mouseUp(evt));
      this.addEventListener("mousemove", evt => this.mouseMove(evt));
      this.addEventListener("scroll", evt => this.scroll(evt));

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
        console.log("drag detected");
      }
    }

    scroll(evt) {
      console.log(evt);
      let scrollY = evt.rawEvent.scrollY;

      this.transform.zoomOn(scrollY / 100, this.transform.pixelToPlot(evt.pos));
    }

    render() {
      this.update();

      super.render();
    }

    update () {
      this.calculateTransform();
    }

    calculateTransform () {
      this.transform.box = new BoundingBox(new Vec2(0,0), this.width, this.height).pad(this.padding);
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
      return `#${[rnd.r, rnd.g, rnd.b, rnd.a].map((x) => x.toString(16)).join()}`
    }

    glColor () {
      return {
        r: this.r / 255, g: this.g / 255, b: this.b / 255, a: this.a / 255
      }
    }

    clone() {
      return new Color(this)
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

  class PolylineBase extends GraphemeElement {
    constructor (params = {}) {
      super(params);

      let {
        pen,
        vertices = []
      } = params;

      if (!(pen instanceof Pen)) {
        pen = new Pen(style || {});
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

    render (info) {
      super.render(info);

      const ctx = info.ctx;

      this.pen.prepareContext(ctx);
      ctx.stroke(this.mainPath);
      ctx.fill(this.arrowPath);
    }
  }

  class TestObject extends GraphemeElement {
    constructor() {
      super();

      this.pen = new Pen({arrowLocations: ["subend"], arrowhead: "Squat"});
    }

    render(info) {
      super.render(info);

      let eggs = [];

      for (let i = -5; i <= 5; i += 0.5) {
        for (let j = -5; j <= 5; j += 0.5) {
          eggs.push(new Vec2(i, j));
          eggs.push(new Vec2(i, j).add(new Vec2(Math.sin(i), Math.cos(j + Date.now() / 2000)).scale(0.4)));
          eggs.push(new Vec2(NaN, NaN));
        }
      }

      let polyline = new PolylineElement({
        vertices: eggs.map(vertex => info.plot.transform.plotToPixel(vertex)),
        pen: this.pen
      });

      polyline.render(info);
    }
  }

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
          textAlign = 'left';
          break
        case 'NE': case 'E': case 'SE':
          textAlign = 'right';
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
      ctx.fillStyle = this.shadowColor.hex();
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

    render (renderInfo) {
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
  }

  const desiredDemarcationSeparation = 15;

  // Array of potential demarcations [a,b], where the small demarcations are spaced every b * 10^n and the big ones are spaced every a * 10^n
  const StandardDemarcations = [[1, 0.2], [1, 0.25], [2, 0.5]];

  const DemarcationStrategizers = {
    Standard: function* (start, end, distance) {

      console.log(start,end,distance);
      if (start === end)
        throw new Error("No")
      if (start > end) {
        let temp = end;
        end = start;
        start = temp;
      }

      let approxDemarcations = distance / desiredDemarcationSeparation;

      let approxDemarcationSeparation = (end - start) / approxDemarcations;
      let selectedDemarcation;
      let closestSeparationError = Infinity;

      for (let i = 0; i < StandardDemarcations.length; ++i) {
        let potentialDemarcation = StandardDemarcations[i];

        let [a, b] = potentialDemarcation;

        let n = Math.round(Math.log10(approxDemarcationSeparation / b));
        let selectedSeparation = b * 10 ** n;

        let error = Math.abs(selectedSeparation - approxDemarcationSeparation);
        if (error < closestSeparationError) {
          closestSeparationError = error;
          selectedDemarcation = potentialDemarcation;
        }
      }

      let [a, b] = selectedDemarcation;

      for (let i = Math.ceil(start / b); i < end / b; ++i) {
        console.log(i);
        if (i === 0) {
          yield {pos: 0, type: 0};
        } else if (i % a === 0) {
          yield {pos: i * b, type: 1};
        } else {
          yield {pos: i * b, type: 2};
        }
      }
    }
  };

  // I'm just gonna hardcode gridlines for now. Eventually it will have a variety of styling options
  class Gridlines extends GraphemeElement {
    constructor(params={}) {
      super(params);

      this.x_strategizer = DemarcationStrategizers.Standard;
      this.y_strategizer = DemarcationStrategizers.Standard;

      this.polylines = {ticks: {'x': {}, 'y': {}}, lines: {'x': {}, 'y': {}}};
    }


    update() {
      for (let key in this.polylines) {
        for (let key2 in this.polylines[key]) {
          for (let key3 in this.polylines[key][key2]) {
            this.polylines[key][key2][key3].vertices = [];
          }
        }
      }

      let plot = this.plot;
      let plotCoords = plot.plotCoords;
      let plotBox = plot.plotBox;

      const x_markers = this.x_strategizer(plotCoords.x1, plotCoords.x2, plotBox.width);
      const y_markers = this.y_strategizer(plotCoords.y1, plotCoords.y2, plotBox.height);

      while (!x_markers.done) {
        let next = x_markers.next();
      }
    }

    render(renderInfo) {

    }
  }

  exports.BasicLabel = BasicLabel;
  exports.BoundingBox = BoundingBox;
  exports.DemarcationStrategizers = DemarcationStrategizers;
  exports.Gridlines = Gridlines;
  exports.Label2D = Label2D;
  exports.Plot2D = Plot2D;
  exports.TestObject = TestObject;
  exports.Vec2 = Vec2;
  exports.boundingBoxTransform = boundingBoxTransform;
  exports.utils = utils;

  return exports;

}({}));
