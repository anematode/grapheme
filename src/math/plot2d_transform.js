import { BoundingBox, boundingBoxTransform } from './bounding_box'
import { Vec2 } from './vec'
import * as utils from "../core/utils"

class Plot2DTransform {
  constructor(params={}) {
    this.box = params.box ? new BoundingBox(params.box) : new BoundingBox(new Vec2(0,0), this.width, this.height)
    this.coords = params.coords ? new BoundingBox(params.coords) : new BoundingBox(new Vec2(-5, 5), 10, 10)

    this.preserveAspectRatio = true
    this.aspectRatio = 1 // Preserve the ratio coords.width / box.width

    this.allowDragging = true
    this.allowScrolling = true

    this.mouseDown = false
    this.mouseAt = null
  }

  centerOn(v, ...args) {
    if (v instanceof Vec2) {
      this.coords.cx = v.x
      this.coords.cy = v.y
    } else {
      this.centerOn(new Vec2(v, ...args))
    }
  }

  zoomOn(factor, v) {
    let pixel = this.plotToPixel(v)

    this.width *= factor
    this.height *= factor

    this.coincidePoints(this.pixelToPlot(pixel), v)
  }

  coincidePoints(v_old, v_new) {
    this.translate(v_old.subtract(v_new))
  }


  pixelToPlotX(x) {
    return boundingBoxTransform.X(x, this.box, this.coords)
  }

  pixelToPlotY(y) {
    return boundingBoxTransform.Y(y, this.box, this.coords, true)
  }

  pixelToPlot(xy) {
    return new Vec2(boundingBoxTransform.XY(utils.flattenVectors([xy]), this.box, this.coords, false, true))
  }

  plotToPixelX(x) {
    return boundingBoxTransform.X(x, this.coords, this.box)
  }

  plotToPixelY(y) {
    return boundingBoxTransform.Y(y, this.coords, this.box, true)
  }

  plotToPixel(xy) {
    return new Vec2(boundingBoxTransform.XY(utils.flattenVectors([xy]), this.coords, this.box, false, true))
  }
}

export {Plot2DTransform}
