import { mod } from '../core/utils.js'
import { getDashedPolyline} from './dashed_polyline.js'
import { HEAPF32 } from './heap.js'
import { fastHypot } from './misc_geometry.js'

const ENDCAP_TYPES = {
  butt: 0,
  round: 1,
  square: 2
}
const JOIN_TYPES = {
  bevel: 0,
  miter: 2,
  round: 1,
  dynamic: 3
}

function nextPowerOfTwo (x) {
  return 2 ** Math.ceil(Math.log2(x))
}

const MIN_RES_ANGLE = 0.05 // minimum angle in radians between roundings in a polyline
const B = 4 / Math.PI
const C = -4 / Math.PI ** 2

function fastSin (x) {
  // crude, but good enough for this

  x %= 6.28318530717

  if (x < -3.14159265) x += 6.28318530717
  else if (x > 3.14159265) x -= 6.28318530717

  return B * x + C * x * (x < 0 ? -x : x)
}

function fastCos (x) {
  return fastSin(x + 1.570796326794)
}

function fastAtan2 (y, x) {
  let abs_x = x < 0 ? -x : x
  let abs_y = y < 0 ? -y : y

  let a = abs_x < abs_y ? abs_x / abs_y : abs_y / abs_x
  let s = a * a
  let r = ((-0.0464964749 * s + 0.15931422) * s - 0.327622764) * s * a + a

  if (abs_y > abs_x) r = 1.57079637 - r
  if (x < 0) r = 3.14159265 - r
  if (y < 0) r = -r

  return r
}

const glVertices = HEAPF32

/**
 * Convert an array of polyline vertices into a Float32Array of vertices to be rendered using WebGL.
 * @param vertices {Array} The vertices of the polyline.
 * @param pen {Object} A JSON representation of the pen. Could also be the pen object itself.
 * @param box {BoundingBox} The bounding box of the plot, used to optimize line dashes
 */
export function calculatePolylineVertices (vertices, pen, box = null) {
  if (pen.dashPattern.length === 0) {
    return convertTriangleStrip(vertices, pen)
  } else {
    return convertTriangleStrip(getDashedPolyline(vertices, pen, box), pen)
  }
}

