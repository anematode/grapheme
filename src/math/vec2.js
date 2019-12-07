class Vec2 {
  constructor (x, y) {
    this.x = x
    this.y = y
  }

  length () {
    return Math.hypot(this.x, this.y)
  }

  add (vec) {
    return new Vec2(this.x + vec.x, this.y + vec.y)
  }

  subtract (vec) {
    return new Vec2(this.x - vec.x, this.y - vec.y)
  }

  lengthSquared () {
    return (this.x * this.x + this.y * this.y)
  }

  clone () {
    return new Vec2(this.x, this.y)
  }

  dot (vec) {
    return this.x * vec.x + this.y * vec.y
  }

  scale (s) {
    return new Vec2(this.x * s, this.y * s)
  }

  scaleAround (vec, s) {
    return new Vec2((this.x - vec.x) * s + vec.x, (this.y - vec.y) * s + vec.y)
  }

  rotate (angleRad) { // counterclockwise about origin
    const c = Math.cos(angleRad)
    const s = Math.sin(angleRad)

    return new Vec2(this.x * c - this.y * s, this.x * s + this.y * c)
  }

  rotateAround (vec, angleRad) {
    return this.minus(vec).rotate(angleRad).add(vec)
  }

  refAngle () {
    return Math.atan2(this.y, this.x)
  }

  unit () {
    const len = this.length()

    return new Vec2(this.x / len, this.y / len)
  }

  set (x, y) {
    this.x = x
    this.y = y
  }

  asArray () {
    return [this.x, this.y]
  }

  hasNaN() {
    return Number.isNaN(this.x) || Number.isNaN(this.y)
  }
}

const N = new Vec2(0, -1)
const S = new Vec2(0, 1)
const E = new Vec2(1, 0)
const W = new Vec2(-1, 0)

const NE = N.add(E).unit()
const NW = N.add(W).unit()
const SE = S.add(E).unit()
const SW = S.add(W).unit()

export { Vec2, N, S, E, W, NE, NW, SE, SW }
