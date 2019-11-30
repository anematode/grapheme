import { Label } from './label'
import { Label2DStyle } from './label_2d_style'

class Label2D extends Label {
  constructor (params = {}) {
    super(params)

    this.mode = '2d'
    this.labelStyle = params.labelStyle || new Label2DStyle()
  }

  render (renderInfo) {
    const ctx = renderInfo.text
    ctx.save()

    this.labelStyle.prepareContext(ctx)
    super.render(renderInfo)

    ctx.restore()
  }
}

export { Label2D }
