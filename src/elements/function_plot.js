import { Pen } from '../styles/pen'
import { InteractiveElement } from "../core/interactive_element"
import { Colors } from '../other/color'
import { adaptively_sample_1d, sample_1d } from '../math/function_plot_algorithm'
import * as utils from "../core/utils"
import { adaptPolyline } from '../math/adapt_polyline'
import { WebGLPolyline } from './webgl_polyline'
import { getFunctionName } from '../core/utils'
import { defineFunction, getFunction, undefineFunction } from '../ast/user_defined'

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
    this.plottingAxis = 'x'

    this.function = (x) => x
    this.functionName = getFunctionName()

    this.pen = new Pen({color: Colors.RED, useNative: false, thickness: 2})
    this.polyline = null

    this.addEventListener("plotcoordschanged", () => this.markUpdate())

    this.interactivityEnabled = true
  }

  setFunction(func, variable='x') {
    defineFunction(this.functionName, func, [variable])

    this.function = getFunction(this.functionName).evaluate
    this.markUpdate()
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

  setAxis(axis) {
    if (axis !== 'x' && axis !== 'y')
      throw new Error("Axis should be x or y, not " + axis + ".")

    this.plottingAxis = axis
    this.markUpdate()
  }

  update(info) {
    super.update()

    let transform = this.plot.transform

    this.previousTransform = transform.clone()

    let { coords, box } = transform

    let plotPoints = this.plotPoints

    let width = this.plottingAxis === 'x' ? box.width : box.height

    if (plotPoints === "auto") {
      plotPoints = this.quality * width
    }

    let vertices = []
    let x1 = this.plottingAxis === 'x' ? coords.x1 : coords.y1
    let x2 = this.plottingAxis === 'x' ? coords.x2 : coords.y2

    if (this.plottingMode === "rough") {
      let points = width * this.quality

      vertices = sample_1d(x1, x2, this.function, points)
    } else {
      vertices = adaptively_sample_1d(x1, x2, this.function,
        width * this.quality, transform.getAspect(), this.plottingAxis === 'x' ? coords.height / box.height : coords.width / box.width)
    }

    if (this.plottingAxis !== 'x') {
      for (let i = 0; i < vertices.length; i += 2) {
        let tmp = vertices[i]
        vertices[i] = vertices[i + 1]
        vertices[i + 1] = tmp
      }
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

    undefineFunction(this.functionName)
  }
}

export { FunctionPlot2D }
