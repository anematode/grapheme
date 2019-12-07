import * as utils from './utils'

/**
A GraphemeElement is a part of a GraphemeWindow. It has a certain precedence
(i.e. the order in which it will be drawn onto the GL portion and the 2D canvas portion.)
*/
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

    // Whether this element is drawn on render TODO
    this.visible = visible

    // The parent of this element
    this.parent = null

    // Whether to always update geometries when render is called
    this.alwaysUpdate = alwaysUpdate
  }

  orphanize () {
    if (this.parent) {
      this.parent.remove(this)
    }
  }

  updateGeometries() {
    
  }

  render (elementInfo) {
    if (this.alwaysUpdate)
      this.updateGeometries()

    elementInfo.window.beforeRender(this)
  }

  hasChild () {
    return false
  }

  destroy () {
    this.orphanize()
  }

  onDPRChanged () {

  }
}

export { GraphemeElement as Element }
