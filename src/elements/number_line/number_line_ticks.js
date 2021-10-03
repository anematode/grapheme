import { constructInterface } from '../../core/interface.js'
import { Element } from '../../core/element.js'
import { Colors as Pens } from '../../styles/definitions.js'

// A tick style has the following parameters:
// { pen?: (Pen), offset?: (number)|[number, number], labelPosition: (dir), labelSpacing: (dir) }

const numberLineTicksInterface = constructInterface({
  interface: {
    ticks: { }
  },
  internal: {
    ticks: { computed: "none" },
    tickStyles: { computed: "default", }
  }
})

export class NumberLineTicks extends Element {
  getInterface () {
    return numberLineTicksInterface
  }

  _update () {
    this.defaultInheritProps()
    this.defaultComputeProps()

    let { ticks, numberLineTransform } = this.props.proxy
    if (!ticks || !numberLineTransform) {
      this.internal.renderInfo = null
      return
    }

    const instructions = []
    const offset = numberLineTransform.getOffset()

    for (const tickInfo of ticks) {
      let { tick, label } = tickInfo

      if (tick === undefined) continue

      let loc = numberLineTransform.graphToPixel(tick)
      let start = loc.add(offset.mul(5))
      let end = loc.add(offset.mul(-5))

      instructions.push({ type: "polyline", vertices: [start, end] })
      if (label) {
        instructions.push({ type: "latex", latex: label, pos: start, dir: 'N', spacing: 10 })
      }
    }

    this.internal.renderInfo = { instructions }
  }
}
