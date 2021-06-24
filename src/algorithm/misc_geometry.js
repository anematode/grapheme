import {isTypedArray, mod} from "../core/utils.js"
import {Vec2} from "../math/vec/vec2.js"
import {BoundingBox} from "../math/bounding_box.js"

function GeometryASMFunctionsCreate (stdlib, foreign, buffer) {
  'use asm'

  var sqrt = stdlib.Math.sqrt
  var abs = stdlib.Math.abs
  var atan2 = stdlib.Math.atan2
  var values = new stdlib.Float64Array(buffer)
  var Infinity = stdlib.Infinity
  var PI = stdlib.Math.PI

  function hypot (x, y) {
    x = +x
    y = +y

    var quot = 0.0

    if (+x == +0.0) {
      return abs(y)
    }

    quot = y / x

    return abs(x) * sqrt(1.0 + quot * quot)
  }

  function fastAtan2(y, x) {
    y = +y
    x = +x

    var abs_x = 0.0, abs_y = 0.0, a = 0.0, s = 0.0, r = 0.0

    abs_x = abs(x)
    abs_y = abs(y)

    a = abs_x < abs_y ? abs_x / abs_y : abs_y / abs_x
    s = a * a
    r = ((-0.0464964749 * s + 0.15931422) * s - 0.327622764) * s * a + a

    if (abs_y > abs_x)
      r = 1.57079637 - r
    if (x < 0.0)
      r = 3.14159265 - r
    if (y < 0.0)
      r = -r

    return r
  }

  function point_line_segment_distance (px, py, ax, ay, bx, by) {
    // All input values are floats
    px = +px
    py = +py
    ax = +ax
    ay = +ay
    bx = +bx
    by = +by

    var t = 0.0, tx = 0.0, ty = 0.0, d = 0.0, xd = 0.0, yd = 0.0

    if (ax == bx) {
      if (ay == by) {
        return +hypot(px - ax, py - ay)
      }
    }

    xd = bx - ax
    yd = by - ay

    t = (xd * (px - ax) + yd * (py - ay)) / (xd * xd + yd * yd)

    if (t < 0.0) {
      t = 0.0
    } else if (t > 1.0) {
      t = 1.0
    }

    tx = ax + t * (bx - ax)
    ty = ay + t * (by - ay)

    d = +hypot(px - tx, py - ty)

    return d
  }

  function point_line_segment_min_distance (px, py, start, end) {
    px = +px
    py = +py
    start = start | 0
    end = end | 0

    var p = 0, q = 0, min_distance = 0.0, distance = 0.0
    min_distance = Infinity

    for (p = start << 3, q = ((end - 2) << 3); (p | 0) < (q | 0); p = (p + 16) | 0) {
      distance = +point_line_segment_distance(px, py, +values[p >> 3], +values[(p + 8) >> 3], +values[(p + 16) >> 3], +values[(p + 24) >> 3])

      if (distance < min_distance) {
        min_distance = distance
      }
    }

    return min_distance
  }

  function point_line_segment_closest (px, py, ax, ay, bx, by) {
    // All input values are floats
    px = +px
    py = +py
    ax = +ax
    ay = +ay
    bx = +bx
    by = +by

    var t = 0.0, tx = 0.0, ty = 0.0, d = 0.0, xd = 0.0, yd = 0.0

    if (ax == bx) {
      if (ay == by) {
        values[0] = +ax
        values[1] = +ay

        return +hypot(px - ax, py - ay)
      }
    }

    xd = bx - ax
    yd = by - ay

    t = (xd * (px - ax) + yd * (py - ay)) / (xd * xd + yd * yd)

    if (t < 0.0) {
      t = 0.0
    } else if (t > 1.0) {
      t = 1.0
    }

    tx = ax + t * (bx - ax)
    ty = ay + t * (by - ay)

    values[0] = +tx
    values[1] = +ty

    return +hypot(px - tx, py - ty)
  }

  function point_line_segment_min_closest (px, py, start, end) {
    px = +px
    py = +py
    start = start | 0
    end = end | 0

    var p = 0, q = 0, min_distance = 0.0, distance = 0.0, cx = 0.0, cy = 0.0
    min_distance = Infinity

    for (p = start << 3, q = ((end - 2) << 3); (p | 0) < (q | 0); p = (p + 16) | 0) {
      distance = +point_line_segment_closest(px, py, +values[p >> 3], +values[(p + 8) >> 3], +values[(p + 16) >> 3], +values[(p + 24) >> 3])

      if (distance < min_distance) {
        min_distance = distance
        cx = +values[0]
        cy = +values[1]
      }
    }

    values[0] = +cx
    values[1] = +cy

    return +min_distance
  }

  function min (x, y) {
    x = +x
    y = +y

    if (x < y) {
      return x
    }
    return y
  }

  function angle_between (x1, y1, x2, y2, x3, y3) {
    x1 = +x1
    y1 = +y1
    x2 = +x2
    y2 = +y2
    x3 = +x3
    y3 = +y3

    return +fastAtan2(y3 - y1, x3 - x1) - +fastAtan2(y2 - y1, x2 - x1)
  }

  // Returns 0 if no refinement needed, 1 if left refinement, 2 if right refinement, 3 if both refinment
  function needs_refinement (x1, y1, x2, y2, x3, y3, threshold) {
    x1 = +x1
    y1 = +y1
    x2 = +x2
    y2 = +y2
    x3 = +x3
    y3 = +y3
    threshold = +threshold

    var angle = 0.0

    angle = +angle_between(x2, y2, x1, y1, x3, y3)
    angle = +min(abs(angle - PI), abs(angle + PI))

    if (angle > threshold) {
      return 3
    }

    if (y2 != y2) {
      if (y3 == y3) {
        return 3
      }
      if (y1 == y1) {
        return 3
      }
    }

    if (y3 != y3) {
      if (y2 == y2) {
        return 3
      }
    }

    if (y1 != y1) {
      if (y2 == y2) {
        return 3
      }
    }

    return 0
  }

  function angles_between (start, end, threshold, aspectRatio) {
    start = start | 0
    end = end | 0
    threshold = +threshold
    aspectRatio = +aspectRatio

    var p = 0, q = 0, res = 0, indx = 0

    for (p = (start + 2) << 3, q = ((end - 2) << 3); (p | 0) < (q | 0); p = (p + 16) | 0) {
      res = needs_refinement(+values[(p - 16) >> 3],
        +(values[(p - 8) >> 3] * aspectRatio),
        +values[p >> 3],
        +(values[(p + 8) >> 3] * aspectRatio),
        +values[(p + 16) >> 3],
        +(values[(p + 24) >> 3] * aspectRatio),
        +threshold) | 0

      indx = (((p - 4) >> 1)) | 0

      values[indx >> 3] = +(res | 0)
    }
  }

  return {
    angles_between: angles_between,
    point_line_segment_min_distance: point_line_segment_min_distance,
    point_line_segment_min_closest: point_line_segment_min_closest,
    needs_refinement: needs_refinement
  }
}

