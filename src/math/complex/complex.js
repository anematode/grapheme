class Complex {
  constructor(re, im=0) {
    this.re = re
    this.im = im
  }

  real() {
    return this.re
  }

  imag() {
    return this.im
  }
}

export { Complex }
