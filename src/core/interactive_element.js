import { Element as GraphemeElement } from "./grapheme_element"
import {InteractiveCanvas} from './interactive_canvas'

const listenerKeys = ["click", "mousemove", "mousedown", "mouseup", "wheel"]

/** @class InteractiveElement An element which takes up space a plot and supports an "isClick" function.
 * Used exclusively for 2D plots (3D plots will have a raycasting system).
 */
class InteractiveElement extends GraphemeElement {
  /**
   * Construct an InteractiveElement
   * @param params
   * @param params.interactivityEnabled {boolean} Whether interactivity is enabled
   */
  constructor(params={}) {
    super(params)

    const {
      interactivityEnabled = false
    } = params
    this.interactivityEnabled = interactivityEnabled
  }

  /**
   * Get whether interactivity is enabled
   * @returns {boolean} Whether interactivity is enabled
   */
  get interactivityEnabled() {
    return this.interactivityListeners && Object.keys(this.interactivityListeners).length !== 0
  }

  /**
   * Set whether interactivity is enabled
   * @param value
   */
  set interactivityEnabled(value) {
    if (this.interactivityEnabled === value)
      return

    if (!this.interactivityListeners)
      this.interactivityListeners = {}

    let interactivityListeners = this.interactivityListeners

    if (value) {
      if (this.plot && !(this.plot instanceof InteractiveCanvas))
        console.warn("Interactive element in a non-interactive canvas")

      let mouseDown = null

      // Whether the previous mousemove was on the element
      let prevIsClick = false

      for (let key of listenerKeys) {
        let key_ = key

        let callback = (evt) => {
          let position = evt.pos
          let isClick = this.isClick(position)

          let res = false

          // Trigger mouse on and mouse off events
          if (isClick && !prevIsClick) {
            if (this.triggerEvent("interactive-mouseon", evt))
              res = true
          } else if (!isClick && prevIsClick) {
            if (this.triggerEvent("interactive-mouseoff", evt))
              res = true
          }

          // Set whether the previous mouse move is on the element
          if (key_ === "mousemove" && isClick)
            prevIsClick = true
          else if (key_ === "mousemove" && !isClick)
            prevIsClick = false

          if (isClick) {
            if (this.triggerEvent("interactive-" + key_, evt))
              res = true
          }

          // Trigger drag events
          if (key_ === "mousemove") {
            if (mouseDown) {
              // return to allow the prevention of propagation
              if (this.triggerEvent("interactive-drag", {start: mouseDown, ...evt}))
                res = true
            }
          } else if (key_ === "mousedown" && isClick) {
            mouseDown = evt.pos
          } else if (key_ === "mouseup") {
            mouseDown = null
          }

          return res
        }

        this.addEventListener(key, callback)
        interactivityListeners[key] = callback
      }

    } else {
      for (let key in this.interactivityListeners) {
        if (this.interactivityListeners.hasOwnProperty(key)) {
          this.removeEventListener(key, interactivityListeners[key])
        }
      }

      this.interactivityListeners = {}
    }
  }

  // Derived classes need to define this function
  isClick(position) {
    throw new Error("")
  }
}

export { InteractiveElement }
