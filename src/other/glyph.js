import { Vec2 } from '../math/vec2'

// A glyph to be fill drawn in some fashion.
class Glyph {
  constructor (params = {}) {
    // vertices is array of Vec2s
    const { vertices = [] } = params
    this.vertices = vertices
  }

  addGlyphToPath (path, x = 0, y = 0, scale = 1, angle = 0) {
    const vertices = this.vertices

    const translateV = new Vec2(x, y)

    // Nothing to draw
    if (vertices.length < 2) {
      return
    }

    const p1 = vertices[0].scale(scale).rotate(angle).add(translateV)
    let jumpToNext = false

    path.moveTo(p1.x, p1.y)

    for (let i = 1; i < vertices.length; ++i) {
      const p = vertices[i].scale(scale).rotate(angle).add(translateV)

      if (p.hasNaN()) {
        jumpToNext = true
        continue
      }

      if (jumpToNext) {
        jumpToNext = false
        path.moveTo(p.x, p.y)
      } else path.lineTo(p.x, p.y)
    }

    path.closePath()
  }

  getGlyphPath2D (x = 0, y = 0, scale = 1, angle = 0) {
    const path = new Path2D()

    this.addGlyphToPath(path, x, y, scale, angle)

    return path
  }
}

export { Glyph }
