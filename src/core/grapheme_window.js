import { Group as GraphemeGroup } from './grapheme_group'
import { Element as GraphemeElement } from './grapheme_element'
import { WebGLElement } from './webgl_grapheme_element'
import * as utils from './utils'
import { LabelManager } from './label_manager'

// Empty element drawn at the end of every render to copy the webgl canvas over
// if necessary LOL
const FINAL_ELEMENT = new GraphemeElement()

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
class GraphemeWindow extends GraphemeGroup {
  constructor (graphemeContext) {
    super()

    // Grapheme context this window is a child of
    this.context = graphemeContext

    // Add this window to the context's list of windows
    graphemeContext.windows.push(this)

    // Element to be put into the webpage
    this.domElement = document.createElement('div')

    // The canvas of a GraphemeWindow
    this.canvas = document.createElement('canvas')
    this.domElement.appendChild(this.canvas)

    // CSS stuffs
    this.canvas.classList.add('grapheme-canvas')
    this.domElement.classList.add('grapheme-window')

    // Get the contexts
    this.canvasCtx = this.canvas.getContext('2d')
    utils.assert(this.canvasCtx, "This browser doesn't support 2D canvas, what the heck")

    // label manager
    this.labelManager = new LabelManager(this.domElement)

    // Whether, on the drawing of a normal GraphemeElement, the webgl canvas should
    // be copied to this canvas
    this.needsContextCopy = false

    // Has the webgl canvas been prepared to fit this window?
    this.needsContextPrepared = false

    // Set the default size to 640 by 480 in CSS pixels
    this.setSize(640, 480)

    // Scale text canvas as needed due to DPR
    this.resetCanvasCtxTransform()

    this.addEventListener('dprchanged', () => this.update())
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

    // Update the parent context, in case it needs to be resized as well to fit
    // a potentially fatter canvas
    this.context.updateSize()
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

    // Delete this window from the parent context
    this.context.removeWindow(this)

    // Update the canvas size of the parent context
    this.context.updateSize()

    // Destroy the elements too, if desired
    super.destroy()

    // Delete some references
    delete this.canvas
    delete this.domElement
    delete this.canvasCtx
  }

  clear () {
    // Clear the canvas
    this.canvasCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
  }

  beforeRender (element) {
    if (element instanceof WebGLElement) {
      if (this.needsContextPrepared) {
        this.context.prepareForWindow(this)

        this.needsCanvasPrepared = false
      }

      this.needsCanvasCopy = true
    } else {
      if (this.needsContextCopy) {
        const ctx = this.canvasCtx

        ctx.save()

        ctx.resetTransform()
        ctx.imageSmoothingEnabled = false

        // Copy the glCanvas over
        ctx.drawImage(this.context.glCanvas)

        ctx.restore()

        this.needsCanvasCopy = false
      }

      this.needsCanvasPrepared = true
    }
  }

  render () {
    // Canvas may need to do some stuff
    this.needsCanvasPrepared = true
    this.needsCanvasCopy = false

    const { cssWidth, cssHeight, canvasWidth, canvasHeight, labelManager, canvasCtx } = this

    // ID of this render
    const renderID = utils.getRenderID()
    labelManager.currentRenderID = renderID

    // Render information to be given to elements. Namely,
    // dims: {cssWidth, cssHeight, canvasWidth, canvasHeight, dpr}
    // labelManager
    // canvasCtx
    // window
    const renderInfo = {
      dims: { cssWidth, cssHeight, canvasWidth, canvasHeight },
      labelManager,
      canvasCtx,
      window: this
    }

    let err // potential error in try {...} catch
    try {
      // Clear this canvas
      this.clear()

      // Render all children
      super.render(renderInfo)

      // Copy the webgl canvas over if needed
      FINAL_ELEMENT.render(renderInfo)

      // Get rid of old labels
      labelManager.cleanOldRenders()
    } catch (e) {
      err = e
    }

    if (err) throw err
  }
}

export { GraphemeWindow as Window }
