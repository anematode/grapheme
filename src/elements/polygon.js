import { Element } from '../core/element.js'
import { constructInterface } from '../core/interface.js'
import { Colors } from '../styles/definitions.js'

const polygonInterface = constructInterface({
  interface: {
    vertices: {
      conversion: { type: 'f32_vec2_array' },
      description: 'The vertices of the polygon'
    },
    color: {
      conversion: { type: "Color" },
      description: "The color of the polygon"
    }
  },
  internal: {
    vertices: {
      computed: "none"
    },
    color: {
      computed: "default",
      default: Colors.BLACK
    }
  }
})

export class Polygon extends Element {
  getInterface() {
    return polygonInterface
  }

  _update () {
    let { vertices, color } = this.props.proxy
    if (!vertices) {
      this.internal.renderInfo = null
      return
    }

    this.internal.renderInfo = {
      instructions: { type: "polygon", vertices, color }
    }
  }
}
