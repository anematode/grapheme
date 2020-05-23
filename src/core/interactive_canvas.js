import {Canvas as GraphemeCanvas} from "./grapheme_canvas.js"
import {Vec2} from '../math/vec'
import { DefaultUniverse } from './grapheme_universe'

// List of events to listen for
const EVENTS = ["click", "mousemove", "mousedown", "mouseup", "touchstart", "touchend", "touchcancel", "touchmove", "wheel"]

/** @class Canvas that supports interactivity events.
 * The callbacks are given above, and the events have the following structure:
 * {pos: new Vec2(... pixel coordinates of mouse event in canvas ...), rawEvent: ... raw mouse event ...}
 */
class InteractiveCanvas extends GraphemeCanvas {
  constructor(universe=DefaultUniverse) {
    super(universe)

    /** @private */ this.interactivityListeners = {}

    this.interactivityEnabled = true
  }

  get interactivityEnabled() {
    return Object.keys(this.interactivityListeners).length !== 0
  }

  set interactivityEnabled(enable) {
    if (enable) {
      // Add interactivity listeners
      EVENTS.forEach(evtName => {
        let callback = (evt) => {
          // Calculate where the click is
          let rect = this.domElement.getBoundingClientRect()

          this.triggerEvent(evtName, {
            pos: new Vec2(evt.clientX - rect.left,evt.clientY - rect.top),
            rawEvent: evt
          })
        }

        this.interactivityListeners[evtName] = callback

        this.domElement.addEventListener(evtName, callback)
      })
    } else {
      // Remove all interactivity listeners
      EVENTS.forEach(evtName => {
        this.domElement.removeEventListener(evtName, this.interactivityListeners[evtName])
      })

      this.interactivityListeners = {}
    }
  }
}

export {InteractiveCanvas}
