import {Vec2} from "./vec/vec2.js"
import * as utils from "../core/utils.js"

/**
 * Given some parameters describing a line segment, find a line segment that is consistent with at least two of them.
 * @param x1 {number}
 * @param x2 {number}
 * @param w {number}
 * @param cx {number}
 */
function resolveAxisSpecification (x1, x2, w, cx) {
  let ox1, ox2, ow, ox

  if (cx !== undefined) {
    let halfWidth = 0

    if (w !== undefined) halfWidth = w / 2
    else if (x2 !== undefined) halfWidth = x2 - cx
    else if (x1 !== undefined) halfWidth = cx - x1

    halfWidth = Math.abs(halfWidth)

    return [ cx - halfWidth, cx + halfWidth ]
  } else if (x1 !== undefined) {
    if (w !== undefined) return [x1, x1 + w]
    if (x2 !== undefined) return [x1, x2]
  } else if (x2 !== undefined) {
    if (w !== undefined) return [x2 - w, x2]
  }

  return [ 0, 0 ]
}

/**
 * A bounding box. In general, we consider the bounding box to be in canvas coordinates, so that the "top" is -y and
 * the "bottom" is +y.
 */
export class BoundingBox {
  constructor (x=0, y=0, width=0, height=0) {
    this.x = x
    this.y = y
    this.w = width
    this.h = height
  }

  clone () {
    return new BoundingBox(this.x, this.y, this.w, this.h)
  }

  /**
   * Push in (or pull out) all the sides of the box by a given amount. Returns null if too far. So squishing
   * { x: 0, y: 0, w: 2, h: 2} by 1/2 will give { x: 0.5, y: 0.5, w: 1, h: 1 }
   * @param margin {number}
   */
  squish (margin=0) {
    const { x, y, w, h } = this

    if (2 * margin > w || 2 * margin > h)
      return null

    return new BoundingBox(x + margin, y + margin, w - 2 * margin, h - 2 * margin)
  }

  squishAsymmetrically (left=0, right=0, bottom=0, top=0, flipY=false) {
    const { x, y, w, h } = this

    if (2 * (left + right) > w || 2 * (bottom + top) > h) {
      return null
    }

    if (flipY) {
      let tmp = bottom
      bottom = top
      top = tmp
    }

    return new BoundingBox(x + left, y + top, w - (left + right), h - (top + bottom))
  }

  translate (v) {
    return new BoundingBox(this.x + v.x, this.y + v.y, this.w, this.h)
  }

  scale (s) {
    return new BoundingBox (this.x * s, this.y * s, this.w * s, this.h * s)
  }

  getX2 () {
    return this.x + this.w
  }

  getY2 () {
    return this.y + this.h
  }

  static fromObj (obj) {
    let finalX1, finalY1, finalX2, finalY2

    if (Array.isArray(obj)) {
      finalX1 = obj[0]
      finalY1 = obj[1]
      finalX2 = obj[2] + finalX1
      finalY2 = obj[3] + finalY1
    } else if (typeof obj === "object") {
      let { x, y, x1, y1, x2, y2, w, h, width, height, cx, cy, centerX, centerY } = obj

      // various aliases
      x = x ?? x1
      y = y ?? y1

      w = w ?? width
      h = h ?? height

      cx = cx ?? centerX
      cy = cy ?? centerY

      // We wish to find a rectangle that is roughly consistent. Note that along each axis, we have four relevant
      // variables: x, x2, w, cx. The axes are totally separable, so the problem is pretty trivial. I'm too tired
      // to figure out how to do it elegantly rather than case work.

      ;[ finalX1, finalX2 ] = resolveAxisSpecification(x, x2, w, cx)
      ;[ finalY1, finalY2 ] = resolveAxisSpecification(y, y2, h, cy)
    }

    return new BoundingBox(finalX1, finalY1, finalX2 - finalX1, finalY2 - finalY1)
  }

  get x1 () {
    return this.x
  }

  get y1 () {
    return this.y
  }

  get x2 () {
    return this.getX2()
  }

  get y2 () {
    return this.getY2()
  }
}


const boundingBoxTransform = {
  X: (x, box1, box2, flipX) => {
    if (Array.isArray(x) || utils.isTypedArray(x)) {
      for (let i = 0; i < x.length; ++i) {
        let fractionAlong = (x[i] - box1.x) / box1.width

        if (flipX)
          fractionAlong = 1 - fractionAlong

        x[i] = fractionAlong * box2.width + box2.x
      }
      return x
    } else {
      return boundingBoxTransform.X([x], box1, box2, flipX)[0]
    }
  },
  Y: (y, box1, box2, flipY) => {
    if (Array.isArray(y) || utils.isTypedArray(y)) {
      for (let i = 0; i < y.length; ++i) {
        let fractionAlong = (y[i] - box1.y) / box1.height

        if (flipY)
          fractionAlong = 1 - fractionAlong

        y[i] = fractionAlong * box2.height + box2.y
      }
      return y
    } else {
      return boundingBoxTransform.Y([y], box1, box2, flipY)[0]
    }
  },
  XY: (xy, box1, box2, flipX, flipY) => {
    if (Array.isArray(xy) || utils.isTypedArray(x)) {
      for (let i = 0; i < xy.length; i += 2) {
        let fractionAlong = (xy[i] - box1.x) / box1.width

        if (flipX)
          fractionAlong = 1 - fractionAlong

        xy[i] = fractionAlong * box2.width + box2.x

        fractionAlong = (xy[i+1] - box1.y) / box1.height

        if (flipY)
          fractionAlong = 1 - fractionAlong

        xy[i+1] = fractionAlong * box2.height + box2.y
      }
      return xy
    } else {
      throw new Error("No")
    }
  },
  getReducedTransform(box1, box2, flipX, flipY) {
    let x_m = 1 / box1.width
    let x_b = - box1.x / box1.width

    if (flipX) {
      x_m *= -1
      x_b = 1 - x_b
    }

    x_m *= box2.width
    x_b *= box2.width
    x_b += box2.x

    let y_m = 1 / box1.height
    let y_b = - box1.y / box1.height

    if (flipY) {
      y_m *= -1
      y_b = 1 - y_b
    }

    y_m *= box2.height
    y_b *= box2.height
    y_b += box2.y

    return {x_m, x_b, y_m, y_b}
  }
}

export {boundingBoxTransform}

const EMPTY = new BoundingBox(new Vec2(0,0), 0, 0)

function intersectBoundingBoxes(box1, box2) {
  let x1 = Math.max(box1.x, box2.x)
  let y1 = Math.max(box1.y, box2.y)
  let x2 = Math.min(box1.x2, box2.x2)
  let y2 = Math.min(box1.y2, box2.y2)

  if (x2 < x1) {
    return EMPTY.clone()
  }

  if (y2 < y1) {
    return EMPTY.clone()
  }

  let width = x2 - x1
  let height = y2 - y1

  return new BoundingBox(new Vec2(x1, y1), width, height)
}

export {intersectBoundingBoxes}