function _point_line_segment_compute (px, py, polyline_vertices, func) {
  if (polyline_vertices.length < 4) {
    return Infinity
  }

  let f64 = ASMViews.f64
  let is_typed_array = polyline_vertices instanceof Float64Array || polyline_vertices instanceof Float32Array

  if (polyline_vertices.length > BufferSizes.f64) {
    let i, j, min_distance = Infinity

    for (i = 0; i < polyline_vertices.length / BufferSizes.f64 + 1; ++i) {
      let offset = i * BufferSizes.f64
      let cnt = polyline_vertices.length - offset
      let elem_c = Math.min(BufferSizes.f64, cnt)

      if (is_typed_array) {
        f64.set(polyline_vertices.subarray(offset, offset + elem_c))
      } else {
        for (j = 0; j < elem_c; ++j) {
          f64[j] = polyline_vertices[offset + j]
        }
      }

      let distance = func(px, py, 0, elem_c)

      if (distance < min_distance) {
        min_distance = distance
      }
    }

    return min_distance
  }

  let i

  if (is_typed_array) {
    ASMViews.f64.set(polyline_vertices)
  } else {
    for (i = 0; i < polyline_vertices.length; ++i) {
      ASMViews.f64[i] = polyline_vertices[i]
    }
  }

  return func(px, py, 0, polyline_vertices.length)
}

