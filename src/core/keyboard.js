/**
 * @class Keyboard Keeps track of the held keys on a keyboard and allows for listeners to be attached to said keys.
 */
class Keyboard {
  /**
   * Construct a Keyboard tracker.
   * @constructor
   * @param domElement The element to attach listeners to
   */
  constructor(domElement) {
    // Element to attach listeners to
    /** @public */ this.element = domElement

    // Dictionary of pressed keys
    /** @public */ this.keys = {}

    // listeners on the dom element
    /** @private */ this.domListeners = {}

    // user-defined event listeners
    /** @private */ this.eventListeners = {}

    // whether the keyboard is enabled
    this.enabled = true
  }

  /**
   * Detach event listeners if necessary and change the element to listen to
   * @param newElem Element to attach listeners to
   */
  changeElementTo(newElem) {
    let value = this.enabled
    this.enabled = false

    this.element = newElem

    this.enabled = value
  }

  /**
   * Get whether the keyboard is enabled
   * @returns {boolean}
   */
  get enabled() {
    // Check whether there are any listeners
    return Object.keys(this.domListeners).length !== 0
  }

  /**
   * Enabled or disable the keyboard
   * @param value {boolean} Whether the keyboard should be enabled
   */
  set enabled(value) {
    if (value === this.enabled)
      return

    if (value) {
      // Enable the keyboard

      this.element.addEventListener("keydown", this.domListeners.keydown = (evt) => {
        this.onKeyDown(evt)
      })

      this.element.addEventListener("keyup", this.domListeners.keyup = (evt) => {
        this.onKeyUp(evt)
      })

      this.element.addEventListener("keypress", this.domListeners.keypress = (evt) => {
        this.onKeyPress(evt)
      })
    } else {
      // Disable the keyboard

      let listeners = this.domListeners

      this.element.removeEventListener("keyup", listeners.keyup)
      this.element.removeEventListener("keydown", listeners.keydown)
      this.element.removeEventListener("keypress", listeners.keypress)
    }
  }

  /**
   * Add an event listener to this keyboard
   * @param name {string} The event to listen for
   * @param callback {Function} The function to call
   */
  addEventListener(name, callback) {
    let listeners = this.eventListeners[name]

    if (!listeners)
      listeners = this.eventListeners[name] = []

    listeners.push(callback)
  }

  /**
   * Remove an event listener from this keyboard
   * @param name {string} The event to listen for
   * @param callback {Function} The callback function
   */
  removeEventListener(name, callback) {
    let listeners = this.eventListeners[name]

    let index = listeners.indexOf(callback)

    if (index !== -1)
      listeners.splice(index, 1)
  }

  /**
   * Trigger an event.
   * @param name {string} Name of the event
   * @param event The event to pass to event listeners
   * @returns {boolean} Whether an event returned true
   */
  triggerEvent(name, event) {
    let listeners = this.eventListeners[name]

    return listeners && listeners.some(listener => listener(event))
  }

  /**
   * Callback for key down
   * @param evt {KeyboardEvent}
   * @private
   */
  onKeyDown(evt) {
    let key = evt.key

    this.keys[key] = true

    this.triggerEvent("keydown-" + key, evt)
  }

  /**
   * Callback for key up
   * @param evt {KeyboardEvent}
   * @private
   */
  onKeyUp(evt) {
    let key = evt.key

    this.keys[key] = false

    this.triggerEvent("keyup-" + key, evt)
  }

  /**
   * Callback for key press
   * @param evt {KeyboardEvent}
   * @private
   */
  onKeyPress(evt) {
    let key = evt.key

    this.triggerEvent("keypress-" + key, evt)
  }
}

export { Keyboard }
