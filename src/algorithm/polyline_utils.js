/**
 * Contour representing a part of a polyline. Should be contiguous; contains no NaNs
 */
import { getTypedArrayConstructor, getTypedArrayType } from '../core/utils.js'
import { HEAPF32, HEAPF64 } from './heap.js'
import { pointLineSegmentDistanceSquared } from './misc_geometry.js'

class Contour {
  constructor (data) {
    this.data = data
  }

  type () {
    return (this.data instanceof Float64Array) ? 'f64' : 'f32'
  }
}

/**
 * Convert an array of polyline contours into a single float array with NaN spacings
 * @param contourArray {Contour[]}
 * @param type {string} Data type of the resulting flattened float array
 */
export function fromContours (contourArray, type='f32') {
  // Convert an array of contours into a polyline array, with NaN spacings
  let len = 0
  for (const contour of contourArray) {
    len += contour.data.length
  }

  len += 2 * contourArray.length - 2
  let ret = new (type === 'f32' ? Float32Array : Float64Array)(len)

  let index = 0
  for (let i = 0; i < contourArray.length; ++i) {
    const contour = contourArray[i]

    ret.set(contour.data, index)

    index += contour.data.length

    if (i !== contourArray.length - 1) {
      ret[index] = NaN
      ret[index + 1] = NaN
    }

    index += 2
  }

  return ret
}

/**
 * Convert a flattened polyline array into a contour array
 * @param array {Float32Array|Float64Array|Array} Flattened array of elements, potentially including NaN buffers
 * @param type {string} Whether to create contours of an f32 or f64 variety
 * @param cloneSubarrays {boolean} Whether to clone the subarrays
 * @returns {Array}
 */
export function toContours (array, type='f32', cloneSubarrays=true) {
  let arrType = type === 'f32' ? Float32Array : Float64Array

  let isF32 = array instanceof Float32Array
  let isF64 = array instanceof Float64Array

  if (!((isF32 && type === 'f32') || (isF64 && type === 'f64'))) {
    cloneSubarrays = true
  }

  if (!isF32 && !isF64) {
    array = new arrType(array)
    cloneSubarrays = false
  }

  let contours = []

  /**
   * Given a subarray of the original array, add a contour
   * @param subarray {Float32Array|Float64Array}
   */
  function addContour (subarray) {
    let contour = cloneSubarrays ? (new arrType(subarray)) : subarray

    contours.push(new Contour(contour))
  }

  let firstDefIndex = -1 // index of the first defined element
  for (let i = 0; i < array.length; i += 2) {
    let x = array[i]
    let y = array[i + 1]

    if (Number.isNaN(x) || Number.isNaN(y)) {
      if (firstDefIndex !== -1) {
        addContour(array.subarray(firstDefIndex, i))
      }

      firstDefIndex = -1
    } else {
      if (firstDefIndex === -1)
        firstDefIndex = i
    }
  }

  if (firstDefIndex !== -1)
    addContour(array.subarray(firstDefIndex))

  return contours
}

/**
 * Convert a polyline into a simplified form by trimming vertices which are unnecessary or otherwise manipulating it
 * @param polyline {Float32Array|Float64Array}
 */
export function simplifyPolyline (polyline, {
  type,           // type of the output; if not specified, assumed to be the same as the polyline (f32 or f64)

  minRes=0.5      // maximum deviation from a line that is considered non-linear
} = {}) {
  if (!type) {
    type = getTypedArrayType(polyline)

    if (!type) {
      type = 'f32'
      polyline = new Float32Array(polyline)
    }
  }

  let HEAP = (type === 'f32') ? HEAPF32 : HEAPF64
  let x1, y1, x2=polyline[0], y2=polyline[1], x3=polyline[2], y3=polyline[3]

  let outIndex = -1

  // There are three simplifications to be made: eliding NaNs, compacting linear portions, and removing/faking vertices
  // outside a bounding box. For now, let's focus on the second one

  for (let i = 2; i < polyline.length; i += 2) {
    x1 = x2
    y1 = y2
    x2 = x3
    y2 = y3

    if (i !== polyline.length - 2) {
      x3 = polyline[i]
      y3 = polyline[i + 1]
    }

    let dst = pointLineSegmentDistanceSquared(x2, y2, x1, y1, x3, y3)

    HEAP[++outIndex] = x1
    HEAP[++outIndex] = y1
  }

  HEAP[++outIndex] = x2
  HEAP[++outIndex] = y2

  return new (getTypedArrayConstructor(type))(HEAP.subarray(0, outIndex + 1))
}
