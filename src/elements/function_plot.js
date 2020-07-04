import { Pen } from '../styles/pen'
import { InteractiveElement } from "../core/interactive_element"
import { Colors } from '../other/color'
import { adaptively_sample_1d, sample_1d } from '../math/function_plot_algorithm'
import * as utils from "../core/utils"
import { adaptPolyline } from '../math/adapt_polyline'
import { WebGLPolyline } from './webgl_polyline'
import { Sqrt } from '../math/complex/pow'
import { Complex } from '../math/complex/complex'
import { Add, Re } from '../math/complex/basic_arithmetic'
import { Arccos } from '../math/complex/inverse_trig'
import { Arctanh } from '../math/complex/inverse_hyperbolic'

// Allowed plotting modes:
// rough = linear sample, no refinement
// fine = linear sample with refinement

class FunctionPlot2D extends InteractiveElement {
  constructor(params={}) {
    super(params)

    const {
      plotPoints = "auto",
      plottingMode = "fine"
    } = params

    this.plotPoints = plotPoints
    this.plottingMode = plottingMode
    this.quality = 1

    this.function = (x) => Re(Sin(new Complex(x)))

    this.pen = new Pen({color: Colors.RED, useNative: false, thickness: 2})
    this.polyline = null

    this.addEventListener("plotcoordschanged", () => this.markUpdate())

    this.interactivityEnabled = true
  }

  setFunction(func) {
    this.function = func
  }

  isClick(position) {
    if (!this.polyline)
      return false
    return this.polyline.distanceFrom(position) < this.polyline.pen.thickness * 2
  }

  updateLight(adaptThickness=true) {
    let transform = this.plot.transform

    this.previousTransform = transform.clone()

    adaptPolyline(this.polyline, this.previousTransform, transform, adaptThickness)
  }

  update(info) {
    super.update()

    let transform = this.plot.transform

    this.previousTransform = transform.clone()

    let { coords, box } = transform

    let plotPoints = this.plotPoints

    if (plotPoints === "auto") {
      plotPoints = this.quality * box.width
    }

    let vertices = []

    if (this.plottingMode === "rough") {
      let points = box.width * this.quality

      vertices = sample_1d(coords.x1, coords.x2, this.function, points)
    } else {
      vertices = adaptively_sample_1d(coords.x1, coords.x2, this.function,
        box.width * this.quality, transform.getAspect(), coords.height / box.height)
    }

    this.plot.transform.plotToPixelArr(vertices)

    if (!this.polyline) {
      this.polyline = new WebGLPolyline({
        pen: this.pen,
        alwaysUpdate: false
      })
    }

    this.polyline.vertices = vertices
    this.polyline.update(info)
  }

  render(info) {
    if (!this.polyline)
      return

    const box = info.plot.transform.box
    const gl = info.universe.gl

    gl.enable(gl.SCISSOR_TEST)
    gl.scissor(box.top_left.x * utils.dpr,
      box.top_left.y * utils.dpr,
      box.width * utils.dpr,
      box.height * utils.dpr)

    this.polyline.render(info)

    gl.disable(gl.SCISSOR_TEST)

    this.renderChildren(info)
  }

  destroy() {
    if (this.polyline)
      this.polyline.destroy()
  }
}

export { FunctionPlot2D }
