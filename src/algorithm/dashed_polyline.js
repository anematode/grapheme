// This code is pretty old, but surprisingly effective!
import { lineSegmentIntersectsBox } from './misc_geometry.js'
import {BoundingBox} from "../math/bounding_box.js"

/**
 * Compute Math.hypot(x, y), but since all the values of x and y we're using here are not extreme, we don't have to
 * handle overflows and underflows with much accuracy at all. We can thus use the straightforward calculation.
 * Chrome: 61.9 ms/iteration for 1e7 calculations for fastHypot; 444 ms/iteration for Math.hypot
 * @param x {number}
 * @param y {number}
 * @returns {number} hypot(x, y)
 */
export function fastHypot(x, y) {
  return Math.sqrt(x * x + y * y)
}

/**
 * The maximum number of vertices to be emitted by getDashedPolyline. This condition is here just to prevent dashed
 * polyline from causing a crash from OOM or just taking forever to finish.
 * @type {number}
 */
const MAX_DASHED_POLYLINE_VERTICES = 1e7

/**
 * Convert a polyline into another polyline, but with dashes.
 * @param vertices {Array} The vertices of the polyline.
 * @param pen {Pen} The polyline's pen
 * @param box {BoundingBox} The plotting box, used to clip excess portions of the polyline. There could theoretically be
 * an infinite number of dashes in a long vertical asymptote, for example, but this box condition prevents that from
 * being an issue. Portions of the polyline outside the plotting box are simply returned without dashes.
 * @returns {Array}
 */
