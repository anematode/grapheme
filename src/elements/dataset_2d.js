import { Glyphs } from '../other/glyph'
import { Simple2DWebGLGeometry } from './webgl_geometry'
import { Element as GraphemeElement } from '../core/grapheme_element'

class Dataset2D extends GraphemeElement {
  constructor(params={}) {
    super(params)

    this.glyph = Glyphs.CIRCLE

    this.points = []
    this.pixelPoints = []

    this.geometry = new Simple2DWebGLGeometry()

    this.color = this.geometry.color

    this.clickRadius = 5

    this.addEventListener("plotcoordschanged", () => this.markUpdate())
  }

  update(info) {
    let triangulation = this.glyph.triangulation
    let triVertices = new Float32Array(triangulation.length * this.points.length / 2)

    const points = this.pixelPoints = this.points.slice()

    info.plot.transform.plotToPixelArr(points)

    let index = 0

    for (let i = 0; i < points.length; i += 2) {
      let x = points[i]
      let y = points[i+1]

      for (let j = 0; j < triangulation.length; j += 2) {
        triVertices[index++] = triangulation[j] + x
        triVertices[index++] = triangulation[j+1] + y
      }
    }

    this.geometry.glVertices = triVertices
    this.geometry.needsBufferCopy = true
  }

  render(info) {
    super.render(info)

    this.geometry.render(info)
  }

  isClick(v) {
    return this.distanceFrom(v) < this.clickRadius
  }

  distanceFrom(v) {
    let minDis = Infinity

    for (let i = 0; i < this.pixelPoints.length; i += 2) {
      let x = this.pixelPoints[i]
      let y = this.pixelPoints[i + 1]

      let xd = v.x - x, yd = v.y - y

      let disSquared = xd * xd + yd * yd

      if (disSquared < minDis)
        minDis = disSquared
    }

    return minDis
  }

  destroy() {
    this.geometry.destroy()
  }
}

export { Dataset2D }
