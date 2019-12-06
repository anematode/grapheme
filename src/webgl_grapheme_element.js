import { Element as GraphemeElement } from "./grapheme_element"

class WebGLGraphemeElement extends GraphemeElement {
  constructor(params={}) {
    super(params)

    this.usedBufferNames = []
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

  destroy() {
    if (this.usedBufferNames) utils.deleteBuffersNamed(this.usedBufferNames)
    super.destroy()
  }
}

export {WebGLGraphemeElement}
