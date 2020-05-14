const desiredDemarcationSeparation = 15

// Array of potential demarcations [a,b], where the small demarcations are spaced every b * 10^n and the big ones are spaced every a * 10^n
const StandardDemarcations = [[1, 0.2], [1, 0.25], [2, 0.5]]

const DemarcationStrategizers = {
  Standard: function* (start, end, distance) {

    console.log(start,end,distance)
    if (start === end)
      throw new Error("No")
    if (start > end) {
      let temp = end
      end = start
      start = temp
    }

    let approxDemarcations = distance / desiredDemarcationSeparation

    let approxDemarcationSeparation = (end - start) / approxDemarcations
    let selectedDemarcation, selectedN
    let closestSeparationError = Infinity

    for (let i = 0; i < StandardDemarcations.length; ++i) {
      let potentialDemarcation = StandardDemarcations[i]

      let [a, b] = potentialDemarcation

      let n = Math.round(Math.log10(approxDemarcationSeparation / b))
      let selectedSeparation = b * 10 ** n

      let error = Math.abs(selectedSeparation - approxDemarcationSeparation)
      if (error < closestSeparationError) {
        closestSeparationError = error
        selectedDemarcation = potentialDemarcation
        selectedN = n
      }
    }

    let [a, b] = selectedDemarcation
    let divis = a / b

    for (let i = Math.ceil(start / b); i < end / b; ++i) {
      console.log(i)
      if (i === 0) {
        yield {pos: 0, type: 0}
      } else if (i % a === 0) {
        yield {pos: i * b, type: 1}
      } else {
        yield {pos: i * b, type: 2}
      }
    }
  }
}


export {DemarcationStrategizers}
