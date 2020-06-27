import { InteractiveElement } from '../core/interactive_element'

class RangeSelector extends InteractiveElement {
  constructor() {
    super()

    this.precedence = Infinity

    this.selectAlong = ['x', 'y']
    this.selectedRegion = {}
    this.selectionLingers = true

    let inspLeo = 0

    this.addEventListener("interactive-drag", (evt) => {
      if (this.selectionLingers && inspLeo > 0)
        this.removeInspectionPoint()
      inspLeo++
    })
    this.addEventListener("interactive-click")
  }

  isClick(evt) {
    return true
  }
}
