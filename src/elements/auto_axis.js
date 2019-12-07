import {Axis} from "./axis"
import {StandardDemarcationStrategizer} from "../other/demarcation_strategizer"
import {AxisTickmarkStyle} from "./axis_tickmarks"
import {Label2DStyle} from "./label_style"

class AutoAxis extends Axis {
  constructor(params={}) {
    super(Object.assign({tickmarkStyles: {
        "main": new AxisTickmarkStyle({displayLabels: true, labelStyle: new Label2DStyle({fontSize: 24, dir: "S"})}),
        "sub": new AxisTickmarkStyle({length: 5}),
        "zero": new AxisTickmarkStyle({displayTicks: false, displayLabels: true, labelStyle: new Label2DStyle({fontSize: 24, dir: "S"})})
      }
    }, params))

    const { strategizer = new StandardDemarcationStrategizer() } = params

    this.strategizer = strategizer
  }

  autoTickmarks() {
    let strategizer = this.strategizer

    strategizer.start = this.xStart
    strategizer.end = this.xEnd
    strategizer.length = this.start.subtract(this.end).length()

    this.tickmarkPositions = strategizer.getDemarcations()
  }

  updateGeometries() {
    this.autoTickmarks()

    super.updateGeometries()
  }
}

export {AutoAxis}
