
import { Arrowhead } from './arrowhead'
import { Vec2 } from '../math/vec'

function createTriangleArrowhead (width, length) {
  return new Arrowhead({
    vertices: [
      new Vec2(0, 0),
      new Vec2(-length, width / 2),
      new Vec2(-length, -width / 2)
    ],
    length
  })
}

const Arrowheads = {
  Normal: createTriangleArrowhead(3, 6),
  Squat: createTriangleArrowhead(3, 3)
}

export { Arrowheads }
