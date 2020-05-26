import { Element as GraphemeElement } from '../core/grapheme_element'
import { Pen } from '../styles/pen'
import { Colors } from '../other/color'
import { Vec2 } from '../math/vec'
import { BoundingBox } from '../math/bounding_box'

class PointElementStyle {
  constructor(params={}) {
    const {
      pen = new Pen(),
      fill = Colors.RED,
      doStroke = false,
      doFill = true,
      radius = 3
    } = params

    this.pen = pen
    this.fill = fill
    this.doStroke = doStroke
    this.doFill = doFill
    this.radius = radius
  }

  prepareContext(ctx) {
    this.pen.prepareContext(ctx)

    ctx.fillStyle = this.fill.hex()
  }
}

class PointElement extends GraphemeElement {
  constructor(params={}) {
    super(params)

    const {
      position = new Vec2(0,0),
      style = {}
    } = params

    this.position = new Vec2(position)

    this.style = new PointElementStyle(style)
  }

  get radius() {
    return this.style.radius
  }

  set radius(value) {
    this.style.radius = value
  }

  isClick(pos) {
    return this.position.distanceSquaredTo(pos) <= (2 + this.radius + (this.style.doStroke ? this.style.pen.thickness : 0)) ** 2
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

  getBBox() {
    let cx = this.position.x
    let cy = this.position.y

    let box = new BoundingBox()

    box.height = box.width = this.radius * 2 * 1.4

    box.cx = cx
    box.cy = cy

    return box
  }
}

export { PointElement, PointElementStyle }
