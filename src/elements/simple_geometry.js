import { Element as GraphemeElement } from '../grapheme_element'
import { Color } from '../color'

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
}

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
}

// Direct correspondence with gl modes
const RENDER_MODES = {
  POINTS: 'POINTS',
  LINE_STRIP: 'LINE_STRIP',
  LINE_LOOP: 'LINE_LOOP',
  LINES: 'LINES',
  TRIANGLE_STRIP: 'TRIANGLE_STRIP',
  TRIANGLE_FAN: 'TRIANGLE_FAN',
  TRIANGLES: 'TRIANGLES'
}

/**
A 2D geometry, consisting of only one color.
No edges, nothing crazy, just some (possibly disjoint) areas colored in a single color.
The float array of vertices is glVertices, and the actual number of vertices to draw is
glVertexCount.
*/
class Simple2DGeometry extends GraphemeElement {
  constructor (params = {}) {
    super(params)

    this.color = new Color(0, 0, 0, 255)
    this.glVertices = null
    this.glVerticesCount = 0

    this.renderMode = RENDER_MODES.POINTS
  }

  render (renderInfo) {
    const begin = performance.now()

    // Early exit condition
    if (!this.glVertices) return

    const vertexCount = this.glVerticesCount

    const gl = renderInfo.gl
    const glManager = renderInfo.glResourceManager

    // If there is no simple geometry program yet, compile one!
    if (!glManager.hasProgram(monochromeShader.name)) {
      glManager.compileProgram(monochromeShader.name,
        monochromeShader.vertex, monochromeShader.fragment,
        ['v_position'], ['xy_scale', 'line_color'])
    }

    // Obtain the program we want to use
    const programInfo = glManager.getProgram(monochromeShader.name)

    // Single buffer used for position
    const glBuffer = glManager.getBuffer(this.uuid)
    this.addUsedBufferName(this.uuid)

    // tell webgl to start using the geometry program
    gl.useProgram(programInfo.program)

    // Get the desired color of our geometry
    const color = this.color.glColor()

    // set the vec4 at colorLocation to (r, g, b, a)
    gl.uniform4f(programInfo.uniforms.line_color, color.r, color.g, color.b, color.a)

    // set the scaling factors
    gl.uniform2f(programInfo.uniforms.xy_scale, 2 / renderInfo.width, -2 / renderInfo.height)

    // bind our webgl buffer to gl.ARRAY_BUFFER access point
    gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer)

    // copy our vertex data to the GPU
    gl.bufferData(gl.ARRAY_BUFFER, this.glVertices, gl.DYNAMIC_DRAW /* means we will rewrite the data often */)

    // enable the vertices location attribute to be used in the program
    gl.enableVertexAttribArray(programInfo.attribs.v_position)

    // tell it that the width of vertices is 2 (since it's x,y), that it's floats,
    // that it shouldn't normalize floats, and something i don't understand
    gl.vertexAttribPointer(programInfo.attribs.v_position, 2, gl.FLOAT, false, 0, 0)

    // draw the vertices
    gl.drawArrays(gl[this.renderMode], 0, vertexCount)

    const end = performance.now()

    window.renderingTimes.push(end - begin)
  }
}

class Multicolored2DGeometry extends GraphemeElement {
  constructor (params = {}) {
    super(params)

    this.glVertices = null
    this.glColors = null
    this.glVerticesCount = multicoloredShader
  }
}

export { Simple2DGeometry, Multicolored2DGeometry, RENDER_MODES }