function pointLineSegmentMinDistance (px, py, polyline_vertices) {
  return _point_line_segment_compute(px, py, polyline_vertices, GeometryASMFunctions.point_line_segment_min_distance)
}

function pointLineSegmentClosest (px, py, polyline_vertices) {
  let distance = _point_line_segment_compute(px, py, polyline_vertices, GeometryASMFunctions.point_line_segment_min_closest)

  let x = ASMViews.f64[0]
  let y = ASMViews.f64[1]

  return {
    x,
    y,
    distance
  }
}

function anglesBetween (polyline_vertices, threshold = 0.03, aspectRatio = 1) {
  if (polyline_vertices.length >= BufferSizes.f64) {
    throw new Error('Polyline too numerous')
  }

  if (polyline_vertices instanceof Float32Array || polyline_vertices instanceof Float64Array) {
    ASMViews.f64.set(polyline_vertices)
  }

  let i

  for (i = 0; i < polyline_vertices.length; ++i) {
    ASMViews.f64[i] = polyline_vertices[i]
  }

  GeometryASMFunctions.angles_between(0, i, threshold, aspectRatio)

  return ASMViews.f64.subarray(0, i / 2 - 2)
}

let heap = new ArrayBuffer(0x200000)
let stdlib = {
  Math: Math,
  Float64Array: Float64Array,
  Infinity: Infinity
}

let ASMViews = { f64: new Float64Array(heap) }
let BufferSizes = { f64: ASMViews.f64.length }
//var GeometryASMFunctions = GeometryASMFunctionsCreate(stdlib, null, heap)

/**
 * Test whether three points are in counterclockwise order
 * @param x1
 * @param y1
 * @param x2
 * @param y2
 * @param x3
 * @param y3
 * @returns {boolean}
 */
function pointsCCW (x1, y1, x2, y2, x3, y3) {
  return (y3 - y1) * (x2 - x1) > (y2 - y1) * (x3 - x1)
}

/**
 * Returns whether two line segments (namely, (x1, y1) -- (x2, y2) and (x3, y3) -- (x4, y4)) intersect
 * @param x1
 * @param y1
 * @param x2
 * @param y2
 * @param x3
 * @param y3
 * @param x4
 * @param y4
 */
function lineSegmentIntersect (x1, y1, x2, y2, x3, y3, x4, y4) {
  return (pointsCCW(x1, y1, x3, y3, x4, y4) !== pointsCCW(x2, y2, x3, y3, x4, y4)) && (pointsCCW(x1, y1, x2, y2, x3, y3) !== pointsCCW(x1, y1, x2, y2, x4, y4))
}

// Credit to cortijon on StackOverflow! Thanks bro/sis
function getLineIntersection (p0_x, p0_y, p1_x, p1_y, p2_x, p2_y, p3_x, p3_y) {
  let s1_x, s1_y, s2_x, s2_y

  s1_x = p1_x - p0_x
  s1_y = p1_y - p0_y
  s2_x = p3_x - p2_x
  s2_y = p3_y - p2_y

  const s = (-s1_y * (p0_x - p2_x) + s1_x * (p0_y - p2_y)) / (-s2_x * s1_y + s1_x * s2_y)
  const t = (s2_x * (p0_y - p2_y) - s2_y * (p0_x - p2_x)) / (-s2_x * s1_y + s1_x * s2_y)

  if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
    // Collision detected
    const intX = p0_x + (t * s1_x)
    const intY = p0_y + (t * s1_y)

    return [intX, intY]
  }

  return null
}

