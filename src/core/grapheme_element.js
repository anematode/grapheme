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

    // Whether update() needs to be called before render()
    /** @public */ this.needsUpdate = true

    // Custom event listeners
    /** @private */ this.eventListeners = {}

    // Children of this element
    /** @public */ this.children = []

    // Whether this element is visible
    /** @public */ this.visible = true

    // Jobs of this element, used with beasts
    /** @protected */ this.jobs = []
  }

  /**
   * Append elements to this element as children
   * @param element {GraphemeElement} Element to add
   * @param elements Parameter pack, elements to add
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
    element.setPlot(this.plot)

    // Add element to children
    this.children.push(element)

    // Potentially recurse
    if (elements.length > 0) {
      this.add(...elements)
    }
  }

  /**
   * Add event listener to this element
   * @param type {string} Event type to listen for
   * @param callback {UserDefinedFunction} UserDefinedFunction to call
   */
  addEventListener (type, callback) {
    const listenerArray = this.eventListeners[type]

    if (!listenerArray) {
      // If the array doesn't exist yet, create it
      this.eventListeners[type] = [callback]
    } else {
      listenerArray.push(callback)
    }
  }

  applyToChildren(func, recursive=true) {
    func(this)

    this.children.forEach(func)

    if (recursive) {
      this.children.forEach(child => child.applyToChildren(func, true))
    }
  }

  /**
   * Destroy this element. Also, destroy all children of this element.
   */
  destroy () {
    // Destroy all children
    this.children.forEach((child) => child.destroy())

    // Remove this element from its parent
    if (this.parent)
      this.parent.remove(this)

    // Set plot to null (modifying all children as well)
    this.setPlot(null)
  }

  /**
   * Return whether element is a child, potentially not an immediate child, of this element
   * @param element {GraphemeElement} The element to check.
   * @param recursive {boolean} Whether to check all children, not just immediate children
   * @returns {boolean} Whether element is a child of this.
   */
  hasChild (element, recursive = true) {
    // If we should recurse, check if this has the child, then check all children
    if (recursive) {
      if (this.hasChild(element, false)) return true
      return this.children.some((child) => child.hasChild(element, recursive))
    }

    // If not recursive, check whether children includes element
    return this.children.includes(element)
  }

  /**
   * Return whether element is an immediate child of this element; in other words, whether this.children.includes(elem).
   * @param element {GraphemeElement} The element to check.
   * @returns {boolean} Whether the element is an immediate child.
   */
  isChild (element) {
    return this.hasChild(element, false)
  }

  markUpdate() {
    this.needsUpdate = true
  }

  /**
   * Remove elements from this
   * @param element {GraphemeElement} Element to remove
   * @param elements Parameter pack, elements to remove
   */
  remove (element, ...elements) {
    utils.checkType(element, GraphemeElement)

    if (this.hasChild(element, false)) {
      // if element is an immediate child, remove it
      // get index of the element
      const index = this.children.indexOf(element)

      // Remove it from this.children
      this.children.splice(index, 1)

      // Orphanize the element
      element.parent = null
      element.setPlot(null)
    }

    // Deal with parameter pack
    if (elements.length > 0) {
      this.remove(...elements)
    }
  }

  /**
   * Remove all children from this. Optimized for removing all children by not requiring successive calls to
   * this.remove
   */
  removeAllChildren() {
    // Set parent/plot of all children to null
    this.children.forEach(child => {
      child.parent = null
      child.setPlot(null)
    })

    // Empty children array
    this.children = []
  }

  /**
   * Remove event listener from this element
   * @param type {string} Event type listened for
   * @param callback {UserDefinedFunction} Callback to remove
   */
  removeEventListener(type, callback) {
    const listenerArray = this.eventListeners[type]
    if (listenerArray) {
      // Find the callback in the list of listeners and remove it
      let index = listenerArray.indexOf(callback)
      if (index !== -1)
        listenerArray.splice(index, 1)
    }
  }

  /**
   * Render this element to a plot.
   * @param info The rendering info
   * @param info.ctx CanvasRenderingContext2D to draw to
   * @param info.plot The plot we are drawing onto
   * @param info.labelManager The LabelManager of the plot
   * @param info.beforeNormalRender The callback for elements that don't use WebGL.
   */
  render (info) {
    info.beforeNormalRender()

    // Render this element's children
    this.renderChildren(info)
  }

  /**
   * Render all the children of this element.
   * @param info The information to be passed to the children.
   */
  renderChildren(info) {
    // Sort children by precedence
    this.sortChildren()

    // Render all children
    this.children.forEach((child) => child.render(info))
  }

  /**
   * Set this.plot to the plot containing this element
   * @param plot {Plot2D} The plot to set it to
   */
  setPlot(plot) {
    this.plot = plot

    // Set it for all children as well
    this.children.forEach(child => child.setPlot(plot))
  }

  /**
   * Sort the children of this GraphemeElement
   */
  sortChildren () {
    // Sort the children by their precedence value
    this.children.sort((x, y) => x.precedence - y.precedence)
  }

  /**
   * Trigger an event. If it returns true, some event listener returned true, which will stop the propagation of the event.
   * @param type The name of the event, e.g. "plotcoordschanged"
   * @param event The event itself, either a default event or a custom event.
   * @returns {boolean} Whether some event returned true.
   */
  triggerEvent (type, event) {
    this.sortChildren()

    // If child events should be triggered last, trigger all of this element's events first
    if (this.triggerChildEventsLast && this.eventListeners[type]) {
      let res = this.eventListeners[type].some(listener => listener(event))
      if (res)
        // Stop if event stopped propagation
        return true
    }

    // Trigger event in all children
    for (let i = 0; i < this.children.length; ++i) {
      if (this.children[i].triggerEvent(type, event)) {
        // Stop if event stopped propagation
        return true
      }
    }

    // If child events should not be triggered last, trigger all of this element's events first
    if (!this.triggerChildEventsLast && this.eventListeners[type]) {
      let res = this.eventListeners[type].some(listener => listener(event))
      if (res)
        // Stop if event stopped propagation
        return true
    }

    return false
  }

  /**
   * UserDefinedFunction called to update for rendering.
   */
  update () {
    this.needsUpdate = false
  }

  /**
   * Update asynchronously. If this is not specially defined by derived classes, it defaults to just calling update() directly
   */
  async updateAsync() {
    this.update()
  }
}

export { GraphemeElement as Element }