export function getDashedPolyline(vertices, pen, box) {
  if (!box) box = new BoundingBox(-Infinity, -Infinity, Infinity, Infinity)

  // dashPattern is the pattern of dashes, given as the length (in pixels) of consecutive dashes and gaps.
  // dashOffset is the pixel offset at which to start the dash pattern, beginning at the start of every sub polyline.
  let { dashPattern, dashOffset } = pen

  // If the dash pattern is odd in length, concat it to itself, creating a doubled, alternating dash pattern
  if (dashPattern.length % 2 === 1)
    dashPattern = dashPattern.concat(dashPattern)

  // The length, in pixels, of the pattern
  const patternLength = dashPattern.reduce((a, b) => a + b)

  // If the pattern is invalid in some way (NaN values, negative dash lengths, total length less than 2), return the
  // polyline without dashes.
  if (patternLength < 2 || dashPattern.some(dashLen => dashLen < 0) || dashPattern.some(Number.isNaN))
    return vertices

  // currentIndex is the current position in the dash pattern. currentLesserOffset is the offset within the dash or gap
  // ----    ----    ----    ----    ----    ----    ----  ... etc.
  //      ^
  // If we are there, then currentIndex is 1 and currentLesserOffset is 1.
  let currentIndex = 0, currentLesserOffset = 0

  // Initialize the value of currentLesserOffset based on dashOffset and dashPattern
  recalculateOffset(0)

  // The returned dashed vertices
  const result = []

  // The plotting box
  const boxX1 = box.x, boxX2 = box.x + box.w, boxY1 = box.y, boxY2 = box.y + box.h

  // Calculate the value of currentLesserOffset, given the length of the pattern that we have just traversed.
  function recalculateOffset(length) {
    // If there's an absurdly long segment, we just pretend the length is 0 to avoid problems with Infinities/NaNs
    if (length > 1e6)
      length = 0

    // Move length along the dashOffset, modulo the patternLength
    dashOffset += length
    dashOffset %= patternLength

    // It's certainly possible to precompute these sums and use a binary search to find the dash index, but
    // that's unnecessary for dashes with short length
    let sum = 0, i = 0, lesserOffset = 0
    for (; i < dashPattern.length; ++i) {
      let dashLength = dashPattern[i]

      // Accumulate the length from the start of the pattern to the current dash
      sum += dashLength

      // If the dashOffset is within this dash...
      if (dashOffset <= sum) {
        // calculate the lesser offset
        lesserOffset = dashOffset - sum + dashLength
        break
      }
    }

    // Set the current index and lesserOffset
    currentIndex = i
    currentLesserOffset = lesserOffset
  }

  // Generate dashes for the line segment (x1, y1) -- (x2, y2)
  function generateDashes(x1, y1, x2, y2) {
    // length of the segment
    const length = fastHypot(x2 - x1, y2 - y1)

    // index of where along the dashes we are
    let i = currentIndex

    // Length so far of emitted dashes
    let lengthSoFar = 0

    // We do this instead of while (true) to prevent the program from crashing
    for (let _ = 0; _ < MAX_DASHED_POLYLINE_VERTICES; _++) {
      // Length of the dash/gap component we need to draw (we subtract currentLesserOffset because that is already drawn)
      const componentLen = dashPattern[i] - currentLesserOffset

      // Length when this component ends
      const endingLen = componentLen + lengthSoFar

      // Whether we are in a dash
      const inDash = i % 2 === 0

      if (endingLen <= length) {
        // If the end of the dash/gap occurs before the end of the current segment, we need to continue
        let r = endingLen / length

        // if in a gap, this starts the next dash; if in a dash, this ends the dash
        result.push(x1 + (x2 - x1) * r, y1 + (y2 - y1) * r)

        // If we're ending off a dash, put the gap in
        if (inDash)
          result.push(NaN, NaN)

        // Go to the next dash/gap
        ++i
        i %= dashPattern.length

        // Reset the current lesser offset
        currentLesserOffset = 0
      } else {
        // If we're in a dash, that means we're in the middle of a dash, so we just add the vertex
        if (inDash)
          result.push(x2, y2)

        break
      }

      lengthSoFar += componentLen
    }

    // Recalculate currentLesserOffset
    recalculateOffset(length)
  }

  // Where we along on each chunk, which tells us when to yield a progress report
  let chunkPos = 0

  if (currentIndex % 2 === 0) // We're beginning with a dash, so start it off
    result.push(vertices[0], vertices[1])

  for (let i = 0; i < vertices.length - 2; i += 2) {
    // For each pair of vertices...
    let x1 = vertices[i]
    let y1 = vertices[i+1]
    let x2 = vertices[i+2]
    let y2 = vertices[i+3]

    if (Number.isNaN(x1) || Number.isNaN(y1)) {
      // At the start of every subpolyline, reset the dash offset
      dashOffset = pen.dashOffset

      // Recalculate the initial currentLesserOffset
      recalculateOffset(0)

      // End off the previous subpolyline
      result.push(NaN, NaN)

      continue
    }

    // If the end of the segment is undefined, continue
    if (Number.isNaN(x2) || Number.isNaN(y2))
      continue

    // Length of the segment
    let length = fastHypot(x2 - x1, y2 - y1)

    // Find whether the segment intersects the box
    let intersect = lineSegmentIntersectsBox(x1, y1, x2, y2, boxX1, boxY1, boxX2, boxY2)

    // If the segment doesn't intersect the box, it is entirely outside the box, so we can add its length to pretend
    // like we drew it even though we didn't
    if (!intersect) {
      recalculateOffset(length)
      continue
    }

    // Whether (x1, y1) and (x2, y2) are contained within the box
    let pt1Contained = (intersect[0] === x1 && intersect[1] === y1)
    let pt2Contained = (intersect[2] === x2 && intersect[3] === y2)

    // If (x1, y1) is contained, fake draw the portion of the line outside of the box
    if (!pt1Contained)
      recalculateOffset(fastHypot(x1 - intersect[0], y1 - intersect[1]))

    chunkPos++

    // Generate dashes
    generateDashes(intersect[0], intersect[1], intersect[2], intersect[3])

    chunkPos++

    if (!pt2Contained)
      recalculateOffset(fastHypot(x2 - intersect[2], y2 - intersect[3]))

    if (result.length > MAX_DASHED_POLYLINE_VERTICES)
      throw new Error("Too many generated vertices in getDashedPolyline.")
  }

  return result
}
