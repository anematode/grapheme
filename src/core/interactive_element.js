import { Element as GraphemeElement } from "./grapheme_element"
import {InteractiveCanvas} from './interactive_canvas'

const InteractivityListenerKeys = ["click", "mousemove", "mousedown", "mouseup", "wheel"]

class InteractiveElement extends GraphemeElement {
  constructor(params={}) {
    super(params)

    const {
      interactivityEnabled = false
    } = params
    this.interactivityEnabled = interactivityEnabled
  }

  get interactivityEnabled() {
    return this.interactivityListeners && Object.keys(this.interactivityListeners).length !== 0
  }

  set interactivityEnabled(value) {
    if (this.interactivityEnabled === value)
      return

    if (!this.interactivityListeners)
      this.interactivityListeners = {}

    let interactivityListeners = this.interactivityListeners

    if (value) {
      if (this.plot && !(this.plot instanceof InteractiveCanvas)) {
        console.warn("Interactive element in non-interactive canvas")
      }

      let mouseDown = null
      let prevMouseMoveIsClick = false
      for (let key of InteractivityListenerKeys) {
        let key_ = key

        let callback = (evt) => {
          let position = evt.pos
          let isClick = this.isClick(position)

          if (isClick && !prevMouseMoveIsClick) {
            this.triggerEvent("interactive-mouseon")
          } else if (!isClick && prevMouseMoveIsClick) {
            this.triggerEvent("interactive-mouseoff")
          }

          if (key_ === "mousemove" && isClick) {
            prevMouseMoveIsClick = true
          } else if (key_ === "mousemove" && !isClick) {
            prevMouseMoveIsClick = false
          }

          if (isClick) {
            this.triggerEvent("interactive-" + key_)
          }

          if (key_ === "mousemove") {
            if (mouseDown) {
              return this.triggerEvent("interactive-drag", {start: mouseDown, ...evt})
            }
          } else if (key_ === "mousedown" && isClick) {
            mouseDown = evt.pos
          } else if (key_ === "mouseup") {
            mouseDown = null
          }
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
