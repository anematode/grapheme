import {Canvas as GraphemeCanvas} from "./grapheme_canvas.js"
import {Vec2} from '../math/vec'

const EVENTS = ["click", "mousemove", "mousedown", "mouseup", "touchstart", "touchend", "touchcancel", "touchmove", "wheel"]

class InteractiveCanvas extends GraphemeCanvas {
  constructor(params={}) {
    super(params)

    this.interactivityListeners = {}
    this.interactivityEnabled = true
  }

  get interactivityEnabled() {
    return this._interactivityEnabled
  }

  set interactivityEnabled(v) {
    this._interactivityEnabled = v

    if (v) {
      EVENTS.forEach(evtName => {
        let callback = (evt) => {
          let rect = this.domElement.getBoundingClientRect()

          this.triggerEvent(evtName, {pos: new Vec2(evt.clientX - rect.left,evt.clientY - rect.top), rawEvent: evt})
        }

        this.interactivityListeners[evtName] = callback

        this.domElement.addEventListener(evtName, callback)
      })
    } else {
      EVENTS.forEach(evtName => {
        this.domElement.removeEventListener(evtName, this.interactivityListeners[evtName])
      })
    }
  }
}

export {InteractiveCanvas}
