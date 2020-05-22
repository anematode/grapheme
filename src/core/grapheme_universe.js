import * as utils from "./utils"

/** @class GraphemeUniverse universe for plots to live in. Allows WebGL rendering, variables, etc. */
class GraphemeUniverse {
  /**
   * Construct a new GraphemeUniverse
   */
  constructor() {
    this.canvases = []

    // Add this to the list of all extant universes
    utils.Universes.push(this)
  }

  /**
   * Add canvas to this universe
   * @param canvas Canvas to add
   */
  add(canvas) {
    if (canvas.universe !== this)
      throw new Error("Canvas already part of a universe")
    if (this.isChild(canvas))
      throw new Error("Canvas is already added to this universe")

    this.canvases.push(canvas)
  }

  /**
   * Remove canvas from this universe
   * @param canvas Canvas to remove
   */
  remove(canvas) {
    let index = this.canvases.indexOf(canvas)

    if (index !== -1) {
      this.canvases.splice(index, 1)
    }
  }

  /**
   * Whether canvas is a child of this universe
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
    utils.removeUniverse(this)
  }
}

export { GraphemeUniverse as Universe}
