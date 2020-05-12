import { Glyph } from './glyph'
import { Vec2 } from '../math/vec2'

/**
A glyph which creates an arrowhead. Tells you where the arrowhead will be with a Path2D
return value, but also tells you where the base of the arrowhead is so that you can join it
up properly.

Use glyph vertices with thickness 2 */
class Arrowhead extends Glyph {
  constructor (params = {}) {
    super(params)

    const { length = 0 } = params
    this.length = length
  }

  getPath2D (x1, y1, x2, y2, thickness) { // draw an arrow at x2, y2 facing away from x1, y1
    const path = new Path2D()
    const pos = this.addPath2D(path, x1, y1, x2, y2, thickness)

    return {
      path, pos
    }
  }

  addPath2D (path, x1, y1, x2, y2, thickness) {
    const arrowTipAt = new Vec2(x2, y2)
    const displacement = new Vec2(x1, y1).subtract(arrowTipAt).unit().scale(this.length)

    this.addGlyphToPath(path, x2, y2, 2 * thickness, Math.atan2(y2 - y1, x2 - x1))

    return arrowTipAt.add(displacement)
  }
}

export { Arrowhead }
