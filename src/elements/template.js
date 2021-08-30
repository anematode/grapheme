import { Element } from '../core/element.js'
import { constructInterface } from '../core/interface.js'
import { TextStyle } from '../styles/definitions.js'

const cowInterface = constructInterface({
  interface: {
    style: {
      description: 'The style of the text.',
      setAs: 'user',
      merge: true
    },
    position: {
      description: 'The position of the text.',
      conversion: { type: 'Vec2' },
      target: 'pos'
    },
    text: { description: 'The string of text.', typecheck: 'string' }
  },
  internal: {
    pos: { type: 'Vec2', computed: 'none' },
    style: {
      type: 'TextStyle',
      computed: 'user',
      compose: true,
      default: TextStyle.default
    }
  }
})

class Cow extends Element {
  constructor (params) {
    super(params)
  }

  getInterface () {
    return cowInterface
  }

  _update () {
    this.internal.renderInfo = {
      instructions: []
    }
  }
}
