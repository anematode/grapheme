class Vec3 {
  constructor (x, y, z) {
    this.x = x
    this.y = y
    this.z = z
  }

  length () {
    return Math.hypot(this.x, this.y, this.z)
  }

  add (vec) {
    return new Vec3(this.x + vec.x, this.y + vec.y, this.z + vec.z)
  }

  subtract (vec) {
    return new Vec3(this.x - vec.x, this.y - vec.y, this.z - vec.z)
  }

  lengthSquared () {
    return this.x * this.x + this.y * this.y + this.z * this.z
  }

  clone () {
    return new Vec3(this.x, this.y, this.z)
  }

  dot (vec) {
    return new Vec3(this.x * vec.x, this.y * vec.y, this.z * vec.z)
  }

  scale (s) {
    return new Vec3(this.x * s, this.y * s, this.z * s)
  }

  scaleAround (vec, s) {
    return new Vec3((this.x - vec.x) * s + vec.x, (this.y - vec.y) * s + vec.y, (this.z - vec.z) * s + vec.z)
  }

  unit () {
    return this.scale(this.length())
  }

  set (x, y, z) {
    this.x = x
    this.y = y
    this.z = z
  }

  asArray () {
    return [this.x, this.y, this.z]
  }

  hasNaN () {
    return Number.isNaN(this.x) || Number.isNaN(this.y) || Number.isNaN(this.z)
  }
}

export { Vec3 }
