import { Element as GraphemeElement } from '../core/grapheme_element'
import { Pen } from '../styles/pen'
import { PolylineBase, PolylineElement } from './polyline'
import { InteractiveElement } from "../core/interactive_element"
import { Colors } from '../other/color'
import { adaptively_sample_1d, sample_1d } from './function_plot_algorithm'
import { WebGLPolylineWrapper } from './webgl_polyline_wrapper'
import * as utils from "../core/utils"
import { adaptPolyline } from '../math/adapt_polyline'

let MAX_POINTS = 10000

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
    this.quality = 0.2

    this.function = (x) => Math.atan(x)

    this.pen = new Pen({color: Colors.RED, useNative: false, thickness: 2})
    this.polyline = null

    this.alwaysUpdate = false

    this.addEventListener("plotcoordschanged", () => this.updateSync())
    /*this.addEventListener("plotcoordslingered", () => {
      setTimeout(() => this.updateSync(), 100 * Math.random())
    })*/

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

  updateSync() {
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
      this.polyline = new WebGLPolylineWrapper({
        pen: this.pen,
        alwaysUpdate: false
      })
    }

    this.polyline.vertices = vertices
    this.polyline.updateSync()
  }

  renderSync(info) {
    if (!this.polyline)
      return

    const box = info.plot.transform.box
    const gl = info.universe.gl

    gl.enable(gl.SCISSOR_TEST)
    gl.scissor(box.top_left.x * utils.dpr,
      box.top_left.y * utils.dpr,
      box.width * utils.dpr,
      box.height * utils.dpr)

    this.polyline.renderSync(info)

    gl.disable(gl.SCISSOR_TEST)

    this.renderChildren(info)
  }

  destroy() {
    if (this.polyline)
      this.polyline.destroy()
  }
}

export { FunctionPlot2D }