function lineSegmentIntersectsBox(x1, y1, x2, y2, box_x1, box_y1, box_x2, box_y2) {
  // Return the component of the line segment that resides inside a box with boundaries x in (box_x1 .. box_x2), y in
  // (box_y1 .. box_y2), which may potentially be the entire line segment.

  let pt1InBox = box_x1 <= x1 && x1 <= box_x2 && box_y1 <= y1 && y1 <= box_y2
  let pt2InBox = box_x1 <= x2 && x2 <= box_x2 && box_y1 <= y2 && y2 <= box_y2

  if (pt1InBox && pt2InBox) {
    // The line segment is entirely in the box

    return [x1, y1, x2, y2]
  }

  // Infinities cause weird problems with getLineIntersection, so we just approximate them lol
  if (x1 === Infinity)
    x1 = 1e6
  else if (x1 === -Infinity)
    x1 = -1e6
  if (x2 === Infinity)
    x2 = 1e6
  else if (x2 === -Infinity)
    x2 = -1e6
  if (y1 === Infinity)
    y1 = 1e6
  else if (y1 === -Infinity)
    y1 = -1e6
  if (y2 === Infinity)
    y2 = 1e6
  else if (y2 === -Infinity)
    y2 = -1e6

  let int1 = getLineIntersection(x1, y1, x2, y2, box_x1, box_y1, box_x2, box_y1)
  let int2 = getLineIntersection(x1, y1, x2, y2, box_x2, box_y1, box_x2, box_y2)
  let int3 = getLineIntersection(x1, y1, x2, y2, box_x2, box_y2, box_x1, box_y2)
  let int4 = getLineIntersection(x1, y1, x2, y2, box_x1, box_y2, box_x1, box_y1)

  if (!(int1 || int2 || int3 || int4) && !pt1InBox && !pt2InBox) {
    // If there are no intersections and the points are outside the box, that means none of the segment is inside the
    // box, so we can return null

    return null
  }

  let intersections = [int1, int2, int3, int4]

  if (!pt1InBox && !pt2InBox) {

    // Both points are outside of the box, but the segment intersects the box. I'm frustrated! We must RESTRICT by finding the pair of intersections with
    // maximal separation. This deals with annoying corner cases. Thankfully this code doesn't need to be too efficient
    // since this is a rare case.

    let maximalSeparationSquared = -1
    let n_x1, n_y1, n_x2, n_y2

    for (let i = 0; i < 3; ++i) {
      let i1 = intersections[i]
      if (i1) {
        for (let j = i + 1; j < 4; ++j) {
          let i2 = intersections[j]
          if (i2) {
            let dist = (i2[0] - i1[0]) ** 2 + (i2[1] - i1[1]) ** 2

            if (dist > maximalSeparationSquared) {
              maximalSeparationSquared = dist
              n_x1 = i1[0]
              n_y1 = i1[1]
              n_x2 = i2[0]
              n_y2 = i2[1]
            }
          }
        }
      }
    }

    // Swap the order if necessary. We need the result of this calculation to be in the same order as the points
    // that went in, since this will be used in the dashed line logic.
    if (((n_x1 < n_x2) === (x1 > x2)) || ((n_y1 < n_y2) === (y1 > y2))) {
      let tmp = n_x1
      n_x1 = n_x2
      n_x2 = tmp

      tmp = n_y1
      n_y1 = n_y2
      n_y2 = tmp
    }

    return [n_x1, n_y1, n_x2, n_y2]
  }


  if (pt1InBox) {
    for (let i = 0; i < 4; ++i) {
      let intersection = intersections[i]

      if (intersection)
        return [x1, y1, intersection[0], intersection[1]]
    }
  } else if (pt2InBox) {
    for (let i = 0; i < 4; ++i) {
      let intersection = intersections[i]

      if (intersection)
        return [intersection[0], intersection[1], x2, y2]
    }
  }

  return [x1, y1, x2, y2]
}

