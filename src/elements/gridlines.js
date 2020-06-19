import { Element as GraphemeElement } from "../core/grapheme_element.js"
import { PolylineElement } from "./polyline.js"
import {GridlineStrategizers} from '../other/gridline_strategizer'
import { Pen } from '../styles/pen'
import {Label2D} from './label'
import {Label2DStyle} from '../styles/label_style'
import * as utils from "../core/utils"
import { Vec2 } from "../math/vec"
import { Colors } from '../other/color'
import { SmartLabel } from './smart_label'
import { BoundingBox } from '../math/bounding_box'

/* Unicode characters for exponent signs, LOL */
const exponent_reference = {
  '-': String.fromCharCode(8315),
  '0': String.fromCharCode(8304),
  '1': String.fromCharCode(185),
  '2': String.fromCharCode(178),
  '3': String.fromCharCode(179),
  '4': String.fromCharCode(8308),
  '5': String.fromCharCode(8309),
  '6': String.fromCharCode(8310),
  '7': String.fromCharCode(8311),
  '8': String.fromCharCode(8312),
  '9': String.fromCharCode(8313)
};

/* Convert a digit into its exponent form */
function convert_char(c) {
  return exponent_reference[c];
}

/* Convert an integer into its exponent form (of Unicode characters) */
function exponentify(integer) {
  let stringi = integer + '';
  let out = '';

  for (let i = 0; i < stringi.length; ++i) {
    out += convert_char(stringi[i]);
  }

  return out;
}

// Credit: https://stackoverflow.com/a/20439411
/* Turns a float into a pretty float by removing dumb floating point things */
function beautifyFloat(f, prec=12) {
  let strf = f.toFixed(prec);
  if (strf.includes('.')) {
    return strf.replace(/\.?0+$/g,'');
  } else {
    return strf;
  }
}

function isApproxEqual(v, w, eps=1e-5) {
  return Math.abs(v - w) < eps;
}

const CDOT = String.fromCharCode(183);

const StandardLabelFunction = x => {
  if (x === 0) return "0"; // special case
  else if (Math.abs(x) < 1e5 && Math.abs(x) > 1e-5)
    // non-extreme floats displayed normally
    return beautifyFloat(x);
  else {
    // scientific notation for the very fat and very small!

    let exponent = Math.floor(Math.log10(Math.abs(x)));
    let mantissa = x / (10 ** exponent);

    let prefix = (isApproxEqual(mantissa, 1) ? '' :
      (beautifyFloat(mantissa, 8) + CDOT));
    let exponent_suffix = "10" + exponentify(exponent);

    return prefix + exponent_suffix;
  }
}

