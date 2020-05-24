
/** @claas LabelManager
 * Manage the labels of a domElement, meant to be the container div of a grapheme window */
class LabelManager {
  constructor (container) {
    // Pass it the dom element div for grapheme_window
    this.container = container

    // Mapping from Label keys to {renderID: the last render ID, domElement: html element to use}
    this.labels = new Map()

    this.currentRenderID = -1
  }

  cleanOldRenders () {
    const labelInfos = this.labels

    labelInfos.forEach((labelInfo, label) => {
      if (labelInfo.renderID !== this.currentRenderID) {
        labelInfo.domElement.remove()

        labelInfos.delete(label)
      }
    })
  }

  // Get element corresponding to a given label
  getElement (label) {
    const labelInfo = this.labels.get(label)
    let domElement

    if (!labelInfo) {
      // Create a div for the label to use
      domElement = document.createElement('div')
      domElement.classList.add('grapheme-label')
      this.container.appendChild(domElement)

      // Set renderID so that we know if it needs updating later
      this.labels.set(label, { renderID: this.currentRenderID, domElement })
    } else {
      domElement = labelInfo.domElement

      // Update render ID
      labelInfo.renderID = this.currentRenderID
    }

    return domElement
  }
}

export { LabelManager }
