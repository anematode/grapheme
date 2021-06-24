
// Another one of these, yada yada, reinventing the wheel, yay
class Vec2 {
  constructor (x, y) {
    this.x = x
    this.y = y
  }

  static fromObj (obj) {
    let x=0, y=0

    if (Array.isArray(obj)) {
      x = obj[0]
      y = obj[1]
    } else if (typeof obj === "object" && obj.x) {
      x = obj.x
      y = obj.y
    } else if (typeof obj === "string") {
      switch (obj) {
        case "N": case "NE": case "NW":
          y = 1
          break
        case "S": case "SE": case "SW":
          y = -1
          break
      }

      switch (obj) {
        case "E": case "NE": case "SE":
          x = 1
          break
        case "W": case "NW": case "SW":
          x = -1
          break
      }

      if (x === 0 && y === 0 && obj !== 'C') return undefined
    } else return undefined

    return new Vec2(+x, +y)
  }

  add (vec) {
    return new Vec2(this.x + vec.x, this.y + vec.y)
  }

  sub (vec) {
    return new Vec2(this.x - vec.x, this.y - vec.y)
  }

  mul (scalar) {
    return new Vec2(this.x * scalar, this.y * scalar)
  }

  rot (angle, centre) {
    let s = Math.sin(angle), c = Math.cos(angle)

    if (!centre) return new Vec2(c * this.x - s * this.y, s * this.x + c * this.y)
  }

  rotDeg (angle, centre) {
    return this.rot(angle * Math.PI / 180, centre)
  }

  unit () {
    return this.mul(1 / this.len())
  }

  len () {
    return Math.hypot(this.x, this.y)
  }

  lenSq () {
    return this.x * this.x + this.y * this.y
  }
}

export { Vec2 }