// I'm just gonna hardcode gridlines for now. Eventually it will have a variety of styling options
class Gridlines extends GraphemeElement {
  constructor(params={}) {
    super(params)

    this.strategizer = GridlineStrategizers.Standard
    this.label_function = StandardLabelFunction

    this.label_positions = ["dynamic"]
    this.label_types = ["axis", "major"]
    this.label_style = new Label2DStyle({fontSize: 14, shadowSize: 3, shadowColor: Colors.WHITE})
    this.label_padding = 5

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

    const addLabel = (marker_pos, style, position) => {
      let label = new Label2D({style, text: this.label_function(marker_pos), position})

      this._labels.push(label)
    }

    const getLabelStyle = (name, construct) => {
      if (computed_label_styles[name]) {
        return computed_label_styles[name]
      } else {
        let label_style = computed_label_styles[name] = new Label2DStyle(this.label_style)

        construct(label_style)
        return label_style
      }
    }

    const dynamic = this.label_positions.includes("dynamic")

    for (let marker of markers) {
      if (marker.dir === 'x') {
        let polyline = polylines[marker.type]

        if (!polyline)
          polyline = polylines[marker.type] = new PolylineElement({ pen: this.pens[marker.type] })

        let x_coord = utils.roundToCanvasPixel(transform.plotToPixelX(marker.pos))
        let sy = plotBox.y1, ey = plotBox.y2

        polyline.vertices.push(x_coord, sy, x_coord, ey, NaN, NaN)

        if (this.label_types.includes(marker.type)) {
          let axisPosition = transform.plotToPixelY(0)
          let axisInRange = (transform.box.y1 <= axisPosition && axisPosition <= transform.box.y2)
          let axis = this.label_positions.includes("axis") || (dynamic && axisInRange)

          let top = this.label_positions.includes("top")
          let bottom = this.label_positions.includes("bottom")
          let top_in = this.label_positions.includes("top-in") || (dynamic && axisPosition < transform.box.y1)
          let bottom_in = this.label_positions.includes("bottom-in") || (dynamic && axisPosition > transform.box.y2)

          if (top) {
            let style = getLabelStyle("top", (style) => style.dir = "N")

            addLabel(marker.pos, style, new Vec2(x_coord, sy - label_padding))
          }

          if (bottom) {
            let style = getLabelStyle("bottom", (style) => style.dir = "S")

            addLabel(marker.pos, style, new Vec2(x_coord, ey + label_padding))
          }

          if (bottom_in) {
            let style_name = "bottom-" + marker.type

            let style = getLabelStyle(style_name, (style) => {
              style.dir = (marker.type === "axis") ? "NW" : "N"
            })

            addLabel(marker.pos, style, new Vec2(x_coord - ((marker.type === "axis") ? label_padding : 0), ey - label_padding))
          }

          if (top_in) {
            let style_name = "top-" + marker.type

            let style = getLabelStyle(style_name, (style) => {
              style.dir = (marker.type === "axis") ? "SW" : "S"
            })

            addLabel(marker.pos, style, new Vec2(x_coord - ((marker.type === "axis") ? label_padding : 0), sy + label_padding))
          }

          if (axis && axisInRange) {
            let style_name = "x-axis-" + marker.type

            let style = getLabelStyle(style_name, (style) => {
              style.dir = (marker.type === "axis") ? "SW" : "S"
            })

            addLabel(marker.pos, style, new Vec2(x_coord - ((marker.type === "axis") ? label_padding : 0), axisPosition + label_padding))
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
          let axisPosition = transform.plotToPixelX(0)
          let axisInRange = (transform.box.x1 <= axisPosition && axisPosition <= transform.box.x2)
          let axis = this.label_positions.includes("axis") || (dynamic && axisInRange)

          let left = this.label_positions.includes("left")
          let right = this.label_positions.includes("right")
          let left_in = this.label_positions.includes("left-in") || (dynamic && axisPosition < transform.box.x1)
          let right_in = this.label_positions.includes("right-in") || (dynamic && axisPosition > transform.box.x2)

          if (left) {
            let style = getLabelStyle("left", (style) => style.dir = "W")

            addLabel(marker.pos, style, new Vec2(sx - label_padding, y_coord))
          }

          if (right) {
            let style = getLabelStyle("right", (style) => style.dir = "W")

            addLabel(marker.pos, style, new Vec2(ex + label_padding, y_coord))
          }

          if (left_in) {
            let style_name = "left-" + marker.type

            let style = getLabelStyle(style_name, (style) => {
              style.dir = (marker.type === "axis") ? "SE" : "E"
            })

            addLabel(marker.pos, style, new Vec2(sx + label_padding, y_coord + ((marker.type === "axis") ? label_padding : 0)))
          }

          if (right_in) {
            let style_name = "right-" + marker.type

            let style = getLabelStyle(style_name, (style) => {
              style.dir = (marker.type === "axis") ? "SW" : "W"
            })

            addLabel(marker.pos, style, new Vec2(ex - label_padding, y_coord + ((marker.type === "axis") ? label_padding : 0)))
          }

          if (axis && axisInRange) {
            let style_name = "y-axis-" + marker.type

            let style = getLabelStyle(style_name, (style) => {
              style.dir = (marker.type === "axis") ? "SW" : "W"
            })

            addLabel(marker.pos, style, new Vec2(axisPosition - label_padding, y_coord + ((marker.type === "axis") ? label_padding : 0)))
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

export {Gridlines, StandardLabelFunction}
