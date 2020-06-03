import { parse_string } from '../function_ast/parse_string'
import { WebGLElement } from '../core/webgl_grapheme_element'
import {InteractiveElement} from '../core/interactive_element'
import { Color, Colors } from '../other/color'
import { Interval} from '../math/interval_arithm'
import * as utils from "../core/utils"

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
}`

class EquationDisplayElement extends WebGLElement {
  constructor(params={}) {
    super(params)

    this.color = Colors.RED

    this.needsBufferCopy = true
    this.gl_vertices = []
  }

  calculateOffIntervalFunc(compiled, transform) {
    let gl_vertices = this.gl_vertices

    gl_vertices.length = 0

    let plotToPixel = transform.getPlotToPixelTransform()
    let pixelToPlot = transform.getPixelToPlotTransform()

    let yRes = Math.abs(pixelToPlot.y_m / utils.dpr)
    let xRes = Math.abs(pixelToPlot.x_m / utils.dpr)

    // rectangles are stored as xmin, xmax, ymin, ymax

    let rectangles = [transform.coords.x1, transform.coords.x2, transform.coords.y1, transform.coords.y2]

    let {x_m, y_m, x_b, y_b} = plotToPixel

    let thickness = 1

    for (let k = 0; k < 20; ++k) {
      let new_rectangles = []
      for (let i = 0; i < rectangles.length; i += 4) {
        // for each rectangle

        let xmin = rectangles[i], xmax = rectangles[i + 1], ymin = rectangles[i + 2], ymax = rectangles[i + 3]
        let xInterval = new Interval(xmin, xmax)
        let yInterval = new Interval(ymin, ymax)

        let result = compiled.func(xInterval, yInterval)

        if (result.defMax === false)
          continue

        // If result is yes, or the resolution in both directions is sufficiently small, create a rectangle
        if (result.min === 1 || (xmax - xmin < xRes && ymax - ymin < yRes)) {
          let xminPixel = x_m * xmin + x_b
          let yminPixel = y_m * ymin + y_b
          let xmaxPixel = x_m * xmax + x_b
          let ymaxPixel = y_m * ymax + y_b

          gl_vertices.push(xminPixel - thickness, yminPixel - thickness, xminPixel - thickness, ymaxPixel + thickness, xmaxPixel + thickness, yminPixel - thickness, xmaxPixel + thickness, ymaxPixel + thickness, NaN, NaN)
          continue
        }
        // If result is maybe, split into four smaller rectangles
        if (result.max === 1) {
          let midX = (xmin + xmax) / 2, midY = (ymin + ymax) / 2
          new_rectangles.push(xmin, midX, ymin, midY, xmin, midX, midY, ymax, midX, xmax, ymin, midY, midX, xmax, midY, ymax)
          continue
        }
        // If result is no, do nothing
      }

      rectangles = new_rectangles
    }

    this.needsBufferCopy = true
  }

  render(info) {
    super.render(info)

    if (this.gl_vertices.length < 6)
      return

    const glManager = info.universe.glManager
    const gl = info.universe.gl

    let program = glManager.getProgram('equation')

    if (!program) {
      glManager.compileProgram('equation', vertexShaderSource, fragmentShaderSource, ['v_position'], ['line_color', 'xy_scale'])
      program = glManager.getProgram('equation')
    }

    let buffer = glManager.getBuffer(this.id)

    gl.useProgram(program.program)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)

    let color = this.color
    gl.uniform4f(program.uniforms.line_color, color.r / 255, color.g / 255, color.b / 255, color.a / 255)
    gl.uniform2f(program.uniforms.xy_scale, 2 / info.plot.width, -2 / info.plot.height)

    if (this.needsBufferCopy) {
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.gl_vertices), gl.DYNAMIC_DRAW /* means we will rewrite the data often */)

      this.needsBufferCopy = false
    }

    gl.enableVertexAttribArray(program.attribs.v_position)
    gl.vertexAttribPointer(program.attribs.v_position, 2, gl.FLOAT, false, 0, 0)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.gl_vertices.length / 2)
  }
}

class EquationPlot2D extends InteractiveElement {
  constructor(params={}) {
    super(params)

    this.equation = parse_string("x^2+y==y^5+x^3")
    this.visible = true

    this.updateIntervalFunc()
    this.update()

    this.displayedElement = new EquationDisplayElement()

    this.addEventListener("plotcoordschanged", () => this.updateLight())
    this.addEventListener("plotcoordslingered", () => {
      setTimeout(() => this.update(), 200 * Math.random())
    })
  }

  setEquation(text) {
    this.equation = parse_string(text)

    this.updateIntervalFunc()
  }

  updateIntervalFunc() {
    this.intervalFunc = this.equation.compileInterval()
  }

  update() {
    if (this.plot) {
      this.displayedElement.calculateOffIntervalFunc(this.intervalFunc, this.plot.transform)
      this.previousTransform = this.plot.transform.clone()
    }
  }

  updateLight(adaptThickness=true) {
    if (!this.previousTransform)
      return

    let transform = this.plot.transform

    let arr = this.displayedElement.gl_vertices

    let newland = this.previousTransform.getPixelToPlotTransform()
    let harvey = transform.getPlotToPixelTransform()

    let x_m = harvey.x_m * newland.x_m
    let x_b = harvey.x_m * newland.x_b + harvey.x_b
    let y_m = harvey.y_m * newland.y_m
    let y_b = harvey.y_m * newland.y_b + harvey.y_b

    let length = arr.length

    for (let i = 0; i < length; i += 2) {
      arr[i] = x_m * arr[i] + x_b
      arr[i+1] = y_m * arr[i+1] + y_b
    }

    this.displayedElement.needsBufferCopy = true

    this.previousTransform = transform.clone()
  }

  render(info) {
    if (this.visible) {
      const gl = info.universe.gl

      gl.enable(gl.SCISSOR_TEST)
      gl.scissor(box.top_left.x * utils.dpr,
        box.top_left.y * utils.dpr,
        box.width * utils.dpr,
        box.height * utils.dpr)

      this.displayedElement.render(info)

      gl.disable(gl.SCISSOR_TEST)
    }
  }
}

export {EquationPlot2D}
