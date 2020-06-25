import { InteractiveElement } from "../core/interactive_element.js"
import { Vec2 } from '../math/vec'
import { PointElement, PointElementStyle } from './point'
import { SmartLabel } from './smart_label'
import {Colors} from '../other/color'

class InspectablePoint extends InteractiveElement {
  constructor(params={}) {
    super(params)

    this.point = new PointElement()
    this.label = new SmartLabel()

    this.position = params.position ? new Vec2(params.position) : new Vec2(0, 0)

    this.unselectedStyle = new PointElementStyle({fill: Colors.LIGHTGRAY, radius: 4})
    this.selectedStyle = new PointElementStyle({fill: Colors.BLACK, radius: 4})

    this.selected = false

    this.labelText = "point"
    this.interactivityEnabled = true

    this.addEventListener("interactive-click", () => {
      this.selected = !this.selected
    })
  }

  get selected() {
    return this._selected
  }

  set selected(value) {
    this._selected = value
    this.point.style = value ? this.selectedStyle : this.unselectedStyle
  }

  get labelText() {
    return this.label.text
  }

  set labelText(value) {
    this.label.text = value
  }

  updatePosition() {
    this.point.position = this.plot.transform.plotToPixel(this.position)

    this.label.objectBox = this.point.getBBox()
  }

  isClick(pos) {
    return this.point.isClick(pos)
  }

  update() {
    super.update()

    this.updatePosition()
  }

  render(info) {
    super.render(info)

    this.point.render(info)

    if (this.selected)
      this.label.render(info)
  }
}

export { InspectablePoint }
