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
      this.elementInfo = {
        context: this.context,
        text: this.textCanvasContext,
        textCanvas: this.textCanvas
      };

      graphemeContext.windows.push(this);

      this.setSize(640, 480);
    }

    addElement(element) {
      this.elements.push(element);
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

      let gl = this.context.glContext;

      gl.clearColor(glColor.r, glColor.g, glColor.b, glColor.a);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    sortElementsByPrecedence() {
      this.elements.sort((x, y) => (x.precedence - y.precedence));
    }

    render() {
      this.context.activeWindow = this;
      let err;

      let gl = this.context.glContext;
      let glCanvas = this.context.glCanvas;

      let width = this.canvasWidth, height = this.canvasHeight;

      try {
        // Set the viewport to this canvas's size
        this.context.setViewport(width, height);

        // clear the canvas
        this.clearToColor();

        // sort our elements by drawing precedence
        this.sortElementsByPrecedence();

        this.elementInfo.width = width;
        this.elementInfo.height = height;

        // draw each element
        for (let i = 0; i < this.elements.length; ++i) {
          let element = this.elements[i];

          element.render(this.elementInfo);
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
      this.glCanvas = new OffscreenCanvas(256, 256);
      let gl = this.glContext = this.glCanvas.getContext("webgl") || this.glCanvas.getContext("experimental-webgl");

      assert(gl, "Grapheme requires WebGL to run; please get a competent browser");

      this.windows = [];
      this.elements = [];

      this.glInfo = {
        version: gl.getParameter(gl.VERSION)
      };

      this.glPrograms = {};
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

      let gl = this.glContext;

      gl.viewport(x, y, width, height);

      if (setScissor) {
        gl.enable(gl.SCISSOR_TEST);
        this.glContext.scissor(x, y, width, height);
      } else {
        gl.disable(gl.SCISSOR_TEST);
      }
    }

    get internalCanvasHeight() {
      return this.glCanvas.height;
    }

    get internalCanvasWidth() {
      return this.glCanvas.width;
    }

    set internalCanvasHeight(x) {
      x = Math.round(x);

      assert(isPositiveInteger(x) && x < 16384, "canvas height must be in range [1,16383]");
      this.glCanvas.height = x;
    }

    set internalCanvasWidth(x) {
      x = Math.round(x);

      assert(isPositiveInteger(x) && x < 16384, "canvas width must be in range [1,16383]");
      this.glCanvas.width = x;
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

  /**
  A GraphemeElement is a part of a GraphemeWindow. It has a certain precedence
  (i.e. the order in which it will be drawn onto the GL portion and the 2D canvas portion.)
  */
  class GraphemeElement {
    constructor(window, params={}) {
      checkType(window, GraphemeWindow);

      this.window = window;
      this.context = window.context;

      // precedence is a number from -Infinity to Infinity.
      this.precedence = select(params.precedence, 0);

      this.window.addElement(this);
    }

    render(elementInfo) {

    }

    destroy() {
      let elements = this.context.elements;
      let index = elements.indexOf(this);

      if (index !== -1) {
        elements.splice(index, 1);
      }
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

  // retrieve and/or build the polyline shader for a grapheme context
  function retrievePolylineShader(graphemeContext) {
    if (graphemeContext.glPrograms.polylineShader)
      return graphemeContext.glPrograms.polylineShader;

    let gl = graphemeContext.glContext;

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

    return graphemeContext.glPrograms.polylineShader = {
      program,
      colorLoc: gl.getUniformLocation(program, "line_color"),
      vertexLoc: gl.getAttribLocation(program, "v_position"),
      xyScale: gl.getUniformLocation(program, "xy_scale")
    };
  }

  const MIN_RES_ANGLE = 0.05; // minimum angle in radians between roundings in a polyline

  // Parameters for the expanding/contracting float array for polyline
  const MIN_SIZE = 16;
  const MAX_SIZE = 2 ** 24;

  /**
  PolylineElement draws a sequence of line segments connecting points. Put the points
  as ordered pairs, in CANVAS COORDINATES, in polyline.vertices. To disconnect
  points, intersperse them with two consecutive NaNs.
  */
  class PolylineElement extends GraphemeElement {
    constructor(window, params={}) {
      super(window, params);

      this.vertices = select(params.vertices, []);
      this.glBuffer = this.context.glContext.createBuffer();

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
        // use native LINE_STRIP for xtreme speed
        this._calculateNativeLines();
      }
    }

    render(elementInfo) {
      this.calculateVertices();

      let glInfo = retrievePolylineShader(this.context);
      let gl = this.context.glContext;

      let vertexCount = this._glTriangleStripVerticesTotal;
      if ((this.useNative && vertexCount < 2) || (!this.useNative && vertexCount < 3)) return;

      // tell webgl to start using the polyline program
      gl.useProgram(glInfo.program);

      // bind our webgl buffer to gl.ARRAY_BUFFER access point
      gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffer);

      let color = this.color.glColor();

      // set the vec4 at colorLocation to (r, g, b, a)
      gl.uniform4f(glInfo.colorLoc, color.r, color.g, color.b, color.a);

      // set the scaling factors
      gl.uniform2f(glInfo.xyScale, 2 / elementInfo.width, -2 / elementInfo.height);

      // copy our vertex data to the GPU
      gl.bufferData(gl.ARRAY_BUFFER, this._glTriangleStripVertices, gl.DYNAMIC_DRAW /* means we will rewrite the data often */);

      // enable the vertices location attribute to be used in the program
      gl.enableVertexAttribArray(glInfo.vertexLoc);

      // tell it that the width of vertices is 2 (since it's x,y), that it's floats,
      // that it shouldn't normalize floats, and something i don't understand
      gl.vertexAttribPointer(glInfo.vertexLoc, 2, gl.FLOAT, false, 0, 0);

      // draw the vertices as triangle strip
      gl.drawArrays(this.useNative ? gl.LINE_STRIP : gl.TRIANGLE_STRIP, 0, vertexCount);
    }
  }

  exports.Context = GraphemeContext;
  exports.PolylineElement = PolylineElement;

  return exports;

}({}));
