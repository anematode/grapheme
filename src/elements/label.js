import { Element as GraphemeElement } from "../grapheme_element"

const LABEL_MODES = ["2d", "html"]

class Label extends GraphemeElement {
  constructor(params = {}) {
    super(params)

    const {
      text = "",
      mode = "",
      anchorPoint = new Vec2(0, 0)
    } = params

    this.text = text
    this.mode = mode
    this.anchorPoint = anchorPoint
  }
}

export { Label }
