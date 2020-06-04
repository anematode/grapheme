import * as utils from "./utils"
import { GLResourceManager } from './gl_manager'

/** @class GraphemeUniverse Universe for plots to live in. Allows WebGL rendering, variables, etc. */
class GraphemeUniverse {
  /**
   * Construct a new GraphemeUniverse.
   * @constructor
   */
  constructor() {
    // Add this to the list of all extant universes
    utils.Universes.push(this)

    // List of canvases using this universe
    /** @private */ this.canvases = []

    // Canvas to draw
    /** @private */ this.glCanvas = window.OffscreenCanvas ? new window.OffscreenCanvas(1, 1) : document.createElement("canvas")

    // gl context
    /** @public */ this.gl = this.glCanvas.getContext("webgl")

    // gl manager
    /** @public */ this.glManager = new GLResourceManager(this.gl)

    if (!this.gl)
      throw new Error("Grapheme needs WebGL to run! Sorry.")
  }

  /**
   * Clear the WebGL canvas for rendering.
   */
  clear() {
    let gl = this.gl

    // Set the clear color to transparent black
    gl.clearColor(0,0,0,0)

    // Clear the canvas
    gl.clear(gl.COLOR_BUFFER_BIT)
  }

  /**
   * Copy the contents of the WebGL canvas on top of the plot canvas
   * @param canvas {GraphemeCanvas}
   */
  copyToCanvas(canvas) {
    const ctx = canvas.ctx

    // Set the canvas transform to identity (since this.glCanvas does not factor in the device pixel ratio)
    ctx.resetTransform()

    // Draw the glCanvas to the plot canvas with drawImage
    ctx.drawImage(this.glCanvas, 0, 0)

    // Reset the canvas transform
    canvas.resetCanvasCtxTransform()
  }

  /**
   * Set the size of the canvas to width and height. This is used internally; the user should never have to call it.
   * @param width {number} The width of the canvas.
   * @param height {number} The height of the canvas.
   * @private
   */
  _setSize(width, height) {
    const glCanvas = this.glCanvas

    glCanvas.width = width
    glCanvas.height = height
  }

  /**
   * Expand the canvas to fit the max dimensions of all governed canvases. Called every time a canvas is rendered, so it
   * ought to be fast.
   */
  expandToFit() {
    let maxWidth = 1
    let maxHeight = 1

    for (let i = 0; i < this.canvases.length; ++i) {
      let canvas = this.canvases[i]

      // Set max dims. Note we use canvasWidth/Height instead of width/height because glCanvas does not factor in dpr.
      if (canvas.canvasWidth > maxWidth)
        maxWidth = canvas.canvasWidth
      if (canvas.canvasHeight > maxHeight)
        maxHeight = canvas.canvasHeight
    }

    this._setSize(maxWidth, maxHeight)
  }

  /**
   * Add canvas to this universe
   * @param canvas {GraphemeCanvas} Canvas to add to this universe
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

    if (index !== -1)
      this.canvases.splice(index, 1)
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
   * @param type {string} The type of the event
   * @param event {Object} The event to pass to canvases
   * @returns {boolean} Whether an event handler stopped propagation.
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

  /**
   * Destroy this universe and all of its canvases
   */
  destroy() {
    // Remove universe from list of universes handled by utils
    utils.removeUniverse(this)

    // Destroy all child canvases
    this.canvases.forEach(canvas => canvas.destroy())
  }
}

// The DefaultUniverse is the default universe that plots use. Other universes can be used by creating them, then passing
// them in the constructor to the plot. Because the number of WebGL contexts per page is limited to six, it's best to just
// use the DefaultUniverse; an unlimited number of plots can use the same universe, and the number of Canvas2DRendering
// contexts per page is not capped.
const DefaultUniverse = new GraphemeUniverse()

export { GraphemeUniverse as Universe, DefaultUniverse }
