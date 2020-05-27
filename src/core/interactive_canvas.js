import {Canvas as GraphemeCanvas} from "./grapheme_canvas.js"
import {Vec2} from '../math/vec'
import { DefaultUniverse } from './grapheme_universe'

// List of events to listen for
const EVENTS = ["click", "mousemove", "mousedown", "mouseup", "wheel"]
const TOUCH_EVENTS = ["touchstart", "touchmove", "touchend", "touchcancel"]
const POINTER_EVENTS = ["pointerdown", "pointerup", "pointermove"]

/**
 * @class Canvas that supports interactivity events.
 * The callbacks are given above, and the events have the following structure:
 * {pos: new Vec2(... pixel coordinates of mouse event in canvas ...), rawEvent: ... raw mouse event ...}
 */
class InteractiveCanvas extends GraphemeCanvas {
  /**
   * Construct an interactive canvas
   * @param universe GraphemeUniverse this canvas is a part of
   */
  constructor(universe=DefaultUniverse) {
    super(universe)

    this.interactivityListeners = {}

    this.interactivityEnabled = true
  }

  /**
   * Get whether interactivity is enabled
   * @returns {boolean} Whether interactivity is enabled
   */
  get interactivityEnabled() {
    return Object.keys(this.interactivityListeners).length !== 0
  }

  /**
   * Set whether interactivity is enabled
   * @param enable Whether interactivity is enabled
   */
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

          evt.preventDefault()
        }

        this.interactivityListeners[evtName] = callback

        this.domElement.addEventListener(evtName, callback)
      })

      POINTER_EVENTS.forEach(evtName => {
        let callback = (event) => this.handlePointer(event)

        this.interactivityListeners[evtName] = callback

        this.domElement.addEventListener(evtName, callback)
      })

      TOUCH_EVENTS.forEach(evtName => {
        let callback = (event) => this.handleTouch(event)

        this.interactivityListeners[evtName] = callback

        this.domElement.addEventListener(evtName, callback)
      })
    } else {
      // Remove all interactivity listeners
      EVENTS.concat(TOUCH_EVENTS).concat(POINTER_EVENTS).forEach(evtName => {
        this.domElement.removeEventListener(evtName, this.interactivityListeners[evtName])
      })

      this.interactivityListeners = {}
    }
  }

  handleTouch(event) {
    // Credit to https://stackoverflow.com/questions/1517924/javascript-mapping-touch-events-to-mouse-events
      let touches = event.changedTouches,
        first = touches[0],
        type = "";
      switch (event.type) {
        case "touchstart": type = "mousedown"; break;
        case "touchmove":  type = "mousemove"; break;
        case "touchend":   type = "mouseup";   break;
        default: return;
      }

      let simulatedEvent = document.createEvent("MouseEvent");
      simulatedEvent.initMouseEvent(type, true, true, window, 1,
        first.screenX, first.screenY,
        first.clientX, first.clientY, false,
        false, false, false, 0, null);

      first.target.dispatchEvent(simulatedEvent);
      event.preventDefault();

      if (type === "mouseup") {
        // also emit a click event

        let simulatedEvent2 = document.createEvent("MouseEvent");
        simulatedEvent2.initMouseEvent("click", true, true, window, 1,
          first.screenX, first.screenY,
          first.clientX, first.clientY, false,
          false, false, false, 0, null);

        first.target.dispatchEvent(simulatedEvent2);
        event.preventDefault();
      }
  }

  handlePointer(event) {
    if (event.type === "pointerup") {

    } else if (event.type === "pointermove") {

    } else {

    }
  }
}

export { InteractiveCanvas }
