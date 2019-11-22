var Grapheme = (function (exports) {
  'use strict';

  function select(opt1, ...opts) {
    // this function takes in a variadic list of arguments and returns the first
    // one that's not undefined lol

    if (opts.length === 0)
      return opt1;
    if (opt1 === undefined) {
      return select(...opts);
    }
    return opt1;
  }

  let id = 0;

  function getID() {
    return id++;
  }

  function assert(statement, error = "Unknown error") {
    if (!statement) {
      throw new Error(error);
    }
  }

  function checkType(obj, type, funcName="") {
    assert(obj instanceof type,
      (funcName ? "Function " + funcName : ": ")
      + "Object must be instanceof " + type);
  }

  // https://stackoverflow.com/questions/201183/how-to-determine-equality-for-two-javascript-objects
  function deepEquals(x, y) {
    const ok = Object.keys, tx = typeof x, ty = typeof y;
    return x && y && tx === 'object' && tx === ty ? (
      ok(x).length === ok(y).length &&
        ok(x).every(key => deepEquals(x[key], y[key]))
    ) : (x === y);
  }

  function roundToCanvasCoord(c) {
    return Math.round(c-0.5)+0.5;
  }

  function _ctxDrawPath(ctx, arr) {
    ctx.beginPath();

    for (let i = 2; i < arr.length; i += 2) {
      ctx.lineTo(arr[i], arr[i+1]);
    }

    ctx.stroke();
  }

  function isInteger(z) {
    return Number.isInteger(z); // didn't know about this lol
  }

  function isNonnegativeInteger(z) {
    return Number.isInteger(z) && z >= 0;
  }

  function isPositiveInteger(z) {
    return Number.isInteger(z) && z > 0;
  }

  function isNonpositiveInteger(z) {
    return Number.isInteger(z) && z <= 0;
  }

  function isNegativeInteger(z) {
    return Number.isInteger(z) && z < 0;
  }

  // https://stackoverflow.com/a/34749873
  function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }

  // https://stackoverflow.com/a/34749873
  function mergeDeep(target, ...sources) {
    if (!sources.length) return target;
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

    return mergeDeep(target, ...sources);
  }

  function isApproxEqual(v, w, eps=1e-5) {
    return Math.abs(v - w) < eps;
  }
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

  let dpr = window.devicePixelRatio;

  function updateDPR() {
    dpr = window.devicePixelRatio;
  }

  let mod = function mod(n, m) {
    return ((n % m) + m) % m;
  };

  let _updateDPRinterval = setInterval(updateDPR);

  function expandVerticesIntoTriangles(thickness = 1, vertices, triangles) {

  }

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

  var utils = /*#__PURE__*/Object.freeze({
    mod: mod,
    _updateDPRinterval: _updateDPRinterval,
    get dpr () { return dpr; },
    select: select,
    getID: getID,
    assert: assert,
    checkType: checkType,
    deepEquals: deepEquals,
    roundToCanvasCoord: roundToCanvasCoord,
    _ctxDrawPath: _ctxDrawPath,
    isInteger: isInteger,
    isNonnegativeInteger: isNonnegativeInteger,
    isNonpositiveInteger: isNonpositiveInteger,
    isNegativeInteger: isNegativeInteger,
    isPositiveInteger: isPositiveInteger,
    mergeDeep: mergeDeep,
    isApproxEqual: isApproxEqual,
    createShaderFromSource: createShaderFromSource,
    expandVerticesIntoTriangles: expandVerticesIntoTriangles,
    createGLProgram: createGLProgram
  });

  class ContextElement {
    constructor(grapheme_context, params={}) {
      // The grapheme context containing this element
      this.context = grapheme_context;

      // A unique numeric ID (nonnegative integer) associated with this element
      this.id = getID();

      // Effectively the z-index of the element; in what order will this element be drawn?
      this.precedence = select(params.precedence, 1);

      // Whether or not to call draw() on this element, though this can be overriden
      // by this.override_display (TODO)
      this.display = select(params.display, true);

      // The Date at which this was last drawn
      this.lastDrawn = -1;

      // Formally adds this element to the grapheme context it is a part of,
      // allowing it to be manipulated from the context itself
      this.context.addElement(this);
    }

    draw() {
      if (!this.override_display && !this.display) return;

      // Set the time at which it was last drawn
      this.lastDrawn = Date.now();
    }

    destroy() {
      // Remove this element from the parent context
      this.remove();
    }

    remove() {
      // Remove this element from the parent context
      this.context.removeElement(this);
    }
  }

  class GraphemeContext {
    constructor(params = {}) {
      this.container_div = select(params.container, params.container_div);

      assert(this.container_div.tagName === "DIV",
        "Grapheme Context needs to be given a container div. Please give Grapheme a house to live in! :(");

      this.canvas = document.createElement("canvas");
      this.container_div.appendChild(this.canvas);
      this.text_canvas = document.createElement("canvas");
      this.container_div.appendChild(this.text_canvas);

      this.canvas.classList.add("grapheme-canvas");
      this.text_canvas.classList.add("grapheme-text-canvas");

      this.text_canvas_ctx = this.text_canvas.getContext("2d");
      this.gl = this.canvas.getContext("webgl") || this.canvas.getContext("experimental-webgl");

      assert(this.gl, "This browser does not support WebGL, which is required by Grapheme");

      this.elements = [];

      // x is of the center, y is of the center, width is the total width, height is the total height
      // Cartesian coordinates
      this.viewport = {x: 0, y: 0, width: 1, height: 1};
      this._margins = {top: 40, left: 40, bottom: 40, right: 40}; // pixels

      // 0 <= r,g,b <= 255, 0 <= a <= 1 please!
      this.clear_color = {r: 255, g: 255, b: 255, a: 0.95};
      this.gl_infos = {};

      this._addResizeEventListeners();
    }

    get margin_top() {
      return this._margins.top;
    }

    set margin_top(val) {
      assert(val >= 0, "Margin must be nonnegative");

      this._margins.top = val;
    }

    get margin_bottom() {
      return this._margins.bottom;
    }

    set margin_bottom(val) {
      assert(val >= 0, "Margin must be nonnegative");

      this._margins.bottom = val;
    }

    drawFrame() {
      this.clearCanvas();

      let info = {
        viewport: this.viewport,
        viewport_changed: deepEquals(this.viewport, this._last_viewport)
      };

      this._last_viewport = {...this.viewport};

      for (let i = 0; i < this.elements.length; ++i) {
        this.elements[i].draw(this.canvas, this.canvas_ctx, info);
      }
    }

    // Element manipulation stuffs

    addElement(element) {
      assert(!this.containsElement(element), "element already added to this context");
      assert(element.context === this, "element cannot be a child of two contexts");

      this.elements.push(element);
    }

    deleteElementById(id) {
      for (let i = 0; i < this.elements.length; ++i) {
        if (this.elements[i].id === id) {
          this.elements.split(i, 1);
          return true;
        }
      }

      return false;
    }

    containsElementById(id) {
      for (let i = 0; i < this.elements.length; ++i) {
        if (this.elements[i].id === id) {
          return true;
        }
      }

      return false;
    }

    containsElement(elem) {
      checkType(elem, ContextElement, "deleteElement");
      return this.containsElementById(elem.id);
    }

    deleteElement(elem) {
      checkType(elem, ContextElement, "deleteElement");
      return this.deleteElementById(elem.id);
    }

    getElementById(id) {
      for (let i = 0; i < this.elements.length; ++i) {
        if (this.elements[i].id === id) {
          return this.elements[i];
        }
      }

      return null;
    }

    sortElementPrecedence() {
      this.elements.sort((a,b) => a.precedence - b.precedence);
    }

    // Canvas management stuff

    onResize() {
      this.resizeCanvas();
    }

    resizeCanvas() {
      let boundingRect = this.container_div.getBoundingClientRect();

      this.css_width = boundingRect.width;
      this.css_height = boundingRect.height;
      this.width = this.canvas.width = this.text_canvas.width =
        Math.floor(devicePixelRatio * boundingRect.width);
      this.height = this.canvas.height = this.text_canvas.height =
        Math.floor(devicePixelRatio * boundingRect.height);
      this.text_canvas_ctx.scale(devicePixelRatio, devicePixelRatio);

      // set the GL viewport to the whole canvas
      this.gl.viewport(0, 0, this.width, this.height);
    }

    _addResizeEventListeners() {
      this.resize_observer = new ResizeObserver(() => this.onResize());
      this.resize_observer.observe(this.container_div);
      window.addEventListener("load", () => this.onResize(), {once: true});
    }

    clearCanvas(color=this.clear_color) {
      let gl = this.gl; // alias for the GL context

      // set the COLOR_CLEAR_VALUE to the desired color
      gl.clearColor(color.r / 255, color.g / 255, color.b / 255, color.a);

      // set all colors to the COLOR_CLEAR_VALUE
      gl.clear(gl.COLOR_BUFFER_BIT);

      this.text_canvas_ctx.clearRect(0, 0, this.css_width, this.css_height);
    }

    pixelToCartesian(x,y) {
      return {x: (x / this.css_width - 0.5) * this.viewport.width + this.viewport.x,
        y: -(y / this.css_height - 0.5) * this.viewport.height + this.viewport.y};
    }

    pixelToCartesianFloatArray(arr) {
      let w = this.css_width, vw = this.viewport.width, vx = this.viewport.x;
      let h = this.css_height, vh = this.viewport.height, vy = this.viewport.y;

      for (let i = 0; i < arr.length; i += 2) {
        arr[i] = (arr[i] / w - 0.5) * vw + vx;
        arr[i+1] = -(arr[i+1] / h - 0.5) * vh + vy;
      }

      return arr;
    }

    cartesianToPixel(x,y) {
      return {x: this.css_width * ((x - this.viewport.x) / this.viewport.width + 0.5),
        y: this.css_height * (-(y - this.viewport.y) / this.viewport.height + 0.5)};
    }

    cartesianToPixelFloatArray(arr) {
      let w = this.css_width, vw = this.viewport.width, vx = this.viewport.x;
      let h = this.css_height, vh = this.viewport.height, vy = this.viewport.y;

      for (let i = 0; i < arr.length; i += 2) {
        arr[i] = w * ((arr[i] - vx) / vw + 0.5);
        arr[i+1] = h * (-(arr[i+1] - vy) / vh + 0.5);
      }

      return arr;
    }

    pixelToCartesianX(x) {
      return (x / this.css_width - 0.5) * this.viewport.width + this.viewport.x;
    }

    pixelToCartesianXFloatArray(arr) {
      let w = this.css_width, vw = this.viewport.width, vx = this.viewport.x;

      for (let i = 0; i < arr.length; ++i) {
        arr[i] = (arr[i] / w - 0.5) * vw + vx;
      }

      return arr;
    }

    cartesianToPixelX(x) {
      return this.css_width * ((x - this.viewport.x) / this.viewport.width + 0.5);
    }

    cartesianToPixelXFloatArray(arr) {
      let w = this.css_width, vw = this.viewport.width, vx = this.viewport.x;

      for (let i = 0; i < arr.length; ++i) {
        arr[i] = w * ((arr[i] - vx) / vw + 0.5);
      }

      return arr;
    }

    pixelToCartesianY(y) {
      return -(y / this.css_height - 0.5) * this.viewport.height + this.viewport.y;
    }

    pixelToCartesianYFloatArray(arr) {
      let h = this.css_height, vh = this.viewport.height, vy = this.viewport.y;

      for (let i = 0; i < arr.length; ++i) {
        arr[i] = -(arr[i] / h - 0.5) * vh + vy;
      }

      return arr;
    }

    cartesianToPixelY(y) {
      return this.css_height * (-(y - this.viewport.y) / this.viewport.height + 0.5);
    }

    cartesianToCartesianYFloatArray(arr) {
      let h = this.height, vh = this.viewport.height, vy = this.viewport.y;

      for (let i = 0; i < arr.length; ++i) {
        arr[i] = h * (-(arr[i] - vy) / vh + 0.5);
      }

      return arr;
    }

    cartesianToPixelV(x,y) {
      return {x: this.css_width * x / this.viewport.width, y: -this.height * y / this.viewport.height};
    }

    cartesianToPixelVFloatArray(arr) {
      let wr = this.css_width / this.viewport.width;
      let hr = -this.css_height / this.viewport.height;

      for (let i = 0; i < arr.length; i += 2) {
        arr[i] = wr * arr[i];
        arr[i+1] = hr * arr[i+1];
      }

      return arr;
    }

    pixelToCartesianV(x,y) {
      return {x: this.viewport.width * x / this.css_width, y: -this.viewport.height * y / this.css_height};
    }

    pixelToCartesianVFloatArray(arr) {
      let wrp = this.viewport.width / this.css_width;
      let hrp = -this.viewport.height / this.css_height;

      for (let i = 0; i < arr.length; i += 2) {
        arr[i] = wrp * arr[i];
        arr[i+1] = hrp * arr[i+1];
      }

      return arr;
    }

    cartesianToPixelVX(x) {
      return this.css_width * x / this.viewport.width;
    }

    cartesianToPixelVXFloatArray(arr) {
      let wr = this.css_width / this.viewport.width;

      for (let i = 0; i < arr.length; i++) {
        arr[i] = wr * arr[i];
      }

      return arr;
    }

    cartesianToPixelVY(y) {
      return -this.css_height * y / this.viewport.height;
    }

    cartesianToPixelVYFloatArray(y) {
      let hr = -this.css_height / this.viewport.height;

      for (let i = 0; i < arr.length; i++) {
        arr[i] = hr * arr[i];
      }

      return arr;
    }

    pixelToCartesianVX(x) {
      return this.viewport.width * x / this.css_width;
    }

    pixelToCartesianVXFloatArray(arr) {
      let wrp = this.viewport.width / this.css_width;

      for (let i = 0; i < arr.length; i++) {
        arr[i] = wrp * arr[i];
      }

      return arr;
    }

    pixelToCartesianVY(y) {
      return -this.viewport.height * y / this.css_height;
    }

    pixelToCartesianVYFloatArray(arr) {
      let hrp = -this.viewport.height / this.css_height;

      for (let i = 0; i < arr.length; i++) {
        arr[i] = hrp * arr[i];
      }

      return arr;
    }

    // For the GL canvas

    cartesianToGL(x,y) {
      return {x: this.width * ((x - this.viewport.x) / this.viewport.width + 0.5),
        y: this.height * (-(y - this.viewport.y) / this.viewport.height + 0.5)};
    }

    cartesianToGLFloatArray(arr) {
      let w = this.width, vw = this.viewport.width, vx = this.viewport.x;
      let h = this.height, vh = this.viewport.height, vy = this.viewport.y;

      for (let i = 0; i < arr.length; i += 2) {
        arr[i] = w * ((arr[i] - vx) / vw + 0.5);
        arr[i+1] = h * (-(arr[i+1] - vy) / vh + 0.5);
      }

      return arr;
    }

    cartesianToGLX(x) {
      return 2 * (x - this.viewport.x) / this.viewport.width;
    }

    cartesianToGLXFloatArray(arr) {
      let div_vw = 2 / this.viewport.width, vx = this.viewport.x;

      for (let i = 0; i < arr.length; ++i) {
        arr[i] = (arr[i] - vx) * div_vw;
      }

      return arr;
    }

    cartesianToGLY(y) {
      return 2 * (y - this.viewport.y) / this.viewport.height;
    }

    cartesianToGLYFloatArray(arr) {
      let div_vh = 2 / this.viewport.height, vy = this.viewport.y;

      for (let i = 0; i < arr.length; ++i) {
        arr[i] = (vy - arr[i]) * div_vh;
      }

      return arr;
    }

    cartesianToGLVX(x) {
      return 2 * x / this.viewport.width;
    }

    cartesianToGLVXFloatArray(arr) {
      let wr = 2 / this.viewport.width;

      for (let i = 0; i < arr.length; i++) {
        arr[i] = wr * arr[i];
      }

      return arr;
    }

    cartesianToGLVY(y) {
      return 2 * y / this.viewport.height;
    }

    cartesianToGLVYFloatArray(y) {
      let hr = 2 / this.viewport.height;

      for (let i = 0; i < arr.length; i++) {
        arr[i] = hr * arr[i];
      }

      return arr;
    }

    GLVXToCartesian(x) {
      return this.viewport.width * x / 2;
    }

    GLVYToCartesian(y) {
      return -this.viewport.height * y / 2;
    }

    pixelToGLVX(x) {
      return 2 * x / this.width;
    }

    pixelToGLVY(y) {
      return 2 * y / this.height;
    }

    pixelToGLFloatArray(arr, compute_first=arr.length) {
      let x_scale = 2 / this.width, y_scale = -2 / this.height;

      assert(compute_first <= arr.length);

      if (compute_first < 100 || !(arr instanceof Float32Array)) {
        for (let i = 0; i < compute_first; i += 2) {
          arr[i] = arr[i] * x_scale - 1;
          arr[i+1] = arr[i+1] * y_scale + 1;
        }
      } else {
        let error, buffer;

        try {
          buffer = Module._malloc(compute_first * Float32Array.BYTES_PER_ELEMENT);

          Module.HEAPF32.set(arr.subarray(0, compute_first), buffer >> 2);

          Module.ccall("pixelToGLFloatArray", null, ["number", "number", "number", "number"], [buffer, compute_first, x_scale, y_scale]);

          arr.set(Module.HEAPF32.subarray(buffer >> 2, (buffer >> 2) + compute_first));
        } catch(e) {
          error = e;
        } finally {
          Module._free(buffer);
        }

        if (error) throw error;
      }

      return arr;

    }

    minX() {
      return this.viewport.x - this.viewport.width / 2;
    }

    minY() {
      return this.viewport.y - this.viewport.height / 2;
    }

    maxX() {
      return this.viewport.x + this.viewport.width / 2;
    }

    maxY() {
      return this.viewport.y + this.viewport.height / 2;
    }

    cartesianXInView(x) {
      return Math.abs(x - this.viewport.x) <= this.viewport.width / 2;
    }

    cartesianYInView(y) {
      return Math.abs(y - this.viewport.y) <= this.viewport.height / 2;
    }
  }

  function getMouseOnCanvas(canvas, evt) {
    let rect = canvas.getBoundingClientRect();

    return {x: (evt.clientX - rect.left), y: (evt.clientY - rect.top)};
  }

  class InteractiveContext extends GraphemeContext {
    constructor(context, params={}) {
      super(context, params);

      this.interactivityEnabled = true;
      this.scrollSpeed = 1.4;

      this._addMouseEvtListeners();
    }

    _addMouseEvtListeners() {
      assert(!this._listenersAdded, "listeners already added!");
      this._listenersAdded = true;

      this.listeners = {
        "mousedown": evt => this._mouseDown(evt),
        "wheel": evt => this._onScroll(evt)
      };

      for (let key in this.listeners) {
        this.container_div.addEventListener(key, this.listeners[key]);
      }

      this.window_listeners = {
        "mouseup": evt => this._mouseUp(evt),
        "mousemove": evt => this._mouseMove(evt)
      };

      for (let key in this.window_listeners) {
        window.addEventListener(key, this.window_listeners[key]);
      }
    }

    _removeMouseEvtListeners() {
      this._listenersAdded = false;

      for (let key in this.listeners) {
        this.container_div.removeEventListener(key, this.listeners[key]);
        delete this.listeners[key];
      }

      for (let key in this.window_listeners) {
        this.window.removeEventListener(key, this.window_listeners[key]);
      }
    }

    _mouseDown(evt) {
      if (!this.interactivityEnabled) return;

      let coords = getMouseOnCanvas(this.canvas, evt);

      this._mouse_down_coordinates = this.pixelToCartesian(coords.x, coords.y);
      this._is_mouse_down = true;
    }

    _mouseUp(evt) {
      if (!this.interactivityEnabled) return;

      let coords = getMouseOnCanvas(this.canvas, evt);

      this._is_mouse_down = false;
    }

    _mouseMove(evt) {
      if (!this.interactivityEnabled) return;

      if (!this._is_mouse_down) return;


      let coords = getMouseOnCanvas(this.canvas, evt);
      let cartesian_coords = this.pixelToCartesian(coords.x, coords.y);

      this.viewport.x -= cartesian_coords.x - this._mouse_down_coordinates.x;
      this.viewport.y -= cartesian_coords.y - this._mouse_down_coordinates.y;
    }

    _onScroll(evt) {
      if (!this.interactivityEnabled) return;

      let coords = getMouseOnCanvas(this.canvas, evt);
      let cartesian_coords = this.pixelToCartesian(coords.x, coords.y);

      let scale_factor = Math.abs(Math.pow(this.scrollSpeed, evt.deltaY / 1000));

      // We want coords to be fixed
      this.viewport.height *= scale_factor;
      this.viewport.width *= scale_factor;

      let new_cartesian_coords = this.pixelToCartesian(coords.x, coords.y);

      this.viewport.x += cartesian_coords.x - new_cartesian_coords.x;
      this.viewport.y += cartesian_coords.y - new_cartesian_coords.y;
    }
  }

  /*
  This is a general gridlines class that can be used to draw a series of gridlines
  in the x and y directions, which take up the whole screen. These gridlines can
  be labeled on the sides of the screen, on the axis only, or in dynamic mode,
  where the labeling position is chosen based on whether the axis is visible and
  the relative position of the axis on the screen.

  This class is designed to have derived classes which implement the actual
  positioning of the gridlines; this class does not do that and can only *draw*
  the gridlines it's told to draw. If you want a pre-built gridlines creator, use
  Grapheme.AutoGridlines, which has its own separate set of parameters.

  PROPERTIES
  ----------
  gridlines: This is an object of key-value pairs (as a Pythonista I'd call it a
  dictionary) which contains the list of gridlines to render. It is not modified
  by this class. The keys are the colors of the lines, stored in the format
  #rrggbbaa; in other words, a 32-bit hexadecimal number containing red, green,
  blue, and opacity values from 0 to 255 (sorry Pro Display XDR users). The values
  are arrays of "gridlines", which have the following properties:

    color: color of the label; pen: thickness of the label in pixels; dir:
    direction of the gridline, in the sense of which axis it demarcates; pos:
    the position of the gridline along that Cartesian axis; label: the text of the
    label on that gridlines; bl: the baseline of the text to be drawn; ta: the
    text alignment of the text to be drawn; lpos: the position of the label
    relative to the axis, either "left", "right" (for y) or "top", "bottom" (for
    x) and always "axis" and "dynamic"; font: the font of the label; lcol: the
    color of the label, as a string; pad: padding in pixels in the direction of
    alignment.

  max_render_gridlines: if you try to render more than this many gridlines, it
  will just return early. The default is 1000, which should be plenty, unless your
  display is the size of a wall. DO NOT CHANGE THIS AFTER INITIALIZATION.

  gridline_vertices: You should never have to touch this; this is a Float32Array
  which contains the actual vertices of the triangles (that's right, triangles)
  comprising the actual gridlines drawn by WebGL.

  vertex_position_buf: You should never have to touch this; this is a WebGL buffer
  object which contains the gridlines drawn by WebGL.

  label_eclipse_width: parameter allowing you to change the width of the stroke
  around the label text which stops it from intersecting with the gridlines.

  label_eclipse_style: width of the aforementioned stroke

  METHODS
  ----------
  constructor(context, params={}): as any ContextElement, takes in a
  Grapheme.Context and a list of parameters. The only parameters used by this class
  is max_render_gridlines, label_eclipse_width, and label_eclipse_style.

  _getGridlinesShaderProgram(void): an internal function used to compile the
  program on a per-Grapheme.Context basis, since it would be wasteful to compile
  one WebGL program for each set of gridlines... but why would you do have two
  set of gridlines on a single Context anyway??

  _gridlinesShaderColorLoc(void): used internally to get the color attribute

  _gridlinesShaderVertexLoc(void): used internally to get the vertex location

  drawLines(void): draw the gridlines in the WebGL canvas

  draw(void): draw everything: text boxes and the gridlines
  */
  class Gridlines extends ContextElement {
    constructor(context, params={}) {
      super(context, params);

      this.gridlines = {};
      this.polylines = {};

      this.vertex_position_buf = this.context.gl.createBuffer();

      // the width of the thin border around the text
      this.label_eclipse_width = select(params.label_eclipse_width, 4);
      // the style of the thin border around the text
      this.label_eclipse_style = select(params.label_eclipse_style, "white");
    }

    drawLines() {
      let gl = this.context.gl; // alias for our WebGL context

      let gridlines = this.gridlines;

      let colors = Object.keys(gridlines); // list of colors
      let vertices = this.gridline_vertices;

      let glProgram = this._getGridlinesShaderProgram();
      let colorLocation = this._gridlinesShaderColorLoc();
      let verticesLocation = this._gridlinesShaderVertexLoc();

      // tell webgl to start using the gridline program
      gl.useProgram(glProgram);

      // bind our webgl buffer to gl.ARRAY_BUFFER access point
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_position_buf);

      let m,delta; // calculation variables
      let width = this.context.width, height = this.context.height;

      // for each color...
      for (let color_i = 0; color_i < colors.length; ++color_i) {
        let color = colors[color_i];
        let gridl_subset = this.gridlines[colors[color_i]];

        for (let i = 0; i < gridl_subset.length; ++i) {
          let gridline = gridl_subset[i];
          let thickness_d = gridline.pen * dpr / 2;

          switch (gridline.dir) {
            case 'x':
              m = this.context.cartesianToPixelX(gridline.pos);
              
            case 'y':
              m = this.context.cartesianToPixelY(gridline.pos);
              delta = -this.context.pixelToGLVY(thickness_d);
          }
        }
      }
    }

    draw(info) {
      super.draw(info);

      // draw the WebGL lines (note that this takes the shortest time out of everything)
      this.drawLines();

      // alias for the text canvas context
      let ctx = this.context.text_canvas_ctx;

      // used to prevent repeated value sets to ctx.whatever, which can be laggy
      let currentFont = "";
      let currentTextBaseline = "";
      let currentTextAlignment = "";
      let currentFontColor = "";

      ctx.strokeStyle = this.label_eclipse_style;
      ctx.lineWidth = this.label_eclipse_width;

      // for brevity
      let maxY = this.context.maxY();
      let maxX = this.context.maxX();
      let minY = this.context.minY();
      let minX = this.context.minX();

      let labelX, labelY;
      let colors = Object.keys(this.gridlines); // list of colors

      // for all colors...
      for (let color_i = 0; color_i < colors.length; ++color_i) {
        let arr = this.gridlines[colors[color_i]];

        // for all gridlines...
        for (let i = 0; i < arr.length; ++i) {
          let gridline = arr[i];

          if (gridline.font && gridline.font != currentFont) { // update font
            currentFont = ctx.font = gridline.font;
          }

          // update font color
          if (gridline.lcol && gridline.lcol != currentFontColor) {
            currentFontColor = ctx.fillStyle = gridline.lcol;
          }

          // set values for textBaseline and textAlign
          let textBaseline = gridline.bl || "bottom", textAlign = gridline.ta || "left";

          switch (gridline.dir) {
            case 'x':
              let canv_x_coord = this.context.cartesianToPixelX(gridline.pos);

              if (gridline.label) { // label the gridline
                let y_draw_pos; // y position of the label

                switch (gridline.lpos) { // label position
                  case "top":
                    y_draw_pos = 0, textBaseline = "top";
                    break;
                  case "bottom":
                    y_draw_pos = this.context.css_height, textBaseline = "bottom";
                    break;
                  case "axis":
                    y_draw_pos = this.context.cartesianToPixelY(0);
                    break;
                  case "dynamic":
                    if (0 > maxY) { // put label at the top of the canvas
                      y_draw_pos = 0, textBaseline = "top";
                    } else if (0 < minY) { // put label at bottom of canvas
                      y_draw_pos = this.context.css_height, textBaseline = "bottom";
                    } else {
                      y_draw_pos = this.context.cartesianToPixelY(0);
                    }
                }

                labelX = canv_x_coord, labelY = y_draw_pos;
              }
              break;
            case 'y':
              let canv_y_coord = this.context.cartesianToPixelY(gridline.pos);

              if (gridline.label !== undefined) {
                let x_draw_pos;

                switch (gridline.lpos) { // label position
                  case "left":
                    x_draw_pos = 0, textAlign = "left";
                    break;
                  case "right":
                    x_draw_pos = this.context.css_width, textAlign = "right";
                    break;
                  case "axis":
                    x_draw_pos = this.context.cartesianToPixelX(0);
                    break;
                  case "dynamic":
                    if (0 > maxX) { // put label at the right of the canvas
                      x_draw_pos = this.context.css_width, textAlign = "right";
                    } else if (0 < minX) { // put label at left of canvas
                      x_draw_pos = 0, textAlign = "left";
                    } else {
                      x_draw_pos = this.context.cartesianToPixelX(0);
                    }
                }

                labelX = x_draw_pos, labelY = canv_y_coord;

              break;
            }
          }

          if (gridline.label) {
            if (textBaseline != currentTextBaseline) {
              currentTextBaseline = ctx.textBaseline = textBaseline;
            }

            if (textAlign != currentTextAlignment) {
              currentTextAlignment = ctx.textAlign = textAlign;
            }

            // pixel padding
            let padX = 0, padY = 0;
            switch (textBaseline) {
              case "bottom":
                padY = -gridline.pad;
                break;
              case "top":
                padY = gridline.pad;
            }

            switch (textAlign) {
              case "left":
                padX = gridline.pad;
                break;
              case "right":
                padX = -gridline.pad;
            }

            if (this.label_eclipse_width) {
              ctx.strokeText(gridline.label, labelX + padX, labelY + padY);
            }

            ctx.fillText(gridline.label, labelX + padX, labelY + padY);
          }
        }
      }
    }
  }

  /* Function to get the baseline of an anchor string, e.g. "NW".
  I was inspired by Asymptote on this one, sorry Brandon. */
  function getTextBaseline(anchor) {
    try {
      switch (anchor[0]) {
        case "S":
          return "top";
        case "N":
          return "bottom";
        default:
          return "middle";
      }
    } catch (e) {
      return "middle";
    }
  }

  /* Same as above, but for getting the text alignment. */
  function getTextAlign(anchor) {
    try {
      switch (anchor.substr(-1)) {
        case "E":
          return "left";
        case "W":
          return "right";
        default:
          return "center";
      }
    } catch (e) {
      return "center";
    }
  }

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
    assert(isInteger(integer), "needs to be an integer");

    let stringi = integer + '';
    let out = '';

    for (let i = 0; i < stringi.length; ++i) {
      out += convert_char(stringi[i]);
    }

    return out;
  }

  // Credit: https://stackoverflow.com/a/20439411
  /* Turns a float into a pretty float by removing dumb floating point things */
  function beautifyFloat(f, prec=12) {
    let strf = f.toFixed(prec);
    if (strf.includes('.')) {
      return strf.replace(/\.?0+$/g,'');
    } else {
      return strf;
    }
  }

  // Helper function: used internally to quickly check if the viewport has changed
  function compareViewports(vp1, vp2) {
    return (vp1.x === vp2.x) && (vp1.y === vp2.y) && (vp1.width === vp2.width) && (vp1.height === vp2.height);
  }

  // Helper function: Find the nearest value to val in the array arr
  function findNearestValueIndex(arr, val) {
    let closest = arr[0];

    for (let i = 1; i < arr.length; ++i) {
      if (Math.abs(arr[i] - val) < Math.abs(closest - val)) {
        return i;
      }
    }

    return 0;
  }

  // Multiplication character
  const CDOT = String.fromCharCode(183);

  // List of functions to determine how the gridlines are labeled with
  // AutoGridlines. TODO: add more of 'em!
  const LABEL_FUNCTIONS = {
    default: x => {
      if (x === 0) return "0"; // special case
      else if (Math.abs(x) < 1e5 && Math.abs(x) > 1e-5)
        // non-extreme floats displayed normally
        return beautifyFloat(x);
      else {
        // scientific notation for the very fat and very small!

        let exponent = Math.floor(Math.log10(Math.abs(x)));
        let mantissa = x / (10 ** exponent);

        let prefix = (isApproxEqual(mantissa,1) ? '' :
          (beautifyFloat(mantissa, 8) + CDOT));
        let exponent_suffix = "10" + exponentify(exponent);

        return prefix + exponent_suffix;
      }
    }
  };

  /* The flagship product of Grapheme as of July 29, 2019. This derived class of
  Gridlines provides an easy way to calculate the gridlines of a view.

  There are three types of gridlines: bold (used for the axes), normal (used for
  the major divisions of the coordinate space), and thin (used for finer demarca-
  tions). Each of them can be customized with the following parameters:

  thickness: the thickness in pixels of the drawn lines
  color: color of the drawn lines in 0xrrggbbaa format (see Gridlines if confused)
  display: boolean of whether to display these gridlines. Note that the next
  subdivision of gridlines will fill in the gap (except there is no next subdiv.
  for thin gridlines).
  label_function: LABEL_FUNCTIONS[label_function] is given the coordinate of the
  gridline and returns a string representation of what it should be labeled.
  labels: Object containing "x" and "y", for customization of each label.
    "x" and "y" each have:
    display: whether to display this label
    font: the font used by the label
    color: the color of the label
    align: the direction (N, NE, NW, E, W, SW, SE, S, C) in which the label is
    aligned to (so that its opposite corner is at its nominal locatio)
    padding: the number of pixels it is additionally displaced from its nominal
    location: "axis", "dynamic", etc. (see Gridlines for an explanation)

  Subdivision is done automatically and is customizable with the remaining parameters.

  PROPERTIES
  ----------
  bold: styling of the bold gridlines, as explained above.
  normal: styling of the normal gridlines, as explained above.
    normal.ideal_dist: the ideal distance in pixels between normal lines; used
    when trying to subdivide it in the best way possible
  thin: styling of the thin gridlines, as explained above.
    thin.ideal_dist: the ideal distance in pixels between thin lines; used when
    trying to subdivide it in the best way possible
  subdivisions: the possible subdivisions types, expressed as an array of objects
  {normal: x, thin: [a,b,c]}. This means that x * 10^n is a potential normal line
  subdivision, and that the subdivision x/a * 10^n is a potential thin line
  subdivision. THe actual subdivision chosen depends on the viewport, the screen
  size, and normal.ideal_dist/thin.ideal_dist.
  gridline_limit: The maximum number of gridlines it will calculate before it just
  stops.
  force_equal_thin_div: force the division count of thin lines to be equal along
  the x and y directions.

  METHODS
  ----------
  updateAutoGridlines(void): update the list of internal gridlines to draw stuff

  draw(info): draw the gridlines by checking whether the gridlines need to be
  updated, then updating if necessary and then calling the Gridlines draw routine.
  */
  class AutoGridlines extends Gridlines {
    constructor(context, params={}) {
      super(context, params);

      this.bold = mergeDeep({
        thickness: 1.4, // Thickness of the axes lines
        color: 0x000000ff, // Color of the axes lines
        display: true, // Whether to display the axis lines
        label_function: "default",
        labels: {
          x: {
            display: true,
            font: "12px Helvetica",
            color: "#000",
            align: "SW", // corner/side on which to align the x label,
                         // note that anything besides N,S,W,E,NW,NE,SW,SE is centered
            padding: 4, // how much padding in that alignment direction
            location: "dynamic" // can be axis, top, bottom, or dynamic (switches between)
          },
          y: {
            display: true,
            font: "12px Helvetica",
            color: "#000",
            align: "SW", // corner/side on which to align the y label
            padding: 4, // how much padding in that alignment direction
            location: "dynamic" // can be axis, left, right, or dynamic (switches between)
          }
        }
      }, params.bold);
      this.normal = mergeDeep({
        thickness: 0.8, // Thickness of the normal lines
        color: 0x000000aa, // Color of the normal lines
        ideal_dist: 140, // ideal distance between lines in pixels
        display: true, // whether to display the lines
        label_function: "default",
        labels: {
          x: {
            display: true,
            font: "12px Helvetica",
            color: "#000",
            align: "S", // corner/side on which to align the x label,
                         // note that anything besides N,S,W,E,NW,NE,SW,SE is centered
            padding: 4,
            location: "dynamic" // can be axis, top, bottom, or dynamic (switches between)
          },
          y: {
            display: true,
            font: "12px Helvetica",
            color: "#000",
            align: "W", // corner/side on which to align the y label
            padding: 4,
            location: "dynamic"
          }
        }
      }, params.normal);
      this.thin = mergeDeep({
        thickness: 0.5, // Thickness of the finer demarcations
        color: 0x00000088, // Color of the finer demarcations
        ideal_dist: 50, // ideal distance between lines in pixels
        display: true, // whether to display them
        label_function: "default",
        labels: {
          x: {
            display: false,
            font: "8px Helvetica",
            color: "#000",
            align: "S", // corner/side on which to align the x label,
                         // note that anything besides N,S,W,E,NW,NE,SW,SE is centered
            padding: 4,
            location: "dynamic" // can be axis, top, bottom, or dynamic (switches between)
          },
          y: {
            display: false,
            font: "8px Helvetica",
            color: "#000",
            align: "W", // corner/side on which to align the y label
            padding: 4,
            location: "dynamic"
          }
        }
      }, params.thin);

      // Types of finer demarcation subdivisions: default is subdivide into 2, into 5, and into 10
      this.subdivisions = select(params.subdivisions, [
        {normal: 2, thin: [4]},
        {normal: 5, thin: [5, 10]},
        {normal: 1, thin: [5]}
      ]);

      // Maximum number of displayed grid lines
      this.gridline_limit = select(params.gridline_limit, 500);
      // force equal thin subdivisions in x and y directions
      this.force_equal_thin_div = true;
    }

    updateAutoGridlines() {
        this.gridlines = {};

        let that = this; // bruh
        let gridline_count = 0;

        function addGridline(gridline) {
          if (++gridline_count > that.gridline_limit)
            return ("Too many gridlines");
          let color = gridline.color || DEFAULT_COLOR;
          if (that.gridlines[color]) {
            that.gridlines[color].push(gridline);
          } else {
            that.gridlines[color] = [gridline];
          }
        }

        let ideal_xy = this.context.pixelToCartesianV(this.normal.ideal_dist, this.normal.ideal_dist);

        // unpack the values
        let ideal_x_normal_spacing = Math.abs(ideal_xy.x);
        // Math.abs shouldn't ever do anything, but it would be catastrophic
        // if this was somehow negative due to some dumb error of mine
        // (This might happen if the ideal inter-thin distance is negative)
        let ideal_y_normal_spacing = Math.abs(ideal_xy.y);

        let ixns_log10 = Math.log10(ideal_x_normal_spacing);
        let iyns_log10 = Math.log10(ideal_y_normal_spacing);

        let possible_coeffs = this.subdivisions.map(x => x.normal);

        let ixns_base = 10 ** Math.floor(ixns_log10);
        let ixns_coeff_i = findNearestValueIndex(possible_coeffs, ideal_x_normal_spacing / ixns_base);

        let iyns_base = 10 ** Math.floor(iyns_log10);
        let iyns_coeff_i = findNearestValueIndex(possible_coeffs, ideal_y_normal_spacing / ixns_base);

        let true_xn_spacing = possible_coeffs[ixns_coeff_i] * ixns_base;
        let true_yn_spacing = possible_coeffs[iyns_coeff_i] * iyns_base;

        let ideal_x_thin_spacing_denom = this.context.cartesianToPixelVX(true_xn_spacing) / this.thin.ideal_dist;
        let ideal_y_thin_spacing_denom = -this.context.cartesianToPixelVY(true_yn_spacing) / this.thin.ideal_dist;

        // alias for brevity
        let tspt_x = this.subdivisions[ixns_coeff_i].thin;
        let tspt_y = this.subdivisions[iyns_coeff_i].thin;

        // temp values
        let x_denom = tspt_x[0];
        let y_denom = tspt_y[0];

        // go through all potential thin spacing types for x
        for (let i = 0; i < tspt_x.length; ++i) {
          let possible_denom = tspt_x[i];

          // if this is more ideal of an x subdivision, use that!
          if (Math.abs(possible_denom - ideal_x_thin_spacing_denom) <
            Math.abs(x_denom - ideal_x_thin_spacing_denom)) {
            x_denom = possible_denom;
          }
        }

        for (let i = 0; i < tspt_y.length; ++i) {
          let possible_denom = tspt_y[i];

          // if this is more ideal of an y subdivision, use that!
          if (Math.abs(possible_denom - ideal_y_thin_spacing_denom) <
            Math.abs(y_denom - ideal_y_thin_spacing_denom)) {
            y_denom = possible_denom;
          }
        }

        if (this.force_equal_thin_div) {
          // if we force the subdivisions to be equal, we defer to the one that fits better
          if (Math.abs(y_denom - ideal_y_thin_spacing_denom) < Math.abs(x_denom - ideal_x_thin_spacing_denom)) {
            // y is better
            x_denom = y_denom;
          } else {
            // x is better (or they are the same since the inequality is strict)
            y_denom = x_denom;
          }
        }

        let true_xt_spacing = true_xn_spacing / x_denom;
        let true_yt_spacing = true_yn_spacing / y_denom;

        // precomputed for brevity
        let minx = this.context.minX();
        let miny = this.context.minY();
        let maxx = this.context.maxX();
        let maxy = this.context.maxY();

        if (this.thin.display) {
          // Thin lines
          let thinx_start = Math.ceil(minx / true_xt_spacing);
          let thinx_end = Math.floor(maxx / true_xt_spacing);
          let thiny_start = Math.floor(miny / true_yt_spacing);
          let thiny_end = Math.ceil(maxy / true_yt_spacing);

          // both x and y
          for (let i = 0, start = thinx_start, end = thinx_end, dir = 'x', denom = x_denom, spacing = true_xt_spacing; ++i < 3; start = thiny_start, end = thiny_end, dir = 'y', denom = y_denom, spacing = true_yt_spacing) {
            assert(start <= end, "wtf happened");

            for (let i = start; i <= end; ++i) {
              // we only skip x values corresponding to normal lines if normal lines are being displayed
              if ((i % denom === 0) && this.normal.display) continue;
              let gridline = {color: this.thin.color, pen: this.thin.thickness, dir, pos: i * spacing};
              let label = this.thin.labels[dir];
              if (label.display) {
                Object.assign(gridline, {
                  label: LABEL_FUNCTIONS[this.thin.label_function](i * spacing),
                  bl: getTextBaseline(label.align), // baseline
                  ta: getTextAlign(label.align), // textalign
                  lpos: label.location,
                  font: label.font,
                  lcol: label.color,
                  pad: label.padding
                });
              }
              addGridline(gridline);
            }
          }
        }

        if (this.normal.display) {
          // Normal lines
          let normalx_start = Math.ceil(minx / true_xn_spacing);
          let normalx_end = Math.floor(maxx / true_xn_spacing);
          let normaly_start = Math.floor(miny / true_yn_spacing);
          let normaly_end = Math.ceil(maxy / true_yn_spacing);

          // both x and y
          for (let j = 0, start = normalx_start, end = normalx_end, dir = 'x', spacing = true_xn_spacing;
            ++j < 3;
            start = normaly_start, end = normaly_end, dir = 'y', spacing = true_yn_spacing) {
            for (let i = start; i <= end; ++i) {
              if (!i && this.bold.display) continue;
              let gridline = {color: this.normal.color, pen: this.normal.thickness, dir, pos: i * spacing};
              let label = this.normal.labels[dir];
              if (label.display) {
                Object.assign(gridline, {
                  label: LABEL_FUNCTIONS[this.normal.label_function](i * spacing),
                  bl: getTextBaseline(label.align), // baseline
                  ta: getTextAlign(label.align), // textalign
                  lpos: label.location,
                  font: label.font,
                  lcol: label.color,
                  pad: label.padding
                });
              }
              addGridline(gridline);
            }
          }
        }

        // Axis lines (a.k.a. bold lines) (if applicable)

        // x
        if (this.context.cartesianXInView(0)) {
          let gridline = {color: this.bold.color,
            pen: this.bold.thickness,
            dir: 'x',
            pos: 0};
          if (this.bold.labels.x.display) {
            let labelx = this.bold.labels.x;
            Object.assign(gridline, {
              label: LABEL_FUNCTIONS[this.bold.label_function](0),
              bl: getTextBaseline(labelx.align), // baseline
              ta: getTextAlign(labelx.align), // textalign
              lpos: labelx.location,
              font: labelx.font,
              lcol: labelx.color,
              pad: labelx.padding
            });
          }

          addGridline(gridline);
        }

        // y
        if (this.context.cartesianYInView(0)) {
          let gridline = {color: this.bold.color,
            pen: this.bold.thickness,
            dir: 'y',
            pos: 0};
          if (this.bold.labels.y.display) {
            let labely = this.bold.labels.y;
            Object.assign(gridline, {
              label: LABEL_FUNCTIONS[this.bold.label_function](0),
              bl: getTextBaseline(labely.align), // baseline
              ta: getTextAlign(labely.align), // textalign
              lpos: labely.location,
              font: labely.font,
              lcol: labely.color,
              pad: labely.padding
            });
          }

          addGridline(gridline);
        }
    }

    draw(info) {
      if (!this.old_vp || !compareViewports(this.old_vp, this.context.viewport)) {
        // only execute if the viewport has changed

        this.old_vp = {...this.context.viewport};
        this.updateAutoGridlines();
      }

      super.draw(info);
    }
  }

  const ADD = function (interval_a, interval_b) {
    return [interval_a[0] + interval_b[0], interval_a[1] + interval_b[1]];
  };

  const SUB = function (interval_a, interval_b) {
    return [interval_a[0] - interval_b[1], interval_a[1] - interval_b[0]];
  };

  const MUL = function (interval_a, interval_b) {
    let m1 = interval_a[0] * interval_b[0];
    let m2 = interval_a[1] * interval_b[0];
    let m3 = interval_a[0] * interval_b[1];
    let m4 = interval_a[1] * interval_b[1];

    return [Math.min(m1,m2,m3,m4), Math.max(m1,m2,m3,m4)];
  };

  const DIV = function (interval_a, interval_b) {
    if (interval_b[0] <= 0 && 0 <= interval_b[1]) { // if b contains 0
      if (!interval_a[0] && !interval_a[1]) { // if a = [0,0]
        if (interval_b[0] === 0 && interval_b[1] === 0)
          return [NaN, NaN];
        return [0, 0]; // though NaN is possible
      }
      return [-Infinity, Infinity];
    }

    if (0 < interval_b[0]) // b is positive
      return [interval_a[0] / interval_b[1], interval_a[1] / interval_b[0]];

    return [interval_a[1] / interval_b[0], interval_a[0] / interval_b[1]];
  };

  const SIN = function (interval) {
    // TODO: optimize!
    if (interval[1] - interval[0] >= 2 * Math.PI)
      return [-1,1];

    let a_rem_2p = mod(interval[0], 2 * Math.PI);
    let b_rem_2p = mod(interval[1], 2 * Math.PI);

    let min_rem = Math.min(a_rem_2p, b_rem_2p);
    let max_rem = Math.max(a_rem_2p, b_rem_2p);

    let contains_1 = (min_rem < Math.PI / 2) && (max_rem > Math.PI / 2);
    let contains_n1 = (min_rem < 3 * Math.PI / 2 && max_rem > 3 * Math.PI / 2);

    if (b_rem_2p < a_rem_2p) {
      contains_1 = !contains_1;
      contains_n1 = !contains_n1;
    }

    if (contains_1 && contains_n1)
      return [-1,1]; // for rapidity

    let sa = Math.sin(a_rem_2p), sb = Math.sin(b_rem_2p);
    return [contains_n1 ? -1 : Math.min(sa, sb), contains_1 ? 1 : Math.max(sa, sb)];
  };

  const COS = function (interval) {
    // TODO: optimize!
    return SIN([interval[0] + Math.PI / 2, interval[1] + Math.PI / 2]); // and I oop
  };

  const TAN = function (interval) {
    // TODO: optimize!
    return DIV(SIN(interval), COS(interval));
  };

  const SEC = function (interval) {
    // TODO: optimize!
    return DIV([1,1], COS(interval));
  };

  const CSC = function (interval) {
    // TODO: optimize!
    return DIV([1,1], SIN(interval));
  };

  const COT = function (interval) {
    // TODO: optimize!
    return DIV(COS(interval), SIN(interval));
  };

  const EXP_B = function (b, interval_n) {
    return [Math.pow(b, interval_n[0]), Math.pow(b, interval_n[1])];
  };

  const EXP_N = function (interval_b, n) {
    if (n === 0)
      return [1,1];
    if (isPositiveInteger(n)) {
      if (n % 2 === 0) {
        let p1 = Math.pow(interval_b[0], n), p2 = Math.pow(interval_b[1], n);
        return (interval_b[0] >= 0 ? [p1, p2] : (interval_b[1] < 0 ? [p2, p1] : [0, Math.max(p1, p2)]));
      } else {
        return [Math.pow(interval_b[0], n), Math.pow(interval_b[1], n)];
      }
    } else if (isInteger(n)) {
      return DIV([1,1], EXP_N(interval_b, -n));
    } else {
      // annoyst, TODO: theorize!!!!
      if (interval_b[1] < 0)
        return [NaN, NaN];
      if (interval_b[0] < 0) interval_b[0] = 0;

      if (n >= 0) {
        return [Math.pow(interval_b[0], n), Math.pow(interval_b[1], n)];
      } else {
        return [Math.pow(interval_b[1], n), Math.pow(interval_b[0], n)];
      }
    }
  };

  const LOG_A = function (a, interval_n) {
    if (a === 1) {
      if (interval_n[0] <= 1 && 1 <= interval_n[1])
        return [-Infinity, Infinity];
      else
        return [NaN, NaN];
    }

    if (interval_n[0] === interval_n[1])
      return Math.log(interval_n[0]) / Math.log(a);

    if (interval_n[1] <= 0) return [NaN, NaN];
    if (interval_n[0] < 0) interval_n[0] = 0;

    if (a > 1) {
      let log_a = Math.log(a);

      return [Math.log(interval_n[0]) / log_a, Math.log(interval_n[1]) / log_a];
    } else {
      let log_a = Math.log(a);

      return [Math.log(interval_n[1]) / log_a, Math.log(interval_n[0]) / log_a];
    }
  };

  const LOG_N = function (interval_a, n) {
    if (interval_a[1] < 0)
      interval_a[0] = 0;
    if (interval_a[0] <= 1 && 1 <= interval_a[1])
      return [-Infinity, Infinity];
  };

  const POW = function (interval_a, interval_b) {
    if (interval_a[0] === interval_a[1]) {
      return EXP_B(interval_a[0], interval_b);
    } else if (interval_b[0] === interval_b[1]) {
      return EXP_N(interval_a, interval_b[0]);
    } else {
      // ANNOYST ANNOYST
      // For now: discard negative a

      if (interval_a[1] < 0)
        return [NaN, NaN]; // ANNNOYSTTT

      if (interval_a[0] < 0)
        interval_a[0] = 0;

      // TODO: THEORIZE
      throw new Error("not supported yet");
    }
  };

  const CONST = function(a) {
    return [a,a];
  };

  const IntervalFunctions = {ADD,SUB,MUL,DIV,SIN,COS,TAN,SEC,CSC,COT,EXP_B,EXP_N,LOG_A,LOG_N,POW,CONST};

  const VERTEX_CALCULATION_MODES = {
    EVEN_SAMPLING: "es",
    EVEN_SAMPLING_LIMIT_FINDING: "eslf"
  };

  class FunctionalGraph extends ContextElement {
    constructor(context, params={}) {
      super(context, params);

      this.color = select(params.color, 0x117711ff);
      this.axis = 'x'; // x means of the form y = f(x); y means of the form x = f(y);
      this.thickness = select(params.thickness, 3);

      this.quick_func = x => x * (x + 1);
      this.vertex_calculation_mode = {type: VERTEX_CALCULATION_MODES.EVEN_SAMPLING, samples: 1500};

      this.max_vertices = 2000;
      this.vertices = new Float64Array(2 * this.max_vertices);
      this.actual_vertices = 0;

      this.gl_vertices = new Float32Array(6 * this.max_vertices);
      this.actual_gl_vertices = 0;
    }

    _calculateVerticesViaSampling(num_samples) {
      let minX, maxX;

      switch (this.axis) {
        case 'x':
          minX = this.context.minX();
          maxX = this.context.maxX();
          break;
        default:
          minX = this.context.minY();
          maxX = this.context.maxY();
      }

      let rat = (maxX - minX) / this.intended_samples;

      for (let i = 0; i < this.intended_samples; ++i) {
        let x1 = rat * i + minX;

        this.vertices[2 * i] = x1;
        this.vertices[2 * i + 1] = this.quick_func(x1);
      }

      this.actual_vertices = this.intended_samples;
    }

    _calculateVerticesViaSamplingLimitFinding(samples) {

    }

    calculateVertices() {
      switch (this.vertex_calculation_mode.type) {
        case VERTEX_CALCULATION_MODES.EVEN_SAMPLING:
          this._calculateVerticesViaSampling();
          break;
      }
    }

    calculateGLVertices() {
      this.actual_gl_vertices = expandVerticesIntoTriangles(this.thickness, this.actual_vertices, this.actual_gl_vertices);
    }

    draw() {
      let ctx = this.context.text_canvas_ctx;
      this.calculateVertices();

      ctx.strokeStyle = "purple";
      ctx.lineWidth = 3;
      ctx.beginPath();

      let pt = this.context.cartesianToPixel(this.vertices[0], this.vertices[1]);

      ctx.moveTo(pt.x, pt.y);

      for (let i = 2; i < this.vertices.length; i += 2) {
        pt = this.context.cartesianToPixel(this.vertices[i], this.vertices[i+1]);
        ctx.lineTo(pt.x, pt.y);
      }

      ctx.stroke();
    }

  }

  // Class representing basic things to draw in Grapheme like circles, sets of circles, text, polygons, etc.
  class PrimitiveElement {
    constructor(grapheme_context, params={}) {
      this.context = grapheme_context;
    }

    draw() {
      throw new Error("No Context drawing implemented");
    }

    drawSVG() {
      throw new Error("No SVG drawing implemented");
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

  function getPolylinePrimitiveGLProgram(grapheme) {
    if (grapheme.gl_infos._polylineShader)
      return grapheme.gl_infos._polylineShader;

    let gl = grapheme.gl;

    // create the vertex shader
    let vertShad = createShaderFromSource(gl /* rendering context */,
      gl.VERTEX_SHADER /* enum for vertex shader type */,
      vertexShaderSource /* source of the vertex shader*/ );

    // create the frag shader
    let fragShad = createShaderFromSource(gl /* rendering context */,
      gl.FRAGMENT_SHADER /* enum for vertex shader type */,
      fragmentShaderSource /* source of the vertex shader*/ );

    // create the program. we set _polylineShader in the parent Context so that
    // any future gridlines in this Context will use the already-compiled shader
    let program = createGLProgram(gl, vertShad, fragShad);

    grapheme.gl_infos._polylineShader = {program, colorLoc: gl.getUniformLocation(program, "line_color"),
  vertexLoc: gl.getAttribLocation(program, "v_position"), xyScale: gl.getUniformLocation(program, "xy_scale")};

    return grapheme.gl_infos._polylineShader;
  }

  const ENDCAP_TYPES = {
    "NONE": 0,
    "ROUND": 1
  };

  const JOIN_TYPES = {
    "NONE": 0,
    "ROUND": 1,
    "MITER": 2,
    "DYNAMIC": 3
  };

  function integerInRange(x, min, max) {
    return isInteger(x) && min <= x && x <= max;
  }

  const MIN_RES_ANGLE = 0.05; // minimum angle in radians between roundings in a polyline

  // Parameters for the expanding/contracting float array for polyline
  const MIN_SIZE = 16;
  const MAX_SIZE = 2 ** 24;

  function nextPowerOfTwo(x) {
    return 2 ** Math.ceil(Math.log2(x));
  }

  // polyline primitive in Cartesian coordinates
  // has thickness, vertex information, and color stuff
  class PolylinePrimitive extends PrimitiveElement {
    constructor(grapheme_context, params = {}) {
      super(grapheme_context, params);

      this.vertices = []; // x,y values in pixel space
      this.gl_info = getPolylinePrimitiveGLProgram(this.context);
      this.gl_buffer = this.context.gl.createBuffer();

      this.color = 0x000000ff; //r,g,b,a
      this.thickness = 2; // thickness of the polyline in pixels

      this.endcap_type = 1; // refer to ENDCAP enum
      this.endcap_res = 0.4; // angle in radians between consecutive roundings
      this.join_type = 1; // refer to ENDCAP enum
      this.join_res = 0.5; // angle in radians between consecutive roundings

      this.use_native = false;
      this.use_cpp = true;

      this._gl_triangle_strip_vertices = null;
      this._gl_triangle_strip_vertices_total = 0;
      this._buffer_too_fat = false;
    }

    static ENDCAP_TYPES() {
      return ENDCAP_TYPES;
    }

    static JOIN_TYPES() {
      return JOIN_TYPES;
    }

    static MIN_RES_ANGLE() {
      return MIN_RES_ANGLE;
    }

    _calculateTriangles(use_cpp=false) {
      // This is nontrivial

      // check validity of inputs
      if (this.thickness <= 0 ||
        !integerInRange(this.endcap_type, 0, 1) ||
        !integerInRange(this.join_type, 0, 3) ||
        this.endcap_res < MIN_RES_ANGLE ||
        this.join_res < MIN_RES_ANGLE ||
        this.vertices.length <= 3) {

        this._gl_triangle_strip_vertices_total = 0; // pretend there are no vertices ^_^
        return;
      }

      if (use_cpp) {
        // Information needed: buffer of vertices, length of buffer, type of endcap, type of join, resolution of endcap, resolution of join

        // Steps:
        // 1. Allocate a buffer on HEAPF32 for the vertices
        // 2. Copy vertices to the buffer
        // 3. Call a corresponding polylineCalculateTriangles function
        // 4. Change tri_strip_vertices length if necessary (to next power of two)
        // 5. Copy new vertices from buffer to tri_strip_vertices
        // 6. Free (2)

        let error, big_buffer, small_buffer;
        let vertices = this.vertices;

        try {
          big_buffer = Module._malloc(vertices.length * Float32Array.BYTES_PER_ELEMENT);

          let buffer_view = Module.HEAPF32.subarray(big_buffer >> 2, (big_buffer >> 2) + vertices.length);

          if (vertices instanceof Float32Array) {
            buffer_view.set(vertices);
          } else {
            for (let i = 0; i < vertices.length; ++i) {
              buffer_view[i] = vertices[i];
            }
          }

          small_buffer = Module._malloc(2 * Int32Array.BYTES_PER_ELEMENT);

          let small_buffer_view = Module.HEAP32.subarray(small_buffer >> 2, (small_buffer >> 2) + 2);

          Module.ccall("polylineCalculateTriangles", null,
          ["number", "number", "number", "number", "number", "number", "number", "number"],
          [big_buffer, vertices.length, small_buffer, this.thickness, this.endcap_type, this.endcap_res, this.join_type, this.join_res]);

          let vector_start = small_buffer_view[0];
          let vector_len = small_buffer_view[1];

          let vector_buffer = Module.HEAPF32.subarray((vector_start >> 2), (vector_start >> 2) + vector_len);

          if (!this._gl_triangle_strip_vertices || this._gl_triangle_strip_vertices.length < vector_len || this._gl_triangle_strip_vertices.length > vector_len * 2) {
            this._gl_triangle_strip_vertices = new Float32Array(Math.min(Math.max(MIN_SIZE, nextPowerOfTwo(vector_len)), MAX_SIZE));
          }

          this._gl_triangle_strip_vertices.set(vector_buffer);
          this._gl_triangle_strip_vertices_total = vector_len >> 1;
        } catch (e) {
          error = e;
        } finally {
          Module._free(big_buffer);
          Module._free(small_buffer);
        }

        if (error instanceof RangeError) {
          // probably means the buffer was too fat
          this._gl_triangle_strip_vertices_total = 0;
          this._buffer_too_fat = true;
        } else if (error) {
          throw error;
        }

        this._buffer_too_fat = false;

        return;
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

    _calculateNativeLines() {
      let vertices = this.vertices;

      if (vertices.length <= 3) {
        this._gl_triangle_strip_vertices_total = 0;
        return;
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

    draw(recalculate = true) {
      if (this._last_native !== this.use_native)
        recalculate = true;

      if (!this.use_native && recalculate) {
        this._calculateTriangles(this.use_cpp);
      } else {
        // use native LINE_STRIP for xtreme speed

        this._calculateNativeLines();
      }

      this._last_native = this.use_native;

      let gl_info = this.gl_info;
      let gl = this.context.gl;

      let vertexCount = this._gl_triangle_strip_vertices_total;
      if ((this.use_native && vertexCount < 2) || (!this.use_native && vertexCount < 3)) return;

      // tell webgl to start using the gridline program
      gl.useProgram(gl_info.program);

      // bind our webgl buffer to gl.ARRAY_BUFFER access point
      gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_buffer);

      let color = this.color;

      // set the vec4 at colorLocation to (r, g, b, a)
      gl.uniform4f(gl_info.colorLoc,
        ((color >> 24) & 0xff) / 255, // bit masks to retrieve r, g, b and a
        ((color >> 16) & 0xff) / 255, // divided by 255 because webgl likes [0.0, 1.0]
        ((color >> 8) & 0xff) / 255,
        (color & 0xff) / 255);

      gl.uniform2f(gl_info.xyScale,
        2 / this.context.width,
        -2 / this.context.height);

      // copy our vertex data to the GPU
      gl.bufferData(gl.ARRAY_BUFFER, this._gl_triangle_strip_vertices, gl.DYNAMIC_DRAW /* means we will rewrite the data often */);

      // enable the vertices location attribute to be used in the program
      gl.enableVertexAttribArray(gl_info.vertexLoc);

      // tell it that the width of vertices is 2 (since it's x,y), that it's floats,
      // that it shouldn't normalize floats, and something i don't understand
      gl.vertexAttribPointer(gl_info.vertexLoc, 2, gl.FLOAT, false, 0, 0);

      // draw the vertices as triangle strip
      gl.drawArrays(this.use_native ? gl.LINE_STRIP : gl.TRIANGLE_STRIP, 0, vertexCount);
    }
  }

  exports.AutoGridlines = AutoGridlines;
  exports.FunctionalGraph = FunctionalGraph;
  exports.GraphemeContext = GraphemeContext;
  exports.Gridlines = Gridlines;
  exports.InteractiveContext = InteractiveContext;
  exports.IntervalFunctions = IntervalFunctions;
  exports.PolylinePrimitive = PolylinePrimitive;
  exports.convert_char = convert_char;
  exports.exponent_reference = exponent_reference;
  exports.exponentify = exponentify;
  exports.getTextAlign = getTextAlign;
  exports.getTextBaseline = getTextBaseline;
  exports.utils = utils;

  return exports;

}({}));
