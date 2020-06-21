import * as utils from '../core/utils'
import { WebGLElement } from '../core/webgl_grapheme_element'
import * as GEOCALC from '../math/geometry_algorithms'
import { Pen } from '../styles/pen'
import { nextPowerOfTwo, calculatePolylineVertices } from '../math/polyline_triangulation'
import { BoundingBox } from '../math/bounding_box'
import { Vec2 } from '../math/vec'
import { getDashedPolyline } from '../math/dashed_polyline'

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
}`
// this frag shader is used for the polylines
const fragmentShaderSource = `// set the float precision of the shader to medium precision
precision mediump float;
// vec4 containing the color of the line to be drawn
uniform vec4 line_color;
void main() {
  gl_FragColor = line_color;
}
`

// polyline primitive in Cartesian coordinates
// has thickness, vertex information, and color stuff
class WebGLPolyline extends WebGLElement {
  constructor (params = {}) {
    super(params)

    this.vertices = params.vertices ? params.vertices : [] // x,y values in pixel space
    this.pen = params.pen ? params.pen : new Pen()

    this.glVertices = null
    this.glVertexCount = 0

    this.alwaysUpdate = false
  }

  _calculateTriangles (box) {
    let result = calculatePolylineVertices(this.vertices, this.pen, box)
    this.glVertices = result.glVertices
    this.glVertexCount = result.vertexCount
  }

  _calculateNativeLines (box) {
    let vertices = this.vertices

    if (this.pen.dashPattern.length !== 0) {
      vertices = getDashedPolyline(vertices, this.pen, box)
    }

    if (vertices.length <= 3) {
      this.glVertexCount = 0
      return
    }

    let glVertices = new Float32Array(vertices.length)

    if (Array.isArray(vertices)) {
      for (let i = 0; i < vertices.length; ++i) {
        glVertices[i] = vertices[i]
      }
    } else {
      glVertices.set(vertices)
    }

    this.glVertexCount = Math.ceil(vertices.length / 2)
    this.glVertices = glVertices
  }

  update (info) {
    super.update()

    let box, thickness = this.pen.thickness

    if (info) {
      box = info.plot.getCanvasBox().pad({
        left: -thickness,
        right: -thickness,
        top: -thickness,
        bottom: -thickness
      })
    } else {
      // ANNOYING! This should never be the case these days
      box = new BoundingBox(new Vec2(0, 0), 8192, 8192).pad({
        left: -thickness,
        right: -thickness,
        top: -thickness,
        bottom: -thickness
      })
    }

    if (this.pen.useNative) {
      // use native LINE_STRIP for extreme speed
      this._calculateNativeLines(box)
    } else {

      this._calculateTriangles(box)
    }

    this.needsBufferCopy = true
  }

  isClick (point) {
    return this.distanceFrom(point) < Math.max(this.pen.thickness / 2, 2)
  }

  distanceFrom (point) {
    return GEOCALC.pointLineSegmentMinDistance(point.x, point.y, this.vertices)
  }

  closestTo (point) {
    return GEOCALC.pointLineSegmentClosest(point.x, point.y, this.vertices)
  }

  render (info) {
    if (!this.visible) {
      return
    }

    super.render(info)

    const glManager = info.universe.glManager
    const gl = info.universe.gl
    const useNative = this.pen.useNative

    let program = glManager.getProgram('webgl-polyline')

    if (!program) {
      glManager.compileProgram('webgl-polyline', vertexShaderSource, fragmentShaderSource, ['v_position'], ['line_color', 'xy_scale'])
      program = glManager.getProgram('webgl-polyline')
    }

    let buffer = glManager.getBuffer(this.id)
    let vertexCount = this.glVertexCount

    if ((useNative && vertexCount < 2) || (!useNative && vertexCount < 3)) return
    // tell webgl to start using the gridline program
    gl.useProgram(program.program)
    // bind our webgl buffer to gl.ARRAY_BUFFER access point
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)

    let color = this.pen.color
    // set the vec4 at colorLocation to (r, g, b, a)
    // divided by 255 because webgl likes [0.0, 1.0]
    gl.uniform4f(program.uniforms.line_color, color.r / 255, color.g / 255, color.b / 255, color.a / 255)
    gl.uniform2f(program.uniforms.xy_scale,
      2 / info.plot.width,
      -2 / info.plot.height)

    // copy our vertex data to the GPU
    if (this.needsBufferCopy) {
      gl.bufferData(gl.ARRAY_BUFFER, this.glVertices, gl.DYNAMIC_DRAW /* means we will rewrite the data often */)

      this.needsBufferCopy = false
    }

    // enable the vertices location attribute to be used in the program
    gl.enableVertexAttribArray(program.attribs.v_position)
    // tell it that the width of vertices is 2 (since it's x,y), that it's floats,
    // that it shouldn't normalize floats, and something i don't understand
    gl.vertexAttribPointer(program.attribs.v_position, 2, gl.FLOAT, false, 0, 0)
    // draw the vertices as triangle strip
    gl.drawArrays(useNative ? gl.LINE_STRIP : gl.TRIANGLE_STRIP, 0, vertexCount)
  }

  destroy () {
    utils.deleteBuffersNamed(this.id)
  }
}

export { WebGLPolyline }
