var Grapheme = (function (exports) {
  'use strict';

  // This file defines some common utilities that Grapheme uses!

  // A list of all extant Grapheme Contexts
  const CONTEXTS = [];

  // Assert that a statement is true, and throw an error if it's not
  function assert (statement, error = 'Unknown error') {
    if (!statement) throw new Error(error)
  }

  // Check that an object is of a given type
  function checkType (obj, type) {
    assert(obj instanceof type, `Object must be instance of ${type}`);
  }

  function isNonnegativeInteger (z) {
    return Number.isInteger(z) && z >= 0
  }

  function isPositiveInteger (z) {
    return Number.isInteger(z) && z > 0
  }

  function isTypedArray(arr) {
    return !!(arr.buffer instanceof ArrayBuffer && arr.BYTES_PER_ELEMENT)
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

      // whether this element is visible
      this.visible = true;

      // Whether to always update geometries when render is called
      this.alwaysUpdate = alwaysUpdate;

      // Custom event listeners
      this.eventListeners = {};

      // Children of this element
      this.children = [];

      this.logEvents = true;
    }

    update () {

    }

    triggerEvent (type, evt) {
      if (this.logEvents)
        console.log(type, evt);

      if (this.eventListeners[type]) {
        let res = this.eventListeners[type].any(listener => listener(evt));
        if (res)
          return true
      }

      this.sortChildren();

      for (let i = 0; i < this.children.length; ++i) {
        if (this.children[i].triggerEvent(type, evt)) {
          return true
        }
      }

      return false
    }

    sortChildren (force = false) {
      // Sort the children by their precedence value
      this.children.sort((x, y) => x.precedence - y.precedence);
    }

    render (renderInfo) {
      this.sortChildren();

      if (!this.visible) {
        return
      }

      if (this.alwaysUpdate) {
        this.update();
      }

      renderInfo.window.beforeRender(this);

      // sort our elements by drawing precedence
      this.sortChildren();

      this.children.forEach((child) => child.render(renderInfo));
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

  class WebGLGraphemeElement extends GraphemeElement {
    constructor (params = {}) {
      super(params);

      this.usedBufferNames = [];
      this.usedProgramNames = [];
    }

    addUsedBufferName (bufferName) {
      if (this.usedBufferNames.indexOf(bufferName) === -1) {
        this.usedBufferNames.push(bufferName);
      }
    }

    removeUsedBufferName (bufferName) {
      const index = this.usedBufferNames.indexOf(bufferName);
      if (index !== -1) {
        this.usedBufferNames.splice(index, 1);
      }
    }

    // TODO
    addUsedProgramName (programName) {

    }

    destroy () {
      if (this.usedBufferNames) deleteBuffersNamed(this.usedBufferNames);
      super.destroy();
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

  // Empty element drawn at the end of every render to copy the webgl canvas over
  // if necessary LOL
  const FINAL_ELEMENT = new GraphemeElement();

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
    constructor (graphemeContext) {
      super();

      // Grapheme context this window is a child of
      this.context = graphemeContext;

      // Add this window to the context's list of windows
      graphemeContext.canvases.push(this);

      // Element to be put into the webpage
      this.domElement = document.createElement('div');

      // The canvas of a GraphemeWindow
      this.canvas = document.createElement('canvas');
      this.domElement.appendChild(this.canvas);

      // CSS stuffs
      this.canvas.classList.add('grapheme-canvas');
      this.domElement.classList.add('grapheme-window');

      // Get the contexts
      this.canvasCtx = this.canvas.getContext('2d');
      assert(this.canvasCtx, "This browser doesn't support 2D canvas, what the heck");

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
      const ctx = this.canvasCtx;

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

      // Update the parent context, in case it needs to be resized as well to fit
      // a potentially fatter canvas
      this.context.updateSize();

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

      // Delete this window from the parent context
      this.context.removeWindow(this);

      // Update the canvas size of the parent context
      this.context.updateSize();

      // Destroy the elements too, if desired
      super.destroy();

      // Delete some references
      delete this.canvas;
      delete this.domElement;
      delete this.canvasCtx;
    }

    clear () {
      // Clear the canvas
      this.canvasCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    }

    beforeRender (element) {
      if (element instanceof WebGLGraphemeElement) {
        if (this.needsContextPrepared) {
          this.context.prepareForWindow(this);

          this.needsCanvasPrepared = false;
        }

        this.needsCanvasCopy = true;
      } else {
        if (this.needsContextCopy) {
          const ctx = this.canvasCtx;

          ctx.save();

          ctx.resetTransform();
          ctx.imageSmoothingEnabled = false;

          // Copy the glCanvas over
          ctx.drawImage(this.context.glCanvas);

          ctx.restore();

          this.needsCanvasCopy = false;
        }

        this.needsCanvasPrepared = true;
      }
    }

    render () {
      // Canvas may need to do some stuff
      this.needsCanvasPrepared = true;
      this.needsCanvasCopy = false;

      const { cssWidth, cssHeight, canvasWidth, canvasHeight, labelManager, canvasCtx } = this;

      // ID of this render
      const renderID = getRenderID();
      labelManager.currentRenderID = renderID;

      // Render information to be given to elements. Namely,
      // dims: {cssWidth, cssHeight, canvasWidth, canvasHeight, dpr}
      // labelManager
      // canvasCtx
      // window
      const renderInfo = {
        dims: { cssWidth, cssHeight, canvasWidth, canvasHeight },
        labelManager,
        canvasCtx,
        window: this
      };

      this.resetCanvasCtxTransform();

      let err; // potential error in try {...} catch
      try {
        // Clear this canvas
        this.clear();

        // Render all children
        super.render(renderInfo);

        // Copy the webgl canvas over if needed
        FINAL_ELEMENT.render(renderInfo);

        // Get rid of old labels
        labelManager.cleanOldRenders();
      } catch (e) {
        err = e;
      }

      if (err) throw err
    }
  }

  /**
  The GLResourceManager stores GL resources on a per-context basis. This allows the
  separation of elements and their drawing buffers in a relatively complete way.

  It is given a gl context to operate on, and creates programs in manager.programs
  and buffers in manager.buffers. programs and buffers are simply key-value pairs
  which objects can create (and destroy) as they please.

  It also (TODO) does some convenient gl manipulations, like setting uniforms and attrib
  arrays... because I'm sick of writing that so much
  */
  class GLResourceManager {
    // Compiled programs and created buffers

    constructor (gl) {
      this.gl = gl;
      this.programs = {};
      this.buffers = {};
    }

    // Compile a program and store it in this.programs
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

    // Return whether this has a program with that name
    hasProgram (programName) {
      return !!this.programs[programName]
    }

    // Retrieve a program to use
    getProgram (programName) {
      return this.programs[programName]
    }

    // Delete a program
    deleteProgram (programName) {
      if (!this.hasProgram(programName)) return

      {
        const programInfo = this.programs[programName];
        this.gl.deleteProgram(programInfo.program);
      }

      // Remove the key from this.programs
      delete this.programs[programName];
    }

    // Create a buffer with the given name
    createBuffer (bufferName) {
      if (this.hasBuffer(bufferName)) return

      const { gl } = this;

      // Create a new buffer
      this.buffers[bufferName] = gl.createBuffer();
    }

    hasBuffer (bufferName) {
      return !!this.buffers[bufferName]
    }

    getBuffer (bufferName) {
      if (!this.hasBuffer(bufferName)) this.createBuffer(bufferName);
      return this.buffers[bufferName]
    }

    deleteBuffer (bufferName) {
      if (!this.hasBuffer(bufferName)) return
      const buffer = this.getBuffer(bufferName);

      // Delete the buffer from GL memory
      this.gl.deleteBuffer(buffer);
      delete this.buffers[bufferName];
    }
  }

  class GraphemeContext {
    constructor () {
      // Creates an offscreen canvas to draw to, with an initial size of 1x1
      this.glCanvas = OffscreenCanvas ? new OffscreenCanvas(1, 1) : document.createElement('canvas');

      // Create the webgl context!
      const gl = this.gl = this.glCanvas.getContext('webgl') || this.glCanvas.getContext('experimental-webgl');

      // The gl context must exist, otherwise Grapheme will be pissed (that rhymed)
      assert(gl, 'Grapheme requires WebGL to run; please get a competent browser');

      // The gl resource manager for this context
      this.glManager = new GLResourceManager(gl);

      // The list of canvases that this context has jurisdiction over
      this.canvases = [];

      // Add this to the list of contexts to receive event updates and such
      CONTEXTS.push(this);
    }

    // Set the drawing viewport on glCanvas
    setViewport (width, height, x = 0, y = 0, setScissor = true) {
      const gl = this.gl;

      // Check to make sure the viewport dimensions are acceptable
      assert(isPositiveInteger(width) && isPositiveInteger(height) &&
        isNonnegativeInteger(x) && isNonnegativeInteger(y),
      'x, y, width, height must be integers greater than 0 (or = for x,y)');
      assert(x + width <= this.canvasWidth && y + height <= this.canvasHeight, 'viewport must be within canvas bounds');

      // Set the gl viewport accordingly
      gl.viewport(x, y, width, height);

      // If desired, enable scissoring over that rectangle
      if (setScissor) {
        gl.enable(gl.SCISSOR_TEST);
        this.gl.scissor(x, y, width, height);
      } else {
        gl.disable(gl.SCISSOR_TEST);
      }
    }

    prepareForCanvas (canv) {
      const gl = this.gl;

      this.setViewport(canv.canvasWidth, canv.canvasHeight);

      gl.clearColor(0, 0, 0, 0);
      gl.clearDepth(1);

      // Clear depth and color buffers
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    get canvasHeight () {
      return this.glCanvas.height
    }

    onDPRChanged() {
      this.canvases.forEach(canvas => canvas.triggerEvent("dprchanged"));
    }

    get canvasWidth () {
      return this.glCanvas.width
    }

    set canvasHeight (y) {
      y = Math.round(y);

      assert(isPositiveInteger(y) && y < 16384, 'canvas height must be in range [1,16383]');
      this.glCanvas.height = y;
    }

    set canvasWidth (x) {
      x = Math.round(x);

      assert(isPositiveInteger(x) && x < 16384, 'canvas width must be in range [1,16383]');
      this.glCanvas.width = x;
    }

    isDestroyed () {
      return CONTEXTS.indexOf(this) === -1
    }

    // Destroy this context
    destroy () {
      if (this.isDestroyed()) return

      // Remove from lists of contexts
      const index = CONTEXTS.indexOf(this);
      index !== -1 && CONTEXTS.splice(index, 1);

      // Destroy all children
      this.canvases.forEach(canvas => canvas.destroy());

      // destroy resource manager
      this.glManager.destroy();

      // Free up canvas space immediately
      this.canvasWidth = 1;
      this.canvasHeight = 1;

      // Delete references to various stuff
      delete this.glManager;
      delete this.glCanvas;
      delete this.gl;
    }

    // Update the size of this context based on the maximum size of its windows
    updateSize () {
      let maxWidth = 1;
      let maxHeight = 1;

      // Find the max width and height (independently)
      this.canvases.forEach((window) => {
        if (window.canvasWidth > maxWidth) {
          maxWidth = window.canvasWidth;
        }

        if (window.canvasHeight > maxHeight) {
          maxHeight = window.canvasHeight;
        }
      });

      // Set the canvas size accordingly
      this.canvasHeight = maxHeight;
      this.canvasWidth = maxWidth;
    }
  }

  const EVENTS = ["click", "mousemove", "mousedown", "mouseup", "touchstart", "touchend", "touchcancel", "touchmove"];

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
          let callback = (evt) => {this.triggerEvent(evtName, evt);};

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

  class Vec2 {
    constructor (x, y) {
      this.x = x;
      this.y = y;
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

    divide(s) {
      this.x /= s;
      this.y /= s;
      return this
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
      } else {
        return boundingBoxTransform.X([x], box1, box2)[0]
      }
    },
    Y: (y, box1, box2, flipY=true) => {
      if (Array.isArray(y) || isTypedArray(y)) {
        for (let i = 0; i < y.length; ++i) {
          let fractionAlong = (y[i] - box1.y1) / box1.height;

          if (flipY)
            fractionAlong = 1 - fractionAlong;

          y[i] = fractionAlong * box2.height + box2.y1;
        }
      } else {
        return boundingBoxTransform.Y([y], box1, box2)[0]
      }
    },
    XY: (xy, box1, box2, flipX=false, flipY=true) => {
      if (Array.isArray(xy) || isTypedArray(x)) {
        for (let i = 0; i < x.length; i += 2) {
          let fractionAlong = (x[i] - box1.x1) / box1.width;

          if (flipX)
            fractionAlong = 1 - fractionAlong;

          x[i] = fractionAlong * box2.width + box2.x1;

          fractionAlong = (y[i+1] - box1.y1) / box1.height;

          if (flipY)
            fractionAlong = 1 - fractionAlong;

          y[i+1] = fractionAlong * box2.height + box2.y1;
        }
      } else {
        throw new Error("No")
      }
    }
  };

  class Plot2D extends InteractiveCanvas {
    constructor (context) {
      super(context);

      this.plot = this;

      this.plotBox = new BoundingBox(new Vec2(0,0), this.width, this.height);
      this.plotCoords = new BoundingBox(new Vec2(-5, 5), 10, 10);

      this.padding = {top: 0, right: 0, left: 0, bottom: 0};

      this.update();
    }

    pixelToPlotX(x) {
      return boundingBoxTransform.X(x, this.plotBox, this.plotCoords)
    }

    pixelToPlotY(y) {
      return boundingBoxTransform.Y(y, this.plotBox, this.plotCoords)
    }

    pixelToPlot(xy) {
      return boundingBoxTransform.XY(xy, this.plotBox, this.plotCoords)
    }

    plotToPixelX() {
      return boundingBoxTransform.X(x, this.plotCoords, this.plotBox)
    }

    plotToPixelY() {
      return boundingBoxTransform.Y(y, this.plotCoords, this.plotBox)
    }

    plotToPixel() {
      return boundingBoxTransform.XY(x, this.plotCoords, this.plotBox)
    }

    render() {
      this.update();

      super.render();
    }

    update () {
      this.calculatePlotBox();
    }

    calculatePlotBox () {
      this.plotBox = new BoundingBox(new Vec2(0,0), this.width, this.height).pad(this.padding);
    }
  }

  class TestObject extends GraphemeElement {
    constructor() {
      super();
    }

    render(renderInfo) {
      super.render(renderInfo);

      this.plot.plotBox.draw(renderInfo.canvasCtx);
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

  exports.BasicLabel = BasicLabel;
  exports.BoundingBox = BoundingBox;
  exports.Context = GraphemeContext;
  exports.Label2D = Label2D;
  exports.Plot2D = Plot2D;
  exports.TestObject = TestObject;
  exports.Vec2 = Vec2;
  exports.boundingBoxTransform = boundingBoxTransform;

  return exports;

}({}));
