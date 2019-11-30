import { Element as GraphemeElement } from '../grapheme_element'
import { Vec2 } from '../math/vec2'

class Label extends GraphemeElement {
  constructor (params = {}) {
    super(params)

    const {
      text = '',
      mode = '',
      anchorPoint = new Vec2(0, 0)
    } = params

    this.text = text
    this.mode = mode
    this.anchorPoint = anchorPoint
  }

  render (renderInfo) {

  }
}

export { Label }
