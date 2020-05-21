import { Group as GraphemeGroup } from './grapheme_group'
import { Element as GraphemeElement } from './grapheme_element'
import * as utils from './utils'
import { LabelManager } from './label_manager'

/** A grapheme window is an actual viewable instance of Grapheme.
That is, it is a div that can be put into the DOM and manipulated (and seen).

Properties:
domElement = the div that the user adds to the webpage
textCanvas = the canvas that text and stuff is done on
context = the parent Grapheme.Context of this window
textCanvasContext = the Canvas2DRenderingContext associated with the textCanvas
cssWidth, cssHeight = the size of the canvas in CSS pixels
canvasWidth, canvasHeight = the actual size of the canvas in pixels
*/
class GraphemeCanvas extends GraphemeGroup {
  constructor (params={}) {
    super(params)

    // Element to be put into the webpage
    this.domElement = document.createElement('div')

    // The canvas of a GraphemeWindow
    this.canvas = document.createElement('canvas')
    this.domElement.appendChild(this.canvas)

    // CSS stuffs
    this.canvas.classList.add('grapheme-canvas')
    this.domElement.classList.add('grapheme-window')

    // Get the contexts
    this.ctx = this.canvas.getContext('2d')
    utils.assert(this.ctx, "This browser doesn't support 2D canvas, what the heck")

    // label manager
    this.labelManager = new LabelManager(this.domElement)

    // Set the default size to 640 by 480 in CSS pixels
    this.setSize(640, 480)

    // Scale canvas as needed due to DPR
    this.resetCanvasCtxTransform()

    this.addEventListener('dprchanged', () => {
      this.update();
      return true;
    })
  }

  resetCanvasCtxTransform () {
    const ctx = this.ctx

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

    this.triggerEvent("resize", {width, height})
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

  // Event triggered when the device pixel ratio changes
  onDPRChanged () {
    // This will resize the canvas accordingly
    this.setSize(this.width, this.height)

    this.resetCanvasCtxTransform()
  }

  // Destroy this window.
  destroy () {
    // Destroy the domElement
    this.domElement.remove()

    // Destroy the elements too, if desired
    super.destroy()

    // Delete some references
    delete this.canvas
    delete this.domElement
    delete this.ctx
  }

  clear () {
    // Clear the canvas
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
  }

  render () {
    const { labelManager, ctx } = this

    // ID of this render
    labelManager.currentRenderID = utils.getRenderID()

    // Render information to be given to elements. Namely,
    // labelManager
    // ctx
    // window
    const info = {
      labelManager,
      ctx,
      plot: this
    }

    this.resetCanvasCtxTransform()

    let err // potential error in try {...} catch
    try {
      // Clear this canvas
      this.clear()

      // Render all children
      super.render(info)

      // Get rid of old labels
      labelManager.cleanOldRenders()
    } catch (e) {
      err = e
    }

    if (err) throw err
  }
}

export { GraphemeCanvas as Canvas }
