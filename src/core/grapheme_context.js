import { Window as GraphemeWindow } from './grapheme_window'
import { GLResourceManager } from './gl_manager'
import * as utils from './utils'

class GraphemeContext {
  constructor () {
    // Creates an offscreen canvas to draw to, with an initial size of 1x1
    this.glCanvas = OffscreenCanvas ? new OffscreenCanvas(1, 1) : document.createElement('canvas')

    // Create the webgl context!
    const gl = this.gl = this.glCanvas.getContext('webgl') || this.glCanvas.getContext('experimental-webgl')

    // The gl context must exist, otherwise Grapheme will be pissed (that rhymed)
    utils.assert(gl, 'Grapheme requires WebGL to run; please get a competent browser')

    // The gl resource manager for this context
    this.glManager = new GLResourceManager(gl)

    // The list of windows that this context has jurisdiction over
    this.windows = []

    // Add this to the list of contexts to receive event updates and such
    utils.CONTEXTS.push(this)
  }

  // Set the drawing viewport on glCanvas
  setViewport (width, height, x = 0, y = 0, setScissor = true) {
    const gl = this.gl

    // Check to make sure the viewport dimensions are acceptable
    utils.assert(utils.isPositiveInteger(width) && utils.isPositiveInteger(height) &&
      utils.isNonnegativeInteger(x) && utils.isNonnegativeInteger(y),
    'x, y, width, height must be integers greater than 0 (or = for x,y)')
    utils.assert(x + width <= this.canvasWidth && y + height <= this.canvasHeight, 'viewport must be within canvas bounds')

    // Set the gl viewport accordingly
    gl.viewport(x, y, width, height)

    // If desired, enable scissoring over that rectangle
    if (setScissor) {
      gl.enable(gl.SCISSOR_TEST)
      this.gl.scissor(x, y, width, height)
    } else {
      gl.disable(gl.SCISSOR_TEST)
    }
  }

  prepareForWindow (window) {
    const gl = this.gl

    this.setViewport(window.canvasWidth, window.canvasHeight)

    gl.clearColor(0, 0, 0, 0)
    gl.clearDepth(1)

    // Clear depth and color buffers
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  }

  get canvasHeight () {
    return this.glCanvas.height
  }

  get canvasWidth () {
    return this.glCanvas.width
  }

  set canvasHeight (y) {
    y = Math.round(y)

    utils.assert(utils.isPositiveInteger(y) && y < 16384, 'canvas height must be in range [1,16383]')
    this.glCanvas.height = y
  }

  set canvasWidth (x) {
    x = Math.round(x)

    utils.assert(utils.isPositiveInteger(x) && x < 16384, 'canvas width must be in range [1,16383]')
    this.glCanvas.width = x
  }

  onDPRChanged () {
    this.windows.forEach((window) => window.onDPRChanged())
  }

  isDestroyed () {
    return utils.CONTEXTS.indexOf(this) === -1
  }

  // Destroy this context
  destroy () {
    if (this.isDestroyed()) return

    // Remove from lists of contexts
    const index = utils.CONTEXTS.indexOf(this)
    index !== -1 && utils.CONTEXTS.splice(index, 1)

    // Destroy all children
    this.windows.forEach((window) => window.destroy())

    // destroy resource manager
    this.glManager.destroy()

    // Free up canvas space immediately
    this.canvasWidth = 1
    this.canvasHeight = 1

    // Delete references to various stuff
    delete this.glManager
    delete this.glCanvas
    delete this.gl
  }

  // Create a window using this context
  createWindow () {
    return new GraphemeWindow(this)
  }

  // Remove a window from this context
  removeWindow (window) {
    const allWindows = this.context.windows
    const thisIndex = allWindows.indexOf(window)

    if (thisIndex !== -1) {
      allWindows.splice(thisIndex, 1)
      if (window.context) {
        window.context = null
      }
    }
  }

  // Update the size of this context based on the maximum size of its windows
  updateSize () {
    let maxWidth = 1
    let maxHeight = 1

    // Find the max width and height (independently)
    this.windows.forEach((window) => {
      if (window.canvasWidth > maxWidth) {
        maxWidth = window.canvasWidth
      }

      if (window.canvasHeight > maxHeight) {
        maxHeight = window.canvasHeight
      }
    })

    // Set the canvas size accordingly
    this.canvasHeight = maxHeight
    this.canvasWidth = maxWidth
  }
}

export { GraphemeContext as Context }
