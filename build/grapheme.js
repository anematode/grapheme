var Grapheme = (function (exports) {
  'use strict';

  // This file defines some common utilities that Grapheme uses!

  // A list of all extant Grapheme Contexts
  const CONTEXTS = [];

  // Assert that a statement is true, and throw an error if it's not
  function assert (statement, error = 'Unknown error') {
    if (!statement) throw new Error(error)
  }

  function isNonnegativeInteger (z) {
    return Number.isInteger(z) && z >= 0
  }

  function isPositiveInteger (z) {
    return Number.isInteger(z) && z > 0
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

  let x = 0;

  function getRenderID () {
    x += 1;
    return x
  }

  class GraphemeElement {
    constructor ({
      precedence = 0,
      visible = true,
      alwaysUpdate = true
    } = {}) {
      // precedence is a number from -Infinity to Infinity.
      this.precedence = precedence;

      // whether this element is visible
      this.visible = visible;

      // Whether to always update geometries when render is called
      this.alwaysUpdate = alwaysUpdate;

      // The parent of this element
      this.parent = null;

      // The plot this element belongs to
      this.plot = null;

      // List of children of this element
      this.children = [];
    }

    sortChildren () {
      this.children.sort((x, y) => x.precedence - y.precedence);
    }

    hasChildren () {
      return this.children.length > 0
    }

    add (element) {
      if (!(element instanceof GraphemeElement))
        throw new Error("Element must be GraphemeElement")

      if (element.parent || element.plot) {
        throw new Error('Element already has a parent or plot')
      }

      element.parent = this;
      element.setPlot(this.plot);

      this.children.push(element);
    }

    isChild(element, recursive=true) {
      const isTopLevelChild = this.children.includes(element);

      if (!recursive) {
        return isTopLevelChild
      }

      return isTopLevelChild || this.children.forEach(child => child.isChild(element, true))
    }

    remove (element) {
      if (!this.isChild(element, false)) {
        throw new Error("Element is not a top level child of this")
      }

      const index = this.children.indexOf(element);
      if (index !== -1) {
        this.children.splice(index, 1);
      } else {
        throw new Error("Element is not a top level child of this")
      }

      element.parent = null;
      element.setPlot(null);
    }

    setPlot(plot) {
      this.plot = plot;

      // eslint-disable-next-line no-return-assign
      this.children.forEach(child => child.plot = plot);
    }

    update () {

    }

    render (elementInfo) {
      if (!this.visible) {
        return
      }

      if (this.alwaysUpdate) {
        this.update();
      }

      elementInfo.window.beforeRender(this);
    }

    hasChild () {
      return false
    }
  }

  class GraphemeGroup extends GraphemeElement {
    constructor(params={}) {
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
  class GraphemeWindow extends GraphemeGroup {
    constructor (graphemeContext) {
      super();

      // Grapheme context this window is a child of
      this.context = graphemeContext;

      this.window = this;

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

      this.addEventListener('dprchanged', () => this.update());
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

      this.onEvent("resize", {width, height});
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

      // The list of windows that this context has jurisdiction over
      this.windows = [];

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
      this.glManager.destroy();

      // Free up canvas space immediately
      this.canvasWidth = 1;
      this.canvasHeight = 1;

      // Delete references to various stuff
      delete this.glManager;
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

      if (thisIndex !== -1) {
        allWindows.splice(thisIndex, 1);
        if (window.context) {
          window.context = null;
        }
      }
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

  class Plot2DElement extends GraphemeGroup {
    constructor(params={}) {
      super(params);

      this.plot = null;
    }

    setPlot(plot) {
      this.plot = plot;

      this.children.forEach(child => (child.plot ? child.setPlot(plot) : 0));
    }

    add(element, ...elements) {

      if (elements.length > 0) {
        super.add(element, ...elements);
      } else {
        super.add(element);

        if (element.setPlot) {
          element.setPlot(this.plot);
        }
      }
    }

    remove(element, ...elements) {
      if (elements.length > 0) {
        super.remove(element, ...elements);
      } else {
        super.remove(element);

        if (element.setPlot) {
          element.setPlot(null);
        }
      }
    }
  }

  class Plot2D extends Plot2DElement {
    constructor (params = {}) {
      super(params);

      this.setPlot(this);

      this.box = { x: 0, y: 0, width: 640, height: 480 };
      this.plotCoords = { cx: 0, cy: 0, width: 5, height: 5 };
      this.plottingBox = {};

      this.preserveAspectRatio = false;
      this.aspectRatio = 1;

      this.plottingBoxPath = null;
      this.fullscreen = true;

      this.updatePlotTransform();
    }

    resizeIfFullscreen () {
      if (this.fullscreen && this.window) {
        this.box.x = 0;
        this.box.y = 0;

        this.box.width = this.window.width;
        this.box.height = this.window.height;
      }
    }

    updatePlotTransform () {
      this.resizeIfFullscreen();

      this.calculatePlottingBox();
      this.updatePlotCoords();
    }

    updatePlotCoords () {
      const pc = this.plotCoords;
      const pb = this.plottingBox;

      if (this.preserveAspectRatio) {
        const as = this.aspectRatio;

        pc.height = pc.width / pb.width * as * pb.height;
      }

      pc.x1 = pc.cx - pc.width / 2;
      pc.x2 = pc.cx + pc.width / 2;
      pc.y1 = pc.cy - pc.height / 2;
      pc.y2 = pc.cy + pc.height / 2;
    }

    plotToPixelX (x) {
      return (x - this.plotCoords.x1) * (this.plottingBox.width) / (this.plotCoords.width) + this.plottingBox.x1
    }

    plotToPixelY (y) {
      return (y - this.plotCoords.y1) * (this.plottingBox.height) / (this.plotCoords.height) + this.plottingBox.y1
    }

    plotToPixel (x, y) {
      return [this.plotToPixelX(x), this.plotToPixelY(y)]
    }

    calculatePlottingBox () {
      this.plottingBox.x1 = this.box.x + this.margins.left;
      this.plottingBox.y1 = this.box.y + this.margins.top;

      const width = this.box.width - this.margins.left - this.margins.right;
      const height = this.box.height - this.margins.top - this.margins.bottom;

      if (width < 50 || height < 50) {
        throw new Error('Plotting box is too small')
      }

      this.plottingBox.width = width;
      this.plottingBox.height = height;

      this.plottingBox.x2 = this.plottingBox.x1 + width;
      this.plottingBox.y2 = this.plottingBox.y1 + height;

      const pb = this.plottingBox;
      const plottingMaskPath = new Path2D();

      plottingMaskPath.moveTo(pb.x1, pb.y1);
      plottingMaskPath.lineTo(pb.x2, pb.y1);
      plottingMaskPath.lineTo(pb.x2, pb.y2);
      plottingMaskPath.lineTo(pb.x1, pb.y2);
      plottingMaskPath.closePath();

      this.plottingBoxPath = plottingMaskPath;
    }

    update () {
      this.updatePlotTransform();
    }

    add (element, ...elements) {
      if (element instanceof Plot2D) {
        throw new Error("Can't have plot2d in plot2d")
      }

      super.add(element, ...elements);
    }
  }

  function defaultMandelbrotColorFunction (iterations, r) {
    if (iterations === -1) {
      return [0, 0, 0, 255]
    } else {
      return [255, 255, 255, 255]
    }
  }

  class Mandelbrot extends Plot2DElement {
    constructor (params = {}) {
      super(params);

      this.alwaysUpdate = false;

      this.imgData = false;

      this.smoothColoring = true;

      this.getColor = defaultMandelbrotColorFunction;

      this.samples = 1;

      this.pxWidth = 0;
      this.pxHeight = 0;

      this.iterations = 100;
    }

    update () {
      this.pxWidth = this.plot.plottingBox.width * dpr;
      this.pxHeight = this.plot.plottingBox.height * dpr;

      const imgData = this.window.canvasCtx.createImageData(this.pxWidth, this.pxHeight);

      const pc = this.plot.plotCoords;
      const iterations = this.iterations;

      for (let j = 0; j < this.pxHeight; ++j) {
        const y = pc.height * j / this.pxHeight + pc.y1;
        for (let i = 0; i < this.pxHeight; ++i) {
          const x = pc.width * i / this.pxWidth + pc.x1;

          const index = 4 * (this.pxWidth * j + i);

          let xt = x;
          let yt = y;
          let mag2 = xt * xt + yt * yt;
          let iter = 0;

          while (mag2 < 4 && iter < iterations) {
            const xtt = xt;

            xt = xt * xt - yt * yt + x;
            yt = 2 * xtt * yt + y;
            mag2 = xt * xt + yt * yt;

            iter += 1;
          }

          if (iter === iterations) {
            iter = -1;
          }

          const color = this.getColor(iter, mag2 - 4);

          imgData.data[index] = color[0];
          imgData.data[index + 1] = color[1];
          imgData.data[index + 2] = color[2];
          imgData.data[index + 3] = color[3];
        }
      }

      this.imgData = imgData;
    }

    render (renderInfo) {
      if (this.imgData) {
        const ctx = renderInfo.canvasCtx;
        ctx.save();
        ctx.resetTransform();

        ctx.putImageData(this.imgData, dpr * this.plot.plottingBox.x1, dpr * this.plot.plottingBox.y1);
        ctx.restore();
      }
    }
  }

  exports.Context = GraphemeContext;
  exports.Mandelbrot = Mandelbrot;
  exports.Plot2D = Plot2D;

  return exports;

}({}));
