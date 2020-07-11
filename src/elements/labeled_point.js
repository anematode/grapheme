import { Vec2 } from '../math/vec'
import { PointElement } from './point'
import { Colors } from '../other/color'
import { StandardLabelFunction } from './gridlines'
import { Element as GraphemeElement } from '../core/grapheme_element'
import { SmartLabel } from './smart_label'
import { Glyphs } from '../other/glyph'

class LabeledPoint extends PointElement {
  constructor (params = {}) {
    super(params)

    const labelStyle = params.labelStyle ? params.labelStyle : {dir: "NE", fontSize: 14, shadowColor: Colors.WHITE, shadowSize: 2}

    this.label = new SmartLabel({style: labelStyle})

    this.add(this.label)
  }

  update (info) {
    super.update(info)

    this.label.objectBox = this.getBBox()
  }
}

export { LabeledPoint }
