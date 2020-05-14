import {Element as GraphemeElement} from "../core/grapheme_element"
import { PolylineElement } from './polyline'
import {Arrowheads} from '../other/arrowheads'

class TestObject extends GraphemeElement {
  constructor() {
    super()
  }

  render(renderInfo) {
    super.render(renderInfo)

    let polyline = new PolylineElement({vertices: [...Array(200).keys()].map((i)=>((Math.random() < 0.03) ? NaN : ((i%2 === 0) ? (i%50) * 20 : i * 2 + Math.random() * 4))), style: {thickness: 1, arrowLocations: ["subend"], arrowhead: Arrowheads.Normal}})

    polyline.render(renderInfo)
  }
}

export {TestObject}
