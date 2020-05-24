import { WebGLElement } from './webgl_grapheme_element'

class WebGLBasicElement extends WebGLElement {
  constructor(params={}) {
    super(params)

    this._gl_vertices = null
    this._gl_vertex_count = 0
    this.drawMode = "TRIANGLE_STRIP"
  }

  render(info) {

  }
}

export { WebGLBasicElement }
