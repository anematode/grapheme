import { Glyph } from './glyph'
import { Vec2 } from '../math/vec'

/**
A glyph which creates an arrowhead. Tells you where the arrowhead will be with a Path2D
return value, but also tells you where the base of the arrowhead is so that you can join it
up properly.

length is the length of the arrowhead, from tip to tail */
class Arrowhead extends Glyph {
  constructor (params = {}) {
    super(params)

    const { length = 0 } = params
    this.length = length
  }

  addPath2D (path, x1, y1, x2, y2, thickness) {
    const arrowTipAt = new Vec2(x2, y2)
    const displacement = new Vec2(x1, y1).subtract(arrowTipAt).unit().scale(this.length)

    this.addGlyphToPath(path, x2, y2, 2 * thickness, Math.atan2(y2 - y1, x2 - x1))

    return arrowTipAt.add(displacement)
  }
}

export { Arrowhead }
