import { parse_string } from '../function_ast/parse_string'
import { WebGLElement } from '../core/webgl_grapheme_element'
import {InteractiveElement} from '../core/interactive_element'
import { Color, Colors } from '../other/color'
import { Interval} from '../math/interval_arithm'
import * as utils from "../core/utils"
import {WebGLPolylineWrapper} from './webgl_polyline_wrapper'
import { generateContours1 } from '../math/contouring'

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

class EquationPlot2D extends InteractiveElement {
  constructor(params={}) {
    super(params)

    this.equation = parse_string("x^2+y")
    this.visible = true

    this.updateFunc()

    this.displayedElement = new WebGLPolylineWrapper()
    this.displayedElement.pen.useNative = false
    this.displayedElement.pen.endcap = "none"

    this.addEventListener("plotcoordschanged", () => this.update())
    /*this.addEventListener("plotcoordslingered", () => {
      setTimeout(() => this.update(), 200 * Math.random())
    })*/
  }

  setEquation(text) {
    this.equation = parse_string(text)

    this.updateFunc()
  }

  updateFunc() {
    let exportedVariables = ['x', 'y']

    let eqn = this.equation.compile(exportedVariables).func
    let interval = this.equation.compileInterval(exportedVariables).func
    //let real = this.equation.compileReal(exportedVariables)

    let fxNode = this.equation.derivative('x')
    let fyNode = this.equation.derivative('y')
    let fxxNode = fxNode.derivative('x')
    let fxyNode = fxNode.derivative('y')
    let fyyNode = fyNode.derivative('y')

    let fx = fxNode.compile(exportedVariables).func
    let fy = fyNode.compile(exportedVariables).func
    let fxx = fxxNode.compile(exportedVariables).func
    let fxy = fxyNode.compile(exportedVariables).func
    let fyy = fyyNode.compile(exportedVariables).func

    let curvatureFunc = (x, y) => {
      let fxV = fx(x, y), fyV = fy(x, y), fxxV = fxx(x, y), fxyV = fxy(x,y), fyyV = fyy(x, y)
      let fxVSq = fxV * fxV, fyVSq = fyV * fyV

      window.fxx = fxx

      return Math.pow(fxVSq + fyVSq, 1.5) / (fyVSq * fxxV - 2 * fxV * fyV * fxyV + fxVSq * fyyV)
    }

    this.compiledFunctions = {
      eqn,
      interval,
      curvatureFunc
    }
  }

  update() {
    if (this.plot) {
      let coords = this.plot.transform.coords
      let vertices = generateContours1(this.compiledFunctions.eqn, coords.x1, coords.x2, coords.y1, coords.y2)

      this.plot.transform.plotToPixelArr(vertices)

      this.displayedElement.vertices = vertices
      this.displayedElement.update()
    }
  }

  render(info) {
    if (this.visible) {
      const gl = info.universe.gl
      const box = info.plot.transform.box

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
