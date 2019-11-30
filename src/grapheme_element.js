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

    // List of buffer names used, for easy cleanup when the object is destroyed
    this.usedBufferNames = []

    // The parent of this element
    this.parent = null

    // Whether to always update geometries when render is called
    this.alwaysUpdate = alwaysUpdate
  }

  addUsedBufferName (bufferName) {
    if (this.usedBufferNames.indexOf(bufferName) === -1) {
      this.usedBufferNames.push(bufferName)
    }
  }

  removeUsedBufferName (bufferName) {
    const index = this.usedBufferNames.indexOf(bufferName)
    if (index !== -1) {
      this.usedBufferNames.splice(index, 1)
    }
  }

  orphanize () {
    if (this.parent) {
      this.parent.remove(this)
    }
  }

  render (elementInfo) {
    // No need to call this as a child class
  }

  hasChild () {
    return false
  }

  destroy () {
    if (this.usedBufferNames) utils.deleteBuffersNamed(this.usedBufferNames)

    this.orphanize()
  }
}

export { GraphemeElement as Element }
