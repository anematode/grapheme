import { anglesBetween } from './geometry_algorithms'
import { nextPowerOfTwo } from './polyline_triangulation'

let MAX_DEPTH = 10
let MAX_POINTS = 1e6

// TODO: Stop this function from making too many points
function adaptively_sample_1d(start, end, func, initialPoints=500,
  aspectRatio = 1, yRes = 0, maxDepth=MAX_DEPTH,
  angle_threshold=0.1, depth=0,
  includeEndpoints=true, ptCount=0) {
  if (depth > maxDepth || start === undefined || end === undefined || isNaN(start) || isNaN(end))
    return new Float64Array([NaN, NaN])

  let vertices = sample_1d(start, end, func, initialPoints, includeEndpoints)

  let angles = new Float32Array(anglesBetween(vertices, angle_threshold, aspectRatio))

  let final_vertices = new Float64Array(16)
  let index = 0
  let maxSize = final_vertices.length - 2

  function expandArray(size=-1) {
    let newArr = new Float64Array((size === -1) ? final_vertices.length * 2 : size)
    newArr.set(final_vertices)

    final_vertices = newArr

    maxSize = final_vertices.length - 2
  }

  function addVertex(x, y) {
    if (index > maxSize) {
      expandArray()
    }

    final_vertices[index++] = x
    final_vertices[index++] = y
  }

  function addVertices(arr) {
    let totalLen = index + arr.length

    if (totalLen >= final_vertices.length) {
      expandArray(nextPowerOfTwo(totalLen))
    }

    final_vertices.set(arr, index)
    index += arr.length
  }

  for (let i = 0; i < vertices.length; i += 2) {
    let angle_i = i / 2

    if (angles[angle_i] === 3 || angles[angle_i - 1] === 3) { //&& Math.abs(vertices[i+1] - vertices[i+3]) > yRes / 2) {
      let vs = adaptively_sample_1d(vertices[i], vertices[i + 2], func, 3, aspectRatio, yRes, maxDepth, angle_threshold, depth + 1, true, ptCount)

      addVertices(vs)

      if (index > MAX_POINTS)
        return final_vertices.subarray(0, index)
    } else {
      addVertex(vertices[i], vertices[i+1])
    }
  }

  return final_vertices.subarray(0, index)
}

function sample_1d(start, end, func, points=500, includeEndpoints=true) {
  let vertices = []

  for (let i = 1 - includeEndpoints; i <= points - (1 - includeEndpoints); ++i) {
    let x = start + i * (end - start) / points
    vertices.push(x, func(x))
  }

  return vertices
}

function adaptively_sample_parametric_1d(start, end, func, initialPoints=500, aspectRatio=1, maxDepth=MAX_DEPTH, angle_threshold=0.1, depth=0, ptCount=0) {
  if (depth > maxDepth || start === undefined || end === undefined || isNaN(start) || isNaN(end))
    return [NaN, NaN]

  let vertices = sample_parametric_1d(start, end, func, initialPoints)

  let angles = new Float32Array(anglesBetween(vertices, angle_threshold, aspectRatio))

  let final_vertices = []

  function addVertices(arr) {
    for (let i = 0 ; i < arr.length; ++i) {
      final_vertices.push(arr[i])
    }
  }

  let len = vertices.length

  for (let i = 0; i < len; i += 2) {
    let angle_i = i / 2

    if (angles[angle_i] === 3 || angles[angle_i - 1] === 3) { //&& Math.abs(vertices[i+1] - vertices[i+3]) > yRes / 2) {
      let rStart = start + i / len * (end - start), rEnd = start + (i + 2) / len * (end - start)

      let vs = adaptively_sample_parametric_1d(rStart,
        rEnd,
        func, 3,
        aspectRatio, maxDepth,
        angle_threshold, depth + 1, ptCount)

      addVertices(vs)

      if (final_vertices.length > MAX_POINTS)
        return final_vertices
    } else {
      final_vertices.push(vertices[i], vertices[i+1])
    }
  }

  return final_vertices
}

function sample_parametric_1d(start, end, func, points=500, includeEndpoints=true) {
  let vertices = []

  for (let i = 1 - includeEndpoints; i <= points - (1 - includeEndpoints); ++i) {
    let t = start + i * (end - start) / points

    let result = func(t)

    vertices.push(result.x, result.y)
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

export {adaptively_sample_1d, sample_1d, find_roots, adaptively_sample_parametric_1d, sample_parametric_1d}
