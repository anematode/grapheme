import { Color } from '../other/color'

const validDirs = ['C', 'N', 'S', 'W', 'E', 'NW', 'NE', 'SW', 'SE']
const labelClasses = validDirs.map(s => 'grapheme-label-' + s)

class BasicLabelStyle {
  constructor (params = {}) {
    const {
      mode = 'latex', // valid values: latex, html
      dir = 'C' // valid values:
    } = params

    this.mode = mode
    this.dir = dir
  }

  labelClass () {
    let dir = this.dir

    if (!validDirs.includes(dir)) {
      dir = 'C'
    }

    return 'grapheme-label-' + this.dir
  }

  setLabelClass (labelElement) {
    const labelClass = this.labelClass()

    if (!labelElement.classList.contains(labelClass)) {
      labelElement.classList.remove(...labelClasses)
      labelElement.classList.add(labelClass)
    }
  }
}

class Label2DStyle extends BasicLabelStyle {
  // TODO: rotation
  constructor (params = {}) {
    const {
      color = new Color(),
      fontSize = 12,
      fontFamily = 'Helvetica',
      shadowColor = new Color(),
      shadowSize = 0
    } = params
    super(params)

    this.mode = "2d"
    this.color = color
    this.fontSize = fontSize
    this.fontFamily = fontFamily
    this.shadowColor = shadowColor
    this.shadowSize = shadowSize
  }

  drawText(ctx, text, x, y) {
    if (this.shadowSize) {
      this.prepareContextShadow(ctx)
      ctx.strokeText(text, x, y)
    }

    this.prepareContextTextStyle(ctx)
    this.prepareContextFill(ctx)
    ctx.fillText(text, x, y)

  }

  prepareContextTextAlignment (ctx) {
    let dir = this.dir

    let textBaseline
    let textAlign

    if (!validDirs.includes(dir)) {
      dir = 'C'
    }

    // text align
    switch (dir) {
      case 'C': case 'N': case 'S':
        textAlign = 'center'
        break
      case 'NW': case 'W': case 'SW':
        textAlign = 'left'
        break
      case 'NE': case 'E': case 'SE':
        textAlign = 'right'
        break
    }

    // text baseline
    switch (dir) {
      case 'C': case 'W': case 'E':
        textBaseline = 'middle'
        break
      case 'SW': case 'S': case 'SE':
        textBaseline = 'top'
        break
      case 'NW': case 'N': case 'NE':
        textBaseline = 'bottom'
        break
    }

    ctx.textBaseline = textBaseline
    ctx.textAlign = textAlign
  }

  prepareContextTextStyle (ctx) {
    this.prepareContextTextAlignment(ctx)
    ctx.font = `${this.fontSize}px ${this.fontFamily}`
  }

  prepareContextShadow (ctx) {
    ctx.strokeStyle = this.shadowColor.hex()
    ctx.lineWidth = this.shadowSize * 2
  }

  prepareContextFill (ctx) {
    ctx.fillStyle = this.color.hex()
  }
}

export { BasicLabelStyle, Label2DStyle }
