import { Element } from '../core/element.js'
import { constructInterface } from '../core/interface.js'

const polygonInterface = constructInterface({
  interface: {
    vertices: {
      conversion: { type: 'f32_vec2_array' },
      description: 'The vertices of the polygon'
    }
  },
  internal: {
    vertices: {
      computed: "none"
    }
  }
})

export class Polygon extends Element {
  getInterface() {
    return polygonInterface
  }

  _update () {
    let { vertices } = this.props.proxy
    if (!vertices) {
      this.internal.renderInfo = null
      return
    }

    this.internal.renderInfo = {
      instructions: { type: "polygon", vertices }
    }
  }
}
