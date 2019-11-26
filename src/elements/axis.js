import { Element as GraphemeElement } from '../grapheme_element'
import { Vec2 } from './math'
import { Color } from '../color'

/**
A displayed axis, potentially with tick marks of various gradations,
potentially with labels, and potentially with an arrow
*/
class Axis extends GraphemeElement {
  constructor (params = {}) {
    super(params)

    this.thickness = 4
    this.color = new Color(0, 0, 0, 255)

    this.start = new Vec2(0, 0)
    this.end = new Vec2(100, 0)

    this.subelements = {}
  }
}

export { Axis }
