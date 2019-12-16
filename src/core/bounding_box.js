class BoundingBox {
  constructor(params={}) {
    const {
      x=0, y=0, width=640, height=320
    } = params

    this.x = x
    this.y = y
    this.width = width
    this.height = height
  }

  get x2() {
    return this.x + this.width
  }

  get y2() {
    return this.y + this.height
  }

  isEmpty() {
    return (this.width <= 0 || this.height <= 0)
  }

  marginIn(margins) {
    return new BoundingBox({x: this.x + margins.left, y: this.y + margins.top, width: this.width - margins.left - margins.right, height: this.height - margins.top - margins.bottom})
  }

  copy() {
    return new BoundingBox({x: this.x, y: this.y, width: this.width, height: this.height})
  }

  intersects(bbox, strictly=true) {
    if (strictly) {
      return (Math.abs(this.x - bbox.x) * 2 < (this.width + bbox.width)) && (Math.abs(this.y - bbox.y) * 2 < this.height + bbox.height)
    } else {
      return (Math.abs(this.x - bbox.x) * 2 <= (this.width + bbox.width)) && (Math.abs(this.y - bbox.y) * 2 <= this.height + bbox.height)
    }
  }

  containsX(x) {
    return (this.x <= x && x <= this.width + this.x)
  }

  containsY(y) {
    return (this.y <= y && y <= this.height + this.y)
  }


  // TODO
  intersect(bbox) {
    if (!this.intersects(bbox)) {
      return
    }

    let y1 = this.y
    let y2 = bbox.y
    let y3 = this.y2()
    let y4 = bbox.y2()

    return new BoundingBox()
  }
}

export {BoundingBox}
