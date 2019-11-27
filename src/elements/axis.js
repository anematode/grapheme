import { Element as GraphemeElement } from '../grapheme_element'
import { Vec2, S } from './math'
import { Color } from '../color'
import { ARROW_TYPES, arrowLengths, ARROW_LOCATION_TYPES }
import * as utils from "../utils"

function defaultLabel(x) {
  return x.toFixed(5);
}

class AxisTickmarkStyle {
  constructor(params={}) {
    // Length, in canvas pixels, of each tickmark
    this.length = utils.select(params.length, 6);

    // 1 -> entirely to the left of the axis; 0 -> centered on the axis; -1
    // -> entirely to the right of the axis, and everything in between!
    this.positioning = utils.select(params.positioning, 0);

    // Thickness of the tickmarks in canvas pixels
    this.thickness = utils.select(params.thickness, 2);

    // Color of the tickmark
    this.color = new Color(0,0,0,255);

    // The following are TEXT PROPERTIES
    // Whether or not to display text on the tickmarks
    this.displayText = utils.select(params.displayText, false);

    // direction to offset text in (rounded to nearest cardinal direction)
    this.textOffset = utils.select(params.textOffset, S);

    // degrees, not radians!
    this.textRotation = utils.select(params.textRotation, 0);

    // pixels of extra offset for readibility
    this.textPadding = utils.select(params.textPadding, 2);

    // The font to use for labeling
    this.font = utils.select(params.font, "12px Helvetica")

    // Pixels of text shadow to make it look nicer
    this.shadowSize = utils.select(params.shadowSize, 3);

    // Color of the text
    this.textColor = utils.select(params.textColor, new Color(0,0,0,255));

    // Text function
    this.textFunc = utils.select(params.textFunc, defaultLabel);
  }

  isValid() {
    return (this.length > 0 && (-1 <= this.positioning && this.positioning <= 1) &&
      (this.thickness > 0));
  }
}

/**
A displayed axis, potentially with tick marks of various types,
potentially with labels, and potentially with an arrow. The position of the axis
(and the transformation it entails) is determined by six variables: start, end,
marginStart, marginEnd, xStart and xEnd. start is a Vec2, in canvas pixels, of
the start of the axis; the same is true for end. marginStart is a number of canvas
pixels which represents an "unused" portion of the axis at the beginning of the axis;
it can be 0. marginEnd is the same for the end of the axis; if there is an arrow at
the end of the axis, it will automatically be set to 1.5 * the length of the arrowhead.
xStart is the REPRESENTED coordinate at marginStart in from start. xEnd is the
REPRESENTED coordinate at marginEnd in from end.

Tickmarks must be divided into certain style classes, though the number of such
classes is unlimited. The style of each tickmark is defined by the AxisTickmarkStyle
class, which abstracts their relative position to the axis, thickness, etc. This
style also deals with labels, and Axis doesn't have to think about labels too hard.
These style classes are given as key value pairs in a "tickmarkStyles" object,
where the keys are the named of the style classes (ex: "big" to be used for integers,
"small" to be used for nonintegers). The positions of the tickmarks themselves are
given in the tickmarkPositions object, which is another set of key value pairs.
The keys are the style classes and the values are arrays of tickmark positions. To
support things like arbitrary-precision arithmetic in the future, these positions
may either be NUMBERS, which will be simply transformed using the Axis's defined
linear transformation to pixel space, or OBJECTS with a "value" property. The reason
we may want OBJECTS is for labeling reasons. For example, suppose we want to label
a bunch of rational numbers in (0,1). Then we could define a labelFunction which
takes in a number and outputs a string form of a rational number close to that number,
but that's annoying. Instead, we give the positions of the tickmarks as objects of
the form {num: p, den: q, value: p/q}, so that Axis transforms them according to their
numerical value while the labelFunction still has information on the numerator and
denominator.
*/
class Axis extends GraphemeElement {
  constructor (params = {}) {
    super(params)

    // Starting point of the axis, including the extra margins
    this.start = utils.select(params.start, new Vec2(0, 0))

    // Ending point of the axis, including the extra margins
    this.end = utils.select(params.end, new Vec2(100, 0))

    // Length, in canvas pixels, of the starting margin
    this.marginStart = utils.select(params.marginStart, 0);

    // Length, in canvas pixels, of the ending margin
    this.marginEnd = utils.select(params.marginEnd, 0);

    // Axis value represented near start
    this.xStart = utils.select(params.xStart, 0);

    // Axis value represented near end
    this.xEnd = utils.select(params.xEnd, 1);

    // Location of optional arrowheads at the ends of the axis
    this.arrowLocations = utils.select(params.arrowLocations, ARROW_LOCATION_TYPES.NONE);

    // Type of arrows at the ends of the axis
    this.arrowType = utils.select(params.arrowType, ARROW_TYPES.STANDARD);

    // Thickness of the axis line
    this.thickness = utils.select(params.thickness, 4)

    // Color of the axis (but not necessarily the tickmarks)
    this.color = utils.select(params.color, new Color(0, 0, 0, 255))

    // Tickmark styles, as described above
    this.tickmarkStyles = utils.select(params.tickmarkStyles, {})

    // Tickmark positions, as described above
    this.tickmarkPositions = utils.select(params.tickmarkPositions, {})

    // Used internally, no need for the user to touch it. Unless there's a bug.
    // Then I have to touch it. Ugh.
    this.internal = {
      tickmarkGeometries: {},
      axisGeometry: null

    }

  }

  // Set all colors, including the tickmark colors, to a given color
  setAllColorsTo(color) {
    utils.checkType(color, Color);
    this.color = color;

    this.tickmarkStyles.forEach(tickmarkStyle => tickmarkStyle.color = color);
  }

  updateGeometries () {
    let tickmarkGeometries = this.internal.tickmarkGeometries

    for (let styleName in this.tickmarkStyles) {
      const style = this.tickmarkStyles[styleName]
      const positions = this.tickmarkPositions[styleName]

      if (!positions) continue;

      let geometry = tickmarkGeometries[styleName];

      if (!geometry) {
        geometry = new PolylineElement()
        geometry.alwaysUpdate = false;
        tickmarkGeometries[styleName] = geometry;
      }

      geometry.vertices = []

      style.createTickmarks(this, positions, geometry)
    }

    for (let geometryName in this.tickmarkGeometries) {
      if (!this.tickmarkStyles[geometryName]) {
        // unused geometry, destroy it
        this.tickmarkGeometries[geometryName].destroy()
        delete this.tickmarkGeometries[geometryName]
      }
    }
  }

  destroy() {
    super.destroy()

    for (let geometryName in this.tickmarkGeometries) {
      this.tickmarkGeometries[geometryName].destroy()
      delete this.tickmarkGeometries[geometryName]
    }
  }

  render (renderInfo) {
    super.render(renderInfo)

    
  }
}

export { Axis }
