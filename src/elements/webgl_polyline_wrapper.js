import { PolylineBase } from './polyline'
import { WebGLPolyline } from './webgl_polyline'
import * as GEOCALC from '../math/geometry_calculations'

class WebGLPolylineWrapper extends PolylineBase {
  constructor(params={}) {
    super(params)

    this._internal_polyline = new WebGLPolyline()
  }

  update() {
    this._internal_polyline.vertices = this.vertices

    const pen = this.pen

    this._internal_polyline.color = pen.color.toNumber()
    this._internal_polyline.thickness = pen.thickness / 2
    this._internal_polyline.use_native = pen.useNative

    // TODO: add other pen things

    this._internal_polyline.update()
  }

  isClick(point) {
    return this.distanceFrom(point) < Math.max(this.pen.thickness / 2, 2)
  }

  distanceFrom(point) {
    return GEOCALC.point_line_segment_min_distance(point.x, point.y, this.vertices)
  }

  closestTo(point) {
    return GEOCALC.point_line_segment_min_closest(point.x, point.y, this.vertices)
  }

  render(info) {
    this._internal_polyline.render(info)
  }
}

export {WebGLPolylineWrapper}
