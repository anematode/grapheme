import { Group as GraphemeGroup } from '../core/grapheme_group'
import { PolylineElement } from './polyline'
import { Vec2 } from '../math/vec2'
import { Color } from '../other/color'
import * as utils from '../core/utils'
import { TickmarkStyle } from '../styles/tickmark_style'
import { Label2DSet } from './label_2d_set'

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
classes is unlimited. The style of each tickmark is defined by the TickmarkStyle
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
   * @param {Boolean} params.margins.automatic - Whether to calculate the margins automatically. If this is true, update() will overwrite margins.start and margins.end.
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
      xStart = 0,
      xEnd = 1,
      tickmarkStyles = {},
      tickmarkPositions = {},
      style = {}
    } = params

    const margins = Object.assign({ start: 0, end: 0, automatic: true }, params.margins || {})

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
      tickmarkPolylines: {},
      tickmarkLabels: {},
      axisPolyline: new PolylineElement(Object.assign({
        // Some sensible default values
        arrowLocations: -1,
        arrowType: 0,
        thickness: 2,
        color: new Color()
      }, style))
    }

    // Style of the main axis line
    this.style = this.axisComponents.axisPolyline.style
  }

  applyToTickmarkStyles(func) {
    let ts = this.tickmarkStyles
    for (const styleName in ts) {
      let style = ts[styleName]

      func(style)
    }
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
    const style = this.style

    const arrowLocations = style.arrowLocations
    const arrowLength = style.arrowhead ? style.arrowhead.length : 0

    this.margins.start = 0
    this.margins.end = 0

    if (arrowLocations.includes('start') || arrowLocations.includes('substart')) {
      this.margins.start = 3 * arrowLength * this.style.thickness
    }

    if (arrowLocations.includes('end') || arrowLocations.includes('subend')) {
      this.margins.end = 3 * arrowLength * this.style.thickness
    }
  }

  /**
   * updateTickmarkPolylines - Update the tickmark geometries by going through each tickmark style and generating the relevant geometries.
   */
  updateTickmarkPolylines () {
    const tickmarkPolylines = this.axisComponents.tickmarkPolylines
    const tickmarkLabels = this.axisComponents.tickmarkLabels
    const axisDisplacement = this.end.subtract(this.start)
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
      v2: this.end.subtract(axisDisplacementDir.scale(this.margins.end)),
      x1: this.xStart,
      x2: this.xEnd
    }

    // For every type of tickmark
    for (const styleName in this.tickmarkStyles) {
      const style = this.tickmarkStyles[styleName]
      const positions = this.tickmarkPositions[styleName]

      if (!positions) continue

      let polyline = tickmarkPolylines[styleName]

      if (!polyline) {
        polyline = new PolylineElement()
        polyline.alwaysUpdate = false
        this.add(polyline)

        tickmarkPolylines[styleName] = polyline
      }

      let labels = tickmarkLabels[styleName]

      if (!labels) {
        labels = new Label2DSet()
        this.add(labels)

        tickmarkLabels[styleName] = labels
      }

      // Create some tickmarks!
      style.createTickmarks(transformation, positions, polyline, labels)
      polyline.update()
    }

    for (const polylineName in this.tickmarkPolylines) {
      if (!this.tickmarkStyles[polylineName]) {
        const unusedpolyline = this.tickmarkPolylines[polylineName]

        // unused polyline, destroy it
        this.remove(unusedpolyline)
        unusedpolyline.destroy()

        delete this.tickmarkPolylines[polylineName]
      }
    }

    for (const labelName in this.tickmarkLabels) {
      if (!this.tickmarkStyles[labelName]) {
        const unusedLabels = this.tickmarkLabels[labelName]

        this.remove(unusedLabels)
        unusedLabels.destroy()

        delete this.tickmarkLabels[labelName]
      }
    }
  }

  /**
   * updateAxisPolyline - Update the PolylineElement which is the main axis itself.
   */
  updateAxisPolyline () {
    const axispolyline = this.axisComponents.axisPolyline
    axispolyline.precedence = 1 // put it on top of the tickmarks
    axispolyline.alwaysUpdate = false

    // Axis polyline connects these two vertices
    axispolyline.vertices = [...this.start.asArray(), ...this.end.asArray()]
    axispolyline.update()

    if (!this.hasChild(axispolyline)) { this.add(axispolyline) }
  }

  /**
   * update - Update the geometries of this axis for rendering.
   */
  update () {
    if (this.margins.automatic) { this.calculateMargins() }
    this.updateTickmarkPolylines()
    this.updateAxisPolyline()
  }

  destroy () {
    super.destroy() // this will destroy all the child geometries

    delete this.axisComponents
  }

  render (renderInfo) {
    super.render(renderInfo)
  }
}

export { Axis, TickmarkStyle }
