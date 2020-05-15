import {Vec2} from "./vec.js"
import * as utils from "../core/utils.js"

export class BoundingBox {
  //_width;
  //_height;

  draw(canvasCtx) {
    canvasCtx.beginPath()
    canvasCtx.rect(this.top_left.x, this.top_left.y, this.width, this.height)
    canvasCtx.stroke()
  }

  constructor(top_left=Vec2(0,0), width=640, height=480) {
    this.top_left = top_left

    this.width = width
    this.height = height
  }

  get width() {
    return this._width
  }

  get height() {
    return this._height
  }

  set width(w) {
    if (w <= 0)
      throw new Error("Invalid bounding box width")
    this._width = w
  }

  set height(h) {
    if (h <= 0)
      throw new Error("Invalid bounding box height")
    this._height = h
  }

  setTL(top_left) {
    this.top_left = top_left
    return this
  }

  set cx(cx) {
    this.top_left.x = cx - this.width / 2
  }

  set cy(cy) {
    this.top_left.y = cy - this.width / 2
  }

  get cx() {
    return this.top_left.x + this.width / 2
  }

  get cy() {
    return this.top_left.y + this.width / 2
  }

  setSize(width, height) {
    this.width = width
    this.height = height
    return this
  }

  clone() {
    return new BoundingBox(this.top_left.clone(), this.width, this.height)
  }

  padLeft(x) {
    this.width -= x
    this.top_left.x += x
    return this
  }

  padRight(x) {
    this.width -= x
    return this
  }

  padTop(y) {
    this.height -= y
    this.top_left.y += y
    return this
  }

  padBottom(y) {
    this.height -= y
    return this
  }

  pad(paddings={}) {
    if (paddings.left) {
      this.padLeft(paddings.left)
    }
    if (paddings.right) {
      this.padRight(paddings.right)
    }
    if (paddings.top) {
      this.padTop(paddings.top)
    }
    if (paddings.bottom) {
      this.padBottom(paddings.bottom)
    }

    return this
  }

  get x1() {
    return this.top_left.x
  }

  get x2() {
    return this.top_left.x + this.width
  }

  set x1(x) {
    this.top_left.x = x
  }

  set x2(x) {
    this.width = x - this.top_left.x
  }

  get y1() {
    return this.top_left.y
  }

  get y2() {
    return this.top_left.y + this.height
  }

  set y1(y) {
    this.top_left.y = y
  }

  set y2(y) {
    this.height = y - this.top_left.y
  }
}

const boundingBoxTransform = {
  X: (x, box1, box2, flipX=false) => {
    if (Array.isArray(x) || utils.isTypedArray(x)) {
      for (let i = 0; i < x.length; ++i) {
        let fractionAlong = (x[i] - box1.x1) / box1.width

        if (flipX)
          fractionAlong = 1 - fractionAlong

        x[i] = fractionAlong * box2.width + box2.x1
      }
      return x
    } else {
      return boundingBoxTransform.X([x], box1, box2)[0]
    }
  },
  Y: (y, box1, box2, flipY=false) => {
    if (Array.isArray(y) || utils.isTypedArray(y)) {
      for (let i = 0; i < y.length; ++i) {
        let fractionAlong = (y[i] - box1.y1) / box1.height

        if (flipY)
          fractionAlong = 1 - fractionAlong

        y[i] = fractionAlong * box2.height + box2.y1
      }
      return y
    } else {
      return boundingBoxTransform.Y([y], box1, box2)[0]
    }
  },
  XY: (xy, box1, box2, flipX=false, flipY=false) => {
    if (Array.isArray(xy) || utils.isTypedArray(x)) {
      for (let i = 0; i < xy.length; i += 2) {
        let fractionAlong = (xy[i] - box1.x1) / box1.width

        if (flipX)
          fractionAlong = 1 - fractionAlong

        xy[i] = fractionAlong * box2.width + box2.x1

        fractionAlong = (xy[i+1] - box1.y1) / box1.height

        if (flipY)
          fractionAlong = 1 - fractionAlong

        xy[i+1] = fractionAlong * box2.height + box2.y1
      }
      return xy
    } else {
      throw new Error("No")
    }
  }
}

export {boundingBoxTransform}
