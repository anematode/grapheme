import { Plot2DElement } from './plot2d_element'
import { Vec2 } from "../math/vec2"

class Plot2D extends Plot2DElement {
  constructor (params = {}) {
    super(params)

    this.setPlot(this)

    this.box = { x1: 0, y1: 0, width: 640, height: 480 }
    this.margins = { left: 0, right: 0, top: 0, bottom: 0 }
    this.plotCoords = { cx: 0, cy: 0, width: 5, height: 5 }

    this.plotRegion = {}

    this.calculatePlottingRegion()
  }

  calculatePlottingRegion () {
    const pr = this.plotRegion
    const pc = this.plotCoords
    const box = this.box
    const margins = this.margins

    if (box.width <= 0 || box.height <= 0) {
      throw new Error("Dimensions of outer box are too small")
    }

    if (pc.width <= 0 || pc.height <= 0) {
      throw new Error("Dimensions of plot coordinates are too small")
    }

    box.x2 = box.x1 + box.width
    box.y2 = box.y1 + box.height

    pr.x1 = box.x1 + margins.left
    pr.y1 = box.y1 + margins.top

    pr.width = box.width - margins.left - margins.right
    pr.height = box.height - margins.top - margins.bottom

    if (pr.width <= 0 || pr.height <= 0) {
      throw new Error("Dimensions of inner box are too small.")
    }

    pr.x2 = pr.x1 + pr.width
    pr.y2 = pr.y1 + pr.height

    pc.x1 = pc.cx - pc.width / 2
    pc.x2 = pc.cx + pc.width / 2
    pc.y1 = pc.cy - pc.height / 2
    pc.y2 = pc.cy + pc.height / 2
  }

  plotToCanvas (vec) {
    const { x, y } = vec
    const pr = this.plotRegion
    const pc = this.plotCoords

    return new Vec2((x - pc.x1) / pc.width * pr.width + pr.x1, (y - pc.y1) / pc.height * pr.height + pr.y1)
  }

  plotToCanvasArray(arr) {
    if (arr.length === 0)
      return

    if (arr[0].x) {

    }
    
    for (let i = 0; i < arr.length; ++i) {

    }
  }

  canvasToPlot (vec) {
    const { x, y } = vec

    const pr = this.plotRegion
    const pc = this.plotCoords

    return new Vec2((x - pr.x1) / pr.width * pc.width + pc.x1, (y - pr.y1) / pr.height * pc.height + pc.y1)
  }


}

export { Plot2D }
