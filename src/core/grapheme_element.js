import * as utils from './utils'

class GraphemeElement {
  constructor ({
    precedence = 0,
    visible = true,
    alwaysUpdate = true
  } = {}) {
    // precedence is a number from -Infinity to Infinity.
    this.precedence = precedence

    // The parent of this element
    this.parent = null

    // The plot this element belongs to
    this.plot = null

    // Whether to always update geometries when render is called
    this.alwaysUpdate = alwaysUpdate

    // Custom event listeners
    this.eventListeners = {}

    // Children of this element
    this.children = []
  }

  update () {

  }

  triggerEvent (type, evt) {
    this.sortChildren()

    for (let i = 0; i < this.children.length; ++i) {
      if (this.children[i].triggerEvent(type, evt)) {
        return true
      }
    }

    if (this.eventListeners[type]) {
      let res = this.eventListeners[type].every(listener => listener(evt))
      if (res)
        return true
    }

    return false
  }

  sortChildren () {
    // Sort the children by their precedence value
    this.children.sort((x, y) => x.precedence - y.precedence)
  }

  render (info) {
    this.sortChildren()

    if (this.alwaysUpdate) {
      this.update()
    }

    this.children.forEach((child) => child.render(info))
  }

  isChild (element) {
    return this.hasChild(element, false)
  }

  hasChild (element, recursive = true) {
    if (recursive) {
      if (this.hasChild(element, false)) return true
      return this.children.some((child) => child.hasChild(element, recursive))
    }

    const index = this.children.indexOf(element)
    return (index !== -1)
  }

  add (element, ...elements) {
    utils.checkType(element, GraphemeElement)

    if (element.parent !== null) {
      throw new Error('Element is already a child')
    }

    utils.assert(!this.hasChild(element, true), 'Element is already a child of this group...')

    element.parent = this
    element.plot = this.plot
    this.children.push(element)

    if (elements.length > 0) {
      this.add(...elements)
    }

    this.childrenSorted = false
  }

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

  destroy () {
    this.children.forEach((child) => child.destroy())

    if (this.parent)
      this.parent.remove(this)
  }

  addEventListener (type, callback) {
    const listenerArray = this.eventListeners[type]
    if (!listenerArray) {
      this.eventListeners[type] = [callback]
    } else {
      listenerArray.push(callback)
    }
  }
}

export { GraphemeElement as Element }
