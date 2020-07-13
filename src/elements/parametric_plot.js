import { defineFunction, getFunction } from '../ast/user_defined'
import { getFunctionName } from '../core/utils'
import { WebGLPolyline } from './webgl_polyline'
import { InteractiveElement } from '../core/interactive_element'
import { adaptively_sample_parametric_1d, sample_parametric_1d } from '../math/function_plot_algorithm'

class ParametricPlot2D extends InteractiveElement {
  constructor(params={}) {
    super(params)

    this.function = null
    this.functionName = getFunctionName()

    this.polyline = new WebGLPolyline()
    this.samples = 2000

    this.rangeStart = -20
    this.rangeEnd = 20
    this.maxDepth = 3
    this.plottingMode = "fine"

    this.addEventListener("plotcoordschanged", () => this.markUpdate())
  }

  get pen() {
    return this.polyline.pen
  }

  set pen(pen) {
    this.polyline.pen = pen
  }

  setFunction(func, variable='x') {
    defineFunction(this.functionName, func, [variable])

    this.function = getFunction(this.functionName).evaluate
    this.markUpdate()
  }

  render(info) {
    this.polyline.render(info)
  }

  update(info) {
    super.update(info)

    if (!this.function)
      return

    let vertices
    const points = this.samples

    if (this.plottingMode === "rough") {
      vertices = this.polyline.vertices = sample_parametric_1d(this.rangeStart, this.rangeEnd, this.function, points, true)
    } else {
      vertices = this.polyline.vertices = adaptively_sample_parametric_1d(this.rangeStart, this.rangeEnd, this.function, points, info.plot.transform.getAspect(), this.maxDepth)
    }

    info.plot.transform.plotToPixelArr(vertices)

    this.polyline.update(info)
  }

  destroy() {
    this.polyline.destroy()
  }
}

export { ParametricPlot2D }
