class Vec2 {
  constructor (x, y) {
    this.x = x
    this.y = y
  }

  length() {
    return Math.hypot(this.x, this.y);
  }

  add(vec) {
    return new Vec2(this.x + vec.x, this.y + vec.y);
  }

  minus(vec) {
    return new Vec2(this.x - vec.x, this.y - vec.y);
  }

  lengthSquared(vec) {
    return (this.x * this.x + this.y * this.y);
  }

  clone() {
    return new Vec2(this.x, this.y);
  }

  dot(vec) {
    return this.x * vec.x + this.y * vec.y;
  }

  scale(x) {
    return new Vec2(this.x * x, this.y * x);
  }

  scaleAround(vec, x) {
    return new Vec2((this.x - vec.x) * x + vec.x, (this.y - vec.y) * x + vec.y);
  }

  rotate(angleRad) { // counterclockwise about origin
    let c = Math.cos(angleRad);
    let s = Math.sin(angleRad);

    return new Vec2(this.x * c - this.y * s, this.x * s + this.y * c);
  }

  rotateAround(vec, angleRad) {
    return this.minus(vec).rotate(angleRad).add(vec);
  }

  refAngle() {
    return Math.atan2(this.y, this.x);
  }
}

export { Vec2 }
