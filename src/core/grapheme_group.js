import { Element as GraphemeElement } from './grapheme_element'
import * as utils from './utils'

class GraphemeGroup extends GraphemeElement {
  constructor (params = {}) {
    super(params)

    this.children = []
    this.childrenSorted = true
  }

  onEvent (type, evt) {
    const res = super.onEvent(type, evt)
    if (res) { // this element stopped propagation, don't go to children
      return true
    }

    this.sortChildren()
    for (let i = 0; i < this.children.length; ++i) {
      if (this.children[i].onEvent(type, evt)) {
        return true
      }
    }

    return true
  }

  sortChildren (force = false) {
    // Sort the children by their precedence value
    if (force || !this.childrenSorted) {
      this.children.sort((x, y) => x.precedence - y.precedence)

      this.childrenSorted = true
    }
  }

  render (renderInfo) {
    super.render(renderInfo)

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
    element.window = this.window
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
      element.window = null
    }

    if (elements.length > 0) {
      this.remove(...elements)
    }
  }

  destroy () {
    this.children.forEach((child) => child.destroy())

    super.destroy()
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
}

export { GraphemeGroup as Group }
