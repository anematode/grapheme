import { BoundingBox, boundingBoxTransform } from './bounding_box'
import { Vec2 } from './vec'
import * as utils from "../core/utils"

class Plot2DTransform {
  constructor(params={}) {
    this.box = params.box ? new BoundingBox(params.box) : new BoundingBox(new Vec2(0,0), this.width, this.height)
    this.coords = params.coords ? new BoundingBox(params.coords) : new BoundingBox(new Vec2(-5, -5), 10, 10)

    this.plot = params.plot

    this.preserveAspectRatio = true
    this.aspectRatio = 1 // Preserve the ratio coords.width / box.width

    this.allowDragging = true
    this.allowScrolling = true

    this.mouseDown = false
    this.mouseAt = null

    this.correctAspectRatio()
  }

  getPixelToPlotTransform() {
    // Returns the transform {x_m, x_b, y_m, y_b}

    return boundingBoxTransform.getReducedTransform(this.box, this.coords, false, true)
  }

  getPlotToPixelTransform() {
    // Returns the inverse transform of this.getPixelToPlotTransform()

    return boundingBoxTransform.getReducedTransform(this.coords, this.box, false, true)
  }

  correctAspectRatio() {
    if (this.preserveAspectRatio) {
      let cx = this.coords.cx, cy = this.coords.cy

      this.coords.width = this.aspectRatio / this.box.height * this.box.width * this.coords.height

      this._centerOn(new Vec2(cx, cy))
    }

    if (this.plot)
      this.plot.triggerEvent("plotcoordschanged")
  }

  _centerOn(v) {
    this.coords.cx = v.x
    this.coords.cy = v.y
  }

  centerOn(v, ...args) {
    if (v instanceof Vec2) {
      this._centerOn(v)
    } else {
      this.centerOn(new Vec2(v, ...args))
    }

    this.correctAspectRatio()
    if (this.plot)
      this.plot.triggerEvent("plotcoordschanged")
  }

  translate(v, ...args) {
    if (v instanceof Vec2) {
      this.coords.top_left.add(v)

      if (this.plot)
        this.plot.triggerEvent("plotcoordschanged")
    } else {
      this.translate(new Vec2(v, ...args))
    }
  }

  zoomOn(factor, v = new Vec2(0,0), ...args) {
    if (this.allowScrolling) {
      let pixel_s = this.plotToPixel(v)

      this.coords.width *= factor
      this.coords.height *= factor

      this._internal_coincideDragPoints(v, pixel_s)
    }
  }

  _internal_coincideDragPoints(p1, p2) {
    this.translate(this.pixelToPlot(p2).subtract(p1).scale(-1))
  }

  _coincideDragPoints(p1, p2) {
    if (this.allowDragging) {
      this._internal_coincideDragPoints(p1, p2)
    }
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

  plotToPixelArr(arr) {
    let {x_m, x_b, y_m, y_b} = this.getPlotToPixelTransform()

    for (let i = 0; i < arr.length; i += 2) {
      arr[i] = x_m * arr[i] + x_b
      arr[i+1] = y_m * arr[i+1] + y_b
    }
  }

  pixelToPlotArr(arr) {
    let {x_m, x_b, y_m, y_b} = this.getPixelToPlotTransform()

    for (let i = 0; i < arr.length; i += 2) {
      arr[i] = x_m * arr[i] + x_b
      arr[i+1] = y_m * arr[i+1] + y_b
    }
  }

  clone() {
    let transform = new Plot2DTransform()
    transform.box = this.box.clone()
    transform.coords = this.coords.clone()
    return transform
  }
}

export {Plot2DTransform}
