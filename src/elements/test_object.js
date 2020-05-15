import {Element as GraphemeElement} from "../core/grapheme_element"
import { PolylineElement } from './polyline'
import { Pen } from "../styles/pen"
import { Vec2 } from '../math/vec'

class TestObject extends GraphemeElement {
  constructor() {
    super()

    this.pen = new Pen({arrowLocations: ["subend"], arrowhead: "Squat"})
  }

  render(info) {
    super.render(info)

    let eggs = []

    for (let i = -5; i <= 5; i += 0.5) {
      for (let j = -5; j <= 5; j += 0.5) {
        eggs.push(new Vec2(i, j))
        eggs.push(new Vec2(i, j).add(new Vec2(Math.sin(i), Math.cos(j + Date.now() / 2000)).scale(0.4)))
        eggs.push(new Vec2(NaN, NaN))
      }
    }

    let polyline = new PolylineElement({
      vertices: eggs.map(vertex => info.plot.transform.plotToPixel(vertex)),
      pen: this.pen
    })

    polyline.render(info)
  }
}

export {TestObject}
