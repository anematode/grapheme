import * as utils from './utils'

class GraphemeElement {
  constructor () {
    // precedence is a number from -Infinity to Infinity.
    this.precedence = 0

    // whether this element is visible
    this.visible = true

    // Whether to always update geometries when render is called
    this.alwaysUpdate = true

    // The parent of this element
    this.parent = null

    // The plot this element belongs to
    this.plot = null

    // List of children of this element
    this.children = []
  }

  sortChildren () {
    this.children.sort((x, y) => x.precedence - y.precedence)
  }

  hasChildren () {
    return this.children.length > 0
  }

  add (element) {
    if (!(element instanceof GraphemeElement)) {
      throw new Error("Element must be GraphemeElement")
    }

    if (element.parent || element.plot) {
      throw new Error('Element already has a parent or plot')
    }

    element.parent = this
    element.setPlot(this.plot)

    this.children.push(element)
  }

  isChild(element, recursive=true) {
    const isTopLevelChild = this.children.includes(element)

    if (!recursive) {
      return isTopLevelChild
    }

    return isTopLevelChild || this.children.some(child => child.isChild(element, true))
  }

  remove (element) {
    if (!this.isChild(element, false)) {
      throw new Error("Element is not a top level child of this")
    }

    const index = this.children.indexOf(element)

    if (index !== -1) {
      this.children.splice(index, 1)
    } else {
      throw new Error("Element is not a top level child of this")
    }

    element.parent = null
    element.setPlot(null)
  }

  setPlot (plot) {
    this.plot = plot

    this.children.forEach(child => (child.plot = plot))
  }

  update () {

  }

  render (renderInfo) {
    if (!this.visible) {
      return
    }

    if (this.alwaysUpdate) {
      this.update()
    }
  }
}

export { GraphemeElement as Element }
