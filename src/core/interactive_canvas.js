import {Canvas as GraphemeCanvas} from "./grapheme_canvas.js"

const EVENTS = ["click", "mousemove", "mousedown", "mouseup", "touchstart", "touchend", "touchcancel", "touchmove", "scroll"]

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
        let callback = (evt) => {this.triggerEvent(evtName, evt)}

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
