import { constructInterface } from '../../core/interface.js'
import { Element } from '../../core/element.js'

const numberLineTicksInterface = constructInterface({
  interface: {
    ticks: { }
  },
  internal: {
    ticks: { computed: "none" }
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

    }

    const instructions = []
    const offset = numberLineTransform.getOffset()

    for (const tick of ticks) {
      let loc = numberLineTransform.graphToPixel(tick)
      let start = loc.add(offset.mul(5))
      let end = loc.add(offset.mul(-5))

      instructions.push({ type: "polyline", vertices: [start, end] })
    }

    this.internal.renderInfo = { instructions }
  }
}
