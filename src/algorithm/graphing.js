import { approxAngleBetween } from './misc_geometry.js'
import { fastHypot } from './dashed_polyline.js'

export function parametricPlot2D (f /* R -> R^2 */, tMin, tMax, plotBox, {
  samples: sampleCount = 100,
  adaptive = true,
  minRes = 0.1, // minimum resolution in units
  minSampleRes = 1e-300, // minimum resolution between consecutive samples
  resAngle = 0.03, // radians
} = {}) {

  // Simplest algorithm; we sample the function evenly between tMin and tMax, then subdivide any intervals which have
  // an insufficiently obtuse angle or have an undefined side.

  let evaluate = f.evaluate
  let samples = new Float64Array(2 * sampleCount)
  let samplesT = new Float64Array(samples)

  let iStep = (tMax - tMin) / (sampleCount - 1)

  for (let i = 0; i < sampleCount; ++i) {
    let t = i * iStep + tMin

    let pos = evaluate(t)

    samplesT[i] = t
    samples[2 * i] = pos.x
    samples[2 * i + 1] = pos.y
  }

  if (adaptive) {
    let x1 = 0, y1 = 0, x2 = samples[0], y2 = samples[1], x3 = samples[2], y3 = samples[3], prevAngle = 0
    let newSamples = [ x2, y2 ]

    // Stack of <angle>, <x3, y3> which will be used for adaptive subdivision. We store x2, y2 and subdivide, then when
    // we're done subdividing to the left, we pop off an angle and x3, y3, setting (x1, y1) = (x2, y2) and (x2, y2) = (x3, y3),
    // and using the old angle along with the newly calculated angle

    for (let i = 2; i <= sampleCount; ++i) {
      x1 = x2
      y1 = y2
      x2 = x3
      y2 = y3

      if (i !== sampleCount) {
        // Avoid OOB access
        x3 = samples[2 * i]
        y3 = samples[2 * i + 1]
      }

      // (x1, y1) -- (x2, y2) is every segment sampled. We subdivide a segment if the previous measured angle is
      // sufficiently acute, or if the angle p1 -- p2 -- p3 is sufficiently acute, or if exactly one of the points
      // p1 and p2 is undefined. This subdivision is *recursive*, and doing so efficiently requires some careful
      // thinking. If a segment needs subdivision but we're too deep, we add a pair of NaNs to indicate the end of a
      // contour.

      let shouldSubdivide = prevAngle > resAngle
      let angle = 0

      if (!shouldSubdivide) {
        if ((x1 !== x1 || y1 !== y1) !== (x2 !== x2 || y2 !== y2)) {
          shouldSubdivide = true
        } else {
          angle = Math.PI - approxAngleBetween(x1, y1, x2, y2, x3, y3)
          shouldSubdivide = (angle > resAngle)
        }
      }

      if (shouldSubdivide) {
        if (fastHypot(x1 - x2, y1 - y2) < minRes)
          shouldSubdivide = false
      }

      prevAngle = angle

      if (shouldSubdivide) {
        // Need to subdivide tp1 -- tp2
        let sampleStack = [x1, y1, x2, y2, samplesT[i - 2], samplesT[i - 1]]

        while (sampleStack.length !== 0) {
          let s3 = sampleStack.pop()
          let s1 = sampleStack.pop()
          let y3 = sampleStack.pop()
          let x3 = sampleStack.pop()
          let y1 = sampleStack.pop()
          let x1 = sampleStack.pop()

          let s2 = (s1 + s3) / 2
          let pos = evaluate(s2)

          let x2 = pos.x
          let y2 = pos.y

          let midIsUndefined = (x2 !== x2 || y2 !== y2)
          let needsLeftSubdivide = (x1 !== x1 || y1 !== y1) !== midIsUndefined
          let needsRightSubdivide = (x3 !== x3 || y3 !== y3) !== midIsUndefined

          if (!(needsLeftSubdivide || needsRightSubdivide)) {
            let angle = Math.PI - approxAngleBetween(x1, y1, x2, y2, x3, y3)

            if (angle > resAngle)
              needsLeftSubdivide = needsRightSubdivide = true
          }

          let tooSmall = s2 - s1 < minSampleRes

          if (fastHypot(x2 - x1, y2 - y1) < minRes || tooSmall) needsLeftSubdivide = false
          if (fastHypot(x2 - x3, y2 - y3) < minRes || tooSmall) needsRightSubdivide = false

          if (needsRightSubdivide) {
            sampleStack.push(x2, y2, x3, y3, s2, s3)
          }

          if (needsLeftSubdivide) {
            sampleStack.push(x1, y1, x2, y2, s1, s2)
          }

          if (!needsRightSubdivide && !needsLeftSubdivide) {
            if (tooSmall) {
              newSamples.push(NaN, NaN)
            } else {
              newSamples.push(x2, y2)
              newSamples.push(x3, y3)
            }
          }
        }
      } else {
        newSamples.push(x2, y2)
      }
    }

    samples = new Float64Array(newSamples)
  }

  return samples
}
