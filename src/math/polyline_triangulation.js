import * as utils from '../core/utils'
import {getDashedPolyline} from "./dashed_polyline"

const ENDCAP_TYPES = {
  'butt': 0,
  'round': 1,
  'square': 0 // Need to implement
}
const JOIN_TYPES = {
  'bevel': 0,
  'miter': 3,
  'round': 1,
  'dynamic': 3
}

function nextPowerOfTwo (x) {
  return 2 ** Math.ceil(Math.log2(x))
}

const MIN_RES_ANGLE = 0.05 // minimum angle in radians between roundings in a polyline

// Parameters for the expanding/contracting float array for polyline
const MIN_SIZE = 16
const MAX_SIZE = 2 ** 24

/**
 * Convert an array of polyline vertices into a Float32Array of vertices to be rendered using WebGL.
 * @param vertices {Array} The vertices of the polyline.
 * @param pen {Object} A JSON representation of the pen. Could also be the pen object itself.
 * @param box {BoundingBox} The bounding box of the plot, used to optimize line dashes
 */
function calculatePolylineVertices(vertices, pen, box) {
  if (pen.dashPattern.length === 0) {
    // No dashes to draw
    return convertTriangleStrip(vertices, pen);
  } else {
    return convertTriangleStrip(getDashedPolyline(vertices, pen), pen)
  }
}

