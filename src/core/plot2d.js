import { Plot2DElement } from './plot2d_element'

class Plot2D extends Plot2DElement {
  constructor (params = {}) {
    super(params)

    this.setPlot(this)

    this.box = { x: 0, y: 0, width: 640, height: 480 }
    this.plotCoords = { cx: 0, cy: 0, width: 5, height: 5 }
    this.plottingBox = {}

    this.preserveAspectRatio = false
    this.aspectRatio = 1

    this.plottingBoxPath = null
    this.fullscreen = true

    this.updatePlotTransform()
  }

  resizeIfFullscreen () {
    if (this.fullscreen && this.window) {
      this.box.x = 0
      this.box.y = 0

      this.box.width = this.window.width
      this.box.height = this.window.height
    }
  }

  updatePlotTransform () {
    this.resizeIfFullscreen()

    this.calculatePlottingBox()
    this.updatePlotCoords()
  }

  updatePlotCoords () {
    const pc = this.plotCoords
    const pb = this.plottingBox

    if (this.preserveAspectRatio) {
      const as = this.aspectRatio

      pc.height = pc.width / pb.width * as * pb.height
    }

    pc.x1 = pc.cx - pc.width / 2
    pc.x2 = pc.cx + pc.width / 2
    pc.y1 = pc.cy - pc.height / 2
    pc.y2 = pc.cy + pc.height / 2
  }

  plotToPixelX (x) {
    return (x - this.plotCoords.x1) * (this.plottingBox.width) / (this.plotCoords.width) + this.plottingBox.x1
  }

  plotToPixelY (y) {
    return (y - this.plotCoords.y1) * (this.plottingBox.height) / (this.plotCoords.height) + this.plottingBox.y1
  }

  plotToPixel (x, y) {
    return [this.plotToPixelX(x), this.plotToPixelY(y)]
  }

  calculatePlottingBox () {
    this.plottingBox.x1 = this.box.x + this.margins.left
    this.plottingBox.y1 = this.box.y + this.margins.top

    const width = this.box.width - this.margins.left - this.margins.right
    const height = this.box.height - this.margins.top - this.margins.bottom

    if (width < 50 || height < 50) {
      throw new Error('Plotting box is too small')
    }

    this.plottingBox.width = width
    this.plottingBox.height = height

    this.plottingBox.x2 = this.plottingBox.x1 + width
    this.plottingBox.y2 = this.plottingBox.y1 + height

    const pb = this.plottingBox
    const plottingMaskPath = new Path2D()

    plottingMaskPath.moveTo(pb.x1, pb.y1)
    plottingMaskPath.lineTo(pb.x2, pb.y1)
    plottingMaskPath.lineTo(pb.x2, pb.y2)
    plottingMaskPath.lineTo(pb.x1, pb.y2)
    plottingMaskPath.closePath()

    this.plottingBoxPath = plottingMaskPath
  }

  update () {
    this.updatePlotTransform()
  }

  add (element, ...elements) {
    if (element instanceof Plot2D) {
      throw new Error("Can't have plot2d in plot2d")
    }

    super.add(element, ...elements)
  }
}

export { Plot2D }
