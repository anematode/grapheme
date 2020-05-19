const desiredDemarcationSeparation = 50

// Array of potential demarcations [a,b], where the small demarcations are spaced every b * 10^n and the big ones are spaced every a * 10^n
const StandardDemarcations = [[1, 0.2], [1, 0.25], [2, 0.5]]

function get_demarcation(start, end, distance) {

  let lowestError = Infinity
  let bestDemarcation
  let dist = end - start

  let desiredDemarcationCount = distance / desiredDemarcationSeparation
  let desiredDemarcationSize = dist / desiredDemarcationCount

  for (let demarcation of StandardDemarcations) {
    let a = demarcation[0]
    let b = demarcation[1]

    let power = Math.round(Math.log10(desiredDemarcationSize / b))
    let minorSize = 10 ** power * b

    let err = Math.abs(desiredDemarcationSize - minorSize)
    if (err < lowestError) {
      lowestError = err
      bestDemarcation = {power, major: a, minor: b}
    }
  }

  return bestDemarcation
}

function* demarcate(start, end, demarcation) {
  let modulus = demarcation.major / demarcation.minor

  let factor = 10 ** demarcation.power * demarcation.minor

  let start_i = Math.ceil(start / factor)
  let end_i = Math.ceil(end / factor)

  for (let i = start_i; i < end_i; ++i) {
    let pos = factor * i

    if (pos === 0) {
      yield {pos, type: "axis"}
    } else if (i % modulus === 0) {
      yield {pos, type: "major"}
    } else {
      yield {pos, type: "minor"}
    }
  }
}

const GridlineStrategizers = {
  Standard: function* (start1, end1, distance1, start2, end2, distance2) {
    let eggRatio = (end1 - start1) / (end2 - start2) * distance2 / distance1
    let forceSameDemarcations = Math.abs(eggRatio - 1) < 0.3

    let demarcationX = get_demarcation(start1, end1, distance1)

    let demarcationY
    if (forceSameDemarcations) {
      demarcationY = demarcationX
    } else {
      demarcationY = get_demarcation(start2, end2, distance2)
    }

    for (let x_marker of demarcate(start1, end1, demarcationX)) {
      yield Object.assign(x_marker, {dir: 'x'})
    }

    for (let y_marker of demarcate(start2, end2, demarcationY)) {
      yield Object.assign(y_marker, {dir: 'y'})
    }
  }
}


export {GridlineStrategizers}
