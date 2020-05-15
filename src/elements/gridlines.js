import { Element as GraphemeElement } from "../core/grapheme_element.js"
import { PolylineElement } from "./polyline.js"
import {DemarcationStrategizers} from '../other/demarcation_strategizer'
import { Pen } from '../styles/pen'
import { BasicLabelStyle } from '../styles/label_style'

// I'm just gonna hardcode gridlines for now. Eventually it will have a variety of styling options
class Gridlines extends GraphemeElement {
  constructor(params={}) {
    super(params)

    this.x_strategizer = DemarcationStrategizers.Standard
    this.y_strategizer = DemarcationStrategizers.Standard

    this.polylines = {ticks: {'x': {}, 'y': {}}, lines: {'x': {}, 'y': {}}}
  }


  update() {
    for (let key in this.polylines) {
      for (let key2 in this.polylines[key]) {
        for (let key3 in this.polylines[key][key2]) {
          this.polylines[key][key2][key3].vertices = []
        }
      }
    }

    let plot = this.plot
    let plotCoords = plot.plotCoords
    let plotBox = plot.plotBox

    const x_markers = this.x_strategizer(plotCoords.x1, plotCoords.x2, plotBox.width)
    const y_markers = this.y_strategizer(plotCoords.y1, plotCoords.y2, plotBox.height)

    while (!x_markers.done) {
      let next = x_markers.next()
    }
  }

  render(renderInfo) {

  }
}

// Gridlines,

export {Gridlines}
