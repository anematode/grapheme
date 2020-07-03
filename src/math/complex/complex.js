/**
 * Represents a complex number, with a real part and an imaginary part both represented by floats.
 */

class Complex {
  /**
   * Construct a new complex number.
   * @param re The real part of the complex number.
   * @param im The imaginary part of the complex number.
   */
  constructor(re, im=0) {
    this.re = re
    this.im = im
  }

  /**
   * Get i.
   * @returns {Complex} i.
   * @constructor
   */
  static get I() {
    return new Complex(0, 1)
  }

  /**
   * Get 1.
   * @returns {Complex} 1.
   * @constructor
   */
  static get One() {
    return new Complex(1, 0)
  }

  /**
   * Return the complex argument (principal value) corresponding to the complex number.
   * @returns {number} The complex argument Arg(z).
   */
  arg() {
    return Math.atan2(this.im, this.re)
  }

  /**
   * Returns |z|.
   * @returns {number} The complex magnitude |z|.
   */
  magnitude() {
    return Math.hypot(this.re, this.im)
  }

  /**
   * Returns |z|^2.
   * @returns {number} The square of the complex magnitude |z|^2.
   */
  magnitudeSquared() {
    return this.re * this.re + this.im * this.im
  }

  /**
   * Returns z bar.
   * @returns {Complex} The conjugate of z.
   */
  conj() {
    return new Complex(this.re, -this.im)
  }

  /**
   * Clone this complex number.
   * @returns {Complex} Clone of z.
   */
  clone() {
    return new Complex(this.re, this.im)
  }

  /**
   * Scale this complex number by the real factor r.
   * @param r {number} The scaling factor.
   */
  scale(r) {
    return new Complex(this.re * r, this.im * r)
  }

  /**
   * Check whether this complex number is equal to another.
   * @param z {Complex} Complex number to compare with.
   */
  equals(z) {
    return (this.re === z.re) && (this.im === z.im)
  }

  /**
   * Return a complex number pointing in the same direction, with magnitude 1.
   * @returns {Complex}
   */
  normalize() {
    let mag = this.magnitude()

    return this.scale(1 / mag)
  }
}

export { Complex }
