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

    this.sortChildren()

    // Update if needed
    if (this.alwaysUpdate)
      this.update()

    this.children.forEach(child => child.render(info))
  }
}

export {WebGLElement}
