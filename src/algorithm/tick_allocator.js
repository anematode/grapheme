import { BigFloat as BF } from '../math/arb/bigfloat.js'

export function getArbitraryPrecisionDemarcations (
  xStart,
  xEnd,
  xLen,
  desiredMinorSep,
  desiredMajorSep,
  subdivisions,
  includeAxis = false
) {
  // We only use a 30-bit number for the graph length, because it's only used for estimation-type stuff. A 30-bit number
  // however is able to store a larger (or smaller) exponent than a double, which is why it's necessary over a JS number

  let xGraphLen = BF.sub(xEnd, xStart, 30)
  let estimatedMajors = xLen / desiredMajorSep

  if (BF.cmp(xGraphLen, 0) <= 0) { // graph length is 0 or negative; not okay
    return []
  }

  // Our working precision will be 1000x finer than one pixel, based on xLen (which is the number of pixels)
  let fineness = BF.mul(xGraphLen, 1 / (xLen * 1000), 30)
  let finenessExp = BF.floorLog2(fineness)

  console.log(finenessExp)

  let neededWorkingPrecision = Math.max(BF.floorLog2(xEnd) - finenessExp, BF.floorLog2(xStart) - finenessExp, 53)

  let bestBase = 0
  let bestErr = Infinity
  let bestSubdivision = [1, 1]

  BF.withWorkingBinaryPrecision(60 /* to accommodate powers of 10 between 2^53-ish */, () => {
    // We look for the base b and subdivision s such that the number of major subdivisions that result would be closest
    // to the number implied by the desired major sep

    for (const subdiv of subdivisions) {
      let maj = subdiv[1]

      let desiredBase = BF.log10(BF.mul(xGraphLen, maj / estimatedMajors))
      let nearest = BF.round(desiredBase)

      let err = Math.abs(
        BF.div(xGraphLen, BF.pow10(nearest)) /* should be representable as a number */ * maj - estimatedMajors
      )

      if (err < bestErr) {
        bestErr = err
        bestSubdivision = subdiv
        bestBase = +nearest
      }
    }
  })

  let majTicks = []
  let minTicks = []

  BF.withWorkingBinaryPrecision(neededWorkingPrecision, () => {
    // Generate the ticks based on the chosen base and subdivision. We first find the offset of the nearest multiple of
    // 10^b preceding xStart, say m * 10^b, then for each interval (m, m+1) generate the ticks that are in the range of
    // xStart and xEnd
    let based = BF.pow10(bestBase)
    let firstMultiple = BF.floor(BF.div(xStart, based))
    let lastMultiple = BF.ceil(BF.div(xEnd, based))

    if (BF.isInteger(lastMultiple)) lastMultiple = BF.add(lastMultiple, 1)
    lastMultiple = BF.ceil(lastMultiple)

    let totalPowers = +BF.sub(lastMultiple, firstMultiple, 30)

    let [min, maj] = bestSubdivision

    // fracParts[i] is (i / (min * maj)) * based
    let fracParts = [...new Array(min * maj)].map((_,i) => BF.mul(i / (min * maj), based))

    // We scale the problem to [0, totalMajors]
    for (let offset = 0; offset < totalPowers; ++offset) {
      // Generate ticks
      let i = BF.add(firstMultiple, offset)
      let h = BF.mul(i, based)

      for (let j = 0; j < maj; ++j) {
        let tick = BF.add(h, fracParts[j * min])
        if (BF.cmp(tick, xEnd) === 1) continue

        if (BF.cmp(tick, xStart) >= 0) majTicks.push({
          tick
        })

        for (let k = 1; k < min; ++k) {
          tick = BF.add(h, fracParts[j * min + k])
          if (BF.cmp(tick, xEnd) === 1 || BF.cmp(tick, xStart) === -1) continue

          minTicks.push({ tick })
        }
      }
    }
  })

  return { min: minTicks, maj: majTicks }

  console.log(bestBase, bestErr, bestSubdivision, finenessExp, neededWorkingPrecision)
}

