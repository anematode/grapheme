import * as utils from "./utils"

/** @class GraphemeContext Context for plots to live in. Allows WebGL rendering, variables, etc. */
class GraphemeContext {
  /**
   * Construct a new GraphemeContext
   */
  constructor() {
    this.canvases = []

    // Add this to the list of all extant contexts
    utils.CONTEXTS.push(this)
  }

  /**
   * Add canvas to this context
   * @param canvas Canvas to add
   */
  add(canvas) {
    if (canvas.context !== context)
      throw new Error("Canvas already part of a context")
    if (this.isChild(canvas))
      throw new Error("Canvas is already added to this context")

    this.canvases.push(canvas)
  }

  /**
   * Remove canvas from this context
   * @param canvas Canvas to remove
   */
  remove(canvas) {
    let index = this.canvases.indexOf(canvas)

    if (index !== -1) {
      this.canvases.splice(index, 1)
    }
  }

  /**
   * Whether canvas is a child of this context
   * @param canvas Canvas to test
   * @returns {boolean} Whether canvas is a child
   */
  isChild(canvas) {
    return this.canvases.indexOf(canvas) !== -1
  }

  /**
   * Trigger an event on all child canvases
   * @param type
   * @param event
   * @returns {boolean}
   */
  triggerEvent(type, event) {
    // Trigger event in all canvases
    for (let i = 0; i < this.canvases.length; ++i) {
      if (this.canvases[i].triggerEvent(type, event)) {
        // Stop if event stopped propagation
        return true
      }
    }

    return false
  }

  destroy() {
    utils.removeContext(this)
  }
}

export { GraphemeContext as Context}
