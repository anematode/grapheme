
/** @class LabelManager
 * Manage the labels of a domElement, meant to be the container div of a grapheme window.
 * Remove old labels and retrieve elements for reuse by labels. */
class LabelManager {
  constructor (container) {
    // Pass it the dom element div for grapheme_window
    /** @public */ this.container = container

    // Mapping from Label keys to {renderID: the last render ID, domElement: html element to use}
    /** @private */ this.labels = new Map()

    // The current render ID
    /** @private */ this.currentRenderID = -1
  }

  /**
   * Remove labels with an old render ID.
   */
  removeOldLabels () {
    const labels = this.labels

    labels.forEach((labelInfo, label) => {
      // Delete labels who don't have the correct render ID
      if (labelInfo.renderID !== this.currentRenderID) {
        labelInfo.domElement.remove()

        labels.delete(label)
      }
    })
  }

  /**
   * Get dom element corresponding to a given label.
   * @param label {BasicLabel}
   */
  getElement (label) {
    // Retrieve label info
    const labelInfo = this.labels.get(label)

    let element

    if (!labelInfo) {
      // Create a div for the label to use
      element = document.createElement('div')
      element.classList.add('grapheme-label')

      this.container.appendChild(element)

      // Update label info
      this.labels.set(label, { renderID: this.currentRenderID, domElement: element })
    } else {
      element = labelInfo.domElement

      // Update render ID
      labelInfo.renderID = this.currentRenderID
    }

    return element
  }
}

export { LabelManager }
