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

  // Check if two numbers are within epsilon of each other
  function isApproxEqual (v, w, eps = 1e-5) {
    return Math.abs(v - w) < eps
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
      context.glResourceManager.deleteBuffer(bufferNames);
    });
  }

  let x = 0;

  function getRenderID () {
    x += 1;
    return x
  }

  /**
  A GraphemeElement is a part of a GraphemeWindow. It has a certain precedence
  (i.e. the order in which it will be drawn onto the GL portion and the 2D canvas portion.)
  */
  class GraphemeElement {
    constructor ({
      precedence = 0,
      visible = true,
      alwaysUpdate = true
    } = {}) {
      // precedence is a number from -Infinity to Infinity.
      this.precedence = precedence;

      // Unique identifier for this object
      this.uuid = generateUUID();

      // Whether this element is drawn on render TODO
      this.visible = visible;

      // The parent of this element
      this.parent = null;

      // Whether to always update geometries when render is called
      this.alwaysUpdate = alwaysUpdate;
    }

    orphanize () {
      if (this.parent) {
        this.parent.remove(this);
      }
    }

    updateGeometries () {

    }

    render (elementInfo) {
      if (this.alwaysUpdate) { this.updateGeometries(); }

      elementInfo.window.beforeRender(this);
    }

    hasChild () {
      return false
    }

    destroy () {
      this.orphanize();
    }

    onDPRChanged () {

    }
  }

  class GraphemeGroup extends GraphemeElement {
    constructor (params = {}) {
      super(params);

      this.children = [];
    }

    onDPRChanged () {
      this.children.forEach(child => child.onDPRChanged());
    }

    sortChildrenByPrecedence () {
      // Sort the children by their precedence value
      this.children.sort((x, y) => x.precedence - y.precedence);
    }

    render (renderInfo) {
      super.render(renderInfo);

      // sort our elements by drawing precedence
      this.sortChildrenByPrecedence();

      this.children.forEach((child) => child.render(renderInfo));
    }

    isChild (element) {
      return this.hasChild(element, false)
    }

    hasChild (element, recursive = true) {
      if (recursive) {
        if (this.hasChild(element, false)) return true
        if (this.children.some((child) => child.hasChild(element, recursive))) return true
        return false
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
      this.children.push(element);

      if (elements.length > 0) {
        this.add(elements);
      }
    }

    remove (element, ...elements) {
      checkType(element, GraphemeElement);
      if (this.hasChild(element, false)) {
        // if element is an immediate child
        const index = this.children.indexOf(element);
        this.children.splice(index, 1);
        element.parent = null;
      }

      if (elements.length > 0) {
        this.remove(elements);
      }
    }

    destroy () {
      this.children.forEach((child) => child.destroy());

      super.destroy();
    }

    /**
    Apply a function to the children of this group. If recursive = true, continue to
    apply this function to the children of all children, etc.
    */
    applyToChildren (func, recursive = true) {
      this.children.forEach(child => {
        if (recursive && child.children) {
          // if child is also a group, apply the function to all children
          child.applyToChildren(func, true);
        }

        func(child);
      });
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
  class GraphemeWindow extends GraphemeGroup {
    constructor (graphemeContext) {
      super();

      // Grapheme context this window is a child of
      this.context = graphemeContext;

      // Add this window to the context's list of windows
      graphemeContext.windows.push(this);

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

      // Whether, on the drawing of a normal GraphemeElement, the webgl canvas should
      // be copied to this canvas
      this.needsContextCopy = false;

      // Has the webgl canvas been prepared to fit this window?
      this.needsContextPrepared = false;

      // Set the default size to 640 by 480 in CSS pixels
      this.setSize(640, 480);

      // Scale text canvas as needed due to DPR
      this.resetCanvasCtxTransform();
    }

    resetCanvasCtxTransform () {
      const ctx = this.canvasCtx;

      for (let i = 0; i < 5; ++i) { // pop off any canvas transforms from the stack
        ctx.restore();
      }

      ctx.scale(dpr, dpr);
      ctx.save();
    }

    // Set the size of this window (including adjusting the canvas size)
    // Note that this width and height are in CSS pixels
    setSize (width, height) {
      // width and weight are in CSS pixels
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
    set canvasHeight (x) {
      x = Math.round(x);
      assert(isPositiveInteger(x) && x < 16384, 'canvas height must be in range [1,16383]');

      this.canvas.height = x;
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

    isActive () {
      return (this.context.currentWindow === this)
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

      // Set the active window to this window, since this is the window being rendered
      this.context.currentWindow = this;

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
      } finally {
        this.context.currentWindow = null;
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

      const programInfo = { program: glProgram, uniforms, attribs: vertexAttribs };
      this.programs[programName] = programInfo;
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
      const buffer = gl.createBuffer();

      this.buffers[bufferName] = buffer;
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
      this.glResourceManager = new GLResourceManager(gl);

      // The list of windows that this context has jurisdiction over
      this.windows = [];

      // The window that is currently being drawn (null if none)
      this.currentWindow = null;

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

    prepareForWindow (window) {
      const gl = this.gl;

      this.setViewport(window.canvasWidth, window.canvasHeight);

      gl.clearColor(0, 0, 0, 0);
      gl.clearDepth(1);

      // Clear depth and color buffers
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    get canvasHeight () {
      return this.glCanvas.height
    }

    get canvasWidth () {
      return this.glCanvas.width
    }

    set canvasHeight (x) {
      x = Math.round(x);

      assert(isPositiveInteger(x) && x < 16384, 'canvas height must be in range [1,16383]');
      this.glCanvas.height = x;
    }

    set canvasWidth (x) {
      x = Math.round(x);

      assert(isPositiveInteger(x) && x < 16384, 'canvas width must be in range [1,16383]');
      this.glCanvas.width = x;
    }

    onDPRChanged () {
      this.windows.forEach((window) => window.onDPRChanged());
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
      this.windows.forEach((window) => window.destroy());

      // destroy resource manager
      this.glResourceManager.destroy();

      // Free up canvas space immediately
      this.canvasWidth = 1;
      this.canvasHeight = 1;

      // Delete references to various stuff
      delete this.glResourceManager;
      delete this.glCanvas;
      delete this.gl;
    }

    // Create a window using this context
    createWindow () {
      return new GraphemeWindow(this)
    }

    // Remove a window from this context
    removeWindow (window) {
      const allWindows = this.context.windows;
      const thisIndex = allWindows.indexOf(window);

      if (thisIndex !== -1) allWindows.splice(thisIndex, 1);
    }

    destroyWindow (window) {
      window.destroy();
    }

    // Update the size of this context based on the maximum size of its windows
    updateSize () {
      let maxWidth = 1;
      let maxHeight = 1;

      // Find the max width and height (independently)
      this.windows.forEach((window) => {
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
  }

  class LineStyle {
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
        arrowhead = null, // arrowhead to draw
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

  class PolylineBase extends GraphemeElement {
    constructor (params = {}) {
      super(params);

      let {
        style,
        vertices = []
      } = params;

      if (!(style instanceof LineStyle)) {
        style = new LineStyle(style || {});
      }

      this.style = style;
      this.vertices = vertices;
    }
  }

  class PolylineElement extends PolylineBase {
    constructor (params = {}) {
      super(params);

      this.mainPath = null;
      this.arrowPath = null;
    }

    updateGeometries () {
      const path = new Path2D();
      this.mainPath = path;

      const arrowPath = new Path2D();
      this.arrowPath = arrowPath;

      const vertices = this.vertices;

      // Nothing to draw
      if (vertices.length < 4) {
        return
      }

      const coordinateCount = vertices.length;
      const { arrowhead, arrowLocations, thickness } = this.style;

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

    render (renderInfo) {
      super.render(renderInfo);

      const ctx = renderInfo.canvasCtx;

      this.style.prepareContext(ctx);
      ctx.stroke(this.mainPath);
      ctx.fill(this.arrowPath);
    }
  }

  class Vec2 {
    constructor (x, y) {
      this.x = x;
      this.y = y;
    }

    length () {
      return Math.hypot(this.x, this.y)
    }

    add (vec) {
      return new Vec2(this.x + vec.x, this.y + vec.y)
    }

    subtract (vec) {
      return new Vec2(this.x - vec.x, this.y - vec.y)
    }

    lengthSquared () {
      return (this.x * this.x + this.y * this.y)
    }

    clone () {
      return new Vec2(this.x, this.y)
    }

    dot (vec) {
      return this.x * vec.x + this.y * vec.y
    }

    scale (s) {
      return new Vec2(this.x * s, this.y * s)
    }

    scaleAround (vec, s) {
      return new Vec2((this.x - vec.x) * s + vec.x, (this.y - vec.y) * s + vec.y)
    }

    rotate (angleRad) { // counterclockwise about origin
      const c = Math.cos(angleRad);
      const s = Math.sin(angleRad);

      return new Vec2(this.x * c - this.y * s, this.x * s + this.y * c)
    }

    rotateAround (vec, angleRad) {
      return this.minus(vec).rotate(angleRad).add(vec)
    }

    refAngle () {
      return Math.atan2(this.y, this.x)
    }

    unit () {
      const len = this.length();

      return new Vec2(this.x / len, this.y / len)
    }

    set (x, y) {
      this.x = x;
      this.y = y;
    }

    asArray () {
      return [this.x, this.y]
    }

    hasNaN () {
      return Number.isNaN(this.x) || Number.isNaN(this.y)
    }
  }

  const N = new Vec2(0, -1);
  const S = new Vec2(0, 1);
  const E = new Vec2(1, 0);
  const W = new Vec2(-1, 0);

  const NE = N.add(E).unit();
  const NW = N.add(W).unit();
  const SE = S.add(E).unit();
  const SW = S.add(W).unit();

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

      const p1 = vertices[0].scale(scale).rotate(angle).add(translateV);
      let jumpToNext = false;

      path.moveTo(p1.x, p1.y);

      for (let i = 1; i < vertices.length; ++i) {
        const p = vertices[i].scale(scale).rotate(angle).add(translateV);

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

    getGlyphPath2D (x = 0, y = 0, scale = 1, angle = 0) {
      const path = new Path2D();

      this.addGlyphToPath(path, x, y, scale, angle);

      return path
    }
  }

  /**
  A glyph which creates an arrowhead. Tells you where the arrowhead will be with a Path2D
  return value, but also tells you where the base of the arrowhead is so that you can join it
  up properly.

  Use glyph vertices with thickness 2 */
  class Arrowhead extends Glyph {
    constructor (params = {}) {
      super(params);

      const { length = 0 } = params;
      this.length = length;
    }

    getPath2D (x1, y1, x2, y2, thickness) { // draw an arrow at x2, y2 facing away from x1, y1
      const path = new Path2D();
      const pos = this.addPath2D(path, x1, y1, x2, y2, thickness);

      return {
        path, pos
      }
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

  /* Unicode characters for exponent signs, LOL */
  const exponentReference = {
    '-': String.fromCharCode(8315),
    0: String.fromCharCode(8304),
    1: String.fromCharCode(185),
    2: String.fromCharCode(178),
    3: String.fromCharCode(179),
    4: String.fromCharCode(8308),
    5: String.fromCharCode(8309),
    6: String.fromCharCode(8310),
    7: String.fromCharCode(8311),
    8: String.fromCharCode(8312),
    9: String.fromCharCode(8313)
  };

  /* Convert a digit into its exponent form */
  function convertChar (c) {
    return exponentReference[c]
  }

  /* Convert an integer into its exponent form (of Unicode characters) */
  function exponentify (integer) {
    assert(isInteger(integer), 'needs to be an integer');

    const stringi = integer + '';
    let out = '';

    for (let i = 0; i < stringi.length; ++i) {
      out += convertChar(stringi[i]);
    }

    return out
  }

  // Credit: https://stackoverflow.com/a/20439411
  /* Turns a float into a pretty float by removing dumb floating point things */
  function beautifyFloat (f, prec = 12) {
    const strf = f.toFixed(prec);
    if (strf.includes('.')) {
      return strf.replace(/\.?0+$/g, '')
    } else {
      return strf
    }
  }

  // Multiplication character
  const CDOT = String.fromCharCode(183);

  const defaultLabel = x => {
    if (x === 0) return '0' // special case
    else if (Math.abs(x) < 1e5 && Math.abs(x) > 1e-5) {
    // non-extreme floats displayed normally
      return beautifyFloat(x)
    } else {
      // scientific notation for the very fat and very small!

      const exponent = Math.floor(Math.log10(Math.abs(x)));
      const mantissa = x / (10 ** exponent);

      const prefix = (isApproxEqual(mantissa, 1) ? ''
        : (beautifyFloat(mantissa, 8) + CDOT));
      const exponentSuffix = '10' + exponentify(exponent);

      return prefix + exponentSuffix
    }
  };

  /** Class representing a style of tickmark, with a certain thickness, color position, and possibly with text */
  class AxisTickmarkStyle {
    /**
     * Create an AxisTickmarkStyle.
     * @param {Object} params - The parameters of the tickmark style.
     * @param {number} params.length - The length of the tickmark, measured perpendicular to the axis.
     * @param {number} params.positioning - The position of the tickmark relative to the axis. A value of 1 indicates it is entirely to the left of the axis, and a value of -1 indicates it is entirely to the right of the axis. The values in between give linear interpolations between these two positions.
     * @param {number} params.thickness - The thickness of the tickmark.
     * @param {Color} params.color - The color of the tickmark.
     * @param {Boolean} params.displayText - Whether to display text.
     */
    constructor ({
      length = 10,
      positioning = 0,
      thickness = 2,
      color = new Color(),
      displayLabels = false,
      displayTicks = true,
      labelAnchoredTo = 1, // 1 is right of tickmark, 0 is middle of tickmark, -1 is left of tickmark
      labelPadding = 2,
      labelStyle = new Label2DStyle(),
      labelFunc = defaultLabel
    } = {}) {
      this.length = length;
      this.positioning = positioning;
      this.thickness = thickness;
      this.color = color;
      this.displayLabels = displayLabels;
      this.displayTicks = displayTicks;
      this.labelAnchoredTo = labelAnchoredTo;
      this.labelPadding = labelPadding;
      this.labelStyle = labelStyle;
      this.labelFunc = labelFunc;
    }

    /**
     * Add a set of tickmarks with given positions and a certain linear transformation to a Simple2DGeometry for later rendering.
     * Reference theory/class_theory/axis_tickmark_style.jpg for explanation.
     * @param {Object} transformation - A transformation from axis coordinates (x1-x2) to canvas coordinates (v1-v2)
     * @param {number} transformation.x1 - The first axis coordinate, corresponding to the point v1.
     * @param {number} transformation.x2 - The second axis coordinate, corresponding to the point v2.
     * @param {Vec2} transformation.v1 - The first canvas point, corresponding to the axis coordinate x1.
     * @param {Vec2} transformation.v2 - The second canvas point, corresponding to the axis coordinate x2.
     * @param {Array} positions - An array of numbers or objects containing a .value property which are the locations, in axis coordinates, of where the tickmarks should be generated.
     * @param {Simple2DGeometry} geometry - A Simple2DGeometry to which the tickmarks should be emitted.
     */
    createTickmarks (transformation, positions, polyline, label2dset) {
      polyline.vertices = [];
      polyline.style.thickness = this.thickness;
      polyline.style.color = this.color;
      polyline.endcapType = 'butt';

      // Note that "s" in class theory is positioning, and "t" is thickness
      const { positioning, length } = this;
      const { v1, v2, x1, x2 } = transformation;
      const axisDisplacement = v2.subtract(v1);

      // vectors as defined in class_theory
      const upsilon = axisDisplacement.unit().rotate(Math.PI / 2);

      label2dset.texts = [];
      label2dset.style = this.labelStyle;

      for (let i = 0; i < positions.length; ++i) {
        let givenPos = positions[i];
        if (givenPos.value) { givenPos = givenPos.value; }

        const pos = axisDisplacement.scale((givenPos - x1) / (x2 - x1)).add(v1);
        const lambda = upsilon.scale((positioning + 1) / 2 * length).add(pos);
        const omicron = upsilon.scale((positioning - 1) / 2 * length).add(pos);

        // Create a rectangle for the tick
        polyline.vertices.push(...omicron.asArray(), ...lambda.asArray(), NaN, NaN);

        if (this.displayLabels) {
          const textS = this.labelAnchoredTo;
          const position = lambda.scale((textS + 1) / 2).add(omicron.scale((1 - textS) / 2)).add(upsilon.scale(this.labelPadding));

          label2dset.texts.push({ text: this.labelFunc(givenPos), pos: position });
        }
      }
    }
  }

  class Label2DSet extends GraphemeElement {
    constructor (params = {}) {
      super(params);

      this.style = new Label2DStyle();

      // Format: {text: "5", pos: Vec2(3,4)}
      this.texts = params.texts ? params.texts : [];
    }

    render (renderInfo) {
      const texts = this.texts; const ctx = renderInfo.canvasCtx;

      ctx.save();

      this.style.prepareContextTextStyle(ctx);

      if (this.style.shadowSize > 0) {
        this.style.prepareContextShadow(ctx);

        for (let i = 0; i < texts.length; ++i) {
          const textInfo = texts[i];
          const { text, pos } = textInfo;

          ctx.strokeText(text, pos.x, pos.y);
        }
      }

      this.style.prepareContextFill(ctx);

      for (let i = 0; i < texts.length; ++i) {
        const textInfo = texts[i];
        const { text, pos } = textInfo;

        ctx.fillText(text, pos.x, pos.y);
      }

      ctx.restore();
    }
  }

  /**
  A displayed axis, potentially with tick marks of various types,
  potentially with labels, and potentially with an arrow. The position of the axis
  (and the transformation it entails) is determined by six variables: start, end,
  marginStart, marginEnd, xStart and xEnd. start is a Vec2, in canvas pixels, of
  the start of the axis; the same is true for end. marginStart is a number of canvas
  pixels which represents an "unused" portion of the axis at the beginning of the axis;
  it can be 0. marginEnd is the same for the end of the axis; if there is an arrow at
  the end of the axis, it will automatically be set to 1.5 * the length of the arrowhead.
  xStart is the REPRESENTED coordinate at marginStart in from start. xEnd is the
  REPRESENTED coordinate at marginEnd in from end.

  Tickmarks must be divided into certain style classes, though the number of such
  classes is unlimited. The style of each tickmark is defined by the AxisTickmarkStyle
  class, which abstracts their relative position to the axis, thickness, etc. This
  style also deals with labels, and Axis doesn't have to think about labels too hard.
  These style classes are given as key value pairs in a "tickmarkStyles" object,
  where the keys are the named of the style classes (ex: "big" to be used for integers,
  "small" to be used for nonintegers). The positions of the tickmarks themselves are
  given in the tickmarkPositions object, which is another set of key value pairs.
  The keys are the style classes and the values are arrays of tickmark positions. To
  support things like arbitrary-precision arithmetic in the future, these positions
  may either be NUMBERS, which will be simply transformed using the Axis's defined
  linear transformation to pixel space, or OBJECTS with a "value" property. The reason
  we may want OBJECTS is for labeling reasons. For example, suppose we want to label
  a bunch of rational numbers in (0,1). Then we could define a labelFunction which
  takes in a number and outputs a string form of a rational number close to that number,
  but that's annoying. Instead, we give the positions of the tickmarks as objects of
  the form {num: p, den: q, value: p/q}, so that Axis transforms them according to their
  numerical value while the labelFunction still has information on the numerator and
  denominator.

  @extends Group
  */
  class Axis extends GraphemeGroup {
    /**
     * Create an axis.
     * @param {Object} params - The parameters of the axis. Also inherits parameters from GraphemeGroup.
     * @param {Vec2} params.start - The position, in canvas pixels, of the start of the axis.
     * @param {Vec2} params.end - The position, in canvas pixels, of the end of the axis.
     * @param {Object} params.margins - Information about the margins of the axis.
     * @param {number} params.margins.start - Length in canvas pixels of the starting margin.
     * @param {number} params.margins.end - Length in canvas pixels of the ending margin.
     * @param {Boolean} params.margins.automatic - Whether to calculate the margins automatically. If this is true, updateGeometries() will overwrite margins.start and margins.end.
     * @param {number} params.xStart - The axis coordinate associated with the start of the axis.
     * @param {number} params.xEnd - The axis coordinate associated with the end of the axis.
     * @param {Object} params.tickmarkStyles - An optional object containing key value pairs of AxisTickmarkStyles, where the keys are the names of the styles and the values are the styles.
     * @param {Object} params.tickmarkPositions - An optional object containing key value pairs of tickmark position arrays, where the keys are the names of those tickmarks' styles and the values are the positions, in axis coordinates, of the tickmarks.
     * @param {number} params.arrowLocations - Where the arrows of the axis are.
     * @param {number} params.arrowType - The type of the arrows of the axis.
     * @param {number} params.thickness - The thickness of the axis.
     * @param {Color} params.color - The color of the axis.
     * @param {number} params.endcapType - The type of endcap of the axis.
     * @param {number} params.endcapRes - The angular resolution of the endcap.
     */
    constructor (params = {}) {
      super(params);

      const {
        start = new Vec2(0, 0),
        end = new Vec2(100, 0),
        xStart = 0,
        xEnd = 1,
        tickmarkStyles = {},
        tickmarkPositions = {},
        style = {}
      } = params;

      const margins = Object.assign({ start: 0, end: 0, automatic: true }, params.margins || {});

      this.start = start;
      this.end = end;
      this.margins = margins;
      this.xStart = xStart;
      this.xEnd = xEnd;
      this.tickmarkStyles = tickmarkStyles;
      this.tickmarkPositions = tickmarkPositions;

      // Used internally, no need for the user to touch it. Unless there's a bug.
      // Then I have to touch it. Ugh.
      this.axisComponents = {
        tickmarkPolylines: {},
        tickmarkLabels: {},
        axispolyline: new PolylineElement(Object.assign({
          // Some sensible default values
          arrowLocations: -1,
          arrowType: 0,
          thickness: 2,
          color: new Color()
        }, style))
      };

      // Style of the main axis line
      this.style = this.axisComponents.axispolyline.style;
    }

    /**
     * setAllColorsTo - Set the color of the axis and the colors of all tickmarkstyles under this axis to a given color.
     *
     * @param  {Color} color The color to use.
     */
    setAllColorsTo (color) {
      checkType(color, Color);
      this.color = color;

      this.tickmarkStyles.forEach(tickmarkStyle => { tickmarkStyle.color = color; });
    }

    /**
     * calculateMargins - Calculate the margins of the axis, given the size of the arrows.
     */
    calculateMargins () {
      const style = this.style;

      const arrowLocations = style.arrowLocations;
      const arrowLength = style.arrowhead ? style.arrowhead.length : 0;

      this.margins.start = 0;
      this.margins.end = 0;

      if (arrowLocations.includes('start') || arrowLocations.includes('substart')) {
        this.margins.start = 3 * arrowLength * this.style.thickness;
      }

      if (arrowLocations.includes('end') || arrowLocations.includes('subend')) {
        this.margins.end = 3 * arrowLength * this.style.thickness;
      }
    }

    /**
     * updatetickmarkPolylines - Update the tickmark geometries by going through each tickmark style and generating the relevant geometries.
     */
    updatetickmarkPolylines () {
      const tickmarkPolylines = this.axisComponents.tickmarkPolylines;
      const tickmarkLabels = this.axisComponents.tickmarkLabels;
      const axisDisplacement = this.end.subtract(this.start);
      const axisLength = axisDisplacement.length();

      if (axisLength < 3 * (this.marginStart + this.marginEnd) ||
        this.marginStart < 0 || this.marginEnd < 0 || axisLength < 5) {
        // No thx
        return
      }

      const axisDisplacementDir = axisDisplacement.unit();

      // The transformation defined by this axis
      const transformation = {
        v1: this.start.add(axisDisplacementDir.scale(this.margins.start)),
        v2: this.end.subtract(axisDisplacementDir.scale(this.margins.end)),
        x1: this.xStart,
        x2: this.xEnd
      };

      // For every type of tickmark
      for (const styleName in this.tickmarkStyles) {
        const style = this.tickmarkStyles[styleName];
        const positions = this.tickmarkPositions[styleName];

        if (!positions) continue

        let polyline = tickmarkPolylines[styleName];
        if (!polyline) {
          polyline = new PolylineElement();
          polyline.alwaysUpdate = false;
          this.add(polyline);

          tickmarkPolylines[styleName] = polyline;
        }

        let labels = tickmarkLabels[styleName];
        if (!labels) {
          labels = new Label2DSet();
          this.add(labels);

          tickmarkLabels[styleName] = labels;
        }

        // Create some tickmarks!
        style.createTickmarks(transformation, positions, polyline, labels);
        polyline.updateGeometries();
      }

      for (const polylineName in this.tickmarkPolylines) {
        if (!this.tickmarkStyles[polylineName]) {
          const unusedpolyline = this.tickmarkPolylines[polylineName];

          // unused polyline, destroy it
          this.remove(unusedpolyline);
          unusedpolyline.destroy();

          delete this.tickmarkPolylines[polylineName];
        }
      }

      for (const labelName in this.tickmarkLabels) {
        if (!this.tickmarkStyles[labelName]) {
          const unusedLabels = this.tickmarkLabels[labelName];

          this.remove(unusedLabels);
          unusedLabels.destroy();

          delete this.tickmarkLabels[labelName];
        }
      }
    }

    /**
     * updateAxispolyline - Update the PolylineElement which is the main axis itself.
     */
    updateAxispolyline () {
      const axispolyline = this.axisComponents.axispolyline;
      axispolyline.precedence = 1; // put it on top of the tickmarks
      axispolyline.alwaysUpdate = false;

      // Axis polyline connects these two vertices
      axispolyline.vertices = [...this.start.asArray(), ...this.end.asArray()];
      axispolyline.updateGeometries();

      if (!this.hasChild(axispolyline)) { this.add(axispolyline); }
    }

    /**
     * updateGeometries - Update the geometries of this axis for rendering.
     */
    updateGeometries () {
      if (this.margins.automatic) { this.calculateMargins(); }
      this.updatetickmarkPolylines();
      this.updateAxispolyline();
    }

    destroy () {
      super.destroy(); // this will destroy all the child geometries

      delete this.axisComponents;
    }

    render (renderInfo) {
      super.render(renderInfo);
    }
  }

  /** General class dealing with drawing demarcations of things. In particular, given
  a length in CSS space corresponding to the length between which demarcations should
  be drawn, as well as the x starting and x ending points of the demarcation, it will
  emit demarcations of a variety of classes corresponding to various methods of
  dividing up a line. */

  class DemarcationStrategizer {
    constructor (params = {}) {
      const {
        start = 0,
        end = 1,
        length = 500 // in CSS pixels
      } = params;

      this.start = start;
      this.end = end;
      this.length = length;
    }

    axisLength () {
      return Math.abs(this.end - this.start)
    }
  }

  const MAX_DEMARCATIONS = 1000;

  /** A strategizer with three types: zero, main, and sub, where the main
  and sub. The axis distance between main demarcations is mainLength and the number of
  subdivisions is subdivs */
  class MainSubDemarcationStrategizer extends DemarcationStrategizer {
    constructor (params = {}) {
      super(params);

      const {
        mainLength = 10,
        subdivs = 5
      } = params;

      this.mainLength = mainLength;
      this.subdivs = subdivs;
    }

    getDemarcations () {
      // Whee!!
      let end = this.end; let start = this.start;

      if (end < start) {
        const t = end;
        end = start;
        start = t;
      }

      const zero = [];
      const main = [];
      const sub = [];

      const { mainLength, subdivs } = this;

      const xS = Math.ceil(start / mainLength);
      const xE = Math.floor(end / mainLength);

      if (subdivs * (xS - xE) > MAX_DEMARCATIONS) {
        throw new Error('too many demarcations!!')
      }

      for (let i = xS; i <= xE; ++i) {
        if (i === 0) {
          zero.push(0);
          continue
        }

        const pos = mainLength * i;
        main.push(pos);
      }

      const yS = Math.ceil(subdivs * start / mainLength);
      const yE = Math.floor(subdivs * end / mainLength);

      for (let i = yS; i <= yE; ++i) {
        if (i % subdivs === 0) { // already emitted as a main
          continue
        }

        const pos = mainLength / subdivs * i;
        sub.push(pos);
      }

      return { zero, main, sub }
    }
  }

  /** This strategizer divides the line into one of three classes:

  zero: a demarcation reserved only for the value 0
  main: a demarcation for major things (perhaps integers)
  sub: a demarcation for less major things

  The way that this works is that we give the strategizer some potential subdivisions.
  In particular, we give it an array of potential subdivisions {main, sub}, where main
  is the absolute distance (in axis coordinates) between main demarcations and sub
  is the number of sub demarcations to be used within that distance. More precisely, the
  distance between sub demarcations will be main / sub. This is used to prevent annoying
  float errors. main and sub must be positive integers. The strategizer will consider
  any demarcation pattern of the form 10^n * {main, sub}, where n is an integer. The best
  such pattern is chosen by the closeness in CSS pixels between sub demarcations to
  the ideal distance between those demarcations, idealSubDist. If multiple patterns
  satisfy this, the last one in the list of demarcations will be chosen.
  */
  class StandardDemarcationStrategizer extends MainSubDemarcationStrategizer {
    constructor (params = {}) {
      super(params);

      const {
        patterns = [
          { main: 10, sub: 5 },
          { main: 5, sub: 5 },
          { main: 4, sub: 4 }
        ],
        idealSubDist = 60 // CSS pixels
      } = params;

      this.idealSubDist = idealSubDist;
      this.patterns = patterns;
    }

    getDemarcations () {
      const { patterns, idealSubDist, start, end, length } = this;

      // for each pattern, find the most optimal pattern based on powers of 10 and
      // see if that is indeed the best
      let bestMain = 0;
      let bestSubdivs = 0;
      let currentError = Infinity;

      for (let i = 0; i < patterns.length; ++i) {
        const pattern = patterns[i];

        const ne = Math.round(Math.log10(idealSubDist * (end - start) / length * pattern.sub / pattern.main));
        const scaling = Math.pow(10, ne);

        const error = Math.abs(pattern.main / pattern.sub * length / (end - start) * scaling - idealSubDist);

        if (error < currentError) {
          bestMain = pattern.main * scaling;
          bestSubdivs = pattern.sub;
          currentError = error;
        }
      }

      if (currentError === Infinity) {
        throw new Error('No happy demarcations')
      }

      this.mainLength = bestMain;
      this.subdivs = bestSubdivs;

      return super.getDemarcations()
    }
  }

  class AutoAxis extends Axis {
    constructor (params = {}) {
      super(Object.assign({
        tickmarkStyles: {
          main: new AxisTickmarkStyle({ displayLabels: true, labelStyle: new Label2DStyle({ fontSize: 24, dir: 'S' }) }),
          sub: new AxisTickmarkStyle({ length: 5 }),
          zero: new AxisTickmarkStyle({ displayTicks: false, displayLabels: true, labelStyle: new Label2DStyle({ fontSize: 24, dir: 'S' }) })
        }
      }, params));

      const { strategizer = new StandardDemarcationStrategizer() } = params;

      this.strategizer = strategizer;
    }

    autoTickmarks () {
      const strategizer = this.strategizer;

      strategizer.start = this.xStart;
      strategizer.end = this.xEnd;
      strategizer.length = this.start.subtract(this.end).length();

      this.tickmarkPositions = strategizer.getDemarcations();
    }

    updateGeometries () {
      this.autoTickmarks();

      super.updateGeometries();
    }
  }

  exports.Arrowheads = Arrowheads;
  exports.AutoAxis = AutoAxis;
  exports.Context = GraphemeContext;
  exports.E = E;
  exports.Group = GraphemeGroup;
  exports.N = N;
  exports.NE = NE;
  exports.NW = NW;
  exports.PolylineElement = PolylineElement;
  exports.S = S;
  exports.SE = SE;
  exports.SW = SW;
  exports.Vec2 = Vec2;
  exports.W = W;

  return exports;

}({}));
