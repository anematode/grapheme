

// Sort of a test object for now so that I can figure out the rest of Grapheme's internals

import {Element} from "../core/element.js"
import {constructInterface} from "../core/interface.js"
import {generateCircleTriangleStrip} from "../algorithm/misc_geometry.js"
import {Colors} from "../styles/definitions.js"

const pointCloudInterface = constructInterface({
  data: true,
  pointRadius: true,
  color: true
})

export class PointCloudElement extends Element {
  init () {
    this.set({ pointRadius: 4, color: Colors.BLUE })
  }

  getInterface () {
    return pointCloudInterface
  }

  _update () {
    this.defaultInheritProps()
    const { data, pointRadius, color, plotTransform } = this.props.proxy

    let circle = generateCircleTriangleStrip(pointRadius, 0, 0, 16)
    let vertices = new Float32Array(circle.length * data.length / 2)
    let { xm, ym, xb, yb } = plotTransform.getReducedGraphToPixelTransform()

    let verticesOffset = 0
    for (let i = 0; i < data.length; i += 2) {
      let x = data[i], y = data[i+1]

      x = xm * x + xb
      y = ym * y + yb

      for (let j = 0; j < circle.length; j += 2) {
        vertices[verticesOffset + j] = circle[j] + x
        vertices[verticesOffset + j + 1] = circle[j + 1] + y
      }

      verticesOffset += circle.length
    }

    this.internal.renderInfo = { instructions: { type: "triangle_strip", vertices, color } }
  }
}
