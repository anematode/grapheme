

export function getDemarcations (xStart, xEnd, xLen, desiredMinorSep, desiredMajorSep, subdivisions, includeAxis=false) {
  if (xStart >= xEnd || !Number.isFinite(xStart) || !Number.isFinite(xEnd) || !Number.isFinite(xLen) || desiredMajorSep < 1 || desiredMinorSep < 1 || subdivisions.length === 0) return []

  let xGraphLen = xEnd - xStart
  let estimatedMajors = xLen / desiredMajorSep

  // We look for the base b and subdivision s such that the number of major subdivisions that result would be closest
  // to the number implied by the desired major sep
  let bestBase = 0
  let bestErr = Infinity
  let bestSubdivision = [ 1, 1 ]

  for (const subdiv of subdivisions) {
    let maj = subdiv[1]

    let desiredBase = Math.log10(maj * xGraphLen / estimatedMajors)
    let nearest = Math.round(desiredBase)

    let err = Math.abs(maj * xGraphLen / Math.pow(10, nearest) - estimatedMajors)

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

  let [ min, maj ] = bestSubdivision
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
      let tick = begin + diff * j / maj
      if (tick > xEnd) continue

      if ((tick >= xStart) && (includeAxis || tick !== 0))
        majTicks.push(tick)

      for (let k = 1; k < min; ++k) {
        tick = begin + diff * ((j + k / min) / maj)
        if (tick > xEnd || tick < xStart) continue

        minTicks.push(tick)
      }
    }
  }

  return { min: minTicks, maj: majTicks }
}

export function get2DDemarcations (xStart, xEnd, xLen, yStart, yEnd, yLen, {
  desiredMinorSep = 20,
  desiredMajorSep = 150,
  subdivisions = [ [ 4 /* minor */, 5 /* major */ ], [5, 2], [5, 1] ], // permissible subdivisions of the powers of ten into major separators and minor separators
  emitAxis = true // emit a special case for axis
} = {}) {

  let x = getDemarcations(xStart, xEnd, xLen, desiredMinorSep, desiredMajorSep, subdivisions, !emitAxis)
  let y = getDemarcations(yStart, yEnd, yLen, desiredMinorSep, desiredMajorSep, subdivisions, !emitAxis)

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
      x: (xStart <= 0 || xEnd >= 0) ? [0] : [],
      y: (yStart <= 0 || yEnd >= 0) ? [0] : []
    }
  }

  return ret
}
