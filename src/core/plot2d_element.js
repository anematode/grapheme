import {Group as GraphemeGroup} from "./grapheme_group"

class Plot2DElement extends GraphemeGroup {
  constructor(params={}) {
    super(params)

    this.plot = null
  }

  setPlot(plot) {
    this.plot = plot

    this.children.forEach(child => (child.plot ? child.setPlot(plot) : 0))
  }

  add(element, ...elements) {

    if (elements.length > 0) {
      super.add(element, ...elements)
    } else {
      super.add(element)

      if (element.setPlot) {
        element.setPlot(this.plot)
      }
    }
  }

  remove(element, ...elements) {
    if (elements.length > 0) {
      super.remove(element, ...elements)
    } else {
      super.remove(element)

      if (element.setPlot) {
        element.setPlot(null)
      }
    }
  }
}

export {Plot2DElement}
