import { Element as GraphemeElement } from "../core/grapheme_element"
import * as GEOCALC from '../math/geometry_algorithms'
import { Pen } from '../styles/pen'
import { nextPowerOfTwo, calculatePolylineVertices } from '../math/polyline_triangulation'
import { BoundingBox } from '../math/bounding_box'
import { Vec2 } from '../math/vec'
import { getDashedPolyline } from '../math/dashed_polyline'
import { Simple2DWebGLGeometry } from './webgl_geometry'


// polyline primitive in Cartesian coordinates
// has thickness, vertex information, and color stuff
class WebGLPolyline extends GraphemeElement {
  constructor (params = {}) {
    super(params)

    this.vertices = params.vertices ? params.vertices : [] // x,y values in pixel space
    this.pen = params.pen ? params.pen : new Pen()

    this.geometry = new Simple2DWebGLGeometry()
  }

  _calculateTriangles (box) {
    let result = calculatePolylineVertices(this.vertices, this.pen, box)

    this.geometry.glVertices = result.glVertices
  }

  _calculateNativeLines (box) {
    let vertices = this.vertices

    if (this.pen.dashPattern.length !== 0) {
      vertices = getDashedPolyline(vertices, this.pen, box)
    }

    let glVertices = new Float32Array(vertices.length)

    if (Array.isArray(vertices)) {
      for (let i = 0; i < vertices.length; ++i) {
        glVertices[i] = vertices[i]
      }
    } else {
      glVertices.set(vertices)
    }

    this.geometry.glVertices = glVertices
  }

  updateAsync(progress) {

  }

  update (info) {
    super.update()

    let box, thickness = this.pen.thickness

    if (info) {
      box = info.plot.getCanvasBox().pad({
        left: -thickness,
        right: -thickness,
        top: -thickness,
        bottom: -thickness
      })
    } else {
      // ANNOYING! This should never be the case these days
      box = new BoundingBox(new Vec2(0, 0), 8192, 8192).pad({
        left: -thickness,
        right: -thickness,
        top: -thickness,
        bottom: -thickness
      })
    }

    if (this.pen.useNative) {
      // use native LINE_STRIP for extreme speed
      this._calculateNativeLines(box)
    } else {

      this._calculateTriangles(box)
    }

    this.geometry.needsBufferCopy = true
  }

  isClick (point) {
    return this.distanceFrom(point) < Math.max(this.pen.thickness / 2, 2)
  }

  distanceFrom (point) {
    return GEOCALC.pointLineSegmentMinDistance(point.x, point.y, this.vertices)
  }

  closestTo (point) {
    return GEOCALC.pointLineSegmentClosest(point.x, point.y, this.vertices)
  }

  render (info) {
    super.render(info)

    this.geometry.color = this.pen.color

    if (this.pen.useNative) {
      this.geometry.renderMode = "line_strip"
    } else {
      this.geometry.renderMode = "triangle_strip"
    }

    this.geometry.render(info)
  }

  destroy () {
    this.geometry.destroy()
  }
}

export { WebGLPolyline }
