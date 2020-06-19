
function adaptPolyline(polyline, oldTransform, newTransform, adaptThickness=true) {
  let arr = polyline.internal._gl_triangle_strip_vertices

  let newland = oldTransform.getPixelToPlotTransform()
  let harvey = newTransform.getPlotToPixelTransform()

  let x_m = harvey.x_m * newland.x_m
  let x_b = harvey.x_m * newland.x_b + harvey.x_b
  let y_m = harvey.y_m * newland.y_m
  let y_b = harvey.y_m * newland.y_b + harvey.y_b

  let length = arr.length

  for (let i = 0; i < length; i += 2) {
    arr[i] = x_m * arr[i] + x_b
    arr[i+1] = y_m * arr[i+1] + y_b
  }

  let ratio = oldTransform.coords.width / newTransform.coords.width

  if (adaptThickness) {
    for (let i = 0; i < arr.length; i += 4) {
      let ax = arr[i]
      let ay = arr[i + 1]
      let bx = arr[i + 2]
      let by = arr[i + 3]

      let vx = (bx - ax) / 2 * (1 - ratio)
      let vy = (by - ay) / 2 * (1 - ratio)

      arr[i] = ax + vx
      arr[i + 1] = ay + vy
      arr[i + 2] = bx - vx
      arr[i + 3] = by - vy
    }
  }

  polyline.internal.needsBufferCopy = true
}

export { adaptPolyline }
