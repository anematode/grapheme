import {GraphemeElement} from "../grapheme_element"

class Label2DSet extends GraphemeElement {
  constructor(params = {}) {
    super(params)

    this.style = this._label.style

    // Format: {text: "5", pos: Vec2(3,4)}
    this.texts = params.texts ? params.texts : []
  }

  render(renderInfo) {
    let texts = this.texts, ctx = renderInfo.ctx

    ctx.save()

    this.style.prepareContextTextStyle(ctx)

    if (this.style.shadowSize > 0) {
      this.style.prepareContextShadow(ctx)

      for (let i = 0; i < texts.length; ++i) {
        let textInfo = texts[i]
        let {text, pos} = textInfo

        ctx.strokeText(text, pos.x, pos.y)
      }
    }

    this.style.prepareContextFill(ctx)

    for (let i = 0; i < texts.length; ++i) {
      let textInfo = texts[i]
      let {text, pos} = textInfo

      ctx.fillText(text, pos.x, pos.y)
    }

    ctx.restore()
  }
}
