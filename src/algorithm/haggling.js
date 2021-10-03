

// Given a series of rectangles, each with their own position and positioning stance. We basically do a "physical simulation"
// in which the rectangles exert forces on each other and have forces of their own. Unchanged properties of rectangles
// include (w, h, mass, intentions). Changed properties include (x, y).
import { Vec2 } from '../math/vec/vec2.js'

export function haggleRectangles (rects, opts={}) {
  let rectCount = rects.length
  let forces = [] // array of vec2s

  for (let i = 0; i < rectCount; ++i) forces.push(new Vec2(0, 0))

  function resetForces () {
    for (let force of forces) {
      force.x = force.y = 0
    }
  }

  function initIntendedPositions () {
    for (let rect of rects) {
      let intentions = rect.intentions

      if (intentions) {
        rect.x = intentions.x ?? 0
        rect.y = intentions.y ?? 0
      }
    }
  }

  function areIntersecting (r1, r2) {
    let r1x = r1.x, r2x = r2.x, r1y = r1.y, r2y = r2.y, r1w = r1.w, r1h = r1.h, r2w = r2.w, r2h = r2.h

    return (r1x < r2x + r2w && r1x + r1w > r2x && r1y + r1h < r2y && r1y > r2y + r2h)
  }

  function doTick () {
    resetForces()

    for (let rect1 of rects) {
      for (let rect2 of rects) {
        if (areIntersecting(rect1, rect2)) {
          console.log(rect1, rect2)
        }
      }
    }
  }

  initIntendedPositions()
  doTick()
}