export function generateCircleTriangleStrip (radius, x=0, y=0, samples=8) {
  const points = []

  for (let i = 0; i <= samples; ++i) {
    const angle = i / samples * 2 * Math.PI

    const xc = x + radius * Math.cos(angle), yc = y + radius * Math.sin(angle)

    if (i % 2 === 0) {
      points.push(xc, yc)
      points.push(x, y)
    } else {
      points.push(xc, yc)
    }
  }

  points.push(NaN, NaN)

  return new Float32Array(points)
}

export function generateRectangleTriangleStrip (rect) {
  const {x, y, w, h} = rect

  const points = [x, y, x + w, y, x, y + h, x + w, y + h]

  return new Float32Array(points)
}

/**
 * Given a rectangle, return a flat list of points enclosing a cycle around the rectangle.
 * @param rect {BoundingBox}
 * @returns {Float32Array}
 */
export function generateRectangleCycle (rect) {
  const {x, y, w, h} = rect

  const points = [x, y, x + w, y, x + w, y + h, x, y + h, x, y]

  return new Float32Array(points)
}

export function generateRectangleDebug (rect) {
  const {x, y, w, h} = rect

  const points = [x, y, x + w, y, x + w, y + h, x, y + h, x, y, x+w, y+w]

  return new Float32Array(points)
}

// Given a Float32Array of appropriate size, repeatedly add given triangle strips
export function combineTriangleStrips (verticesBuff) {
  let index = 0

  return (arr) => {
    if (arr.length === 0) return

    // Repeat previous vertex
    if (index > 0) {
      verticesBuff[index] = verticesBuff[index-2]
      verticesBuff[index+1] = verticesBuff[index-1]
      verticesBuff[index+2] = arr[0]
      verticesBuff[index+3] = arr[1]

      index += 4
    }

    verticesBuff.set(arr, index)
    index += arr.length
  }
}

export function combineColoredTriangleStrips (verticesBuff, colorBuff) {
  let index = 0

  return (arr, { r=0, g=0, b=0, a=0 }) => {
    if (arr.length === 0) return

    // Repeat previous vertex
    if (index > 0) {
      verticesBuff[index] = verticesBuff[index-2]
      verticesBuff[index+1] = verticesBuff[index-1]
      verticesBuff[index+2] = arr[0]
      verticesBuff[index+3] = arr[1]

      index += 4
    }

    verticesBuff.set(arr, index)
    fillRepeating(colorBuff, [ r/255, g/255, b/255, a/255 ], index * 2, 2 * (index + arr.length))
    index += arr.length
  }
}


/**
 * Fill the TypedArray arr with a given pattern throughout [startIndex, endIndex). Works if either is out of bounds.
 * Worst code ever. Uses copyWithin to try make the operation FAST for large arrays (not optimized for small ones). On
 * a 50000-element array in my chrome, it provides a 16x speedup.
 * @param arr Array to fill
 * @param pattern {Array} Pattern to fill with
 * @param startIndex {number} Index of the first instance of the pattern
 * @param endIndex {number} Index immediately after the last instance of the pattern
 * @param patternStride {number} Offset to begin copying the pattern
 * @returns The original array
 */
