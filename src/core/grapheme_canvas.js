import { Group as GraphemeGroup } from './grapheme_group'
import * as utils from './utils'
import { LabelManager } from './label_manager'
import { DefaultUniverse, Universe } from './grapheme_universe'

/** @class GraphemeCanvas A viewable instance of Grapheme. Provides the information required for rendering to canvas,
 * as well as domElement, which is a canvas element to be added to the canvas. */
class GraphemeCanvas extends GraphemeGroup {
  /**
   * Creates a GraphemeCanvas.
   * @constructor
   * @param universe {GraphemeUniverse} Universe this canvas will be a part of
   */
  constructor (universe=DefaultUniverse) {
    super()

    if (!(universe instanceof Universe))
      throw new Error("Given universe not instance of Grapheme.Universe")

    this.universe = universe

    // Add this canvas to the given universe
    this.universe.add(this)

    // Element to be put into the webpage
    /** @public */ this.domElement = document.createElement('div')

    // The canvas of a GraphemeCanvas
    /** @private */ this.canvas = document.createElement('canvas')

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

    // When the device pixel ratio changes, resize the canvas accordingly
    this.addEventListener("dprchanged", () => {
      this.setSize(this.width, this.height)
    })

    // Object containing information to be passed to rendered elements defined by derived classes
    /** @protected */ this.extraInfo = {}
  }

  /**
   * Get the width of the canvas in displayed pixels (not CSS pixels).
   * @returns {number} The width of the canvas.
   */
  get canvasWidth () {
    return this.canvas.width
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
   * Get the height of the canvas in displayed pixels (not CSS pixels).
   * @returns {number} The height of the canvas.
   */
  get canvasHeight () {
    return this.canvas.height
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
   * Clear the canvas
   */
  clear () {
    this.ctx.clearRect(0, 0, this.width, this.height)
  }

  /**
   * Destroy this GraphemeCanvas
   */
  destroy () {
    // Destroy the DOM element
    this.domElement.remove()

    // Remove this canvas from context
    this.universe.remove(this)

    // Destroy the elements too, if desired
    super.destroy()

    // Delete some references to allow memory to be freed immediately
    delete this.canvas
    delete this.ctx
    delete this.domElement
    delete this.labelManager
  }

  updateChildren(info, criteria) {
    this.applyToChildren((child) => {
        if (criteria(child)) {
          child.update()
        }
      }, true)
  }

  /**
   * Render this GraphemeCanvas. Unlike other elements, it does not take in an "info" argument. This function
   * constructs the information needed to render the child elements.
   */
  render () {
    // Expand the universe's canvas to fit its windows, in case it is too small
    this.universe.expandToFit()

    const { labelManager, ctx } = this
    const plot = this

    // Whether the universe's canvas needs to be copied over
    let needsWebGLCopy = false

    // Function called before an element that doesn't use WebGL is rendered
    const beforeNormalRender = () => {
      if (needsWebGLCopy) {
        // Copy the universe's canvas over
        this.universe.copyToCanvas(this)

        // Mark the copy as done
        needsWebGLCopy = false

        // Clear the universe's canvas for future renders
        this.universe.clear()
      }
    }

    const beforeWebGLRender = () => {
      // Set the viewport of the universe to the entire canvas. Note that the universe canvas is not
      // scaled with the device pixel ratio, so we must use this.canvasWidth/Height instead of this.width/height.
      this.universe.gl.viewport(0, 0, this.canvasWidth, this.canvasHeight)

      // Mark that a copy is needed
      needsWebGLCopy = true
    }

    // Set ID of this render. This is used to remove DOM elements from a previous render.
    labelManager.currentRenderID = utils.getRenderID()

    const extraInfo = this.extraInfo ? this.extraInfo : {}

    // Info to be passed to rendered elements; the object passed as "info" in render(info).
    const info = {
      labelManager, // the label manager
      ctx, // The canvas context to draw to
      plot, // The plot we are drawing
      beforeNormalRender, // Callback for elements that don't use WebGL
      beforeWebGLRender, // Callback for elements that use WebGL
      universe: this.universe, // The universe to draw to (for WebGL stuff)
      ...extraInfo
    }

    // Clear the canvas
    this.clear()

    // Reset the rendering context transform
    this.resetCanvasCtxTransform()

    this.updateChildren(info, child => child.needsUpdate)

    // If this class defines a beforeRender function, call it
    if (this.beforeRender)
      this.beforeRender(info)

    // Render all children
    super.render(info)

    // If this class defines an after render function, call it
    if (this.afterRender)
      this.afterRender(info)

    // Copy over the canvas if necessary
    beforeNormalRender()

    // Get rid of old labels
    labelManager.removeOldLabels()
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
}

export { GraphemeCanvas as Canvas }
