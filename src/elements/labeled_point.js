import { Vec2 } from '../math/vec'
import { PointElement, PointElementStyle } from './point'
import { Label2D } from './label'
import { Label2DStyle } from '../styles/label_style'
import { Colors } from '../other/color'
import { StandardLabelFunction } from './gridlines'
import { Element as GraphemeElement } from "../core/grapheme_element"
import {SmartLabel} from './smart_label'

class LabeledPoint extends GraphemeElement {
  constructor (params = {}) {
    super()

    this.position = params.position instanceof Vec2 ? params.position : new Vec2(params.position)

    this.point = new PointElement()
    this.label = new SmartLabel({style: params.labelStyle ? params.labelStyle : {dir: "NE", fontSize: 14, shadowColor: Colors.WHITE, shadowSize: 2}})
  }

  update () {
    super.update()

    let position = this.plot.transform.plotToPixel(this.position)

    this.point.position = position
    this.label.objectBox = this.point.getBBox()

    if (this.position)
      this.label.text = "(" + this.position.asArray().map(StandardLabelFunction).join(', ') + ')'
  }

  render (info) {
    super.render(info)

    this.point.render(info)
    this.label.render(info)
  }
}

export { LabeledPoint }