export function fillRepeating (arr, pattern, startIndex=0, endIndex=arr.length, patternStride=0) {
  if (endIndex <= startIndex) return arr

  let patternLen = pattern.length, arrLen = arr.length
  if (patternLen === 0) return arr

  endIndex = Math.min(endIndex, arrLen)
  if (endIndex <= 0 || startIndex >= arrLen) return arr

  if (startIndex < 0) {
    patternStride -= startIndex
    startIndex = 0
  }

  if (patternStride !== 0) patternStride = mod(patternStride, patternLen)

  let filledEndIndex = Math.min(endIndex, startIndex + patternLen)

  let i, j
  for (i = startIndex, j = patternStride; i < filledEndIndex && j < patternLen; ++i, ++j) {
    arr[i] = pattern[j]
  }

  // For nonzero strides
  for (j = 0; i < filledEndIndex; ++i, ++j) {
    arr[i] = pattern[j]
  }

  if (filledEndIndex === endIndex) return arr

  // We now need to iteratively copy [startIndex, startIndex + filledLen) to [startIndex + filledLen, endIndex) and
  // double filledLen accordingly. memcpy, take the wheel!
  let filledLen = patternLen

  while (true) {
    let copyLen = Math.min(filledLen, endIndex - filledEndIndex)

    arr.copyWithin(filledEndIndex, startIndex, startIndex + copyLen)
    filledEndIndex += copyLen
    filledLen += copyLen

    // Should never be greater, but whatever
    if (filledEndIndex >= endIndex) return arr
  }
}

function _flattenVec2ArrayInternal(arr) {
  const out = []

  for (let i = 0; i < arr.length; ++i) {
    let item = arr[i]

    if (item === null || item === undefined) {
      out.push(NaN, NaN)
    } else if (item.x !== undefined && item.y !== undefined) {
      out.push(item.x, item.y)
    } else if (item[0] !== undefined) {
      out.push(+item[0], item[1] ?? 0)
    } else {
      if (typeof item === "number") out.push (item)
      else throw new TypeError(`Error when converting array to flattened Vec2 array: Unknown item ${item} at index ${i} in given array`)
    }
  }

  return out
}

// Given some arbitrary array of Vec2s, turn it into the regularized format [x1, y1, x2, y2, ..., xn, yn]. The end of
// one polyline and the start of another is done by one pair of numbers being NaN, NaN.
export function flattenVec2Array (arr) {
  if (isTypedArray(arr)) return arr

  for (let i = 0; i < arr.length; ++i) {
    if (typeof arr[i] !== "number") return _flattenVec2ArrayInternal(arr)
  }

  return arr
}

/**
 * Get the actual bounding rectangle of a piece of text with a given vector anchor and spacing from that anchor. For
 * example, getActualTextLocation( { x: 0, y: 0, w: 10, h: 10 }, { x: 50, y: 50 }, "S", 3 ) is { x: 45, y: 37, w: 10, h: 10 } )
 * @param textRect {BoundingBox} The bounding box of the text rectangle (x and y are ignored)
 * @param anchor {Vec2} The position to anchor to
 * @param anchorDir {Vec2} The direction of the anchor
 * @param spacing {number} The additional constant spacing from the anchor
 * @returns {BoundingBox}
 */
export function getActualTextLocation (textRect, anchor, anchorDir, spacing) {
  // We get the center of the rectangle, starting at anchor and adding anchorDir * textRect.wh / 4 * (1 + spacing / norm(textRect.wh) / 2).

  const { w, h } = textRect

  anchor = Vec2.fromObj(anchor) ?? new Vec2(0,0)
  anchorDir = Vec2.fromObj(anchorDir) ?? new Vec2(0, 0)
  spacing = spacing ?? 0

  let centerX = anchor.x + anchorDir.x * (textRect.w / 4 + spacing)
  let centerY = anchor.y + anchorDir.y * (textRect.h / 4 + spacing)

  return BoundingBox.fromObj({ cx: centerX, cy: centerY, w, h })
}

// Merging geometries of various types is a very common operation because we want to minimize bufferData and drawArrays
// calls at nearly all costs.

export { pointLineSegmentMinDistance, pointLineSegmentClosest, anglesBetween, getLineIntersection, lineSegmentIntersect, lineSegmentIntersectsBox }
