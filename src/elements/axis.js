import { Group as GraphemeGroup } from '../grapheme_group'
import { Simple2DGeometry } from './simple_geometry'
import { PolylineElement } from './polyline'
import { Vec2 } from '../math/vec2'
import { Color } from '../color'
import { arrowLengths } from './arrows'
import * as utils from '../utils'
import { AxisTickmarkStyle } from './axis_tickmarks'

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

@extends Group
*/
class Axis extends GraphemeGroup {
  /**
   * Create an axis.
   * @param {Object} params - The parameters of the axis. Also inherits parameters from GraphemeGroup.
   * @param {Vec2} params.start - The position, in canvas pixels, of the start of the axis.
   * @param {Vec2} params.end - The position, in canvas pixels, of the end of the axis.
   * @param {Object} params.margins - Information about the margins of the axis.
   * @param {number} params.margins.start - Length in canvas pixels of the starting margin.
   * @param {number} params.margins.end - Length in canvas pixels of the ending margin.
   * @param {Boolean} params.margins.automatic - Whether to calculate the margins automatically. If this is true, updateGeometries() will overwrite margins.start and margins.end.
   * @param {number} params.xStart - The axis coordinate associated with the start of the axis.
   * @param {number} params.xEnd - The axis coordinate associated with the end of the axis.
   * @param {Object} params.tickmarkStyles - An optional object containing key value pairs of AxisTickmarkStyles, where the keys are the names of the styles and the values are the styles.
   * @param {Object} params.tickmarkPositions - An optional object containing key value pairs of tickmark position arrays, where the keys are the names of those tickmarks' styles and the values are the positions, in axis coordinates, of the tickmarks.
   * @param {number} params.arrowLocations - Where the arrows of the axis are.
   * @param {number} params.arrowType - The type of the arrows of the axis.
   * @param {number} params.thickness - The thickness of the axis.
   * @param {Color} params.color - The color of the axis.
   * @param {number} params.endcapType - The type of endcap of the axis.
   * @param {number} params.endcapRes - The angular resolution of the endcap.
   */
  constructor (params = {}) {
    super(params)

    const {
      start = new Vec2(0, 0),
      end = new Vec2(100, 0),
      margins = {
        start: 0,
        end: 0,
        automatic: true
      },
      xStart = 0,
      xEnd = 1,
      tickmarkStyles = {},
      tickmarkPositions = {},
      style = {}
    } = params

    this.start = start
    this.end = end
    this.margins = margins
    this.xStart = xStart
    this.xEnd = xEnd
    this.tickmarkStyles = tickmarkStyles
    this.tickmarkPositions = tickmarkPositions

    // Used internally, no need for the user to touch it. Unless there's a bug.
    // Then I have to touch it. Ugh.
    this.axisComponents = {
      tickmarkGeometries: {},
      axisGeometry: new PolylineElement(Object.assign({
        // Some sensible default values
        arrowLocations: -1,
        arrowType: 0,
        thickness: 2,
        color: new Color()
      }, style))
    }

    // Style of the main axis line
    this.style = this.axisComponents.axisGeometry.style
  }

  /**
   * setAllColorsTo - Set the color of the axis and the colors of all tickmarkstyles under this axis to a given color.
   *
   * @param  {Color} color The color to use.
   */
  setAllColorsTo (color) {
    utils.checkType(color, Color)
    this.color = color

    this.tickmarkStyles.forEach(tickmarkStyle => { tickmarkStyle.color = color })
  }

  /**
   * calculateMargins - Calculate the margins of the axis, given the size of the arrows.
   */
  calculateMargins () {
    const arrowLoc = this.style.arrowLocations
    const arrowLength = arrowLengths[this.style.arrowType]

    this.margins.start = 0
    this.margins.end = 0

    if ([1, 2, 4, 5].includes(arrowLoc)) {
      this.margins.start = 1.5 * arrowLength * this.style.thickness / 2
    }

    if ([0, 2, 3, 5].includes(arrowLoc)) {
      this.margins.end = 1.5 * arrowLength * this.style.thickness / 2
    }
  }

  /**
   * updateTickmarkGeometries - Update the tickmark geometries by going through each tickmark style and generating the relevant geometries.
   */
  updateTickmarkGeometries () {
    const tickmarkGeometries = this.axisComponents.tickmarkGeometries
    const axisDisplacement = this.end.minus(this.start)
    const axisLength = axisDisplacement.length()

    if (axisLength < 3 * (this.marginStart + this.marginEnd) ||
      this.marginStart < 0 || this.marginEnd < 0 || axisLength < 5) {
      // No thx
      return
    }

    const axisDisplacementDir = axisDisplacement.unit()

    // The transformation defined by this axis
    const transformation = {
      v1: this.start.add(axisDisplacementDir.scale(this.margins.start)),
      v2: this.end.minus(axisDisplacementDir.scale(this.margins.end)),
      x1: this.xStart,
      x2: this.xEnd
    }

    // For every type of tickmark
    for (const styleName in this.tickmarkStyles) {
      const style = this.tickmarkStyles[styleName]
      const positions = this.tickmarkPositions[styleName]

      if (!positions) continue

      let geometry = tickmarkGeometries[styleName]
      if (!geometry) {
        geometry = new Simple2DGeometry()
        geometry.alwaysUpdate = false
        this.add(geometry)

        tickmarkGeometries[styleName] = geometry
      }

      // Create some tickmarks!
      style.createTickmarks(transformation, positions, geometry)
    }

    for (const geometryName in this.tickmarkGeometries) {
      if (!this.tickmarkStyles[geometryName]) {
        const unusedGeometry = this.tickmarkGeometries[geometryName]

        // unused geometry, destroy it
        this.remove(unusedGeometry)
        unusedGeometry.destroy()

        delete this.tickmarkGeometries[geometryName]
      }
    }
  }

  /**
   * updateAxisGeometry - Update the PolylineElement which is the main axis itself.
   */
  updateAxisGeometry () {
    const axisGeometry = this.axisComponents.axisGeometry
    axisGeometry.precedence = 1 // put it on top of the tickmarks
    axisGeometry.alwaysUpdate = false

    // Axis geometry connects these two vertices
    axisGeometry.vertices = [...this.start.asArray(), ...this.end.asArray()]
    axisGeometry.updateGeometries()

    if (!this.hasChild(axisGeometry)) { this.add(axisGeometry) }
  }

  /**
   * updateGeometries - Update the geometries of this axis for rendering.
   */
  updateGeometries () {
    if (this.margins.automatic) { this.calculateMargins() }
    this.updateTickmarkGeometries()
    this.updateAxisGeometry()
  }

  destroy () {
    super.destroy() // this will destroy all the child geometries

    delete this.axisComponents
  }

  render (renderInfo) {
    if (this.alwaysUpdate) { this.updateGeometries() }

    super.render(renderInfo)
  }
}

export { Axis, AxisTickmarkStyle }
