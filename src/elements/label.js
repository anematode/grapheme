import { Element as GraphemeElement } from '../grapheme_element'
import { Vec2 } from '../math/vec2'
import { Label2DStyle } from "./label_style"

// Creates html element of the form
// <div class="label label-S" label-id=this.uuid render-id=renderID>
class Label extends GraphemeElement {
  constructor (params = {}) {
    super(params)

    const {
      text = '',
      position = new Vec2(0, 0)
    } = params

    this.text = text
    this.position = position

    if (params.style) {
      if (params.style instanceof Label2DStyle) {
        this.style = params.style
      } else {
        this.style = new Label2DStyle(params.style)
      }
    } else {
      this.style = new Label2DStyle()
    }
  }

  render (renderInfo) {
    const { text, position } = this
    const mode = this.style.mode

    if (mode === '2d') {
      const ctx = renderInfo.text

      ctx.save()
      this.style.prepareContext(ctx)

      ctx.fillText(text, position.x, position.y)
      ctx.restore()
    } else {
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
}

export { Label }
