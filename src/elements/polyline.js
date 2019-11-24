import { Element as GraphemeElement } from "../grapheme_element";
import { Color } from "../color";
import * as utils from "../utils";

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
  return utils.isInteger(x) && min <= x && x <= max;
}

function nextPowerOfTwo(x) {
  return 2 ** Math.ceil(Math.log2(x));
}

// retrieve and/or build the polyline shader for a grapheme context
function retrievePolylineShader(graphemeContext) {
  if (graphemeContext.glPrograms.polylineShader)
    return graphemeContext.glPrograms.polylineShader;

  let gl = graphemeContext.glContext;

  let vertShad = utils.createShaderFromSource(gl /* rendering context */,
    gl.VERTEX_SHADER /* enum for vertex shader type */,
    vertexShaderSource /* source of the vertex shader*/ );

  // create the frag shader
  let fragShad = utils.createShaderFromSource(gl /* rendering context */,
    gl.FRAGMENT_SHADER /* enum for vertex shader type */,
    fragmentShaderSource /* source of the vertex shader*/ );

  // create the program. we set _polylineShader in the parent Context so that
  // any future gridlines in this Context will use the already-compiled shader
  let program = utils.createGLProgram(gl, vertShad, fragShad);

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

    this.vertices = utils.select(params.vertices, []);
    this.glBuffer = this.context.glContext.createBuffer();

    this.color = utils.select(params.color, new Color(0,0,0,255));
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

          if (utils.mod(a1 - a2, 2 * Math.PI) < Math.PI) {
            // left turn
            start_a = Math.PI + a1;
            end_a = a2;
          } else {
            start_a = Math.PI + a2;
            end_a = a1;
          }

          let angle_subtended = utils.mod(end_a - start_a, 2 * Math.PI);
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
      triStripVertices = this._glTriangleStripVertices = new Float32Array(Math.min(Math.max(MIN_SIZE, nextPowerOfTwo(vertices.length)), MAX_SIZE))
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

export { PolylineElement };
