import * as utils from '../utils'
import { Color } from '../other/color'
import { Vec2 } from '../math/vec2'
import { Label2DStyle } from './label_style'

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
  utils.assert(utils.isInteger(integer), "needs to be an integer");

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

// Multiplication character
const CDOT = String.fromCharCode(183);

const defaultLabel = x => {
    if (x === 0) return "0"; // special case
    else if (Math.abs(x) < 1e5 && Math.abs(x) > 1e-5)
      // non-extreme floats displayed normally
      return beautifyFloat(x);
    else {
      // scientific notation for the very fat and very small!

      let exponent = Math.floor(Math.log10(Math.abs(x)));
      let mantissa = x / (10 ** exponent);

      let prefix = (utils.isApproxEqual(mantissa,1) ? '' :
        (beautifyFloat(mantissa, 8) + CDOT));
      let exponent_suffix = "10" + exponentify(exponent);

      return prefix + exponent_suffix;
    }
  }


/** Class representing a style of tickmark, with a certain thickness, color position, and possibly with text */
class AxisTickmarkStyle {
  /**
   * Create an AxisTickmarkStyle.
   * @param {Object} params - The parameters of the tickmark style.
   * @param {number} params.length - The length of the tickmark, measured perpendicular to the axis.
   * @param {number} params.positioning - The position of the tickmark relative to the axis. A value of 1 indicates it is entirely to the left of the axis, and a value of -1 indicates it is entirely to the right of the axis. The values in between give linear interpolations between these two positions.
   * @param {number} params.thickness - The thickness of the tickmark.
   * @param {Color} params.color - The color of the tickmark.
   * @param {Boolean} params.displayText - Whether to display text.
   */
  constructor ({
    length = 10,
    positioning = 0,
    thickness = 2,
    color = new Color(),
    displayLabels = false,
    displayTicks = true,
    labelAnchoredTo = 1, // 1 is right of tickmark, 0 is middle of tickmark, -1 is left of tickmark
    labelPadding = 2,
    labelStyle = new Label2DStyle(),
    labelFunc = defaultLabel
  } = {}) {
    this.length = length
    this.positioning = positioning
    this.thickness = thickness
    this.color = color
    this.displayLabels = displayLabels
    this.displayTicks = displayTicks
    this.labelAnchoredTo = labelAnchoredTo
    this.labelPadding = labelPadding
    this.labelStyle = labelStyle
    this.labelFunc = labelFunc
  }

  /**
   * Add a set of tickmarks with given positions and a certain linear transformation to a Simple2DGeometry for later rendering.
   * Reference theory/class_theory/axis_tickmark_style.jpg for explanation.
   * @param {Object} transformation - A transformation from axis coordinates (x1-x2) to canvas coordinates (v1-v2)
   * @param {number} transformation.x1 - The first axis coordinate, corresponding to the point v1.
   * @param {number} transformation.x2 - The second axis coordinate, corresponding to the point v2.
   * @param {Vec2} transformation.v1 - The first canvas point, corresponding to the axis coordinate x1.
   * @param {Vec2} transformation.v2 - The second canvas point, corresponding to the axis coordinate x2.
   * @param {Array} positions - An array of numbers or objects containing a .value property which are the locations, in axis coordinates, of where the tickmarks should be generated.
   * @param {Simple2DGeometry} geometry - A Simple2DGeometry to which the tickmarks should be emitted.
   */
  createTickmarks (transformation, positions, polyline, label2dset) {
    polyline.vertices = []
    polyline.style.thickness = this.thickness
    polyline.style.color = this.color
    polyline.endcapType = "butt"

    const tickmarkCount = positions.length

    // Note that "s" in class theory is positioning, and "t" is thickness
    const { positioning, thickness, length } = this
    const { v1, v2, x1, x2 } = transformation
    const axisDisplacement = v2.subtract(v1)

    // vectors as defined in class_theory
    const upsilon = axisDisplacement.unit().rotate(Math.PI / 2)

    label2dset.texts = []
    label2dset.style = this.labelStyle

    for (let i = 0; i < positions.length; ++i) {
      let givenPos = positions[i]
      if (givenPos.value) { givenPos = givenPos.value }

      const pos = axisDisplacement.scale((givenPos - x1) / (x2 - x1)).add(v1)
      const lambda = upsilon.scale((positioning + 1) / 2 * length).add(pos)
      const omicron = upsilon.scale((positioning - 1) / 2 * length).add(pos)

      // Create a rectangle for the tick
      polyline.vertices.push(...omicron.asArray(), ...lambda.asArray(), NaN, NaN)

      if (this.displayLabels) {
        const textS = this.labelAnchoredTo
        const position = lambda.scale((textS + 1) / 2).add(omicron.scale((1 - textS) / 2)).add(upsilon.scale(this.labelPadding))

        label2dset.texts.push({text: this.labelFunc(givenPos), pos: position})
      }
    }
  }
}

export { AxisTickmarkStyle }
