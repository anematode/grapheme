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

    this.addEventListener("plotcoordschanged", () => this.update())
    /*this.addEventListener("plotcoordslingered", () => {
      setTimeout(() => this.update(), 100 * Math.random())
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

    let arr = this.polyline._internal_polyline._gl_triangle_strip_vertices

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

    let ratio = transform.coords.width / this.previousTransform.coords.width

    if (adaptThickness) {
      for (let i = 0; i < arr.length; i += 4) {
        let ax = arr[i]
        let ay = arr[i + 1]
        let bx = arr[i + 2]
        let by = arr[i + 3]

        let vx = (bx - ax) / 2 * (1 - ratio)
        let vy = (by - ay) / 2 * (1 - ratio)

        arr[i] = ax + vx
        arr[i + 1] = ay + vy
        arr[i + 2] = bx - vx
        arr[i + 3] = by - vy
      }
    }

    this.polyline._internal_polyline.needsBufferCopy = true

    this.previousTransform = transform.clone()
  }

  update() {
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
        alwaysUpdate: false,
        trackVertexIndices: true
      })

      this.polyline._internal_polyline.track_vertex_indices = true
    }

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
