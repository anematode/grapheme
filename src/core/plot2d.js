import { InteractiveCanvas } from './interactive_canvas'
import { Plot2DTransform } from "../math/plot2d_transform.js"
import { BoundingBox } from "../math/bounding_box"
import { Vec2 } from "../math/vec.js"
import { DefaultUniverse } from "./grapheme_universe"
import { SmartLabelManager } from '../other/smart_label_manager'

/**
 * @class Plot2D
 * A generic plot in two dimensions, including a transform from plot coordinates to pixel coordinates.
 * Padding of the plot is determined by padding.top, padding.left, etc.. Interactivity like scrolling and dragging are
 * enabled via enableDrag and enableScroll.
 */
class Plot2D extends InteractiveCanvas {
  /**
   * Construct a new Plot2D
   * @param universe {GraphemeUniverse} The universe that the plot will use
   * @constructor
   */
  constructor (universe=DefaultUniverse) {
    super(universe)

    // This is the plot of itself. Meta!
    this.plot = this

    // The amount of padding on all sides of the plot, which determines the plotting box along with the canvas's size
    /** @public */ this.padding = {top: 40, right: 40, left: 40, bottom: 40}

    // The transformation from plot coordinates to pixels
    /** @public */ this.transform = new Plot2DTransform({plot: this})

    // Whether to allow movement by dragging and scrolling
    /** @public */ this.enableDrag = true
    /** @public */ this.enableScroll = true

    // smartLabelManager, used to keep track of smart label positions and keep them from intersecting
    this.extraInfo.smartLabelManager = new SmartLabelManager(this)

    // Add event listeners for mouse events
    this.addEventListener("mousedown", evt => this.mouseDown(evt))
    this.addEventListener("mouseup", evt => this.mouseUp(evt))
    this.addEventListener("mousemove", evt => this.mouseMove(evt))
    this.addEventListener("wheel", evt => this.wheel(evt))

    // When the plot changes in size, correct the transform aspect ratio
    this.addEventListener("resize", evt => {
      this.calculateTransform()
      this.transform.correctAspectRatio()
    })

    // Timeout to check for "plotcoordslingered"
    let timeout = -1

    this.addEventListener("plotcoordschanged", evt => {
      clearTimeout(timeout)

      // If plot coords haven't changed in 500 milliseconds, fire plotcoordslingered event
      timeout = setTimeout(() => {
        this.triggerEvent("plotcoordslingered")
      }, 500)
    })

    // When the space key is pressed, trigger the plot's events before the children's events,
    // which means that all mouse events except for those attached to the plot won't be called.
    this.keyboard.addEventListener("keydown- ", () => {
      this.triggerChildEventsLast = true
    })

    // When the space key is released, reset
    this.keyboard.addEventListener("keyup- ", () => {
      this.triggerChildEventsLast = false
    })

    // Calculate the transform so it's valid from the start
    this.updateSync()
  }

  /**
   * Handle mouse down events.
   * @param evt {Object} Event to handle
   * @returns {boolean} Returns true to stop propagation.
   */
  mouseDown(evt) {
    // Set where the mouse went down, in PLOT coordinates
    this.mouseDownPos = this.transform.pixelToPlot(evt.pos)
    return true
  }

  /**
   * Handle mouse up events.
   * @param evt {Object} Event to handle
   * @returns {boolean} Returns true to stop propagation.
   */
  mouseUp(evt) {
    // Mark the mouse as up
    this.mouseDownPos = null
    return true
  }

  /**
   * Handle mouse move events.
   * @param evt {Object} Event to handle
   * @returns {boolean} Returns true to stop propagation.
   */
  mouseMove(evt) {
    // If the mouse is down
    if (this.mouseDownPos) {
      // If drag is enabled
      if (this.enableDrag)
        // Move the location of the event to the original mouse down position
        this.transform._coincideDragPoints(this.mouseDownPos, evt.pos)

      return true
    }
  }

  /**
   * Handle wheel events.
   * @param evt {Object} Event to handle
   * @returns {boolean} Returns true to stop propagation
   */
  wheel(evt) {
    let scrollY = evt.rawEvent.deltaY

    if (this.enableScroll)
      this.transform.zoomOn(Math.exp(scrollY / 1000), this.transform.pixelToPlot(evt.pos))

    return true
  }

  /**
   * Called before each renderSync. We reset the smart label manager's tracking of label positions.
   * clearing the bounding boxes for the labels to take up.
   * @param info {Object} (unused)
   */
  beforeRender(info) {
    this.extraInfo.smartLabelManager.reset()
  }

  /**
   * Called after each renderSync, used to display labels that have indicated they want to be displayed on top
   * of everything. This overrides the usual precedence system.
   * @param info {Object} renderSync info
   */
  afterRender(info) {
    this.extraInfo.smartLabelManager.renderLabels(info)
  }

  /**
   * Update function
   */
  updateSync () {
    // Update the transform (the position of the plotting box)
    this.calculateTransform()
  }

  /**
   * Get a bounding box corresponding to the entire canvas
   * @returns {BoundingBox} The canvas bounding box
   */
  getCanvasBox() {
    return new BoundingBox(new Vec2(0,0), this.width, this.height)
  }

  /**
   * Calculate the plotting box, based on the canvas size and this.padding
   */
  calculateTransform () {
    this.transform.box = this.getCanvasBox().pad(this.padding)
  }
}

export { Plot2D }
