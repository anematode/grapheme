import * as utils from "../utils"
import { Color } from "../color"
import {Vec2, S} from "../math/vec2"
import {Simple2DGeometry} from "./simple_geometry"

function defaultLabel(x) {
  return x.toFixed(5);
}

class AxisTickmarkStyle {
  constructor(params={}) {
    // Length, in canvas pixels, of each tickmark
    this.length = utils.select(params.length, 16);

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

  // Reference theory/class_theory/axis_tickmark_style.jpg for explanation
  createTickmarks(transformation, positions, geometry) {
    utils.checkType(geometry, Simple2DGeometry)

    let tickmarkCount = positions.length
    let vertexCount = tickmarkCount * 5; // 5 vertices per thing

    geometry.renderMode = "TRIANGLE_STRIP"
    geometry.color = this.color
    if (!geometry.glVertices || geometry.glVertices.length !== 2 * vertexCount) {
      geometry.glVertices = new Float32Array(2 * vertexCount)
    }

    let vertices = geometry.glVertices

    // Note that "s" in class theory is positioning, and "t" is thickness
    let { positioning, thickness, length } = this
    const {v1, v2, x1, x2} = transformation
    let axisDisplacement = v2.minus(v1)

    // vectors as defined in class_theory
    let xi = axisDisplacement.unit().scale(thickness / 2)
    let upsilon = axisDisplacement.unit().rotate(Math.PI / 2)
    let nanVertex = new Vec2(NaN, NaN)

    let index = 0

    function addVertex(v) {
      // Convert to canvas coordinates
      vertices[index] = v.x
      vertices[index+1] = v.y
      index += 2
    }

    for (let i = 0; i < positions.length; ++i) {
      let givenPos = positions[i]
      if (givenPos.value)
        givenPos = givenPos.value

      let pos = axisDisplacement.scale((givenPos - x1) / (x2 - x1)).add(v1)
      let lambda = upsilon.scale((positioning + 1) / 2 * length).add(pos)
      let omicron = upsilon.scale((positioning - 1) / 2 * length).add(pos)

      // Create a rectangle for the tick
      addVertex(omicron.minus(xi))
      addVertex(lambda.minus(xi))
      addVertex(omicron.add(xi))
      addVertex(lambda.add(xi))
      addVertex(nanVertex)
    }

    geometry.glVerticesCount = vertexCount
  }
}

export {AxisTickmarkStyle};
