

function parametricPlot2D (f /* R -> R^2 */, tMin, tMax, plotBox, {
  samples = 100,
  adaptive = true,
  maxSamples = 1000,
} = {}) {

  // Simplest algorithm; we sample the function evenly between tMin and tMax, then subdivide any intervals which have
  // an insufficiently obtuse angle or have an undefined side.

  let evaluate = f.evaluate
  let values = []

  let tLen = tMax - tMin

  for (let i = 0; i < samples; ++i) {
    let t = i / samples * tLen + tMin

    let pos = evaluate(t)
    values.push(pos.x, pos.y)
  }

  return values
}
