
/** Manage the labels of a domElement, meant to be the container div of a grapheme window */
class LabelManager {
  constructor(domElement) {
    // Pass it the container for grapheme_window
    this.domElement = domElement

    // Mapping from Label keys to {renderID: the last render ID, domElement: html element to use}
    this.labels = new Map()

    this.currentRenderID = ""
  }

  cleanOldRenders() {
    let labelInfos = this.labels

    labelInfos.forEach((labelInfo, label) => {
      if (labelInfo.renderID !== this.currentRenderID) {
        labelInfo.domElement.remove()
        labelInfos.delete(label)
      }
    })
  }

  getElement(label) {
    const labelInfo = this.labels.get(label)
    let domElement

    if (!labelInfo) {
      domElement = document.createElement("div")
      domElement.classList.add("grapheme-label")
      this.domElement.appendChild(domElement)

      this.labels.set(label, {renderID: this.currentRenderID, domElement})
    } else {
      domElement = labelInfo.domElement
      labelInfo.renderID = this.currentRenderID
    }

    return domElement
  }
}

export {LabelManager}
