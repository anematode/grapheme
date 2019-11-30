import { Color } from '../color'

class Label2DStyle {
  // TODO: rotation
  constructor (params = {}) {
    const {
      color = new Color(),
      fontSize = 12,
      fontFamily = 'Helvetica',
      shadowColor = new Color(),
      shadowBlur = 0
    } = params

    this.color = color
    this.fontSize = fontSize
    this.fontFamily = fontFamily
    this.shadowColor = shadowColor
    this.shadowBlur = shadowBlur
  }

  prepareContext (ctx) {
    ctx.fillStyle = this.color
    ctx.font = `${this.fontSize}px ${this.fontFamily}`
    ctx.shadowBlur = this.shadowBlur
    ctx.shadowColor = this.shadowColor
  }
}

export { Label2DStyle }
