// Sort of a test object for now so that I can figure out the rest of Grapheme's internals

import { Element } from '../../core/element.js'
import { constructInterface } from '../../core/interface.js'
import { flattenVec2Array, generateCircleTriangleStrip } from '../../algorithm/misc_geometry.js'
import { Colors } from '../../styles/definitions.js'

const numberLinePointsInterface = constructInterface({
  interface: {
    data: {},
    pointRadius: {},
    color: {}
  },
  internal: {
    data: {},
    pointRadius: {
      computed: "default",
      default: 4
    },
    color: {
      computed: "default",
      default: Colors.BLUE
    }
  }
})

export class NumberLinePoints extends Element {
  getInterface () {
    return numberLinePointsInterface
  }

  _update () {
    this.defaultInheritProps()
    this.defaultComputeProps()

    let { data, pointRadius, color, numberLineTransform } = this.props.proxy

    if (!data) return

    let circle = generateCircleTriangleStrip(pointRadius, 0, 0, 16)
    let vertices = new Float32Array(circle.length * data.length)

    let verticesOffset = 0
    for (let i = 0; i < data.length; ++i) {
      let { x, y } = numberLineTransform.graphToPixel(data[i])

      for (let j = 0; j < circle.length; j += 2) {
        vertices[verticesOffset + j] = circle[j] + x
        vertices[verticesOffset + j + 1] = circle[j + 1] + y
      }

      verticesOffset += circle.length
    }

    this.internal.renderInfo = {
      instructions: { type: 'triangle_strip', vertices, color }
    }
  }
}
