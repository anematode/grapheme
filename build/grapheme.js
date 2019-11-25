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
    constructor (params = {}) {
      // precedence is a number from -Infinity to Infinity.
      this.precedence = select(params.precedence, 0);

      this.uuid = generateUUID();
      this.visible = select(params.visible, true);

      this.usedBufferNames = [];
      this.parent = null;
      this.lastRenderTime = 0;
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

    render (elementInfo) {
      this.lastRenderTime = Date.now();
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

    render (renderInfo) {
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
  }

  // Implementation of basic color functions
  // Could use a library, but... good experience for me too

  function isValidColorComponent (x) {
    return (x >= 0 && x <= 255)
  }

  class Color {
    constructor ({
      r = 0, g = 0, b = 0, a = 255
    }) {
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
    constructor (graphemeContext, params = {}) {
      super(params);

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

        super.render(renderInfo);

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
    constructor(graphemeContext, params={}) {
      super(graphemeContext, params);

      
    }
  }

  /**
  The GLResourceManager stores GL resources on a per-context basis. This allows the
  separation of elements and their drawing buffers in a relatively complete way.

  It is given a gl context to operate on, and creates programs in manager.programs
  and buffers in manager.buffers. programs and buffers are simply key-value pairs
  which objects can create (and destroy) as they please.
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
    constructor (params = {}) {
      // Creates an offscreen canvas to draw to, with an initial size of 1x1
      this.glCanvas = OffscreenCanvas ? new OffscreenCanvas(1,1) : document.createElement('canvas');

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
    createWindow (interactive=true) {
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

  // Some functions to draw arrows

  function TriangularArrow(arrowLenScale, arrowWidthScale, addVertex, x2, y2, xa, ya, th, duX, duY, isStarting) {
    // Constructs a "triangular arrow" on (x2, y2) facing away from (xa, ya)
    let arrowLen = th * arrowLenScale;
    let arrowWidth = th * arrowWidthScale;

    let v1x = xa - x2;
    let v1y = ya - y2;
    let v1l = Math.hypot(v1x, v1y);

    if (v1l === 0) return; // yeah, I'm not dealing with that

    v1x /= v1l;
    v1y /= v1l;

    // (abx, aby) is base of the arrow
    let abx = x2 + v1x * arrowLen;
    let aby = y2 + v1y * arrowLen;

    let av1x = abx + v1y * arrowWidth;
    let av1y = aby - v1x * arrowWidth;

    let av2x = abx - v1y * arrowWidth;
    let av2y = aby + v1x * arrowWidth;

    function addArrowBaseVertices() {
      addVertex(abx + duY, aby - duX);
      addVertex(abx - duY, aby + duX);
    }

    if (!isStarting) addArrowBaseVertices();

    addVertex(x2, y2);
    addVertex(av1x, av1y);
    addVertex(av2x, av2y);

    if (isStarting) addArrowBaseVertices();
  }

  function StandardArrow(...args) {
    TriangularArrow(15, 5, ...args);
  }

  function SquatArrow(...args) {
    TriangularArrow(8, 5, ...args);
  }

  // list of built-in arrow types
  const ARROW_TYPES = {
    CUSTOM: -1,
    STANDARD: 0,
    SQUAT: 1
  };

  const arrowDrawers = {
    0: StandardArrow,
    1: SquatArrow
  };

  // list of endcap types
  const ENDCAP_TYPES = {
    NONE: 0,
    ROUND: 1
  };

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

  // list of join types
  const JOIN_TYPES = {
    NONE: 0,
    ROUND: 1,
    MITER: 2,
    DYNAMIC: 3
  };

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

  // Name of the polyline program stored in GLResourceManager
  const POLYLINE_PROGRAM_NAME = 'polyline-shader';

  /**
  PolylineElement draws a sequence of line segments connecting points. Put the points
  as ordered pairs, in CANVAS COORDINATES, in polyline.vertices. To disconnect
  points, intersperse them with two consecutive NaNs.

  For example, [100, 100, 500, 500, 505, 500, NaN, NaN, 100, 150, 500, 150] draws
  a line from (100,100)->(500,500)->(505,500), then from (100,150)->(500,150).

  Other parameters:
  */
  class PolylineElement extends GraphemeElement {
    constructor (window, params = {}) {
      super(window, params);

      // Array (or FloatArray) storing the pairs of vertices which are to be connected.
      // To prevent a join, put two NaNs in a row.
      this.vertices = select(params.vertices, []);

      // Color of the polyline
      this.color = select(params.color, new Color(0, 0, 0, 255));

      // Thickness in canvas pixels
      this.thickness = select(params.thickness, 2);

      // The type of endcap to be used (refer to the ENDCAPS enum)
      this.endcapType = select(params.endcapType, 1);

      // The resolution of the endcaps in radians. Namely, the angle between consecutive roundings
      this.endcapRes = select(params.endcapRes, 0.4);

      // The type of join between consecutive line segments (refer to the JOIN_TYPES enum)
      this.joinType = select(params.joinType, 3);

      // angle in radians between consecutive roundings, including in dynamic mode
      this.joinRes = select(params.joinRes, 0.4);

      // Location of arrows (default is none)
      this.arrowLocations = select(params.arrowLocations, -1);

      // Type of arrows to be drawn
      this.arrowType = select(params.arrowType, 0);

      // Whether or not to use native GL.LINE_STRIP
      this.useNative = select(params.useNative, false);

      // Whether to recalculate the vertices every time render() is called
      this.alwaysRecalculate = true;

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

    calculateVertices () {
      // Calculate the vertices
      if (!this.useNative) {
        this.calculateTriangles();
      } else {
        this.calculateNativeLines();
      }
    }


      calculateTriangles () {
        // Conditions to just say there are 0 vertices and exit early
        if (this.thickness <= 0 ||
          !integerInRange(this.endcapType, 0, 1) ||
          !integerInRange(this.joinType, 0, 3) ||
          this.endcapRes < MIN_RES_ANGLE ||
          this.joinRes < MIN_RES_ANGLE ||
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

        function drawArrow(...args) {
          // isStarting = true if it is a starting endcap, false if it is an
          // ending endcap

          if (that.arrowType === -1) { // custom arrow type
            that.customArrowDrawer(addVertex, ...args);
          } else {
            // Draw using one of the defined arrow drawers
            arrowDrawers[that.arrowType](addVertex, ...args);
          }
        }

        // The vertices of the polyline
        const vertices = this.vertices;

        // Number of polyline vertex coordinates
        const coordinateCount = vertices.length;

        // Thickness of the polyline from the edge to the center. We divide it by two
        // because this.thickness is considered to be the total width of the line
        const th = this.thickness / 2;

        // Arrow locations
        const arrowLocations = this.arrowLocations;

        // Threshold distance from the corner of the miter to the center of the join
        // which would imply that the corner should be ROUNDED, in DYNAMIC mode.
        // That is, if the miter length is larger than this quantity, we should round
        // the vertex instead
        const maxMiterLength = th / Math.cos(this.joinRes / 2);

        // Lots of variables
        let x2, x3, y2, y3, v2x, v2y, v2l;

        x2 = NaN;
        x3 = NaN;

        y2 = NaN;
        y3 = NaN;

        for (let i = 0; i <= coordinateCount; i += 2) {
          // [x1, y1] = previous vertex (p1), [x2, y2] = current (p2), [x3, y3] = next (p3)
          // If any of these is NaN, that vertex is considered undefined
          let x1 = x2;
          x2 = x3;
          x3 = (i == coordinateCount) ? NaN : vertices[i];

          let y1 = y2;
          y2 = y3;
          y3 = (i == coordinateCount) ? NaN : vertices[i + 1];

          if (i === 0) {
            continue
          }

          // Shift the previous values of (v2x, v2y) back to (v1x, v1y), so that
          // (v1x, v1y) is the vector from (x2, y2) to (x1, y1). Note the order in
          // those points; this is why it is negated.
          let v1x = -v2x;
          let v1y = -v2y;

          // (v2x, v2y) is the vector from (x2, y2) to (x3, y3)
          v2x = x3 - x2;
          v2y = y3 - y2;

          // Give v2l's value to v1l
          let v1l = v2l;

          // v2l is the length of vector (v2x, v2y)
          v2l = Math.hypot(v2x, v2y);

          // Whether a starting endcap should be emitted. Note that x !== x <-> isNaN(x)
          let isStartingEndcap = x1 !== x1;
          let isEndingEndcap = x3 !== x3;

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
            if ((duX !== duX) || (duY !== duY)) continue

            if (isStartingEndcap) {
              // check if we should draw an arrow

              let ALT = ARROW_LOCATION_TYPES;
              if (arrowLocations === ALT.ARROW_B ||  // if arrows at starting endcaps
                arrowLocations === ALT.ARROW_FB || // if arrows at all endcaps
                ((arrowLocations === ALT.ARROW_B_START_ONLY || // if arrow at beginning
                arrowLocations === ALT.ARROW_FB_ENDS_ONLY) && i === 2)) {
                // TODO: more nuanced drawing methods
                drawArrow(x2, y2, x3, y3, th, duX, duY, true);

                continue;
              }
            }

            if (isEndingEndcap) {
              // check if we should draw an arrow
              let ALT = ARROW_LOCATION_TYPES;
              if (arrowLocations === ALT.ARROW_F ||  // if arrows at ending endcaps
                arrowLocations === ALT.ARROW_FB || // if arrows at all endcaps
                ((arrowLocations === ALT.ARROW_F_END_ONLY || // if arrow at end
                arrowLocations === ALT.ARROW_FB_ENDS_ONLY) && i === coordinateCount)) {
                // TODO: more nuanced drawing methods
                drawArrow(x2, y2, x1, y1, th, duX, duY, false);

                continue;
              }
            }

            // Two starting vertices of the endcap. Note that these are (x2, y2) ± (duY, -duX);
            // the second vector is rotated 90 degrees counterclockwise from (duY, duX).
            addVertex(x2 + duY, y2 - duX);
            addVertex(x2 - duY, y2 + duX);


            // Code for making a rounded endcap
            if (this.endcapType === 1 && drawEndcap) {
              // Starting theta value
              const theta = Math.atan2(duY, duX) + (isStartingEndcap ? Math.PI / 2 : 3 * Math.PI / 2);

              // Number of steps needed so that the angular resolution is smaller than or
              // equal to this.endcapRes
              const stepsNeeded = Math.ceil(Math.PI / this.endcapRes);

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
          if (x2 !== x2) {
            duplicateVertex();
            needToDupeVertex = true;
          } else {
            // all vertices are defined, time to draw a joiner!
            if (this.joinType === 2 || this.joinType === 3) {
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

              if (this.joinType === 2 || (Math.abs(scale) < maxMiterLength)) {
                // if the length of the miter is massive and we're in dynamic mode,
                // we reject this if statement and do a rounded join. More precisely,
                // |scale| exceeds maxMiterLength when the angle between the two vectors
                // is greater than the angular resolution mandated by this.joinRes.

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
            let puFactor = -th / v1l;
            let nuFactor = th / v2l;

            // Add two points which end the current rectangle. This is all we need
            // if there is no join to be computed (i.e. if the join mode is NONE)
            addVertex(x2 + puFactor * v1y, y2 - puFactor * v1x);
            addVertex(x2 - puFactor * v1y, y2 + puFactor * v1x);

            if (this.joinType === 1 || this.joinType === 3) {
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
              // is less than or equal to this.joinRes
              const stepsNeeded = Math.ceil(angleSubtended / this.joinRes);

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
        let undersized = glVertices.length < vertices.length;
        let oversized = glVertices.length > vertices.length * 4;
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
      if (this.alwaysRecalculate) {
        this.calculateVertices();
      }

      // Potential early exit
      const vertexCount = this.glVerticesCount;
      if ((this.useNative && vertexCount < 2) || (!this.useNative && vertexCount < 3)) return

      const gl = renderInfo.gl;
      const glManager = renderInfo.glResourceManager;

      // If there is no polyline program yet, compile one!
      if (!glManager.hasProgram(POLYLINE_PROGRAM_NAME)) {
        glManager.compileProgram(POLYLINE_PROGRAM_NAME,
          vertexShaderSource, fragmentShaderSource,
          ['v_position'], ['xy_scale', 'line_color']);
      }

      const polylineInfo = glManager.getProgram(POLYLINE_PROGRAM_NAME);

      this.addUsedBufferName(this.uuid);
      const glBuffer = glManager.getBuffer(this.uuid);

      // gl, glResourceManager, width, height, text, textCanvas

      // tell webgl to start using the polyline program
      gl.useProgram(polylineInfo.program);

      // bind our webgl buffer to gl.ARRAY_BUFFER access point
      gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer);

      // Get the desired color of our line
      const color = this.color.glColor();

      // set the vec4 at colorLocation to (r, g, b, a)
      gl.uniform4f(polylineInfo.uniforms.line_color, color.r, color.g, color.b, color.a);

      // set the scaling factors
      gl.uniform2f(polylineInfo.uniforms.xy_scale, 2 / renderInfo.width, -2 / renderInfo.height);

      // copy our vertex data to the GPU
      gl.bufferData(gl.ARRAY_BUFFER, this.glVertices, gl.DYNAMIC_DRAW /* means we will rewrite the data often */);

      // enable the vertices location attribute to be used in the program
      gl.enableVertexAttribArray(polylineInfo.attribs.v_position);

      // tell it that the width of vertices is 2 (since it's x,y), that it's floats,
      // that it shouldn't normalize floats, and something i don't understand
      gl.vertexAttribPointer(polylineInfo.attribs.v_position, 2, gl.FLOAT, false, 0, 0);

      // draw the vertices as triangle strip
      gl.drawArrays(this.useNative ? gl.LINE_STRIP : gl.TRIANGLE_STRIP, 0, vertexCount);
    }
  }

  exports.Context = GraphemeContext;
  exports.PolylineElement = PolylineElement;

  return exports;

}({}));
