import { Element as GraphemeElement } from '../grapheme_element'
import { LineStyle } from '../other/line_style'

class PolylineBase extends GraphemeElement {
  constructor (params = {}) {
    super(params)

    let {
      style,
      vertices = []
    } = params

    if (!(style instanceof LineStyle)) {
      style = new LineStyle(style || {})
    }

    this.style = style
    this.vertices = vertices
  }
}

export { PolylineBase }
