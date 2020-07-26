import { lineSegmentIntersectsBox } from './geometry_algorithms'


function fastHypot(x, y) {
  return Math.sqrt(x * x + y * y)
}

const MAX_VERTICES = 1e7

/**
 * Convert a polyline into another polyline, but with dashes.
 * @param vertices {Array} The vertices of the polyline.
 * @param pen {Pen} The polyline's pen
 * @param box {BoundingBox}
 * @returns {Array}
 */
function* getDashedPolyline(vertices, pen, box, chunkSize=256000) {
  let dashPattern = pen.dashPattern

  if (dashPattern.length % 2 === 1) {
    // If the dash pattern is odd in length, concat it to itself
    dashPattern = dashPattern.concat(dashPattern)
  } else {
    dashPattern = dashPattern.slice()
  }

  for (let i = 0; i < dashPattern.length; ++i) {
    if (dashPattern[i] === 0) {
      dashPattern[i] = 1e-6 // dumb hack
    }
  }

  let dashOffset = pen.dashOffset
  let patternLength = dashPattern.reduce((a, b) => a + b)

  if (patternLength < 2 || dashPattern.some(dashLen => dashLen < 0))
    return vertices

  let currentOffset = dashOffset
  let currentIndex, currentLesserOffset

  recalculateOffset(0) // calculate the needed index

  let result = []

  let box_x1 = box.x1, box_x2 = box.x2, box_y1 = box.y1, box_y2 = box.y2

  function recalculateOffset(length) {
    if (length > 1e6) { // If there's an absurdly long segment, we just pretend the length is 0
      length = 0
    }

    currentOffset += length
    currentOffset %= patternLength

    let sum = 0, i, lesserOffset
    for (i = 0; i < dashPattern.length; ++i) {
      sum += dashPattern[i]

      if (currentOffset < sum) {
        lesserOffset = dashPattern[i] - sum + currentOffset
        break
      }
    }

    if (i === dashPattern.length)
      --i

    currentIndex = i
    currentLesserOffset = lesserOffset
  }

  let chunkPos = 0

  function generateDashes(x1, y1, x2, y2) {
    let length = fastHypot(x2 - x1, y2 - y1)
    let i = currentIndex
    let totalLen = 0, _
    for (_ = 0; _ < MAX_VERTICES; _++) {
      let componentLen = dashPattern[i] - currentLesserOffset
      let endingLen = componentLen + totalLen

      let inDash = i % 2 === 0

      if (endingLen < length) {
        if (!inDash)
          result.push(NaN, NaN)

        let r = endingLen / length

        result.push(x1 + (x2 - x1) * r, y1 + (y2 - y1) * r)

        if (inDash)
          result.push(NaN, NaN)

        ++i
        i %= dashPattern.length

        currentLesserOffset = 0
      } else {
        if (inDash)
          result.push(x2, y2)

        break
      }

      totalLen += componentLen
    }

    recalculateOffset(length)
  }

  if (currentIndex % 2 === 0) {
    // We're beginning with a dash, so start it off
    result.push(vertices[0], vertices[1])
  }

  for (let i = 0; i < vertices.length - 2; i += 2) {
    let x1 = vertices[i]
    let y1 = vertices[i+1]
    let x2 = vertices[i+2]
    let y2 = vertices[i+3]

    if (isNaN(x1) || isNaN(y1)) {
      currentOffset = dashOffset
      recalculateOffset(0)

      result.push(NaN, NaN)

      continue
    }

    if (isNaN(x2) || isNaN(y2)) {
      continue
    }

    let length = fastHypot(x2 - x1, y2 - y1)
    let intersect = lineSegmentIntersectsBox(x1, y1, x2, y2, box_x1, box_y1, box_x2, box_y2)

    if (!intersect) {
      recalculateOffset(length)
      continue
    }

    let pt1Contained = (intersect[0] === x1 && intersect[1] === y1)
    let pt2Contained = (intersect[2] === x2 && intersect[3] === y2)

    if (!pt1Contained) {
      recalculateOffset(fastHypot(x1 - intersect[0], y1 - intersect[1]))
    }

    chunkPos++
    generateDashes(intersect[0], intersect[1], intersect[2], intersect[3])

    chunkPos++

    if (chunkPos >= chunkSize) {
      yield i / vertices.length

      chunkPos = 0
    }

    if (!pt2Contained) {
      recalculateOffset(fastHypot(x2 - intersect[2], y2 - intersect[3]))
    }

    if (result.length > MAX_VERTICES)
      return result
  }

  return result
}

export {getDashedPolyline, fastHypot}
