import { Element as GraphemeElement } from "../core/grapheme_element.js"
import { PolylineElement } from "./polyline.js"
import {GridlineStrategizers} from '../other/gridline_strategizer'
import { Pen } from '../styles/pen'
import {Label2D} from './label'
import {Label2DStyle} from '../styles/label_style'
import * as utils from "../core/utils"
import { Vec2 } from "../math/vec"

// I'm just gonna hardcode gridlines for now. Eventually it will have a variety of styling options
class Gridlines extends GraphemeElement {
  constructor(params={}) {
    super(params)

    this.strategizer = GridlineStrategizers.Standard
    this.label_function = (val) => {
      return `${val}`
    }

    this.label_style = new Label2DStyle()

    this.label_padding = 3

    this.label_positions = ["top", "left", "bottom", "right"]
    this.label_types = ["axis", "major"]

    this._labels = []

    this.pens = {
      "axis": new Pen({thickness: 3}),
      "major": new Pen({thickness: 1}),
      "minor": new Pen({thickness: 0.5}),
      "box": new Pen({thickness: 2})
    }

    this._polylines = {}
  }


  update() {
    let transform = this.plot.transform
    let plotCoords = transform.coords
    let plotBox = transform.box

    this._labels = []

    const markers = this.strategizer(plotCoords.x1, plotCoords.x2, plotBox.width, plotCoords.y1, plotCoords.y2, plotBox.height)

    let polylines = this._polylines = {}
    let computed_label_styles = this.computed_label_styles = {}

    let label_padding = this.label_padding

    for (let marker of markers) {
      if (marker.dir === 'x') {
        let polyline = polylines[marker.type]

        if (!polyline) {
          polyline = polylines[marker.type] = new PolylineElement({ pen: this.pens[marker.type] })
        }

        let x_coord = utils.roundToCanvasPixel(transform.plotToPixelX(marker.pos))
        let sy = plotBox.y1, ey = plotBox.y2

        polyline.vertices.push(x_coord, sy, x_coord, ey, NaN, NaN)

        if (this.label_types.includes(marker.type)) {
          if (this.label_positions.includes("top")) {
            let style = computed_label_styles["top"]
            if (!style) {
              style = computed_label_styles["top"] = new Label2DStyle(this.label_style)

              style.dir = "N"
            }

            let label = new Label2D({style, text: this.label_function(marker.pos), position: new Vec2(x_coord, sy - label_padding)})

            this._labels.push(label)
          }

          if (this.label_positions.includes("bottom")) {
            let style = computed_label_styles["bottom"]
            if (!style) {
              style = computed_label_styles["bottom"] = new Label2DStyle(this.label_style)

              style.dir = "S"
            }

            let label = new Label2D({style, text: this.label_function(marker.pos), position: new Vec2(x_coord, ey + label_padding)})

            this._labels.push(label)
          }
        }
      } else if (marker.dir === 'y') {
        let polyline = polylines[marker.type]

        if (!polyline) {
          polyline = polylines[marker.type] = new PolylineElement({pen: this.pens[marker.type]})
        }

        let y_coord = utils.roundToCanvasPixel(transform.plotToPixelY(marker.pos))
        let sx = plotBox.x1, ex = plotBox.x2

        polyline.vertices.push(sx, y_coord, ex, y_coord, NaN, NaN)

        if (this.label_types.includes(marker.type)) {
          if (this.label_positions.includes("left")) {
            let style = computed_label_styles["left"]
            if (!style) {
              style = computed_label_styles["left"] = new Label2DStyle(this.label_style)

              style.dir = "W"
            }

            let label = new Label2D({style, text: this.label_function(marker.pos), position: new Vec2(ex + label_padding, y_coord)})

            this._labels.push(label)
          }

          if (this.label_positions.includes("right")) {
            let style = computed_label_styles["right"]
            if (!style) {
              style = computed_label_styles["right"] = new Label2DStyle(this.label_style)

              style.dir = "E"
            }

            let label = new Label2D({style, text: this.label_function(marker.pos), position: new Vec2(sx - label_padding, y_coord)})

            this._labels.push(label)
          }
        }
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

    for (let label of this._labels) {
      label.render(info)
    }
  }
}

// Gridlines,

export {Gridlines}
