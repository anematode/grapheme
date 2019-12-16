import * as utils from './utils'

class GraphemeElement {
  constructor ({
    precedence = 0,
    visible = true,
    alwaysUpdate = true
  } = {}) {
    // precedence is a number from -Infinity to Infinity.
    this.precedence = precedence

    // Unique identifier for this object
    this.uuid = utils.generateUUID()

    // The parent of this element
    this.parent = null

    // whether this element is visible
    this.visible = true

    // Whether to always update geometries when render is called
    this.alwaysUpdate = alwaysUpdate

    this.eventListeners = {}
  }

  set precedence (x) {
    this._precedence = x
    
    if (this.parent)
      this.parent.childrenSorted = false
  }

  get precedence() {
    return this._precedence
  }

  update () {

  }

  render (elementInfo) {
    if (!this.visible) {
      return
    }

    if (this.alwaysUpdate) {
      this.update()
    }

    elementInfo.window.beforeRender(this)
  }

  hasChild () {
    return false
  }

  destroy () {
    this.orphanize()
  }

  // Returns false if no event listener has returned true (meaning to stop propagation)
  onEvent (type, evt) {
    if (this.eventListeners[type]) {
      return this.eventListeners[type].any(listener => listener(evt))
    }

    return false
  }

  addEventListener (type, listener) {
    let listenerArray = this.eventListeners[type]
    if (!listenerArray) {
      this.eventListeners[type] = [listener]
    } else {
      this.eventListeners[type].push(listener)
    }
  }

  orphanize () {
    if (this.parent) {
      this.parent.remove(this)
    }
  }
}

export { GraphemeElement as Element }
