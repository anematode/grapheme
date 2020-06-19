import { parse_string } from '../function_ast/parse_string'
import {InteractiveElement} from '../core/interactive_element'
import { Colors } from '../other/color'
import { Interval} from '../math/interval_arithm'
import * as utils from "../core/utils"
import {WebGLPolylineWrapper} from './webgl_polyline_wrapper'
import { generateContours1, generateContours2 } from '../math/contouring'
import { adaptPolyline } from '../math/adapt_polyline'

class EquationPlot2D extends InteractiveElement {
  constructor(params={}) {
    super(params)

    this.equation = parse_string("x^2+y")
    this.visible = true

    this.updateFunc()

    this.displayedElement = new WebGLPolylineWrapper()
    this.displayedElement.pen.useNative = false
    this.displayedElement.pen.endcap = "none"
    this.displayedElement.pen.color = Colors.RED

    this.addEventListener("plotcoordschanged", () => this.updateLight())
    this.addEventListener("plotcoordslingered", () => {
      setTimeout(() => this.updateSync(), 200 * Math.random())
    })
  }

  setEquation(text) {
    this.equation = parse_string(text)

    this.updateFunc()
  }

  updateLight(adaptThickness=false) {
    if (!this.plot)
      return

    let transform = this.plot.transform
    let previousTransform = this.previousTransform
    let polyline = this.displayedElement

    adaptPolyline(polyline, previousTransform, transform, adaptThickness)

    this.previousTransform = transform.clone()
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

      return (fxVSq + fyVSq) ** 1.5 / (fyVSq * fxxV - 2 * fxV * fyV * fxyV + fxVSq * fyyV)
    }

    this.compiledFunctions = {
      eqn,
      interval,
      curvatureFunc
    }
  }

  updateSync() {
    if (this.plot) {
      let coords = this.plot.transform.coords
      let vertices = generateContours2(this.compiledFunctions.eqn, this.compiledFunctions.curvatureFunc, coords.x1, coords.x2, coords.y1, coords.y2)

      this.plot.transform.plotToPixelArr(vertices)

      this.displayedElement.vertices = vertices
      this.displayedElement.updateSync()

      this.previousTransform = this.plot.transform.clone()
    }
  }

  renderSync(info) {
    if (this.visible) {
      const gl = info.universe.gl
      const box = info.plot.transform.box

      gl.enable(gl.SCISSOR_TEST)
      gl.scissor(box.top_left.x * utils.dpr,
        box.top_left.y * utils.dpr,
        box.width * utils.dpr,
        box.height * utils.dpr)

      this.displayedElement.renderSync(info)

      gl.disable(gl.SCISSOR_TEST)
    }
  }
}

export {EquationPlot2D}
