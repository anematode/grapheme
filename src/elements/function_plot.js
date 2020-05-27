import { Element as GraphemeElement } from '../core/grapheme_element'
import { Pen } from '../styles/pen'
import { PolylineBase, PolylineElement } from './polyline'
import { InteractiveElement } from "../core/interactive_element"
import { Colors } from '../other/color'
import { adaptively_sample_1d, sample_1d } from './function_plot_algorithm'
import { WebGLPolylineWrapper } from './webgl_polyline_wrapper'
import * as utils from "../core/utils"

let MAX_POINTS = 10000

// Allowed plotting modes:
// rough = linear sample, no refinement
// fine = linear sample with refinement

class FunctionPlot2D extends InteractiveElement {
  constructor(params={}) {
    super(params)

    const {
      plotPoints = "auto"
    } = params

    this.plotPoints = plotPoints
    this.plottingMode = "fine"
    this.quality = 1

    this.function = (x) => Math.atan(x)

    this.pen = new Pen({color: Colors.RED, useNative: false, thickness: 2})
    this.polyline = null

    this.alwaysUpdate = false

    this.addEventListener("plotcoordschanged", () => this.update())

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

  update() {
    let transform = this.plot.transform
    let { coords, box } = transform
    let simplifiedTransform = transform.getPlotToPixelTransform()

    let plotPoints = this.plotPoints

    if (plotPoints === "auto") {
      plotPoints = this.quality * box.width
    }

    let min_y = coords.y1 - coords.height / 4
    let max_y = coords.y2 + coords.height / 4

    let vertices = []

    if (this.plottingMode === "rough") {
      let points = box.width * this.quality

      vertices = sample_1d(coords.x1, coords.x2, this.function, points)
    } else {
      vertices = adaptively_sample_1d(coords.x1, coords.x2, this.function, box.width * this.quality)
    }

    this.plot.transform.plotToPixelArr(vertices)

    if (!this.polyline)
      this.polyline = new PolylineElement({pen: this.pen, alwaysUpdate: false})

    this.polyline.vertices = vertices
    this.polyline.update()
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
