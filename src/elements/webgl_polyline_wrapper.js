import { PolylineBase } from './polyline'
import { WebGLPolyline } from './webgl_polyline'

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

  render(info) {
    this._internal_polyline.render(info)
  }
}

export {WebGLPolylineWrapper}
