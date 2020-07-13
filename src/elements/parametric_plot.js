import { defineFunction, getFunction } from '../ast/user_defined'
import { getFunctionName } from '../core/utils'
import { WebGLPolyline } from './webgl_polyline'
import { InteractiveElement } from '../core/interactive_element'

class ParametricPlot2D extends InteractiveElement {
  constructor(params={}) {
    super(params)

    this.function = null
    this.functionName = getFunctionName()

    this.polyline = new WebGLPolyline()
    this.samples = 1000

    this.rangeStart = -20
    this.rangeEnd = 20

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

    let vertices = this.polyline.vertices = []

    const samples = this.samples
    const rangeStart = this.rangeStart, rangeEnd = this.rangeEnd
    const func = this.function

    for (let i = 0; i <= samples; ++i) {
      let frac = i / samples

      let t = rangeStart + (rangeEnd - rangeStart) * frac

      let res = func(t)

      vertices.push(res.x, res.y)
    }

    info.plot.transform.plotToPixelArr(vertices)

    this.polyline.update(info)
  }

  destroy() {
    this.polyline.destroy()
  }
}

export { ParametricPlot2D }
