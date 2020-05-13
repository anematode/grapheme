import {Vec2} from "./vec.js"

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
}
