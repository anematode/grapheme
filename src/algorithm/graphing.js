import { approxAngleBetween } from './misc_geometry.js'

/**
 * Whether (x2, y2) -- (x3, y3) should be subdivided, given the
 * @param x1
 * @param y1
 * @param x2
 * @param y2
 * @param x3
 * @param y3
 * @param resAngle
 * @param isFirstSegment
 */
function shouldSubdivide (x1, y1, x2, y2, x3, y3, resAngle, isFirstSegment) {

}

export function parametricPlot2D (f /* R -> R^2 */, tMin, tMax, plotBox, {
  samples: sampleCount = 100,
  adaptive = true,
  maxSamples = 1000,
  applyPostTransform = null,
  resAngle = 0.03, // radians
  vType = "f32"
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

      // (x1, y1) -- (x2, y2) is a candidate for division
      let shouldSubdivide = (prevAngle > resAngle)

      if (i < sampleCount) {
        let angle = Math.PI - approxAngleBetween(x1, y1, x2, y2, x3, y3)
        if (angle > resAngle) {
          shouldSubdivide = true
        }

        prevAngle = angle

        if ((Number.isNaN(x1) || Number.isNaN(y1)) !== (Number.isNaN(x2) || Number.isNaN(y2)))
          shouldSubdivide = true
      }

      if (shouldSubdivide) {
        // (x1, y1) -- (x2, y2) is to be subdivided
        
      }

      newSamples.push(x2, y2)
    }

    samples = new Float64Array(newSamples)
  }

  return samples
}
