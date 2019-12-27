import { Element as GraphemeElement } from './grapheme_element'
import * as utils from './utils'

class GraphemeWindow extends GraphemeElement {
  constructor () {
    super()

    // Element to be put into the webpage
    this.domElement = document.createElement('div')

    // The canvas of a GraphemeWindow h
    this.canvas = document.createElement('canvas')
    this.domElement.appendChild(this.canvas)

    // CSS stuffs
    this.canvas.classList.add('grapheme-canvas')
    this.domElement.classList.add('grapheme-window')

    // Get the contexts :))
    this.canvasCtx = this.canvas.getContext('2d')
    utils.assert(this.canvasCtx, "This browser doesn't support 2D canvas, what the heck")

    // Set the default size to 640 by 480 in CSS pixels
    this.setSize(640, 480)

    // Scale text canvas as needed due to DPR
    this.resetCanvasCtxTransform()
  }

  resetCanvasCtxTransform () {
    const ctx = this.canvasCtx

    ctx.resetTransform()
    ctx.scale(utils.dpr, utils.dpr)
  }

  // Set the size of this window (including adjusting the canvas size)
  // Note that this width and height are in CSS pixels
  setSize (width, height) {
    // width and height are in CSS pixels
    this.width = width
    this.height = height

    // Update the canvas size, factoring in the device pixel ratio
    this.canvasWidth = this.width * utils.dpr
    this.canvasHeight = this.height * utils.dpr

    // Set the canvas CSS size using CSS
    const canvas = this.canvas

    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
  }

  // Returns the pixel width of the canvas
  get canvasWidth () {
    return this.canvas.width
  }

  // Returns the pixel height of the canvas
  get canvasHeight () {
    return this.canvas.height
  }

  // Sets the pixel width of the canvas
  set canvasWidth (x) {
    // Round it to an integer and make sure it's in a reasonable range
    x = Math.round(x)
    utils.assert(utils.isPositiveInteger(x) && x < 16384, 'canvas width must be in range [1,16383]')

    this.canvas.width = x
  }

  // Sets the pixel height of the canvas
  set canvasHeight (y) {
    y = Math.round(y)
    utils.assert(utils.isPositiveInteger(y) && y < 16384, 'canvas height must be in range [1,16383]')

    this.canvas.height = y
  }

  clear () {
    // Clear the canvas
    this.canvasCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
  }

  render () {
    // Canvas may need to do some stuff
    this.needsCanvasPrepared = true
    this.needsCanvasCopy = false

    const { cssWidth, cssHeight, canvasWidth, canvasHeight, canvasCtx } = this

    // Render information to be given to elements. Namely,
    // dims: {cssWidth, cssHeight, canvasWidth, canvasHeight, dpr}
    // labelManager
    // canvasCtx
    // window
    const renderInfo = {
      dims: { cssWidth, cssHeight, canvasWidth, canvasHeight },
      canvasCtx
    }

    this.resetCanvasCtxTransform()

    let err // potential error in try {...} catch
    try {
      // Clear this canvas
      this.clear()

      // Render all children
      super.render(renderInfo)
    } catch (e) {
      err = e
    }

    if (err) throw err
  }
}

export { GraphemeWindow as Window }
