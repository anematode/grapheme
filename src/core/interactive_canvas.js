import { Universe, DefaultUniverse } from './grapheme_universe'
import { Canvas as GraphemeCanvas } from './grapheme_canvas.js'
import { Keyboard } from './keyboard'
import { Vec2 } from '../math/vec'

// List of events to listen for
const mouseEvents = ['click', 'mousemove', 'mousedown', 'mouseup', 'wheel']
const touchEvents = ['touchstart', 'touchmove', 'touchend', 'touchcancel']
const pointerEvents = ['pointerdown', 'pointerup', 'pointermove']

/**
 * @class InteractiveCanvas Canvas that supports interactivity events.
 * The callbacks are given above, and the events have the following structure:
 * {pos: new Vec2(... pixel coordinates of mouse event in canvas ...), rawEvent: ... raw mouse event ...}
 */
class InteractiveCanvas extends GraphemeCanvas {
  /**
   * Construct an interactive canvas
   * @param universe {GraphemeUniverse} The universe to add this canvas to
   */
  constructor (universe = DefaultUniverse) {
    super(universe)

    // Used for tracking key presses
    this.keyboard = new Keyboard(window /* attach listeners to window */)

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
      // Add interactivity listeners for each mouse event
      mouseEvents.forEach(evtName => {
        let callback = (evt) => {
          // Calculate where the click is
          let rect = this.domElement.getBoundingClientRect()
          let pos = new Vec2(evt.clientX - rect.left, evt.clientY - rect.top)

          // Trigger the event
          this.triggerEvent(evtName, {
            pos,
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

      // For each pointer event
      pointerEvents.forEach(evtName => {
        // Handle pointer events
        this.domElement.addEventListener(evtName,
          this.interactivityListeners[evtName] = (event) => this.handlePointer(event))
      })

      // For each touch event
      touchEvents.forEach(evtName => {
        // Handle touch events
        this.domElement.addEventListener(evtName,
          this.interactivityListeners[evtName] = (event) => this.handleTouch(event))
      })
    } else {
      // Remove all interactivity listeners
      [...mouseEvents, ...pointerEvents, ...touchEvents].forEach(evtName => {
        this.domElement.removeEventListener(evtName, this.interactivityListeners[evtName])
      })

      this.interactivityListeners = {}
    }

    // Set whether the keyboard is enabled
    this.keyboard.enabled = enable
  }

  /**
   * Handle pointer events.
   * @param event {PointerEvent} Pointer event
   * @todo
   */
  handlePointer (event) {
    if (event.type === 'pointerup') {

    } else if (event.type === 'pointermove') {

    } else {

    }
  }

  /**
   * Handle touch events by converting them to corresponding mouse events
   * @param event {TouchEvent} The touch event.
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

      simulatedEvent = document.createEvent('MouseEvent')
      simulatedEvent.initMouseEvent('click', true, true, window, 1,
        first.screenX, first.screenY,
        first.clientX, first.clientY, false,
        false, false, false, 0, null)

      first.target.dispatchEvent(simulatedEvent)
      event.preventDefault()
    }
  }
}

export { InteractiveCanvas }
