import { Element } from '../core/element.js'
import { constructInterface } from '../core/interface.js'

const numberLineInterface = constructInterface({
  interface: {

  },
  internal: {
    start: { type: "Vec2", computed: 'none' },
    end: { type: "Vec2", computed: 'none' },
    numberLineTransform: { computed: 'none' }
  }
})

export class NumberLine extends Element {
  constructor (params) {
    super(params)
  }

  getInterface () {
    return numberLineInterface
  }

  computeNumberLineTransform () {

  }

  _update () {
    this.internal.renderInfo = {
      instructions: []
    }
  }
}
