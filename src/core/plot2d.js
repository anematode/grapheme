import {InteractiveCanvas} from './interactive_canvas'
import { Plot2DTransform } from "../math/plot2d_transform.js"
import { BoundingBox } from "../math/bounding_box"
import { Vec2 } from "../math/vec.js"
import { DefaultUniverse } from "./grapheme_universe"

/**
 * @class Plot2D
 * A generic plot in two dimensions, including a transform from plot coordinates to pixel coordinates.
 * Padding of the plot is determined by padding.top, padding.left, etc.. Interactivity like scrolling and dragging are
 * enabled via enableDrag and enableScroll
 */
class Plot2D extends InteractiveCanvas {
  constructor (universe=DefaultUniverse) {
    super(universe)

    this.plot = this

    this.transform = new Plot2DTransform({plot: this})
    this.padding = {top: 40, right: 40, left: 40, bottom: 40}

    this.enableDrag = true
    this.enableScroll = true

    this.addEventListener("mousedown", evt => this.mouseDown(evt))
    this.addEventListener("mouseup", evt => this.mouseUp(evt))
    this.addEventListener("mousemove", evt => this.mouseMove(evt))
    this.addEventListener("wheel", evt => this.wheel(evt))
    this.addEventListener("resize", evt => {
      this.update()
      this.transform.correctAspectRatio()
    })

    this.update()
  }

  mouseDown(evt) {
    this.mouseDownAt = this.transform.pixelToPlot(evt.pos)
  }

  mouseUp(evt) {
    this.mouseDownAt = null
  }

  mouseMove(evt) {
    if (this.mouseDownAt) {
      this.transform._coincideDragPoints(this.mouseDownAt, evt.pos)

      return true
    }
  }

  wheel(evt) {
    let scrollY = evt.rawEvent.deltaY

    this.transform.zoomOn(Math.exp(scrollY / 1000), this.transform.pixelToPlot(evt.pos))
  }

  render() {
    super.render()
  }

  update () {
    this.calculateTransform()
  }

  getCanvasBox() {
    return new BoundingBox(new Vec2(0,0), this.width, this.height)
  }

  calculateTransform () {
    this.transform.box = this.getCanvasBox().pad(this.padding)
  }
}

export { Plot2D }
