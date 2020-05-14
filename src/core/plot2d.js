import {InteractiveCanvas} from './interactive_canvas'
import { BoundingBox, boundingBoxTransform } from "../math/bounding_box.js"
import { Vec2 } from "../math/vec.js"

class Plot2D extends InteractiveCanvas {
  constructor (context) {
    super(context)

    this.plot = this

    this.plotBox = new BoundingBox(new Vec2(0,0), this.width, this.height)
    this.plotCoords = new BoundingBox(new Vec2(-5, 5), 10, 10)

    this.padding = {top: 0, right: 0, left: 0, bottom: 0}

    this.update()
  }

  pixelToPlotX(x) {
    return boundingBoxTransform.X(x, this.plotBox, this.plotCoords)
  }

  pixelToPlotY(y) {
    return boundingBoxTransform.Y(y, this.plotBox, this.plotCoords)
  }

  pixelToPlot(xy) {
    return boundingBoxTransform.XY(xy, this.plotBox, this.plotCoords)
  }

  plotToPixelX(x) {
    return boundingBoxTransform.X(x, this.plotCoords, this.plotBox)
  }

  plotToPixelY(y) {
    return boundingBoxTransform.Y(y, this.plotCoords, this.plotBox)
  }

  plotToPixel(xy) {
    return boundingBoxTransform.XY(xy, this.plotCoords, this.plotBox)
  }

  render() {
    this.update()

    super.render()
  }

  update () {
    this.calculatePlotBox()
  }

  calculatePlotBox () {
    this.plotBox = new BoundingBox(new Vec2(0,0), this.width, this.height).pad(this.padding)
  }
}

export { Plot2D }
