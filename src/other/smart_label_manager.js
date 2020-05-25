import { BoundingBox, intersectBoundingBoxes } from '../math/bounding_box'
import { Vec2 } from '../math/vec'

class SmartLabelManager {
  constructor(plot) {
    this.plot = plot

    this.labelBoundingBoxes = []

    this.antipadding = 1000
  }

  getIntersectingArea(bbox) {
    let area = 0

    for (let box of this.labelBoundingBoxes) {
      area += intersectBoundingBoxes(bbox, box).area()
    }

    return area
  }

  addBox(box) {
    this.labelBoundingBoxes.push(box)
  }

  reset() {
    this.labelBoundingBoxes = []

    let box = this.plot.getCanvasBox()

    this.labelBoundingBoxes.push(new BoundingBox(box.top_left.clone().subtract(new Vec2(this.antipadding, this.antipadding)), this.antipadding * 2 + box.width, this.antipadding))
    this.labelBoundingBoxes.push(new BoundingBox(new Vec2(box.x1 - this.antipadding, box.y2), this.antipadding * 2 + box.width, this.antipadding))
    this.labelBoundingBoxes.push(new BoundingBox(box.top_left.clone().subtract(new Vec2(this.antipadding, 0)), this.antipadding, box.height))
    this.labelBoundingBoxes.push(new BoundingBox(new Vec2(box.x2, box.y1), this.antipadding, box.height))
  }

  drawBoundingBoxes(ctx) {
    ctx.fillStyle = "red"

    for (let box of this.labelBoundingBoxes) {
      ctx.fill(box.getPath())
    }
  }
}

export { SmartLabelManager }
