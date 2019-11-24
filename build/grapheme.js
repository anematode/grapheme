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

  function isPositiveInteger(z) {
    return Number.isInteger(z) && z > 0;
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

  // Implementation of basic color functions
  // Could use a library, but... good experience for me too

  function isValidColorComponent(x) {
    return (0 <= x && x <= 255);
  }

  class Color {
    constructor(params) {
      this.r = select(params.r, 0);
      this.g = select(params.g, 0);
      this.b = select(params.b, 0);
      this.a = select(params.a, 255);

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
  class GraphemeWindow {
    constructor(graphemeContext, params={}) {
      this.context = graphemeContext;

      this.domElement = document.createElement("div");

      this.mainCanvas = document.createElement("canvas");
      this.domElement.appendChild(this.mainCanvas);
      this.textCanvas = document.createElement("canvas");
      this.domElement.appendChild(this.textCanvas);

      this.mainCanvas.classList.add("grapheme-canvas");
      this.textCanvas.classList.add("grapheme-text-canvas");
      this.domElement.classList.add("grapheme-window");

      this.mainCanvasContext = this.mainCanvas.getContext("bitmaprenderer");
      this.textCanvasContext = this.textCanvas.getContext("2d");
      this.clearColor = rgba(0,0,0,0);

      this.elements = [];

      graphemeContext.windows.push(this);

      this.setSize(640, 480);
    }

    setSize(width, height) {
      this.clientWidth = width;
      this.clientHeight = height;

      this._updateCanvasSize();

      [this.mainCanvas, this.textCanvas].forEach(canvas => {
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
      });

      this.context.updateSize();
    }

    _updateCanvasSize() {
      this.canvasWidth = this.clientWidth * dpr;
      this.canvasHeight = this.clientHeight * dpr;
    }

    get canvasWidth() {
      return this.mainCanvas.width;
    }

    get canvasHeight() {
      return this.mainCanvas.height;
    }

    set canvasWidth(x) {
      x = Math.round(x);
      assert(isPositiveInteger(x) && x < 16384, "canvas width must be in range [1,16383]");

      this.mainCanvas.width = x;
      this.textCanvas.width = x;
    }

    set canvasHeight(x) {
      x = Math.round(x);
      assert(isPositiveInteger(x) && x < 16384, "canvas height must be in range [1,16383]");

      this.mainCanvas.height = x;
      this.textCanvas.height = x;
    }

    _onDPRChanged() {
      this._updateCanvasWidth();
    }

    destroy() {
      try {
        this.domElement.parentNode.remove(this.domElement);
      } catch (e) {}

      let allWindows = this.context.windows;
      let thisIndex = allWindows.indexOf(this);

      if (thisIndex !== -1) {
        allWindow.splice(thisIndex, 1);
      }

      this.context.updateSize();
    }

    isActive() {
      return (this.context.activeWindow === this);
    }

    clearToColor(color=this.clearColor) {
      assert(this.isActive(), "Window is not currently being rendered");

      // color.r, color.g, color.b, color.a
      let glColor = color.glColor();

      let gl = this.context.internalglContext;

      gl.clearColor(glColor.r, glColor.g, glColor.b, glColor.a);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    sortElementsByPrecedence() {
      this.elements.sort((x, y) => (x.precedence - y.precedence));
    }

    render() {
      this.context.activeWindow = this;
      let err;

      let gl = this.context.gl;
      let glCanvas = this.context.internalglCanvas;

      try {
        // Set the viewport to this canvas's size
        this.context.setViewport(this.canvasWidth, this.canvasHeight);

        // clear the canvas
        this.clearToColor();

        // sort our elements by drawing precedence
        this.sortElementsByPrecedence();

        let elementInfo = {gl, glCanvas, text: this.textCanvasContext, textCanvas: this.textCanvas};

        // draw each element
        for (let i = 0; i < this.elements.length; ++i) {
          let element = this.elements[i];

          element.render(elementInfo);
        }

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

  class GraphemeContext {
    constructor(params={}) {
      this.internalglCanvas = new OffscreenCanvas(256, 256);
      let gl = this.internalglContext = this.internalglCanvas.getContext("webgl") || this.internalglCanvas.getContext("experimental-webgl");

      assert(gl, "Grapheme requires WebGL to run; please get a competent browser");

      this.windows = [];

      this.glInfo = {
        version: gl.getParameter(gl.VERSION)
      };

      this.glShaders = {};
      this.currentViewport = {x: 0, y: 0, width: this.internalCanvasWidth, height: this.internalCanvasHeight};

      CONTEXTS.push(this);
    }

    setViewport(width, height, x=0,y=0, setScissor=true) {
      assert(width > 0 && height > 0, "width and height must be greater than 0");
      assert(x >= 0 && y >= 0, "x and y values must be greater than or equal to 0");
      assert(x + width <= this.internalCanvasWidth && y + height <= this.internalCanvasHeight, "viewport must be within canvas bounds");

      this.currentViewport.x = x;
      this.currentViewport.y = y;

      this.currentViewport.width = width;
      this.currentViewport.height = height;

      let gl = this.internalglContext;

      gl.viewport(x, y, width, height);

      if (setScissor) {
        gl.enable(gl.SCISSOR_TEST);
        this.internalglContext.scissor(x, y, width, height);
      } else {
        gl.disable(gl.SCISSOR_TEST);
      }
    }

    get internalCanvasHeight() {
      return this.internalglCanvas.height;
    }

    get internalCanvasWidth() {
      return this.internalglCanvas.width;
    }

    set internalCanvasHeight(x) {
      x = Math.round(x);

      assert(isPositiveInteger(x) && x < 16384, "canvas height must be in range [1,16383]");
      this.internalglCanvas.height = x;
    }

    set internalCanvasWidth(x) {
      x = Math.round(x);

      assert(isPositiveInteger(x) && x < 16384, "canvas width must be in range [1,16383]");
      this.internalglCanvas.width = x;
    }

    _onDPRChanged() {
      this.windows.forEach(window => window._onDPRChanged());
    }

    isDestroyed() {
      return CONTEXTS.indexOf(this) === 1;
    }

    destroy() {
      let index = CONTEXTS.indexOf(this);

      index !== -1 && CONTEXTS.splice(index, 1);
    }

    createWindow() {
      return new GraphemeWindow(this);
    }

    updateSize() {
      let maxWidth = 1;
      let maxHeight = 1;

      this.windows.forEach(window => {
        if (window.canvasWidth > maxWidth) {
          maxWidth = window.canvasWidth;
        }

        if (window.canvasHeight > maxHeight) {
          maxHeight = window.canvasHeight;
        }
      });

      this.internalCanvasHeight = maxHeight;
      this.internalCanvasWidth = maxWidth;
    }
  }

  exports.Context = GraphemeContext;

  return exports;

}({}));
