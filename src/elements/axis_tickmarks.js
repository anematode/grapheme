import * as utils from '../utils'
import { Color } from '../color'
import { Vec2 } from '../math/vec2'
import { Simple2DGeometry } from './simple_geometry'
import { Label2DStyle } from "./label_2d_style"
import { Label2D } from "./label_2d"

// TEMP: must transfer from old grapheme
function defaultLabel (x) {
  return x + ''
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
    length = 16,
    positioning = 0,
    thickness = 2,
    color = new Color(),
    displayLabels = false,
    labelAnchoredTo = 1, // 1 is left of tickmark, 0 is middle of tickmark, -1 is right of tickmark
    labelDir = "S",
    labelPadding = 2,
    labelStyle = new Label2DStyle(),
    labelFunc = defaultLabel
  } = {}) {
    this.length = length
    this.positioning = positioning
    this.thickness = thickness
    this.color = color
    this.displayLabels = displayLabels
    this.labelAnchoredTo = labelAnchoredTo
    this.labelDir = labelDir
    this.labelPadding = labelPadding
    this.labelStyle = labelStyle
    this.labelFunc = labelFunc
  }

  /**
   * Check whether the tickmark is geometrically valid.
   * @returns {Boolean} Whether the tickmark is valid.
   */
  isValid () {
    return (this.length > 0 && (this.positioning >= -1 && this.positioning <= 1) &&
      (this.thickness > 0))
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
  createTickmarks (transformation, positions, geometry, labels) {
    utils.checkType(geometry, Simple2DGeometry)

    const tickmarkCount = positions.length
    const vertexCount = tickmarkCount * 5 // 5 vertices per thing

    // The tickmarks will be drawn as triangles
    geometry.renderMode = 'TRIANGLE_STRIP'
    geometry.color = this.color

    // Create the glVertices array if necessary
    if (!geometry.glVertices || geometry.glVertices.length !== 2 * vertexCount) {
      geometry.glVertices = new Float32Array(2 * vertexCount)
    }

    const vertices = geometry.glVertices

    // Note that "s" in class theory is positioning, and "t" is thickness
    const { positioning, thickness, length } = this
    const { v1, v2, x1, x2 } = transformation
    const axisDisplacement = v2.minus(v1)

    // vectors as defined in class_theory
    const xi = axisDisplacement.unit().scale(thickness / 2)
    const upsilon = axisDisplacement.unit().rotate(Math.PI / 2)
    const nanVertex = new Vec2(NaN, NaN)

    let index = 0

    function addVertex (v) {
      vertices[index] = v.x
      vertices[index + 1] = v.y
      index += 2
    }

    for (let i = 0; i < positions.length; ++i) {
      let givenPos = positions[i]
      if (givenPos.value) { givenPos = givenPos.value }

      const pos = axisDisplacement.scale((givenPos - x1) / (x2 - x1)).add(v1)
      const lambda = upsilon.scale((positioning + 1) / 2 * length).add(pos)
      const omicron = upsilon.scale((positioning - 1) / 2 * length).add(pos)

      // Create a rectangle for the tick
      addVertex(omicron.minus(xi))
      addVertex(lambda.minus(xi))
      addVertex(omicron.add(xi))
      addVertex(lambda.add(xi))
      addVertex(nanVertex)

      if (this.displayLabels) {
        let textS = this.labelAnchoredTo
        let position = lambda.scale((textS + 1) / 2).add(omicron.scale((1 - textS) / 2)).add(upsilon.scale(this.labelPadding))

        let label = new Label2D({position, text: this.labelFunc(givenPos), dir: this.labelDir, labelStyle: this.labelStyle})

        labels.push(label)
      }
    }

    geometry.glVerticesCount = vertexCount
  }
}

export { AxisTickmarkStyle }
