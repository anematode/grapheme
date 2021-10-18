
// An arrowhead is... an arrowhead. It is a series of points describing the outline of an arrow head as if it were at the
// end of a line of thickness 1, ending at the origin facing right.


import { earcut } from '../../deps/earcut.js'
import { flattenVec2Array } from '../algorithm/misc_geometry.js'

export class Arrowhead {
  constructor (points, preshift) {
    this.points = points

    // Shift in pixels that represents where the line should actually join up with the arrow head
    this.preshift = preshift

    // The type of join that should be used when joining with this arrowhead
  }

  _triangulate () {
    if (this.triangles) return

    let pts = flattenVec2Array(this.points)
    let indices = earcut(pts)

    // We convert to triangle strip because polylines are generally triangle strips. We
    let triangles = new Float32Array(indices.length * 6 + 4)
    let writeIndex = -1

    function duplicateVertex () {
      triangles[++writeIndex] = triangles[writeIndex - 1]
      triangles[++writeIndex] = triangles[writeIndex - 1]
    }

    for (let i = 0; i < indices.length; i += 3) {
      let i1 = indices[i], i2 = indices[i + 1], i3 = indices[i + 2]

      triangles[++writeIndex] = pts[2 * i1]
      triangles[++writeIndex] = pts[2 * i1 + 1]
      duplicateVertex()
      triangles[++writeIndex] = pts[2 * i2]
      triangles[++writeIndex] = pts[2 * i2 + 1]
      triangles[++writeIndex] = pts[2 * i3]
      triangles[++writeIndex] = pts[2 * i3 + 1]
    }

    duplicateVertex()
    this.triangles = triangles
  }

  getHead (x, y) {

  }
}
