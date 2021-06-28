import { isTypedArray, mod } from '../core/utils.js'
import { BoundingBox } from '../math/bounding_box.js'

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
  return (
    pointsCCW(x1, y1, x3, y3, x4, y4) !== pointsCCW(x2, y2, x3, y3, x4, y4) &&
    pointsCCW(x1, y1, x2, y2, x3, y3) !== pointsCCW(x1, y1, x2, y2, x4, y4)
  )
}

// Credit to cortijon on StackOverflow! Thanks bro/sis
function getLineIntersection (p0_x, p0_y, p1_x, p1_y, p2_x, p2_y, p3_x, p3_y) {
  let s1_x, s1_y, s2_x, s2_y

  s1_x = p1_x - p0_x
  s1_y = p1_y - p0_y
  s2_x = p3_x - p2_x
  s2_y = p3_y - p2_y

  const s =
    (-s1_y * (p0_x - p2_x) + s1_x * (p0_y - p2_y)) /
    (-s2_x * s1_y + s1_x * s2_y)
  const t =
    (s2_x * (p0_y - p2_y) - s2_y * (p0_x - p2_x)) / (-s2_x * s1_y + s1_x * s2_y)

  if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
    // Collision detected
    const intX = p0_x + t * s1_x
    const intY = p0_y + t * s1_y

    return [intX, intY]
  }

  return null
}

function lineSegmentIntersectsBox (
  x1,
  y1,
  x2,
  y2,
  box_x1,
  box_y1,
  box_x2,
  box_y2
) {
  // Return the component of the line segment that resides inside a box with boundaries x in (box_x1 .. box_x2), y in
  // (box_y1 .. box_y2), which may potentially be the entire line segment.

  let pt1InBox = box_x1 <= x1 && x1 <= box_x2 && box_y1 <= y1 && y1 <= box_y2
  let pt2InBox = box_x1 <= x2 && x2 <= box_x2 && box_y1 <= y2 && y2 <= box_y2

  if (pt1InBox && pt2InBox) {
    // The line segment is entirely in the box

    return [x1, y1, x2, y2]
  }

  // Infinities cause weird problems with getLineIntersection, so we just approximate them lol
  if (x1 === Infinity) x1 = 1e6
  else if (x1 === -Infinity) x1 = -1e6
  if (x2 === Infinity) x2 = 1e6
  else if (x2 === -Infinity) x2 = -1e6
  if (y1 === Infinity) y1 = 1e6
  else if (y1 === -Infinity) y1 = -1e6
  if (y2 === Infinity) y2 = 1e6
  else if (y2 === -Infinity) y2 = -1e6

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
    if (n_x1 < n_x2 === x1 > x2 || n_y1 < n_y2 === y1 > y2) {
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

      if (intersection) return [x1, y1, intersection[0], intersection[1]]
    }
  } else if (pt2InBox) {
    for (let i = 0; i < 4; ++i) {
      let intersection = intersections[i]

      if (intersection) return [intersection[0], intersection[1], x2, y2]
    }
  }

  return [x1, y1, x2, y2]
}

