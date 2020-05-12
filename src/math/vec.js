
const Origin = new Vec2(0,0)

class Vec2 {
  constructor (x, y) {
    this.x = x
    this.y = y
  }

  clone() {
    return new Vec2(this.x, this.y)
  }

  subtract(v) {
    this.x -= v.x
    this.y -= v.y
    return this
  }

  add(v) {
    this.x += v.x
    this.y += v.y
    return this
  }

  multiply(s) {
    this.x *= s
    this.y *= s
    return this
  }

  divide(s) {
    this.x /= s
    this.y /= s
    return this
  }

  length() {
    return Math.hypot(this.x, this.y)
  }

  unit() {
    return this.clone().divide(this.length())
  }

  cross(v) {
    return this.x * v.x + this.y * v.y
  }

  rotate(angle, about=Origin) {
    let c = Math.cos(angle), s = Math.sin(angle)

    if (about === Origin) {
      let x = this.x, y = this.y

      this.x = x * c - y * s
      this.y = y * c + x * s
    } else {
      let x = this.x, y = this.y

      this.subtract(about).rotate(angle).add(about)
    }

    return this
  }

  rotateDeg(angle_deg, about=Origin) {
    this.rotate(angle_deg / 180 * 3.14159265359, about)

    return this
  }
}

export {Vec2}
