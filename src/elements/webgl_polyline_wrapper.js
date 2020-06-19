import { PolylineBase } from './polyline'
import { WebGLPolyline } from './webgl_polyline'
import * as GEOCALC from '../math/geometry_calculations'

class WebGLPolylineWrapper extends PolylineBase {
  constructor(params={}) {
    super(params)

    this.internal = new WebGLPolyline()
  }

  updateSync() {
    const internal = this.internal

    internal.vertices = this.vertices

    const pen = this.pen

    internal.color = pen.color.toNumber()
    internal.thickness = pen.thickness / 2
    internal.use_native = pen.useNative
    internal.visible = pen.visible
    internal.endcap_type = (pen.endcap === "round") ? 1 : 0

    // TODO: add other pen things

    internal.updateSync()
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

  renderSync(info) {
    this.internal.renderSync(info)
  }
}

export {WebGLPolylineWrapper}
