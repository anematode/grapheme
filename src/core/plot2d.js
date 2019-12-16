import {Group as GraphemeGroup} from "./grapheme_group"
import {PlotAxisX, PlotAxisY} from "../elements/plot_axes"
import {Vec2} from "../math/vec2"

class Plot2D extends GraphemeGroup {
  constructor(params={}) {
    super(params)

    this.box = {x: 0, y: 0, width: 640, height: 320}

    this.margins = {top: 50, left: 50, bottom: 50, right: 50, automatic: false}

    this.plotBox = {x: 0, y: 0, width: 640, height: 320}

    this.fullscreen = false

    this.preserveAspectRatio = true
    this.aspectRatio = 1
  }

  setPosition(x, y) {
    this.box.x = x
    this.box.y = y
  }

  setSize(width, height) {
    this.box.width = width
    this.box.height = height
  }

  containsX(x) {
    return this.innerBBox.containsX(x)
  }

  containsY(y) {
    return this.innerBBox.containsY(y)
  }

  transformX(x) {
    return (this.innerBBox.width * (x - this.limits.x) + this.innerBBox.x)
  }

  transformY(y) {
    return (this.innerBBox.height * (this.limits.y - y) + this.innerBBox.y)
  }

  updateLimits() {

  }

  updateInnerBBox() {
    this.innerBBox = this.bbox.marginIn(this.margins)
  }

  update() {
    this.updateInnerBBox()
  }

  expandIfFullscreen(renderInfo) {
    if (this.fullscreen) {
      this.bbox.x = 0
      this.bbox.y = 0

      this.bbox.width = renderInfo.dims.width
      this.bbox.height = renderInfo.dims.height
    }
  }
}

export {Plot2D}
