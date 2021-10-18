
const SUBPATH_MODE = Object.freeze({
  POLYLINE: 0,
  COMPLEX: 1
})

/**
 * Form of a subpath:
 * { points: Array<number>, segments?: Array<indices>, mode: SUBPATH_MODE }
 * If the mode is POLYLINE, segments is not needed. If the mode is COMPLEX, segments is needed.
 */

class Subpath {
  constructor (points, mode, segments) {
    this.points = points
    this.mode = mode

    if (segments) this.segments = segments
  }
}

/**
 * Generalized path allowing for various curves, subpaths, et cetera beyond simple lines, with optimizations for certain
 * special curves.
 *
 * A Path2D may have zero or more subpaths. A subpath must consist of at least one point and must be continuous.
 * Subpaths may be closed, meaning their start and end points are the same. Subpaths may not contain Infinity or NaN
 * coordinates; such coordinates will be regarded as null points and thus terminators of a given path. Subpaths may
 * intersect themselves and each other, although some algorithms will not like it.
 *
 * A subpath is defined by a sequence of points on the path and control points, in the case of Bézier curves. The nature
 * of each segment is determined by a separate array storing the index of each segment. For example, if the point data
 * is [0, 0, 1, 1, 2, 2, -1, -1] and the segment index array is [0, 2], then the subpath has two segments: a line
 * segment followed by a quadratic Bézier curve. The type of segment is thus determined by the difference in index
 * between the current segment and the next segment, with a difference of 2 signaling a line segment, 4 a quadratic
 * curve, and 6 a cubic curve. (In the future, to allow different types of curves, this may be adjusted by using bit
 * masks of a sort on the indices.) For space optimizations, the segment index array may be stored in some more compact
 * format; for example, if a subpath is only made up of line segments, no array is needed at all.
 *
 * The CLOSURE of a subpath is the subpath adjoined with a line segment connecting its last point to its first point.
 * Subpaths that are already closed are equal to their own closures.
 */
export class Path2D {
  constructor () {
    /**
     * Null indicates no path data. Array indicates two or more paths.
     * @type {null|Subpath|Subpath[]}
     */
    this.subpaths = null
  }

  /**
   * Number of subpaths
   * @returns {number}
   */
  subpathCount () {
    let subpaths = this.subpaths
    if (!subpaths) return 0
    if (Array.isArray(subpaths)) return subpaths.length

    return 1
  }

  /**
   * Return subpaths in a normalized array form
   * @returns {Subpath[]}
   */
  getSubpaths () {
    let cnt = this.subpathCount()

    if (cnt === 0) return []
    if (cnt === 1) return [ this.subpaths ]

    return this.subpaths
  }
}
