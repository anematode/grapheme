import { Element as GraphemeElement } from "../core/grapheme_element.js"
import { PolylineElement } from "./polyline.js"
import {GridlineStrategizers} from '../other/gridline_strategizer'
import { Pen } from '../styles/pen'
import {Label2D} from './label'
import {Label2DStyle} from '../styles/label_style'
import * as utils from "../core/utils"

class GridlinesLabelStyle {
  constructor(params={}) {
    const {
      visible = true,
      locations = ["left"],
      axis = false,
      dir = 'x',
      label_style = new Label2DStyle()
    } = params

    this.visible = visible
    this.locations = locations
    this.axis = axis
    this.dir = dir
    this.label_style = (label_style instanceof Label2DStyle) ? label_style : new Label2DStyle(label_style)

    this.computed_label_styles = {}
  }

  computeLabelStyles(plotTransform) {
    for (let location of this.locations) {
      let style = new Label2DStyle(this.label_style)


    }
  }
}


// I'm just gonna hardcode gridlines for now. Eventually it will have a variety of styling options
class Gridlines extends GraphemeElement {
  constructor(params={}) {
    super(params)

    this.strategizer = GridlineStrategizers.Standard
    this.label_function = (val) => {
      return `$${val}$`
    }

    this.label_styles = {
      "x" : {
        "axis": new GridlinesLabelStyle({axis: true, dir: 'x'}),
        "major": new GridlinesLabelStyle({dir: 'x'}),
        "minor": new GridlinesLabelStyle({dir: 'x', visible: false})
      },
      "y" : {
        "axis": new GridlinesLabelStyle({dir: 'y', axis: true}),
        "major": new GridlinesLabelStyle({dir: 'y'}),
        "minor": new GridlinesLabelStyle({dir: 'y', visible: false})
      }
    }

    this.pens = {
      "axis": new Pen({thickness: 3}),
      "major": new Pen({thickness: 1}),
      "minor": new Pen({thickness: 0.5}),
      "box": new Pen({thickness: 2})
    }

    this._polylines = {}
    this._labels = {}
  }


  update() {
    let transform = this.plot.transform
    let plotCoords = transform.coords
    let plotBox = transform.box

    const markers = this.strategizer(plotCoords.x1, plotCoords.x2, plotBox.width, plotCoords.y1, plotCoords.y2, plotBox.height)

    let polylines = this._polylines = {}

    for (let marker of markers) {
      if (marker.dir === 'x') {
        let polyline = polylines[marker.type]

        if (!polyline) {
          polyline = polylines[marker.type] = new PolylineElement({ pen: this.pens[marker.type] })
        }

        let x_coord = utils.roundToCanvasPixel(transform.plotToPixelX(marker.pos))
        let sy = plotBox.y1, ey = plotBox.y2

        polyline.vertices.push(x_coord, sy, x_coord, ey, NaN, NaN)
      } else if (marker.dir === 'y') {
        let polyline = polylines[marker.type]

        if (!polyline) {
          polyline = polylines[marker.type] = new PolylineElement({pen: this.pens[marker.type]})
        }

        let y_coord = utils.roundToCanvasPixel(transform.plotToPixelY(marker.pos))
        let sx = plotBox.x1, ex = plotBox.x2

        polyline.vertices.push(sx, y_coord, ex, y_coord, NaN, NaN)
      }
    }

    if (this.pens["box"]) {
      polylines["box"] = new PolylineElement({vertices: plotBox.getBoxVertices(), pen: this.pens["box"]})
    }
  }

  render(info) {
    super.render(info)

    for (let key in this._polylines) {
      if (this._polylines.hasOwnProperty(key)) {

        this._polylines[key].render(info)
      }
    }
  }
}

// Gridlines,

export {Gridlines}
