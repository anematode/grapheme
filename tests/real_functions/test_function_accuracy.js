
function readDataset(file) {
  return fetch(file)
}

function testFunctionAccuracy(func, dataset) {
  return readDataset(dataset).then(output => output.json()).then(json => {
    let xL = json.x
    let yL = json.y

    let rms = 0
    let samples = xL.length
    let maxErr = -Infinity
    let maxErrPos = 0

    if (xL.length !== yL.length)
      throw new Error("Arrays are not of the same length")

    for (let i = 0; i < samples; ++i) {
      let x = xL[i]
      let y = yL[i]

      let calculatedY = func(x)

      let error = y - calculatedY

      let errorRMS = (error) ** 2

      rms += errorRMS

      if (Math.abs(error) > maxErr) {
        maxErr = Math.abs(error)
        maxErrPos = x
      }
    }

    rms /= samples

    return {rms: rms, maxError: maxErr, maxErrorX: maxErrPos, samples}
  })
}


export { testFunctionAccuracy }
