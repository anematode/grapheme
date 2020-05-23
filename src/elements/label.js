import { Element as GraphemeElement } from '../core/grapheme_element'
import { Vec2 } from '../math/vec'
import { Label2DStyle, BasicLabelStyle } from '../styles/label_style'
import * as utils from "../core/utils"

class LabelBase extends GraphemeElement {
  constructor (params = {}) {
    super(params)

    const {
      text = '',
      position = new Vec2(0, 0)
    } = params

    this.text = text
    this.position = position
  }
}

// Creates html element of the form
// <div class="label label-S" > this.text ... </div>
class BasicLabel extends LabelBase {
  constructor (params = {}) {
    super(params)

    this.style = params.style ? params.style : new BasicLabelStyle(params.style || {})
  }

  render (info) {
    const { text, position } = this
    const mode = this.style.mode

    const labelElement = renderInfo.labelManager.getElement(this)

    this.style.setLabelClass(labelElement)

    labelElement.style.top = position.y + 'px'
    labelElement.style.left = position.x + 'px'

    const oldLatex = labelElement.getAttribute('latex-content')

    if (mode === 'latex') {
      // latex-content stores the latex to be rendered to this node, which means
      // that if it is equal to text, it does not need to be recomputed, only maybe
      // moved in some direction
      if (oldLatex !== text) {
        labelElement.setAttribute('latex-content', text)
        // eslint-disable-next-line no-undef
        katex.render(text, labelElement, { throwOnError: false })
      }
    } else {
      if (oldLatex) { labelElement.removeAttribute('latex-content') }

      labelElement.innerHTML = text
    }
  }
}

class Label2D extends LabelBase {
  constructor (params) {
    super(params)

    this.style = (params.style instanceof Label2DStyle) ? params.style : new Label2DStyle(params.style || {})
  }

  boundingBox() {
    return utils.measureText(this.text, this.style.font)
  }

  render(info) {
    super.render(info)

    this.style.drawText(info.ctx, this.text, this.position.x, this.position.y)
  }
}

export { BasicLabel, Label2D }
