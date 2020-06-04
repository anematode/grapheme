import { Element as GraphemeElement } from "./grapheme_element"
import {InteractiveCanvas} from './interactive_canvas'

// Interactive event names
const listenerKeys = ["click", "mousemove", "mousedown", "mouseup", "wheel"]

/** @class InteractiveElement An element which takes up space in a plot and supports an "isClick" function.
 * Used exclusively for 2D plots (3D plots will have a raycasting system).
 */
class InteractiveElement extends GraphemeElement {
  /**
   * Construct an InteractiveElement
   * @param params {Object}
   * @param params.interactivityEnabled {boolean} Whether interactivity is enabled
   * @param params.precedence See base class.
   * @param params.alwaysUpdate See base class.
   */
  constructor(params={}) {
    super(params)

    const {
      interactivityEnabled = false
    } = params

    this.interactivityEnabled = interactivityEnabled
    this.interactivityListeners = {}
  }

  /**
   * Get whether interactivity is enabled
   * @returns {boolean} Whether interactivity is enabled
   */
  get interactivityEnabled() {
    return this.interactivityListeners && Object.keys(this.interactivityListeners).length !== 0
  }

  /**
   * Whether this element has interactivity listeners to fire when the mouse moves and is not pressed down. Used
   * internally to elide calls to isClick when the element would do nothing even if it returned true.
   * @returns {boolean}
   * @private
   */
  _hasMouseMoveInteractivityListeners() {
    const listeners = this.interactivityListeners

    return !!(listeners["interactive-mouseon"] || listeners["interactive-mouseoff"] || listeners["interactivity-mousemove"])
  }

  /**
   * Set whether interactivity is enabled.
   * @param value {boolean}
   */
  set interactivityEnabled(value) {
    if (this.interactivityEnabled === value)
      return

    let listeners = this.interactivityListeners

    if (value) {
      // Enable interactivity

      // Warn if the element is added to a non-interactive canvas
      if (this.plot && !(this.plot instanceof InteractiveCanvas))
        console.warn("Interactive element in a non-interactive canvas")

      // The position on the canvas of where the mouse was pressed. null if the mouse is not currently pressed.
      let mouseDownPos = null

      // Whether the previous mousemove was on the element
      let prevIsClick = false

      listenerKeys.forEach(key => {
        let callback = (evt) => {
          // Elide mouse moves
          if (key === "mousemove" && !this._hasMouseMoveInteractivityListeners() && !mouseDownPos)
            return

          let eventPos = evt.pos

          // Whether the event occurred on this element
          let isClick = this.isClick(eventPos)

          // Whether to stop propagation
          let stopPropagation = false

          // Trigger mouse on and mouse off events
          if (isClick && !prevIsClick) {
            if (this.triggerEvent("interactive-mouseon", evt))
              stopPropagation = true
          } else if (!isClick && prevIsClick) {
            if (this.triggerEvent("interactive-mouseoff", evt))
              stopPropagation = true
          }

          // Set whether the previous mouse move is on the element
          if (key === "mousemove" && isClick)
            prevIsClick = true
          else if (key === "mousemove" && !isClick)
            prevIsClick = false

          if (isClick) {
            if (this.triggerEvent("interactive-" + key, evt))
              stopPropagation = true
          }

          // Trigger drag events
          if (key === "mousemove") {
            if (mouseDownPos) {
              // return to allow the prevention of propagation
              if (this.triggerEvent("interactive-drag", {start: mouseDownPos, ...evt}))
                stopPropagation = true
            }
          } else if (key === "mousedown" && isClick) {
            // Set the position of the mouse
            mouseDownPos = eventPos
          } else if (key === "mouseup") {
            // Prevent the mouse from
            mouseDownPos = null
          }

          return stopPropagation
        }

        this.addEventListener(key, callback)
        listeners[key] = callback
      })

    } else {
      // Disable interactivity
      for (let key in this.interactivityListeners) {
        if (this.interactivityListeners.hasOwnProperty(key)) {
          this.removeEventListener(key, listeners[key])
        }
      }

      this.interactivityListeners = {}
    }
  }

  /**
   * Derived classes need to define this function
   * @param position
   */
  isClick(position) {
    throw new Error("isClick unimplemented for InteractiveElement")
  }
}

export { InteractiveElement }
