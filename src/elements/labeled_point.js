import { Vec2 } from '../math/vec'
import { PointElement } from './point'
import { Colors } from '../other/color'
import { StandardLabelFunction } from './gridlines'
import { Element as GraphemeElement } from '../core/grapheme_element'
import { SmartLabel } from './smart_label'

class LabeledPoint extends PointElement {
  constructor (params = {}) {
    super()

    this.position = params.position instanceof Vec2 ? params.position : new Vec2(params.position)
    this.label = new SmartLabel({style: params.labelStyle ? params.labelStyle : {dir: "NE", fontSize: 14, shadowColor: Colors.WHITE, shadowSize: 2}})

    this.add(this.label)
  }

  update () {
    super.update()

    this.label.objectBox = this.getBBox()
  }

  render (info) {
    super.render(info)
  }
}

export { LabeledPoint }
