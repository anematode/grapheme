import { constructInterface } from '../../core/interface.js'
import { Element } from '../../core/element.js'
import { getLatexSizeAndHTML } from '../latex_element.js'
import { Pen } from '../../styles/definitions.js'

// A tick style has the following parameters:
// { pen?: (Pen), offset?: (number)|[number, number], labelPosition?: (dir), labelSpacing?: (dir) }

const defaultTickStyles = {
  special: { pen: Pen.create({ thickness: 2 }), offset: [ -10, 50 ], labelPosition: 'N', labelSpacing: 10 },
  normal: { pen: Pen.create({ thickness: 1 }), offset: [ 5, -5 ], labelPosition: 'S', labelSpacing: 10 }
}

const numberLineTicksInterface = constructInterface({
  interface: {
    ticks: { }
  },
  internal: {
    ticks: { computed: "none" },
    tickStyles: { computed: "default", default: defaultTickStyles }
  }
})

export class NumberLineTicks extends Element {
  getInterface () {
    return numberLineTicksInterface
  }

  _update () {
    this.defaultInheritProps()
    this.defaultComputeProps()

    let { ticks, tickStyles, numberLineTransform } = this.props.proxy
    if (!ticks || !numberLineTransform) {
      this.internal.renderInfo = null
      return
    }

    const instructions = []
    const offsetVec = numberLineTransform.getOffset()

    const latexInstructions = []

    for (const [ styleName, tickList ] of Object.entries(ticks)) {
      let style = tickStyles[styleName]
      if (!style) continue

      let startOffset, endOffset
      let offset = style.offset, pen = style.pen ?? Pen.default, labelDir = style.labelPosition, labelSpacing = style.labelSpacing

      if (Array.isArray(offset)) {
        startOffset = offset[0]
        endOffset = offset[1]
      } else {
        startOffset = -(offset ?? 5)
        endOffset = -startOffset
      }

      for (let tickInfo of tickList) {
        let { tick, label } = tickInfo

        if (tick === undefined) continue

        let loc = numberLineTransform.graphToPixel(tick)
        let start = loc.add(offsetVec.mul(startOffset))
        let end = loc.add(offsetVec.mul(endOffset))

        instructions.push({
          type: "polyline",
          vertices: [start, end]
        })
        if (label) {
          latexInstructions.push({
            type: "latex",
            latex: label,
            pos: end,
            dir: labelDir,
            spacing: labelSpacing
          })
        }
      }
    }

    this.internal.renderInfo = { instructions: instructions.concat(latexInstructions) }
  }
}
