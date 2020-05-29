import { Canvas as GraphemeCanvas } from './grapheme_canvas.js'
import { Vec2 } from '../math/vec'
import { DefaultUniverse } from './grapheme_universe'
import { Keyboard } from './keyboard'

// List of events to listen for
const mouseEvents = ['click', 'mousemove', 'mousedown', 'mouseup', 'wheel']
const touchEvents = ['touchstart', 'touchmove', 'touchend', 'touchcancel']
const pointerEvents = ['pointerdown', 'pointerup', 'pointermove']

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
  constructor (universe = DefaultUniverse) {
    super(universe)

    // Used for tracking key presses
    this.keyboard = new Keyboard(window)

    // Used for listening to mouse/touch events
    this.interactivityListeners = {}

    // Whether interactivity is enabled
    this.interactivityEnabled = true
  }

  /**
   * Get whether interactivity is enabled
   * @returns {boolean} Whether interactivity is enabled
   */
  get interactivityEnabled () {
    return Object.keys(this.interactivityListeners).length !== 0
  }

  /**
   * Set whether interactivity is enabled
   * @param enable Whether interactivity is enabled
   */
  set interactivityEnabled (enable) {
    if (enable) {
      // Add interactivity listeners
      mouseEvents.forEach(evtName => {
        let callback = (evt) => {
          // Calculate where the click is
          let rect = this.domElement.getBoundingClientRect()

          this.triggerEvent(evtName, {
            pos: new Vec2(evt.clientX - rect.left, evt.clientY - rect.top),
            rawEvent: evt
          })

          // Prevent the default action e.g. scrolling
          evt.preventDefault()
        }

        // Store the listener
        this.interactivityListeners[evtName] = callback

        // Add the listener
        this.domElement.addEventListener(evtName, callback)
      })

      pointerEvents.forEach(evtName => {
        // Handle pointer events
        this.domElement.addEventListener(evtName, this.interactivityListeners[evtName] = (event) => this.handlePointer(event))
      })

      touchEvents.forEach(evtName => {
        // Handle touch events
        this.domElement.addEventListener(evtName, this.interactivityListeners[evtName] = (event) => this.handleTouch(event))
      })
    } else {
      // Remove all interactivity listeners
      mouseEvents.concat(touchEvents).concat(pointerEvents).forEach(evtName => {
        this.domElement.removeEventListener(evtName, this.interactivityListeners[evtName])
      })

      this.interactivityListeners = {}
    }

    // Set whether the keyboard is enabled
    this.keyboard.enabled = enable
  }

  /**
   * Handle touch events by converting them to corresponding mouse events
   * @param event The touch event.
   */
  handleTouch (event) {
    // Credit to https://stackoverflow.com/questions/1517924/javascript-mapping-touch-events-to-mouse-events
    let touches = event.changedTouches,
      first = touches[0],
      type = ''
    switch (event.type) {
      case 'touchstart':
        type = 'mousedown'
        break
      case 'touchmove':
        type = 'mousemove'
        break
      case 'touchend':
        type = 'mouseup'
        break
      default:
        return
    }

    let simulatedEvent = document.createEvent('MouseEvent')
    simulatedEvent.initMouseEvent(type, true, true, window, 1,
      first.screenX, first.screenY,
      first.clientX, first.clientY, false,
      false, false, false, 0, null)

    first.target.dispatchEvent(simulatedEvent)
    event.preventDefault()

    if (type === 'mouseup') {
      // also emit a click event

      let simulatedEvent2 = document.createEvent('MouseEvent')
      simulatedEvent2.initMouseEvent('click', true, true, window, 1,
        first.screenX, first.screenY,
        first.clientX, first.clientY, false,
        false, false, false, 0, null)

      first.target.dispatchEvent(simulatedEvent2)
      event.preventDefault()
    }
  }

  /**
   * Handle pointer events. TODO
   * @param event Pointer event
   */
  handlePointer (event) {
    if (event.type === 'pointerup') {

    } else if (event.type === 'pointermove') {

    } else {

    }
  }
}

export { InteractiveCanvas }
