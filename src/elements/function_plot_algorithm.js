import { angles_between } from '../math/geometry_calculations'

let MAX_DEPTH = 10

function adaptively_sample_1d(start, end, func, initialPoints=500, angle_threshold=0.05, depth=0, includeEndpoints=true) {
  if (depth > MAX_DEPTH || start === undefined || end === undefined || isNaN(start) || isNaN(end))
    return [NaN, NaN]

  let vertices = sample_1d(start, end, func, initialPoints, includeEndpoints)

  let angles = new Float64Array(angles_between(vertices, angle_threshold))

  let final_vertices = []
  let egg = true

  for (let i = 0; i < vertices.length; i += 2) {
    let angle_i = i / 2

    if (angles[angle_i] === 3 || angles[angle_i - 1] === 3) {
      let vs = adaptively_sample_1d(vertices[i], vertices[i + 2], func, 3, angle_threshold, depth + 1, true)

      vs.forEach(a => final_vertices.push(a))
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

export {adaptively_sample_1d, sample_1d}
