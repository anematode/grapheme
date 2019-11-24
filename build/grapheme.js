var Grapheme = (function (exports) {
  'use strict';

  // This file defines some common utilities that Grapheme uses!

  // A list of all extant Grapheme Contexts
  let CONTEXTS = [];

  // this function takes in a variadic list of arguments and returns the first
  // one that's not undefined
  function select(opt1, ...opts) {
    if (opts.length === 0) // if there are no other options, choose the first
      return opt1;
    if (opt1 === undefined) { // if the first option is undefined, proceed
      return select(...opts);
    }

    // If the first option is valid, return it
    return opt1;
  }

  // Assert that a statement is true, and throw an error if it's not
  function assert(statement, error = "Unknown error") {
    if (!statement)
      throw new Error(error);
  }

  // Check that an object is of a given type
  function checkType(obj, type) {
    assert(obj instanceof type, "Object must be instance of " + type);
  }

  // The following functions are self-explanatory.

  function isInteger(z) {
    return Number.isInteger(z); // didn't know about this lol
  }

  function isNonnegativeInteger(z) {
    return Number.isInteger(z) && z >= 0;
  }

  function isPositiveInteger(z) {
    return Number.isInteger(z) && z > 0;
  }

  // Non-stupid mod function
  function mod(n, m) {
    return ((n % m) + m) % m;
  }

  // device pixel ratio... duh
  let dpr = window.devicePixelRatio;
  function updateDPR() {
    if (dpr !== window.devicePixelRatio) {
      dpr = window.devicePixelRatio;

      // Tell the babies that the device pixel ratio has changed
      CONTEXTS.forEach(context => context._onDPRChanged());
    }
  }

  // Periodically check whether the dpr has changed
  setInterval(updateDPR, 100);

  // Import the Grapheme CSS file for canvas styling
  function importGraphemeCSS() {
    try {
      let link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = '../build/grapheme.css'; // oof, must change l8r

      document.getElementsByTagName('HEAD')[0].appendChild(link);
    } catch (e) {
      console.error("Could not import Grapheme CSS");
      throw e;
    }
  }

  importGraphemeCSS();

  // This function takes in a GL rendering context, a type of shader (fragment/vertex),
  // and the GLSL source code for that shader, then returns the compiled shader
  function createShaderFromSource(gl, shaderType, shaderSourceText) {
    // create an (empty) shader of the provided type
    let shader = gl.createShader(shaderType);

    // set the source of the shader to the provided source
    gl.shaderSource(shader, shaderSourceText);

    // compile the shader!! piquant
    gl.compileShader(shader);

    // get whether the shader compiled properly
    let succeeded = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

    if (succeeded)
      return shader; // return it if it compiled properly
    else {
      // throw an error with the details of why the compilation failed
      throw new Error(gl.getShaderInfoLog(shader));

      // delete the shader to free it from memory
      gl.deleteShader(shader);
    }
  }

  // This function takes in a GL rendering context, the fragment shader, and the vertex shader,
  // and returns a compiled program.
  function createGLProgram(gl, vertShader, fragShader) {
    // create an (empty) GL program
    let program = gl.createProgram();

    // link the vertex shader
    gl.attachShader(program, vertShader);

    // link the fragment shader
    gl.attachShader(program, fragShader);

    // compile the program
    gl.linkProgram(program);

    // get whether the program compiled properly
    let succeeded = gl.getProgramParameter(program, gl.LINK_STATUS);

    if (succeeded)
      return program;
    else {
      // throw an error with the details of why the compilation failed
      throw new Error(gl.getProgramInfoLog(program));

      // delete the program to free it from memory
      gl.deleteProgram(program);
    }
  }

  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function deleteBuffersNamed(bufferNames) {
    if (Array.isArray(bufferNames)) {
      for (let i = 0; i < bufferNames.length; ++i)
        deleteBuffersNamed(bufferNames[i]);

      return;
    }

    CONTEXTS.forEach(context => {
      context.glResourceManager.deleteBuffer(bufferNames);
    });
  }

  /**
  A GraphemeElement is a part of a GraphemeWindow. It has a certain precedence
  (i.e. the order in which it will be drawn onto the GL portion and the 2D canvas portion.)
  */
  class GraphemeElement {
    constructor(params={}) {
      // precedence is a number from -Infinity to Infinity.
      this.precedence = select(params.precedence, 0);

      this.uuid = generateUUID();
      this.visible = select(params.visible, true);

      this.usedBufferNames = [];
      this.parent = null;
      this.lastRenderTime = 0;
    }

    addUsedBufferName(bufferName) {
      if (this.usedBufferNames.indexOf(bufferName) === -1) {
        this.usedBufferNames.push(bufferName);
      }
    }

    removeUsedBufferName(bufferName) {
      let index = this.usedBufferNames.indexOf(bufferName);
      if (index !== -1) {
        this.usedBufferNames.splice(index, 1);
      }
    }

    orphanize() {
      if (this.parent) {
        this.parent.remove(this);
      }
    }

    render(elementInfo) {
      this.lastRenderTime = Date.now();
    }

    destroy() {
      if (this.usedBufferNames)
        deleteBuffersNamed(this.usedBufferNames);
      
      this.orphanize();
    }
  }

  class GraphemeGroup extends GraphemeElement {
    constructor(params={}) {
      super(params);

      this.children = [];
    }

    sortChildrenByPrecedence() {
      // Sort the children by their precedence value
      this.children.sort((x,y) => x.precedence - y.precedence);
    }

    render(renderInfo) {
      this.sortChildrenByPrecedence();

      this.children.forEach(child => child.render(renderInfo));
    }

    isChild(element) {
      return this.hasChild(element, false);
    }

    hasChild(element, recursive=true) {
      if (recursive) {
        if (this.hasChild(element, false))
          return true;
        if (this.children.some(child => child.hasChild(element, recursive)))
          return true;
        return false;
      }

      let index = this.children.indexOf(element);
      return (index !== -1);
    }

    add(element, ...elements) {
      checkType(element, GraphemeElement);

      if (element.parent !== null) {
        throw new Error("Element is already a child");
      }

      assert(!this.hasChild(element, true), "Element is already a child of this group...");

      element.parent = this;
      this.children.push(element);

      if (elements.length > 0) {
        this.add(elements);
      }
    }

    remove(element, ...elements) {
      checkType(element, GraphemeElement);
      if (this.hasChild(element, false)) {
        // if element is an immediate child
        let index = this.children.indexOf(element);
        this.children.splice(index, 1);
        element.parent = null;
      }

      if (elements.length > 0) {
        this.remove(elements);
      }
    }

    destroy() {
      this.children.forEach(child => child.destroy());

      super.destroy();
    }
  }

  // Implementation of basic color functions
  // Could use a library, but... good experience for me too

  function isValidColorComponent(x) {
    return (0 <= x && x <= 255);
  }

  class Color {
    constructor({r=0, g=0, b=0, a=255}) {
      this.r = r;
      this.g = g;
      this.b = b;
      this.a = a;
      
      assert([this.r, this.g, this.b, this.a].every(isValidColorComponent), "Invalid color component");
    }

    rounded() {
      return {
        r: Math.round(this.r),
        g: Math.round(this.g),
        b: Math.round(this.b),
        a: Math.round(this.a)
      };
    }

    hex() {
      let rnd = this.rounded();
      return "#" + [rnd.r, rnd.g, rnd.b, rnd.a].map(x => x.toString(16)).join();
    }

    glColor() {
      return {r: this.r / 255, g: this.g / 255, b: this.b / 255, a: this.a / 255};
    }
  }

  function rgba(r,g,b,a=255) {
    return new Color({r,g,b,a});
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
    constructor(graphemeContext, params={}) {
      super(params);

      // Grapheme context this window is a child of
      this.context = graphemeContext;

      // Element to be put into the webpage
      this.domElement = document.createElement("div");

      // The two canvases of a GraphemeWindow
      this.mainCanvas = document.createElement("canvas");
      this.domElement.appendChild(this.mainCanvas);
      this.textCanvas = document.createElement("canvas");
      this.domElement.appendChild(this.textCanvas);

      // CSS stuffs
      this.mainCanvas.classList.add("grapheme-canvas");
      this.textCanvas.classList.add("grapheme-text-canvas");
      this.domElement.classList.add("grapheme-window");

      // Get the contexts
      this.mainCanvasContext = this.mainCanvas.getContext("bitmaprenderer");
      this.textCanvasContext = this.textCanvas.getContext("2d");

      // The color of the background
      this.backgroundColor = rgba(0,0,0,0);

      // Add this window to the context's list of window
      graphemeContext.windows.push(this);

      // Set the default size to 640 by 480 in CSS pixels
      this.setSize(...DEFAULT_SIZE);
    }

    // Set the size of this window (including adjusting the canvas size)
    // Note that this width and height are in
    setSize(width, height) {
      // cssWidth and cssHeight are in CSS pixels
      this.cssWidth = width;
      this.cssHeight = height;

      // Update the canvas size, factoring in the device pixel ratio
      this._updateCanvasSize();

      // Set the canvas CSS size using CSS
      [this.mainCanvas, this.textCanvas].forEach(canvas => {
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
      });

      // Update the parent context, in case it needs to be resized as well to fit
      // a potentially fatter canvas
      this.context.updateSize();
    }

    // Set the actual canvas pixel size based on the desired width and the DPR
    _updateCanvasSize() {
      this.canvasWidth = this.cssWidth * dpr;
      this.canvasHeight = this.cssHeight * dpr;
    }

    // Returns the pixel width of the canvas
    get canvasWidth() {
      return this.mainCanvas.width;
    }

    // Returns the pixel height of the canvas
    get canvasHeight() {
      return this.mainCanvas.height;
    }

    // Sets the pixel width of the canvas
    set canvasWidth(x) {
      // Round it to an integer and make sure it's in a reasonable range
      x = Math.round(x);
      assert(isPositiveInteger(x) && x < 16384, "canvas width must be in range [1,16383]");

      this.mainCanvas.width = x;
      this.textCanvas.width = x;
    }

    // Sets the pixel height of the canvas
    set canvasHeight(x) {
      x = Math.round(x);
      assert(isPositiveInteger(x) && x < 16384, "canvas height must be in range [1,16383]");

      this.mainCanvas.height = x;
      this.textCanvas.height = x;
    }

    // Event triggered when the device pixel ratio changes
    _onDPRChanged() {
      this._updateCanvasWidth();
    }

    // Destroy this window.
    destroy() {
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

    isActive() {
      return (this.context.activeWindow === this);
    }

    clearToColor(color=this.backgroundColor) {
      assert(this.isActive(), "Window is not currently being rendered");

      // color.r, color.g, color.b, color.a
      let glColor = color.glColor();

      let gl = this.context.glContext;

      gl.clearColor(glColor.r, glColor.g, glColor.b, glColor.a);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    render() {
      // Set the active window to this window, since this is the window being rendered
      this.context.activeWindow = this;

      let err; // potential error in try {...} catch
      let glCanvas = this.context.glCanvas;

      let width = this.canvasWidth, height = this.canvasHeight;

      // Render information to be given to elements
      let renderInfo = {
        gl: this.context.glContext,
        glResourceManager: this.context.glResourceManager,
        text: this.textCanvasContext,
        textCanvas: this.textCanvas,
        width, height
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
        let glBitmap = glCanvas.transferToImageBitmap();
        this.mainCanvasContext.transferFromImageBitmap(glBitmap);
      } catch (e) {
        err = e;
      } finally {
        this.context.activeWindow = null;
      }

      if (err) throw err;
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

    constructor(gl) {
      this.gl = gl;
      this.programs = {};
      this.buffers = {};
    }

    // Compile a program and store it in this.programs
    compileProgram(programName, vertexShaderSource, fragmentShaderSource, vertexAttributeNames=[], uniformNames=[]) {
      if (this.hasProgram(programName)) // if this program name is already taken, delete the old one
        this.deleteProgram(programName);

      let gl = this.gl;

      // The actual gl program itself
      let glProgram = createGLProgram(gl,
        createShaderFromSource(gl, gl.VERTEX_SHADER, vertexShaderSource),
        createShaderFromSource(gl, gl.FRAGMENT_SHADER, fragmentShaderSource));

      // pairs of uniform names and their respective locations
      let uniforms = {};
      for (let i = 0; i < uniformNames.length; ++i) {
        let uniformName = uniformNames[i];

        uniforms[uniformName] = gl.getUniformLocation(glProgram, uniformName);
      }

      // pairs of vertex attribute names and their respective locations
      let vertexAttribs = {};
      for (let i = 0; i < vertexAttributeNames.length; ++i) {
        let vertexAttribName = vertexAttributeNames[i];

        vertexAttribs[vertexAttribName] = gl.getAttribLocation(glProgram, vertexAttribName);
      }

      let programInfo = {program: glProgram, uniforms, attribs: vertexAttribs};
      this.programs[programName] = programInfo;
    }

    // Return whether this has a program with that name
    hasProgram(programName) {
      return !!this.programs[programName];
    }

    // Retrieve a program to use
    getProgram(programName) {
      return this.programs[programName];
    }

    // Delete a program
    deleteProgram(programName) {
      if (!this.hasProgram(programName)) return;

      {
        let programInfo = this.programs[programName];
        this.gl.deleteProgram(programInfo.program);
      }

      // Remove the key from this.programs
      delete this.programs[programName];
    }

    // Create a buffer with the given name
    _createBuffer(bufferName) {
      if (this.hasBuffer(bufferName)) return;

      let gl = this.gl;

      // Create a new buffer
      let buffer = gl.createBuffer();

      this.buffers[bufferName] = buffer;
    }

    hasBuffer(bufferName) {
      return !!this.buffers[bufferName];
    }

    getBuffer(bufferName) {
      if (!this.hasBuffer(bufferName))
        this._createBuffer(bufferName);
      return this.buffers[bufferName];
    }

    deleteBuffer(bufferName) {
      if (!this.hasBuffer(bufferName)) return;
      let buffer = this.getBuffer(bufferName);

      // Delete the buffer from GL memory
      this.gl.deleteBuffer(buffer);
      delete this.buffers[bufferName];
    }
  }

  class GraphemeContext {
    constructor(params={}) {
      // Creates an offscreen canvas to draw to, with an initial size of 1x1
      this.glCanvas = new OffscreenCanvas(1, 1);

      // Create the webgl context!
      let gl = this.glContext = this.glCanvas.getContext("webgl") || this.glCanvas.getContext("experimental-webgl");

      // The gl context must exist, otherwise Grapheme will be pissed (that rhymed)
      assert(gl, "Grapheme requires WebGL to run; please get a competent browser");

      // The gl resource manager for this context
      this.glResourceManager = new GLResourceManager(gl);

      // The list of windows that this context has jurisdiction over
      this.windows = [];

      // The portion of the glCanvas being used
      this.currentViewport = {x: 0, y: 0, width: this.glCanvas.width, height: this.glCanvas.height};

      // Add this to the list of contexts to receive event updates and such
      CONTEXTS.push(this);
    }

    // Set the drawing viewport on glCanvas
    setViewport(width, height, x=0, y=0, setScissor=true) {
      let gl = this.glContext;

      // Check to make sure the viewport dimensions are acceptable
      assert(isPositiveInteger(width) && isPositiveInteger(height) &&
        isNonnegativeInteger(x) && isNonnegativeInteger(y),
        "x, y, width, height must be integers greater than 0 (or = for x,y)");
      assert(x + width <= this.canvasWidth && y + height <= this.canvasHeight, "viewport must be within canvas bounds");

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

    get canvasHeight() {
      return this.glCanvas.height;
    }

    get canvasWidth() {
      return this.glCanvas.width;
    }

    set canvasHeight(x) {
      x = Math.round(x);

      assert(isPositiveInteger(x) && x < 16384, "canvas height must be in range [1,16383]");
      this.glCanvas.height = x;
    }

    set canvasWidth(x) {
      x = Math.round(x);

      assert(isPositiveInteger(x) && x < 16384, "canvas width must be in range [1,16383]");
      this.glCanvas.width = x;
    }

    _onDPRChanged() {
      this.windows.forEach(window => window._onDPRChanged());
    }

    isDestroyed() {
      return CONTEXTS.indexOf(this) === -1;
    }

    // Destroy this context
    destroy() {
      if (this.isDestroyed()) return;

      // Remove from lists of contexts
      let index = CONTEXTS.indexOf(this);
      index !== -1 && CONTEXTS.splice(index, 1);

      // Destroy all children
      this.windows.forEach(window => window.destroy());

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
    createWindow() {
      return new GraphemeWindow(this);
    }

    // Remove a window from this context
    _removeWindow(window) {
      let allWindows = this.context.windows;
      let thisIndex = allWindows.indexOf(window);

      if (thisIndex !== -1)
        allWindow.splice(thisIndex, 1);
    }

    destroyWindow(window) {
      window.destroy();
    }

    // Update the size of this context based on the maximum size of its windows
    updateSize() {
      let maxWidth = 1;
      let maxHeight = 1;

      // Find the max width and height (independently)
      this.windows.forEach(window => {
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

  // list of endcap types
  const ENDCAP_TYPES = {
    "NONE": 0,
    "ROUND": 1
  };

  // list of join types
  const JOIN_TYPES = {
    "NONE": 0,
    "ROUND": 1,
    "MITER": 2,
    "DYNAMIC": 3
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

  function integerInRange(x, min, max) {
    return isInteger(x) && min <= x && x <= max;
  }

  function nextPowerOfTwo(x) {
    return 2 ** Math.ceil(Math.log2(x));
  }

  const MIN_RES_ANGLE = 0.05; // minimum angle in radians between roundings in a polyline

  // Parameters for the expanding/contracting float array for polyline
  const MIN_SIZE = 16;
  const MAX_SIZE = 2 ** 24;

  const POLYLINE_PROGRAM_NAME = "polyline-shader";

  /**
  PolylineElement draws a sequence of line segments connecting points. Put the points
  as ordered pairs, in CANVAS COORDINATES, in polyline.vertices. To disconnect
  points, intersperse them with two consecutive NaNs.
  */
  class PolylineElement extends GraphemeElement {
    constructor(window, params={}) {
      super(window, params);

      this.vertices = select(params.vertices, []);

      this.color = select(params.color, new Color(0,0,0,255));
      this.thickness = 2; // thickness of the polyline in pixels

      this.endcapType = 1; // refer to ENDCAP enum
      this.endcapRes = 0.4; // angle in radians between consecutive roundings
      this.joinType = 3; // refer to ENDCAP enum
      this.joinRes = 0.4; // angle in radians between consecutive roundings

      this.useNative = false;

      // used internally for gl vertices
      this._glTriangleStripVertices = null;
      this._glTriangleStripVerticesTotal = 0;
    }

    static get ENDCAP_TYPES() {
      return ENDCAP_TYPES;
    }

    static get JOIN_TYPES() {
      return JOIN_TYPES;
    }

    _calculateTriangles() {
      if (this.thickness <= 0 ||
        !integerInRange(this.endcapType, 0, 1) ||
        !integerInRange(this.joinType, 0, 3) ||
        this.endcapRes < MIN_RES_ANGLE ||
        this.joinRes < MIN_RES_ANGLE ||
        this.vertices.length <= 3) {

        this._glTriangleStripVerticesTotal = 0; // pretend there are no vertices ^_^
        return;
      }

      let triStripVertices = this._glTriangleStripVertices;

      if (!triStripVertices)
        triStripVertices = this._glTriangleStripVertices = new Float32Array(MIN_SIZE);

      let glTriStripI = 0;
      let that = this; // ew
      let triStripVerticesThreshold = triStripVertices.length - 2;

      function addVertex(x, y) {
        if (glTriStripI > triStripVerticesThreshold) {
          // not enough space!!!!

          let newFloatArray = new Float32Array(2 * triStripVertices.length);
          newFloatArray.set(triStripVertices);

          triStripVertices = that._glTriangleStripVertices = newFloatArray;
          triStripVerticesThreshold = triStripVertices.length - 2;
        }

        triStripVertices[glTriStripI++] = x;
        triStripVertices[glTriStripI++] = y;

        if (needToDupeVertex) {
          needToDupeVertex = false;
          addVertex(x, y);
        }
      }

      function duplicateVertex() {
        addVertex(triStripVertices[glTriStripI - 2], triStripVertices[glTriStripI - 1]);
      }

      let vertices = this.vertices;
      let origVertexCount = vertices.length / 2;

      let th = this.thickness;
      let needToDupeVertex = false;

      let maxMiterLength = th / Math.cos(this.joinRes / 2);

      let x1,x2,x3,y1,y2,y3;
      let v1x, v1y, v2x, v2y, v1l, v2l, b1_x, b1_y, scale, nu_x, nu_y, pu_x, pu_y, dis;

      for (let i = 0; i < origVertexCount; ++i) {
        x1 = (i !== 0) ? vertices[2 * i - 2] : NaN; // Previous vertex
        x2 = vertices[2 * i]; // Current vertex
        x3 = (i !== origVertexCount - 1) ? vertices[2 * i + 2] : NaN; // Next vertex

        y1 = (i !== 0) ? vertices[2 * i - 1] : NaN; // Previous vertex
        y2 = vertices[2 * i + 1]; // Current vertex
        y3 = (i !== origVertexCount - 1) ? vertices[2 * i + 3] : NaN; // Next vertex

        if (isNaN(x1) || isNaN(y1)) { // starting endcap
          let nu_x = x3 - x2;
          let nu_y = y3 - y2;
          let dis = Math.hypot(nu_x, nu_y);

          if (dis === 0) {
            nu_x = 1;
            nu_y = 0;
          } else {
            nu_x /= dis;
            nu_y /= dis;
          }

          if (isNaN(nu_x) || isNaN(nu_y))
            continue; // undefined >:(

          if (this.endcapType === 1) {
            // rounded endcap
            let theta = Math.atan2(nu_y, nu_x) + Math.PI / 2;
            let steps_needed = Math.ceil(Math.PI / this.endcapRes);

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

          if (dis === 0) {
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

          if (this.endcapType === 1) {
            let theta = Math.atan2(pu_y, pu_x) + 3 * Math.PI / 2;
            let steps_needed = Math.ceil(Math.PI / this.endcapRes);

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
          needToDupeVertex = true;

          continue;
        } else { // all vertices are defined, time to draw a joinerrrrr
          if (this.joinType === 2 || this.joinType === 3) {
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

            if (this.joinType === 2 || (Math.abs(scale) < maxMiterLength)) {
              // if the length of the miter is massive and we're in dynamic mode,
              // we exit this if statement and do a rounded join
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

          if (dis === 0) {
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

          if (this.joinType === 1 || this.joinType === 3) {
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
            let steps_needed = Math.ceil(angle_subtended / this.joinRes);

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

      if (glTriStripI * 2 < triStripVertices.length) {
        let newFloatArray = new Float32Array(Math.min(Math.max(MIN_SIZE, nextPowerOfTwo(glTriStripI)), MAX_SIZE));
        newFloatArray.set(triStripVertices.subarray(0, glTriStripI));

        triStripVertices = this._glTriangleStripVertices = newFloatArray;
      }

      this._glTriangleStripVerticesTotal = Math.ceil(glTriStripI / 2);
    }

    _calculateNativeLines() {
      let vertices = this.vertices;

      if (vertices.length <= 3) {
        this._glTriangleStripVerticesTotal = 0;
        return;
      }

      let triStripVertices = this._glTriangleStripVertices;
      if (!triStripVertices) {
        triStripVertices = this._glTriangleStripVertices = new Float32Array(MIN_SIZE);
      }

      if (triStripVertices.length < vertices.length || triStripVertices.length > vertices.length * 2) {
        triStripVertices = this._glTriangleStripVertices = new Float32Array(Math.min(Math.max(MIN_SIZE, nextPowerOfTwo(vertices.length)), MAX_SIZE));
      }

      if (Array.isArray(vertices)) {
        for (let i = 0; i < vertices.length; ++i) {
          triStripVertices[i] = vertices[i];
        }
      } else {
        triStripVertices.set(vertices);
      }

      this._glTriangleStripVerticesTotal = Math.ceil(vertices.length / 2);
    }

    calculateVertices() {
      // Calculate the vertices
      if (!this.useNative) {
        this._calculateTriangles();
      } else {
        this._calculateNativeLines();
      }
    }

    render(renderInfo) {
      // Calculate the vertices
      this.calculateVertices();

      // Potential early exit
      let vertexCount = this._glTriangleStripVerticesTotal;
      if ((this.useNative && vertexCount < 2) || (!this.useNative && vertexCount < 3)) return;

      let gl = renderInfo.gl;
      let glManager = renderInfo.glResourceManager;

      // If there is no polyline program yet, compile one!
      if (!glManager.hasProgram(POLYLINE_PROGRAM_NAME)) {
        glManager.compileProgram(POLYLINE_PROGRAM_NAME,
          vertexShaderSource, fragmentShaderSource,
          ["v_position"], ["xy_scale", "line_color"]);
      }

      let polylineInfo = glManager.getProgram(POLYLINE_PROGRAM_NAME);

      this.addUsedBufferName(this.uuid);
      let glBuffer = glManager.getBuffer(this.uuid);

      // gl, glResourceManager, width, height, text, textCanvas

      // tell webgl to start using the polyline program
      gl.useProgram(polylineInfo.program);

      // bind our webgl buffer to gl.ARRAY_BUFFER access point
      gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer);

      // Get the desired color of our line
      let color = this.color.glColor();

      // set the vec4 at colorLocation to (r, g, b, a)
      gl.uniform4f(polylineInfo.uniforms.line_color, color.r, color.g, color.b, color.a);

      // set the scaling factors
      gl.uniform2f(polylineInfo.uniforms.xy_scale, 2 / renderInfo.width, -2 / renderInfo.height);

      // copy our vertex data to the GPU
      gl.bufferData(gl.ARRAY_BUFFER, this._glTriangleStripVertices, gl.DYNAMIC_DRAW /* means we will rewrite the data often */ );

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
