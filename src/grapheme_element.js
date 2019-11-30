import * as utils from './utils'

/**
A GraphemeElement is a part of a GraphemeWindow. It has a certain precedence
(i.e. the order in which it will be drawn onto the GL portion and the 2D canvas portion.)
*/
class GraphemeElement {
  constructor (params = {}) {
    // precedence is a number from -Infinity to Infinity.
    this.precedence = utils.select(params.precedence, 0)

    this.uuid = utils.generateUUID()
    this.visible = utils.select(params.visible, true)

    this.usedBufferNames = []
    this.parent = null

    // Whether to always update geometries when render is called
    this.alwaysUpdate = utils.select(params.alwaysUpdate, true);
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

  _onDPRChanged() {
    return;
  }
}

export { GraphemeElement as Element }
