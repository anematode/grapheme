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
      CONTEXTS.forEach((context) => context._onDPRChanged());
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

      // Whether this element is drawn on renderIfVisible()
      this.visible = visible;

      // List of buffer names used, for easy cleanup when the object is destroyed
      this.usedBufferNames = [];

      // The parent of this element
      this.parent = null;

      // Whether to always update geometries when render is called
      this.alwaysUpdate = alwaysUpdate;
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

    orphanize () {
      if (this.parent) {
        this.parent.remove(this);
      }
    }

    renderIfVisible(renderInfo) {
      if (this.visible) {
        this.render(renderInfo);
      }
    }

    render (elementInfo) {
      // No need to call this as a child class
    }

    hasChild () {
      return false
    }

    destroy () {
      if (this.usedBufferNames) deleteBuffersNamed(this.usedBufferNames);

      this.orphanize();
    }
  }

  class GraphemeGroup extends GraphemeElement {
    constructor (params = {}) {
      super(params);

      this.children = [];
    }

    sortChildrenByPrecedence () {
      // Sort the children by their precedence value
      this.children.sort((x, y) => x.precedence - y.precedence);
    }

    renderIfVisible (renderInfo) {
      this.sortChildrenByPrecedence();

      this.children.forEach((child) => child.renderIfVisible(renderInfo));
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

  function rgba (r, g, b, a = 255) {
    return new Color({
      r, g, b, a
    })
  }

  const DEFAULT_SIZE = [640, 480];

  /** A grapheme window is an actual viewable instance of Grapheme.
  That is, it is a div that can be put into the DOM and manipulated (and seen).

  Properties:
  domElement = the div that the user adds to the webpage
  glCanvas = the bitmap canvas that gl stuff is copied to
  textCanvas = the canvas that text and stuff is done on
  context = the parent Grapheme.Context of this window
  glCanvasContext = the ImageBitmapRenderingContext associated with the glCanvas
  textCanvasContext = the Canvas2DRenderingContext associated with the textCanvas
  */
  class GraphemeWindow extends GraphemeGroup {
    constructor (graphemeContext) {
      super();

      // Grapheme context this window is a child of
      this.context = graphemeContext;

      // Element to be put into the webpage
      this.domElement = document.createElement('div');

      // The two canvases of a GraphemeWindow
      this.mainCanvas = document.createElement('canvas');
      this.domElement.appendChild(this.mainCanvas);
      this.textCanvas = document.createElement('canvas');
      this.domElement.appendChild(this.textCanvas);

      // CSS stuffs
      this.mainCanvas.classList.add('grapheme-canvas');
      this.textCanvas.classList.add('grapheme-text-canvas');
      this.domElement.classList.add('grapheme-window');

      // Get the contexts
      this.mainCanvasContext = this.mainCanvas.getContext('bitmaprenderer');
      this.textCanvasContext = this.textCanvas.getContext('2d');

      // The color of the background
      this.backgroundColor = rgba(0, 0, 0, 0);

      // Add this window to the context's list of window
      graphemeContext.windows.push(this);

      // Set the default size to 640 by 480 in CSS pixels
      this.setSize(...DEFAULT_SIZE);

      // Scale text canvas as needed due to DPR
      this._scaleTextCanvasToDPR();
    }

    _scaleTextCanvasToDPR() {
      let ctx = this.textCanvasContext;

      for (let i = 0; i < 5; ++i) { // pop off any canvas transforms from the stack
        ctx.restore();
      }

      ctx.scale(dpr, dpr);
      ctx.save();
    }

    // Set the size of this window (including adjusting the canvas size)
    // Note that this width and height are in
    setSize (width, height) {
      // cssWidth and cssHeight are in CSS pixels
      this.cssWidth = width;
      this.cssHeight = height;

      // Update the canvas size, factoring in the device pixel ratio
      this._updateCanvasSize();

      // Set the canvas CSS size using CSS
      [this.mainCanvas, this.textCanvas].forEach((canvas) => {
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      });

      // Update the parent context, in case it needs to be resized as well to fit
      // a potentially fatter canvas
      this.context.updateSize();
    }

    // Set the actual canvas pixel size based on the desired width and the DPR
    _updateCanvasSize () {
      this.canvasWidth = this.cssWidth * dpr;
      this.canvasHeight = this.cssHeight * dpr;
    }

    // Returns the pixel width of the canvas
    get canvasWidth () {
      return this.mainCanvas.width
    }

    // Returns the pixel height of the canvas
    get canvasHeight () {
      return this.mainCanvas.height
    }

    // Sets the pixel width of the canvas
    set canvasWidth (x) {
      // Round it to an integer and make sure it's in a reasonable range
      x = Math.round(x);
      assert(isPositiveInteger(x) && x < 16384, 'canvas width must be in range [1,16383]');

      this.mainCanvas.width = x;
      this.textCanvas.width = x;
    }

    // Sets the pixel height of the canvas
    set canvasHeight (x) {
      x = Math.round(x);
      assert(isPositiveInteger(x) && x < 16384, 'canvas height must be in range [1,16383]');

      this.mainCanvas.height = x;
      this.textCanvas.height = x;
    }

    // Event triggered when the device pixel ratio changes
    _onDPRChanged () {
      this._updateCanvasWidth();
      this._scaleTextCanvasToDPR();
    }

    // Destroy this window.
    destroy () {
      // Destroy the domElement
      try {
        this.domElement.parentNode.remove(this.domElement);
      } catch (e) {}

      // Delete this window from the parent context
      this.context._removeWindow(this);

      // Update the canvas size of the parent context
      this.context.updateSize();

      // Destroy the elements too, if desired
      super.destroy();

      // Delete some references
      delete this.mainCanvas;
      delete this.domElement;
      delete this.textCanvas;
      delete this.mainCanvasContext;
      delete this.textCanvasContext;
    }

    isActive () {
      return (this.context.activeWindow === this)
    }

    clearToColor (color = this.backgroundColor) {
      assert(this.isActive(), 'Window is not currently being rendered');

      // color.r, color.g, color.b, color.a
      const glColor = color.glColor();

      const gl = this.context.glContext;

      gl.clearColor(glColor.r, glColor.g, glColor.b, glColor.a);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    render () {
      // Set the active window to this window, since this is the window being rendered
      this.context.activeWindow = this;

      let err; // potential error in try {...} catch
      const { glCanvas } = this.context;

      const width = this.canvasWidth; const
        height = this.canvasHeight;

      // Render information to be given to elements
      const renderInfo = {
        gl: this.context.glContext,
        glResourceManager: this.context.glResourceManager,
        text: this.textCanvasContext,
        textCanvas: this.textCanvas,
        width,
        height
      };

      try {
        // Set the viewport to this canvas's size
        this.context.setViewport(width, height);

        // clear the canvas
        this.clearToColor();

        // sort our elements by drawing precedence
        this.sortChildrenByPrecedence();

        super.renderIfVisible(renderInfo);

        // Copy the canvas to this canvas
        const glBitmap = glCanvas.transferToImageBitmap();
        this.mainCanvasContext.transferFromImageBitmap(glBitmap);
      } catch (e) {
        err = e;
      } finally {
        this.context.activeWindow = null;
      }

      if (err) throw err
    }
  }

  class InteractiveWindow extends GraphemeWindow {
    constructor (graphemeContext, params = {}) {
      super(graphemeContext, params);
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
      const gl = this.glContext = this.glCanvas.getContext('webgl') || this.glCanvas.getContext('experimental-webgl');

      // The gl context must exist, otherwise Grapheme will be pissed (that rhymed)
      assert(gl, 'Grapheme requires WebGL to run; please get a competent browser');

      // The gl resource manager for this context
      this.glResourceManager = new GLResourceManager(gl);

      // The list of windows that this context has jurisdiction over
      this.windows = [];

      // The portion of the glCanvas being used
      this.currentViewport = {
        x: 0, y: 0, width: this.glCanvas.width, height: this.glCanvas.height
      };

      // Add this to the list of contexts to receive event updates and such
      CONTEXTS.push(this);
    }

    // Set the drawing viewport on glCanvas
    setViewport (width, height, x = 0, y = 0, setScissor = true) {
      const gl = this.glContext;

      // Check to make sure the viewport dimensions are acceptable
      assert(isPositiveInteger(width) && isPositiveInteger(height) &&
        isNonnegativeInteger(x) && isNonnegativeInteger(y),
      'x, y, width, height must be integers greater than 0 (or = for x,y)');
      assert(x + width <= this.canvasWidth && y + height <= this.canvasHeight, 'viewport must be within canvas bounds');

      // Set this.currentViewport to the desired viewport
      this.currentViewport.x = x;
      this.currentViewport.y = y;
      this.currentViewport.width = width;
      this.currentViewport.height = height;

      // Set the gl viewport accordingly
      gl.viewport(x, y, width, height);

      // If desired, enable scissoring over that rectangle
      if (setScissor) {
        gl.enable(gl.SCISSOR_TEST);
        this.glContext.scissor(x, y, width, height);
      } else {
        gl.disable(gl.SCISSOR_TEST);
      }
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

    _onDPRChanged () {
      this.windows.forEach((window) => window._onDPRChanged());
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
      delete this.glContext;
    }

    // Create a window using this context
    createWindow (interactive = true) {
      return new (interactive ? InteractiveWindow : GraphemeWindow)(this)
    }

    // Remove a window from this context
    _removeWindow (window) {
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

    minus (vec) {
      return new Vec2(this.x - vec.x, this.y - vec.y)
    }

    lengthSquared (vec) {
      return (this.x * this.x + this.y * this.y)
    }

    clone () {
      return new Vec2(this.x, this.y)
    }

    dot (vec) {
      return this.x * vec.x + this.y * vec.y
    }

    scale (x) {
      return new Vec2(this.x * x, this.y * x)
    }

    scaleAround (vec, x) {
      return new Vec2((this.x - vec.x) * x + vec.x, (this.y - vec.y) * x + vec.y)
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
  }

  const N = new Vec2(0, -1);
  const S = new Vec2(0, 1);
  const E = new Vec2(1, 0);
  const W = new Vec2(-1, 0);

  const NE = N.add(E).unit();
  const NW = N.add(W).unit();
  const SE = S.add(E).unit();
  const SW = S.add(W).unit();

  // Some functions to draw arrows

  /**
   * TriangularArrow - Constructs a triangular arrow with specified dimensions.
   *
   * @param  {number} arrowLenScale   How many times the thickness of the line the length of the arrow should be
   * @param  {number} arrowWidthScale How many times the thickness of the line the width of the arrow should be
   * @param  {Function} addVertex     Function to call when adding a vertex
   * @param  {number} x2              description
   * @param  {number} y2              description
   * @param  {number} xa              description
   * @param  {number} ya              description
   * @param  {number} th              HALF the thickness of the line this arrow is connected to.
   * @param  {number} duX             description
   * @param  {number} duY             description
   * @param  {number} isStarting      description
   * @return {type}                 description
   */
  function TriangularArrow (arrowLenScale, arrowWidthScale, addVertex, x2, y2, xa, ya, th, duX, duY, isStarting) {
    // Constructs a "triangular arrow" on (x2, y2) facing away from (xa, ya)
    const arrowLen = 2 * th * arrowLenScale;
    const arrowWidth = th * arrowWidthScale;

    let v1x = xa - x2;
    let v1y = ya - y2;
    const v1l = Math.hypot(v1x, v1y);

    if (v1l === 0) return // yeah, I'm not dealing with that

    v1x /= v1l;
    v1y /= v1l;

    // (abx, aby) is base of the arrow
    const abx = x2 + v1x * arrowLen;
    const aby = y2 + v1y * arrowLen;

    const av1x = abx + v1y * arrowWidth;
    const av1y = aby - v1x * arrowWidth;

    const av2x = abx - v1y * arrowWidth;
    const av2y = aby + v1x * arrowWidth;

    function addArrowBaseVertices () {
      addVertex(abx + duY, aby - duX);
      addVertex(abx - duY, aby + duX);
    }

    if (!isStarting) addArrowBaseVertices();

    addVertex(x2, y2);
    addVertex(av1x, av1y);
    addVertex(av2x, av2y);

    if (isStarting) addArrowBaseVertices();
  }

  function ArrowFromPattern (pattern, addVertex, x2, y2, xa, ya, th, duX, duY, isStarting) {
    // The way this works is we take an array of points to feed to TRIANGLE_STRIP,
    // from an idealized arrowhead with vertex at (0, 0) and facing from the right
    // (pointing left) on a line with th = 1. We then rotate, translate and scale this arrowhead
    // to the desired position, thickness and orientation.
    // The last vertex is special, specifying the "base" of the arrow where it will connect
    // to the rest of the polyline.

    const vertices = pattern;

    const angleToRotate = Math.atan2(ya - y2, xa - x2);
    const scaleFactor = th;
    const translationVector = new Vec2(x2, y2);

    for (let i = 0; i < vertices.length; ++i) {
      // trickery to add the last vertex first when on the ending endcap
      const realI = isStarting ? i : ((i === 0) ? vertices.length - 1 : i - 1);

      // transformed vertex
      const transV = vertices[realI].rotate(angleToRotate).scale(scaleFactor).add(translationVector);

      if (realI === vertices.length - 1) {
        // last vertex, add base of arrow

        // duplicate this vertex to fully detach it from the arrowhead
        // depending on whether this is a starting or ending arrowhead, duplicate the
        // first or second vertex
        let times = 2;

        do {
          addVertex(transV.x + duY, transV.y - duX);
          times -= 1;
          // eslint-disable-next-line no-unmodified-loop-condition
        } while (isStarting && times > 0)

        do {
          addVertex(transV.x - duY, transV.y + duX);
          times -= 1;
          // eslint-disable-next-line no-unmodified-loop-condition
        } while (!isStarting && times > 0)
      } else {
        // add the vertex normally
        addVertex(transV.x, transV.y);
      }
    }
  }

  function StandardArrow (...args) {
    TriangularArrow(15 / 2, 5, ...args);
  }

  function SquatArrow (...args) {
    TriangularArrow(4, 5, ...args);
  }

  const SQRT2 = Math.SQRT2;

  function generateSkeletonPattern (size = 1, count = 3) {
    const pattern = [];
    const len = size * 5;

    for (let i = 0; i < count; ++i) {
      const x = i * 4;

      pattern.push(new Vec2(x, 0), new Vec2(x, 0), new Vec2(x + len, len), new Vec2(x + len + SQRT2, len - SQRT2),
        new Vec2(x + 2, 0), new Vec2(x, 0), new Vec2(x + len + SQRT2, -len + SQRT2), new Vec2(x + len, -len),
        new Vec2(x, 0), new Vec2(x, 0));
    }

    pattern.push(new Vec2(2, 0));

    return pattern
  }

  function SkeletonArrowFunctionFactory (size, count) {
    const pattern = generateSkeletonPattern(size, count);
    return function (...args) {
      ArrowFromPattern(pattern, ...args);
    }
  }

  // list of built-in arrow types
  const ARROW_TYPES = {
    CUSTOM: -1,
    STANDARD: 0,
    SQUAT: 1,
    SHORT_SKELETON: 2,
    SHORT_SKELETON2: 3,
    SHORT_SKELETON3: 4,
    LONG_SKELETON: 5,
    LONG_SKELETON2: 6,
    LONG_SKELETON3: 7
  };

  const arrowDrawers = {
    0: StandardArrow,
    1: SquatArrow,
    2: SkeletonArrowFunctionFactory(1, 1),
    3: SkeletonArrowFunctionFactory(1, 2),
    4: SkeletonArrowFunctionFactory(1, 3),
    5: SkeletonArrowFunctionFactory(2, 1),
    6: SkeletonArrowFunctionFactory(2, 2),
    7: SkeletonArrowFunctionFactory(2, 3)
  };

  // Length of arrow in pixels for a line with th=1
  const arrowLengths = {};

  (function () {
    // Calculate the arrow lengths experimentally!!

    // fake addVertex which keeps track of the max X value
    let maxX;
    const addVertex = (x, y) => {
      if (x > maxX) { maxX = x; }
    };

    for (const key in arrowDrawers) {
      const drawer = arrowDrawers[key];
      maxX = 0;

      // "draw" the arrow head in the untransformed direction, with th=1
      drawer(addVertex, 0, 0, 1, 0, 1, 0, 0, true);

      // record the length
      arrowLengths[key] = maxX;
    }
  })();

  // list of arrow position types
  const ARROW_LOCATION_TYPES = {
    NONE: -1,
    ARROW_F: 0, // arrow on every ending endcap
    ARROW_B: 1, // arrow on every starting endcap
    ARROW_FB: 2, // arrow on every endcap
    ARROW_F_END_ONLY: 3, // arrow on the end of the whole path
    ARROW_B_START_ONLY: 4, // arrow at the start of the whole path
    ARROW_FB_ENDS_ONLY: 5 // arrows at both ends of the path
  };

  const monochromeShader = {
    vertex: `// set the float precision of the shader to medium precision
  precision mediump float;
  // a vector containing the 2D position of the vertex
  attribute vec2 v_position;
  uniform vec2 xy_scale;
  vec2 displace = vec2(-1, 1);

  void main() {
    // set the vertex's resultant position
    gl_Position = vec4(v_position * xy_scale + displace, 0, 1);
  }`,
    fragment: `// set the float precision of the shader to medium precision
  precision mediump float;
  // vec4 containing the color of the line to be drawn
  uniform vec4 line_color;
  void main() {
    gl_FragColor = line_color;
  }`,
    name: 'monochrome-shader'
  };

  const multicoloredShader = {
    vertex: `// set the float precision of the shader to medium precision
  precision mediump float;
  // a vector containing the 2D position of the vertex
  attribute vec2 v_position;
  attribute vec4 v_color;
  uniform vec2 xy_scale;
  vec2 displace = vec2(-1, 1);

  varying lowp vec4 vColor;

  void main() {
    // set the vertex's resultant position
    gl_Position = vec4(v_position * xy_scale + displace, 0, 1);
    vColor = v_color;
  }`,
    fragment: `varying lowp vec4 vColor;
    void main(void) {
      gl_FragColor = vColor;
    }`,
    name: 'multicolored-shader'
  };

  // Direct correspondence with gl modes
  const RENDER_MODES = {
    POINTS: 'POINTS',
    LINE_STRIP: 'LINE_STRIP',
    LINE_LOOP: 'LINE_LOOP',
    LINES: 'LINES',
    TRIANGLE_STRIP: 'TRIANGLE_STRIP',
    TRIANGLE_FAN: 'TRIANGLE_FAN',
    TRIANGLES: 'TRIANGLES'
  };

  /**
  A 2D geometry, consisting of only one color.
  No edges, nothing crazy, just some (possibly disjoint) areas colored in a single color.
  The float array of vertices is glVertices, and the actual number of vertices to draw is
  glVertexCount.
  */
  class Simple2DGeometry extends GraphemeElement {
    constructor (params = {}) {
      super(params);

      this.color = new Color(0, 0, 0, 255);
      this.glVertices = null;
      this.glVerticesCount = 0;

      this.renderMode = RENDER_MODES.POINTS;
    }

    render (renderInfo) {
      // Early exit condition
      if (!this.glVertices) return

      const vertexCount = this.glVerticesCount;

      const gl = renderInfo.gl;
      const glManager = renderInfo.glResourceManager;

      // If there is no simple geometry program yet, compile one!
      if (!glManager.hasProgram(monochromeShader.name)) {
        glManager.compileProgram(monochromeShader.name,
          monochromeShader.vertex, monochromeShader.fragment,
          ['v_position'], ['xy_scale', 'line_color']);
      }

      // Obtain the program we want to use
      const programInfo = glManager.getProgram(monochromeShader.name);

      // Single buffer used for position
      const glBuffer = glManager.getBuffer(this.uuid);
      this.addUsedBufferName(this.uuid);

      // tell webgl to start using the geometry program
      gl.useProgram(programInfo.program);

      // Get the desired color of our geometry
      const color = this.color.glColor();

      // set the vec4 at colorLocation to (r, g, b, a)
      gl.uniform4f(programInfo.uniforms.line_color, color.r, color.g, color.b, color.a);

      // set the scaling factors
      gl.uniform2f(programInfo.uniforms.xy_scale, 2 / renderInfo.width, -2 / renderInfo.height);

      // bind our webgl buffer to gl.ARRAY_BUFFER access point
      gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer);

      // copy our vertex data to the GPU
      gl.bufferData(gl.ARRAY_BUFFER, this.glVertices, gl.DYNAMIC_DRAW /* means we will rewrite the data often */);

      // enable the vertices location attribute to be used in the program
      gl.enableVertexAttribArray(programInfo.attribs.v_position);

      // tell it that the width of vertices is 2 (since it's x,y), that it's floats,
      // that it shouldn't normalize floats, and something i don't understand
      gl.vertexAttribPointer(programInfo.attribs.v_position, 2, gl.FLOAT, false, 0, 0);

      // draw the vertices
      gl.drawArrays(gl[this.renderMode], 0, vertexCount);
    }
  }

  class Multicolored2DGeometry extends GraphemeElement {
    constructor (params = {}) {
      super(params);

      this.glVertices = null;
      this.glColors = null;
      this.glVerticesCount = 0;

      this.renderMode = RENDER_MODES.POINTS;
    }

    render (renderInfo) {
      if (!this.glVertices || !this.glColors || !this.glVerticesCount) return

      const vertexCount = this.glVerticesCount;

      const gl = renderInfo.gl;
      const glManager = renderInfo.glResourceManager;

      // If there is no simple geometry program yet, compile one!
      if (!glManager.hasProgram(multicoloredShader.name)) {
        glManager.compileProgram(multicoloredShader.name,
          multicoloredShader.vertex, multicoloredShader.fragment,
          ['v_position', 'v_color'], ['xy_scale']);
      }

      // Obtain the program we want to use
      const programInfo = glManager.getProgram(multicoloredShader.name);

      if (!this.glPositionBufferID) {
        this.glPositionBufferID = this.uuid + '-position';
        this.addUsedBufferName(this.glPositionBufferID);
      }

      const glPositionBufferID = this.glPositionBufferID;

      if (!this.glColorBufferID) {
        this.glColorBufferID = this.uuid + '-color';
        this.addUsedBufferName(this.glColorBufferID);
      }

      const glColorBufferID = this.glColorBufferID;

      // buffer used for position
      const glPositionBuffer = glManager.getBuffer(glPositionBufferID);

      // buffer used for colors
      const glColorBuffer = glManager.getBuffer(glColorBufferID);

      // tell webgl to start using the geometry program
      gl.useProgram(programInfo.program);

      // set the scaling factors
      gl.uniform2f(programInfo.uniforms.xy_scale, 2 / renderInfo.width, -2 / renderInfo.height);

      // bind our webgl buffer to gl.ARRAY_BUFFER access point
      gl.bindBuffer(gl.ARRAY_BUFFER, glPositionBuffer);

      // copy our vertex data to the GPU
      gl.bufferData(gl.ARRAY_BUFFER, this.glVertices, gl.DYNAMIC_DRAW /* means we will rewrite the data often */);

      // enable the vertices location attribute to be used in the program
      gl.enableVertexAttribArray(programInfo.attribs.v_position);

      // tell it that the width of vertices is 2 (since it's x,y), that it's floats,
      // that it shouldn't normalize floats, and something i don't understand
      gl.vertexAttribPointer(programInfo.attribs.v_position, 2, gl.FLOAT, false, 0, 0);

      // bind our webgl buffer to gl.ARRAY_BUFFER access point
      gl.bindBuffer(gl.ARRAY_BUFFER, glColorBuffer);

      // copy our vertex data to the GPU
      gl.bufferData(gl.ARRAY_BUFFER, this.glColors, gl.DYNAMIC_DRAW /* means we will rewrite the data often */);

      // Same business for colors
      gl.enableVertexAttribArray(programInfo.attribs.v_color);
      gl.vertexAttribPointer(programInfo.attribs.v_color, 4, gl.FLOAT, false, 0, 0);

      // draw the vertices
      gl.drawArrays(gl[this.renderMode], 0, vertexCount);
    }
  }

  // A union of multicolored and simple geometries to allow drawing them all in
  // a single gl.drawArrays call

  // TODO
  class GeometryUnion extends Multicolored2DGeometry {
    constructor (params = {}) {
      super(params);

      this.geometries = [];
    }

    computeGeometry () {
      if (this.renderMode === 'TRIANGLE_FAN' || this.renderMode === 'LINE_LOOP') {
        throw new Error('Unsupported render mode for geometry union')
      }

      let vertexCount = 0;

      for (let i = 0; i < this.geometries.length; ++i) {
        vertexCount += this.geometries[i];
      }

      return vertexCount
    }
  }

  // list of endcap types
  const ENDCAP_TYPES = {
    NONE: 0,
    ROUND: 1,
    SQUARE: 2
  };

  // list of join types
  const JOIN_TYPES = {
    NONE: 0,
    ROUND: 1,
    MITER: 2,
    DYNAMIC: 3
  };

  // Check whether x is an integer in the range [min, max]
  function integerInRange (x, min, max) {
    return isInteger(x) && min <= x && x <= max
  }

  // Find the next power of two after x
  function nextPowerOfTwo (x) {
    return 2 ** Math.ceil(Math.log2(x))
  }

  // minimum angle in radians between roundings in a polyline
  const MIN_RES_ANGLE = 0.05;

  // Parameters for the expanding/contracting float array for polyline
  const MIN_SIZE = 16;
  const MAX_SIZE = 2 ** 24;

  /**
  PolylineElement draws a sequence of line segments connecting points. Put the points
  as ordered pairs, in CANVAS COORDINATES, in polyline.vertices. To disconnect
  points, intersperse them with two consecutive NaNs.

  For example, [100, 100, 500, 500, 505, 500, NaN, NaN, 100, 150, 500, 150] draws
  a line from (100,100)->(500,500)->(505,500), then from (100,150)->(500,150).

  Other parameters:
  */
  class PolylineElement extends Simple2DGeometry {
    constructor (params = {}) {
      super(params);

      const {
        vertices = [],
        useNative = false
      } = params;

      // Array (or FloatArray) storing the pairs of vertices which are to be connected.
      // To prevent a join, put two NaNs in a row.
      this.vertices = vertices;

      // Whether or not to use native GL.LINE_STRIP
      this.useNative = useNative;

      // Contains useful style information
      this.style = {};
      const style = this.style;

      // color is a property of Simple2DGeometry, but we want it to be accessible
      // in style
      Object.defineProperty(style, 'color', {
        get: () => this.color,
        set: (color) => { this.color = color; }
      });

      // If params.style, merge it with the defaults and send it to this.style
      mergeDeep(style, {
        color: new Color(0, 0, 0, 255), // Color of the polyline
        thickness: 2, // Thickness in canvas pixels
        endcapType: 1, // The type of endcap to be used (refer to the ENDCAPS enum)
        endcapRes: 0.4, // The resolution of the endcaps in radians. Namely, the angle between consecutive roundings
        joinType: 3, // The type of join between consecutive line segments (refer to the JOIN_TYPES enum)
        joinRes: 0.4, // angle in radians between consecutive roundings, including in dynamic mode
        arrowLocations: -1, // Location of arrows (default is none)
        arrowType: 0 // Type of arrows to be drawn
      }, params.style || {});

      // used internally for gl vertices
      this.glVertices = null;
      this.glVerticesCount = 0;
    }

    static get ENDCAP_TYPES () {
      return ENDCAP_TYPES
    }

    static get JOIN_TYPES () {
      return JOIN_TYPES
    }

    static get ARROW_TYPES () {
      return ARROW_TYPES
    }

    static get ARROW_LOCATION_TYPES () {
      return ARROW_LOCATION_TYPES
    }

    updateGeometries () {
      // Calculate the vertices
      if (!this.useNative) {
        this.calculateTriangles();
      } else {
        this.calculateNativeLines();
      }
    }

    calculateTriangles () {
      // Conditions to just say there are 0 vertices and exit early
      if (this.style.thickness <= 0 ||
          !integerInRange(this.style.endcapType, 0, 1) ||
          !integerInRange(this.style.joinType, 0, 3) ||
          this.style.endcapRes < MIN_RES_ANGLE ||
          this.style.joinRes < MIN_RES_ANGLE ||
          this.vertices.length <= 3) {
        this.glVerticesCount = 0;
        return
      }

      // If glVertices isn't an array, make it an array with size MIN_SIZE
      if (!this.glVertices) {
        this.glVertices = new Float32Array(MIN_SIZE);
      }

      // The vertices that WebGL would use
      let glVertices = this.glVertices;

      let glVerticesIndex = 0; // the array position we are on (2x which vertex we're on)
      let needToDupeVertex = false; // whether we need to duplicate the CURRENT vertex

      // if glVerticesIndex > glVerticesThreshold, we need to expand glVertices
      let glVerticesThreshold = glVertices.length - 2;

      // To allow this to be accessed within addVertex
      const that = this;

      // Push a GL vertex back
      function addVertex (x, y) {
        if (glVerticesIndex > glVerticesThreshold) {
          // Not enough space in the FloatArray, reallocate one with twice the size

          const newFloatArray = new Float32Array(2 * glVertices.length);
          newFloatArray.set(glVertices); // copy over the old data

          that.glVertices = newFloatArray;
          glVertices = that.glVertices;

          // Update the new threshold
          glVerticesThreshold = glVertices.length - 2;
        }

        // Set the next two entries to x and y
        glVertices[glVerticesIndex] = x;
        glVerticesIndex += 1;
        glVertices[glVerticesIndex] = y;
        glVerticesIndex += 1;

        // If we need to duplicate the CURRENT vertex, do it again
        if (needToDupeVertex) {
          needToDupeVertex = false;
          addVertex(x, y);
        }
      }

      // Duplicate the LAST vertex immediately
      function duplicateVertex () {
        addVertex(glVertices[glVerticesIndex - 2], glVertices[glVerticesIndex - 1]);
      }

      const arrowType = this.style.arrowType;
      const arrowDrawer = arrowDrawers[arrowType];

      function drawArrow (...args) {
        // isStarting = true if it is a starting endcap, false if it is an
        // ending endcap

        if (arrowType === -1) { // custom arrow type
          that.customArrowDrawer(addVertex, ...args);
        } else {
          // Draw using one of the defined arrow drawers
          arrowDrawer(addVertex, ...args);
        }
      }

      // The vertices of the polyline
      const vertices = this.vertices;

      // Number of polyline vertex coordinates
      const coordinateCount = vertices.length;

      // Thickness of the polyline from the edge to the center. We divide it by two
      // because this.style.thickness is considered to be the total width of the line
      const th = this.style.thickness / 2;

      // Type of endcap to draw, angular resolution of endcap, join type of joins, angular resolution of joins
      const { endcapType, endcapRes, joinType, joinRes } = this.style;

      // Arrow locations
      const arrowLocations = this.style.arrowLocations;

      // Threshold distance from the corner of the miter to the center of the join
      // which would imply that the corner should be ROUNDED, in DYNAMIC mode.
      // That is, if the miter length is larger than this quantity, we should round
      // the vertex instead
      const maxMiterLength = th / Math.cos(joinRes / 2);

      // Lots of variables
      let x2, x3, y2, y3, v2x, v2y, v2l;

      x2 = NaN;
      x3 = NaN;

      y2 = NaN;
      y3 = NaN;

      for (let i = 0; i <= coordinateCount; i += 2) {
        // [x1, y1] = previous vertex (p1), [x2, y2] = current (p2), [x3, y3] = next (p3)
        // If any of these is NaN, that vertex is considered undefined
        const x1 = x2;
        x2 = x3;
        x3 = (i === coordinateCount) ? NaN : vertices[i];

        const y1 = y2;
        y2 = y3;
        y3 = (i === coordinateCount) ? NaN : vertices[i + 1];

        if (i === 0) {
          continue
        }

        // Shift the previous values of (v2x, v2y) back to (v1x, v1y), so that
        // (v1x, v1y) is the vector from (x2, y2) to (x1, y1). Note the order in
        // those points; this is why it is negated.
        const v1x = -v2x;
        const v1y = -v2y;

        // (v2x, v2y) is the vector from (x2, y2) to (x3, y3)
        v2x = x3 - x2;
        v2y = y3 - y2;

        // Give v2l's value to v1l
        const v1l = v2l;

        // v2l is the length of vector (v2x, v2y)
        v2l = Math.hypot(v2x, v2y);

        // Whether a starting endcap should be emitted. Note that x !== x <-> isNaN(x)
        const isStartingEndcap = Number.isNaN(x1);
        const isEndingEndcap = Number.isNaN(x3);

        // If we need to emit a (starting or ending) endcap. Note that we emit
        // a starting endcap when p1 is undefined, and thus the endcap should be
        // on p2 facing away from p3. We emit an ending endcap when p3 is undefined,
        // and thus the endcap should be on p2, facing away from p1
        if (isStartingEndcap || isEndingEndcap) {
          // (duX, duY) is a vector of length th (thickness) from the center of the endcap
          // facing towards the rest of the (semicircular) endcap. That is, it
          // is facing towards the bulb of the endcap, not away from it. Illustration
          // for an ending endcap:
          //
          //  p1 -> • ------------ •) <- p2, endcap
          //  (duX, duY) = -->

          let duX, duY;

          if (isEndingEndcap) {
            // Multiplying by th / v1l makes the vector length th, while preserving
            // its direction
            duX = -v1x * th / v1l;
            duY = -v1y * th / v1l;
          } else {
            duX = v2x * th / v2l;
            duY = v2y * th / v2l;
          }

          // If we can't create an endcap because of various undefined coordinates,
          // just give up. This might happen if x2 is defined but y2 is not, something
          // like that.
          if (Number.isNaN(duX) || Number.isNaN(duY)) continue

          if (isStartingEndcap) {
            // check if we should draw an arrow

            const ALT = ARROW_LOCATION_TYPES;
            if (arrowLocations === ALT.ARROW_B || // if arrows at starting endcaps
                arrowLocations === ALT.ARROW_FB || // if arrows at all endcaps
                ((arrowLocations === ALT.ARROW_B_START_ONLY || // if arrow at beginning
                arrowLocations === ALT.ARROW_FB_ENDS_ONLY) && i === 2)) {
              // TODO: more nuanced drawing methods
              drawArrow(x2, y2, x3, y3, th, duX, duY, true);

              continue
            }
          }

          if (isEndingEndcap) {
            // check if we should draw an arrow
            const ALT = ARROW_LOCATION_TYPES;
            if (arrowLocations === ALT.ARROW_F || // if arrows at ending endcaps
                arrowLocations === ALT.ARROW_FB || // if arrows at all endcaps
                ((arrowLocations === ALT.ARROW_F_END_ONLY || // if arrow at end
                arrowLocations === ALT.ARROW_FB_ENDS_ONLY) && i === coordinateCount)) {
              // TODO: more nuanced drawing methods
              drawArrow(x2, y2, x1, y1, th, duX, duY, false);

              continue
            }
          }

          // Two starting vertices of the endcap. Note that these are (x2, y2) ± (duY, -duX);
          // the second vector is rotated 90 degrees counterclockwise from (duY, duX).
          addVertex(x2 + duY, y2 - duX);
          addVertex(x2 - duY, y2 + duX);

          // Code for making a rounded endcap
          if (endcapType === 1) {
            // Starting theta value
            const theta = Math.atan2(duY, duX) + (isStartingEndcap ? Math.PI / 2 : 3 * Math.PI / 2);

            // Number of steps needed so that the angular resolution is smaller than or
            // equal to endcapRes
            const stepsNeeded = Math.ceil(Math.PI / endcapRes);

            // (cX, cY) is a fixed point; in fact, they are the last vertex before
            // this loop. This defines a point on the boundary of the semicircle
            // to which a "triangle fan" can be drawn which fills in the entire
            // semicircle.
            const cX = x2 - duY;
            const cY = y2 + duX;

            // Iterate through each step
            for (let i = 1; i <= stepsNeeded; ++i) {
              // Calculate an intermediate angle
              const thetaC = theta + i / stepsNeeded * Math.PI;

              // Vertex on the circle subtending that intermediate angle
              addVertex(x2 + th * Math.cos(thetaC), y2 + th * Math.sin(thetaC));
              addVertex(cX, cY);
            }
          }

          continue
        }

        // If the middle vertex is undefined, we need to duplicate the previous and next
        // gl vertices. This creates a degenerate (0-width) triangle which disconnects the
        // two triangle strips. To duplicate the previous vertex, we use duplicateVertex().
        // To duplicate the next vertex, we set needToDupeVertex = true, which will
        // duplicate the next call to addVertex.
        if (Number.isNaN(x2)) {
          duplicateVertex();
          needToDupeVertex = true;
        } else {
          // all vertices are defined, time to draw a joiner!
          if (joinType === 2 || joinType === 3) {
            // find the angle bisectors of the angle formed by v1 = p1 -> p2 and v2 = p2 -> p3
            // After this section of code, (b1x, b1y) is a unit vector bisecting
            // the vectors (v1x, v1y) and (v2x, v2y)
            let b1x = v2l * v1x + v1l * v2x;
            let b1y = v2l * v1y + v1l * v2y;
            let scale = 1 / Math.hypot(b1x, b1y);

            // If the scale is infinite, that means b1x = b1y = 0, so the vectors
            // are opposite each other. We thus choose a vector perpendicular to both
            // vectors because that bisects the 180 degree angle they subtend
            if (scale === Infinity || scale === -Infinity) {
              b1x = -v1y;
              b1y = v1x;
              scale = 1 / Math.hypot(b1x, b1y);
            }

            // Scale it to be a unit vector
            b1x *= scale;
            b1y *= scale;

            // Set scale to the length of a miter. (b1x, b1y) is now in the direction
            // of a proper miter, but we multiply it by this value to make it the correct
            // length.
            scale = th * v1l / (b1x * v1y - b1y * v1x);

            if (joinType === 2 || (Math.abs(scale) < maxMiterLength)) {
              // if the length of the miter is massive and we're in dynamic mode,
              // we reject this if statement and do a rounded join. More precisely,
              // |scale| exceeds maxMiterLength when the angle between the two vectors
              // is greater than the angular resolution mandated by joinRes.

              // Scale by the length of a miter
              b1x *= scale;
              b1y *= scale;

              // Add the two miter vertices. This is all that is necessary to join
              // the vertices, since both points lie on the infinite rectangles determined
              // by each of the pairs ((x1, y1), (x2, y2)) and ((x2, y2), (x3, y3)).
              addVertex(x2 - b1x, y2 - b1y);
              addVertex(x2 + b1x, y2 + b1y);

              continue
            }
          }

          // These are scaling factors associated with scaling the displacement vectors
          // (v1x, v1y) and (v2x, v2y) to have length th (thickness)
          const puFactor = -th / v1l;
          const nuFactor = th / v2l;

          // Add two points which end the current rectangle. This is all we need
          // if there is no join to be computed (i.e. if the join mode is NONE)
          addVertex(x2 + puFactor * v1y, y2 - puFactor * v1x);
          addVertex(x2 - puFactor * v1y, y2 + puFactor * v1x);

          if (joinType === 1 || joinType === 3) {
            // If the join type is round or dynamic, we need to make a rounded join.
            // a1 and a2 are angles associated with the direction of where the rounded
            // join should start and end.
            const a1 = Math.atan2(v1y, v1x) - Math.PI / 2;
            const a2 = Math.atan2(v2y, v2x) - Math.PI / 2;

            // If the join is a right turn viewed from above, we flip a2 by adding π
            // if left turn, flip a1 by adding π

            let startA, endA;

            // The below condition is satisfied when the join is a left turn
            if (mod(a1 - a2, 2 * Math.PI) < Math.PI) {
              // starting angle is a1 + π, ending angle is a2
              startA = Math.PI + a1;
              endA = a2;
            } else {
              // starting angle is a2 + π, ending angle is a1
              startA = Math.PI + a2;
              endA = a1;
            }

            // The absolute angle subtended by endA and startA
            // TODO: not sure if the mod function here is necessary
            const angleSubtended = mod(endA - startA, 2 * Math.PI);

            // The number of angle steps needed to make sure the angular resolution
            // is less than or equal to joinRes
            const stepsNeeded = Math.ceil(angleSubtended / joinRes);

            for (let i = 0; i <= stepsNeeded; ++i) {
              // For every intermediate angle
              const thetaC = startA + angleSubtended * i / stepsNeeded;

              // Add a point on the circular sector, then connect back to (x2, y2)
              // to create a "circular fan"
              addVertex(x2 + th * Math.cos(thetaC), y2 + th * Math.sin(thetaC));
              addVertex(x2, y2);
            }
          }

          // Add the starting vertices for the next rectangle!
          addVertex(x2 + nuFactor * v2y, y2 - nuFactor * v2x);
          addVertex(x2 - nuFactor * v2y, y2 + nuFactor * v2x);
        }
      }

      // If the number of glVertices we computed is less than four times the total buffer size,
      // we reallocate the buffer to be two times the next power of two after the number of
      // glVertices we compute. This prevents excess memory from being forever wasted by
      // a polyline history with lots of vertices.
      if (glVerticesIndex * 4 < glVertices.length) {
        const newFloatArray = new Float32Array(Math.min(Math.max(MIN_SIZE,
          2 * nextPowerOfTwo(glVerticesIndex)), MAX_SIZE));

        // Copy old values to the new float array
        newFloatArray.set(glVertices.subarray(0, glVerticesIndex));

        glVertices = this.glVertices = newFloatArray;
      }

      // Set the number of glVertices to be used later when rendered with gl!
      this.glVerticesCount = Math.ceil(glVerticesIndex / 2);
    }

    calculateNativeLines () {
      const vertices = this.vertices;

      // Early exit condition
      if (vertices.length <= 3) {
        this.glVerticesCount = 0;
        return
      }

      // If glVertices doesn't exist yet, set it to a newly-created Float32Array
      let glVertices = this.glVertices;
      if (!glVertices) {
        glVertices = this.glVertices = new Float32Array(MIN_SIZE);
      }

      // Adjust our array size as necessary.
      const undersized = glVertices.length < vertices.length;
      const oversized = glVertices.length > vertices.length * 4;
      if (undersized || oversized) {
        glVertices = this.glVertices = new Float32Array(Math.min(Math.max(MIN_SIZE,
          ((oversized) ? 2 : 1) * nextPowerOfTwo(vertices.length)), MAX_SIZE));
      }

      // If vertices is a plain array, we copy it manually. Otherwise, we use
      // the built in ArrayBuffer.set function for I AM SPEED
      if (Array.isArray(vertices)) {
        for (let i = 0; i < vertices.length; ++i) {
          glVertices[i] = vertices[i];
        }
      } else {
        glVertices.set(vertices);
      }

      // Set the number of vertices for gl to render!
      this.glVerticesCount = Math.ceil(vertices.length / 2);
    }

    render (renderInfo) {
      // Calculate the vertices
      if (this.alwaysUpdate) { this.updateGeometries(); }

      // Potential early exit
      const vertexCount = this.glVerticesCount;
      if ((this.useNative && vertexCount < 2) || (!this.useNative && vertexCount < 3)) return

      if (this.useNative) {
        this.renderMode = 'LINE_STRIP';
      } else {
        this.renderMode = 'TRIANGLE_STRIP';
      }

      super.render(renderInfo);
    }
  }

  // TEMP: must transfer from old grapheme
  function defaultLabel (x) {
    return x.toFixed(5)
  }

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
      length = 16,
      positioning = 0,
      thickness = 2,
      color = new Color(),
      displayText = false,
      textOffset = 5,
      textRotation = 0,
      textPadding = 2,
      font = '12px Helvetica',
      shadowSize = 3,
      textColor = new Color(),
      textFunc = defaultLabel
    } = {}) {
      this.length = length;
      this.positioning = positioning;
      this.thickness = thickness;
      this.color = color;
      this.displayText = displayText;
      this.textRotation = textRotation;
      this.textPadding = textPadding;
      this.font = font;
      this.shadowSize = 3;
      this.textColor = textColor;
      this.textFunc = textFunc;
    }

    /**
     * Check whether the tickmark is geometrically valid.
     * @returns {Boolean} Whether the tickmark is valid.
     */
    isValid () {
      return (this.length > 0 && (this.positioning >= -1 && this.positioning <= 1) &&
        (this.thickness > 0))
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
    createTickmarks (transformation, positions, geometry) {
      checkType(geometry, Simple2DGeometry);

      const tickmarkCount = positions.length;
      const vertexCount = tickmarkCount * 5; // 5 vertices per thing

      // The tickmarks will be drawn as triangles
      geometry.renderMode = 'TRIANGLE_STRIP';
      geometry.color = this.color;

      // Create the glVertices array if necessary
      if (!geometry.glVertices || geometry.glVertices.length !== 2 * vertexCount) {
        geometry.glVertices = new Float32Array(2 * vertexCount);
      }

      const vertices = geometry.glVertices;

      // Note that "s" in class theory is positioning, and "t" is thickness
      const { positioning, thickness, length } = this;
      const { v1, v2, x1, x2 } = transformation;
      const axisDisplacement = v2.minus(v1);

      // vectors as defined in class_theory
      const xi = axisDisplacement.unit().scale(thickness / 2);
      const upsilon = axisDisplacement.unit().rotate(Math.PI / 2);
      const nanVertex = new Vec2(NaN, NaN);

      let index = 0;

      function addVertex (v) {
        vertices[index] = v.x;
        vertices[index + 1] = v.y;
        index += 2;
      }

      for (let i = 0; i < positions.length; ++i) {
        let givenPos = positions[i];
        if (givenPos.value) { givenPos = givenPos.value; }

        const pos = axisDisplacement.scale((givenPos - x1) / (x2 - x1)).add(v1);
        const lambda = upsilon.scale((positioning + 1) / 2 * length).add(pos);
        const omicron = upsilon.scale((positioning - 1) / 2 * length).add(pos);

        // Create a rectangle for the tick
        addVertex(omicron.minus(xi));
        addVertex(lambda.minus(xi));
        addVertex(omicron.add(xi));
        addVertex(lambda.add(xi));
        addVertex(nanVertex);
      }

      geometry.glVerticesCount = vertexCount;
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
        margins = {
          start: 0,
          end: 0,
          automatic: true
        },
        xStart = 0,
        xEnd = 1,
        tickmarkStyles = {},
        tickmarkPositions = {},
        style = {}
      } = params;

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
        tickmarkGeometries: {},
        axisGeometry: new PolylineElement(Object.assign({
          // Some sensible default values
          arrowLocations: -1,
          arrowType: 0,
          thickness: 2,
          color: new Color()
        }, style))
      };

      // Style of the main axis line
      this.style = this.axisComponents.axisGeometry.style;
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
      const arrowLoc = this.style.arrowLocations;
      const arrowLength = arrowLengths[this.style.arrowType];

      this.margins.start = 0;
      this.margins.end = 0;

      if ([1, 2, 4, 5].includes(arrowLoc)) {
        this.margins.start = 1.5 * arrowLength * this.style.thickness / 2;
      }

      if ([0, 2, 3, 5].includes(arrowLoc)) {
        this.margins.end = 1.5 * arrowLength * this.style.thickness / 2;
      }
    }

    /**
     * updateTickmarkGeometries - Update the tickmark geometries by going through each tickmark style and generating the relevant geometries.
     */
    updateTickmarkGeometries () {
      const tickmarkGeometries = this.axisComponents.tickmarkGeometries;
      const axisDisplacement = this.end.minus(this.start);
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
        v2: this.end.minus(axisDisplacementDir.scale(this.margins.end)),
        x1: this.xStart,
        x2: this.xEnd
      };

      // For every type of tickmark
      for (const styleName in this.tickmarkStyles) {
        const style = this.tickmarkStyles[styleName];
        const positions = this.tickmarkPositions[styleName];

        if (!positions) continue

        let geometry = tickmarkGeometries[styleName];
        if (!geometry) {
          geometry = new Simple2DGeometry();
          geometry.alwaysUpdate = false;
          this.add(geometry);

          tickmarkGeometries[styleName] = geometry;
        }

        // Create some tickmarks!
        style.createTickmarks(transformation, positions, geometry);
      }

      for (const geometryName in this.tickmarkGeometries) {
        if (!this.tickmarkStyles[geometryName]) {
          const unusedGeometry = this.tickmarkGeometries[geometryName];

          // unused geometry, destroy it
          this.remove(unusedGeometry);
          unusedGeometry.destroy();

          delete this.tickmarkGeometries[geometryName];
        }
      }
    }

    /**
     * updateAxisGeometry - Update the PolylineElement which is the main axis itself.
     */
    updateAxisGeometry () {
      const axisGeometry = this.axisComponents.axisGeometry;
      axisGeometry.precedence = 1; // put it on top of the tickmarks
      axisGeometry.alwaysUpdate = false;

      // Axis geometry connects these two vertices
      axisGeometry.vertices = [...this.start.asArray(), ...this.end.asArray()];
      axisGeometry.updateGeometries();

      if (!this.hasChild(axisGeometry)) { this.add(axisGeometry); }
    }

    /**
     * updateGeometries - Update the geometries of this axis for rendering.
     */
    updateGeometries () {
      if (this.margins.automatic) { this.calculateMargins(); }
      this.updateTickmarkGeometries();
      this.updateAxisGeometry();
    }

    destroy () {
      super.destroy(); // this will destroy all the child geometries

      delete this.axisComponents;
    }

    render (renderInfo) {
      if (this.alwaysUpdate) { this.updateGeometries(); }

      super.render(renderInfo);
    }
  }

  exports.ARROW_LOCATION_TYPES = ARROW_LOCATION_TYPES;
  exports.ARROW_TYPES = ARROW_TYPES;
  exports.Axis = Axis;
  exports.AxisTickmarkStyle = AxisTickmarkStyle;
  exports.Context = GraphemeContext;
  exports.GeometryUnion = GeometryUnion;
  exports.Group = GraphemeGroup;
  exports.Multicolored2DGeometry = Multicolored2DGeometry;
  exports.PolylineElement = PolylineElement;
  exports.RENDER_MODES = RENDER_MODES;
  exports.Simple2DGeometry = Simple2DGeometry;
  exports.arrowDrawers = arrowDrawers;
  exports.arrowLengths = arrowLengths;

  return exports;

}({}));
