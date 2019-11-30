import { Element as GraphemeElement } from './grapheme_element'
import * as utils from './utils'

class GraphemeGroup extends GraphemeElement {
  constructor (params = {}) {
    super(params)

    this.children = []
  }

  _onDPRChanged() {
    this.children.forEach(child => child._onDPRChanged())
    
    return;
  }

  sortChildrenByPrecedence () {
    // Sort the children by their precedence value
    this.children.sort((x, y) => x.precedence - y.precedence)
  }

  renderIfVisible (renderInfo) {
    this.sortChildrenByPrecedence()

    this.children.forEach((child) => child.renderIfVisible(renderInfo))
  }

  isChild (element) {
    return this.hasChild(element, false)
  }

  hasChild (element, recursive = true) {
    if (recursive) {
      if (this.hasChild(element, false)) return true
      if (this.children.some((child) => child.hasChild(element, recursive))) return true
      return false
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
    this.children.push(element)

    if (elements.length > 0) {
      this.add(elements)
    }
  }

  remove (element, ...elements) {
    utils.checkType(element, GraphemeElement)
    if (this.hasChild(element, false)) {
      // if element is an immediate child
      const index = this.children.indexOf(element)
      this.children.splice(index, 1)
      element.parent = null
    }

    if (elements.length > 0) {
      this.remove(elements)
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
  applyToChildren(func, recursive=true) {
    this.children.forEach(child => {
      if (recursive && child.children) {
        // if child is also a group, apply the function to all children
        child.applyToChildren(func, true)
      }

      func(child);
    })
  }
}

export { GraphemeGroup as Group }