function convertTriangleStrip(vertices, pen) {
  if (pen.thickness <= 0 ||
    pen.endcapRes < MIN_RES_ANGLE ||
    pen.joinRes < MIN_RES_ANGLE ||
    vertices.length <= 3) {

    return {glVertices: null, vertexCount: 0}
  }

  let glVertices = new Float32Array(MIN_SIZE)

  let index = 0
  let arraySize = glVertices.length - 2

  function addVertex (x, y) {
    if (index > arraySize) {
      // not enough space!!!!

      let newArr = new Float32Array(2 * glVertices.length)
      newArr.set(glVertices)

      glVertices = newArr
      arraySize = glVertices.length - 2
    }

    glVertices[index++] = x
    glVertices[index++] = y
  }

  let origVertexCount = vertices.length / 2

  let th = pen.thickness
  let maxMiterLength = th / Math.cos(pen.joinRes / 2)

  let endcap = ENDCAP_TYPES[pen.endcap]
  let join = JOIN_TYPES[pen.join]

  if (endcap === undefined || join === undefined) {
    throw new Error("Undefined endcap or join.")
  }

  let x1, x2, x3, y1, y2, y3
  let v1x, v1y, v2x, v2y, v1l, v2l, b1_x, b1_y, scale, nu_x, nu_y, pu_x, pu_y, dis

  for (let i = 0; i < origVertexCount; ++i) {
    x1 = (i !== 0) ? vertices[2 * i - 2] : NaN // Previous vertex
    x2 = vertices[2 * i] // Current vertex
    x3 = (i !== origVertexCount - 1) ? vertices[2 * i + 2] : NaN // Next vertex

    y1 = (i !== 0) ? vertices[2 * i - 1] : NaN // Previous vertex
    y2 = vertices[2 * i + 1] // Current vertex
    y3 = (i !== origVertexCount - 1) ? vertices[2 * i + 3] : NaN // Next vertex

    if (isNaN(x2) || isNaN(y2)) {
      addVertex(NaN, NaN)
    }

    if (isNaN(x1) || isNaN(y1)) { // starting endcap
      let nu_x = x3 - x2
      let nu_y = y3 - y2
      let dis = Math.hypot(nu_x, nu_y)

      if (dis < 0.001) {
        nu_x = 1
        nu_y = 0
      } else {
        nu_x /= dis
        nu_y /= dis
      }

      if (isNaN(nu_x) || isNaN(nu_y)) {
        continue
      } // undefined >:(

      if (endcap === 1) {
        // rounded endcap
        let theta = Math.atan2(nu_y, nu_x) + Math.PI / 2
        let steps_needed = Math.ceil(Math.PI / pen.endcapRes)

        let o_x = x2 - th * nu_y, o_y = y2 + th * nu_x

        for (let i = 1; i <= steps_needed; ++i) {
          let theta_c = theta + i / steps_needed * Math.PI

          addVertex(x2 + th * Math.cos(theta_c), y2 + th * Math.sin(theta_c))
          addVertex(o_x, o_y)
        }
        continue
      } else {
        // no endcap
        addVertex(x2 + th * nu_y, y2 - th * nu_x)
        addVertex(x2 - th * nu_y, y2 + th * nu_x)
        continue
      }
    }

    if (isNaN(x3) || isNaN(y3)) { // ending endcap
      let pu_x = x2 - x1
      let pu_y = y2 - y1
      let dis = Math.hypot(pu_x, pu_y)

      if (dis < 0.001) {
        pu_x = 1
        pu_y = 0
      } else {
        pu_x /= dis
        pu_y /= dis
      }

      if (isNaN(pu_x) || isNaN(pu_y)) {
        continue
      } // undefined >:(

      addVertex(x2 + th * pu_y, y2 - th * pu_x)
      addVertex(x2 - th * pu_y, y2 + th * pu_x)

      if (endcap === 1) {
        let theta = Math.atan2(pu_y, pu_x) + 3 * Math.PI / 2
        let steps_needed = Math.ceil(Math.PI / pen.endcapRes)

        let o_x = x2 - th * pu_y, o_y = y2 + th * pu_x

        for (let i = 1; i <= steps_needed; ++i) {
          let theta_c = theta + i / steps_needed * Math.PI

          addVertex(x2 + th * Math.cos(theta_c), y2 + th * Math.sin(theta_c))
          addVertex(o_x, o_y)
        }
      }

      continue
    }

    // all vertices are defined, time to draw a joinerrrrr
    if (join === 2 || join === 3) {
      // find the two angle bisectors of the angle formed by v1 = p1 -> p2 and v2 = p2 -> p3

      v1x = x1 - x2
      v1y = y1 - y2
      v2x = x3 - x2
      v2y = y3 - y2

      v1l = Math.hypot(v1x, v1y)
      v2l = Math.hypot(v2x, v2y)

      b1_x = v2l * v1x + v1l * v2x, b1_y = v2l * v1y + v1l * v2y
      scale = 1 / Math.hypot(b1_x, b1_y)

      if (scale === Infinity || scale === -Infinity) {
        b1_x = -v1y
        b1_y = v1x
        scale = 1 / Math.hypot(b1_x, b1_y)
      }

      b1_x *= scale
      b1_y *= scale

      scale = th * v1l / (b1_x * v1y - b1_y * v1x)

      if (join === 2 || (Math.abs(scale) < maxMiterLength)) {
        // if the length of the miter is massive and we're in dynamic mode, we exit pen if statement and do a rounded join
        if (scale === Infinity || scale === -Infinity) {
          scale = 1
        }

        b1_x *= scale
        b1_y *= scale

        addVertex(x2 - b1_x, y2 - b1_y)
        addVertex(x2 + b1_x, y2 + b1_y)

        continue
      }
    }

    nu_x = x3 - x2
    nu_y = y3 - y2
    dis = Math.hypot(nu_x, nu_y)

    if (dis < 0.001) {
      nu_x = 1
      nu_y = 0
    } else {
      nu_x /= dis
      nu_y /= dis
    }

    pu_x = x2 - x1
    pu_y = y2 - y1
    dis = Math.hypot(pu_x, pu_y)

    if (dis === 0) {
      pu_x = 1
      pu_y = 0
    } else {
      pu_x /= dis
      pu_y /= dis
    }

    addVertex(x2 + th * pu_y, y2 - th * pu_x)
    addVertex(x2 - th * pu_y, y2 + th * pu_x)

    if (join === 1 || join === 3) {
      let a1 = Math.atan2(-pu_y, -pu_x) - Math.PI / 2
      let a2 = Math.atan2(nu_y, nu_x) - Math.PI / 2

      // if right turn, flip a2
      // if left turn, flip a1

      let start_a, end_a

      if (utils.mod(a1 - a2, 2 * Math.PI) < Math.PI) {
        // left turn
        start_a = Math.PI + a1
        end_a = a2
      } else {
        start_a = Math.PI + a2
        end_a = a1
      }

      let angle_subtended = utils.mod(end_a - start_a, 2 * Math.PI)
      let steps_needed = Math.ceil(angle_subtended / pen.joinRes)

      for (let i = 0; i <= steps_needed; ++i) {
        let theta_c = start_a + angle_subtended * i / steps_needed

        addVertex(x2 + th * Math.cos(theta_c), y2 + th * Math.sin(theta_c))
        addVertex(x2, y2)
      }
    }

    addVertex(x2 + th * nu_y, y2 - th * nu_x)
    addVertex(x2 - th * nu_y, y2 + th * nu_x)
  }

  return {
    glVertices,
    vertexCount: Math.ceil(index / 2)
  }
}

export {calculatePolylineVertices, nextPowerOfTwo}
