
function GeometryASMFunctionsCreate(stdlib, foreign, buffer) {
  "use asm"

  var sqrt = stdlib.Math.sqrt
  var abs = stdlib.Math.abs
  var values = new stdlib.Float64Array(buffer)
  var Infinity = stdlib.Infinity

  function hypot(x, y) {
    x = +x
    y = +y

    var quot = 0.0;

    if (+x == +0.0) {
      return abs(y)
    }

    quot = y / x

    return abs(x) * sqrt(1.0 + quot * quot)
  }

  function point_line_segment_distance(px, py, ax, ay, bx, by) {
    // All input values are floats
    px = +px
    py = +py
    ax = +ax
    ay = +ay
    bx = +bx
    by = +by

    var t = 0.0, tx = 0.0, ty = 0.0, d = 0.0, xd = 0.0, yd = 0.0

    xd = bx - ax
    yd = by - ay

    t = (xd * (px - ax) + yd * (py - ay)) / (xd * xd + yd * yd)

    if (t < 0.0) {
      t = 0.0
    } else if (t > 1.0) {
      t = 1.0
    }

    tx = ax + t * (bx - ax)
    ty = ay + t * (by - ay)

    d = +hypot(px - tx, py - ty)

    return d
  }

  function point_line_segment_min_distance(px, py, start, end) {
    px = +px
    py = +py
    start = start|0
    end = end|0

    var p = 0, q = 0, min_distance = 0.0, distance = 0.0
    min_distance = Infinity

    for (p = start << 3, q = ((end - 2) << 3); (p | 0) < (q | 0); p = (p + 16) | 0) {
      distance = +point_line_segment_distance(px, py, +values[p>>3], +values[(p+8)>>3], +values[(p+16)>>3], +values[(p+24)>>3])

      if (distance < min_distance) {
        min_distance = distance
      }
    }

    return min_distance
  }

  function point_line_segment_closest(px, py, ax, ay, bx, by) {
    // All input values are floats
    px = +px
    py = +py
    ax = +ax
    ay = +ay
    bx = +bx
    by = +by

    var t = 0.0, tx = 0.0, ty = 0.0, d = 0.0, xd = 0.0, yd = 0.0

    xd = bx - ax
    yd = by - ay

    t = (xd * (px - ax) + yd * (py - ay)) / (xd * xd + yd * yd)

    if (t < 0.0) {
      t = 0.0
    } else if (t > 1.0) {
      t = 1.0
    }

    tx = ax + t * (bx - ax)
    ty = ay + t * (by - ay)

    values[0] = +tx
    values[1] = +ty

    return +hypot(px - tx, py - ty)
  }

  function point_line_segment_min_closest(px, py, start, end) {
    px = +px
    py = +py
    start = start|0
    end = end|0

    var p = 0, q = 0, min_distance = 0.0, distance = 0.0, cx = 0.0, cy = 0.0
    min_distance = Infinity

    for (p = start << 3, q = ((end - 2) << 3); (p | 0) < (q | 0); p = (p + 16) | 0) {
      distance = +point_line_segment_closest(px, py, +values[p>>3], +values[(p+8)>>3], +values[(p+16)>>3], +values[(p+24)>>3])

      if (distance < min_distance) {
        min_distance = distance
        cx = +values[0]
        cy = +values[1]
      }
    }

    values[0] = +cx
    values[1] = +cy

    return +min_distance
  }


  return {point_line_segment_min_distance: point_line_segment_min_distance, point_line_segment_min_closest: point_line_segment_min_closest}
}

function _point_line_segment_compute(px, py, polyline_vertices, func) {
  if (polyline_vertices.length < 4)
    return Infinity

  let f64 = ASMViews.f64
  let is_typed_array = polyline_vertices instanceof Float64Array || polyline_vertices instanceof Float32Array

  if (polyline_vertices.length > BufferSizes.f64) {
    let i, j, min_distance = Infinity

    for (i = 0; i < polyline_vertices.length / BufferSizes.f64 + 1; ++i) {
      let offset = i * BufferSizes.f64
      let cnt = polyline_vertices.length - offset
      let elem_c = Math.min(BufferSizes.f64, cnt)

      if (is_typed_array) {
        f64.set(polyline_vertices.subarray(offset, offset + elem_c))
      } else {
        for (j = 0; j < elem_c; ++j) {
          f64[j] = polyline_vertices[offset + j]
        }
      }

      let distance = func(px, py, 0, elem_c)

      if (distance < min_distance) {
        min_distance = distance
      }
    }

    return min_distance
  }

  let i

  if (is_typed_array) {
    ASMViews.f64.set(polyline_vertices)
  } else {
    for (i = 0; i < polyline_vertices.length; ++i) {
      ASMViews.f64[i] = polyline_vertices[i]
    }
  }

  return func(px, py, 0, polyline_vertices.length)
}


function point_line_segment_min_distance(px, py, polyline_vertices) {
  return _point_line_segment_compute(px, py, polyline_vertices, GeometryASMFunctions.point_line_segment_min_distance)
}

function point_line_segment_min_closest(px, py, polyline_vertices) {
  let distance = _point_line_segment_compute(px, py, polyline_vertices, GeometryASMFunctions.point_line_segment_min_closest)

  let x = ASMViews.f64[0]
  let y = ASMViews.f64[1]

  return {x, y, distance}
}

let heap = new ArrayBuffer(0x10000)
let stdlib = {Math: Math, Float64Array: Float64Array, Infinity: Infinity}

let ASMViews = {f64: new Float64Array(heap)}
let BufferSizes = {f64: ASMViews.f64.length}
var GeometryASMFunctions = GeometryASMFunctionsCreate(stdlib, null, heap)

export { point_line_segment_min_distance, point_line_segment_min_closest }
