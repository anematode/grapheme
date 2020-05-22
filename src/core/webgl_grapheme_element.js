import { Element as GraphemeElement } from './grapheme_element'
import * as utils from "./utils"

class WebGLElement extends GraphemeElement {
  constructor(params={}) {
    super(params)

    this.id = utils.generateUUID()
  }

  render(info) {
    if (info.beforeWebGLRender)
      info.beforeWebGLRender()
  }
}

export {WebGLElement}
