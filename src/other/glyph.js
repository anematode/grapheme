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
      vertices[i+1] += y
    }

    return this
  }

  rotate(angle) {
    const vertices = this.triangulation

    let c = Math.cos(angle), s = Math.sin(angle)

    for (let i = 0; i < vertices.length; i += 2) {
      let x = vertices[i]
      let y = vertices[i + 1]

      vertices[i] = x * c - y * s
      vertices[i + 1] = y * c + x * s
    }

    return this
  }


  clone() {
    let glyph = new Glyph([])

    glyph.triangulation = new Float32Array(this.triangulation)

    return glyph
  }
}

function regularPolygonGlyph(sides) {
  let vertices = []

  for (let i = 0; i <= sides; ++i) {
    let angle = 2 * Math.PI * i / sides - Math.PI / 2

    vertices.push(5 * Math.cos(angle), 5 * Math.sin(angle))
  }

  return new Glyph(vertices)
}

function alternatingPolygonGlyph(radii, sides) {
  let vertices = []
  let radCount = radii.length

  for (let i = 0; i <= sides; ++i) {
    let angle = 2 * Math.PI * i / sides - Math.PI / 2

    let radius = radii[i % radCount]

    vertices.push(radius * Math.cos(angle), radius * Math.sin(angle))
  }

  return new Glyph(vertices)
}

const Glyphs = {
  CIRCLE: regularPolygonGlyph(10),
  TRIANGLE: regularPolygonGlyph(3),
  SQUARE: regularPolygonGlyph(4),
  PENTAGON: regularPolygonGlyph(5),
  X: new Glyph([1, 0, 5, 4, 4, 5, 0, 1, -4, 5, -5, 4, -1, 0, -5, -4, -4, -5, 0, -1, 4, -5, 5, -4, 1, 0]),
  STAR: alternatingPolygonGlyph([10, 4], 10)
}

export { Glyph, regularPolygonGlyph, Glyphs }