export function generateCircleTriangleStrip (
  radius,
  x = 0,
  y = 0,
  samples = 8
) {
  const points = []

  for (let i = 0; i <= samples; ++i) {
    const angle = (i / samples) * 2 * Math.PI

    const xc = x + radius * Math.cos(angle),
      yc = y + radius * Math.sin(angle)

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
  const { x, y, w, h } = rect

  const points = [x, y, x + w, y, x, y + h, x + w, y + h]

  return new Float32Array(points)
}

/**
 * Given a rectangle, return a flat list of points enclosing a cycle around the rectangle.
 * @param rect {BoundingBox}
 * @returns {Float32Array}
 */
export function generateRectangleCycle (rect) {
  const { x, y, w, h } = rect

  const points = [x, y, x + w, y, x + w, y + h, x, y + h, x, y]

  return new Float32Array(points)
}

export function generateRectangleDebug (rect) {
  const { x, y, w, h } = rect

  const points = [x, y, x + w, y, x + w, y + h, x, y + h, x, y, x + w, y + w]

  return new Float32Array(points)
}

// Given a Float32Array of appropriate size, repeatedly add given triangle strips
export function combineTriangleStrips (verticesBuff) {
  let index = 0

  return arr => {
    if (arr.length === 0) return

    // Repeat previous vertex
    if (index > 0) {
      verticesBuff[index] = verticesBuff[index - 2]
      verticesBuff[index + 1] = verticesBuff[index - 1]
      verticesBuff[index + 2] = arr[0]
      verticesBuff[index + 3] = arr[1]

      index += 4
    }

    verticesBuff.set(arr, index)
    index += arr.length
  }
}

export function combineColoredTriangleStrips (verticesBuff, colorBuff) {
  let index = 0

  return (arr, { r = 0, g = 0, b = 0, a = 0 }) => {
    if (arr.length === 0) return

    // Repeat previous vertex
    if (index > 0) {
      verticesBuff[index] = verticesBuff[index - 2]
      verticesBuff[index + 1] = verticesBuff[index - 1]
      verticesBuff[index + 2] = arr[0]
      verticesBuff[index + 3] = arr[1]

      index += 4
    }

    verticesBuff.set(arr, index)
    fillRepeating(
      colorBuff,
      [r / 255, g / 255, b / 255, a / 255],
      index * 2,
      2 * (index + arr.length)
    )
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
export function fillRepeating (
  arr,
  pattern,
  startIndex = 0,
  endIndex = arr.length,
  patternStride = 0
) {
  if (endIndex <= startIndex) return arr

  let patternLen = pattern.length,
    arrLen = arr.length
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
  for (
    i = startIndex, j = patternStride;
    i < filledEndIndex && j < patternLen;
    ++i, ++j
  ) {
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

function _flattenVec2ArrayInternal (arr) {
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
      if (typeof item === 'number') out.push(item)
      else
        throw new TypeError(
          `Error when converting array to flattened Vec2 array: Unknown item ${item} at index ${i} in given array`
        )
    }
  }

  return out
}

// Given some arbitrary array of Vec2s, turn it into the regularized format [x1, y1, x2, y2, ..., xn, yn]. The end of
// one polyline and the start of another is done by one pair of numbers being NaN, NaN.
export function flattenVec2Array (arr) {
  if (isTypedArray(arr)) return arr

  for (let i = 0; i < arr.length; ++i) {
    if (typeof arr[i] !== 'number') return _flattenVec2ArrayInternal(arr)
  }

  return arr
}

export function fastAtan2 (y, x) {
  let abs_x = Math.abs(x)
  let abs_y = Math.abs(y)

  let a = abs_x < abs_y ? abs_x / abs_y : abs_y / abs_x

  // atan(x) is about x - x^3 / 3 + x^5 / 5. We also note that atan(1/x) = pi/2 - atan(x) for x > 0, etc.
  let s = a * a
  let r = ((-0.0464964749 * s + 0.15931422) * s - 0.327622764) * s * a + a

  if (abs_y > abs_x) r = 1.57079637 - r
  if (x < 0.0) r = 3.14159265 - r
  if (y < 0.0) r = -r

  return r
}

/**
 * Get the approximate angle between (x1, y1), (x2, y2) and (x3, y3), an operation which should ideally be extremely
 * fast because it will be used repeatedly to know whether to refine a graph while assuming local linearity. The returned
 * angle should be between 0 and Math.PI; the closer to Math.PI, the closer to linear. I'm going to write a faster
 * version of this function soon.
 * @param x1 {number}
 * @param y1
 * @param x2
 * @param y2
 * @param x3
 * @param y3
 */
function approxAngleBetween (x1, y1, x2, y2, x3, y3) {
  // (x1d, y1d) = p1 ---> p2
  let x1d = x2 - x1
  let y1d = y2 - y1

  // (x3d, y3d) = p3 ---> p2
  let x3d = x2 - x3
  let y3d = y2 - y3

  let res = Math.abs(fastAtan2(y3d, x3d) - fastAtan2(y1d, x1d))
  if (res > Math.PI) {
    return 2 * Math.PI - res
  }

  return res
}

export {
  getLineIntersection,
  lineSegmentIntersect,
  lineSegmentIntersectsBox,
  approxAngleBetween
}
