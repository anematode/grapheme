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

    // whether this element is visible
    this.visible = true

    // Whether to always update geometries when render is called
    this.alwaysUpdate = alwaysUpdate

    this.eventListeners = {}

    this.children = []
  }

  update () {

  }

  onEvent (type, evt) {
    if (this.eventListeners[type]) {
      let res = this.eventListeners[type].any(listener => listener(evt))
      if (res)
        return true
    }

    this.sortChildren()
    for (let i = 0; i < this.children.length; ++i) {
      if (this.children[i].onEvent(type, evt)) {
        return true
      }
    }

    return false
  }

  sortChildren (force = false) {
    // Sort the children by their precedence value
    this.children.sort((x, y) => x.precedence - y.precedence)
  }

  render (renderInfo) {
    this.sortChildren()

    if (!this.visible) {
      return
    }

    if (this.alwaysUpdate) {
      this.update()
    }

    renderInfo.window.beforeRender(this)

    // sort our elements by drawing precedence
    this.sortChildren()

    this.children.forEach((child) => child.render(renderInfo))
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

    this.orphanize()
  }

  /**
   Apply a function to the children of this group. If recursive = true, continue to
   apply this function to the children of all children, etc.
   */
  applyToChildren (func, recursive = true) {
    this.children.forEach(child => {
      if (recursive && child.children) {
        // if child is also a group, apply the function to all children
        child.applyToChildren(func, true)
      }

      func(child)
    })
  }

  addEventListener (type, listener) {
    const listenerArray = this.eventListeners[type]
    if (!listenerArray) {
      this.eventListeners[type] = [listener]
    } else {
      listenerArray.push(listener)
    }
  }

  orphanize () {
    if (this.parent) {
      this.parent.remove(this)
    }
  }
}

export { GraphemeElement as Element }
