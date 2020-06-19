import { Element as GraphemeElement } from './grapheme_element'
import * as utils from "./utils"

/**
 * @class WebGLElement An element that supports WebGL rendering.
 */
class WebGLElement extends GraphemeElement {
  /**
   * Construct a new WebGLElement
   * @param params Parameters
   */
  constructor(params={}) {
    super(params)

    // id used for things like WebGL buffers
    /** @protected */ this.id = utils.generateUUID()
  }

  /**
   *
   * @param info {Object} The render info
   * @param info.beforeWebGLRender {Function} Prepare the universe for WebGL drawing
   */
  render(info) {
    // Call beforeWebGLRender()
    info.beforeWebGLRender()

    // Sort this element's children. We don't want to call super.render() because that will run beforeNormalRender
    this.sortChildren()

    // Update if needed
    if (this.alwaysUpdate)
      this.update()

    // Render all children
    this.children.forEach(child => child.render(info))
  }
}

export { WebGLElement }
