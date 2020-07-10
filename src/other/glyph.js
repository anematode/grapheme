import { earcut } from '../math/earcut'

class Glyph {
  constructor(vertices) {
    const triangulation = earcut(vertices)
    const triDraw = []

    for (let i = 0; i < triangulation.length; ++i) {
      let pt = triangulation[i]

      triDraw.push(vertices[2 * pt], vertices[2 * pt + 1])
    }

    this.triangulation = new Float32Array(triDraw)
  }

  scale(s) {
    const vertices = this.triangulation

    for (let i = 0; i < vertices.length; ++i) {
      vertices[i] *= s
    }

    return this
  }

  translate(x, y) {
    const vertices = this.triangulation

    for (let i = 0; i < vertices.length; i += 2) {
      vertices[i] += x
      vertices[i] += y
    }

    return this
  }

  rotate() {

  }

  clone() {
    let glyph = new Glyph([])

    glyph.triangulation = new Float32Array(this.triangulation)

    return this
  }
}

function regularPolygonGlyph(sides) {
  let vertices = []

  for (let i = 0; i <= sides; ++i) {
    let angle = 2 * Math.PI * i / sides

    vertices.push(5 * Math.cos(angle), 5 * Math.sin(angle))
  }

  return new Glyph(vertices)
}

const Glyphs = {
  CIRCLE: regularPolygonGlyph(10),
  TRIANGLE: regularPolygonGlyph(3),
  SQUARE: regularPolygonGlyph(4),
  PENTAGON: regularPolygonGlyph(5),
  X: new Glyph([])
}

export { Glyph, regularPolygonGlyph, Glyphs }
