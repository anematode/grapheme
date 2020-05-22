import { Group as GraphemeGroup } from './grapheme_group'
import { Element as GraphemeElement } from './grapheme_element'
import * as utils from './utils'
import { LabelManager } from './label_manager'
import { Context as GraphemeContext } from './grapheme_context'

/** @class GraphemeCanvas A viewable instance of Grapheme. Provides the information required for rendering to canvas. */
class GraphemeCanvas extends GraphemeGroup {
  /**
   * Creates a GraphemeCanvas.
   *
   * @constructor
   * @param context {GraphemeContext}
   */
  constructor (context) {
    super()

    if (!(context instanceof GraphemeContext))
      throw new Error("Given context not instance of Grapheme.Context")

    this.context = context

    this.context.add(this)

    // Element to be put into the webpage
    /** @public */ this.domElement = document.createElement('div')

    // The canvas of a GraphemeCanvas
    /** @public */ this.canvas = document.createElement('canvas')

    // Append the canvas to the dom element
    this.domElement.appendChild(this.canvas)

    // Enable CSS stuff
    this.canvas.classList.add('grapheme-canvas')
    this.domElement.classList.add('grapheme-window')

    // CanvasRenderingContext2D for this GraphemeCanvas
    /** @public */ this.ctx = this.canvas.getContext('2d')

    // If no context, throw an error
    if (!this.ctx)
      throw new Error("This browser doesn't support 2D canvas, which is required for Grapheme. Please get a competent browser.")

    // Label manager for LaTeX-enabled labels
    /** @private */ this.labelManager = new LabelManager(this.domElement)

    // Set the default size to 640 by 480 in CSS pixels
    this.setSize(640, 480)

    this.addEventListener("dprchanged", () => {
      this.setSize(this.width, this.height)
    })
  }

  /**
   * Resets the context's transform to scale up by the device pixel ratio
   */
  resetCanvasCtxTransform () {
    const ctx = this.ctx

    ctx.resetTransform()
    ctx.scale(utils.dpr, utils.dpr)
  }

  /**
   * Set the size of this GraphemeCanvas. Note that width and height are in CSS pixels.
   * @param width Desired width of canvas.
   * @param height Desired height of canvas.
   */
  setSize (width, height) {
    /** @public */ this.width = width
    /** @public */ this.height = height

    // Update the actual canvas's size, factoring in the device pixel ratio
    this.canvasWidth = this.width * utils.dpr
    this.canvasHeight = this.height * utils.dpr

    // Set the canvas's display using CSS
    const canvas = this.canvas

    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    // Scale up by device pixel ratio
    this.resetCanvasCtxTransform()

    // Trigger the resize event to let elements know to update
    this.triggerEvent("resize", {width, height})
  }

  /**
   * Get the width of the canvas in displayed pixels (not CSS pixels).
   * @returns {number} The width of the canvas.
   */
  get canvasWidth () {
    return this.canvas.width
  }

  /**
   * Get the height of the canvas in displayed pixels (not CSS pixels).
   * @returns {number} The height of the canvas.
   */
  get canvasHeight () {
    return this.canvas.height
  }

  /**
   * Set the width of the canvas in displayed pixels
   * @private
   * @param width The desired width of the canvas.
   */
  set canvasWidth (width) {
    // Round it to an integer and make sure it's in a reasonable range
    width = Math.round(width)
    utils.assert(utils.isPositiveInteger(width) && width < 16384, 'Canvas width must be in range [1,16383].')

    this.canvas.width = width
  }

  /**
   * Set the height of the canvas in displayed pixels
   * @private
   * @param height The desired height of the canvas.
   */
  set canvasHeight (height) {
    height = Math.round(height)
    utils.assert(utils.isPositiveInteger(height) && height < 16384, 'Canvas height must be in range [1,16383].')

    this.canvas.height = height
  }

  /**
   * Destroy this GraphemeCanvas
   */
  destroy () {
    // Destroy the DOM element
    this.domElement.remove()

    // Remove this canvas from context
    this.context.remove(this)

    // Destroy the elements too, if desired
    super.destroy()

    // Delete some references to allow memory to be freed immediately
    delete this.canvas
    delete this.ctx
    delete this.domElement
    delete this.labelManager
  }

  /**
   * Clear the canvas
   */
  clear () {
    this.ctx.clearRect(0, 0, this.canvasWidth / utils.dpr, this.canvasHeight / utils.dpr)
  }

  /**
   * Render this GraphemeCanvas
   */
  render () {
    const { labelManager, ctx } = this
    const plot = this

    // Set ID of this render
    labelManager.currentRenderID = utils.getRenderID()

    // Info to be given to rendered elements
    const info = { labelManager, ctx, plot }

    // Clear the canvas
    this.clear()

    // Reset the rendering context transform
    this.resetCanvasCtxTransform()

    // Render all children
    super.render(info)

    // Get rid of old labels
    labelManager.cleanOldRenders()
  }
}

export { GraphemeCanvas as Canvas }
