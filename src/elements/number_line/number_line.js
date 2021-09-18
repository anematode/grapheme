import { Element } from '../../core/element.js'
import { constructInterface } from '../../core/interface.js'
import { Figure } from '../figure.js'
import { Vec2 } from '../../math/vec/vec2.js'
import { BigFloat } from '../../math/arb/bigfloat.js'
import { ROUNDING_MODE } from '../../math/rounding_modes.js'

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
    ...figureInterface.description.interface
  },
  internal: {
    ...figureInterface.description.internal,

    start: { type: "Vec2", computed: 'none' },
    end: { type: "Vec2", computed: 'none' },
    numberLineTransform: { computed: 'none' }
  }
})


// A NumberLineTransform has arbitrary precision (huzzah!) but allows for plain JS floats to be used as well. JS floats
// are recommended to be used when each pixel in the space between start and end can be subdivided at least 1000 times.
// Otherwise, BigFloats are recommended, with a given precision sufficient to subdivide each pixel 1000 times.

class NumberLineTransform {
  constructor (start, end, startX, endX) {
    /** @type {Vec2} */
    this.start = start
    /** @type {Vec2} */
    this.end = end

    /** @type {BigFloat} */
    this.startX = BigFloat.ZERO
    /** @type {BigFloat} */
    this.endX = BigFloat.ONE

    this.setStart(startX)
    this.setEnd(endX)

    /** @type {string} Either "double" or "bigfloat" */
    this.recommendedMode = "double"
    this.recommendedPrecision = 53
  }

  setStart (s) {
    this.startX = BigFloat.from(s)
    this.startXAsNumber = this.startX.toNumber(ROUNDING_MODE.NEAREST)

    this.ascertainMode()
  }

  setEnd (e) {
    this.endX = BigFloat.from(e)
    this.endXAsNumber = this.startX.toNumber(ROUNDING_MODE.NEAREST)

    this.ascertainMode()
  }

  getStart () {

  }

  getEnd () {

  }

  pixelToGraph (x, y) {

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

    /** @type {BoundingBox} */
    let box = this.props.get("plottingBox")

    let start = new Vec2(box.x, box.y + box.h / 2)
    let end = new Vec2(box.getX2(), box.y + box.h / 2)

    this.props.set("start", start)
    this.props.set("end", end)

    let startX = 0, startY = 1

    this.props.set("numberLineTransform", new NumberLineTransform(start, end, startX, startY), 0, 2)
  }

  _update () {
    super._update()

    this.computeNumberLineTransform()

    const { start, end, numberLineTransform } = this.props.proxy

    this.internal.renderInfo = {
      instructions: { type: "debug", polyline: [ start, end ]}
    }
  }
}
