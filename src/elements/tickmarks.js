import { Element as GraphemeElement } from '../grapheme_element'
import { PolylineElement } from './polyline'

/**
A set of markings along a single line
*/
class Tickmarks extends GraphemeElement {
  constructor (params = {}) {
    super(params)

    this.polyline = new PolylineElement()
  }
}

export { Tickmarks }