export function convertTriangleStrip (vertices, pen) {
  if (
    pen.thickness <= 0 ||
    pen.endcapRes < MIN_RES_ANGLE ||
    pen.joinRes < MIN_RES_ANGLE ||
    vertices.length <= 3
  ) {
    return { glVertices: null, vertexCount: 0 }
  }

  let index = -1
  let origVertexCount = vertices.length / 2

  let th = pen.thickness / 2
  let maxMiterLength = th / fastCos(pen.joinRes / 2)

  let endcap = ENDCAP_TYPES[pen.endcap]
  let join = JOIN_TYPES[pen.join]

  if (endcap === undefined || join === undefined) {
    throw new Error('Undefined endcap or join.')
  }

  // p1 -- p2 -- p3, generating vertices for point p2
  let x1 = 0, x2, x3 = vertices[0], y1 = 0, y2, y3 = vertices[1]
  let v1x = 0, v1y = 0, v2x = 0, v2y = 0, v1l = 0, v2l = 0, b1_x, b1_y, scale, dis
  let chunkPos = 0

  for (let i = 0; i < origVertexCount; ++i) {
    chunkPos++

    x1 = i !== 0 ? x2 : NaN // Previous vertex
    x2 = x3 // Current vertex
    x3 = i !== origVertexCount - 1 ? vertices[2 * i + 2] : NaN // Next vertex

    y1 = i !== 0 ? y2 : NaN // Previous vertex
    y2 = y3 // Current vertex
    y3 = i !== origVertexCount - 1 ? vertices[2 * i + 3] : NaN // Next vertex

    if (Math.abs(x3) > 16384 || Math.abs(y3) > 16384) {
      // Temporary
      x3 = NaN
      y3 = NaN
    }

    if (isNaN(x2) || isNaN(y2)) {
      continue
    }

    if (isNaN(x1) || isNaN(y1)) {
      // The start of every endcap has two duplicate vertices for triangle strip reasons
      v2x = x3 - x2
      v2y = y3 - y2

      v2l = fastHypot(v2x, v2y)

      if (v2l < 1e-8) {
        v2x = 1
        v2y = 0
      } else {
        v2x /= v2l
        v2y /= v2l
      }

      if (isNaN(v2x) || isNaN(v2y)) {
        continue
      } // undefined >:(

      if (endcap === 1) {
        // rounded endcap
        let theta = fastAtan2(v2y, v2x) + Math.PI / 2
        let steps_needed = Math.ceil(Math.PI / pen.endcapRes)

        let o_x = x2 - th * v2y,
          o_y = y2 + th * v2x

        let theta_c = theta + (1 / steps_needed) * Math.PI

        // Duplicate first vertex
        let x = glVertices[++index] = x2 + th * fastCos(theta_c)
        let y = glVertices[++index] = y2 + th * fastSin(theta_c)

        glVertices[++index] = x
        glVertices[++index] = y
        glVertices[++index] = o_x
        glVertices[++index] = o_y

        for (let i = 2; i <= steps_needed; ++i) {
          let theta_c = theta + (i / steps_needed) * Math.PI

          glVertices[++index] = x2 + th * fastCos(theta_c)
          glVertices[++index] = y2 + th * fastSin(theta_c)
          glVertices[++index] = o_x
          glVertices[++index] = o_y
        }
        continue
      } else if (endcap === 2) {
        let x = glVertices[++index] = x2 - th * v2x + th * v2y
        let y = glVertices[++index] = y2 - th * v2y - th * v2x

        glVertices[++index] = x
        glVertices[++index] = y

        glVertices[++index] = x2 - th * v2x - th * v2y
        glVertices[++index] = y2 - th * v2y + th * v2x

        continue
      } else {
        // no endcap
        let x = glVertices[++index] = x2 + th * v2y
        let y = glVertices[++index] = y2 - th * v2x

        glVertices[++index] = x
        glVertices[++index] = y

        glVertices[++index] = x2 - th * v2y
        glVertices[++index] = y2 + th * v2x

        continue
      }
    }

    if (isNaN(x3) || isNaN(y3)) {
      // ending endcap
      v1x = x2 - x1
      v1y = y2 - y1

      v1l = v2l

      if (v1l < 1e-8) {
        v1x = 1
        v1y = 0
      } else {
        v1x /= v1l
        v1y /= v1l
      }

      if (isNaN(v1x) || isNaN(v1y)) {
        continue
      } // undefined >:(

      glVertices[++index] = x2 + th * v1y
      glVertices[++index] = y2 - th * v1x
      glVertices[++index] = x2 - th * v1y
      glVertices[++index] = y2 + th * v1x

      if (endcap === 1) {
        let theta = fastAtan2(v1y, v1x) + (3 * Math.PI) / 2
        let steps_needed = Math.ceil(Math.PI / pen.endcapRes)

        let o_x = x2 - th * v1y,
          o_y = y2 + th * v1x

        for (let i = 1; i <= steps_needed; ++i) {
          let theta_c = theta + (i / steps_needed) * Math.PI

          glVertices[++index] = x2 + th * fastCos(theta_c)
          glVertices[++index] = y2 + th * fastSin(theta_c)
          glVertices[++index] = o_x
          glVertices[++index] = o_y
        }
      }

      // Duplicate last vertex of ending endcap
      glVertices[index + 1] = glVertices[index - 1]
      glVertices[index + 2] = glVertices[index]

      index += 2

      continue
    }

    // all vertices are defined, time to draw a joinerrrrr
    if (join === 2 || join === 3) {
      // find the two angle bisectors of the angle formed by v1 = p1 -> p2 and v2 = p2 -> p3

      v1x = x1 - x2
      v1y = y1 - y2
      v2x = x3 - x2
      v2y = y3 - y2

      v1l = v2l
      v2l = fastHypot(v2x, v2y)

      b1_x = v2l * v1x + v1l * v2x
      b1_y = v2l * v1y + v1l * v2y
      scale = 1 / fastHypot(b1_x, b1_y)

      if (scale === Infinity || scale === -Infinity) {
        b1_x = -v1y
        b1_y = v1x
        scale = 1 / fastHypot(b1_x, b1_y)
      }

      b1_x *= scale
      b1_y *= scale

      scale = (th * v1l) / (b1_x * v1y - b1_y * v1x)

      if (join === 2 || Math.abs(scale) < maxMiterLength) {
        // Draw a miter. But the length of the miter is massive and we're in dynamic mode (3), we exit this if statement and do a rounded join
        b1_x *= scale
        b1_y *= scale

        glVertices[++index] = x2 - b1_x
        glVertices[++index] = y2 - b1_y
        glVertices[++index] = x2 + b1_x
        glVertices[++index] = y2 + b1_y

        continue
      }
    }

    v2x = x3 - x2
    v2y = y3 - y2
    dis = fastHypot(v2x, v2y)

    if (dis < 0.001) {
      v2x = 1
      v2y = 0
    } else {
      v2x /= dis
      v2y /= dis
    }

    v1x = x2 - x1
    v1y = y2 - y1
    dis = fastHypot(v1x, v1y)

    if (dis === 0) {
      v1x = 1
      v1y = 0
    } else {
      v1x /= dis
      v1y /= dis
    }

    glVertices[++index] = x2 + th * v1y
    glVertices[++index] = y2 - th * v1x
    glVertices[++index] = x2 - th * v1y
    glVertices[++index] = y2 + th * v1x

    if (join === 1 || join === 3) {
      let a1 = fastAtan2(-v1y, -v1x) - Math.PI / 2
      let a2 = fastAtan2(v2y, v2x) - Math.PI / 2

      // if right turn, flip a2
      // if left turn, flip a1

      let start_a, end_a

      if (mod(a1 - a2, 2 * Math.PI) < Math.PI) {
        // left turn
        start_a = Math.PI + a1
        end_a = a2
      } else {
        start_a = Math.PI + a2
        end_a = a1
      }

      let angle_subtended = mod(end_a - start_a, 2 * Math.PI)
      let steps_needed = Math.ceil(angle_subtended / pen.joinRes)

      for (let i = 0; i <= steps_needed; ++i) {
        let theta_c = start_a + (angle_subtended * i) / steps_needed

        glVertices[++index] = x2 + th * fastCos(theta_c)
        glVertices[++index] = y2 + th * fastSin(theta_c)
        glVertices[++index] = x2
        glVertices[++index] = y2
      }
    }

    glVertices[++index] = x2 + th * v2y
    glVertices[++index] = y2 - th * v2x
    glVertices[++index] = x2 - th * v2y
    glVertices[++index] = y2 + th * v2x
  }

  let ret = new Float32Array((index >= 0) ? glVertices.subarray(0, index) : [])
  return ret
}
