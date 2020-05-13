import { Canvas as GraphemeCanvas } from './grapheme_canvas'
import { BoundingBox } from "../math/boundingbox.js"
import { Vec2 } from "../math/vec.js"

class Plot2D extends GraphemeCanvas {
  constructor (context) {
    super(context)

    this.plot = this

    this.plotBox = new BoundingBox(new Vec2(0,0), this.width, this.height)
    this.plotCoords = new BoundingBox(new Vec2(-5, 5), 10, 10)

    this.padding = {top: 0, right: 0, left: 0, bottom: 0}

    this.update()
  }

  pixelToPlotX(x) {
    if (Array.isArray(x) || )
  }

  pixelToPlotY() {

  }

  pixelToPlotArr() {

  }

  plotToPixelX() {

  }

  plotToPixelY() {

  }

  plotToPixelArr() {

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
