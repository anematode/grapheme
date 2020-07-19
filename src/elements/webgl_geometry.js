import { WebGLElement } from '../core/webgl_grapheme_element'
import { Color } from '../other/color'
import * as utils from '../core/utils'

// this vertex shader is used for basic 2d geometries
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

const fragmentShaderSource = `// set the float precision of the shader to medium precision
precision mediump float;
// vec4 containing the color of the line to be drawn
uniform vec4 line_color;
void main() {
  gl_FragColor = line_color;
}`

class Simple2DWebGLGeometry extends WebGLElement {
  constructor(params={}) {
    super(params)

    this.color = new Color()

    this.glVertices = null

    this.renderMode = "triangles" // allowed values: points, line_strip, line_loop, lines, triangle_strip, triangle_fan, triangles
    this.needsBufferCopy = true
  }

  removeInfinities() {
    const vertices = this.vertices

    if (!vertices)
      return

    for (let i = 0; i < vertices.length; ++i) {
      if (vertices[i] > 1e6) {
        vertices[i] = 1e6
      } else if (vertices[i] < -1e6) {
        vertices[i] = -1e6
      }
    }
  }

  get glVertices() {
    return this.vertices
  }

  set glVertices(verts) {
    this.vertices = verts

    this.removeInfinities()
    this.needsBufferCopy = true
  }

  render(info) {
    if (!this.visible || !this.glVertices || this.glVertices.length === 0)
      return

    super.render(info)

    const glManager = info.universe.glManager
    const gl = info.universe.gl

    let program = glManager.getProgram('simple-2d-geometry')

    if (!program) {
      glManager.compileProgram('simple-2d-geometry', vertexShaderSource, fragmentShaderSource, ['v_position'], ['line_color', 'xy_scale'])
      program = glManager.getProgram('simple-2d-geometry')
    }

    let buffer = glManager.getBuffer(this.id)

    let vertices = this.glVertices
    let vertexCount = this.glVertexCount ? this.glVertexCount : vertices.length / 2

    // tell webgl to start using the gridline program
    gl.useProgram(program.program)
    // bind our webgl buffer to gl.ARRAY_BUFFER access point
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)

    let color = this.color
    // set the vec4 at colorLocation to (r, g, b, a)
    // divided by 255 because webgl likes [0.0, 1.0]
    gl.uniform4f(program.uniforms.line_color, color.r / 255, color.g / 255, color.b / 255, color.a / 255)
    gl.uniform2f(program.uniforms.xy_scale,
      2 / info.plot.width,
      -2 / info.plot.height)

    // copy our vertex data to the GPU
    if (this.needsBufferCopy) {
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW /* means we will rewrite the data often */)

      this.needsBufferCopy = false
    }

    // enable the vertices location attribute to be used in the program
    gl.enableVertexAttribArray(program.attribs.v_position)
    // tell it that the width of vertices is 2 (since it's x,y), that it's floats,
    // that it shouldn't normalize floats, and something i don't understand
    gl.vertexAttribPointer(program.attribs.v_position, 2, gl.FLOAT, false, 0, 0)

    let renderMode = 0

    switch (this.renderMode) {
      case "points":
        renderMode = gl.POINTS
        break
      case "line_strip":
        renderMode = gl.LINE_STRIP
        break
      case "line_loop":
        renderMode = gl.LINE_LOOP
        break
      case "lines":
        renderMode = gl.LINES
        break
      case "triangle_strip":
        renderMode = gl.TRIANGLE_STRIP
        break
      case "triangle_fan":
        renderMode = gl.TRIANGLE_FAN
        break
      case "triangles":
        renderMode = gl.TRIANGLES
        break
    }

    // draw the vertices
    gl.drawArrays(renderMode, 0, vertexCount)
  }

  destroy () {
    utils.deleteBuffersNamed(this.id)
  }
}

export { Simple2DWebGLGeometry }
