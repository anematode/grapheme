import { Element as GraphemeElement } from '../core/grapheme_element'
import { Pen } from '../styles/pen'
import { Colors } from '../other/color'
import { Vec2 } from '../math/vec'

class PointElementStyle {
  constructor(params={}) {
    const {
      pen = new Pen(),
      fill = Colors.RED,
      doStroke = true,
      doFill = true
    } = params

    this.pen = pen
    this.fill = fill
    this.doStroke = doStroke
    this.doFill = doFill
  }

  prepareContext(ctx) {
    ctx.fillStyle = this.fill.hex()
    this.pen.prepareContext(ctx)
  }
}

class PointElement extends GraphemeElement {
  constructor(params={}) {
    super(params)

    this.position = new Vec2(5, 4)
    this.radius = 10

    this.style = new PointElementStyle()
    this.draggable = false
  }

  isClick(pos) {

  }

  update() {
    this._path = new Path2D()
    this._path.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI)
  }

  render(info) {
    super.render(info)
    this.style.prepareContext(info.ctx)

    if (this.style.doFill)
      info.ctx.fill(this._path)
    if (this.style.doStroke)
      info.ctx.stroke(this._path)
  }
}

export { PointElement }
