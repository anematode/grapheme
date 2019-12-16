import { Axis } from './axis'
import { StandardDemarcationStrategizer } from '../other/demarcation_strategizer'
import { TickmarkStyle } from '../styles/tickmark_style'
import { Label2DStyle } from '../styles/label_style'

class AutoAxis extends Axis {
  constructor (params = {}) {
    super(Object.assign({
      tickmarkStyles: {
        main: new TickmarkStyle({ displayLabels: true, labelStyle: new Label2DStyle({ fontSize: 24, dir: 'S' }) }),
        sub: new TickmarkStyle({ length: 5 }),
        zero: new TickmarkStyle({ displayTicks: false, displayLabels: true, labelStyle: new Label2DStyle({ fontSize: 24, dir: 'S' }) })
      }
    }, params))

    const { strategizer = new StandardDemarcationStrategizer() } = params

    this.strategizer = strategizer
  }

  autoTickmarks () {
    const strategizer = this.strategizer

    strategizer.start = this.xStart
    strategizer.end = this.xEnd
    strategizer.length = this.start.subtract(this.end).length()

    this.tickmarkPositions = strategizer.getDemarcations()
  }

  update () {
    this.autoTickmarks()

    super.update()
  }
}

export { AutoAxis }
