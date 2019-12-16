import {Group as GraphemeGroup} from "../core/grapheme_group"
import {Plot2D} from "../core/plot2d"

class PlotElement extends GraphemeGroup {
  constructor(params={}) {
    super(params)
  }

  // TODO: efficientify
  get plot() {
    let p = this.parent

    do {
      if (p instanceof Plot2D) {
        return p
      } else {
        p = p.parent
      }
    } while (p.parent)

    return null
  }
}

export {PlotElement}
