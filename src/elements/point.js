import { Element as GraphemeElement } from '../core/grapheme_element'
import { Vec2 } from '../math/vec'
import { BoundingBox } from '../math/bounding_box'
import { Simple2DWebGLGeometry } from './webgl_geometry'
import { Glyphs } from '../other/glyph'

class PointElement extends GraphemeElement {
  constructor(params={}) {
    super(params)

    let position = params.position ? params.position : new Vec2(0, 0)

    if (!position instanceof Vec2) {
      position = new Vec2(position)
    }

    this.position = position
    this.pixelPosition = new Vec2(0, 0)
    this.geometry = new Simple2DWebGLGeometry()
    this.radius = 5
    this.glyph = params.glyph ? params.glyph : Glyphs.CIRCLE

    this.addEventListener("plotcoordschanged", () => {
      this.markUpdate()
    })
  }

  get color() {
    return this.geometry.color
  }

  set color(v) {
    this.geometry.color = v
  }

  isClick(pos) {
    return this.position.distanceSquaredTo(pos) <= (2 + this.radius + (this.style.doStroke ? this.style.pen.thickness : 0)) ** 2
  }

  update(info) {
    super.update(info)

    const plot = info.plot

    let pixelPos = this.pixelPosition = plot.transform.plotToPixel(this.position)

    this.geometry.glVertices = this.glyph.clone().translate(pixelPos.x, pixelPos.y).triangulation
  }

  render(info) {
    super.render(info)

    this.geometry.render(info)
  }

  getBBox() {
    let cx = this.pixelPosition.x
    let cy = this.pixelPosition.y

    let box = new BoundingBox()

    box.height = box.width = this.radius * 1.4

    box.cx = cx
    box.cy = cy

    return box
  }
}

export { PointElement }
