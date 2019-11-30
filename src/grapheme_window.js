import { Group as GraphemeGroup } from './grapheme_group'
import * as utils from './utils'
import { rgba } from './color'
import {LabelManager} from "./label_manager"

const DEFAULT_SIZE = [640, 480]

/** A grapheme window is an actual viewable instance of Grapheme.
That is, it is a div that can be put into the DOM and manipulated (and seen).

Properties:
domElement = the div that the user adds to the webpage
glCanvas = the bitmap canvas that gl stuff is copied to
textCanvas = the canvas that text and stuff is done on
context = the parent Grapheme.Context of this window
glCanvasContext = the ImageBitmapRenderingContext associated with the glCanvas
textCanvasContext = the Canvas2DRenderingContext associated with the textCanvas
*/
class GraphemeWindow extends GraphemeGroup {
  constructor (graphemeContext) {
    super()

    // Grapheme context this window is a child of
    this.context = graphemeContext

    // Element to be put into the webpage
    this.domElement = document.createElement('div')

    // The two canvases of a GraphemeWindow
    this.mainCanvas = document.createElement('canvas')
    this.domElement.appendChild(this.mainCanvas)
    this.textCanvas = document.createElement('canvas')
    this.domElement.appendChild(this.textCanvas)

    // CSS stuffs
    this.mainCanvas.classList.add('grapheme-canvas')
    this.textCanvas.classList.add('grapheme-text-canvas')
    this.domElement.classList.add('grapheme-window')

    // Get the contexts
    this.mainCanvasContext = this.mainCanvas.getContext('bitmaprenderer')
    this.textCanvasContext = this.textCanvas.getContext('2d')

    // The color of the background
    this.backgroundColor = rgba(0, 0, 0, 0)

    // label manager
    this.labelManager = new LabelManager(this.domElement)

    // Add this window to the context's list of window
    graphemeContext.windows.push(this)

    // Set the default size to 640 by 480 in CSS pixels
    this.setSize(...DEFAULT_SIZE)

    // Scale text canvas as needed due to DPR
    this._scaleTextCanvasToDPR()
  }

  _scaleTextCanvasToDPR () {
    const ctx = this.textCanvasContext

    for (let i = 0; i < 5; ++i) { // pop off any canvas transforms from the stack
      ctx.restore()
    }

    ctx.scale(utils.dpr, utils.dpr)
    ctx.save()
  }

  // Set the size of this window (including adjusting the canvas size)
  // Note that this width and height are in
  setSize (width, height) {
    // cssWidth and cssHeight are in CSS pixels
    this.cssWidth = width
    this.cssHeight = height

    // Update the canvas size, factoring in the device pixel ratio
    this._updateCanvasSize();

    // Set the canvas CSS size using CSS
    [this.mainCanvas, this.textCanvas].forEach((canvas) => {
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
    })

    // Update the parent context, in case it needs to be resized as well to fit
    // a potentially fatter canvas
    this.context.updateSize()
  }

  // Set the actual canvas pixel size based on the desired width and the DPR
  _updateCanvasSize () {
    this.canvasWidth = this.cssWidth * utils.dpr
    this.canvasHeight = this.cssHeight * utils.dpr
  }

  // Returns the pixel width of the canvas
  get canvasWidth () {
    return this.mainCanvas.width
  }

  // Returns the pixel height of the canvas
  get canvasHeight () {
    return this.mainCanvas.height
  }

  // Sets the pixel width of the canvas
  set canvasWidth (x) {
    // Round it to an integer and make sure it's in a reasonable range
    x = Math.round(x)
    utils.assert(utils.isPositiveInteger(x) && x < 16384, 'canvas width must be in range [1,16383]')

    this.mainCanvas.width = x
    this.textCanvas.width = x
  }

  // Sets the pixel height of the canvas
  set canvasHeight (x) {
    x = Math.round(x)
    utils.assert(utils.isPositiveInteger(x) && x < 16384, 'canvas height must be in range [1,16383]')

    this.mainCanvas.height = x
    this.textCanvas.height = x
  }

  // Event triggered when the device pixel ratio changes
  _onDPRChanged () {
    this._updateCanvasWidth()
    this._scaleTextCanvasToDPR()
  }

  // Destroy this window.
  destroy () {
    // Destroy the domElement
    try {
      this.domElement.parentNode.remove(this.domElement)
    } catch (e) {}

    // Delete this window from the parent context
    this.context._removeWindow(this)

    // Update the canvas size of the parent context
    this.context.updateSize()

    // Destroy the elements too, if desired
    super.destroy()

    // Delete some references
    delete this.mainCanvas
    delete this.domElement
    delete this.textCanvas
    delete this.mainCanvasContext
    delete this.textCanvasContext
  }

  isActive () {
    return (this.context.activeWindow === this)
  }

  clearToColor (color = this.backgroundColor) {
    utils.assert(this.isActive(), 'Window is not currently being rendered')

    // color.r, color.g, color.b, color.a
    const glColor = color.glColor()

    const gl = this.context.glContext

    gl.clearColor(glColor.r, glColor.g, glColor.b, glColor.a)
    gl.clear(gl.COLOR_BUFFER_BIT)

    // Clear the text canvas
    this.textCanvasContext.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
  }
  
  render () {
    // Set the active window to this window, since this is the window being rendered
    this.context.activeWindow = this

    // ID of this render
    const renderID = utils.generateUUID()

    let err // potential error in try {...} catch
    const { glCanvas } = this.context

    const width = this.cssWidth;
    const height = this.cssHeight
    const textWidth = this.canvasWidth;
    const textHeight = this.canvasHeight;

    // Render information to be given to elements
    const renderInfo = {
      gl: this.context.glContext,
      glResourceManager: this.context.glResourceManager,
      labelManager: this.labelManager,
      text: this.textCanvasContext,
      textCanvas: this.textCanvas,
      width,
      height,
      textWidth,
      textHeight
    }

    this.labelManager.currentRenderID = renderID
    try {
      // Set the viewport to this canvas's size
      this.context.setViewport(textWidth, textHeight)

      // clear the canvas
      this.clearToColor()

      // sort our elements by drawing precedence
      this.sortChildrenByPrecedence()

      super.render(renderInfo)

      // Copy the canvas to this canvas
      const glBitmap = glCanvas.transferToImageBitmap()
      this.mainCanvasContext.transferFromImageBitmap(glBitmap)

      this.labelManager.cleanOldRenders()
    } catch (e) {
      err = e
    } finally {
      this.context.activeWindow = null
    }

    if (err) throw err
  }
}

export { GraphemeWindow as Window }
