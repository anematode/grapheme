import * as utils from '../core/utils'

// Implementation of basic color functions
// Could use a library, but... good experience for me too

function isValidColorComponent (x) {
  return (x >= 0 && x <= 255)
}

class Color {
  constructor ({
    r = 0, g = 0, b = 0, a = 255
  } = {}) {
    this.r = r
    this.g = g
    this.b = b
    this.a = a

    utils.assert([this.r, this.g, this.b, this.a].every(isValidColorComponent), 'Invalid color component')
  }

  rounded () {
    return {
      r: Math.round(this.r),
      g: Math.round(this.g),
      b: Math.round(this.b),
      a: Math.round(this.a)
    }
  }

  hex () {
    const rnd = this.rounded()
    return `#${[rnd.r, rnd.g, rnd.b, rnd.a].map((x) => x.toString(16)).join()}`
  }

  glColor () {
    return {
      r: this.r / 255, g: this.g / 255, b: this.b / 255, a: this.a / 255
    }
  }
}

// all colors represented as object {r: x, g: x, b: x, a: x}. 0 <= r,g,b,a <= 255,
// not necessarily integers
function rgb (r, g, b) {
  return new Color({ r, g, b })
}

function rgba (r, g, b, a = 255) {
  return new Color({
    r, g, b, a
  })
}

export { Color, rgb, rgba }
