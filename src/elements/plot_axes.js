import {PlotElement} from "./plot_element"
import {AutoAxis} from "./auto_axis"

class PlotAxis extends PlotElement {
  constructor(params={}) {
    super(params)
  }
}

class PlotAxisY extends PlotAxis {
  constructor(params={}) {
    super(params)

    this.dir = 'y'

    this.axisL = new AutoAxis() // axis drawn on the left side
    this.axisC = new AutoAxis() // axis drawn in the middle, if needed
    this.axisR = new AutoAxis() // axis drawn on the right side, if needed

    this.axisL.applyToTickmarkStyles(style => {
      style.positioning = -1
      style.labelAnchoredTo = -1
      style.labelStyle.dir = "E"
    })

    this.axisR.applyToTickmarkStyles(style => {
      style.positioning = 1
      style.labelAnchoredTo = 1
      style.labelStyle.dir = "W"
    })

    this.axisC.applyToTickmarkStyles(style => {
      style.positioning = 0
      style.labelAnchoredTo = -1
      style.labelStyle.dir = "W"
    })

    // possible values: "sides" or "location". sides means the axes on the left and
    // right are drawn. "location" means that axisL is used when axisLocation is off
    // the screen to the left, axisC is used when it is in range, and axisR is used
    // when it is off to the right.
    this.mode = "sides"
    this.axisLocation = 0

    this.add(this.axisL)
    this.add(this.axisC)
    this.add(this.axisR)
  }

  update () {
    const {axisL, axisC, axisR, mode, axisLocation, plot} = this

    axisL.start.set(plot.innerBBox.x, plot.innerBBox.y2) // bottom left corner
    axisL.end.set(plot.innerBBox.x, plot.innerBBox.y) // top left corner
    axisR.start.set(plot.innerBBox.x2, plot.innerBBox.y2) // bottom right corner
    axisR.end.set(plot.innerBBox.x2, plot.innerBBox.y)

    ;[axisL, axisC, axisR].map(axis => {
      axis.xStart = plot.limits.y1
      axis.xEnd = plot.limits.y2
    })

    if (this.mode === "sides") {
      axisL.visible = true
      axisC.visible = false
      axisR.visible = true

    } else if (this.mode === "location") {
      let axisXCoord = plot.transformX(this.axisLocation)

      axisL.visible = false
      axisC.visible = false
      axisR.visible = false

      if (plot.containsX(axisXCoord)) {
        axisC.visible = true

        axisC.start.set(axisXCoord, plot.innerBBox.y2)
        axisC.end.set(axisXCoord, plot.innerBBox.y)
      } else if (plot.innerBBox.x < axisXCoord) {
        // axis is to the right
        axisR.visible = true
      } else {
        axisL.visible = true
      }
    }
  }
}

class PlotAxisX extends PlotAxis {
  constructor(params={}) {
    super(params)
  }
}

export {PlotAxis, PlotAxisX, PlotAxisY}
