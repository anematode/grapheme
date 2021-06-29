import { Element } from '../core/element.js'
import { constructInterface } from '../core/interface.js'
import { DefaultStyles, Pen } from '../styles/definitions.js'

const polylineInterface = constructInterface({ interface: {
  pen: {
    setAs: 'user',
    description: 'The pen used to draw the polyline.'
  },
  vertices: {
    conversion: { type: 'f32_vec2_array' },
    description: 'The vertices of the polyline.'
  }
}, internal: {
  pen: {
    type: 'Pen',
    computed: 'user',
    default: DefaultStyles.Pen,
    compose: true
  },
  vertices: {
    computed: 'none'
  }
}})

export class PolylineElement extends Element {
  _update () {
    this.defaultComputeProps()

    let { vertices, pen } = this.props.proxy

    this.internal.renderInfo = (vertices && pen) ? { instructions: { type: 'polyline', vertices, pen } } : null
  }

  getInterface () {
    return polylineInterface
  }
}
