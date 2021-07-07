import { approxAngleBetween, fastHypot, pointLineSegmentDistanceSquared } from './misc_geometry.js'
import { HEAPF64 } from './heap.js'
import { simplifyPolyline } from './polyline_utils.js'
import { FastRealInterval } from '../math/fast_interval/fast_real_interval.js'
import { BoundingBox } from '../math/bounding_box.js'

const MAX_INITIAL_SAMPLE_COUNT = 1e6


let samplingStrategies = {
  // Simplest initial sampling algorithm, but doesn't do well with periodic functions
  uniform: (t1, t2, samples) => {
    let iStep = (t2 - t1) / (samples - 1)
    let arr = new Float64Array(samples)

    for (let i = 0; i < samples; ++i) {
      arr[i] = i * iStep + t1
    }

    return arr
  }
}

// Stack used for recursive adaptive sampling; a manually done recursion. It's also nice because it can be paused as
// with a bolus
let sampleStack = new Float64Array(10 * 2048)

export function parametricPlot2D (f /* R -> R^2 */, tMin, tMax, {
  samples: sampleCount = 100,      // how many initial samples to take
  samplingStrategy = "uniform",    // how to take the initial samples
  samplingStrategyArgs = [],       // additional parameters for how to take the initial samples
  adaptive = true,                 // whether to do recursive, adaptive sampling
  adaptiveRes = Infinity,          // resolution of the adaptive stage; distance of non-linearity which is considered linear and needs to be refined
  simplify = true,                 // whether to compress the vertices
  simplifyRes = adaptiveRes,       // resolution of the collapse
  intervalFunc = null,
  plotBox = null,                           // BoundingBox
  intervalLimit = 3                // Heuristically, tries to keep the interval evaluations done this many subdivisions before the final subdivision
} = {}) {
  // Sanity checks
  if (!Number.isFinite(tMin) || !Number.isFinite(tMax) || tMin >= tMax) return null
  if (adaptiveRes <= 0) throw new RangeError("Minimum resolution must be a positive number")
  if (sampleCount > MAX_INITIAL_SAMPLE_COUNT || sampleCount < 2) throw new RangeError("Initial sample count is not in the range [2, 1000000]")
  if (plotBox !== null && !(plotBox instanceof BoundingBox)) throw new TypeError("Plot box must be null or a bounding box")

  let evaluate = f.evaluate
  let sampler = samplingStrategies[samplingStrategy]

  if (!sampler) throw new Error("Invalid sampling strategy " + samplingStrategy)

  // t values for the initial samples
  let samplesT = sampler(tMin, tMax, sampleCount, ...samplingStrategyArgs)

  // array to store the initial samples
  let samples = new Float64Array(2 * sampleCount)

  // Used to avoid unnecessary allocations
  let fiStore = new FastRealInterval()

  // Whether to actually use interval arithmetic
  let doInterval = !!(intervalFunc && plotBox)

  // do a single overall interval computation and disable it if the entire graph is within bounds
  if (doInterval) {
    fiStore.min = tMin
    fiStore.max = tMax

    let res = intervalFunc.evaluate(fiStore)
    if (res.entirelyWithin(plotBox)) {
      doInterval = false
    }
  }

  // sample the function
  for (let i = 0, j = 0; i < sampleCount; ++i, j += 2) {
    let pos = evaluate(samplesT[i])

    samples[j] = pos.x
    samples[j + 1] = pos.y
  }

  // If we're doing adaptive sampling, we look for places to iteratively refine our sampling
  if (adaptive) {
    let x1 = 0, y1 = 0, x2 = samples[0], y2 = samples[1], x3 = samples[2], y3 = samples[3]
    let s1 = 0, s2 = 0 // samples t for (x1, y1) and (x2, y2)

    let adaptiveResSquared = adaptiveRes * adaptiveRes
    let needsSubdivide = false   // whether the current segment needs subdivision, carried over from the previous iter

    HEAPF64[0] = x2
    HEAPF64[1] = y2

    let newSamplesIndex = 1

    for (let i = 2; i <= sampleCount; ++i) {
      x1 = x2
      y1 = y2
      x2 = x3
      y2 = y3

      if (i !== sampleCount) { // Avoid OOB access
        x3 = samples[2 * i]
        y3 = samples[2 * i + 1]
      }

      if (doInterval) {
        s1 = fiStore.min = samplesT[i-2]
        s2 = fiStore.max = samplesT[i-1]

        let vec2Interval = intervalFunc.evaluate(fiStore)
        if (!vec2Interval.intersectsBoundingBox(plotBox)) {
          // If the interval is entirely outside the plot box, we ignore it
          HEAPF64[++newSamplesIndex] = NaN
          HEAPF64[++newSamplesIndex] = NaN

          continue
        }
      }

      // (x1, y1) -- (x2, y2) is every segment sampled. We subdivide this segment if exactly one of the points
      // p1 and p2 is undefined, or if the previous angle (or the next angle) needs refinement, which is determined by
      // the distance from the point (x2, y2) to (x1, y1) -- (x3, y3). This subdivision is *recursive*, and doing so
      // efficiently requires some careful thinking.
      let shouldSubdivide = needsSubdivide
      needsSubdivide = false

      if (!shouldSubdivide) {
        // Two conditions for subdivision: undefinedness or insufficient linearity
        if ((Number.isFinite(x1) && Number.isFinite(y1)) !== (Number.isFinite(x2) && Number.isFinite(y2))) {
          shouldSubdivide = true
        } else {
          let dstSquared = pointLineSegmentDistanceSquared(x2, y2, x1, y1, x3, y3)
          if (dstSquared > adaptiveResSquared) {
            // If the distance is sufficient, both this segment and the next segment need division (stored in
            // needsSubdivide)
            needsSubdivide = true
            shouldSubdivide = true
          }
        }
      }

      if (shouldSubdivide) {
        // Need to subdivide p1 -- p2. We manually unroll the recursion, with two types of elements on the stack:
        // [ x1, y1, x2, y2, s1, s2, 0 ] where f(s1) = (x1, y1) and f(s2) = (x2, y2), and
        // [ x2, y2, 1], a point to insert into the list of samples. If we find that a segment is to be divided, we
        // push the right half, then the midpoint (to be inserted into the list of samples), then the left half, which
        // ensures that, since we're iterating from left to right, all the samples will be put in order. If we're doing
        // interval evaluation, we push an additional enum to the stack which is whether to do interval evaluation on
        // the segment.

        sampleStack[0] = x1
        sampleStack[1] = y1
        sampleStack[2] = x2
        sampleStack[3] = y2
        sampleStack[4] = samplesT[i-2]
        sampleStack[5] = samplesT[i-1]
        sampleStack[6] = 0

        let stackIndex = 7

        while (stackIndex > 0) {
          let dType = sampleStack[--stackIndex]

          if (dType === 1) {
            let y2 = sampleStack[--stackIndex]
            let x2 = sampleStack[--stackIndex]

            HEAPF64[++newSamplesIndex] = x2
            HEAPF64[++newSamplesIndex] = y2

            continue
          }

          let s3 = sampleStack[--stackIndex]
          let s1 = sampleStack[--stackIndex]
          let y3 = sampleStack[--stackIndex]
          let x3 = sampleStack[--stackIndex]
          let y1 = sampleStack[--stackIndex]
          let x1 = sampleStack[--stackIndex]

          let s2 = (s1 + s3) / 2
          let tooSmall = s1 === s2 || s2 === s3

          if (tooSmall) {
            HEAPF64[++newSamplesIndex] = NaN
            HEAPF64[++newSamplesIndex] = NaN

            continue
          }

          window.total += 1

          let pos = evaluate(s2)

          let x2 = pos.x
          let y2 = pos.y

          let leftIsDefined = (Number.isFinite(x1) && Number.isFinite(y1))
          let midIsDefined = (Number.isFinite(x2) && Number.isFinite(y2))
          let rightIsDefined = (Number.isFinite(x3) && Number.isFinite(y3))

          let needsSubdivide = leftIsDefined !== midIsDefined || rightIsDefined !== midIsDefined

          if (!needsSubdivide) {
            let dstSquared = pointLineSegmentDistanceSquared(x2, y2, x1, y1, x3, y3)

            if (dstSquared > adaptiveResSquared)
              needsSubdivide = true
          }

          if (needsSubdivide) {
            --stackIndex

            // Right segment
            sampleStack[++stackIndex] = x2
            sampleStack[++stackIndex] = y2
            sampleStack[++stackIndex] = x3
            sampleStack[++stackIndex] = y3
            sampleStack[++stackIndex] = s2
            sampleStack[++stackIndex] = s3
            sampleStack[++stackIndex] = 0  // dType 0


            // Midpoint
            sampleStack[++stackIndex] = x2
            sampleStack[++stackIndex] = y2
            sampleStack[++stackIndex] = 1  // dType 1

            // Left segment
            sampleStack[++stackIndex] = x1
            sampleStack[++stackIndex] = y1
            sampleStack[++stackIndex] = x2
            sampleStack[++stackIndex] = y2
            sampleStack[++stackIndex] = s1
            sampleStack[++stackIndex] = s2
            sampleStack[++stackIndex] = 0  // dType 0

            ++stackIndex
          } else {
            HEAPF64[++newSamplesIndex] = x2
            HEAPF64[++newSamplesIndex] = y2
          }
        }
      } else {
        HEAPF64[++newSamplesIndex] = x2
        HEAPF64[++newSamplesIndex] = y2
      }
    }

    samples = new Float64Array(HEAPF64.subarray(0, newSamplesIndex + 1))
  }

  samples = simplifyPolyline(samples, { minRes: simplifyRes })

  return samples
}
