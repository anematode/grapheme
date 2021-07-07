
export class FastVec2Interval {
  constructor () {
    this.xMin = 0
    this.xMax = 0
    this.yMin = 0
    this.yMax = 0

    this.info = 0b111
  }

  /**
   * Whether this vec2 interval intersects a given bounding box
   * @param bbox {BoundingBox}
   */
  intersectsBoundingBox (bbox) {
    if (this.info === 0) return false

    let x1 = bbox.x, y1 = bbox.y, w = bbox.w, h = bbox.h, x2 = x1 + w, y2 = y1 + h
    let xMin = this.xMin, xMax = this.xMax, yMin = this.yMin, yMax = this.yMax

    // Two boxes intersect if each of their intervals taken individually intersect
    return ((xMin <= x1 && x1 <= xMax) || (x1 <= xMin && xMin <= x2)) && ((yMin <= y1 && y1 <= yMax) || (y1 <= yMin && yMin <= y2))
  }

  entirelyWithin (bbox) {
    if (this.info === 0) return false

    let x1 = bbox.x, y1 = bbox.y, w = bbox.w, h = bbox.h, x2 = x1 + w, y2 = y1 + h
    let xMin = this.xMin, xMax = this.xMax, yMin = this.yMin, yMax = this.yMax

    return ((x1 <= xMin && xMax <= x2) && (y1 <= yMin && yMax <= y2))
  }
}
