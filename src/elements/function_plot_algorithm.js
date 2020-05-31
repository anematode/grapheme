import { angles_between } from '../math/geometry_calculations'

let MAX_DEPTH = 25
let MAX_POINTS = 1e6

// TODO: Stop this function from making too many points
function adaptively_sample_1d(start, end, func, initialPoints=500, angle_threshold=0.1, depth=0, includeEndpoints=true, ptCount=0) {
  if (depth > MAX_DEPTH || start === undefined || end === undefined || isNaN(start) || isNaN(end) || ptCount > MAX_POINTS)
    return [NaN, NaN]

  let vertices = sample_1d(start, end, func, initialPoints, includeEndpoints)

  let angles = new Float64Array(angles_between(vertices, angle_threshold))

  let final_vertices = []
  let egg = true

  for (let i = 0; i < vertices.length; i += 2) {
    let angle_i = i / 2

    if (angles[angle_i] === 3 || angles[angle_i - 1] === 3) {
      let vs = adaptively_sample_1d(vertices[i], vertices[i + 2], func, 3, angle_threshold, depth + 1, true, ptCount)

      vs.forEach(a => final_vertices.push(a))

      ptCount += vs.length
    } else {
      final_vertices.push(vertices[i])
      final_vertices.push(vertices[i+1])
    }

    if (egg && vertices[i] >= 0) {
      egg = false
    }
  }

  return final_vertices
}

function sample_1d(start, end, func, points=500, includeEndpoints=true) {
  let vertices = []

  for (let i = 1 - includeEndpoints; i <= points - (1 - includeEndpoints); ++i) {
    let x = start + i * (end - start) / points
    vertices.push(x, func(x))
  }

  return vertices
}

function find_roots(start, end, func, derivative, initialPoints = 500, iterations=10, accuracy=0.001) {
  let res = (end - start) / initialPoints

  let points = []

  initialPoints--

  // Initial guesses
  for (let i = 0; i <= initialPoints; ++i) {
    let fraction = i / initialPoints

    let x = start + (end - start) * fraction
    points.push(x, func(x))
  }

  function iterateRoots() {
    for (let i = 0; i < points.length; i += 2) {
      if (Math.abs(points[i+1]) < accuracy)
        continue

      let x = points[i]
      let slope = derivative(x)

      let y = points[i+1]

      let new_x = x - y / slope

      points[i] = new_x
      points[i+1] = func(new_x)
    }
  }

  for (let i = 0; i < iterations; ++i)
    iterateRoots()

  let keptRoots = []

  for (let i = 0; i < points.length; i += 2) {
    // remove roots which are in an area of many 0s

    let x = points[i]

    if (Math.abs(func(x - res)) < accuracy || Math.abs(func(x + res)) < accuracy)
      continue

    keptRoots.push(x, points[i+1])
  }

  points = []

  for (let i = 0; i < keptRoots.length; i += 2) {
    let x = keptRoots[i]

    let keepRoot = true

    for (let j = 0; j < points.length; ++j) {
      // check if there is a root close by

      if (Math.abs(points[j] - x) < res) {
        // already a root nearby

        keepRoot = false
        break
      }
    }

    if (keepRoot) {
      points.push(x, keptRoots[i+1])
    }
  }

  return points
}

export {adaptively_sample_1d, sample_1d, find_roots}
