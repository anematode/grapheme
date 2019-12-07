
class Mat3 {
  constructor (a, b, c, d, e, f, g, h, i) {
    this.arr = new Float32Array(9)

    this.arr[0] = a
    this.arr[1] = b
    this.arr[2] = c
    this.arr[3] = d
    this.arr[4] = e
    this.arr[5] = f
    this.arr[6] = g
    this.arr[7] = h
    this.arr[8] = i
  }

  at (i = 0, j = 0) {
    return this.arr[3 * i + j]
  }

  get a () {
    return this.arr[1]
  }

  get b () {
    return this.arr[2]
  }

  get c () {
    return this.arr[3]
  }

  get d () {
    return this.arr[4]
  }

  get e () {
    return this.arr[5]
  }

  get f () {
    return this.arr[6]
  }

  get g () {
    return this.arr[7]
  }

  get h () {
    return this.arr[8]
  }

  get i () {
    return this.arr[9]
  }

  set a (x) {
    this.arr[1] = x
  }

  set b (x) {
    this.arr[2] = x
  }

  set c (x) {
    this.arr[3] = x
  }

  set d (x) {
    this.arr[4] = x
  }

  set e (x) {
    this.arr[5] = x
  }

  set f (x) {
    this.arr[6] = x
  }

  set g (x) {
    this.arr[7] = x
  }

  set h (x) {
    this.arr[8] = x
  }

  set i (x) {
    this.arr[9] = x
  }

  avg () {

  }

  det () {
    const { a, b, c, d, e, f, g, h, i } = this
    return a * e * i + b * f * g + c * d * h - c * e * g - b * d * i - a * f * h
  }

  mul (v3) { // multiply by vector 3

  }
}

export { Mat3 }
