import { constructInterface } from '../../core/interface.js'
import { Element } from '../../core/element.js'
import { flattenVec2Array } from '../../algorithm/misc_geometry.js'
import { TickStyles} from '../../styles/definitions.js'
import { getDemarcations } from '../../algorithm/tick_allocator.js'

const numberLineTicksInterface = constructInterface({
  interface: {
    ticks: { description: "A list of the ticks to draw" },
    styles: { description: "A dictionary of tick types to styles", setAs: "user" }
  },
  internal: {
    ticks: { computed: "none", default: { algorithm: "normal" } },
    styles: { type: "TickStyles", computed: "user", default: TickStyles.default, compose: true }
  }
})

// Compute the positions (
/**
 *
 * @param opts
 * @param transform {NumberLineTransform}
 * @param styles
 */
function computeNormalTicks (opts, transform, styles) {
  let positions = getDemarcations(transform.startX, transform.endX, transform.len())

  let { min, maj } = positions

  const instructions = []
  const map = { minor: min, major: maj }

  let unitOffset = transform.unitOffset()

  for (const [ styleName, ticks ] of Object.entries(map)) {
    let style = styles[styleName]
    if (!style) continue

    let { offset, pen } = style
    let offsetStart = unitOffset.mul(offset[0])
    let offsetEnd = unitOffset.mul(offset[1])

    for (const tick of ticks) {
      let tickPos = transform.graphToPixel(tick)

      instructions.push({
        type: "polyline",
        vertices: [ tickPos.add(offsetStart), tickPos.add(offsetEnd) ],
        pen
      })
    }
  }

  return instructions
}

// Get a list of instructions given ticks and styles
function computeTicks (ticks, transform, styles) {
  ticks = Array.isArray(ticks) ? ticks : [ticks]

  let instructions = []
  let offset = transform.unitOffset()

  for (const tick of ticks) {
    if (tick.algorithm) {
      switch (tick.algorithm) {
        case "normal":
          instructions.push(...computeNormalTicks(null, transform, styles))
          break
        default:
          throw new Error(`Unknown tick algorithm ${tick.algorithm}`)
      }
    } else {
      let pos = transform.graphToPixel(tick.pos ?? tick)

      instructions.push({
        type: "polyline",
        vertices: [pos.add(offset.mul(10)), pos.add(offset.mul(-10))]
      })
    }
  }

  return instructions
}

/**
 * There are so many ways to draw ticks on a number line. We want sensible defaults, but also pretty extreme
 * customizabliity, because the point of a number line is to draw ticks on that number line. Each tick on a number line
 * has a position along the number line, a style, and potentially a label. A tick style has a line style, and two offset
 * values, representing how far offset the two ends of the tick are.
 *
 * Normal: Decimals * powers of 10
 */

export class NumberLineTicks extends Element {
  init () {

  }

  getInterface () {
    return numberLineTicksInterface
  }

  computeTicks () {
    let { ticks, styles, numberLineTransform: transform } = this.props.proxy

    console.log(ticks)

    let instructions = computeTicks(ticks, transform, styles)
    this.internal.polylines = instructions
  }

  _update () {
    this.defaultInheritProps()
    this.defaultComputeProps()

    this.computeTicks()

    this.internal.renderInfo = {
      instructions: this.internal.polylines
    }
  }
}
