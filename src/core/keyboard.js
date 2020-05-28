
class Keyboard {
  constructor(domElement) {
    this.element = domElement

    this.keys = {}
    this.domListeners = {}

    this.eventListeners = {}

    this.enabled = true
  }

  get enabled() {
    return Object.keys(this.domListeners).length !== 0
  }

  set enabled(value) {
    if (value === this.enabled)
      return

    if (value) {
      let callback = this.domListeners.keydown = (evt) => {
        this.onKeyDown(evt)
      }

      this.element.addEventListener("keydown", callback)

      callback = this.domListeners.keyup = (evt) => {
        this.onKeyUp(evt)
      }

      this.element.addEventListener("keyup", callback)

      callback = this.domListeners.keypress = (evt) => {
        this.onKeyPress(evt)
      }

      this.element.addEventListener("keypress", callback)
    } else {
      let listeners = this.domListeners

      this.element.removeEventListener("keyup", listeners.keyup)
      this.element.removeEventListener("keydown", listeners.keydown)
      this.element.removeEventListener("keypress", listeners.keypress)
    }
  }

  addEventListener(name, callback) {
    let listeners = this.eventListeners[name]

    if (!listeners)
      listeners = this.eventListeners[name] = []

    listeners.push(callback)
  }

  removeEventListener(name, callback) {
    let listeners = this.eventListeners[name]

    let index = listeners.indexOf(callback)

    if (index !== -1) {
      listeners.splice(index, 1)
    }
  }

  triggerEvent(name, event) {
    let listeners = this.eventListeners[name]

    return listeners && listeners.some(listener => listener(event))
  }

  onKeyDown(evt) {
    let key = evt.key

    this.keys[key] = true

    this.triggerEvent("keydown-" + key, evt)
  }

  onKeyUp(evt) {
    let key = evt.key

    this.keys[key] = false

    this.triggerEvent("keyup-" + key, evt)
  }

  onKeyPress(evt) {
    let key = evt.key

    this.triggerEvent("keypress-" + key, evt)
  }
}

export { Keyboard }
