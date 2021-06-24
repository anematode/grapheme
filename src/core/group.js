import {Element} from "./element.js"


export class Group extends Element {
  constructor (params={}) {
    super(params)

    this.children = []
  }

  _update () {
    this.defaultInheritProps()
  }

  /**
   * Add an element to this group.
   * @param elem {Element}
   * @returns {Group}
   */
  add (elem) {
    if (elem.isScene())
      throw new Error("Scene cannot be a child")
    if (elem.parent)
      throw new Error("Element to be added already has a parent")
    if (!(elem instanceof Element))
      throw new TypeError("Element not element")
    if (elem === this)
      throw new Error("Can't add self")
    if (elem.isChild(this))
      throw new Error("Can't make cycle")

    this.children.push(elem)
    elem.parent = this
    elem.setScene(this.scene)

    elem.updateStage = -1

    return this
  }

  /**
   * Run callback(element) on this element and all the element's children
   * @param callback {Function}
   */
  apply (callback) {
    callback(this)

    this.children.forEach(child => child.apply(callback))
  }

  /**
   * If some inheritable properties have changed since the last global update completion, set all the children's update
   * stages to 0. May change how this works later
   */
  informChildrenOfInheritance () {
    if (this.props.hasChangedInheritableProperties && this.children) {
      this.children.forEach(child => {
        child.updateStage = Math.min(child.updateStage, 0) // math.min so that update stage -1 still works
      })
    }
  }

  isChild (elem, recursive=true) {
    for (const child of this.children) {
      if (child === elem) return true
      if (recursive && child.isChild(elem, true)) return true
    }

    return false
  }

  isGroup () {
    return true
  }

  remove (elem) {
    const index = this.children.indexOf(elem)

    if (index !== -1) {
      this.children.splice(index, 1)
      elem.parent = null
      elem.setScene(null)

      elem.updateStage = -1

      return this
    }

    throw new Error("Not a direct child")
  }

  setScene (scene) {
    this.scene = scene
    this.children.forEach(child => child.setScene(scene))
  }

  triggerEvent (eventName, data) {
    for (const child of this.children) {
      if (child.triggerEvent(eventName, data))
        return true
    }

    super.triggerEvent(eventName, data)
  }

  update () {
    super.update()
    this.informChildrenOfInheritance()
  }
}
