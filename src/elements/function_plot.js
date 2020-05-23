import { Element as GraphemeElement } from '../core/grapheme_element'
import { Pen } from '../styles/pen'
import { PolylineElement } from './polyline'
import { Colors } from '../other/color'
import { adaptively_sample_1d, sample_1d } from './function_plot_algorithm'
import { WebGLPolylineWrapper } from './webgl_polyline_wrapper'

let MAX_POINTS = 10000

// Allowed plotting modes:
// rough = linear sample, no refinement
// fine = linear sample with refinement

class FunctionPlot2D extends GraphemeElement {
  constructor(params={}) {
    super(params)

    const {
      plotPoints = "auto"
    } = params

    this.plotPoints = plotPoints
    this.plottingMode = "fine"
    this.quality = 0.05
    this.function = (x) => Math.atan(x)

    this.pen = new Pen({color: Colors.RANDOM, useNative: true})
    this.polyline = null

    this.alwaysUpdate = false

    this.addEventListener("plotcoordschanged", () => this.update())
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
      vertices = sample_1d(coords.x1, coords.x2, this.function, box.width * this.quality)
    } else {
      vertices = adaptively_sample_1d(coords.x1, coords.x2, this.function, box.width * this.quality)
    }

    this.plot.transform.plotToPixelArr(vertices)

    if (!this.polyline)
      this.polyline = new WebGLPolylineWrapper({pen: this.pen, alwaysUpdate: false})

    this.polyline.vertices = vertices
    this.polyline.update()
  }

  render(info) {

    let gl = info.universe.gl
    gl.enable(gl.SCISSOR_TEST)

    const box = info.plot.transform.box

    gl.scissor(box.top_left.x, box.top_left.y, box.width, box.height)

    this.polyline.render(info)

    gl.disable(gl.SCISSOR_TEST)
  }

  destroy() {
    if (this.polyline)
      this.polyline.destroy()
  }
}

export { FunctionPlot2D }
