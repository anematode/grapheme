import { Color } from "../color"

const validDirs = ['C', 'N', 'S', 'W', 'E', 'NW', 'NE', 'SW', 'SE']
const labelClasses = validDirs.map(s => 'grapheme-label-' + s)

class LabelStyle {
  constructor(params={}) {
    const {
      mode = "2d", // valid values: 2d, latex, html
      dir = "C"    // valid values:
    } = params

    this.mode = mode
    this.dir = dir
  }

  prepareContext(ctx) {
    const dir = this.dir

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

  labelClass() {
    let dir = this.dir

    if (!validDirs.includes(dir)) {
      dir = 'C'
    }

    return "grapheme-label-" + this.dir
  }

  setLabelClass(labelElement) {
    const labelClass = this.labelClass()

    if (!labelElement.classList.contains(labelClass)) {
      labelElement.classList.remove(...labelClasses)
      labelElement.classList.add(labelClass)
    }
  }
}

class Label2DStyle extends LabelStyle {
  // TODO: rotation
  constructor (params = {}) {
    const {
      color = new Color(),
      fontSize = 12,
      fontFamily = 'Helvetica',
      shadowColor = new Color(),
      shadowBlur = 0
    } = params
    super(params)

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

    super.prepareContext(ctx)
  }
}

export { LabelStyle, Label2DStyle }
