import {Element as GraphemeElement} from "../core/grapheme_element.js"
import { Pen } from '../styles/pen'
import * as utils from "../core/utils"
import { Arrowheads } from '../other/arrowheads'

class PolylineBase extends GraphemeElement {
  constructor (params = {}) {
    super(params)

    let {
      pen,
      vertices = []
    } = params

    if (!(pen instanceof Pen)) {
      pen = new Pen(style || {})
    }

    this.pen = pen
    this.vertices = vertices
  }
}


class PolylineElement extends PolylineBase {
  constructor (params = {}) {
    super(params)

    this.mainPath = null
    this.arrowPath = null
  }

  update () {
    const path = new Path2D()
    this.mainPath = path

    const arrowPath = new Path2D()
    this.arrowPath = arrowPath

    let vertices = this.vertices

    if (this.vertices[0] && (this.vertices[0].x || Array.isArray(this.vertices[0]))) {
      vertices = utils.flattenVectors(vertices)
    }

    // Nothing to draw
    if (vertices.length < 4) {
      return
    }

    const coordinateCount = vertices.length
    const { arrowLocations, thickness } = this.pen

    const arrowhead = Arrowheads[this.pen.arrowhead]

    const inclStart = arrowLocations.includes('start') && arrowhead
    const inclSubstart = arrowLocations.includes('substart') && arrowhead
    const inclEnd = arrowLocations.includes('end') && arrowhead
    const inclSubend = arrowLocations.includes('subend') && arrowhead

    let x2 = NaN
    let x3 = NaN

    let y2 = NaN
    let y3 = NaN

    for (let i = 0; i <= coordinateCount; i += 2) {
      // [x1, y1] = previous vertex (p1), [x2, y2] = current (p2), [x3, y3] = next (p3)
      // If any of these is NaN, that vertex is considered undefined
      const x1 = x2
      x2 = x3
      x3 = (i === coordinateCount) ? NaN : vertices[i]

      const y1 = y2
      y2 = y3
      y3 = (i === coordinateCount) ? NaN : vertices[i + 1]

      if (i === 0) continue

      const isStartingEndcap = Number.isNaN(x1)
      const isEndingEndcap = Number.isNaN(x3)

      if (isStartingEndcap && ((i === 1 && inclStart) || inclSubstart)) {
        const newV = arrowhead.addPath2D(arrowPath, x3, y3, x2, y2, thickness)
        path.moveTo(newV.x, newV.y)
      } else if (isEndingEndcap && ((i === coordinateCount && inclEnd) || inclSubend)) {
        const newV = arrowhead.addPath2D(arrowPath, x1, y1, x2, y2, thickness)
        path.lineTo(newV.x, newV.y)
      } else if (isStartingEndcap) {
        path.moveTo(x2, y2)
      } else {
        path.lineTo(x2, y2)
      }
    }
  }

  render (info) {
    super.render(info)

    const ctx = info.ctx

    this.pen.prepareContext(ctx)
    ctx.stroke(this.mainPath)
    ctx.fill(this.arrowPath)
  }
}

export { PolylineElement }
