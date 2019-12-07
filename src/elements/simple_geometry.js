import { Element as GraphemeElement } from '../grapheme_element'
import { Color } from '../other/color'

class Path2DGeometry extends GraphemeElement {
  constructor (params = {}) {
    const {
      path = new Path2D(),
      fillColor = new Color()
    } = params

    super(params)

    this.path = path
    this.fillColor = fillColor
  }

  render (renderInfo) {
    const ctx = renderInfo.canvasCtx

    ctx.fillColor = this.fillColor
    ctx.fill(this.path)
  }
}

export { Path2DGeometry }
