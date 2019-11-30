import { Element as GraphemeElement } from '../grapheme_element'
import { Group as GraphemeGroup } from "../grapheme_group"
import { Simple2DGeometry } from "./simple_geometry"
import { PolylineElement } from "./polyline"
import { Vec2, S } from '../math/vec2'
import { Color } from '../color'
import { ARROW_TYPES, arrowLengths, ARROW_LOCATION_TYPES } from "./arrows"
import * as utils from "../utils"
import {AxisTickmarkStyle} from "./axis_tickmarks"

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
class Axis extends GraphemeGroup {
  constructor (params = {}) {
    super(params)

    // Starting point of the axis, including the extra margins, in CSS coords
    this.start = utils.select(params.start, new Vec2(0, 0))

    // Ending point of the axis, including the extra margins, in CSS coords
    this.end = utils.select(params.end, new Vec2(100, 0))

    // Length, in CSS pixels, of the starting margin
    this.margins = {
      start: 0,
      end: 0,
      automatic: true
    }

    // Axis value represented near start
    this.xStart = utils.select(params.xStart, 0);

    // Axis value represented near end
    this.xEnd = utils.select(params.xEnd, 1);

    // Used internally, no need for the user to touch it. Unless there's a bug.
    // Then I have to touch it. Ugh.
    this.axisComponents = {
      tickmarkGeometries: {},
      axisGeometry: new PolylineElement(Object.assign({
        arrowLocations: -1,
        arrowType: 0,
        thickness: 3,
        color: new Color(0,0,0,255)
      }, params))
    }

    // Style of the main axis line
    this.style = this.axisComponents.axisGeometry.style;

    // Tickmark styles, as described above
    this.tickmarkStyles = utils.select(params.tickmarkStyles, {})

    // Tickmark positions, as described above
    this.tickmarkPositions = utils.select(params.tickmarkPositions, {})
  }

  // Set all colors, including the tickmark colors, to a given color
  setAllColorsTo(color) {
    utils.checkType(color, Color);
    this.color = color;

    this.tickmarkStyles.forEach(tickmarkStyle => tickmarkStyle.color = color);
  }

  calculateMargins() {
    let arrowLoc = this.style.arrowLocations
    let arrowLength = arrowLengths[this.style.arrowType]

    this.margins.start = 0
    this.margins.end = 0

    if ([1,2,4,5].includes(arrowLoc)) {
      this.margins.start = 1.5 * arrowLength * this.style.thickness / 2
    }

    if ([0,2,3,5].includes(arrowLoc)) {
      this.margins.end = 1.5 * arrowLength * this.style.thickness / 2
    }
  }

  updateTickmarkGeometries() {
    let tickmarkGeometries = this.axisComponents.tickmarkGeometries
    let axisDisplacement = this.end.minus(this.start)
    let axisLength = axisDisplacement.length()

    if (axisLength < 3 * (this.marginStart + this.marginEnd) ||
      this.marginStart < 0 || this.marginEnd < 0 || axisLength < 5) {
      // No thx
      return;
    }

    let axisDisplacementDir = axisDisplacement.unit()

    // The transformation defined by this axis
    const transformation = {
      v1: this.start.add(axisDisplacementDir.scale(this.margins.start)),
      v2: this.end.minus(axisDisplacementDir.scale(this.margins.end)),
      x1: this.xStart,
      x2: this.xEnd
    }

    // For every type of tickmark
    for (let styleName in this.tickmarkStyles) {
      const style = this.tickmarkStyles[styleName]
      const positions = this.tickmarkPositions[styleName]

      if (!positions) continue;

      let geometry = tickmarkGeometries[styleName];
      if (!geometry) {
        geometry = new Simple2DGeometry()
        geometry.alwaysUpdate = false;
        this.add(geometry)

        tickmarkGeometries[styleName] = geometry;
      }

      // Create some tickmarks!
      style.createTickmarks(transformation, positions, geometry)
    }

    for (let geometryName in this.tickmarkGeometries) {
      if (!this.tickmarkStyles[geometryName]) {
        let unusedGeometry = this.tickmarkGeometries[geometryName]

        // unused geometry, destroy it
        this.remove(unusedGeometry)
        unusedGeometry.destroy()

        delete this.tickmarkGeometries[geometryName]
      }
    }
  }

  updateAxisGeometry() {
    let axisGeometry = this.axisComponents.axisGeometry
    axisGeometry.precedence = 1 // put it on top of the tickmarks
    axisGeometry.alwaysUpdate = false

    // Axis geometry connects these two vertices
    axisGeometry.vertices = [...this.start.asArray(), ...this.end.asArray()]
    axisGeometry.updateGeometries()

    if (!this.hasChild(axisGeometry))
      this.add(axisGeometry)
  }

  _onDPRChanged() {
    this.updateGeometries()
  }

  updateGeometries () {
    if (this.margins.automatic)
      this.calculateMargins()
    this.updateTickmarkGeometries()
    this.updateAxisGeometry()
  }

  destroy() {
    super.destroy() // this will destroy all the child geometries

    delete this.axisComponents
  }

  render (renderInfo) {
    if (this.alwaysUpdate)
      this.updateGeometries()

    super.render(renderInfo)
  }
}

export { Axis, AxisTickmarkStyle }
