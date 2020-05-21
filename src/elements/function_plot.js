import { Element as GraphemeElement } from '../core/grapheme_element'
import { Pen } from '../styles/pen'
import { PolylineElement } from './polyline'
import { Colors } from '../other/color'

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
    this.plottingMode = "rough"
    this.quality = 0.5
    this.function = (x) => Math.atan(x)

    this.pen = new Pen({color: Colors.TEAL})
    this.vertices = []

    this.alwaysUpdate = false

    this.addEventListener("plotcoordschanged", () => this.update())
  }

  update() {
    let vertices = this.vertices = []

    let transform = this.plot.transform
    let simplifiedTransform = transform.getPlotToPixelTransform()

    let plotPoints = this.plotPoints

    if (plotPoints === "auto") {
      plotPoints = this.quality * transform.box.width
    }

    let min_y = transform.coords.y1 - transform.coords.height / 4
    let max_y = transform.coords.y2 + transform.coords.height / 4

    for (let i = 0; i <= plotPoints; ++i) {
      let x = i / plotPoints * transform.coords.width + transform.coords.x1
      let val = this.function(x)

      if (!isNaN(val) && (val > min_y && val < max_y)) {
        vertices.push(x, val)
      } else {
        vertices.push(NaN, NaN)
      }
    }

    this.plot.transform.plotToPixelArr(vertices)

    this.polyline = new PolylineElement({pen: this.pen, vertices, alwaysUpdate: false})
    this.polyline.update()

    if (this.plottingMode === "rough")
      return

    for (let i = 2; i < vertices.length - 2; i += 2) {
      let p1x = vertices[i-2]
      let p1y = vertices[i-1]
      let p2x = vertices[i]
    }
  }

  render(info) {
    super.render(info)

    info.ctx.save()

    this.plot.transform.box.clip(info.ctx)

    this.polyline.render(info)

    info.ctx.restore()
  }
}

export { FunctionPlot2D }