export function getDemarcations (
  xStart,
  xEnd,
  xLen,
  desiredMinorSep,
  desiredMajorSep,
  subdivisions,
  includeAxis = false
) {
  if (
    xStart >= xEnd ||
    !Number.isFinite(xStart) ||
    !Number.isFinite(xEnd) ||
    !Number.isFinite(xLen) ||
    desiredMajorSep < 1 ||
    desiredMinorSep < 1 ||
    subdivisions.length === 0
  )
    return []

  let xGraphLen = xEnd - xStart
  let estimatedMajors = xLen / desiredMajorSep

  // We look for the base b and subdivision s such that the number of major subdivisions that result would be closest
  // to the number implied by the desired major sep
  let bestBase = 0
  let bestErr = Infinity
  let bestSubdivision = [1, 1]

  for (const subdiv of subdivisions) {
    let maj = subdiv[1]

    let desiredBase = Math.log10((maj * xGraphLen) / estimatedMajors)
    let nearest = Math.round(desiredBase)

    let err = Math.abs(
      (maj * xGraphLen) / Math.pow(10, nearest) - estimatedMajors
    )

    if (err < bestErr) {
      bestErr = err
      bestSubdivision = subdiv
      bestBase = nearest
    }
  }

  // Generate the ticks based on the chosen base and subdivision. We first find the offset of the nearest multiple of
  // 10^b preceding xStart, say m * 10^b, then for each interval (m, m+1) generate the ticks that are in the range of
  // xStart and xEnd
  let based = Math.pow(10, bestBase)
  let firstMultiple = Math.floor(xStart / based)
  let lastMultiple = xEnd / based

  // In the case that the end is at a power of 10, we want to generate the end as well
  if (Number.isInteger(lastMultiple)) lastMultiple++
  lastMultiple = Math.ceil(lastMultiple)

  let [min, maj] = bestSubdivision
  let minTicks = []
  let majTicks = []

  // Note we might start to get float errors here. We'll assume good faith for now that the plot transform constraints
  // are turned on.
  for (let i = firstMultiple; i < lastMultiple; ++i) {
    // Generate ticks
    let begin = i * based
    let end = (i + 1) * based
    let diff = end - begin

    for (let j = 0; j < maj; ++j) {
      let tick = begin + (diff * j) / maj
      if (tick > xEnd) continue

      if (tick >= xStart && (includeAxis || tick !== 0)) majTicks.push(tick)

      for (let k = 1; k < min; ++k) {
        tick = begin + diff * ((j + k / min) / maj)
        if (tick > xEnd || tick < xStart) continue

        minTicks.push(tick)
      }
    }
  }

  return { min: minTicks, maj: majTicks }
}

export function get2DDemarcations (
  xStart,
  xEnd,
  xLen,
  yStart,
  yEnd,
  yLen,
  {
    desiredMinorSep = 20,
    desiredMajorSep = 150,
    subdivisions = [
      [4 /* minor */, 5 /* major */],
      [5, 2],
      [5, 1]
    ], // permissible subdivisions of the powers of ten into major separators and minor separators
    emitAxis = true // emit a special case for axis
  } = {}
) {
  let x = getDemarcations(
    xStart,
    xEnd,
    xLen,
    desiredMinorSep,
    desiredMajorSep,
    subdivisions,
    !emitAxis
  )
  let y = getDemarcations(
    yStart,
    yEnd,
    yLen,
    desiredMinorSep,
    desiredMajorSep,
    subdivisions,
    !emitAxis
  )

  let ret = {
    major: {
      x: x.maj,
      y: y.maj
    },
    minor: {
      x: x.min,
      y: y.min
    }
  }

  if (emitAxis) {
    ret.axis = {
      x: xStart <= 0 || xEnd >= 0 ? [0] : [],
      y: yStart <= 0 || yEnd >= 0 ? [0] : []
    }
  }

  return ret
}

export function getRationalDemarcations (xStart, xEnd, xLen) {
  // Get a series of rational numbers [p, q] between xStart and xEnd.


}
