import {InteractiveCanvas} from './interactive_canvas'
import { Plot2DTransform } from "../math/plot2d_transform.js"
import { BoundingBox } from "../math/bounding_box"
import { Vec2 } from "../math/vec.js"
import { DefaultUniverse } from "./grapheme_universe"
import { SmartLabelManager } from '../other/smart_label_manager'

/**
 * @class Plot2D
 * A generic plot in two dimensions, including a transform from plot coordinates to pixel coordinates.
 * Padding of the plot is determined by padding.top, padding.left, etc.. Interactivity like scrolling and dragging are
 * enabled via enableDrag and enableScroll
 */
class Plot2D extends InteractiveCanvas {
  constructor (universe=DefaultUniverse) {
    super(universe)

    // This is the plot of itself. Meta!
    this.plot = this

    // The amount of padding on all sides of the plot, which determines the plotting box along with the canvas's size
    this.padding = {top: 40, right: 40, left: 40, bottom: 40}

    // The transformation from plot coordinates to pixels
    this.transform = new Plot2DTransform({plot: this})

    // Whether to allow movement by dragging and scrolling TODO
    this.enableDrag = true
    this.enableScroll = true

    this.extraInfo.smartLabelManager = new SmartLabelManager(this)

    this.addEventListener("mousedown", evt => this.mouseDown(evt))
    this.addEventListener("mouseup", evt => this.mouseUp(evt))
    this.addEventListener("mousemove", evt => this.mouseMove(evt))
    this.addEventListener("wheel", evt => this.wheel(evt))
    this.addEventListener("resize", evt => {
      this.update()
      this.transform.correctAspectRatio()
    })

    let timeout = 0

    this.addEventListener("plotcoordschanged", evt => {
      clearTimeout(timeout)

      timeout = setTimeout(() => {
        this.triggerEvent("plotcoordslingered")
      }, 500)
    })

    this.keyboard.addEventListener("keydown- ", () => {
      this.triggerChildEventsLast = true
    })

    this.keyboard.addEventListener("keyup- ", () => {
      this.triggerChildEventsLast = false
    })

    this.update()
  }

  mouseDown(evt) {
    this.mouseDownAt = this.transform.pixelToPlot(evt.pos)
    return true
  }

  mouseUp(evt) {
    this.mouseDownAt = null
    return true
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

    return true
  }

  render() {
    super.render()
  }

  beforeRender(info) {
    this.extraInfo.smartLabelManager.reset()
  }

  afterRender(info) {
    this.extraInfo.smartLabelManager.renderLabels(info)
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
