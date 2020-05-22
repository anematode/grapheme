import * as utils from './utils'

/** @class GraphemeElement A component of Grapheme that supports a update() function, which prepares it for the rendering
 * stage, and a render() function which renders the element to a GraphemeCanvas. It also has children, used for grouping
 * elements together. */
class GraphemeElement {
  constructor ({
    precedence = 0,
    alwaysUpdate = true
  } = {}) {
    // Used to sort which element is drawn first. A lower precedence means it will be drawn first and appear on the bottom
    /** @public */ this.precedence = precedence

    // The parent of this element
    /** @public */ this.parent = null

    // The plot this element belongs to
    /** @public */ this.plot = null

    // Whether to always update when render is called
    /** @public */ this.alwaysUpdate = alwaysUpdate

    // Custom event listeners
    /** @private */ this.eventListeners = {}

    // Children of this element
    /** @public */ this.children = []
  }

  /**
   * Trigger an event. If it returns true, some event listener returned true, which will stop the propagation of the event.
   * @param type The name of the event, e.g. "plotcoordschanged"
   * @param event The event itself, either a default event or a custom event.
   * @returns {boolean} Whether some event returned true.
   */
  triggerEvent (type, event) {
    this.sortChildren()

    // Trigger event in all children
    for (let i = 0; i < this.children.length; ++i) {
      if (this.children[i].triggerEvent(type, event)) {
        // Stop if event stopped propagation
        return true
      }
    }

    if (this.eventListeners[type]) {
      // Stop if event stopped propagation
      let res = this.eventListeners[type].some(listener => listener(event))
      if (res)
        return true
    }

    return false
  }

  /**
   * Sort the children of this GraphemeElement
   */
  sortChildren () {
    // Sort the children by their precedence value
    this.children.sort((x, y) => x.precedence - y.precedence)
  }

  /**
   * Render this element to a plot.
   * @param info The rendering info
   * @param info.ctx CanvasRenderingContext2D to draw to
   * @param info.plot The plot we are drawing onto
   * @param info.labelManager The LabelManager of the plot
   */
  render (info) {
    // Sort children
    this.sortChildren()

    // Update if needed
    if (this.alwaysUpdate)
      this.update()

    // Render all children
    this.children.forEach((child) => child.render(info))
  }

  // Whether element is a direct child of this
  isChild (element) {
    return this.hasChild(element, false)
  }

  // Whether element is a child (potentially recursive) of this
  hasChild (element, recursive = true) {
    if (recursive) {
      if (this.hasChild(element, false)) return true
      return this.children.some((child) => child.hasChild(element, recursive))
    }

    const index = this.children.indexOf(element)
    return (index !== -1)
  }

  /** Append element(s) to this
   *
   * @param element Element to remove
   * @param elements Parameter pack, elements to remove
   */
  add (element, ...elements) {
    // Make sure this operation is valid
    utils.checkType(element, GraphemeElement)

    if (element.parent !== null)
      throw new Error('Element is already a child of some element.')

    if (this.hasChild(element, true))
      throw new Error('Element is already a child of this group.')

    // Set element parent and plot
    element.parent = this
    element.plot = this.plot

    // Add element to children
    this.children.push(element)

    // Potentially recurse
    if (elements.length > 0) {
      this.add(...elements)
    }
  }

  /** Remove elements from this
   *
   * @param element Element to remove
   * @param elements Parameter pack, elements to remove
   */
  remove (element, ...elements) {
    utils.checkType(element, GraphemeElement)
    if (this.hasChild(element, false)) {
      // if element is an immediate child

      const index = this.children.indexOf(element)
      this.children.splice(index, 1)

      element.parent = null
      element.plot = null
    }

    if (elements.length > 0) {
      this.remove(...elements)
    }
  }

  /**
   * Destroy this element
   */
  destroy () {
    // Destroy all children
    this.children.forEach((child) => child.destroy())

    // Remove this element from its parent
    if (this.parent)
      this.parent.remove(this)

    this.plot = null
  }

  /**
   * Add event listener to this element
   * @param type Event to listen for
   * @param callback Function to call
   */
  addEventListener (type, callback) {
    const listenerArray = this.eventListeners[type]
    if (!listenerArray) {
      this.eventListeners[type] = [callback]
    } else {
      listenerArray.push(callback)
    }
  }

  /**
   * Remove event listener from this element
   * @param type Event to listen for
   * @param callback Function to call
   */
  removeEventListener(type, callback) {
    const listenerArray = this.eventListeners[type]
    if (listenerArray) {
      let index = listenerArray.indexOf(callback)
      if (index !== -1) {
        listenerArray.splice(index, 1)
      }
    }
  }

  /**
   * Function called to update for rendering. Empty in case child classes don't define it.
   */
  update () {

  }
}

export { GraphemeElement as Element }
