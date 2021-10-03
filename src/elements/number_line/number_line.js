import { Element } from '../../core/element.js'
import { constructInterface } from '../../core/interface.js'
import { Figure } from '../figure.js'
import { Vec2 } from '../../math/vec/vec2.js'
import { BigFloat } from '../../math/arb/bigfloat.js'
import { ROUNDING_MODE } from '../../math/rounding_modes.js'
import { ulp } from '../../math/real/fp_manip.js'

let figureInterface = Figure.prototype.getInterface()

/**
 * A number line has a bounding box and an axis within that bounding box. The bounding box and axis should generally be
 * treated as separate entities, although the axis is parallel to one of the sides of the bounding box. The axis has
 * a starting Vec2 and ending Vec2, along with a starting x and ending x (the convention will be to use x to denote
 * position on the number line). For now, we will inherit from Figure, which provides the bounding box capabilities
 * automatically--eventually there will be a generic system which does the fitting automatically, basically the
 * equivalent algorithms as a CSS element.
 *
 * The axis is an inheritable property called numberLineTransform.
 */

const numberLineInterface = constructInterface({
  interface: {
    ...figureInterface.description.interface,
    startX: {},
    endX: {},
    numberLineTransform: {}
  },
  internal: {
    ...figureInterface.description.internal,

    start: { type: "Vec2", computed: 'none' },
    end: { type: "Vec2", computed: 'none' },
    startX: { type: "number", computed: 'default', default: -1 },
    endX: { type: "number", computed: 'default', default: 1 },
    numberLineTransform: { computed: 'none' }
  }
})


// A NumberLineTransform has arbitrary precision (huzzah!) but allows for plain JS floats to be used as well. JS floats
// are recommended to be used when each pixel in the space between start and end can be subdivided at least 1000 times.
// Otherwise, BigFloats are recommended, with a given precision sufficient to subdivide each pixel 1000 times.

export class NumberLineTransform {
  constructor (start, end, startX, endX) {
    /** @type {Vec2} */
    this.start = Vec2.fromObj(start)
    /** @type {Vec2} */
    this.end = Vec2.fromObj(end)

    this.setStart(startX)
    this.setEnd(endX)

    /** @type {string} Either "double" or "bigfloat" */
    this.recommendedMode = "double"
    this.recommendedPrecision = 53

    this.valid = true
  }

  setStart (s) {
    this.startX = BigFloat.from(s)

    this.normalize()
  }

  setEnd (e) {
    this.endX = BigFloat.from(e)

    this.normalize()
  }

  pixelLen () {
    return this.start.sub(this.end).len()
  }

  calculateDeltaX () {
    BigFloat.withWorkingBinaryPrecision(this.recommendedPrecision, () => {
      this.deltaX = BigFloat.sub(this.endX, this.startX)

      this.reciprocalDeltaX = BigFloat.div(1, this.deltaX)
    })
  }

  normalize () {
    const { endXAsNumber: endX, startXAsNumber: startX } = this
    let mode = "double"

    this.valid = true

    let fineness = this.pixelLen() * 1000
    if (fineness === 0 || endX === undefined || startX === undefined) {
      this.valid = false
      return
    }

    let neededUlp = Math.abs(startX - endX) / fineness

    // Determine whether double-precision is sufficient
    if (!Number.isFinite(endX) || !Number.isFinite(startX) || ulp(endX) > neededUlp || ulp(startX) > neededUlp) {
      mode = "bigfloat"
    }

    this.recommendedMode = mode
    if (mode === "double") {
      this.recommendedPrecision = 53
    } else {
      const { startX, endX } = this

        // Need to use big float arithmetic to calculate precision

        BigFloat.withWorkingBinaryPrecision(Math.max(endX.prec, startX.prec), () => {
          neededUlp = BigFloat.mul(BigFloat.sub(endX, startX), 1 / fineness)

          if (BigFloat.cmp(neededUlp, 0) === 0) {
            this.valid = false
            return
          } else {
            let startXLog2 = BigFloat.floorLog2(startX, true)
            let endXLog2 = BigFloat.floorLog2(endX, true)

            let exp = BigFloat.floorLog2(neededUlp, true)
            this.recommendedPrecision = Math.max(startXLog2 - exp, endXLog2 - exp, 53)
          }
        })
    }

    this.calculateDeltaX()
  }

  reset () {

  }

  getStart () {

  }

  getEnd () {

  }

  pixelToGraph (x, y) {

  }

  getOffset () {
    return new Vec2(this.end.y - this.start.y, this.start.x - this.end.x).unit()
  }

  graphToPixel (x) {
    return this.end.sub(this.start).mul((x - this.startX) / (this.endX - this.startX)).add(this.start)
  }
}

export class NumberLine extends Figure {
  init () {
    this.props.setPropertyInheritance("numberLineTransform", true)
  }

  getInterface () {
    return numberLineInterface
  }

  computeNumberLineTransform () {
    // For now, we'll just use the midpoint of the sides of the bounding box

    const { startX, endX, plottingBox: box } = this.props.proxy

    let start = new Vec2(box.x, box.y + box.h / 2)
    let end = new Vec2(box.getX2(), box.y + box.h / 2)

    this.props.set("start", start)
    this.props.set("end", end)

    this.props.set("numberLineTransform", new NumberLineTransform(start, end, startX, endX), 0, 3)
  }

  zoomOn (x, factor) {
    const { startX, endX } = this.props.proxy

    let shift = x - startX
    let newShift = shift * factor
    let endXShift = x - endX
    let newEndXShift = endXShift * factor

    this.props.set("startX", x - newShift)
    this.props.set("endX", x - newEndXShift)

    this.computeNumberLineTransform()
  }

  _update () {
    super._update()

    this.computeNumberLineTransform()

    const { start, end, numberLineTransform } = this.props.proxy

    this.internal.renderInfo = {
      instructions: { type: "polyline", vertices: [ start, end ]}
    }
  }
}
