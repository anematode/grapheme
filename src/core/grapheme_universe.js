import * as utils from "./utils"
import { GLResourceManager } from './gl_manager'

/** @class GraphemeUniverse universe for plots to live in. Allows WebGL rendering, variables, etc. */
class GraphemeUniverse {
  /**
   * Construct a new GraphemeUniverse
   */
  constructor() {
    this.canvases = []

    // Add this to the list of all extant universes
    utils.Universes.push(this)

    this.glCanvas = window.OffscreenCanvas ? new window.OffscreenCanvas(1,1) : document.createElement("canvas")
    this.glCtx = this.glCanvas.getContext("webgl")
    this.glManager = new GLResourceManager(this.glCtx)

    if (!this.glCtx)
      throw new Error("Grapheme needs WebGL to run! Sorry.")
  }

  clear() {
    let gl = this.glCtx

    gl.clearColor(0,0,0,0)
    gl.clear(gl.COLOR_BUFFER_BIT)
  }

  copyToCanvas(graphemeCanvas) {
    graphemeCanvas.ctx.drawImage(this.glCanvas, 0, 0)
  }

  _setSize(width, height) {
    const glCanvas = this.glCanvas

    if (width !== glCanvas.width) {
      glCanvas.width = width
    }

    if (height !== glCanvas.height) {
      glCanvas.height = height
    }
  }

  expandToFit() {
    let maxWidth = 1
    let maxHeight = 1

    for (let i = 0; i < this.canvases.length; ++i) {
      let canvas = this.canvases[i]

      if (canvas.width > maxWidth)
        maxWidth = canvas.width
      if (canvas.height > maxHeight)
        maxHeight = canvas.height
    }

    this._setSize(maxWidth, maxHeight)
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

const DefaultUniverse = new GraphemeUniverse()

export { GraphemeUniverse as Universe, DefaultUniverse }
